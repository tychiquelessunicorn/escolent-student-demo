import { NEXT_REVIEW, SKILLS } from "./skills";
import { RECENT_SESSIONS } from "./schedule";
import type { DemoSpace, Skill } from "./types";

export const DEFAULT_SPACE_ID = "algebra";

const LIFE_SCIENCE_SKILLS: Skill[] = [
  {
    id: "sci0",
    slug: "cells_basics",
    name: "Cells as building blocks",
    tier: "tentative",
    flagged: false,
    progressDetail: "Solid early grasp — one more review will lock it in.",
    source: "Grade 8 Life Sciences Guide, Unit 1",
    lesson:
      "Every living thing is made of cells — tiny units that carry out life's jobs. Animal and plant cells share many parts; plants add a wall and chloroplasts.",
    workedExample: {
      prompt: "Name one part only plant cells have, and what it does.",
      steps: [
        "Plant cells have a cell wall (extra support outside the membrane).",
        "They also have chloroplasts for photosynthesis.",
        "Either answer is enough for this check.",
      ],
    },
  },
  {
    id: "sci1",
    slug: "food_chains",
    name: "Food chains & energy flow",
    tier: "emerging",
    flagged: false,
    progressDetail: "Just starting — energy arrows still need practice.",
    source: "Grade 8 Life Sciences Guide, Unit 2",
    lesson:
      "A food chain shows who eats whom. Energy flows from the sun → producers → consumers. Arrows point toward the eater (direction of energy).",
    workedExample: {
      prompt: "Grass → rabbit → fox. Where does energy start, and which way do the arrows go?",
      steps: [
        "Energy starts with the sun (then grass as producer).",
        "Arrows: grass → rabbit → fox (toward each consumer).",
        "The fox is a secondary consumer here.",
      ],
    },
  },
  {
    id: "sci2",
    slug: "photosynthesis_intro",
    name: "Photosynthesis (intro)",
    tier: "not_attempted",
    flagged: false,
    progressDetail: "Not reached yet.",
    source: "Grade 8 Life Sciences Guide, Unit 2",
    lesson:
      "Plants make food using light, water, and carbon dioxide. The useful output is sugar; oxygen is released as a by-product.",
    workedExample: {
      prompt: "What three inputs does a plant need for photosynthesis?",
      steps: [
        "Light (usually from the sun).",
        "Water (from the roots).",
        "Carbon dioxide (from the air).",
      ],
    },
  },
];

/**
 * Enrolled Spaces for the demo student. Today lists work across all of them;
 * Learn and Progress scope to the current Space.
 */
export const DEMO_SPACES: DemoSpace[] = [
  {
    id: DEFAULT_SPACE_ID,
    name: "Algebra: equations",
    subject: "Math",
    grade: "Grade 8",
    teacher: "Ms. Mokoena",
    skills: SKILLS,
    nextReview: NEXT_REVIEW,
    recentSessions: RECENT_SESSIONS,
  },
  {
    id: "life_sciences",
    name: "Life sciences",
    subject: "Science",
    grade: "Grade 8",
    teacher: "Mr. Dlamini",
    skills: LIFE_SCIENCE_SKILLS,
    nextReview: {
      skillName: "Cells as building blocks",
      whenLabel: "in 4 days",
      note: "A short revisit so the plant-vs-animal parts stick.",
    },
    recentSessions: [
      {
        date: "Aug 17",
        title: "Cells as building blocks",
        result: "4 of 5 correct — moved to tentative",
      },
      {
        date: "Aug 14",
        title: "Food chains & energy flow",
        result: "2 of 4 correct — still emerging",
      },
    ],
  },
];

export function getDemoSpace(spaceId: string): DemoSpace {
  return (
    DEMO_SPACES.find((space) => space.id === spaceId) ?? DEMO_SPACES[0]
  );
}

export function skillsForSpace(spaceId: string): Skill[] {
  return getDemoSpace(spaceId).skills;
}
