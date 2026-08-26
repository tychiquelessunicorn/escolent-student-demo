import type { MasteryTier, Skill, TierStyle } from "./types";

/**
 * Sample Math Space skill progression (playable practice loop). Other Spaces
 * live in spaces.ts — Escolent is subject-agnostic; this is one enrolled Space.
 */
export const SKILLS: Skill[] = [
  {
    id: "s0",
    slug: "equation_basics",
    name: "Equation basics & balancing",
    tier: "durable",
    flagged: false,
    progressDetail:
      "Locked in since early in the unit — no review needed right now.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 1",
    lesson:
      "Think of an equation like a balanced scale. Whatever you do to one side, you do to the other — that's how you keep the balance while you find the unknown.",
    workedExample: {
      prompt: "If x + 4 = 10, what is x?",
      steps: [
        "Both sides start equal (balanced).",
        "Subtract 4 from both sides → x = 6.",
        "Check: 6 + 4 = 10 ✓",
      ],
    },
  },
  {
    id: "s1",
    slug: "integer_operations",
    name: "Integer operations",
    tier: "struggling",
    flagged: true,
    progressDetail:
      "Flagged as a gap underneath the current unit — worth reinforcing alongside two-step equations.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 1",
    lesson:
      "Integers are like money you have (positive) or owe (negative). Watch the signs — owing twice as much is very different from having twice as much.",
    workedExample: {
      prompt: "Compute (−3) + 7 − 2",
      steps: [
        "−3 + 7 = 4 (owe 3, then gain 7).",
        "4 − 2 = 2.",
        "Answer: 2",
      ],
    },
  },
  {
    id: "s2",
    slug: "one_step",
    name: "One-step equations",
    tier: "tentative",
    flagged: false,
    progressDetail:
      "Getting there — one more clean streak and this should stick for good.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 2",
    lesson:
      "A one-step equation is one lock to undo. Use the opposite operation on both sides until the variable stands alone.",
    workedExample: {
      prompt: "Solve: x + 5 = 12",
      steps: [
        "Subtract 5 from both sides.",
        "x = 7",
        "Check: 7 + 5 = 12 ✓",
      ],
    },
  },
  {
    id: "s3",
    slug: "two_step",
    name: "Two-step equations",
    tier: "struggling",
    flagged: false,
    progressDetail: "What you're actively working on right now.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 2",
    lesson:
      "Two operations changed the unknown — undo them in reverse order: peel off addition/subtraction first, then multiplication/division.",
    workedExample: {
      prompt: "Solve: 2x + 3 = 11",
      steps: [
        "Subtract 3 from both sides → 2x = 8.",
        "Divide both sides by 2 → x = 4.",
        "Check: 2(4) + 3 = 11 ✓",
      ],
    },
  },
  {
    id: "s4",
    slug: "multi_step",
    name: "Multi-step equations",
    tier: "emerging",
    flagged: false,
    progressDetail: "Just starting to take shape from early exposure.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 3",
    lesson:
      "Several operations stacked on the unknown. Undo carefully, one move at a time, in reverse order — same idea as two-step, just more layers.",
    workedExample: {
      prompt: "Solve: 3(x − 2) = 12",
      steps: [
        "Divide both sides by 3 → x − 2 = 4.",
        "Add 2 to both sides → x = 6.",
        "Check: 3(6 − 2) = 12 ✓",
      ],
    },
  },
  {
    id: "s5",
    slug: "variables_both_sides",
    name: "Variables on both sides",
    tier: "not_attempted",
    flagged: false,
    progressDetail: "Not reached yet.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 3",
    lesson:
      "The unknown shows up on both sides. Gather all variable terms to one side first, then finish like a two-step equation.",
    workedExample: {
      prompt: "Solve: 3x + 2 = x + 10",
      steps: [
        "Subtract x from both sides → 2x + 2 = 10.",
        "Subtract 2 → 2x = 8.",
        "Divide by 2 → x = 4. Check: 3(4)+2 = 4+10 ✓",
      ],
    },
  },
  {
    id: "s6",
    slug: "inequalities",
    name: "Inequalities",
    tier: "not_attempted",
    flagged: false,
    progressDetail: "Not reached yet.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 4",
    lesson:
      "Same moves as equations, but the answer is a range (greater than / less than), not a single value. Flip the inequality if you multiply or divide by a negative.",
    workedExample: {
      prompt: "Solve: 2x + 1 > 7",
      steps: [
        "Subtract 1 → 2x > 6.",
        "Divide by 2 → x > 3.",
        "Any number greater than 3 works.",
      ],
    },
  },
];

/**
 * Direct-prerequisite edges that don't follow simple list order. Variables on
 * both sides bridges back to two-step equations, not to the skill immediately
 * before it. Practice Session's first-exposure bridging depends on this too.
 */
export const PREREQUISITE_OVERRIDES: Record<string, string> = { s5: "s3" };

export function prerequisiteOf(id: string): Skill | null {
  const overrideId = PREREQUISITE_OVERRIDES[id];
  if (overrideId) return SKILLS.find((s) => s.id === overrideId) ?? null;
  const idx = SKILLS.findIndex((s) => s.id === id);
  return idx > 0 ? SKILLS[idx - 1] : null;
}

export const TIER_STYLE: Record<MasteryTier, TierStyle> = {
  not_attempted: {
    label: "Not attempted",
    dotBg: "oklch(88% 0.014 55)",
    dotBorder: "1px solid oklch(88% 0.014 55)",
    badgeBg: "oklch(93% 0.008 55)",
    badgeColor: "oklch(49% 0.018 55)",
  },
  struggling: {
    label: "Struggling",
    dotBg: "oklch(58% 0.11 25)",
    dotBorder: "none",
    badgeBg: "oklch(95% 0.03 25)",
    badgeColor: "oklch(45% 0.11 25)",
  },
  emerging: {
    label: "Emerging",
    dotBg: "oklch(63% 0.10 60)",
    dotBorder: "none",
    badgeBg: "oklch(95% 0.03 60)",
    badgeColor: "oklch(45% 0.10 60)",
  },
  tentative: {
    label: "Tentative",
    dotBg: "oklch(68% 0.09 100)",
    dotBorder: "none",
    badgeBg: "oklch(95% 0.025 100)",
    badgeColor: "oklch(42% 0.09 100)",
  },
  durable: {
    label: "Durable",
    dotBg: "oklch(60% 0.10 150)",
    dotBorder: "none",
    badgeBg: "oklch(93% 0.03 150)",
    badgeColor: "oklch(38% 0.10 150)",
  },
};

/** Next spaced-repetition review, consistent with Today/Week's Friday item. */
export const NEXT_REVIEW = {
  skillName: "One-step equations",
  whenLabel: "in 2 days",
  note: "A quick check-in to help this one stick for good.",
};
