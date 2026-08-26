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
 * Today spans all enrolled Spaces (subject-agnostic). Each item carries a
 * quiet spaceTag so Math, Geography, and English sit in one list.
 */
export const SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: "e1",
    day: "wed",
    source: "escolent",
    title: "Variables on both sides",
    subjectLine: "Equations · New skill, due today",
    dueMeta: "Due today",
    actionRoute: "/practice?skill=variables_both_sides",
    demoTask: true,
    spaceId: "math",
    spaceTag: "Equations",
  },
  {
    id: "e-geo1",
    day: "wed",
    source: "escolent",
    title: "Climate zones check-in",
    subjectLine: "Geography · Assigned by Ms. Naidoo",
    dueMeta: "Due today",
    actionRoute: "/practice?skill=climate_zones",
    spaceId: "geography",
    spaceTag: "Geography",
  },
  {
    id: "e-eng1",
    day: "wed",
    source: "escolent",
    title: "Thesis statements draft",
    subjectLine: "English · Assigned by Mr. Botha",
    dueMeta: "Due today",
    actionRoute: "/practice?skill=thesis_statements",
    spaceId: "english",
    spaceTag: "English",
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
    spaceTag: "Science · Canvas",
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
    spaceTag: "Language Arts · Canvas",
  },
  {
    id: "e3",
    day: "fri",
    source: "escolent",
    title: "One-step equations",
    subjectLine: "Equations · Spaced review",
    dueMeta: "Due Fri",
    actionRoute: "/practice?skill=one_step",
    spaceId: "math",
    spaceTag: "Equations",
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
    spaceTag: "Social Studies · Canvas",
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
    spaceTag: "Language Arts · Canvas",
  },
  {
    id: "e4",
    day: "tue",
    source: "escolent",
    title: "Two-step equations",
    subjectLine: "Equations · Spaced review",
    dueMeta: "Due Tue",
    actionRoute: "/practice?skill=two_step",
    spaceId: "math",
    spaceTag: "Equations",
  },
];

export const FRESHNESS_LABELS: Record<string, string> = {
  fresh: "Synced",
  stale: "Synced 2h ago",
  syncing: "Syncing…",
};

/**
 * Recent session history for the Math Space. These entries explain Progress
 * tier badges when Equations is the current Space.
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
