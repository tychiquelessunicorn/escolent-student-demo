/**
 * The guided chapter tour behind `?tour=1`.
 *
 * Two rules shape every step below.
 *
 * 1. The visitor only ever clicks Next (or lets it auto-play). No step asks
 *    anyone to type a value or find an unlabelled control, so any state that
 *    used to need a real interaction is reached by putting the demo param in
 *    `href` and navigating straight there.
 * 2. Chapters run forward only. Once a chapter ends its screen is never shown
 *    again, which is why the route order is Today → Learn → Practice →
 *    Progress → Week and Practice carries three consecutive chapters.
 *
 * This is a separate system from the `?demo=1` harness panel. The harness is a
 * grid of param dropdowns for someone who already knows what they want to see;
 * this is a narrated path for someone who does not.
 */

export type TourDemoCardKind = "help_button" | "passive_detection";

/**
 * The on-screen label every safety-net simulation carries. Chapter 4 shows the
 * distress surfaces without going anywhere near the live escalation path, and
 * this label is why nobody watching can mistake it for a real one.
 */
export const TOUR_SAFETY_DEMO_LABEL =
  "Demo mode — this is what the platform shows when it notices a student needs support";

/** Declarative instructions the screens read off the current step. */
export interface TourStage {
  /**
   * A scripted ask-box exchange. The tour never asks anyone to type, so the
   * question and its grounded answer are handed to the ask box instead of
   * being submitted through it.
   */
  scriptedAsk?: {
    screen: "today" | "learn";
    question: string;
    answer: string;
  };
  /** Skill row Learn opens by itself, so the lesson content is already visible. */
  openSkillId?: string;
  /**
   * Render the shell help controls in their escalation form (five one-tap
   * reasons). On Practice that same slot is the hint drawer, and the safety-net
   * chapter is about the other one.
   */
  helpButtonEscalates?: boolean;
}

export interface TourStep {
  id: string;
  /** Route including query params — the tour drives every demo param itself. */
  href: string;
  /** `data-tour` value to spotlight, or null for a step with no live anchor. */
  target: string | null;
  title: string;
  /** Why this element matters. The reasoning, not the label. */
  caption: string;
  /** Auto-play dwell time in ms. */
  ms: number;
  /** Overrides the chapter's screen label where a chapter spans two screens. */
  screen?: string;
  stage?: TourStage;
  /** A labelled simulation the tour renders itself, never the live path. */
  demoCard?: TourDemoCardKind;
  /** Records the demo skill as mastered so later chapters show the consequence. */
  marksMastery?: boolean;
}

export interface TourChapter {
  id: string;
  /** Shown beside "Chapter 3 of 6". */
  title: string;
  /** The screen this chapter lives on. */
  screen: string;
  steps: TourStep[];
}

const PRACTICE_VARIABLES = "/student/practice?skill=variables_both_sides";
const PRACTICE_TWO_STEP = "/student/practice?skill=two_step&entryVariant=returning";

export const TOUR_CHAPTERS: TourChapter[] = [
  {
    id: "daily_awareness",
    title: "Daily awareness",
    screen: "Today",
    steps: [
      {
        id: "today_due_items",
        href: "/student/today",
        target: "today-due-items",
        title: "Everything due, in one list",
        caption:
          "Escolent's own adaptive work and the items it reads out of Canvas sit in the same list, tagged by Space. Mia never has to check two places to know what her day looks like — and the Canvas rows stay deliberately reference-only, because Escolent cannot grade someone else's essay and should not imply that it can.",
        ms: 13000,
      },
      {
        id: "today_ask",
        href: "/student/today",
        target: "today-ask",
        title: "Asking about her own schedule",
        caption:
          "The answer is generated over her real due-items rows rather than matched against a canned FAQ, so it can only tell her about work that is actually on her list. That is also why it can say nothing from Escolent is scheduled that day instead of inventing something to fill the gap.",
        ms: 14000,
        stage: {
          scriptedAsk: {
            screen: "today",
            question: "what do I have due Thursday",
            answer:
              "Thursday has one thing: the “A Place That Changed Me” essay draft for Language Arts, due 11:59pm in Canvas. Nothing from Escolent is scheduled that day.",
          },
        },
      },
    ],
  },
  {
    id: "learning",
    title: "Learning the material",
    screen: "Learn",
    steps: [
      {
        id: "learn_skill_map",
        href: "/student/learn",
        target: "learn-skill-map",
        title: "The skill map for this Space",
        caption:
          "Skills are ordered by prerequisite rather than by textbook page, and each one carries its current mastery tier. This is the same graph the practice session walks, so what she can see here is exactly what decides what she gets given next.",
        ms: 13000,
      },
      {
        id: "learn_lesson",
        href: "/student/learn",
        target: "learn-skill-expanded",
        title: "Instruction generated for one skill",
        caption:
          "Opening a skill shows a concept beat and a worked example produced for that skill through a fixed platform Lens. The explanation strategy is chosen by the platform, never picked by the student, so two learners on the same skill get the same instructional intent — and the source line underneath keeps it traceable to the teacher's curriculum guide.",
        ms: 15000,
        stage: { openSkillId: "s5" },
      },
      {
        id: "learn_ask",
        href: "/student/learn",
        target: "learn-ask",
        title: "Asking inside a Space",
        caption:
          "The ask box is scoped to this Space's skill list, and it is built to refuse a bare final answer to a specific problem — ask it for the answer and it asks for her working instead. Help that hands over answers would quietly destroy the mastery signal everything else here depends on.",
        ms: 15000,
        stage: {
          scriptedAsk: {
            screen: "learn",
            question: "why do we flip the sign in inequalities",
            answer:
              "Because multiplying or dividing both sides by a negative reverses which side is larger — 2 > 1 becomes −2 < −1. That flip only applies to negatives; adding or subtracting never changes the direction.",
          },
        },
      },
    ],
  },
  {
    id: "adaptive_practice",
    title: "Adaptive practice",
    screen: "Practice",
    steps: [
      {
        id: "practice_first_exposure",
        href: `${PRACTICE_VARIABLES}&entryVariant=first_exposure`,
        target: "practice-intro",
        title: "First exposure to a brand-new skill",
        caption:
          "She has never attempted this skill, so the session opens with instruction instead of a problem. The explanation is bridged back to two-step equations on purpose: that prerequisite is not solid yet, and teaching the new move without reconnecting it would only carry the gap forward.",
        ms: 14000,
      },
      {
        id: "practice_scaffold",
        href: `${PRACTICE_VARIABLES}&problemDemo=wrong_answer_scaffold`,
        target: "practice-scaffold",
        title: "A wrong answer, and what happens next",
        caption:
          "One wrong attempt does not end the problem. The ladder moves a single rung — worked example, guided step, hint, on her own — and hands her a partially completed step rather than the answer. Which rung she needed is the measurement, so the scaffold is data about her, not just encouragement.",
        ms: 15000,
      },
      {
        id: "practice_mastery",
        href: `${PRACTICE_VARIABLES}&problemDemo=mastery_moment`,
        target: "practice-achievement",
        title: "The moment a skill lands",
        caption:
          "The achievement accent is reserved for two events in the whole product, and this is one of them: a first-exposure skill resolving. Keeping it rare is the entire point — an accent that fires on every correct answer stops meaning anything by the second week.",
        ms: 13000,
        marksMastery: true,
      },
      {
        id: "practice_rubric",
        href: `${PRACTICE_VARIABLES}&problemDemo=no_solution_rubric`,
        target: "practice-rubric",
        title: "A problem with no number to type",
        caption:
          "This equation has no solution — the x-terms cancel and leave 3 = 7. Exact-match grading cannot assess that, so the response control becomes free text and the reasoning is graded against a rubric. The control follows the skill's evaluation strategy; it is not a chat box bolted onto every question.",
        ms: 15000,
      },
    ],
  },
  {
    id: "safety_net",
    title: "The safety net",
    screen: "Practice",
    steps: [
      {
        id: "safety_help_button",
        href: `${PRACTICE_VARIABLES}&problemDemo=no_solution_rubric`,
        target: "help-button",
        title: "One tap, nothing else asked of her",
        caption:
          "One I need help button opens five reasons in the shell, so they are on every screen rather than only where the platform expects trouble. Choosing a reason is sending — no confirmation step and no form — because every extra tap is another chance to give up. The record is written and confirmed before she is ever told a teacher has been notified.",
        ms: 15000,
        stage: { helpButtonEscalates: true },
        demoCard: "help_button",
      },
      {
        id: "safety_passive",
        href: `${PRACTICE_VARIABLES}&problemDemo=no_solution_rubric`,
        target: null,
        title: "Detection she never has to trigger",
        caption:
          "Every free-text field is watched, not one designated box. Detection runs quietly in parallel with answering her real question, so nothing about the flow feels interrupted — she gets her answer, and the same calm line appears beside it. The classifier is tuned so that ordinary frustration like “this is so hard” does not fire and genuine hopelessness does.",
        ms: 16000,
        stage: { helpButtonEscalates: true },
        demoCard: "passive_detection",
      },
    ],
  },
  {
    id: "resilience",
    title: "Staying resilient",
    screen: "Practice",
    steps: [
      {
        id: "resilience_offline",
        href: `${PRACTICE_TWO_STEP}&connectivityDemo=unavailable`,
        target: "connectivity",
        title: "The connection drops mid-session",
        caption:
          "Only the header changed. The problem was already loaded, so the ladder is evaluated on the device and her responses queue for sync — and there is no retry button anywhere, because the session picks itself up the moment connectivity returns. Genuinely new content still needs a connection, and the app says so plainly instead of failing silently.",
        ms: 15000,
      },
      {
        id: "resilience_resume",
        href: `${PRACTICE_TWO_STEP}&interruptionDemo=recent`,
        target: "practice-resume",
        title: "Coming back to an interrupted session",
        caption:
          "The exact position is restored — which problem, how many attempts in — so an interrupted session is not a restarted one. Start fresh is offered right beside it because a resumed session she did not want is worse than no resume at all.",
        ms: 14000,
      },
      {
        id: "resilience_direct_open",
        href: `${PRACTICE_TWO_STEP}&directOpenDemo=valid_session`,
        // The session check runs first, so this target does not exist for the
        // first moment of the step. The overlay dims evenly until it does.
        target: "practice-session-card",
        title: "Arriving without the LMS",
        caption:
          "That brief check was a bookmark or installed-app open verifying the existing session, then dropping her into the same entry path a Canvas launch uses. There is no standalone student login by design, so when no session is found she is sent back to Canvas rather than offered a password she was never given.",
        ms: 14000,
      },
      {
        id: "resilience_notification",
        href: `${PRACTICE_VARIABLES}&notificationPreviewDemo=shown`,
        target: "practice-notification",
        title: "How she gets pulled back",
        caption:
          "When a skill comes up for spaced review, the notification deep-links into the session with that skill already selected — the same routing Progress and the schedule use. It is labelled a mockup on screen because nothing in this build actually sends a push.",
        ms: 13000,
      },
    ],
  },
  {
    id: "progress",
    title: "Progress and mastery",
    screen: "Progress",
    steps: [
      {
        id: "progress_tiers",
        href: "/student/progress",
        target: "progress-skill-tiers",
        title: "Mastery per skill, not per assignment",
        caption:
          "Five ordered tiers tracked per skill instead of averaged into one grade, with prerequisite gaps flagged where they actually sit rather than where the unit says she should be. Variables on both sides now reads durable because of the session in chapter three — the same event that changed her practice queue changed this.",
        ms: 15000,
      },
      {
        id: "progress_next_review",
        href: "/student/progress",
        target: "progress-next-review",
        title: "The next review is scheduled, not chosen",
        caption:
          "Spacing is decided by what the model thinks is decaying, not by what she feels like revisiting. That is the difference between practice that sticks and practice that only feels productive at the time.",
        ms: 13000,
      },
      {
        id: "progress_week",
        href: "/student/week",
        target: "week-grid",
        screen: "Week",
        title: "The week ahead",
        caption:
          "The same unified picture as Today, widened out: adaptive work and LMS items side by side, so a quiet week and an overloaded one are both visible before they arrive. That is the whole loop — one honest list, instruction, adaptive practice, and a safety net underneath all of it.",
        ms: 15000,
      },
    ],
  },
];

export const TOUR_CHAPTER_COUNT = TOUR_CHAPTERS.length;

/** Chapter/step lookup by flat index, so the UI never walks the tree itself. */
export interface TourPosition {
  step: TourStep;
  chapter: TourChapter;
  /** 1-based, for "Chapter 3 of 6". */
  chapterNumber: number;
  /** 1-based, for "Step 2 of 4". */
  stepNumber: number;
  stepCount: number;
}

const TOUR_POSITIONS: TourPosition[] = TOUR_CHAPTERS.flatMap(
  (chapter, chapterIndex) =>
    chapter.steps.map((step, stepIndex) => ({
      step,
      chapter,
      chapterNumber: chapterIndex + 1,
      stepNumber: stepIndex + 1,
      stepCount: chapter.steps.length,
    })),
);

export const TOUR_STEP_COUNT = TOUR_POSITIONS.length;

export function tourPositionAt(index: number): TourPosition {
  const clamped = Math.min(Math.max(index, 0), TOUR_STEP_COUNT - 1);
  return TOUR_POSITIONS[clamped];
}

/**
 * Params that belong to the harness or to tour bootstrapping rather than to the
 * state being demonstrated. Ignored when deciding whether the browser is
 * already showing the step's route, so the tour does not re-navigate over
 * `?tour=1` on the very first step.
 */
const NON_STATE_PARAMS = ["tour", "pitch", "demo", "seed", "space", "autoplay"];

/** Canonical form of a route for comparing "where we are" with "where we want to be". */
export function normalizeTourHref(href: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  for (const key of NON_STATE_PARAMS) params.delete(key);
  const query2 = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return query2 ? `${path}?${query2}` : path;
}
