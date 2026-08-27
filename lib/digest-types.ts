/** Shared digest types/constants safe for client + server. */

export type DigestWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface DigestSchedule {
  teacherId: string;
  weekday: DigestWeekday;
  /** Local wall-clock "HH:MM" (24h). */
  time: string;
  updatedAt: string;
}

export interface DigestMisconceptionMetric {
  id: string;
  label: string;
  skillName: string;
  studentCount: number;
}

export interface DigestDurableStudent {
  studentId: string;
  fullName: string;
  skillId: string;
  spaceId: string | null;
  spaceName: string;
  appliedAt: string;
}

export interface WeeklyDigestMetrics {
  weekStartIso: string;
  weekEndIso: string;
  spaceNames: string[];
  durableMasteryCount: number;
  durableMasteryStudents: DigestDurableStudent[];
  flaggedGapCount: number;
  flaggedGapStudentNames: string[];
  misconceptions: DigestMisconceptionMetric[];
}

export const DIGEST_WEEKDAY_OPTIONS: { id: DigestWeekday; label: string }[] = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];
