/**
 * The guided chapter tour behind `?tour=1` on `/admin/...` routes.
 *
 * Mirrors Student and Teacher tour rules:
 * 1. The visitor only ever clicks Next (or lets it auto-play). No typing, no
 *    real writes, no billed AI — simulated surfaces carry TOUR_ADMIN_DEMO_LABEL.
 * 2. Chapters run forward only across the visible admin demo surface (Pilot and
 *    Billing are demo-hidden — no chapters here).
 *
 * Separate from the `?demo=1` harness and from Student/Teacher `?tour=1`.
 */

import type { AdminUserRoleChangeDraft } from "@/lib/admin-user-command";

export type AdminTourDemoCardKind =
  | "deletion_confirm"
  | "deletion_intent"
  | "role_change_review"
  | "lms_no_ai";

export const TOUR_ADMIN_DEMO_LABEL =
  "Demo mode — this shows the flow an admin would see; nothing is saved or billed";

export interface AdminTourStage {
  scriptedAsk?: {
    screen: "briefing" | "today" | "analytics";
    question: string;
    answer: string;
  };
  expandCuration?: boolean;
  showDeletionConfirmDemo?: boolean;
  showDeletionIntentDemo?: boolean;
  showRoleChangeReviewDemo?: boolean;
  roleChangeDraft?: AdminUserRoleChangeDraft;
  deletionIntentText?: string;
}

export interface AdminTourStep {
  id: string;
  href: string;
  target: string | null;
  title: string;
  caption: string;
  ms: number;
  screen?: string;
  stage?: AdminTourStage;
  demoCard?: AdminTourDemoCardKind;
}

export interface AdminTourChapter {
  id: string;
  title: string;
  screen: string;
  steps: AdminTourStep[];
}

const TOUR_ROLE_DRAFT: AdminUserRoleChangeDraft = {
  userId: "sarah_mokoena",
  fullName: "Sarah Mokoena",
  currentRole: "teacher",
  newRole: "admin",
};

const DELETION_INTENT_TEXT = "remove Mia Ndlovu's account and delete her data";

export const TOUR_CHAPTERS: AdminTourChapter[] = [
  {
    id: "school_wide_awareness",
    title: "School-wide awareness",
    screen: "Briefing",
    steps: [
      {
        id: "briefing_escalation",
        href: "/admin/briefing",
        target: "admin-briefing-list",
        title: "Escalation oversight before anyone opens a case",
        caption:
          "When distress records sit open past the aging threshold, they surface here as school-wide oversight — not primary response. Teachers handle case detail on their Briefing; this card is David Chen’s signal that something needs institutional attention.",
        ms: 14000,
      },
      {
        id: "briefing_ask",
        href: "/admin/briefing",
        target: "admin-briefing-ask",
        title: "Asking against the briefing synthesis",
        caption:
          "The answer is grounded in the escalation counts already computed for this scope — not a general FAQ. That is why it can cite how many records are overdue without inventing a student or teacher who is not in the data.",
        ms: 14000,
        stage: {
          scriptedAsk: {
            screen: "briefing",
            question: "how many escalations are open longer than the threshold",
            answer:
              "The Briefing shows escalations that have been open longer than the school-wide aging threshold — the same oversight count that appears on Today’s escalation backlog.",
          },
        },
      },
    ],
  },
  {
    id: "daily_weekly_operations",
    title: "Daily and weekly operations",
    screen: "Today",
    steps: [
      {
        id: "today_escalation",
        href: "/admin/today",
        target: "admin-today-escalation",
        title: "Escalation backlog across the school",
        caption:
          "The same open-count signal as Briefing, expressed as a standing backlog item — how many distress records are open school-wide right now, and how many have crossed the aging line.",
        ms: 13000,
      },
      {
        id: "today_curation",
        href: "/admin/today",
        target: "admin-today-curation",
        title: "Unmatched errors awaiting curation",
        caption:
          "Patterns that do not yet match a named misconception stay in a read-only backlog aggregated across every Space. Promoting them is a Pedagogical Lead capability — the disclosure says so instead of offering a button the Admin role does not have.",
        ms: 14000,
        stage: { expandCuration: true },
      },
      {
        id: "today_ask",
        href: "/admin/today",
        target: "admin-today-ask",
        title: "Asking what the backlog contains",
        caption:
          "Same grounded ask pattern as Briefing, scoped to Today’s standing counts: escalation backlog, curation backlog — not LMS assignment due-dates, which live on the Teacher shell.",
        ms: 13000,
        stage: {
          scriptedAsk: {
            screen: "today",
            question: "how many unmatched errors are waiting for curation",
            answer:
              "Today lists the school-wide curation backlog — unmatched errors aggregated across Spaces, with student names linking to Mastery Overview for awareness only.",
          },
        },
      },
      {
        id: "week_backlog",
        href: "/admin/week",
        target: "admin-week-backlog",
        screen: "Week",
        title: "The same backlog, week-wide lens",
        caption:
          "These are standing school-wide counts, not events pinned to calendar days — an honest note instead of inventing dates the data does not carry. Nothing here is a second product.",
        ms: 13000,
      },
    ],
  },
  {
    id: "pilot_wide_insight",
    title: "Pilot-wide insight",
    screen: "Analytics",
    steps: [
      {
        id: "analytics_adoption",
        href: "/admin/analytics",
        target: "admin-analytics-adoption",
        title: "Adoption computed from live roster sessions",
        caption:
          "Active students, session duration, and practice volume are computed on each view from the pilot roster and session history — not a cached dashboard snapshot.",
        ms: 13000,
      },
      {
        id: "analytics_tiers",
        href: "/admin/analytics",
        target: "admin-analytics-tiers",
        title: "Mastery tier distribution school-wide",
        caption:
          "The bar chart is a live aggregation of every student × skill cell on Overview — durable through not-attempted — so leaders see depth, not just login counts.",
        ms: 14000,
      },
      {
        id: "analytics_ask",
        href: "/admin/analytics",
        target: "admin-analytics-ask",
        title: "Plain-language lookup over those metrics",
        caption:
          "Answers come only from the computed adoption and mastery fields on this screen. Ask cannot rename a teacher filter that the pilot has not built yet.",
        ms: 13000,
        stage: {
          scriptedAsk: {
            screen: "analytics",
            question: "how many students were active in the last seven days",
            answer:
              "Use the Active students card — it counts roster members who practiced within the last seven days in the selected date range.",
          },
        },
      },
    ],
  },
  {
    id: "connecting_systems",
    title: "Connecting the school's systems",
    screen: "LMS setup",
    steps: [
      {
        id: "lms_canvas",
        href: "/admin/lms-setup",
        target: "admin-lms-canvas",
        title: "Canvas already connected for this school",
        caption:
          "Structured credential entry only — instance URL and developer key. When authorized, Student and Teacher due-date rows read from this integration with honest freshness labels.",
        ms: 14000,
      },
      {
        id: "lms_no_ai",
        href: "/admin/lms-setup",
        target: null,
        title: "No AI on this screen — by design",
        caption:
          "LMS setup is security-sensitive structured configuration. There is no ask box here on purpose — the same honesty as Student’s safety-net chapter calling out what the product deliberately does not automate.",
        ms: 15000,
        demoCard: "lms_no_ai",
      },
    ],
  },
  {
    id: "data_governance",
    title: "Data governance and access",
    screen: "Data",
    steps: [
      {
        id: "data_export",
        href: "/admin/data-requests",
        target: "admin-data-export",
        title: "CSV export — read-only and safe to trigger",
        caption:
          "Three files from the live roster: interactions, mastery state, and session history. Downloading here is export only — nothing is deleted or mutated.",
        ms: 13000,
      },
      {
        id: "data_deletion_form",
        href: "/admin/data-requests",
        target: "admin-data-deletion",
        title: "Deletion always runs through explicit confirmation",
        caption:
          "Plain-language triggers route into this structured form — they never delete in one click. The next steps show the confirm surface without submitting a real request.",
        ms: 13000,
      },
      {
        id: "data_deletion_confirm",
        href: "/admin/data-requests",
        target: "admin-data-deletion-confirm",
        title: "Typed phrase before the hold starts",
        caption:
          "The student, the exact confirm phrase, and the 72-hour hold are all visible before anything is scheduled. The tour lands on this real UI read-only — it never POSTs a deletion.",
        ms: 14000,
        stage: { showDeletionConfirmDemo: true },
      },
      {
        id: "data_deletion_demo",
        href: "/admin/data-requests",
        target: null,
        title: "Confirm without scheduling deletion",
        caption:
          "In production, submitting would create a data-rights request and start the hold. Here the confirm fields are simulated only — the tour never calls /api/admin/data-requests to schedule removal.",
        ms: 14000,
        stage: { showDeletionConfirmDemo: true },
        demoCard: "deletion_confirm",
      },
      {
        id: "users_deletion_intent",
        href: "/admin/users",
        target: "admin-users-command",
        screen: "Users",
        title: "Plain language that reads like deletion gets redirected",
        caption:
          "A casual “remove this student’s data” in user management does not execute as access control — parseDeletionIntent routes it to the data deletion flow instead. The command box shows that refusal without billing an AI call in this walkthrough.",
        ms: 15000,
        stage: {
          showDeletionIntentDemo: true,
          deletionIntentText: DELETION_INTENT_TEXT,
        },
        demoCard: "deletion_intent",
      },
      {
        id: "users_role_review",
        href: "/admin/users",
        target: "admin-users-role-review",
        title: "AI-drafted role change — review before commit",
        caption:
          "Conversational commands draft structured fields only. Sarah’s Teacher → Admin change lands on the real confirm panel — the tour never POSTs the role change.",
        ms: 14000,
        stage: {
          showRoleChangeReviewDemo: true,
          roleChangeDraft: TOUR_ROLE_DRAFT,
        },
      },
      {
        id: "users_role_demo",
        href: "/admin/users",
        target: null,
        title: "Structured confirmation, not auto-save",
        caption:
          "In production, confirming would update her role in the staff roster. Here the draft is fixed copy under the demo label — no /api/admin/users/command and no role PUT in this walkthrough.",
        ms: 14000,
        stage: {
          showRoleChangeReviewDemo: true,
          roleChangeDraft: TOUR_ROLE_DRAFT,
        },
        demoCard: "role_change_review",
      },
      {
        id: "users_roster",
        href: "/admin/users",
        target: "admin-users-list",
        title: "Who has access right now",
        caption:
          "Active, invited, and deactivated accounts in one list — structured invite and role change beside the plain-language command, with audit lines for what already happened.",
        ms: 13000,
      },
    ],
  },
];

export const TOUR_CHAPTER_COUNT = TOUR_CHAPTERS.length;

export interface AdminTourPosition {
  step: AdminTourStep;
  chapter: AdminTourChapter;
  chapterNumber: number;
  stepNumber: number;
  stepCount: number;
}

const TOUR_POSITIONS: AdminTourPosition[] = TOUR_CHAPTERS.flatMap(
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

export function tourPositionAt(index: number): AdminTourPosition {
  const clamped = Math.min(Math.max(index, 0), TOUR_STEP_COUNT - 1);
  return TOUR_POSITIONS[clamped];
}

const NON_STATE_PARAMS = ["tour", "pitch", "demo", "seed", "autoplay"];

export function normalizeAdminTourHref(href: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  for (const key of NON_STATE_PARAMS) params.delete(key);
  const query2 = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return query2 ? `${path}?${query2}` : path;
}

const ADMIN_TOUR_MODE_KEY = "escolent:adminTourMode";

export function readAdminTourMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ADMIN_TOUR_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeAdminTourMode(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) sessionStorage.setItem(ADMIN_TOUR_MODE_KEY, "true");
    else sessionStorage.removeItem(ADMIN_TOUR_MODE_KEY);
  } catch {
    /* ignore */
  }
}
