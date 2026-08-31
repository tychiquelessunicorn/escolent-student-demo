"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LmsCourseItem } from "@/lib/pedlead-lms-store";
import { hapticTap } from "@/lib/haptics";
import { usePedleadTour } from "@/components/pedlead-tour-provider";

interface LmsIngestionPayload {
  isConnected: boolean;
  provider: string;
  instanceUrl: string;
  lastSyncAt: string | null;
  materials: LmsCourseItem[];
  disclaimer: {
    readOnly: string;
    zeroStudentData: string;
    traceability: string;
  };
}

interface IngestDraftResult {
  sparse?: boolean;
  reason?: string;
  suggestedTopic?: string;
  visualDescription?: string;
  ocrLabelsDetected?: string[];
  unitName?: string;
  subject?: string;
  description?: string;
  skills?: any[];
  misconceptions?: any[];
}

export function PedleadLmsIngestionScreen() {
  const router = useRouter();
  const { stage } = usePedleadTour();
  const [data, setData] = useState<LmsIngestionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeItem, setActiveItem] = useState<LmsCourseItem | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestDraftResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pedlead/lms");
      if (!res.ok) throw new Error("Failed to load LMS ingestion data");
      const json = (await res.json()) as LmsIngestionPayload;
      setData(json);
      if (json.materials.length > 0 && !activeItem) {
        setActiveItem(json.materials[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Could not read LMS connection status.");
    } finally {
      setLoading(false);
    }
  }, [activeItem]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Handle tour stage triggers (Req ?tour=1)
  useEffect(() => {
    if (!stage || !data) return;
    if (stage.selectedLmsItem) {
      const match = data.materials.find((m) => m.id === stage.selectedLmsItem);
      if (match) setActiveItem(match);
    }
    if (stage.showLmsTextDemo) {
      setIngestResult({
        sparse: false,
        unitName: "Community Symbiosis & Co-Evolutionary Niches",
        subject: "Life Science (Grade 7)",
        description: "Mutualism, commensalism, and parasitism interactions in ecological communities.",
        skills: [
          {
            id: "eco_symbiosis_classification",
            slug: "symbiosis-interaction-types",
            name: "Classifying Symbiotic Interactions (+/+, +/0, +/-)",
            description: "Differentiate mutualism, commensalism, and parasitism based on net fitness outcomes for both participating species.",
            evaluationStrategy: "exact_match",
          },
          {
            id: "eco_parasitism_vs_predation",
            slug: "parasitism-vs-predation-mechanics",
            name: "Parasitism vs Predation Dynamics",
            description: "Explain why parasites depend on sustained host survival rather than immediate lethality.",
            evaluationStrategy: "rubric",
          },
        ],
        misconceptions: [
          {
            id: "misc_parasite_predator_conflation",
            name: "Parasite-Predator Equivalence Fallacy",
            description: "Students assume any organism that causes harm is a predator that immediately kills its victim.",
            sampleIncorrectAnswer: "A tick is just a tiny predator that hunts deer to eat them until they die.",
          },
        ],
      });
    }
    if (stage.showLmsVisionDemo) {
      setIngestResult({
        visualDescription: "Recognized a 4-tier ecological trophic pyramid diagram depicting thermodynamic 10% transfer rules and 90% metabolic heat loss at each consumer tier.",
        ocrLabelsDetected: [
          "Tertiary Consumers · 10 J (0.1% Energy)",
          "Secondary Consumers · 100 J (1% Energy)",
          "Primary Consumers · 1,000 J (10% Energy)",
          "Primary Producers · 10,000 J",
          "Decomposers (Fungi, Bacteria)",
        ],
        unitName: "Trophic Pyramids & Thermodynamic Energy Loss",
        subject: "Life Science (Grade 7)",
        description: "Synthesized from Canvas LMS diagram asset: 10% transfer rule, biomass pyramid calculations, and decomposer recycling.",
        skills: [
          {
            id: "eco_pyramid_joules_calculation",
            slug: "trophic-joules-pyramid-math",
            name: "10% Energy Transfer Computation Across Tiers",
            description: "Calculate available Joules across successive producer, herbivore, carnivore, and apex predator tiers.",
            evaluationStrategy: "exact_match",
          },
          {
            id: "eco_heat_dissipation_rubric",
            slug: "metabolic-heat-loss-explanation",
            name: "Thermodynamic Heat Loss in Food Chains",
            description: "Explain why total biomass and energy decrease at higher trophic tiers due to metabolic heat dissipation.",
            evaluationStrategy: "rubric",
          },
        ],
        misconceptions: [
          {
            id: "misc_pyramid_energy_recycling",
            name: "Decomposer Energy Recycling Fallacy",
            description: "Belief that decomposers recycle energy back into producers in a closed loop, confusing matter conservation with one-way energy flow.",
            sampleIncorrectAnswer: "Decomposers turn all the energy back into sunlight and soil for grass in a circle.",
          },
        ],
      });
    }
    if (stage.showLmsSparseDemo) {
      setIngestResult({
        sparse: true,
        reason: "Course material is a short bulleted stub (<25 words) without sufficient learning outcomes or conceptual depth.",
        suggestedTopic: "Tundra & Desert Biome Climate Adaptations",
      });
    }
  }, [stage, data]);

  const handleIngest = async (item: LmsCourseItem) => {
    setIngesting(true);
    setIngestResult(null);
    setSaveStatus("idle");
    setError(null);

    try {
      if (item.sourceType === "diagram_image") {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "lms_ingest_vision",
            title: item.title,
            imagePath: item.imagePath,
          }),
        });
        if (!res.ok) throw new Error("Vision ingestion failed");
        const json = (await res.json()) as IngestDraftResult;
        setIngestResult(json);
      } else {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "lms_ingest_text",
            title: item.title,
            content: item.contentSnippet,
          }),
        });
        if (!res.ok) throw new Error("Text ingestion failed");
        const json = (await res.json()) as IngestDraftResult;
        setIngestResult(json);
      }
      hapticTap();
    } catch (err) {
      console.error(err);
      setError("Failed to run automated curriculum ingestion.");
    } finally {
      setIngesting(false);
    }
  };

  const handleSaveToAuthoringStudio = async () => {
    if (!ingestResult || !activeItem || ingestResult.sparse) return;
    setSaveStatus("saving");

    try {
      const unitId = `unit_ingested_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const newUnit = {
        id: unitId,
        name: ingestResult.unitName || activeItem.title,
        subject: ingestResult.subject || "Life Science (Grade 7)",
        description: ingestResult.description || activeItem.summary,
        status: "draft",
        tenantOrigin: "teneo",
        sourceLocationRef: activeItem.sourceLocationRef,
        sourceUrl: activeItem.sourceUrl,
        createdAt: now,
        updatedAt: now,
        validatedAt: null,
        validatorId: null,
        rejectionFeedback: null,
        skills: (ingestResult.skills || []).map((s, idx) => ({
          id: s.id || `skill_${idx}_${Date.now().toString(36)}`,
          slug: s.slug || `skill-node-${idx}`,
          name: s.name,
          subject: ingestResult.subject || "Life Science (Grade 7)",
          unitId,
          unitName: ingestResult.unitName || activeItem.title,
          description: s.description || "",
          evaluationStrategy: s.evaluationStrategy || "exact_match",
          exactMatchSpec: s.exactMatchSpec,
          rubric: s.rubric,
          prerequisiteSkillIds: s.prerequisiteSkillIds || [],
          difficulty: s.difficulty || 2,
          status: "draft",
          tenantOrigin: "teneo",
          sourceLocationRef: activeItem.sourceLocationRef,
          sourceUrl: activeItem.sourceUrl,
          createdAt: now,
          updatedAt: now,
        })),
        misconceptions: (ingestResult.misconceptions || []).map((m, idx) => ({
          id: m.id || `misc_${idx}_${Date.now().toString(36)}`,
          name: m.name,
          unitId,
          targetSkillIds: m.targetSkillIds || [],
          description: m.description || "",
          sampleIncorrectAnswer: m.sampleIncorrectAnswer || "",
          remediationGuidance: m.remediationGuidance || "",
          status: "draft",
          tenantOrigin: "teneo",
          createdAt: now,
          updatedAt: now,
        })),
      };

      const res = await fetch("/api/pedlead/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit: newUnit }),
      });

      if (!res.ok) throw new Error("Failed to save ingested unit");
      setSaveStatus("saved");
      hapticTap();

      // Navigate to Authoring studio
      setTimeout(() => {
        router.push(`/pedlead/authoring?unitId=${unitId}`);
      }, 800);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  return (
    <div className="esc-screen esc-staff-screen" style={{ maxWidth: 1140, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "3px 9px",
              borderRadius: "var(--radius-staff-control)",
              background: "var(--color-staff-interactive-subtle)",
              color: "var(--color-staff-interactive)",
              border: "1px solid var(--color-staff-interactive-border)",
            }}
          >
            Requirement 33 · LMS Ingestion
          </span>
          <span style={{ fontSize: 12, color: "var(--color-staff-content-muted)" }}>
            Institutional Course Material Parsing
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--color-staff-content-primary)",
            margin: "0 0 6px 0",
          }}
        >
          LMS Content Ingestion
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--color-staff-content-secondary)",
            margin: 0,
            maxWidth: 840,
          }}
        >
          Read-only ingestion of validated curriculum course pages and educational diagram assets from the school's
          Canvas LMS. Synthesizes draft skill graphs and diagnostic misconception taxonomies with immutable provenance
          references back to source modules (Requirements 33.1–33.5).
        </p>
      </div>

      {/* Read-Only LMS Connection Cross-Reference Banner (Req 33 Admin carve-out) */}
      <div
        style={{
          background: "var(--color-staff-surface-raised)",
          border: "1.5px solid var(--color-staff-border)",
          borderRadius: "var(--radius-staff-control)",
          padding: "16px 20px",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "var(--color-staff-surface-sunken)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            📚
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-staff-content-primary)" }}>
                Canvas LMS Connection:{" "}
                <span style={{ color: data?.isConnected ? "oklch(40% 0.16 145)" : "oklch(45% 0.18 25)" }}>
                  {data?.isConnected ? "Authorized & Active" : "Not Configured"}
                </span>
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: "var(--color-staff-surface-sunken)",
                  color: "var(--color-staff-content-muted)",
                }}
              >
                Read-Only Material Access
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-staff-content-secondary)", marginTop: 2 }}>
              Instance: <code style={{ fontSize: 11.5 }}>{data?.instanceUrl}</code> · Course:{" "}
              <strong>Grade 7 Life Science (BIO-701)</strong>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--color-staff-content-muted)", textAlign: "right" }}>
          <div>Admin owns credential & developer key management (Req 15b).</div>
          <div>Pedagogical Lead has content ingestion authority only (Req 21.5).</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-staff-content-muted)" }}>
          Connecting to Canvas LMS course repository…
        </div>
      ) : error ? (
        <div
          style={{
            padding: 20,
            borderRadius: "var(--radius-staff-control)",
            background: "oklch(94% 0.04 25)",
            color: "oklch(40% 0.15 25)",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      ) : data ? (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>
          {/* Left Column: Course Material Sources List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-staff-content-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Available LMS Course Materials
            </div>

            {data.materials.map((item) => {
              const isSelected = activeItem?.id === item.id;
              const dataTour =
                item.id === "lms_eco_doc_symbiosis"
                  ? "pedlead-lms-text"
                  : item.id === "lms_eco_img_trophic_pyramid"
                    ? "pedlead-lms-vision"
                    : item.id === "lms_eco_sparse_stub"
                      ? "pedlead-lms-sparse"
                      : undefined;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-tour={dataTour}
                  onClick={() => {
                    setActiveItem(item);
                    setIngestResult(null);
                    setSaveStatus("idle");
                    hapticTap();
                  }}
                  className="esc-pressable"
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: "var(--radius-staff-control)",
                    background: isSelected
                      ? "var(--color-staff-interactive-subtle)"
                      : "var(--color-staff-surface-raised)",
                    border: isSelected
                      ? "1.5px solid var(--color-staff-interactive-border)"
                      : "1.5px solid var(--color-staff-border)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: 3,
                        background:
                          item.sourceType === "diagram_image"
                            ? "oklch(92% 0.08 264)"
                            : item.sourceType === "sparse_stub"
                              ? "oklch(92% 0.06 80)"
                              : "var(--color-staff-surface-sunken)",
                        color:
                          item.sourceType === "diagram_image"
                            ? "var(--color-staff-interactive)"
                            : item.sourceType === "sparse_stub"
                              ? "oklch(45% 0.15 80)"
                              : "var(--color-staff-content-secondary)",
                      }}
                    >
                      {item.sourceType === "diagram_image"
                        ? "Image (Vision OCR)"
                        : item.sourceType === "sparse_stub"
                          ? "Sparse Stub (33.5)"
                          : "Course Text (33.1)"}
                    </span>

                    <span style={{ fontSize: 11, color: "var(--color-staff-content-muted)" }}>{item.moduleName.split(":")[0]}</span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-staff-content-primary)" }}>
                    {item.title}
                  </div>

                  <div style={{ fontSize: 11.5, color: "var(--color-staff-content-secondary)", lineHeight: 1.35 }}>
                    {item.summary}
                  </div>

                  <div style={{ fontSize: 10.5, color: "var(--color-staff-content-muted)", fontFamily: "monospace", marginTop: 2 }}>
                    📍 {item.sourceLocationRef}
                  </div>
                </button>
              );
            })}

            {/* Read-only / Immutable Note (Req 33.4) */}
            <div
              style={{
                padding: "12px 14px",
                background: "var(--color-staff-surface-sunken)",
                borderRadius: "var(--radius-staff-control)",
                fontSize: 11.5,
                color: "var(--color-staff-content-muted)",
                lineHeight: 1.4,
              }}
            >
              🔒 <strong>Non-Destructive Guarantee (Req 33.4)</strong>: Ingestion produces new editable proposals in Escolent.
              Original Canvas course files and HTML pages are never altered or deleted.
            </div>
          </div>

          {/* Right Column: Source Inspection & Ingestion Workspace */}
          {activeItem && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Selected Source Overview Card */}
              <div
                style={{
                  background: "var(--color-staff-surface-raised)",
                  border: "1.5px solid var(--color-staff-border)",
                  borderRadius: "var(--radius-staff-control)",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--color-staff-content-muted)", fontWeight: 600 }}>
                      {activeItem.courseName} · {activeItem.moduleName}
                    </div>
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 800,
                        color: "var(--color-staff-content-primary)",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {activeItem.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    disabled={ingesting}
                    onClick={() => handleIngest(activeItem)}
                    className="esc-staff-btn esc-staff-btn-primary"
                    style={{
                      fontSize: 13,
                      padding: "8px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {ingesting ? (
                      <>
                        <span className="esc-spinner" aria-hidden />
                        {activeItem.sourceType === "diagram_image"
                          ? "Running Vision OCR…"
                          : "Ingesting Course Material…"}
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        {activeItem.sourceType === "diagram_image"
                          ? "Ingest via Vision AI (33.2)"
                          : "Ingest into Skill Graph (33.1)"}
                      </>
                    )}
                  </button>
                </div>

                {/* Provenance reference tag (Req 33.3) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11.5,
                    padding: "6px 12px",
                    borderRadius: 4,
                    background: "var(--color-staff-surface-sunken)",
                    color: "var(--color-staff-content-secondary)",
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--color-staff-content-primary)" }}>Source Provenance:</span>
                  <span style={{ fontFamily: "monospace" }}>{activeItem.sourceLocationRef}</span>
                </div>

                {/* Source Preview: Image or Text */}
                {activeItem.sourceType === "diagram_image" && activeItem.imagePath ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-staff-content-muted)" }}>
                      Source Diagram Asset Preview (Real PNG):
                    </div>
                    <div
                      style={{
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid var(--color-staff-border)",
                        background: "#f8fafc",
                        position: "relative",
                        maxHeight: 340,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Image
                        src={activeItem.imagePath}
                        alt={activeItem.title}
                        width={800}
                        height={600}
                        style={{ width: "100%", height: "auto", maxHeight: 340, objectFit: "contain" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-staff-content-muted)" }}>
                      LMS Course Material Text Snippet:
                    </div>
                    <pre
                      style={{
                        padding: 14,
                        borderRadius: 6,
                        background: "var(--color-staff-surface-sunken)",
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: "var(--color-staff-content-primary)",
                        fontFamily: "var(--font-mono, monospace)",
                        whiteSpace: "pre-wrap",
                        maxHeight: 220,
                        overflowY: "auto",
                        margin: 0,
                      }}
                    >
                      {activeItem.contentSnippet}
                    </pre>
                  </div>
                )}
              </div>

              {/* Ingest Result Area */}
              {ingestResult && (
                <div
                  style={{
                    background: "var(--color-staff-surface-raised)",
                    border: "1.5px solid var(--color-staff-interactive-border)",
                    borderRadius: "var(--radius-staff-control)",
                    padding: "20px",
                  }}
                >
                  {/* CASE 1: Sparse Content Fallback (Req 33.5) */}
                  {ingestResult.sparse ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: "oklch(93% 0.06 80)",
                            color: "oklch(45% 0.15 80)",
                            border: "1px solid oklch(85% 0.08 80)",
                          }}
                        >
                          Requirement 33.5 · Sparse-Content Fallback Triggered
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "oklch(45% 0.15 80)" }}>
                          Insufficient Course Depth Detected
                        </span>
                      </div>

                      <div style={{ fontSize: 13.5, color: "var(--color-staff-content-primary)", lineHeight: 1.5 }}>
                        This Canvas page does not contain enough conceptual depth or explicit learning objectives to
                        automatically construct a multi-node skill graph.
                      </div>

                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 6,
                          background: "var(--color-staff-surface-sunken)",
                          fontSize: 12.5,
                          color: "var(--color-staff-content-secondary)",
                        }}
                      >
                        <strong>Diagnostic Reason:</strong> {ingestResult.reason}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 16px",
                          borderRadius: "var(--radius-staff-control)",
                          background: "var(--color-staff-interactive-subtle)",
                          border: "1px solid var(--color-staff-interactive-border)",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-staff-content-primary)" }}>
                            Seamless Hand-off to Authoring Studio (Req 31.4)
                          </div>
                          <div style={{ fontSize: 12, color: "var(--color-staff-content-secondary)", marginTop: 2 }}>
                            Switch to plain-language unit drafting seeded with topic: &ldquo;{ingestResult.suggestedTopic}&rdquo;
                          </div>
                        </div>

                        <Link
                          href={`/pedlead/authoring?seedPrompt=${encodeURIComponent(
                            `Create a comprehensive Grade 7 Life Science unit on ${ingestResult.suggestedTopic}, including biome adaptations, food webs, and common misconceptions.`,
                          )}`}
                          className="esc-staff-btn esc-staff-btn-primary"
                          style={{ textDecoration: "none", fontSize: 12.5, padding: "7px 14px", whiteSpace: "nowrap" }}
                        >
                          Launch Plain-Language Studio →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    /* CASE 2: Substantive Ingested Unit (Req 33.1 / 33.2) */
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Top success bar */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "3px 8px",
                              borderRadius: 4,
                              background: "oklch(93% 0.05 145)",
                              color: "oklch(40% 0.15 145)",
                              border: "1px solid oklch(85% 0.08 145)",
                            }}
                          >
                            {activeItem.sourceType === "diagram_image"
                              ? "OCR & Visual Ingestion Complete"
                              : "Text Parsing Complete"}
                          </span>
                          <h3
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color: "var(--color-staff-content-primary)",
                              margin: "6px 0 0 0",
                            }}
                          >
                            Draft Proposal: {ingestResult.unitName}
                          </h3>
                        </div>

                        <button
                          type="button"
                          disabled={saveStatus === "saving" || saveStatus === "saved"}
                          onClick={handleSaveToAuthoringStudio}
                          className="esc-staff-btn esc-staff-btn-primary"
                          style={{ fontSize: 13, padding: "8px 16px" }}
                        >
                          {saveStatus === "saving" ? (
                            "Adding to Studio…"
                          ) : saveStatus === "saved" ? (
                            "Saved! Redirecting…"
                          ) : (
                            "Accept & Open in Studio →"
                          )}
                        </button>
                      </div>

                      {/* Vision OCR details if image */}
                      {ingestResult.visualDescription && (
                        <div
                          style={{
                            padding: "12px 14px",
                            borderRadius: 6,
                            background: "var(--color-staff-surface-sunken)",
                            fontSize: 12,
                            lineHeight: 1.45,
                            color: "var(--color-staff-content-secondary)",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "var(--color-staff-content-primary)", marginBottom: 4 }}>
                            Vision AI Recognized Structure:
                          </div>
                          <div>{ingestResult.visualDescription}</div>
                          {ingestResult.ocrLabelsDetected && ingestResult.ocrLabelsDetected.length > 0 && (
                            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {ingestResult.ocrLabelsDetected.map((label, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: 10.5,
                                    padding: "2px 6px",
                                    borderRadius: 3,
                                    background: "var(--color-staff-surface-raised)",
                                    border: "1px solid var(--color-staff-border-subtle)",
                                  }}
                                >
                                  🏷️ {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Draft Skills List */}
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-staff-content-muted)", marginBottom: 8 }}>
                          Extracted Skill Graph Nodes ({(ingestResult.skills || []).length}):
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {(ingestResult.skills || []).map((skill, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: "12px 14px",
                                borderRadius: 6,
                                background: "var(--color-staff-surface-sunken)",
                                border: "1px solid var(--color-staff-border)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-staff-content-primary)" }}>
                                  {skill.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    padding: "1px 6px",
                                    borderRadius: 3,
                                    background: "var(--color-staff-surface-raised)",
                                    color: "var(--color-staff-content-muted)",
                                  }}
                                >
                                  {skill.evaluationStrategy === "rubric" ? "Rubric" : "Exact Match"}
                                </span>
                              </div>
                              <p style={{ fontSize: 12, color: "var(--color-staff-content-secondary)", margin: 0 }}>
                                {skill.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Draft Misconceptions List */}
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-staff-content-muted)", marginBottom: 8 }}>
                          Extracted Misconception Taxonomy ({(ingestResult.misconceptions || []).length}):
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {(ingestResult.misconceptions || []).map((misc, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: "12px 14px",
                                borderRadius: 6,
                                background: "var(--color-staff-surface-sunken)",
                                border: "1px solid var(--color-staff-border)",
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-staff-content-primary)", marginBottom: 4 }}>
                                ⚠️ {misc.name}
                              </div>
                              <p style={{ fontSize: 12, color: "var(--color-staff-content-secondary)", margin: "0 0 6px 0" }}>
                                {misc.description}
                              </p>
                              {misc.sampleIncorrectAnswer && (
                                <div style={{ fontSize: 11.5, color: "oklch(45% 0.15 80)", fontStyle: "italic" }}>
                                  Sample Student Error: &ldquo;{misc.sampleIncorrectAnswer}&rdquo;
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
