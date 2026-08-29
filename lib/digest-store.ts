/**
 * Weekly Teacher Digest (Req 12) — metrics from existing sources + Redis
 * schedule preference. Email delivery is out of scope; content generation
 * is a real AI call grounded in these metrics.
 */

import {
  OVERVIEW_MISCONCEPTION_AGGREGATES,
  ROSTER,
  getRosterStudent,
} from "@/lib/demo-data/roster";
import { DEMO_SESSION_STAFF_ID } from "@/lib/demo-data/staff";
import {
  DIGEST_WEEKDAY_OPTIONS,
  type DigestDurableStudent,
  type DigestSchedule,
  type DigestWeekday,
  type WeeklyDigestMetrics,
} from "@/lib/digest-types";
import { listAllOverrideHistory } from "@/lib/override-store";
import { getRedis } from "@/lib/rate-limit";
import { getEffectiveSpaceId, listSpaces } from "@/lib/space-store";

export type {
  DigestDurableStudent,
  DigestMisconceptionMetric,
  DigestSchedule,
  DigestWeekday,
  WeeklyDigestMetrics,
} from "@/lib/digest-types";
export { DIGEST_WEEKDAY_OPTIONS } from "@/lib/digest-types";

export const DIGEST_SCHEDULE_KEY_PREFIX = "escolent:digest:schedule:";

const WEEKDAYS: DigestWeekday[] = DIGEST_WEEKDAY_OPTIONS.map((option) => option.id);

const DEFAULT_SCHEDULE: Omit<DigestSchedule, "teacherId" | "updatedAt"> = {
  weekday: "friday",
  time: "16:00",
};

function scheduleKey(teacherId: string): string {
  return `${DIGEST_SCHEDULE_KEY_PREFIX}${teacherId}`;
}

function isWeekday(value: unknown): value is DigestWeekday {
  return typeof value === "string" && WEEKDAYS.includes(value as DigestWeekday);
}

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeSchedule(raw: unknown, teacherId: string): DigestSchedule | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<DigestSchedule>;
  if (!isWeekday(entry.weekday) || !isValidTime(entry.time)) return null;
  return {
    teacherId,
    weekday: entry.weekday,
    time: entry.time,
    updatedAt:
      typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
  };
}

export function defaultDigestSchedule(teacherId = DEMO_SESSION_STAFF_ID): DigestSchedule {
  return {
    teacherId,
    ...DEFAULT_SCHEDULE,
    updatedAt: new Date().toISOString(),
  };
}

export async function getDigestSchedule(
  teacherId = DEMO_SESSION_STAFF_ID,
): Promise<DigestSchedule> {
  const redis = getRedis();
  if (!redis) return defaultDigestSchedule(teacherId);

  try {
    const raw = await redis.get<string | DigestSchedule>(scheduleKey(teacherId));
    if (raw == null) return defaultDigestSchedule(teacherId);
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    return normalizeSchedule(parsed, teacherId) ?? defaultDigestSchedule(teacherId);
  } catch (error) {
    console.error("[digest-store] failed to read schedule", error);
    return defaultDigestSchedule(teacherId);
  }
}

export type DigestScheduleWriteResult =
  | { ok: true; schedule: DigestSchedule }
  | { ok: false; error: string; status: number };

export async function saveDigestSchedule(input: {
  teacherId?: string;
  weekday: unknown;
  time: unknown;
}): Promise<DigestScheduleWriteResult> {
  const teacherId = input.teacherId ?? DEMO_SESSION_STAFF_ID;
  if (!isWeekday(input.weekday)) {
    return { ok: false, error: "Weekday must be a valid day of week.", status: 400 };
  }
  if (!isValidTime(input.time)) {
    return { ok: false, error: "Time must be HH:MM in 24-hour format.", status: 400 };
  }

  const schedule: DigestSchedule = {
    teacherId,
    weekday: input.weekday,
    time: input.time,
    updatedAt: new Date().toISOString(),
  };

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(scheduleKey(teacherId), JSON.stringify(schedule));
      return { ok: true, schedule };
    } catch (error) {
      console.error("[digest-store] redis schedule write failed, falling back to log", error);
    }
  }
  console.error(`[DIGEST SCHEDULE] ${JSON.stringify(schedule)}`);
  return { ok: true, schedule };
}

function weekWindow(now = new Date()): { start: Date; end: Date } {
  const end = now;
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Compute digest metrics from existing sources only.
 *
 * Durable mastery this week: override history `mark_mastered` entries whose
 * appliedAt falls in the last 7 days. This reflects teacher-confirmed
 * transitions specifically — the only source with real week-level timestamps;
 * natural practice-driven mastery isn't currently tracked with change-history
 * granularity.
 */
export async function computeWeeklyDigestMetrics(
  now = new Date(),
): Promise<WeeklyDigestMetrics> {
  const { start, end } = weekWindow(now);
  const spaces = await listSpaces();
  const spaceNameById = Object.fromEntries(
    spaces.map((space) => [space.id, space.name]),
  );

  const history = await listAllOverrideHistory();
  const recentMastered = history.filter((entry) => {
    if (entry.kind !== "mark_mastered") return false;
    const at = new Date(entry.appliedAt).getTime();
    return Number.isFinite(at) && at >= start.getTime() && at <= end.getTime();
  });

  const durableByStudent = new Map<string, DigestDurableStudent>();
  for (const entry of recentMastered) {
    if (durableByStudent.has(entry.studentId)) continue;
    const student = getRosterStudent(entry.studentId);
    const spaceId = (await getEffectiveSpaceId(entry.studentId)) ?? student?.spaceId ?? null;
    durableByStudent.set(entry.studentId, {
      studentId: entry.studentId,
      fullName: student?.fullName ?? entry.studentId,
      skillId: entry.skillId,
      spaceId,
      spaceName: spaceId ? (spaceNameById[spaceId] ?? spaceId) : "Unknown Space",
      appliedAt: entry.appliedAt,
    });
  }

  const flaggedStudents = ROSTER.filter((student) => student.flaggedSkillIds.length > 0);

  const misconceptions = [...OVERVIEW_MISCONCEPTION_AGGREGATES]
    .map((aggregate) => ({
      id: aggregate.id,
      label: aggregate.label,
      skillName: aggregate.skillName,
      studentCount: aggregate.studentIds.length,
    }))
    .sort((a, b) => b.studentCount - a.studentCount || a.label.localeCompare(b.label));

  return {
    weekStartIso: start.toISOString(),
    weekEndIso: end.toISOString(),
    spaceNames: spaces.map((space) => space.name),
    durableMasteryCount: durableByStudent.size,
    durableMasteryStudents: [...durableByStudent.values()],
    flaggedGapCount: flaggedStudents.length,
    flaggedGapStudentNames: flaggedStudents.map((student) => student.fullName),
    misconceptions,
  };
}

/** Flat grounding lines for the digest AI prompt — numbers and names only. */
export function weeklyDigestGroundingLines(metrics: WeeklyDigestMetrics): string[] {
  const lines: string[] = [
    `Spaces taught: ${metrics.spaceNames.join("; ") || "none"}`,
    `Week window: ${metrics.weekStartIso} → ${metrics.weekEndIso}`,
    `Students who reached durable mastery this week (teacher-confirmed mark_mastered only): ${metrics.durableMasteryCount}`,
  ];
  if (metrics.durableMasteryStudents.length > 0) {
    for (const student of metrics.durableMasteryStudents) {
      lines.push(
        `  - ${student.fullName} (${student.spaceName}), skill ${student.skillId}, at ${student.appliedAt}`,
      );
    }
  }
  lines.push(
    `Students with flagged prerequisite gaps (current roster): ${metrics.flaggedGapCount}`,
  );
  if (metrics.flaggedGapStudentNames.length > 0) {
    lines.push(`  - ${metrics.flaggedGapStudentNames.join(", ")}`);
  }
  lines.push("Most common misconceptions (ranked by affected-student count):");
  if (metrics.misconceptions.length === 0) {
    lines.push("  - none");
  } else {
    for (const item of metrics.misconceptions) {
      lines.push(
        `  - ${item.label} (${item.skillName}): ${item.studentCount} students`,
      );
    }
  }
  return lines;
}
