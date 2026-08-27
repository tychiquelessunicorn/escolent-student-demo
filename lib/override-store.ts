/**
 * Teacher mastery overrides — single write path for Overview and Briefing revisit.
 * Baseline seed comes from roster (Elena Cruz); live mutations merge on top.
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

let seeded = false;
let history: OverrideHistoryEntry[] = [];
const live = new Map<string, LiveStudentState>();

function ensureSeeded() {
  if (seeded) return;
  seeded = true;
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
    history.push(entry);
    const state = ensureLive(student.id);
    state.activeBySkill[record.skillId] = { ...record };
  }
}

function ensureLive(studentId: string): LiveStudentState {
  let state = live.get(studentId);
  if (!state) {
    state = { tierPatches: {}, activeBySkill: {} };
    live.set(studentId, state);
  }
  return state;
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

export function listOverrideHistory(studentId: string): OverrideHistoryEntry[] {
  ensureSeeded();
  return history
    .filter((entry) => entry.studentId === studentId)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

export function listActiveOverrides(studentId: string): MasteryOverrideRecord[] {
  ensureSeeded();
  const state = live.get(studentId);
  if (!state) {
    const base = getRosterStudent(studentId);
    return base?.override ? [base.override] : [];
  }
  return Object.values(state.activeBySkill).sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );
}

export function getActiveOverride(
  studentId: string,
  skillId: string,
): MasteryOverrideRecord | null {
  return listActiveOverrides(studentId).find((entry) => entry.skillId === skillId) ?? null;
}

/**
 * Roster row with live tier patches + primary `override` (oldest active —
 * drives Briefing 30-day revisit the same way Elena's seed did).
 */
export function getEffectiveStudent(studentId: string): RosterStudent | null {
  ensureSeeded();
  const base = getRosterStudent(studentId);
  if (!base) return null;

  const state = live.get(studentId);
  const active = listActiveOverrides(studentId);
  const tiers = base.tiers.map((tier, index) => {
    const skillId = OVERVIEW_SKILL_IDS[index];
    if (!skillId) return tier;
    return state?.tierPatches[skillId] ?? tier;
  });

  // Primary for Briefing: oldest active override (first due for revisit).
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

export function listEffectiveStudents(spaceFilter: string | null): RosterStudent[] {
  ensureSeeded();
  return ROSTER.map((student) => getEffectiveStudent(student.id)!)
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

export function applyOverride(input: ApplyOverrideInput): ApplyOverrideResult | ApplyOverrideError {
  ensureSeeded();
  const base = getRosterStudent(input.studentId);
  if (!base) return { ok: false, error: "Student not found", status: 404 };

  const skillIndex = OVERVIEW_SKILL_IDS.indexOf(input.skillId);
  if (skillIndex < 0) return { ok: false, error: "Skill not found", status: 400 };

  const teacherId = input.teacherId ?? DEMO_SESSION_STAFF_ID;
  const entryMethod = input.entryMethod ?? "structured";
  const now = new Date().toISOString();
  const state = ensureLive(input.studentId);

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
    history = [entry, ...history];
    return { ok: true, entry, student: getEffectiveStudent(input.studentId)! };
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
  history = [entry, ...history];

  return { ok: true, entry, student: getEffectiveStudent(input.studentId)! };
}

/** Test / harness helper — not used by UI. */
export function resetOverrideStoreForTests() {
  seeded = false;
  history = [];
  live.clear();
}
