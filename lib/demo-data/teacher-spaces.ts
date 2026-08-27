/** Sarah Mokoena's teaching Spaces for the investor demo. */

export interface TeacherSpace {
  id: string;
  name: string;
  shortName: string;
  grade: string;
}

export const TEACHER_SPACES: TeacherSpace[] = [
  {
    id: "algebra_8a",
    name: "Grade 8A Algebra",
    shortName: "Algebra",
    grade: "Grade 8",
  },
  {
    id: "remediation_8a",
    name: "Grade 8A Remediation",
    shortName: "Remediation",
    grade: "Grade 8",
  },
];

export const TEACHER_SPACE_IDS = TEACHER_SPACES.map((space) => space.id);

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
