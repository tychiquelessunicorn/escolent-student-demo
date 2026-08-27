/**
 * The single shared source of baseline demo data.
 *
 * Baseline only: skill states, the schedule, session history, practice content.
 * Transient per-interaction state — the current problem index, wrong-answer
 * count, ladder tier, ask-box text — stays local to whichever screen owns that
 * interaction and must not be lifted in here.
 *
 * No database this phase. These values are hardcoded on purpose.
 */

export * from "./types";
export * from "./skills";
export * from "./schedule";
export * from "./practice";
export * from "./spaces";
export * from "./staff";
export * from "./teacher-spaces";
export * from "./overview-skills";
export * from "./roster";
export * from "./teacher-schedule";

export const STUDENT = {
  firstName: "Mia",
  fullName: "Mia Ndlovu",
  grade: "Grade 8",
  /** Default Space label only — Learn/Progress use the live current Space. */
  spaceName: "Equations",
  teacher: "Ms. Mokoena",
  lms: "Canvas",
} as const;
