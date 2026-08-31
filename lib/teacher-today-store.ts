/**
 * Teacher Today / Week — Escolent-native items from briefing-store builders
 * (pending escalations + override revisits) plus LMS deadlines and a
 * read-only curation awareness signal. No parallel pending lists.
 */

import {
  listOverrideRevisitItems,
  listPendingEscalationItems,
  type BriefingItem,
} from "@/lib/briefing-store";
import {
  FRESHNESS_LABELS,
  TEACHER_SCHEDULE_DAYS,
  TEACHER_TODAY_DATE_LABEL,
  TEACHER_TODAY_KEY,
  TEACHER_TODAY_SHORT_LABEL,
  teacherLmsItemsForSpace,
  teacherLmsSpaceLabel,
  unmatchedEntriesForSpace,
  unmatchedEntrySpaceLabel,
  unmatchedEntryStudentName,
  type TeacherLmsScheduleItem,
  type UnmatchedErrorEntry,
} from "@/lib/demo-data/teacher-schedule";
import { teacherSpaceScopeLabelAsync } from "@/lib/space-store";
import type { SyncFreshness } from "@/lib/demo-data/types";
import { STUDENT } from "@/lib/demo-data";

export type TeacherTodayKind =
  | "curation_backlog"
  | "escalation"
  | "override_followup"
  | "lms_assignment_due"
  | "lms_grading_deadline";

export type TeacherTodaySource = "escolent" | "lms";

export interface TeacherTodayUnmatchedEntry {
  id: string;
  studentId: string;
  fullName: string;
  spaceLabel: string;
  skillLabel: string;
  errorSummary: string;
  observedLabel: string;
  /** Deep link into Mastery Overview for the student — not a promote action. */
  href: string;
}

export interface TeacherTodayItem {
  id: string;
  day: string;
  source: TeacherTodaySource;
  kind: TeacherTodayKind;
  spaceId: string | null;
  spaceLabel: string;
  title: string;
  detail: string;
  dueMeta: string;
  /** Deep link when Escolent-native; null for LMS (Canvas handoff) and expandable curation. */
  actionRoute: string | null;
  freshness?: SyncFreshness;
  freshnessLabel?: string;
  lmsActionLabel?: string;
  unmatchedCount?: number;
  unmatchedEntries?: TeacherTodayUnmatchedEntry[];
}

export interface TeacherTodayDay {
  key: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
  items: TeacherTodayItem[];
}

export interface TeacherTodaySchedule {
  scopeLabel: string;
  todayKey: string;
  todayDateLabel: string;
  todayShortLabel: string;
  lmsName: string;
  items: TeacherTodayItem[];
  days: TeacherTodayDay[];
  computedAt: string;
}

function mapUnmatched(entry: UnmatchedErrorEntry): TeacherTodayUnmatchedEntry {
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

function curationItem(spaceFilter: string | null): TeacherTodayItem | null {
  const entries = unmatchedEntriesForSpace(spaceFilter).map(mapUnmatched);
  if (entries.length === 0) return null;

  const spaceIds = [
    ...new Set(unmatchedEntriesForSpace(spaceFilter).map((entry) => entry.spaceId)),
  ];
  const spaceId = spaceIds.length === 1 ? spaceIds[0] : null;
  const spaceLabel =
    spaceIds.length === 1
      ? unmatchedEntrySpaceLabel(unmatchedEntriesForSpace(spaceFilter)[0])
      : "Across your Spaces";

  return {
    id: `curation:${spaceId ?? "all"}`,
    day: TEACHER_TODAY_KEY,
    source: "escolent",
    kind: "curation_backlog",
    spaceId,
    spaceLabel,
    title: `${entries.length} unmatched errors awaiting curation`,
    detail:
      "Read-only awareness from your classes this week. Promoting a specific unmatched error directly into Pedagogical Lead's authoring queue isn't wired up in this demo — Pedagogical Lead can still author misconceptions independently from a plain-language description.",
    dueMeta: "This week",
    actionRoute: null,
    unmatchedCount: entries.length,
    unmatchedEntries: entries,
  };
}

function fromEscalation(item: BriefingItem): TeacherTodayItem {
  return {
    id: item.id,
    day: TEACHER_TODAY_KEY,
    source: "escolent",
    kind: "escalation",
    spaceId: item.spaceId,
    spaceLabel: item.spaceLabel,
    title: item.title.replace(/\.$/, ""),
    detail: item.detail,
    dueMeta: "Needs attention today",
    actionRoute: item.actionRoute,
  };
}

function fromOverride(item: BriefingItem): TeacherTodayItem {
  return {
    id: item.id,
    day: TEACHER_TODAY_KEY,
    source: "escolent",
    kind: "override_followup",
    spaceId: item.spaceId,
    spaceLabel: item.spaceLabel,
    title: item.title.replace(/\.$/, ""),
    detail: item.detail,
    dueMeta: "Revisit due",
    actionRoute: item.actionRoute,
  };
}

function fromLms(item: TeacherLmsScheduleItem): TeacherTodayItem {
  const freshness = item.freshness;
  return {
    id: item.id,
    day: item.day,
    source: "lms",
    kind: item.kind,
    spaceId: item.spaceId,
    spaceLabel: teacherLmsSpaceLabel(item),
    title: item.title,
    detail: item.detail,
    dueMeta: item.dueMeta,
    actionRoute: null,
    freshness,
    freshnessLabel: FRESHNESS_LABELS[freshness] ?? freshness,
    lmsActionLabel: item.lmsActionLabel,
  };
}

function sortTodayItems(items: TeacherTodayItem[]): TeacherTodayItem[] {
  const kindRank: Record<TeacherTodayKind, number> = {
    escalation: 0,
    override_followup: 1,
    curation_backlog: 2,
    lms_grading_deadline: 3,
    lms_assignment_due: 4,
  };
  return [...items].sort((a, b) => {
    if (a.source !== b.source) return a.source === "escolent" ? -1 : 1;
    return kindRank[a.kind] - kindRank[b.kind];
  });
}

export async function buildTeacherTodaySchedule(options?: {
  spaceFilter?: string | null;
}): Promise<TeacherTodaySchedule> {
  const spaceFilter = options?.spaceFilter ?? null;
  const escalations = (await listPendingEscalationItems(spaceFilter)).map(fromEscalation);
  const overrides = (await listOverrideRevisitItems(spaceFilter)).map(fromOverride);
  const curation = curationItem(spaceFilter);
  const lms = teacherLmsItemsForSpace(spaceFilter).map(fromLms);

  const items = sortTodayItems([
    ...escalations,
    ...overrides,
    ...(curation ? [curation] : []),
    ...lms,
  ]);

  const days: TeacherTodayDay[] = TEACHER_SCHEDULE_DAYS.map((day) => ({
    key: day.key,
    label: day.label,
    dateLabel: day.dateLabel,
    isToday: day.isToday,
    items: sortTodayItems(items.filter((item) => item.day === day.key)),
  }));

  return {
    scopeLabel: await teacherSpaceScopeLabelAsync(spaceFilter),
    todayKey: TEACHER_TODAY_KEY,
    todayDateLabel: TEACHER_TODAY_DATE_LABEL,
    todayShortLabel: TEACHER_TODAY_SHORT_LABEL,
    lmsName: STUDENT.lms,
    items,
    days,
    computedAt: new Date().toISOString(),
  };
}

/** Flat grounding lines for the ask box — same underlying list as the UI. */
export function teacherTodayAskGroundingLines(schedule: TeacherTodaySchedule): string[] {
  return schedule.items.map((item) => {
    const day = schedule.days.find((entry) => entry.key === item.day);
    const dayLabel = day ? `${day.label} (${day.dateLabel})` : item.day;
    const source =
      item.source === "escolent"
        ? "Escolent (internal, actionable)"
        : `${schedule.lmsName} (LMS, reference — sync: ${item.freshnessLabel ?? item.freshness ?? "unknown"})`;
    return `- ${item.title} | space: ${item.spaceLabel} | day: ${dayLabel} | source: ${source} | detail: ${item.detail}`;
  });
}
