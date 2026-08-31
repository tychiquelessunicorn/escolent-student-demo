/**
 * Admin pilot scope — Req 14.1–14.4 (14.5 deferred, 14.6 satisfied elsewhere).
 *
 * Per-Space enable flags and day-21 checkpoint summary. Req 14.5 (Pedagogical Lead
 * subject activation) is intentionally out of scope — no content-validation system yet.
 * Req 14.6: Admin has no Skill/Misconception write screens anywhere in this build.
 */

import { adminBriefingScopeLabel } from "@/lib/admin-briefing-store";
import {
  demoAnalyticsAnchorDate,
  formatAnalyticsDateLabel,
  parseSessionDisplayDate,
  toIsoDate,
} from "@/lib/demo-data/session-dates";
import { DEMO_SESSION_STUDENT_ID, ROSTER } from "@/lib/demo-data/roster";
import { getStaffMember } from "@/lib/demo-data/staff";
import { SEED_TEACHER_SPACES } from "@/lib/demo-data/teacher-spaces";
import { getRedis } from "@/lib/rate-limit";
import { listStaffAccountRecords } from "@/lib/admin-users-store";
import { getEffectiveSpaceId, listStudentIdsForSpace } from "@/lib/space-store";

export { DEMO_SESSION_STUDENT_ID };

export const PILOT_SPACE_IDS = ["algebra_8a", "remediation_8a"] as const;

export type PilotSpaceId = (typeof PILOT_SPACE_IDS)[number];

/** Demo timeline: week 6 ≈ day 42 of the pilot. */
export const PILOT_WEEK_NUMBER = 6;
export const PILOT_TOTAL_DAYS = PILOT_WEEK_NUMBER * 7;
export const PILOT_CHECKPOINT_DAY = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

const SPACE_ENABLED_KEY = "escolent:pilot:space-enabled";
const DAY21_SUMMARY_KEY = "escolent:pilot:day21-summary";
const DEMO_AT_DAY21_KEY = "escolent:pilot:demo-at-day21";

export interface PilotSpaceAccess {
  id: PilotSpaceId;
  name: string;
  shortName: string;
  grade: string;
  teacherName: string;
  enabled: boolean;
  studentCount: number;
}

export interface PilotStaffAccessRow {
  id: string;
  fullName: string;
  shortName: string;
  roleLabel: string;
  statusLabel: string;
  email: string;
}

export interface PilotDay21Summary {
  checkpointDay: number;
  generatedAt: string;
  generatedDateLabel: string;
  pilotDayAtGeneration: number;
  activeStudents: number;
  studentsWithSessions: number;
  totalSessions: number;
  totalPracticeProblems: number;
  averageDurableSkillsPerStudent: number;
  summaryLines: string[];
}

export interface PilotDay21Presentation {
  mode: "historical" | "simulated_day_21" | "not_yet_due";
  summary: PilotDay21Summary | null;
  checkpointDateLabel: string;
  currentPilotDay: number;
}

export interface AdminPilotPayload {
  scopeLabel: string;
  computedAt: string;
  pilotWeek: number;
  currentPilotDay: number;
  checkpointDay: number;
  checkpointDateLabel: string;
  demoAtDay21: boolean;
  spaces: PilotSpaceAccess[];
  staff: PilotStaffAccessRow[];
  totalStudents: number;
  day21: PilotDay21Presentation;
  notes: {
    req145Deferred: string;
    req146Satisfied: string;
  };
}

type SpaceEnabledMap = Record<PilotSpaceId, boolean>;

function pilotStartDate(): Date {
  const anchor = demoAnalyticsAnchorDate();
  return new Date(anchor.getTime() - (PILOT_TOTAL_DAYS - 1) * DAY_MS);
}

export function pilotCheckpointDate(): Date {
  return new Date(pilotStartDate().getTime() + (PILOT_CHECKPOINT_DAY - 1) * DAY_MS);
}

function seedSpaceEnabled(): SpaceEnabledMap {
  return {
    algebra_8a: true,
    remediation_8a: true,
  };
}

/** Process-local overlay — keeps toggles and enforcement aligned when Redis is absent. */
let runtimeSpaceEnabled: SpaceEnabledMap | null = null;

async function readSpaceEnabled(): Promise<SpaceEnabledMap> {
  const redis = getRedis();
  const seed = seedSpaceEnabled();
  if (!redis) return runtimeSpaceEnabled ?? seed;
  try {
    const raw = await redis.get<string | SpaceEnabledMap>(SPACE_ENABLED_KEY);
    if (raw == null) return runtimeSpaceEnabled ?? seed;
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as SpaceEnabledMap) : raw;
    runtimeSpaceEnabled = {
      algebra_8a: parsed.algebra_8a !== false,
      remediation_8a: parsed.remediation_8a !== false,
    };
    return runtimeSpaceEnabled;
  } catch (error) {
    console.error("[admin-pilot-store] failed to read space enabled flags", error);
    return runtimeSpaceEnabled ?? seed;
  }
}

async function writeSpaceEnabled(map: SpaceEnabledMap): Promise<boolean> {
  runtimeSpaceEnabled = { ...map };
  const redis = getRedis();
  if (!redis) return true;
  try {
    await redis.set(SPACE_ENABLED_KEY, JSON.stringify(map));
    return true;
  } catch (error) {
    console.error("[admin-pilot-store] failed to write space enabled flags", error);
    return false;
  }
}

export async function isPilotSpaceEnabled(spaceId: string): Promise<boolean> {
  if (!PILOT_SPACE_IDS.includes(spaceId as PilotSpaceId)) return true;
  const map = await readSpaceEnabled();
  return map[spaceId as PilotSpaceId];
}

export async function setPilotSpaceEnabled(
  spaceId: PilotSpaceId,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const map = await readSpaceEnabled();
  map[spaceId] = enabled;
  const saved = await writeSpaceEnabled(map);
  if (!saved) return { ok: false, error: "Could not save — Redis is unavailable." };
  return { ok: true };
}

export async function isPilotDemoAtDay21(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    return Boolean(await redis.get(DEMO_AT_DAY21_KEY));
  } catch {
    return false;
  }
}

export async function setPilotDemoAtDay21(enabled: boolean): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (enabled) await redis.set(DEMO_AT_DAY21_KEY, "1");
    else await redis.del(DEMO_AT_DAY21_KEY);
  } catch (error) {
    console.error("[admin-pilot-store] failed to set demo-at-day21 flag", error);
  }
}

export async function currentPilotDayNumber(): Promise<number> {
  if (await isPilotDemoAtDay21()) return PILOT_CHECKPOINT_DAY;
  return PILOT_TOTAL_DAYS;
}

function computeDay21Metrics(checkpointEnd: Date): Omit<
  PilotDay21Summary,
  "generatedAt" | "generatedDateLabel" | "pilotDayAtGeneration"
> {
  const checkpointEndMs = checkpointEnd.getTime();
  const activeWindowStart = checkpointEndMs - 7 * DAY_MS;

  let studentsWithSessions = 0;
  let totalSessions = 0;
  let totalPracticeProblems = 0;
  let activeStudents = 0;
  let durableSkillTotal = 0;

  for (const student of ROSTER) {
    let studentHadSession = false;
    for (const session of student.recentSessions) {
      const parsed = parseSessionDisplayDate(session.date);
      if (!parsed || parsed.getTime() > checkpointEndMs) continue;
      studentHadSession = true;
      totalSessions += 1;
      totalPracticeProblems += session.problemsAttempted;
    }
    if (studentHadSession) studentsWithSessions += 1;

    const lastActivity = new Date(student.lastActivityAt).getTime();
    if (lastActivity >= activeWindowStart && lastActivity <= checkpointEndMs) {
      activeStudents += 1;
    }

    durableSkillTotal += student.tiers.filter((tier) => tier === "durable").length;
  }

  const averageDurableSkillsPerStudent =
    ROSTER.length === 0 ? 0 : Math.round((durableSkillTotal / ROSTER.length) * 10) / 10;

  return {
    checkpointDay: PILOT_CHECKPOINT_DAY,
    activeStudents,
    studentsWithSessions,
    totalSessions,
    totalPracticeProblems,
    averageDurableSkillsPerStudent,
    summaryLines: [
      `${studentsWithSessions} of ${ROSTER.length} students had logged practice by day ${PILOT_CHECKPOINT_DAY}.`,
      `${activeStudents} were active in the 7 days leading up to the checkpoint.`,
      `${totalPracticeProblems} practice problems attempted across ${totalSessions} sessions to date.`,
      `Average ${averageDurableSkillsPerStudent} durable skills per student in the mastery snapshot.`,
    ],
  };
}

async function readDay21Summary(): Promise<PilotDay21Summary | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string | PilotDay21Summary>(DAY21_SUMMARY_KEY);
    if (raw == null) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as PilotDay21Summary) : raw;
  } catch {
    return null;
  }
}

async function writeDay21Summary(summary: PilotDay21Summary): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(DAY21_SUMMARY_KEY, JSON.stringify(summary));
}

async function ensureHistoricalDay21Summary(): Promise<PilotDay21Summary> {
  const existing = await readDay21Summary();
  if (existing) return existing;

  const checkpointEnd = new Date(pilotCheckpointDate().getTime());
  checkpointEnd.setUTCHours(23, 59, 59, 999);
  const metrics = computeDay21Metrics(checkpointEnd);
  const summary: PilotDay21Summary = {
    ...metrics,
    generatedAt: checkpointEnd.toISOString(),
    generatedDateLabel: formatAnalyticsDateLabel(pilotCheckpointDate()),
    pilotDayAtGeneration: PILOT_CHECKPOINT_DAY,
  };
  await writeDay21Summary(summary);
  return summary;
}

async function buildDay21Presentation(): Promise<PilotDay21Presentation> {
  const demoAtDay21 = await isPilotDemoAtDay21();
  const currentPilotDay = await currentPilotDayNumber();
  const checkpointDateLabel = formatAnalyticsDateLabel(pilotCheckpointDate());

  if (demoAtDay21) {
    const checkpointEnd = new Date(pilotCheckpointDate().getTime());
    checkpointEnd.setUTCHours(23, 59, 59, 999);
    const metrics = computeDay21Metrics(checkpointEnd);
    return {
      mode: "simulated_day_21",
      currentPilotDay,
      checkpointDateLabel,
      summary: {
        ...metrics,
        generatedAt: new Date().toISOString(),
        generatedDateLabel: checkpointDateLabel,
        pilotDayAtGeneration: PILOT_CHECKPOINT_DAY,
      },
    };
  }

  if (currentPilotDay >= PILOT_CHECKPOINT_DAY) {
    const summary = await ensureHistoricalDay21Summary();
    return {
      mode: "historical",
      currentPilotDay,
      checkpointDateLabel,
      summary,
    };
  }

  return {
    mode: "not_yet_due",
    currentPilotDay,
    checkpointDateLabel,
    summary: null,
  };
}

export async function buildAdminPilotPayload(): Promise<AdminPilotPayload> {
  const [, staffAccounts, demoAtDay21] = await Promise.all([
    readSpaceEnabled(),
    listStaffAccountRecords(),
    isPilotDemoAtDay21(),
  ]);

  const spaces: PilotSpaceAccess[] = await Promise.all(
    SEED_TEACHER_SPACES.map(async (seed) => {
      const studentIds = await listStudentIdsForSpace(seed.id);
      const teacher = getStaffMember(seed.teacherId);
      return {
        id: seed.id as PilotSpaceId,
        name: seed.name,
        shortName: seed.shortName,
        grade: seed.grade,
        teacherName: teacher?.shortName ?? "Unknown teacher",
        enabled: await isPilotSpaceEnabled(seed.id),
        studentCount: studentIds.length,
      };
    }),
  );

  const staff: PilotStaffAccessRow[] = staffAccounts.map((account) => ({
    id: account.id,
    fullName: account.fullName,
    shortName: account.shortName,
    roleLabel: account.role === "admin" ? "Admin" : "Teacher",
    statusLabel:
      account.status === "active"
        ? "Active"
        : account.status === "invited"
          ? "Invited"
          : "Deactivated",
    email: account.email,
  }));

  const day21 = await buildDay21Presentation();

  return {
    scopeLabel: adminBriefingScopeLabel(),
    computedAt: new Date().toISOString(),
    pilotWeek: PILOT_WEEK_NUMBER,
    currentPilotDay: await currentPilotDayNumber(),
    checkpointDay: PILOT_CHECKPOINT_DAY,
    checkpointDateLabel: formatAnalyticsDateLabel(pilotCheckpointDate()),
    demoAtDay21,
    spaces,
    staff,
    totalStudents: ROSTER.length,
    day21,
    notes: {
      req145Deferred:
        "Subject activation by validated curriculum (Req 14.5) is deferred — Admin's Pilot Scope doesn't yet consume Pedagogical Lead's validated-content status to gate rollout.",
      req146Satisfied:
        "Req 14.6 is already satisfied: Admin has no Skill or Misconception authoring screens — only rollout scope controls here.",
    },
  };
}

export type StudentShellAccessResult =
  | { allowed: true; spaceId: string; spaceName: string }
  | { allowed: false; spaceId: string | null; spaceName: string | null; message: string };

/** Req 14.3 — block Student shell when their effective Space is disabled. */
export async function checkStudentShellAccess(
  studentId: string = DEMO_SESSION_STUDENT_ID,
): Promise<StudentShellAccessResult> {
  const spaceId = await getEffectiveSpaceId(studentId);
  if (!spaceId) {
    return {
      allowed: false,
      spaceId: null,
      spaceName: null,
      message: "Escolent could not determine which class Space you belong to.",
    };
  }

  const seed = SEED_TEACHER_SPACES.find((space) => space.id === spaceId);
  const spaceName = seed?.name ?? spaceId;

  if (PILOT_SPACE_IDS.includes(spaceId as PilotSpaceId)) {
    const enabled = await isPilotSpaceEnabled(spaceId);
    if (!enabled) {
      return {
        allowed: false,
        spaceId,
        spaceName,
        message: `${spaceName} is paused for the pilot right now — your school administrator disabled Platform access for this class. Contact your teacher or admin if you think this is a mistake.`,
      };
    }
  }

  return { allowed: true, spaceId, spaceName };
}

/** ISO date of demo "today" for pilot timeline copy. */
export function pilotTodayIso(): string {
  return toIsoDate(demoAnalyticsAnchorDate());
}
