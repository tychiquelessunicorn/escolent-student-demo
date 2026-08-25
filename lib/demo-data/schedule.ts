import type { ScheduleDay, ScheduleItem, SessionRecord } from "./types";

/** The demo is anchored to Wednesday, August 19 — week 6 of the Teneo pilot. */
export const TODAY_KEY = "wed";
export const TODAY_DATE_LABEL = "Wednesday, August 19";
export const TODAY_SHORT_LABEL = "Wed, Aug 19";

export const SCHEDULE_DAYS: ScheduleDay[] = [
  { key: "wed", label: "Today", dateLabel: "Wed, Aug 19", isToday: true },
  { key: "thu", label: "Thu", dateLabel: "Aug 20", isToday: false },
  { key: "fri", label: "Fri", dateLabel: "Aug 21", isToday: false },
  { key: "mon", label: "Mon", dateLabel: "Aug 24", isToday: false },
  { key: "tue", label: "Tue", dateLabel: "Aug 25", isToday: false },
];

/**
 * Requirement 7a.2: every LMS due item appears regardless of subject, but only
 * Escolent-native items are actionable. An `lms` item carries actionRoute null
 * and links back to its source instead.
 *
 * Escolent items route to their own skill rather than to a single hardcoded
 * demo skill, so "Integer operations refresher" lands on that skill's honest
 * not-in-this-demo state instead of silently opening two-step equations.
 */
export const SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: "e1",
    day: "wed",
    source: "escolent",
    title: "Two-step equations",
    subjectLine: "Math · Spaced review, due today",
    dueMeta: "Due today",
    actionRoute: "/practice?skill=two_step",
  },
  {
    id: "e2",
    day: "wed",
    source: "escolent",
    title: "Integer operations refresher",
    subjectLine: "Math · Assigned by Ms. Mokoena",
    dueMeta: "Due today",
    actionRoute: "/practice?skill=integer_operations",
  },
  {
    id: "c1",
    day: "wed",
    source: "lms",
    title: "Ecosystems Unit Quiz",
    subjectLine: "Science · Canvas",
    dueMeta: "Due 3:00pm",
    actionRoute: null,
    freshness: "fresh",
  },
  {
    id: "c2",
    day: "thu",
    source: "lms",
    title: 'Essay draft: "A Place That Changed Me"',
    subjectLine: "Language Arts · Canvas",
    dueMeta: "Due 11:59pm",
    actionRoute: null,
    freshness: "stale",
  },
  {
    id: "e3",
    day: "fri",
    source: "escolent",
    title: "One-step equations",
    subjectLine: "Math · Spaced review",
    dueMeta: "Due Fri",
    actionRoute: "/practice?skill=one_step",
  },
  {
    id: "c3",
    day: "fri",
    source: "lms",
    title: "Reading response: Ch. 4",
    subjectLine: "Social Studies · Canvas",
    dueMeta: "Due 11:59pm",
    actionRoute: null,
    freshness: "syncing",
  },
  {
    id: "c4",
    day: "mon",
    source: "lms",
    title: "Vocabulary quiz, Unit 3",
    subjectLine: "Language Arts · Canvas",
    dueMeta: "Due 9:00am",
    actionRoute: null,
    freshness: "fresh",
  },
  {
    id: "e4",
    day: "tue",
    source: "escolent",
    title: "Two-step equations",
    subjectLine: "Math · Spaced review",
    dueMeta: "Due Tue",
    actionRoute: "/practice?skill=two_step",
  },
];

export const FRESHNESS_LABELS: Record<string, string> = {
  fresh: "Synced",
  stale: "Synced 2h ago",
  syncing: "Syncing…",
};

/**
 * Recent session history. These entries explain Progress's current tier badges:
 * Aug 15 is why One-step reads tentative, Aug 12 is why Integer operations is
 * flagged, and Aug 18 matches Practice Session's own four-problem set.
 */
export const RECENT_SESSIONS: SessionRecord[] = [
  {
    date: "Aug 18",
    title: "Two-step equations",
    result: "4 problems · used a hint once",
  },
  {
    date: "Aug 16",
    title: "Two-step equations",
    result: "3 problems · first attempt",
  },
  {
    date: "Aug 15",
    title: "One-step equations",
    result: "5 of 5 correct — crossed to tentative",
  },
  {
    date: "Aug 12",
    title: "Integer operations",
    result: "1 of 3 correct — flagged as a gap",
  },
];
