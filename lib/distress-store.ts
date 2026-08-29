/**
 * Shared persistence for escalation records — the single store behind Student
 * creation and Teacher review. Redis first; server log as guaranteed fallback
 * on write when Redis is unavailable.
 */

import { STUDENT } from "@/lib/demo-data";
import { DEMO_SESSION_STAFF_ID } from "@/lib/demo-data/staff";
import type { EscalationRecord, HelpReasonLabel } from "@/lib/distress";
import { getRedis } from "@/lib/rate-limit";

export const ESCALATION_KEY = "escolent:escalations";
export const ESCALATION_CAP = 200;

/** Fixed ids so seeded demo records are deep-linkable across deploys. */
const SEED_IDS = {
  passiveOpen: "f4e8c2a1-6b3d-4f1a-9c2e-1a2b3c4d5e6f",
  studentViewed: "a9d7e3b2-8c4f-4a2b-b1d0-7e8f9a0b1c2d",
  agedOpen: "d8e9f0a1-b2c3-4d5e-8f9a-0b1c2d3e4f5a",
  acknowledged: "c1b2a3d4-e5f6-4789-a012-3456789abcde",
} as const;

/** Normalize records written before acknowledge/view fields existed. */
export function normalizeEscalationRecord(raw: unknown): EscalationRecord {
  const entry = raw as Partial<EscalationRecord>;
  return {
    id: String(entry.id ?? ""),
    createdAt: String(entry.createdAt ?? new Date().toISOString()),
    student: String(entry.student ?? "Unknown student"),
    method:
      entry.method === "student_initiated" ? "student_initiated" : "passive_pattern",
    surface: entry.surface ?? "today_ask",
    text: entry.text ?? null,
    helpReason: entry.helpReason ?? null,
    classifierFailed: Boolean(entry.classifierFailed),
    acknowledgedBy: entry.acknowledgedBy ?? null,
    acknowledgedAt: entry.acknowledgedAt ?? null,
    views: Array.isArray(entry.views)
      ? entry.views
          .filter(
            (view): view is { staffId: string; viewedAt: string } =>
              typeof view?.staffId === "string" && typeof view?.viewedAt === "string",
          )
          .map((view) => ({
            staffId: view.staffId,
            viewedAt: view.viewedAt,
          }))
      : [],
  };
}

export async function recordEscalation(record: EscalationRecord): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.lpush(ESCALATION_KEY, JSON.stringify(record));
      await redis.ltrim(ESCALATION_KEY, 0, ESCALATION_CAP - 1);
      console.info(
        `[escalation] recorded ${record.id} method=${record.method} surface=${record.surface} helpReason=${record.helpReason ?? "none"} classifierFailed=${record.classifierFailed}`,
      );
      return;
    } catch (error) {
      console.error("[distress-store] redis write failed, falling back to log", error);
    }
  }

  console.error(`[ESCALATION RECORD] ${JSON.stringify(record)}`);
}

export async function listEscalations(): Promise<EscalationRecord[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const raw = await redis.lrange<string | EscalationRecord>(ESCALATION_KEY, 0, ESCALATION_CAP - 1);
    return raw.map((entry) =>
      normalizeEscalationRecord(
        typeof entry === "string" ? (JSON.parse(entry) as unknown) : entry,
      ),
    );
  } catch (error) {
    console.error("[distress-store] failed to read records", error);
    return [];
  }
}

export async function getEscalationById(id: string): Promise<EscalationRecord | null> {
  const records = await listEscalations();
  return records.find((record) => record.id === id) ?? null;
}

export async function updateEscalation(
  id: string,
  mutate: (record: EscalationRecord) => EscalationRecord,
): Promise<EscalationRecord | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.lrange<string | EscalationRecord>(ESCALATION_KEY, 0, ESCALATION_CAP - 1);
    for (let index = 0; index < raw.length; index += 1) {
      const entry = raw[index];
      const record = normalizeEscalationRecord(
        typeof entry === "string" ? (JSON.parse(entry) as unknown) : entry,
      );
      if (record.id !== id) continue;
      const updated = mutate(record);
      await redis.lset(ESCALATION_KEY, index, JSON.stringify(updated));
      return updated;
    }
    return null;
  } catch (error) {
    console.error("[distress-store] failed to update record", error);
    return null;
  }
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Seed through the same Redis key and record shape — not a parallel source. */
export async function seedEscalationsIfEmpty(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const length = await redis.llen(ESCALATION_KEY);
    if (length > 0) return;

    const seeds: EscalationRecord[] = [
      {
        id: SEED_IDS.passiveOpen,
        createdAt: hoursAgo(0.4),
        student: STUDENT.fullName,
        method: "passive_pattern",
        surface: "today_ask",
        text: "I don't really see the point in trying anymore. Nothing I do makes a difference, at school or at home. I don't want to talk about it.",
        helpReason: null,
        classifierFailed: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        views: [],
      },
      {
        id: SEED_IDS.studentViewed,
        createdAt: hoursAgo(2),
        student: STUDENT.fullName,
        method: "student_initiated",
        surface: "need_help_button",
        text: null,
        helpReason: "I'm feeling overwhelmed by my schoolwork" satisfies HelpReasonLabel,
        classifierFailed: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        views: [
          {
            staffId: "david_chen",
            viewedAt: hoursAgo(1.5),
          },
        ],
      },
      {
        id: SEED_IDS.agedOpen,
        createdAt: hoursAgo(26),
        student: STUDENT.fullName,
        method: "passive_pattern",
        surface: "practice_ask",
        text: "Nothing I try works anymore. I keep getting stuck on the same step.",
        helpReason: null,
        classifierFailed: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        views: [],
      },
      {
        id: SEED_IDS.acknowledged,
        createdAt: daysAgo(2),
        student: STUDENT.fullName,
        method: "passive_pattern",
        surface: "practice_ask",
        text: "I give up, none of this matters anyway. what do i do after subtracting 2x",
        helpReason: null,
        classifierFailed: true,
        acknowledgedBy: DEMO_SESSION_STAFF_ID,
        acknowledgedAt: hoursAgo(47),
        views: [
          {
            staffId: DEMO_SESSION_STAFF_ID,
            viewedAt: daysAgo(2),
          },
        ],
      },
    ];

    // LPUSH in reverse so the array order matches newest-first in the list.
    for (let i = seeds.length - 1; i >= 0; i -= 1) {
      await redis.lpush(ESCALATION_KEY, JSON.stringify(seeds[i]));
    }
    await redis.ltrim(ESCALATION_KEY, 0, ESCALATION_CAP - 1);
    console.info(`[distress-store] seeded ${seeds.length} demo escalation records`);
  } catch (error) {
    console.error("[distress-store] failed to seed records", error);
  }
}
