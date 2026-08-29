import { SKILLS } from "./skills";

/** Column definitions for the Teacher mastery grid — Math skills only. */
export const OVERVIEW_SKILL_COLUMNS = SKILLS.map((skill) => ({
  id: skill.id,
  slug: skill.slug,
  name: skill.name,
  short:
    skill.id === "s0"
      ? "Basics"
      : skill.id === "s1"
        ? "Integers"
        : skill.id === "s2"
          ? "One-step"
          : skill.id === "s3"
            ? "Two-step"
            : skill.id === "s4"
              ? "Multi-step"
              : skill.id === "s5"
                ? "Both sides"
                : skill.id === "s6"
                  ? "Inequalities"
                  : skill.name.slice(0, 10),
}));

export const OVERVIEW_SKILL_IDS = OVERVIEW_SKILL_COLUMNS.map((skill) => skill.id);
