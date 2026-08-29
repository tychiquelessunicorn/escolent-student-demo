/**
 * The guided chapter tour behind `?tour=1` on `/teacher/...` routes.
 *
 * Mirrors the Student tour rules:
 * 1. The visitor only ever clicks Next (or lets it auto-play). No typing, no
 *    real writes, no billed AI — simulated surfaces carry TOUR_TEACHER_DEMO_LABEL.
 * 2. Chapters run forward only. Once a chapter ends its screen is never shown
 *    again (Briefing → Today/Week → Overview → Escalations → Spaces → Settings).
 *
 * Separate from the `?demo=1` harness and from the Student `?tour=1` system.
 */

export type TeacherTourDemoCardKind =
  | "override_revisit"
  | "space_coauthor"
  | "digest_preview";

/**
 * The on-screen label every teacher-side simulation carries so nobody watching
 * can mistake a scripted card for a live write or a billed AI call.
 */
export const TOUR_TEACHER_DEMO_LABEL =
  "Demo mode — this shows the flow a teacher would see; nothing is saved or billed";

/** Declarative instructions the teacher screens read off the current step. */
export interface TeacherTourStage {
  scriptedAsk?: {
    screen: "briefing" | "today";
    question: string;
    answer: string;
  };
  expandBriefingId?: string;
  openSpaceCoauthor?: boolean;
  spaceCoauthorText?: string;
  /** Force override flow visible without submitting */
  showOverrideRevisitDemo?: boolean;
}

export interface TeacherTourStep {
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
  stage?: TeacherTourStage;
  /** A labelled simulation the tour renders itself, never the live path. */
  demoCard?: TeacherTourDemoCardKind;
}

export interface TeacherTourChapter {
  id: string;
  /** Shown beside "Chapter 3 of 6". */
  title: string;
  /** The screen this chapter lives on. */
  screen: string;
  steps: TeacherTourStep[];
}

/** Seeded distress record viewed by David Chen — fixed id from distress-store. */
const ESCALATION_VIEWED_BY_ADMIN =
  "a9d7e3b2-8c4f-4a2b-b1d0-7e8f9a0b1c2d";

/** Grouped struggling set (Mia + Marcus on two-step) — expands for set-selection. */
const BRIEFING_STRUGGLING_GROUP = "struggling:algebra_8a:s3";

/** Elena's roster override skill (integer operations). */
const ELENA_OVERRIDE_SKILL = "s1";

const SPACE_COAUTHOR_PROMPT =
  "Catch-up Space for students still shaky on one-step and two-step equations — keep problems easy to medium";

export const TOUR_CHAPTERS: TeacherTourChapter[] = [
  {
    id: "daily_awareness",
    title: "Daily awareness",
    screen: "Briefing",
    steps: [
      {
        id: "briefing_list",
        href: "/teacher/briefing",
        target: "teacher-briefing-list",
        title: "What needs her today, already synthesized",
        caption:
          "Escalations, stuck students, misconception spikes, and overdue override checks are pulled into one list — not four separate queues she has to remember to open. Each row is grounded in the same roster and distress data Overview already uses, so the Briefing cannot invent a crisis that the rest of the product does not know about.",
        ms: 14000,
      },
      {
        id: "briefing_set_selection",
        href: "/teacher/briefing",
        target: "teacher-briefing-expanded",
        title: "When more than one student is stuck",
        caption:
          "A grouped flag does not pretend there is a single deep-link. It expands into a set she chooses from (Req 10.3a), so the product never silently picks a student for her or collapses several names into one link that only works for one of them.",
        ms: 14000,
        stage: { expandBriefingId: BRIEFING_STRUGGLING_GROUP },
      },
      {
        id: "briefing_space_filter",
        href: "/teacher/briefing",
        target: "teacher-briefing-space-filter",
        title: "Scoped to the Spaces she teaches",
        caption:
          "All Spaces is the default morning scan; each tab narrows the same synthesis to one class. The filter does not reload a different product — it is the same Briefing with a tighter lens.",
        ms: 12000,
      },
      {
        id: "briefing_ask",
        href: "/teacher/briefing",
        target: "teacher-briefing-ask",
        title: "Asking against the briefing itself",
        caption:
          "The answer is grounded in the rows she can already see, not a general FAQ. That is why it can name who is flagged and why without inventing a student who is not on the list.",
        ms: 14000,
        stage: {
          scriptedAsk: {
            screen: "briefing",
            question: "why is Marcus flagged today",
            answer:
              "Marcus Diaz is in the urgent group stuck on two-step equations — still struggling, practicing now. The Briefing groups him with Mia Ndlovu on the same skill so you can choose who to open first.",
          },
        },
      },
    ],
  },
  {
    id: "this_weeks_picture",
    title: "This week's picture",
    screen: "Today",
    steps: [
      {
        id: "today_stale_lms",
        href: "/teacher/today",
        target: "teacher-today-stale-lms",
        title: "When the LMS sync is not fresh",
        caption:
          "Canvas deadlines sit beside Escolent-native work, tagged as reference-only, and freshness is honest — stale means the gradebook window may have moved since Escolent last read it. The product does not pretend it can grade someone else's quiz from here.",
        ms: 14000,
      },
      {
        id: "today_curation",
        href: "/teacher/today",
        target: "teacher-today-curation",
        title: "Unmatched errors, not yet named misconceptions",
        caption:
          "Patterns that do not match a known misconception stay in a read-only backlog. Promoting them is a Pedagogical Lead capability — so the disclosure says so plainly instead of offering a button that would invent authority the Teacher role does not have.",
        ms: 15000,
      },
      {
        id: "today_ask",
        href: "/teacher/today",
        target: "teacher-today-ask",
        title: "Asking what is due across her Spaces",
        caption:
          "Same grounded ask pattern as Briefing, scoped to the due list: LMS deadlines and Escolent-native follow-ups for the Spaces she manages, not a calendar she has to reconcile by hand.",
        ms: 14000,
        stage: {
          scriptedAsk: {
            screen: "today",
            question: "what's due for Grade 8A Remediation this week",
            answer:
              "Remediation has the Unit 2 test grading deadline on Friday (Canvas, currently stale) and Quiz 3 grades due Monday. Unmatched-error awareness for Carlos and Tyler also sits on today’s Escolent list.",
          },
        },
      },
      {
        id: "week_grid",
        href: "/teacher/week",
        target: "teacher-week-grid",
        screen: "Week",
        title: "The same picture, stretched across the week",
        caption:
          "Today’s list widened out: adaptive follow-ups and LMS items day by day, so an overloaded Friday is visible before Wednesday arrives. Nothing here is a second product — it is the same schedule with a wider lens.",
        ms: 14000,
      },
    ],
  },
  {
    id: "mastery_and_judgment",
    title: "Mastery and judgment",
    screen: "Overview",
    steps: [
      {
        id: "overview_grid",
        href: "/teacher/overview",
        target: "teacher-overview-grid",
        title: "Mastery per student, per skill",
        caption:
          "The grid is the judgment surface: five tiers, prerequisite gaps, and teacher overrides in the same cells. It is live roster data — the same source Briefing synthesizes — so opening a student never jumps into a different truth.",
        ms: 14000,
      },
      {
        id: "overview_zainab",
        href: "/teacher/overview?student=zainab_osei",
        target: "teacher-overview-misconception",
        title: "A misconception she can act on",
        caption:
          "Zainab’s panel surfaces a named pattern on two-step equations — treating negative coefficients as positive when dividing — observed this week. The drill-down is why Overview exists beside the Briefing: synthesis points here for the detail.",
        ms: 15000,
      },
      {
        id: "overview_elena_override",
        href: `/teacher/overview?student=elena_cruz&overrideSkill=${ELENA_OVERRIDE_SKILL}&overrideMode=revisit`,
        target: "teacher-overview-override",
        title: "An override that is due for revisit",
        caption:
          "Elena’s integer-operations override was applied from class observation over a month ago. The revisit flow asks her to confirm or reassess — and the next step shows that confirm UI as a labelled demo so nothing is written or billed in this walkthrough.",
        ms: 14000,
        stage: { showOverrideRevisitDemo: true },
      },
      {
        id: "overview_override_demo",
        href: `/teacher/overview?student=elena_cruz&overrideSkill=${ELENA_OVERRIDE_SKILL}&overrideMode=revisit`,
        target: null,
        title: "Confirm without writing a record",
        caption:
          "In production, confirming would POST an override reconfirm and update Elena’s cell. Here the confirm surface is simulated only — the tour never calls the override API, so a visitor can see the judgment step without changing the demo roster.",
        ms: 15000,
        stage: { showOverrideRevisitDemo: true },
        demoCard: "override_revisit",
      },
    ],
  },
  {
    id: "safety_net",
    title: "Safety net",
    screen: "Escalations",
    steps: [
      {
        id: "escalations_list",
        href: "/teacher/escalations",
        target: "teacher-escalations-list",
        title: "Unacknowledged beside already handled",
        caption:
          "The same distress records the Student shell creates land here: open ones need acknowledgment; acknowledged ones stay for continuity. Views by other staff are visible so two teachers do not double-handle the same signal.",
        ms: 14000,
      },
      {
        id: "escalation_detail",
        href: `/teacher/escalations/${ESCALATION_VIEWED_BY_ADMIN}`,
        target: "teacher-escalation-detail",
        title: "A record David Chen already opened",
        caption:
          "This seeded student-initiated help tap was viewed by the admin — so the detail shows who looked, what reason was chosen, and that acknowledgment is still open. Live read only: the tour does not acknowledge or rewrite the record.",
        ms: 15000,
      },
    ],
  },
  {
    id: "configuring_practice",
    title: "Configuring practice",
    screen: "Spaces",
    steps: [
      {
        id: "spaces_list",
        href: "/teacher/spaces",
        target: "teacher-spaces-list",
        title: "The Spaces she configures",
        caption:
          "Each Space is a practice configuration — skills, difficulty intent, pacing, and roster assignment — not a second gradebook. Creating or editing one is how she shapes what adaptive practice can pull from.",
        ms: 13000,
      },
      {
        id: "spaces_coauthor",
        href: "/teacher/spaces/new",
        target: "teacher-space-coauthor",
        title: "Describe the Space in plain language",
        caption:
          "Co-author drafts skill checkboxes and a difficulty range from a short description. Name and description stay hers to write, and every suggestion is reviewable before save — the next card shows a scripted draft so this walkthrough never bills an AI call.",
        ms: 15000,
        stage: {
          openSpaceCoauthor: true,
          spaceCoauthorText: SPACE_COAUTHOR_PROMPT,
        },
      },
      {
        id: "spaces_coauthor_demo",
        href: "/teacher/spaces/new",
        target: null,
        title: "A draft she would review, not auto-save",
        caption:
          "The simulated result picks one-step and two-step skills at difficulty 1–3. In production that would come from the co-author model; here it is fixed copy under the demo label so nothing is saved and nothing is billed.",
        ms: 15000,
        stage: {
          openSpaceCoauthor: true,
          spaceCoauthorText: SPACE_COAUTHOR_PROMPT,
        },
        demoCard: "space_coauthor",
      },
    ],
  },
  {
    id: "staying_informed",
    title: "Staying informed",
    screen: "Settings",
    steps: [
      {
        id: "digest_schedule",
        href: "/teacher/settings",
        target: "teacher-digest-schedule",
        title: "When the weekly digest would go out",
        caption:
          "Day and time are saved per teacher. This demo does not send email — the schedule is the preference surface for when a real send would fire.",
        ms: 13000,
      },
      {
        id: "digest_preview_demo",
        href: "/teacher/settings",
        target: null,
        title: "What the email would say",
        caption:
          "Normally this preview is AI-generated from the week’s real metrics. The tour shows a fixed sample that mentions Elena’s override revisit and Zainab’s misconception — labelled demo mode, not a live generation and not a send.",
        ms: 16000,
        demoCard: "digest_preview",
      },
    ],
  },
];

export const TOUR_CHAPTER_COUNT = TOUR_CHAPTERS.length;

/** Chapter/step lookup by flat index, so the UI never walks the tree itself. */
export interface TeacherTourPosition {
  step: TeacherTourStep;
  chapter: TeacherTourChapter;
  /** 1-based, for "Chapter 3 of 6". */
  chapterNumber: number;
  /** 1-based, for "Step 2 of 4". */
  stepNumber: number;
  stepCount: number;
}

const TOUR_POSITIONS: TeacherTourPosition[] = TOUR_CHAPTERS.flatMap(
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

export function tourPositionAt(index: number): TeacherTourPosition {
  const clamped = Math.min(Math.max(index, 0), TOUR_STEP_COUNT - 1);
  return TOUR_POSITIONS[clamped];
}

/**
 * Params that belong to the harness or to tour bootstrapping rather than to the
 * state being demonstrated. Ignored when deciding whether the browser is
 * already showing the step's route.
 */
const NON_STATE_PARAMS = ["tour", "pitch", "demo", "seed", "space", "autoplay"];

/** Canonical form of a route for comparing "where we are" with "where we want to be". */
export function normalizeTeacherTourHref(href: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  for (const key of NON_STATE_PARAMS) params.delete(key);
  const query2 = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return query2 ? `${path}?${query2}` : path;
}

const TEACHER_TOUR_MODE_KEY = "escolent:teacherTourMode";

export function readTeacherTourMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(TEACHER_TOUR_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeTeacherTourMode(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) sessionStorage.setItem(TEACHER_TOUR_MODE_KEY, "true");
    else sessionStorage.removeItem(TEACHER_TOUR_MODE_KEY);
  } catch {
    /* ignore */
  }
}
