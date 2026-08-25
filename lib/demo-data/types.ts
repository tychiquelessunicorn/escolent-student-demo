export type MasteryTier =
  | "not_attempted"
  | "struggling"
  | "emerging"
  | "tentative"
  | "durable";

export type SyncFreshness = "fresh" | "stale" | "syncing" | "unavailable";

export type ItemSource = "escolent" | "lms";

export type EvaluationStrategy =
  | "exact_match"
  | "symbolic_equivalence"
  | "rubric_llm";

export interface Skill {
  id: string;
  slug: string;
  name: string;
  tier: MasteryTier;
  /** Flagged as a prerequisite gap underneath the current unit. */
  flagged: boolean;
  /** Short status line shown in Progress's expanded row. */
  progressDetail: string;
  /** Lens-generated instructional content shown in Learn's expanded row. */
  lesson: string;
  /** Original source material this content was synthesized from (Req 32.2). */
  source: string;
}

export interface TierStyle {
  label: string;
  dotBg: string;
  dotBorder: string;
  badgeBg: string;
  badgeColor: string;
}

export interface ScheduleDay {
  key: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
}

export interface ScheduleItem {
  id: string;
  day: string;
  source: ItemSource;
  title: string;
  subjectLine: string;
  dueMeta: string;
  /** Only Escolent-native items are actionable. LMS items are reference-only. */
  actionRoute: string | null;
  freshness?: SyncFreshness;
  /** Demo loop: today's task that completes when variables skill is mastered. */
  demoTask?: boolean;
}

export interface SessionRecord {
  date: string;
  title: string;
  result: string;
}
