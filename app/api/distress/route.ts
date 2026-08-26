import { NextResponse } from "next/server";
import { MODEL_DISTRESS, complete } from "@/lib/ai/models";
import { distressPrompt } from "@/lib/ai/prompts";
import { STUDENT } from "@/lib/demo-data";
import {
  DISTRESS_SURFACES,
  isHelpReasonLabel,
  type DetectionMethod,
  type DistressSurface,
  type EscalationRecord,
  type HelpReasonLabel,
} from "@/lib/distress";
import {
  getEscalationById,
  listEscalations,
  recordEscalation,
  seedEscalationsIfEmpty,
} from "@/lib/distress-store";
import { clientIp, getRedis, shouldClassifyDistress } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 2000;
const CLASSIFIER_TIMEOUT_MS = 12_000;

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

  let helpReason: HelpReasonLabel | null = null;
  if (method === "student_initiated") {
    if (!isHelpReasonLabel(body.helpReason)) {
      return NextResponse.json({ error: "Invalid help reason" }, { status: 400 });
    }
    helpReason = body.helpReason;
  }

  const buildRecord = (classifierFailed: boolean): EscalationRecord => ({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    student: STUDENT.fullName,
    method,
    surface,
    text,
    helpReason,
    classifierFailed,
    acknowledgedBy: null,
    acknowledgedAt: null,
    views: [],
  });

  if (method === "student_initiated") {
    await recordEscalation(buildRecord(false));
    return NextResponse.json({ escalated: true });
  }

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const withinBudget = await shouldClassifyDistress(clientIp(request));
  const verdict = withinBudget ? await classify(text) : null;

  if (verdict === false) {
    return NextResponse.json({ escalated: false });
  }

  await recordEscalation(buildRecord(verdict === null));
  return NextResponse.json({ escalated: true });
}

export async function GET(request: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({
      records: [],
      note: "No Redis configured — escalation records are in the server logs, prefixed [ESCALATION RECORD].",
    });
  }

  await seedEscalationsIfEmpty();

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const record = await getEscalationById(id);
    if (!record) {
      return NextResponse.json({ error: "Escalation not found" }, { status: 404 });
    }
    return NextResponse.json({ record });
  }

  try {
    const records = await listEscalations();
    return NextResponse.json({ records });
  } catch (error) {
    console.error("[api/distress] failed to read records", error);
    return NextResponse.json({ error: "Could not read records" }, { status: 500 });
  }
}
