import { NextResponse } from "next/server";
import { MODEL_DISTRESS, complete } from "@/lib/ai/models";
import { distressPrompt } from "@/lib/ai/prompts";
import { STUDENT } from "@/lib/demo-data";
import {
  DISTRESS_SURFACES,
  type DetectionMethod,
  type DistressSurface,
  type EscalationRecord,
} from "@/lib/distress";
import { clientIp, getRedis, shouldClassifyDistress } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 2000;
const CLASSIFIER_TIMEOUT_MS = 12_000;
const ESCALATION_KEY = "escolent:escalations";
const ESCALATION_CAP = 200;

/**
 * Requirement 18 / 19.5, and the single most safety-critical path in the app.
 *
 * Three properties this route exists to guarantee:
 *
 * 1. It is never rate limited. A student in distress cannot be told to come
 *    back later. The spend valve in shouldClassifyDistress() caps model cost
 *    without ever changing what the student gets.
 *
 * 2. It fails open. Any classifier failure — error, timeout, unparseable
 *    output, or the budget valve — takes the exact same path as a confirmed
 *    positive, because Requirement 18.4 says err toward over-triggering.
 *
 * 3. Detection and record creation are inseparable. They are one call, and
 *    escalated:true is returned only after a record has been durably written.
 *    A student is never told help is coming without a reviewable record
 *    existing, which would be worse than the silent gap this replaces.
 */

/** Returns true for distress, false for clean, null when it could not decide. */
async function classify(text: string): Promise<boolean | null> {
  try {
    const raw = await complete({
      model: MODEL_DISTRESS,
      prompt: distressPrompt(text),
      maxTokens: 2000,
      timeoutMs: CLASSIFIER_TIMEOUT_MS,
    });
    const cleaned = raw
      .trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { distress?: unknown };
    if (typeof parsed.distress !== "boolean") return null;
    return parsed.distress;
  } catch (error) {
    console.error("[api/distress] classifier failed", error);
    return null;
  }
}

/**
 * Writes the escalation record and resolves only once it is durably stored.
 * Redis first; if that fails for any reason the full record goes to the server
 * log, which Vercel retains. There is no path where this returns without a
 * record existing somewhere a person can read it.
 */
async function recordEscalation(record: EscalationRecord): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.lpush(ESCALATION_KEY, JSON.stringify(record));
      await redis.ltrim(ESCALATION_KEY, 0, ESCALATION_CAP - 1);
      console.info(
        `[escalation] recorded ${record.id} method=${record.method} surface=${record.surface} classifierFailed=${record.classifierFailed}`,
      );
      return;
    } catch (error) {
      console.error("[api/distress] redis write failed, falling back to log", error);
    }
  }

  console.error(`[ESCALATION RECORD] ${JSON.stringify(record)}`);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const method = body.method as DetectionMethod;
  if (method !== "passive_pattern" && method !== "student_initiated") {
    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  }

  const surface = body.surface as DistressSurface;
  if (!DISTRESS_SURFACES.includes(surface)) {
    return NextResponse.json({ error: "Invalid surface" }, { status: 400 });
  }

  const rawText = typeof body.text === "string" ? body.text.trim() : "";
  const text = rawText ? rawText.slice(0, MAX_TEXT_LENGTH) : null;

  const buildRecord = (classifierFailed: boolean): EscalationRecord => ({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    student: STUDENT.fullName,
    method,
    surface,
    text,
    classifierFailed,
  });

  // Student-initiated: zero friction, no classification, no confirmation step.
  if (method === "student_initiated") {
    await recordEscalation(buildRecord(false));
    return NextResponse.json({ escalated: true });
  }

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const withinBudget = await shouldClassifyDistress(clientIp(request));
  const verdict = withinBudget ? await classify(text) : null;

  // null means we could not confirm — treat it exactly as a positive.
  if (verdict === false) {
    return NextResponse.json({ escalated: false });
  }

  await recordEscalation(buildRecord(verdict === null));
  return NextResponse.json({ escalated: true });
}

/**
 * Reads back recent escalation records. No Teacher screen exists this phase, so
 * this is how a record is actually reviewable. It sits behind the same password
 * gate as everything else.
 */
export async function GET() {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({
      records: [],
      note: "No Redis configured — escalation records are in the server logs, prefixed [ESCALATION RECORD].",
    });
  }

  try {
    const raw = await redis.lrange<string | EscalationRecord>(ESCALATION_KEY, 0, 49);
    const records = raw.map((entry) =>
      typeof entry === "string" ? (JSON.parse(entry) as EscalationRecord) : entry,
    );
    return NextResponse.json({ records });
  } catch (error) {
    console.error("[api/distress] failed to read records", error);
    return NextResponse.json({ error: "Could not read records" }, { status: 500 });
  }
}
