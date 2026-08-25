import type { EvaluationStrategy } from "./types";

export interface PracticeProblem {
  text: string;
  answer?: number;
  similarText?: string;
  similarStep1?: string;
  similarStep2?: string;
  partialStep?: string;
}

/** Two-step equations — the default session content. */
export const TWO_STEP_PROBLEMS: PracticeProblem[] = [
  {
    text: "3x + 5 = 20",
    answer: 5,
    similarText: "2x + 4 = 10",
    similarStep1: "Subtract 4 from both sides: 2x = 6",
    similarStep2: "Divide both sides by 2: x = 3",
    partialStep: "Subtract 5 from both sides: 3x = 15",
  },
  {
    text: "4x − 7 = 9",
    answer: 4,
    similarText: "3x − 5 = 7",
    similarStep1: "Add 5 to both sides: 3x = 12",
    similarStep2: "Divide both sides by 3: x = 4",
    partialStep: "Add 7 to both sides: 4x = 16",
  },
  {
    text: "2x + 9 = 21",
    answer: 6,
    similarText: "3x + 2 = 11",
    similarStep1: "Subtract 2 from both sides: 3x = 9",
    similarStep2: "Divide both sides by 3: x = 3",
    partialStep: "Subtract 9 from both sides: 2x = 12",
  },
  {
    text: "5x − 6 = 19",
    answer: 5,
    similarText: "2x − 3 = 7",
    similarStep1: "Add 3 to both sides: 2x = 10",
    similarStep2: "Divide both sides by 2: x = 5",
    partialStep: "Add 6 to both sides: 5x = 25",
  },
];

/** First-exposure content for the variables-on-both-sides skill. */
export const VARIABLES_BOTH_SIDES_PROBLEMS: PracticeProblem[] = [
  {
    text: "5x + 3 = 2x + 18",
    answer: 5,
    partialStep: "Subtract 2x from both sides: 3x + 3 = 18",
  },
];

/**
 * Rubric-graded demo problem: this equation has no solution — the x-terms
 * cancel, leaving 3 = 7, a false statement. Solving it correctly means
 * recognizing and explaining that, not stating a single numeric answer.
 */
export const NO_SOLUTION_PROBLEM: PracticeProblem = { text: "2x + 3 = 2x + 7" };

/**
 * Fixed platform-level Lenses — explanation strategies selected by skill and
 * moment, never by student preference. The ladder's worked-example tier shows
 * the procedural one on a first-exposure skill's first wrong attempt; that is
 * the same single ladder, not a second mechanism running alongside it.
 */
export const LENSES = {
  concrete_analogy: {
    name: "Concrete / analogy",
    styleInstruction:
      "Explain using a concrete, everyday analogy that makes the idea tangible. Do not present it as a numbered procedure.",
  },
  procedural_steps: {
    name: "Procedural steps",
    styleInstruction:
      "Explain as an explicit, ordered step-by-step procedure (first do this, then this, then this). Do not use an analogy framing — this must read as genuinely different in kind from an analogy.",
  },
} as const;

export const FEEDBACK_LINES = [
  "Nice — that's it.",
  "That's right.",
  "Got it — nice work.",
  "Yes — exactly.",
];

export const FALLBACK_HINT =
  "What's the first thing you'd need to undo before x is by itself?";

/**
 * Only two skills have real practice content in this demo. Everything else gets
 * an honest dead end rather than silently loading the wrong skill's problems
 * under the right label.
 */
export const UNSUPPORTED_SKILL_LABELS: Record<string, string> = {
  equation_basics: "Equation basics & balancing",
  integer_operations: "Integer operations",
  one_step: "One-step equations",
  multi_step: "Multi-step equations",
  inequalities: "Inequalities",
};

/** Demo fixture for the "genuinely interrupted" scenario (Requirement 30). */
export const SAVED_INTERRUPTION = {
  problemIndex: 1,
  wrongAnswers: [3, 2],
};

export const CONNECTIVITY_LABELS: Record<string, string> = {
  fresh: "Synced",
  stale: "Last synced a while ago",
  syncing: "Syncing…",
  unavailable: "Offline — saved on this device",
};

export const RUBRIC_TIER_LABELS: Record<string, string> = {
  strong: "Correct — solid reasoning",
  weak: "Right idea, reasoning needs work",
  incorrect: "Not quite",
};

export const RUBRIC_DOT_COLORS: Record<string, string> = {
  strong: "oklch(60% 0.10 150)",
  weak: "oklch(70% 0.13 80)",
  incorrect: "oklch(58% 0.16 25)",
};

export const RUBRIC_FALLBACK_FEEDBACK: Record<string, string> = {
  strong:
    "That's right — the x-terms cancel out, leaving 3 = 7, which is never true. Nice work explaining why.",
  weak:
    "You've got the right idea that this equation has no solution — but try explaining what happens to the x-terms and why that leads there.",
  incorrect:
    "Take another look — try subtracting 2x from both sides first, then see what's left.",
};

/**
 * Requirement 7.8: the response control is matched to the Skill's
 * Evaluation_Strategy — never a general chat input for the answer itself.
 */
export function controlForStrategy(
  strategy: EvaluationStrategy,
): "input" | "textarea" {
  return strategy === "rubric_llm" ? "textarea" : "input";
}
