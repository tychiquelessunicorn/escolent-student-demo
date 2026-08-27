/**
 * Teacher LMS due/grading deadlines + unmatched-error awareness signal.
 * Escolent-native pending escalations / override revisits come from
 * briefing-store — not duplicated here.
 */

import type { SyncFreshness } from "./types";
import { getRosterStudent } from "./roster";
import { getTeacherSpace } from "./teacher-spaces";

/** Reuse the Student demo calendar anchor (Wed Aug 19 week). */
export {
  SCHEDULE_DAYS as TEACHER_SCHEDULE_DAYS,
  TODAY_DATE_LABEL as TEACHER_TODAY_DATE_LABEL,
  TODAY_KEY as TEACHER_TODAY_KEY,
  TODAY_SHORT_LABEL as TEACHER_TODAY_SHORT_LABEL,
  FRESHNESS_LABELS,
} from "./schedule";

export type TeacherLmsKind = "lms_assignment_due" | "lms_grading_deadline";

export interface TeacherLmsScheduleItem {
  id: string;
  day: string;
  kind: TeacherLmsKind;
  spaceId: string;
  title: string;
  detail: string;
  dueMeta: string;
  freshness: SyncFreshness;
  /** Honest LMS handoff — Canvas has no in-app grading surface in this demo. */
  lmsActionLabel: string;
}

/**
 * Real assignments across Ms. Mokoena's two Spaces. Freshness varies so
 * Req 10a.4 has a non-happy path to show (stale + syncing present).
 */
export const TEACHER_LMS_ITEMS: TeacherLmsScheduleItem[] = [
  {
    id: "lms_alg_quiz_grades",
    day: "wed",
    kind: "lms_grading_deadline",
    spaceId: "algebra_8a",
    title: "Two-step equations quiz — grades due",
    detail: "Canvas grading window closes today.",
    dueMeta: "Grades due today",
    // Stale on Today so Req 10a.4 and the teacher tour can spotlight a non-fresh
    // LMS row without waiting for Friday's week cell.
    freshness: "stale",
    lmsActionLabel: "Grade in Canvas",
  },
  {
    id: "lms_alg_hw5",
    day: "thu",
    kind: "lms_assignment_due",
    spaceId: "algebra_8a",
    title: "Homework Set 5 — assignment due",
    detail: "Student submission deadline in Canvas.",
    dueMeta: "Due Thu 11:59pm",
    freshness: "syncing",
    lmsActionLabel: "Open in Canvas",
  },
  {
    id: "lms_rem_unit2_grades",
    day: "fri",
    kind: "lms_grading_deadline",
    spaceId: "remediation_8a",
    title: "Unit 2 test — grading deadline",
    detail: "Canvas grading window closes Friday.",
    dueMeta: "Grades due Fri",
    freshness: "stale",
    lmsActionLabel: "Grade in Canvas",
  },
  {
    id: "lms_rem_quiz3",
    day: "mon",
    kind: "lms_grading_deadline",
    spaceId: "remediation_8a",
    title: "Quiz 3 — grades due",
    detail: "Canvas grading window closes Monday.",
    dueMeta: "Grades due Mon",
    freshness: "fresh",
    lmsActionLabel: "Grade in Canvas",
  },
  {
    id: "lms_alg_vocab",
    day: "tue",
    kind: "lms_grading_deadline",
    spaceId: "algebra_8a",
    title: "Vocabulary check-in — grades due",
    detail: "Short Canvas check-in still ungraded.",
    dueMeta: "Grades due Tue",
    freshness: "fresh",
    lmsActionLabel: "Grade in Canvas",
  },
];

/**
 * Unmatched student error patterns this week — distinct from named
 * OVERVIEW_MISCONCEPTION_AGGREGATES. Read-only awareness for Teacher Today;
 * promote/curate belongs to Pedagogical Lead (not in this build).
 */
export interface UnmatchedErrorEntry {
  id: string;
  studentId: string;
  spaceId: string;
  skillLabel: string;
  errorSummary: string;
  observedLabel: string;
}

export const UNMATCHED_ERROR_ENTRIES: UnmatchedErrorEntry[] = [
  {
    id: "ue_jamal_cancel",
    studentId: "jamal_reed",
    spaceId: "algebra_8a",
    skillLabel: "One-step equations",
    errorSummary: "Cancels like terms across the equals sign",
    observedLabel: "3 times this week",
  },
  {
    id: "ue_sofia_add",
    studentId: "sofia_torres",
    spaceId: "algebra_8a",
    skillLabel: "Two-step equations",
    errorSummary: "Adds instead of subtracting when isolating the variable",
    observedLabel: "4 times this week",
  },
  {
    id: "ue_priya_drop",
    studentId: "priya_chen",
    spaceId: "algebra_8a",
    skillLabel: "Multi-step equations",
    errorSummary: "Drops the coefficient when moving a term",
    observedLabel: "2 times this week",
  },
  {
    id: "ue_carlos_square",
    studentId: "carlos_mendez",
    spaceId: "remediation_8a",
    skillLabel: "Combining like terms",
    errorSummary: "Treats 2x + x as 2x²",
    observedLabel: "5 times this week",
  },
  {
    id: "ue_tyler_solve",
    studentId: "tyler_brooks",
    spaceId: "remediation_8a",
    skillLabel: "One-step equations",
    errorSummary: "Confuses “solve” with “simplify” and stops early",
    observedLabel: "3 times this week",
  },
];

export function unmatchedEntriesForSpace(
  spaceFilter: string | null,
): UnmatchedErrorEntry[] {
  if (!spaceFilter || spaceFilter === "all") return UNMATCHED_ERROR_ENTRIES;
  return UNMATCHED_ERROR_ENTRIES.filter((entry) => entry.spaceId === spaceFilter);
}

/** School-wide curation backlog — all unmatched errors across every Space. */
export function unmatchedEntriesSchoolWide(): UnmatchedErrorEntry[] {
  return UNMATCHED_ERROR_ENTRIES;
}

export function teacherLmsItemsForSpace(
  spaceFilter: string | null,
): TeacherLmsScheduleItem[] {
  if (!spaceFilter || spaceFilter === "all") return TEACHER_LMS_ITEMS;
  return TEACHER_LMS_ITEMS.filter((item) => item.spaceId === spaceFilter);
}

export function unmatchedEntryStudentName(entry: UnmatchedErrorEntry): string {
  return getRosterStudent(entry.studentId)?.fullName ?? entry.studentId;
}

export function unmatchedEntrySpaceLabel(entry: UnmatchedErrorEntry): string {
  return getTeacherSpace(entry.spaceId)?.name ?? entry.spaceId;
}

export function teacherLmsSpaceLabel(item: TeacherLmsScheduleItem): string {
  return getTeacherSpace(item.spaceId)?.name ?? item.spaceId;
}
