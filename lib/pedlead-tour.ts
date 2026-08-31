/**
 * The guided chapter tour behind `?tour=1` on `/pedlead/...` routes.
 *
 * Core principles:
 * 1. Only Next or auto-play. Never real typing, never a destructive write or billed AI call.
 *    Simulated surfaces carry TOUR_PEDLEAD_DEMO_LABEL.
 * 2. Four chapters running strictly forward across the built Pedagogical Lead surface:
 *    - Chapter 1: Content Authoring (Plain language draft, edit skill, reject with feedback, live edit safeguard)
 *    - Chapter 2: Briefing (Cross-tenant awareness, awaiting review & thin coverage, drilldown, ask box)
 *    - Chapter 3: Coverage Indicators (Prioritization tool, rich/thin/gap across algebra & ecosystems)
 *    - Chapter 4: LMS Content Ingestion (Text ingestion, Vision AI OCR diagram parsing, sparse-content fallback)
 *
 * Completely separate from the `?demo=1` harness and from Student/Teacher/Admin `?tour=1`.
 */

export type PedleadTourDemoCardKind =
  | "authoring_draft"
  | "reject_feedback"
  | "live_edit_confirm"
  | "lms_text"
  | "lms_vision"
  | "lms_sparse";

export const TOUR_PEDLEAD_DEMO_LABEL =
  "Demo mode — shows the flow a Pedagogical Lead sees; nothing is saved or billed";

export interface PedleadTourStage {
  scriptedAsk?: {
    question: string;
    answer: string;
  };
  showDraftDemo?: boolean;
  draftPromptText?: string;
  openSkillEditDemo?: boolean;
  openRejectModalDemo?: boolean;
  showLiveEditDemo?: boolean;
  selectedLmsItem?: "lms_eco_doc_symbiosis" | "lms_eco_img_trophic_pyramid" | "lms_eco_sparse_stub";
  showLmsTextDemo?: boolean;
  showLmsVisionDemo?: boolean;
  showLmsSparseDemo?: boolean;
}

export interface PedleadTourStep {
  id: string;
  href: string;
  target: string | null;
  title: string;
  caption: string;
  ms: number;
  screen?: string;
  stage?: PedleadTourStage;
  demoCard?: PedleadTourDemoCardKind;
}

export interface PedleadTourChapter {
  id: string;
  title: string;
  screen: string;
  steps: PedleadTourStep[];
}

export const TOUR_CHAPTERS: PedleadTourChapter[] = [
  {
    id: "content_authoring",
    title: "Content Authoring",
    screen: "Content Authoring",
    steps: [
      {
        id: "authoring_draft_generator",
        href: "/pedlead/authoring",
        target: "pedlead-authoring-draft",
        title: "Plain language drafts candidate skill graphs",
        caption:
          "Describing a unit in plain English synthesizes a proposed DAG skill graph with both exact-match and rubric evaluation, plus diagnostic misconceptions. The AI proposes; the Pedagogical Lead confirms.",
        ms: 14000,
        stage: {
          showDraftDemo: true,
          draftPromptText:
            "Grade 7 Unit on Ecosystems and Food Webs: producers, primary/secondary consumers, decomposers, the 10% energy transfer rule, food web keystone species, and top-down trophic cascades.",
        },
        demoCard: "authoring_draft",
      },
      {
        id: "authoring_edit_skills",
        href: "/pedlead/authoring",
        target: "pedlead-authoring-skills",
        title: "Full editorial control before approval",
        caption:
          "The Pedagogical Lead can edit, split, merge, or adjust difficulties and rubric rubrics for any node. Drafts and pending units are quarantined and never served to students in practice.",
        ms: 14000,
        stage: {
          openSkillEditDemo: true,
        },
      },
      {
        id: "authoring_reject_feedback",
        href: "/pedlead/authoring",
        target: "pedlead-authoring-lifecycle",
        title: "Reject-with-feedback as a distinct path",
        caption:
          "Review is not a binary approve/ignore toggle. Rejecting with feedback records specific pedagogical guidance explaining why content was returned to draft, preserving an audit trail.",
        ms: 14000,
        stage: {
          openRejectModalDemo: true,
        },
        demoCard: "reject_feedback",
      },
      {
        id: "authoring_live_edit_safeguard",
        href: "/pedlead/authoring",
        target: "pedlead-authoring-live-edit",
        title: "Safeguard for editing live validated content",
        caption:
          "Modifying validated content that is actively served in student practice stages changes into a pending edit with a separate confirmation step, preventing live session disruption.",
        ms: 14000,
        stage: {
          showLiveEditDemo: true,
        },
        demoCard: "live_edit_confirm",
      },
    ],
  },
  {
    id: "pedlead_briefing",
    title: "Cross-Tenant Briefing",
    screen: "Briefing",
    steps: [
      {
        id: "briefing_cross_tenant_synthesis",
        href: "/pedlead/briefing",
        target: "pedlead-briefing-list",
        title: "Synthesized cross-tenant curriculum intelligence",
        caption:
          "Aggregates curriculum items requiring review across all school tenants: units pending review longer than 5 business days, thin rubric coverage, and misconception patterns appearing across schools.",
        ms: 14000,
      },
      {
        id: "briefing_drilldown",
        href: "/pedlead/briefing",
        target: "pedlead-briefing-item-primary",
        title: "Direct drilldown to authoring records",
        caption:
          "Tapping any synthesized briefing item navigates directly to the specific skill node or misconception taxonomy in the authoring studio, carrying unit context automatically.",
        ms: 13000,
      },
      {
        id: "briefing_ask",
        href: "/pedlead/briefing",
        target: "pedlead-briefing-ask",
        title: "Grounded curriculum Q&A without student data",
        caption:
          "AI queries are grounded strictly in the cross-tenant content items. Under Requirement 21.5, this role has zero access to student, teacher, or operational session data.",
        ms: 14000,
        stage: {
          scriptedAsk: {
            question: "which skills have thin coverage across schools",
            answer:
              "Nutrient Cycling & Decomposer Energetics has thin rubric coverage (missing model response exemplar), while Marine Keystone Equilibrium has zero mapped misconceptions.",
          },
        },
      },
    ],
  },
  {
    id: "coverage_indicators",
    title: "Coverage Indicators",
    screen: "Coverage",
    steps: [
      {
        id: "coverage_overview",
        href: "/pedlead/coverage",
        target: "pedlead-coverage-overview",
        title: "Cross-tenant curriculum coverage breakdown",
        caption:
          "Live, real breakdown of graph health: gap (unvalidated/draft), thin (missing misconceptions or rubric exemplar), and rich (validated with active diagnostic models). Algebra is rich throughout, while ecosystems shows genuine mixed states.",
        ms: 14000,
      },
      {
        id: "coverage_prioritization",
        href: "/pedlead/coverage",
        target: "pedlead-coverage-queue",
        title: "Prioritization tool for curriculum effort",
        caption:
          "This is a prioritization tool, not just a status badge. Leads use the Priority Queue to identify where authoring and rubric calibration will have the highest immediate impact across schools.",
        ms: 14000,
      },
    ],
  },
  {
    id: "lms_ingestion",
    title: "LMS Content Ingestion",
    screen: "LMS Ingestion",
    steps: [
      {
        id: "lms_text_course_material",
        href: "/pedlead/lms",
        target: "pedlead-lms-text",
        title: "Text course material ingestion from Canvas",
        caption:
          "Reads course pages and unit readings from Canvas LMS without modifying source files. Ingests symbiotic relationships into proposed skill nodes and diagnostic misconceptions with traceable provenance.",
        ms: 14000,
        stage: {
          selectedLmsItem: "lms_eco_doc_symbiosis",
          showLmsTextDemo: true,
        },
        demoCard: "lms_text",
      },
      {
        id: "lms_vision_diagram_ocr",
        href: "/pedlead/lms",
        target: "pedlead-lms-vision",
        title: "Diagram ingestion via Multimodal Vision AI",
        caption:
          "Real visual OCR on genuine diagram assets: parses trophic tiers, 10% thermodynamic efficiency rules, and Joules calculations into structured skill graphs and energy flow rubrics.",
        ms: 14000,
        stage: {
          selectedLmsItem: "lms_eco_img_trophic_pyramid",
          showLmsVisionDemo: true,
        },
        demoCard: "lms_vision",
      },
      {
        id: "lms_sparse_fallback_authoring",
        href: "/pedlead/lms",
        target: "pedlead-lms-sparse",
        title: "Sparse-content fallback to authoring studio",
        caption:
          "When an LMS course page has insufficient pedagogical substance, Escolent diagnoses the deficit and offers a seamless hand-off to plain-language authoring with the topic pre-filled.",
        ms: 14000,
        stage: {
          selectedLmsItem: "lms_eco_sparse_stub",
          showLmsSparseDemo: true,
        },
        demoCard: "lms_sparse",
      },
    ],
  },
];

export const TOUR_CHAPTER_COUNT = TOUR_CHAPTERS.length;

export interface PedleadTourPosition {
  step: PedleadTourStep;
  chapter: PedleadTourChapter;
  chapterNumber: number;
  stepNumber: number;
  stepCount: number;
}

const TOUR_POSITIONS: PedleadTourPosition[] = TOUR_CHAPTERS.flatMap(
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

export function tourPositionAt(index: number): PedleadTourPosition {
  const clamped = Math.min(Math.max(index, 0), TOUR_STEP_COUNT - 1);
  return TOUR_POSITIONS[clamped];
}

const NON_STATE_PARAMS = ["tour", "pitch", "demo", "seed", "autoplay"];

export function normalizePedleadTourHref(href: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  for (const key of NON_STATE_PARAMS) params.delete(key);
  const query2 = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return query2 ? `${path}?${query2}` : path;
}

const PEDLEAD_TOUR_MODE_KEY = "escolent:pedleadTourMode";

export function readPedleadTourMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PEDLEAD_TOUR_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writePedleadTourMode(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) sessionStorage.setItem(PEDLEAD_TOUR_MODE_KEY, "true");
    else sessionStorage.removeItem(PEDLEAD_TOUR_MODE_KEY);
  } catch {
    /* ignore */
  }
}
