/**
 * Teacher mastery overrides — single write path for Overview and Briefing revisit.
 * Baseline seed comes from roster (Elena Cruz); live mutations merge on top.
 *
 * Redis-backed like distress-store: serverless instances do not share memory.
 * Seed writes into Redis on first read when the history list is empty.
 */

import { randomUUID } from "crypto";
import {
  ROSTER,
  getRosterStudent,
  type MasteryOverrideRecord,
  type RosterStudent,
} from "@/lib/demo-data/roster";
import { OVERVIEW_SKILL_IDS } from "@/lib/demo-data/overview-skills";
import { DEMO_SESSION_STAFF_ID } from "@/lib/demo-data/staff";
import type { MasteryTier } from "@/lib/demo-data/types";
import { getRedis } from "@/lib/rate-limit";
import { getEffectiveSpaceId } from "@/lib/space-store";

export type OverrideEntryMethod = "structured" | "conversational";
export type OverrideKind = "mark_mastered" | "reconfirm";

export interface OverrideHistoryEntry {
  id: string;
  studentId: string;
  skillId: string;
  reason: string;
  appliedAt: string;
  teacherId: string;
  entryMethod: OverrideEntryMethod;
  kind: OverrideKind;
}

type LiveStudentState = {
  /** skillId → durable (etc.) patches over roster baseline. */
  tierPatches: Record<string, MasteryTier>;
  /** Active override per skill (latest apply / reconfirm). */
  activeBySkill: Record<string, MasteryOverrideRecord>;
};

const REASON_MIN = 10;
const REASON_MAX = 200;

export const OVERRIDE_HISTORY_KEY = "escolent:overrides:history";
export const OVERRIDE_HISTORY_CAP = 500;
const OVERRIDE_LIVE_PREFIX = "escolent:overrides:live:";

function liveKey(studentId: string): string {
  return `${OVERRIDE_LIVE_PREFIX}${studentId}`;
}

function emptyLive(): LiveStudentState {
  return { tierPatches: {}, activeBySkill: {} };
}

function normalizeHistoryEntry(raw: unknown): OverrideHistoryEntry | null {
  const entry = raw as Partial<OverrideHistoryEntry>;
  if (!entry || typeof entry !== "object") return null;
  if (
    typeof entry.id !== "string" ||
    typeof entry.studentId !== "string" ||
    typeof entry.skillId !== "string" ||
    typeof entry.reason !== "string" ||
    typeof entry.appliedAt !== "string" ||
    typeof entry.teacherId !== "string"
  ) {
    return null;
  }
  return {
    id: entry.id,
    studentId: entry.studentId,
    skillId: entry.skillId,
    reason: entry.reason,
    appliedAt: entry.appliedAt,
    teacherId: entry.teacherId,
    entryMethod: entry.entryMethod === "conversational" ? "conversational" : "structured",
    kind: entry.kind === "reconfirm" ? "reconfirm" : "mark_mastered",
  };
}

function normalizeLiveState(raw: unknown): LiveStudentState {
  if (!raw || typeof raw !== "object") return emptyLive();
  const entry = raw as Partial<LiveStudentState>;
  const tierPatches: Record<string, MasteryTier> = {};
  if (entry.tierPatches && typeof entry.tierPatches === "object") {
    for (const [skillId, tier] of Object.entries(entry.tierPatches)) {
      if (
        tier === "not_attempted" ||
        tier === "struggling" ||
        tier === "emerging" ||
        tier === "tentative" ||
        tier === "durable"
      ) {
        tierPatches[skillId] = tier;
      }
    }
  }
  const activeBySkill: Record<string, MasteryOverrideRecord> = {};
  if (entry.activeBySkill && typeof entry.activeBySkill === "object") {
    for (const [skillId, record] of Object.entries(entry.activeBySkill)) {
      if (
        record &&
        typeof record === "object" &&
        typeof record.skillId === "string" &&
        typeof record.reason === "string" &&
        typeof record.appliedAt === "string" &&
        typeof record.teacherId === "string"
      ) {
        activeBySkill[skillId] = {
          skillId: record.skillId,
          reason: record.reason,
          appliedAt: record.appliedAt,
          teacherId: record.teacherId,
        };
      }
    }
  }
  return { tierPatches, activeBySkill };
}

/** Roster-only fallback when Redis is unavailable — seed shape, no mutations. */
function rosterFallbackLive(studentId: string): LiveStudentState {
  const base = getRosterStudent(studentId);
  if (!base?.override) return emptyLive();
  return {
    tierPatches: {},
    activeBySkill: { [base.override.skillId]: { ...base.override } },
  };
}

function rosterFallbackHistory(studentId: string): OverrideHistoryEntry[] {
  const base = getRosterStudent(studentId);
  if (!base?.override) return [];
  const record = base.override;
  return [
    {
      id: `seed-${base.id}-${record.skillId}`,
      studentId: base.id,
      skillId: record.skillId,
      reason: record.reason,
      appliedAt: record.appliedAt,
      teacherId: record.teacherId,
      entryMethod: "structured",
      kind: "mark_mastered",
    },
  ];
}

/** Seed through the same Redis keys — not a parallel in-memory source. */
export async function seedOverridesIfEmpty(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const length = await redis.llen(OVERRIDE_HISTORY_KEY);
    if (length > 0) return;

    const seeds: { entry: OverrideHistoryEntry; live: LiveStudentState }[] = [];
    for (const student of ROSTER) {
      if (!student.override) continue;
      const record = student.override;
      const entry: OverrideHistoryEntry = {
        id: `seed-${student.id}-${record.skillId}`,
        studentId: student.id,
        skillId: record.skillId,
        reason: record.reason,
        appliedAt: record.appliedAt,
        teacherId: record.teacherId,
        entryMethod: "structured",
        kind: "mark_mastered",
      };
      seeds.push({
        entry,
        live: {
          tierPatches: {},
          activeBySkill: { [record.skillId]: { ...record } },
        },
      });
    }

    // LPUSH in reverse so the array order matches newest-first in the list.
    for (let i = seeds.length - 1; i >= 0; i -= 1) {
      const seed = seeds[i];
      await redis.lpush(OVERRIDE_HISTORY_KEY, JSON.stringify(seed.entry));
      await redis.set(liveKey(seed.entry.studentId), JSON.stringify(seed.live));
    }
    await redis.ltrim(OVERRIDE_HISTORY_KEY, 0, OVERRIDE_HISTORY_CAP - 1);
    console.info(`[override-store] seeded ${seeds.length} demo override records`);
  } catch (error) {
    console.error("[override-store] failed to seed records", error);
  }
}

async function readAllHistory(): Promise<OverrideHistoryEntry[]> {
  await seedOverridesIfEmpty();
  const redis = getRedis();
  if (!redis) {
    return ROSTER.flatMap((student) => rosterFallbackHistory(student.id));
  }

  try {
    const raw = await redis.lrange<string | OverrideHistoryEntry>(
      OVERRIDE_HISTORY_KEY,
      0,
      OVERRIDE_HISTORY_CAP - 1,
    );
    return raw
      .map((entry) =>
        normalizeHistoryEntry(
          typeof entry === "string" ? (JSON.parse(entry) as unknown) : entry,
        ),
      )
      .filter((entry): entry is OverrideHistoryEntry => Boolean(entry));
  } catch (error) {
    console.error("[override-store] failed to read history", error);
    return ROSTER.flatMap((student) => rosterFallbackHistory(student.id));
  }
}

async function readLive(studentId: string): Promise<LiveStudentState> {
  await seedOverridesIfEmpty();
  const redis = getRedis();
  if (!redis) return rosterFallbackLive(studentId);

  try {
    const raw = await redis.get<string | LiveStudentState>(liveKey(studentId));
    if (raw == null) return emptyLive();
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    return normalizeLiveState(parsed);
  } catch (error) {
    console.error("[override-store] failed to read live state", error);
    return rosterFallbackLive(studentId);
  }
}

async function writeLive(studentId: string, state: LiveStudentState): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(liveKey(studentId), JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("[override-store] redis live write failed, falling back to log", error);
    }
  }
  console.error(`[OVERRIDE LIVE] ${studentId} ${JSON.stringify(state)}`);
  return false;
}

async function pushHistory(entry: OverrideHistoryEntry): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.lpush(OVERRIDE_HISTORY_KEY, JSON.stringify(entry));
      await redis.ltrim(OVERRIDE_HISTORY_KEY, 0, OVERRIDE_HISTORY_CAP - 1);
      console.info(
        `[override] recorded ${entry.id} student=${entry.studentId} skill=${entry.skillId} kind=${entry.kind}`,
      );
      return true;
    } catch (error) {
      console.error("[override-store] redis history write failed, falling back to log", error);
    }
  }
  console.error(`[OVERRIDE RECORD] ${JSON.stringify(entry)}`);
  return false;
}

export function validateOverrideReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < REASON_MIN) {
    return `Reason must be at least ${REASON_MIN} characters.`;
  }
  if (trimmed.length > REASON_MAX) {
    return `Reason must be at most ${REASON_MAX} characters.`;
  }
  return null;
}

export async function listOverrideHistory(studentId: string): Promise<OverrideHistoryEntry[]> {
  const history = await readAllHistory();
  return history
    .filter((entry) => entry.studentId === studentId)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

/** Full override history (newest-first) — used by weekly digest metrics. */
export async function listAllOverrideHistory(): Promise<OverrideHistoryEntry[]> {
  const history = await readAllHistory();
  return [...history].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );
}

export async function listActiveOverrides(studentId: string): Promise<MasteryOverrideRecord[]> {
  const state = await readLive(studentId);
  if (Object.keys(state.activeBySkill).length === 0) {
    const base = getRosterStudent(studentId);
    return base?.override ? [base.override] : [];
  }
  return Object.values(state.activeBySkill).sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );
}

export async function getActiveOverride(
  studentId: string,
  skillId: string,
): Promise<MasteryOverrideRecord | null> {
  const active = await listActiveOverrides(studentId);
  return active.find((entry) => entry.skillId === skillId) ?? null;
}

function composeEffectiveStudent(
  base: RosterStudent,
  state: LiveStudentState,
): RosterStudent {
  const active = Object.values(state.activeBySkill).sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );
  const tiers = base.tiers.map((tier, index) => {
    const skillId = OVERVIEW_SKILL_IDS[index];
    if (!skillId) return tier;
    return state.tierPatches[skillId] ?? tier;
  });
  const primary =
    [...active].sort(
      (a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime(),
    )[0] ?? null;
  return {
    ...base,
    tiers,
    override: primary,
  };
}

/**
 * Roster row with live tier patches + primary `override` (oldest active —
 * drives Briefing 30-day revisit the same way Elena's seed did) + Space
 * assignment layered over roster.spaceId.
 */
export async function getEffectiveStudent(studentId: string): Promise<RosterStudent | null> {
  const base = getRosterStudent(studentId);
  if (!base) return null;
  const state = await readLive(studentId);
  const composed = composeEffectiveStudent(base, state);
  const spaceId = (await getEffectiveSpaceId(studentId)) ?? composed.spaceId;
  return { ...composed, spaceId };
}

export async function listEffectiveStudents(spaceFilter: string | null): Promise<RosterStudent[]> {
  const students = await Promise.all(ROSTER.map((student) => getEffectiveStudent(student.id)));
  return students
    .filter((student): student is RosterStudent => Boolean(student))
    .filter((student) => !spaceFilter || spaceFilter === "all" || student.spaceId === spaceFilter);
}

export interface ApplyOverrideInput {
  studentId: string;
  skillId: string;
  reason: string;
  kind: OverrideKind;
  entryMethod?: OverrideEntryMethod;
  teacherId?: string;
}

export interface ApplyOverrideResult {
  ok: true;
  entry: OverrideHistoryEntry;
  student: RosterStudent;
}

export interface ApplyOverrideError {
  ok: false;
  error: string;
  status: number;
}

export async function applyOverride(
  input: ApplyOverrideInput,
): Promise<ApplyOverrideResult | ApplyOverrideError> {
  await seedOverridesIfEmpty();
  const base = getRosterStudent(input.studentId);
  if (!base) return { ok: false, error: "Student not found", status: 404 };

  const skillIndex = OVERVIEW_SKILL_IDS.indexOf(input.skillId);
  if (skillIndex < 0) return { ok: false, error: "Skill not found", status: 400 };

  const teacherId = input.teacherId ?? DEMO_SESSION_STAFF_ID;
  const entryMethod = input.entryMethod ?? "structured";
  const now = new Date().toISOString();
  const state = await readLive(input.studentId);

  if (input.kind === "reconfirm") {
    const existing = state.activeBySkill[input.skillId] ?? base.override;
    if (!existing || existing.skillId !== input.skillId) {
      return { ok: false, error: "No override on file for this skill to reconfirm", status: 400 };
    }
    const record: MasteryOverrideRecord = {
      skillId: input.skillId,
      reason: existing.reason,
      appliedAt: now,
      teacherId,
    };
    state.activeBySkill[input.skillId] = record;
    state.tierPatches[input.skillId] = "durable";
    const entry: OverrideHistoryEntry = {
      id: randomUUID(),
      studentId: input.studentId,
      skillId: input.skillId,
      reason: existing.reason,
      appliedAt: now,
      teacherId,
      entryMethod,
      kind: "reconfirm",
    };
    await writeLive(input.studentId, state);
    await pushHistory(entry);
    return { ok: true, entry, student: composeEffectiveStudent(base, state) };
  }

  // mark_mastered (also used for "reassess" when an override already exists)
  const reasonError = validateOverrideReason(input.reason);
  if (reasonError) return { ok: false, error: reasonError, status: 400 };

  const currentTier =
    state.tierPatches[input.skillId] ?? base.tiers[skillIndex] ?? "not_attempted";
  const hasActive = Boolean(state.activeBySkill[input.skillId]);
  if (currentTier === "durable" && !hasActive) {
    return { ok: false, error: "Skill is already durable", status: 400 };
  }

  const reason = input.reason.trim();
  const record: MasteryOverrideRecord = {
    skillId: input.skillId,
    reason,
    appliedAt: now,
    teacherId,
  };
  state.activeBySkill[input.skillId] = record;
  state.tierPatches[input.skillId] = "durable";

  const entry: OverrideHistoryEntry = {
    id: randomUUID(),
    studentId: input.studentId,
    skillId: input.skillId,
    reason,
    appliedAt: now,
    teacherId,
    entryMethod,
    kind: "mark_mastered",
  };
  await writeLive(input.studentId, state);
  await pushHistory(entry);

  return { ok: true, entry, student: composeEffectiveStudent(base, state) };
}
