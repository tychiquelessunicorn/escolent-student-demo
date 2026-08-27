/**
 * Seed baseline for Sarah Mokoena's teaching Spaces.
 * Live catalog and student assignment overrides live in space-store (Redis).
 */

import { OVERVIEW_SKILL_IDS } from "./overview-skills";
import { DEMO_SESSION_STAFF_ID } from "./staff";

export interface SeedTeacherSpace {
  id: string;
  name: string;
  shortName: string;
  description: string;
  grade: string;
  teacherId: string;
  includedSkillIds: string[];
  difficultyMin: number;
  difficultyMax: number;
  classroomPacingMode: boolean;
}

/**
 * Algebra: classroom pacing on, mid difficulty, full skill set.
 * Remediation: self-paced, gentler difficulty, foundational skills.
 */
export const SEED_TEACHER_SPACES: SeedTeacherSpace[] = [
  {
    id: "algebra_8a",
    name: "Grade 8A Algebra",
    shortName: "Algebra",
    description:
      "Core Grade 8 algebra practice aligned to the class unit — integers through inequalities.",
    grade: "Grade 8",
    teacherId: DEMO_SESSION_STAFF_ID,
    includedSkillIds: [...OVERVIEW_SKILL_IDS],
    difficultyMin: 2,
    difficultyMax: 4,
    classroomPacingMode: true,
  },
  {
    id: "remediation_8a",
    name: "Grade 8A Remediation",
    shortName: "Remediation",
    description:
      "Foundational catch-up for students still shaky before the class moves further into multi-step work.",
    grade: "Grade 8",
    teacherId: DEMO_SESSION_STAFF_ID,
    includedSkillIds: ["s0", "s1", "s2", "s3"],
    difficultyMin: 1,
    difficultyMax: 3,
    classroomPacingMode: false,
  },
];

/** @deprecated Prefer listSpaces() from space-store — kept as seed id list for demos. */
export const TEACHER_SPACES = SEED_TEACHER_SPACES.map((space) => ({
  id: space.id,
  name: space.name,
  shortName: space.shortName,
  grade: space.grade,
}));

export const TEACHER_SPACE_IDS = SEED_TEACHER_SPACES.map((space) => space.id);

export type TeacherSpace = (typeof TEACHER_SPACES)[number];

/** Sync lookup against seed only — dynamic spaces use getSpace() from space-store. */
export function getTeacherSpace(spaceId: string): TeacherSpace | null {
  return TEACHER_SPACES.find((space) => space.id === spaceId) ?? null;
}

export function teacherSpaceScopeLabel(spaceFilter: string | null): string {
  if (!spaceFilter || spaceFilter === "all") {
    return "Aggregated across Grade 8A Algebra and Grade 8A Remediation";
  }
  const space = getTeacherSpace(spaceFilter);
  return space ? `${space.name} only` : "All Spaces";
}
