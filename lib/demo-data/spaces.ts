import { NEXT_REVIEW, SKILLS } from "./skills";
import { RECENT_SESSIONS } from "./schedule";
import type { DemoSpace, Skill } from "./types";

/** Default Space for the investor practice loop (playable Math session). */
export const DEFAULT_SPACE_ID = "math";

const GEOGRAPHY_SKILLS: Skill[] = [
  {
    id: "geo0",
    slug: "map_scale",
    name: "Map reading & scale",
    tier: "tentative",
    flagged: false,
    progressDetail: "Getting solid — one more clean check should lock it in.",
    source: "Grade 8 Geography Guide, Unit 1",
    lesson:
      "Scale tells you how map distance relates to real distance. A ratio like 1:50 000 means 1 cm on the map is 50 000 cm (0.5 km) on the ground.",
    workedExample: {
      prompt: "On a 1:100 000 map, 3 cm represents how many km?",
      steps: [
        "1 cm on the map = 100 000 cm in reality.",
        "100 000 cm = 1 km, so 1 cm → 1 km.",
        "3 cm → 3 km.",
      ],
    },
  },
  {
    id: "geo1",
    slug: "climate_zones",
    name: "Climate zones",
    tier: "emerging",
    flagged: false,
    progressDetail: "Early exposure — still mixing tropical and temperate.",
    source: "Grade 8 Geography Guide, Unit 2",
    lesson:
      "Climate zones group places by typical temperature and rainfall patterns (tropical, dry, temperate, continental, polar) — not by a single day's weather.",
    workedExample: {
      prompt: "Is the Amazon rainforest tropical or polar? Why?",
      steps: [
        "Near the equator → high year-round temperatures and heavy rain.",
        "That pattern matches the tropical climate zone.",
        "Polar zones are cold year-round — not the Amazon.",
      ],
    },
  },
  {
    id: "geo2",
    slug: "population_density",
    name: "Population density",
    tier: "not_attempted",
    flagged: false,
    progressDetail: "Not reached yet.",
    source: "Grade 8 Geography Guide, Unit 3",
    lesson:
      "Population density is people per unit area (often per km²). High density does not always mean a city — it depends on how the area is drawn.",
    workedExample: {
      prompt: "A region has 2 000 people on 4 km². Density?",
      steps: [
        "Density = people ÷ area.",
        "2 000 ÷ 4 = 500.",
        "Answer: 500 people per km².",
      ],
    },
  },
];

const ENGLISH_SKILLS: Skill[] = [
  {
    id: "eng0",
    slug: "thesis_statements",
    name: "Thesis statements",
    tier: "tentative",
    flagged: false,
    progressDetail: "Clearer than last week — still occasionally too broad.",
    source: "Grade 8 English Guide, Unit 2",
    lesson:
      "A thesis is the main claim your essay will prove — specific, arguable, and one sentence that guides every paragraph that follows.",
    workedExample: {
      prompt: "Which is a stronger thesis: \"School is important\" or \"Daily reading time improves Grade 8 writing fluency\"?",
      steps: [
        "\"School is important\" is vague and hard to prove in one essay.",
        "The second claim is specific and can be supported with evidence.",
        "Prefer the specific, arguable claim.",
      ],
    },
  },
  {
    id: "eng1",
    slug: "evidence_citations",
    name: "Evidence & citations",
    tier: "emerging",
    flagged: true,
    progressDetail: "Flagged — quotes appear without clear citation or link to the claim.",
    source: "Grade 8 English Guide, Unit 2",
    lesson:
      "Evidence supports your claim; a citation shows where it came from. Quote or paraphrase, then explain how it proves the point — don't leave a quote hanging.",
    workedExample: {
      prompt: "After a quote, what should the next sentence do?",
      steps: [
        "Name the source (author / text) if not already clear.",
        "Explain how the quote supports your thesis.",
        "Do not jump to a new claim without that link.",
      ],
    },
  },
  {
    id: "eng2",
    slug: "paragraph_structure",
    name: "Paragraph structure",
    tier: "not_attempted",
    flagged: false,
    progressDetail: "Not reached yet.",
    source: "Grade 8 English Guide, Unit 1",
    lesson:
      "A strong paragraph often follows claim → evidence → explanation → link back. One main idea per paragraph keeps the reader oriented.",
    workedExample: {
      prompt: "Put in order: explanation, claim, evidence.",
      steps: [
        "Start with the claim (topic sentence).",
        "Add evidence (fact, quote, example).",
        "Finish with explanation that ties evidence to the claim.",
      ],
    },
  },
];

/**
 * Enrolled Spaces for the demo student. Escolent is subject-agnostic: each Space
 * is a different subject. Today lists work across all of them; Learn and Progress
 * scope to the current Space. Math is the Space with a full playable practice loop.
 */
export const DEMO_SPACES: DemoSpace[] = [
  {
    id: "geography",
    name: "Geography",
    subject: "Geography",
    grade: "Grade 8",
    teacher: "Ms. Naidoo",
    skills: GEOGRAPHY_SKILLS,
    askExample: "how do I convert map scale to kilometres",
    nextReview: {
      skillName: "Map reading & scale",
      whenLabel: "in 3 days",
      note: "A quick check so scale conversions stay fluent.",
    },
    recentSessions: [
      {
        date: "Aug 17",
        title: "Map reading & scale",
        result: "4 of 5 correct — moved to tentative",
      },
      {
        date: "Aug 13",
        title: "Climate zones",
        result: "2 of 4 correct — still emerging",
      },
    ],
  },
  {
    id: "english",
    name: "English",
    subject: "English",
    grade: "Grade 8",
    teacher: "Mr. Botha",
    skills: ENGLISH_SKILLS,
    askExample: "what makes a thesis statement strong",
    nextReview: {
      skillName: "Thesis statements",
      whenLabel: "in 2 days",
      note: "One short revisit so claims stay specific.",
    },
    recentSessions: [
      {
        date: "Aug 16",
        title: "Thesis statements",
        result: "3 of 4 strong — still tentative",
      },
      {
        date: "Aug 12",
        title: "Evidence & citations",
        result: "1 of 3 linked well — flagged as a gap",
      },
    ],
  },
  {
    id: DEFAULT_SPACE_ID,
    name: "Equations",
    subject: "Math",
    grade: "Grade 8",
    teacher: "Ms. Mokoena",
    skills: SKILLS,
    askExample: "why do we flip the sign in inequalities",
    nextReview: NEXT_REVIEW,
    recentSessions: RECENT_SESSIONS,
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

export const DEMO_SPACE_IDS = DEMO_SPACES.map((space) => space.id);
