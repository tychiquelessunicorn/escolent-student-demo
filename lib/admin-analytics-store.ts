/**
 * Admin school-wide analytics — Req 15a.
 *
 * Mastery metrics are a live snapshot from the roster (with effective overrides).
 * Adoption metrics aggregate real session records on students who have them,
 * filtered by date range. Computed on every request — no cache or fake staleness.
 */

import {
  demoAnalyticsAnchorDate,
  formatAnalyticsDateLabel,
  parseSessionDisplayDate,
  toIsoDate,
} from "@/lib/demo-data/session-dates";
import { ROSTER } from "@/lib/demo-data/roster";
import { TIER_STYLE } from "@/lib/demo-data/skills";
import type { MasteryTier, SessionRecord } from "@/lib/demo-data/types";
import { listEffectiveStudents } from "@/lib/override-store";
import { adminBriefingScopeLabel } from "@/lib/admin-briefing-store";

export type AdminAnalyticsDateRangePreset = "7d" | "14d" | "all";

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const TIER_ORDER: MasteryTier[] = [
  "durable",
  "tentative",
  "emerging",
  "struggling",
  "not_attempted",
];

export interface AdminAnalyticsDateRange {
  preset: AdminAnalyticsDateRangePreset;
  from: string;
  to: string;
  label: string;
}

export interface AdminAnalyticsAdoption {
  activeStudents: number;
  totalStudents: number;
  averageSessionDurationMinutes: number | null;
  totalPracticeProblems: number;
  sessionsInRange: number;
}

export interface AdminAnalyticsTierBucket {
  tier: MasteryTier;
  label: string;
  count: number;
  sharePct: number;
}

export interface AdminAnalyticsMastery {
  averageDurableSkillsPerStudent: number;
  tierDistribution: AdminAnalyticsTierBucket[];
  totalSkillCells: number;
}

export interface AdminAnalyticsPayload {
  scopeLabel: string;
  computedAt: string;
  dateRange: AdminAnalyticsDateRange;
  adoption: AdminAnalyticsAdoption;
  mastery: AdminAnalyticsMastery;
  teacherFilterNote: string;
}

function resolveDateRange(preset: AdminAnalyticsDateRangePreset): AdminAnalyticsDateRange {
  const anchor = demoAnalyticsAnchorDate();
  const to = new Date(anchor.getTime());
  let from: Date;

  if (preset === "all") {
    const datedSessions = ROSTER.flatMap((student) => student.recentSessions)
      .map((session) => parseSessionDisplayDate(session.date))
      .filter((date): date is Date => Boolean(date));
    from =
      datedSessions.length > 0
        ? new Date(Math.min(...datedSessions.map((date) => date.getTime())))
        : new Date(to.getTime());
  } else {
    const days = preset === "7d" ? 6 : 13;
    from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - days));
  }

  const label =
    preset === "all"
      ? `All logged sessions · ${formatAnalyticsDateLabel(from)} – ${formatAnalyticsDateLabel(to)}`
      : `${formatAnalyticsDateLabel(from)} – ${formatAnalyticsDateLabel(to)}`;

  return {
    preset,
    from: toIsoDate(from),
    to: toIsoDate(to),
    label,
  };
}

function sessionInRange(session: SessionRecord, range: AdminAnalyticsDateRange): boolean {
  const parsed = parseSessionDisplayDate(session.date);
  if (!parsed) return false;
  const day = toIsoDate(parsed);
  return day >= range.from && day <= range.to;
}

function collectSessionsInRange(range: AdminAnalyticsDateRange): SessionRecord[] {
  const sessions: SessionRecord[] = [];
  for (const student of ROSTER) {
    for (const session of student.recentSessions) {
      if (sessionInRange(session, range)) sessions.push(session);
    }
  }
  return sessions;
}

function buildAdoption(range: AdminAnalyticsDateRange): AdminAnalyticsAdoption {
  const now = Date.now();
  const students = ROSTER;
  const activeStudents = students.filter(
    (student) => now - new Date(student.lastActivityAt).getTime() <= ACTIVE_WINDOW_MS,
  ).length;

  const sessions = collectSessionsInRange(range);
  const totalPracticeProblems = sessions.reduce(
    (sum, session) => sum + session.problemsAttempted,
    0,
  );
  const averageSessionDurationMinutes =
    sessions.length === 0
      ? null
      : Math.round(
          (sessions.reduce((sum, session) => sum + session.durationMinutes, 0) / sessions.length) *
            10,
        ) / 10;

  return {
    activeStudents,
    totalStudents: students.length,
    averageSessionDurationMinutes,
    totalPracticeProblems,
    sessionsInRange: sessions.length,
  };
}

async function buildMastery(): Promise<AdminAnalyticsMastery> {
  const students = await listEffectiveStudents(null);
  const tierCounts: Record<MasteryTier, number> = {
    durable: 0,
    tentative: 0,
    emerging: 0,
    struggling: 0,
    not_attempted: 0,
  };

  let durableSkillTotal = 0;
  let totalSkillCells = 0;

  for (const student of students) {
    durableSkillTotal += student.tiers.filter((tier) => tier === "durable").length;
    for (const tier of student.tiers) {
      tierCounts[tier] += 1;
      totalSkillCells += 1;
    }
  }

  const tierDistribution = TIER_ORDER.map((tier) => ({
    tier,
    label: TIER_STYLE[tier].label,
    count: tierCounts[tier],
    sharePct:
      totalSkillCells === 0 ? 0 : Math.round((tierCounts[tier] / totalSkillCells) * 1000) / 10,
  }));

  return {
    averageDurableSkillsPerStudent:
      students.length === 0
        ? 0
        : Math.round((durableSkillTotal / students.length) * 10) / 10,
    tierDistribution,
    totalSkillCells,
  };
}

export async function buildAdminAnalytics(options?: {
  dateRange?: AdminAnalyticsDateRangePreset;
}): Promise<AdminAnalyticsPayload> {
  const preset = options?.dateRange ?? "7d";
  const dateRange = resolveDateRange(preset);
  const adoption = buildAdoption(dateRange);
  const mastery = await buildMastery();

  return {
    scopeLabel: `${adminBriefingScopeLabel()} · ${dateRange.label}`,
    computedAt: new Date().toISOString(),
    dateRange,
    adoption,
    mastery,
    teacherFilterNote:
      "Teacher filter unavailable in this pilot — only Ms. Mokoena has a Space on Escolent.",
  };
}

/** Flat grounding lines for the Analytics ask box — same numbers the UI shows. */
export function adminAnalyticsAskGroundingLines(payload: AdminAnalyticsPayload): string[] {
  const { adoption, mastery, dateRange } = payload;
  const lines = [
    `- scope: ${payload.scopeLabel}`,
    `- date range: ${dateRange.label} (${dateRange.from} to ${dateRange.to})`,
    `- active students (last 7 days): ${adoption.activeStudents} of ${adoption.totalStudents}`,
    `- average session duration in range: ${
      adoption.averageSessionDurationMinutes === null
        ? "no sessions in range"
        : `${adoption.averageSessionDurationMinutes} minutes`
    }`,
    `- total practice problems attempted in range: ${adoption.totalPracticeProblems} across ${adoption.sessionsInRange} sessions`,
    `- average durable skills per student (current snapshot): ${mastery.averageDurableSkillsPerStudent}`,
    `- mastery tier distribution (${mastery.totalSkillCells} skill cells): ${mastery.tierDistribution
      .map((bucket) => `${bucket.label}=${bucket.count} (${bucket.sharePct}%)`)
      .join(", ")}`,
    `- teacher filter: ${payload.teacherFilterNote}`,
  ];
  return lines;
}

export function readAdminAnalyticsDateRange(value: string | null): AdminAnalyticsDateRangePreset {
  if (value === "14d" || value === "all") return value;
  return "7d";
}
