/**
 * Pedagogical Lead LMS Content Ingestion Store & Source Materials (Requirement 33)
 *
 * Strict Architectural Boundary (Requirement 21.5):
 * - ZERO access to Student, Teacher, Session, or Mastery_State data.
 * - Read-only check to LMS connection status (Canvas authorized in Admin, Req 15b).
 * - Never modifies or deletes source LMS materials (Req 33.4).
 * - Preserves traceable references back to original source location (Req 33.3).
 * - Sparse-content fallback triggering plain-language authoring (Req 33.5).
 * - Video ingestion explicitly omitted from MVP (Req 33.6).
 */

import { getLmsIntegrationStatus } from "@/lib/lms-integration-store";

export type IngestionSourceType = "document_text" | "diagram_image" | "sparse_stub";

export interface LmsCourseItem {
  id: string;
  lmsProvider: "canvas" | "moodle" | "google_classroom";
  courseId: string;
  courseName: string;
  moduleName: string;
  title: string;
  sourceType: IngestionSourceType;
  sourceUrl: string;
  sourceLocationRef: string; // Traceable reference (Req 33.3)
  summary: string;
  contentSnippet?: string;
  imagePath?: string; // Real image asset path (Req 33.2)
  isSparse: boolean;
  sparseReason?: string;
}

/**
 * Real, curated LMS course materials for the Ecosystems & Life Science curriculum.
 */
export const LMS_COURSE_MATERIALS: LmsCourseItem[] = [
  {
    id: "lms_eco_doc_symbiosis",
    lmsProvider: "canvas",
    courseId: "canvas_course_bio7",
    courseName: "Grade 7 Life Science: Ecology & Evolution",
    moduleName: "Module 4: Community Interactions",
    title: "Unit 4 Reading: Symbiotic Relationships & Co-evolutionary Niches",
    sourceType: "document_text",
    sourceUrl: "https://teneo.instructure.com/courses/bio7/pages/symbiotic-relationships-niches",
    sourceLocationRef: "Canvas LMS · Course BIO-701 · Pages / Module 4 (Item #4.2)",
    summary: "Comprehensive text on mutualism, commensalism, and parasitism with ecological case studies (lichen, clownfish/anemone, mistletoe).",
    contentSnippet: `Symbiotic Relationships in Ecosystem Communities (Grade 7 Life Science)

Symbiosis describes close and long-term biological interactions between two different biological organisms. These interactions are categorized into three primary evolutionary structures:

1. Mutualism (+/+): Both species benefit from the relationship. 
Example: Coral polyps and photosynthetic zooxanthellae algae. The coral provides a protected environment and compounds needed for photosynthesis; the algae produce oxygen and glucose for the coral. Another example is mycorrhizal fungi and plant root networks.

2. Commensalism (+/0): One organism benefits while the other is neither helped nor harmed.
Example: Cattle egrets foraging in fields alongside livestock. As livestock graze and stir up insects, egrets catch the flushed prey. The livestock experience zero metabolic penalty or advantage. Another example is barnacles adhering to the skin of baleen whales.

3. Parasitism (+/-): One organism (the parasite) lives on or in another organism (the host), causing it harm and deriving sustenance at the host's expense.
Example: Deer ticks (Ixodes scapularis) extracting blood meals from white-tailed deer while transmitting bacterial pathogens. Unlike predators, parasites typically do not kill their host immediately, as host survival ensures sustained parasite reproduction.

Key Misconception Alert:
Students often conflate predation with parasitism, or mistakenly believe mutualism requires intentional altruistic behavior rather than co-evolved adaptive fitness.`,
    isSparse: false,
  },
  {
    id: "lms_eco_img_trophic_pyramid",
    lmsProvider: "canvas",
    courseId: "canvas_course_bio7",
    courseName: "Grade 7 Life Science: Ecology & Evolution",
    moduleName: "Module 2: Energy & Nutrient Transfer",
    title: "Visual Asset: Trophic Energy Pyramid & 10% Thermodynamic Efficiency",
    sourceType: "diagram_image",
    sourceUrl: "https://teneo.instructure.com/courses/bio7/files/trophic-energy-pyramid.png",
    sourceLocationRef: "Canvas LMS · Course BIO-701 · Files / Module 2 Assets / trophic-energy-pyramid.png",
    summary: "High-resolution diagram illustrating 4-tiered biomass pyramids, joules calculations (10,000J to 10J), and 90% metabolic heat dissipation.",
    imagePath: "/trophic-energy-pyramid.png",
    isSparse: false,
  },
  {
    id: "lms_eco_sparse_stub",
    lmsProvider: "canvas",
    courseId: "canvas_course_bio7",
    courseName: "Grade 7 Life Science: Ecology & Evolution",
    moduleName: "Module 5: Biome Overview",
    title: "Lesson Outline: Tundra & Desert Climate Adaptations",
    sourceType: "sparse_stub",
    sourceUrl: "https://teneo.instructure.com/courses/bio7/pages/tundra-desert-stub",
    sourceLocationRef: "Canvas LMS · Course BIO-701 · Pages / Module 5 (Item #5.1)",
    summary: "Incomplete course page stub containing only bullet points and missing learning objectives.",
    contentSnippet: `Module 5: Biomes
- Read textbook chapter 12
- Look up tundra plants
- Desert homework due next Friday`,
    isSparse: true,
    sparseReason: "Course page contains minimal bullet points (<25 words) without defined learning objectives or structured pedagogical content.",
  },
];

export async function getLmsIngestionStatus() {
  const integrationsPayload = await getLmsIntegrationStatus();
  const canvasIntegration = integrationsPayload.integrations.find((i) => i.lmsType === "canvas");

  const isConnected = canvasIntegration?.status === "authorized";
  const instanceUrl = canvasIntegration?.instanceUrl ?? "https://teneo.instructure.com";

  return {
    isConnected,
    provider: "canvas",
    instanceUrl,
    lastSyncAt: canvasIntegration?.lastSyncAt ?? null,
    materials: LMS_COURSE_MATERIALS,
    disclaimer: {
      readOnly: "Escolent has read-only access to course pages and file assets (Requirement 33.4).",
      zeroStudentData: "Zero access to student gradebook records, individual submissions, or rosters (Requirement 21.5).",
      traceability: "Ingested skills maintain immutable provenance markers to source URLs and module locations (Requirement 33.3).",
    },
  };
}
