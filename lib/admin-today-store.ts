/**
 * Admin Today / Week — Req 15b (minus LMS setup).
 *
 * Escalation backlog, curation backlog, and billing renewal (15c) are real.
 * Compliance deadlines stay omitted until their backing systems exist.
 */

import { buildBillingRenewalEventCopy } from "@/lib/admin-billing-store";
import { adminBriefingScopeLabel } from "@/lib/admin-briefing-store";
import { computeEscalationOversightSummary } from "@/lib/admin-escalation-oversight";
import {
  TEACHER_TODAY_DATE_LABEL,
  TEACHER_TODAY_SHORT_LABEL,
  unmatchedEntriesSchoolWide,
  unmatchedEntrySpaceLabel,
  unmatchedEntryStudentName,
  type UnmatchedErrorEntry,
} from "@/lib/demo-data/teacher-schedule";

export type AdminTodayKind = "escalation_backlog" | "billing_event" | "curation_backlog";

export interface AdminTodayUnmatchedEntry {
  id: string;
  studentId: string;
  fullName: string;
  spaceLabel: string;
  skillLabel: string;
  errorSummary: string;
  observedLabel: string;
  /** Same deep link as Teacher Today curation — Mastery Overview for the student. */
  href: string;
}

export interface AdminTodayItem {
  id: string;
  kind: AdminTodayKind;
  scopeLabel: string;
  title: string;
  detail: string;
  dueMeta: string;
  actionRoute: string | null;
  unmatchedCount?: number;
  unmatchedEntries?: AdminTodayUnmatchedEntry[];
}

export interface AdminTodaySchedule {
  scopeLabel: string;
  todayDateLabel: string;
  todayShortLabel: string;
  items: AdminTodayItem[];
  computedAt: string;
  /** Honest note for Week — standing counts, not a day calendar. */
  weekNote: string;
}

function mapUnmatched(entry: UnmatchedErrorEntry): AdminTodayUnmatchedEntry {
  return {
    id: entry.id,
    studentId: entry.studentId,
    fullName: unmatchedEntryStudentName(entry),
    spaceLabel: unmatchedEntrySpaceLabel(entry),
    skillLabel: entry.skillLabel,
    errorSummary: entry.errorSummary,
    observedLabel: entry.observedLabel,
    href: `/teacher/overview?student=${encodeURIComponent(entry.studentId)}`,
  };
}

async function buildEscalationBacklogItem(): Promise<AdminTodayItem | null> {
  const summary = await computeEscalationOversightSummary();
  if (summary.openCount === 0) return null;

  const openNoun = summary.openCount === 1 ? "escalation" : "escalations";
  const aged = summary.openLongerThanThresholdCount;
  const agedClause =
    aged > 0
      ? `${aged} open longer than ${summary.thresholdHours} hours — same oversight signal as Briefing.`
      : "None past the aging threshold yet — still worth monitoring school-wide.";

  return {
    id: "escalation_backlog:school",
    kind: "escalation_backlog",
    scopeLabel: "School-wide",
    title: `${summary.openCount} ${openNoun} open school-wide`,
    detail: `Teachers handle case detail on their Briefing. ${agedClause}`,
    dueMeta: "Backlog now",
    actionRoute: "/admin/escalations",
  };
}

async function buildBillingEventItem(): Promise<AdminTodayItem | null> {
  const copy = await buildBillingRenewalEventCopy();
  if (!copy) return null;

  return {
    id: "billing_event:renewal",
    kind: "billing_event",
    scopeLabel: "Billing",
    title: copy.title,
    detail: copy.detail,
    dueMeta: copy.dueMeta,
    actionRoute: "/admin/billing",
  };
}

function buildCurationBacklogItem(): AdminTodayItem | null {
  const entries = unmatchedEntriesSchoolWide().map(mapUnmatched);
  if (entries.length === 0) return null;

  return {
    id: "curation_backlog:school",
    kind: "curation_backlog",
    scopeLabel: "School-wide",
    title: `${entries.length} unmatched errors awaiting curation`,
    detail:
      "Read-only awareness aggregated across every Space. Promoting unmatched errors into named misconceptions is a Pedagogical Lead capability — not built in this demo.",
    dueMeta: "Standing backlog",
    actionRoute: null,
    unmatchedCount: entries.length,
    unmatchedEntries: entries,
  };
}

function sortItems(items: AdminTodayItem[]): AdminTodayItem[] {
  const rank: Record<AdminTodayKind, number> = {
    escalation_backlog: 0,
    billing_event: 1,
    curation_backlog: 2,
  };
  return [...items].sort((a, b) => rank[a.kind] - rank[b.kind]);
}

export async function buildAdminTodaySchedule(): Promise<AdminTodaySchedule> {
  const [escalation, billing] = await Promise.all([
    buildEscalationBacklogItem(),
    buildBillingEventItem(),
  ]);
  const curation = buildCurationBacklogItem();
  const items = sortItems([
    ...(escalation ? [escalation] : []),
    ...(billing ? [billing] : []),
    ...(curation ? [curation] : []),
  ]);

  return {
    scopeLabel: adminBriefingScopeLabel(),
    todayDateLabel: TEACHER_TODAY_DATE_LABEL,
    todayShortLabel: TEACHER_TODAY_SHORT_LABEL,
    items,
    computedAt: new Date().toISOString(),
    weekNote:
      "These are school-wide standing counts, not events scheduled on a particular day — a day-by-day calendar would invent dates that are not in the data.",
  };
}
