"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useIsEmbed } from "@/lib/use-is-embed";
import { hapticTap } from "@/lib/haptics";
import { usePedleadTour } from "@/components/pedlead-tour-provider";
import { EscolentLoader } from "@/components/escolent-logo";
import type {
  AuthoringMisconception,
  AuthoringSkill,
  AuthoringUnit,
  ContentStatus,
  EvaluationStrategy,
} from "@/lib/pedlead-content-store";
import type { RecordViewer } from "@/lib/shared-record-views";

const EXAMPLE_PROMPTS = [
  {
    label: "Grade 7 Ecosystems & Food Webs",
    prompt:
      "Grade 7 Unit on Ecosystems and Food Webs: producers, primary/secondary consumers, decomposers, the 10% energy transfer rule, food web keystone species, and top-down trophic cascades.",
  },
  {
    label: "Grade 8 Wave Optics & Interference",
    prompt:
      "Grade 8 Unit on Wave Properties & Optics: transverse vs longitudinal waves, frequency, wavelength, amplitude, constructive/destructive interference, and Snell's Law refraction.",
  },
  {
    label: "Grade 7 Cellular Respiration & ATP",
    prompt:
      "Grade 7 Unit on Cellular Respiration: glycolysis, mitochondria ATP production, aerobic vs anaerobic fermentation, and comparing reactant/product conservation with photosynthesis.",
  },
];

export function PedleadContentAuthoringScreen() {
  const isEmbed = useIsEmbed();
  const searchParams = useSearchParams();
  const { stage } = usePedleadTour();

  const [units, setUnits] = useState<AuthoringUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // AI draft state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Viewers / Concurrency (Req 31.8c)
  const [viewers, setViewers] = useState<RecordViewer[]>([]);

  // Modals / Dialogs
  const [editingSkill, setEditingSkill] = useState<AuthoringSkill | null>(null);
  const [isNewSkill, setIsNewSkill] = useState(false);
  const [editingMisconception, setEditingMisconception] = useState<AuthoringMisconception | null>(null);
  const [isNewMisconception, setIsNewMisconception] = useState(false);

  const [splitTargetSkill, setSplitTargetSkill] = useState<AuthoringSkill | null>(null);
  const [splitA, setSplitA] = useState({ name: "", description: "", strategy: "exact_match" as EvaluationStrategy });
  const [splitB, setSplitB] = useState({ name: "", description: "", strategy: "rubric" as EvaluationStrategy });

  const [mergeTargetA, setMergeTargetA] = useState<string>("");
  const [mergeTargetB, setMergeTargetB] = useState<string>("");
  const [mergedSkillData, setMergedSkillData] = useState({
    name: "",
    description: "",
    strategy: "rubric" as EvaluationStrategy,
  });
  const [showMergeModal, setShowMergeModal] = useState(false);

  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [expandedRubricId, setExpandedRubricId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeUnit = units.find((u) => u.id === selectedUnitId) ?? units[0] ?? null;

  // Fetch all units
  const refreshUnits = useCallback(async (preferredUnitId?: string) => {
    try {
      const res = await fetch("/api/pedlead/content");
      if (!res.ok) throw new Error("Failed to load content units");
      const data = (await res.json()) as { units: AuthoringUnit[] };
      setUnits(data.units);
      if (data.units.length > 0) {
        const queryUnitId = searchParams.get("unitId");
        const targetId = preferredUnitId || queryUnitId;
        if (targetId && data.units.some((u) => u.id === targetId)) {
          setSelectedUnitId(targetId);
        } else if (!selectedUnitId || !data.units.some((u) => u.id === selectedUnitId)) {
          setSelectedUnitId(data.units[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedUnitId, searchParams]);

  useEffect(() => {
    void refreshUnits();
  }, [refreshUnits]);

  // Handle tour stage triggers (Req ?tour=1)
  useEffect(() => {
    if (!stage) return;
    if (stage.draftPromptText) {
      setAiPrompt(stage.draftPromptText);
    }
    if (stage.openRejectModalDemo) {
      setRejectFeedback("Please attach a 4-level rubric task with model exemplar to the Nutrient Cycling skill before resubmission.");
      setShowRejectModal(true);
      setEditingSkill(null);
    }
    if (stage.openSkillEditDemo && activeUnit && activeUnit.skills.length > 0) {
      setShowRejectModal(false);
      setEditingSkill(JSON.parse(JSON.stringify(activeUnit.skills[0])));
      setIsNewSkill(false);
    }
    if (stage.showLiveEditDemo) {
      setShowRejectModal(false);
      setEditingSkill(null);
    }
  }, [stage, activeUnit]);

  // Handle deep-link query params (editSkill, addMiscForSkill)
  useEffect(() => {
    if (!activeUnit) return;
    const editSkillId = searchParams.get("editSkill");
    if (editSkillId) {
      const skillToEdit = activeUnit.skills.find((s) => s.id === editSkillId);
      if (skillToEdit) {
        setEditingSkill(JSON.parse(JSON.stringify(skillToEdit)));
        setIsNewSkill(false);
      }
    }

    const addMiscForSkill = searchParams.get("addMiscForSkill");
    if (addMiscForSkill) {
      setIsNewMisconception(true);
      setEditingMisconception({
        id: `misc_${Date.now().toString(36)}`,
        name: "",
        unitId: activeUnit.id,
        targetSkillIds: [addMiscForSkill],
        description: "",
        sampleIncorrectAnswer: "",
        remediationGuidance: "",
        status: activeUnit.status === "validated" ? "draft" : activeUnit.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [searchParams, activeUnit?.id]);

  // Track record view (Req 31.8c) & fetch viewers
  useEffect(() => {
    if (!activeUnit) return;
    const unitId = activeUnit.id;

    const recordSelf = async () => {
      try {
        await fetch("/api/pedlead/content/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitId }),
        });
        const res = await fetch(`/api/pedlead/content/view?unitId=${encodeURIComponent(unitId)}`);
        if (res.ok) {
          const data = (await res.json()) as { viewers: RecordViewer[] };
          setViewers(data.viewers);
        }
      } catch (err) {
        console.error(err);
      }
    };

    void recordSelf();
    const interval = setInterval(() => void recordSelf(), 12000);
    return () => clearInterval(interval);
  }, [activeUnit?.id]);

  // Simulate peer lead for demo
  const handleSimulatePeerLead = async () => {
    if (!activeUnit) return;
    hapticTap();
    try {
      const res = await fetch("/api/pedlead/content/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: activeUnit.id, simulatePeer: true }),
      });
      if (res.ok) {
        const data = (await res.json()) as { viewers: RecordViewer[] };
        setViewers(data.viewers);
        setStatusMessage("Simulated another Pedagogical Lead viewing this unit.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate AI Draft
  const handleGenerateAiDraft = async (promptOverride?: string) => {
    const textToUse = (promptOverride ?? aiPrompt).trim();
    if (!textToUse) return;
    hapticTap();
    setIsGeneratingAi(true);
    setAiError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "content_authoring_draft",
          description: textToUse,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || "Failed to generate curriculum draft");
      }

      const data = (await res.json()) as { draft: Record<string, unknown> };
      const draft = data.draft;
      const newUnitId = `unit_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const skillsRaw = Array.isArray(draft.skills) ? draft.skills : [];
      const miscsRaw = Array.isArray(draft.misconceptions) ? draft.misconceptions : [];

      const parsedSkills: AuthoringSkill[] = skillsRaw.map((s: any, idx: number) => ({
        id: s.id || `skill_${newUnitId}_${idx}`,
        slug: s.slug || `skill-${idx}`,
        name: s.name || `Skill ${idx + 1}`,
        subject: (draft.subject as string) || "Life Science (Grade 7)",
        unitId: newUnitId,
        unitName: (draft.unitName as string) || "New Unit",
        description: s.description || "",
        evaluationStrategy: s.evaluationStrategy === "rubric" ? "rubric" : "exact_match",
        difficulty: typeof s.difficulty === "number" ? Math.min(5, Math.max(1, s.difficulty)) : 3,
        prerequisiteSkillIds: Array.isArray(s.prerequisiteSkillIds) ? s.prerequisiteSkillIds : [],
        exactMatchSpec: s.exactMatchSpec || {
          canonicalAnswers: [s.name || "Sample Answer"],
          acceptedVariations: [],
        },
        rubric: s.rubric || (s.evaluationStrategy === "rubric" ? {
          title: `${s.name} Rubric`,
          prompt: `Explain the core mechanism for ${s.name}.`,
          sampleExemplar: "Complete scientific reasoning demonstrating both cause and systemic consequence.",
          levels: [
            { score: 3, label: "Proficient (3 pts)", description: "Complete and accurate multi-step explanation." },
            { score: 2, label: "Approaching (2 pts)", description: "Partially complete with minor conceptual gaps." },
            { score: 1, label: "Developing (1 pt)", description: "Identifies isolated facts without clear mechanism." },
            { score: 0, label: "Incorrect (0 pts)", description: "Contains core misconceptions or off-target claims." },
          ],
        } : undefined),
        status: "draft",
        createdAt: now,
        updatedAt: now,
      }));

      const parsedMiscs: AuthoringMisconception[] = miscsRaw.map((m: any, idx: number) => ({
        id: m.id || `misc_${newUnitId}_${idx}`,
        name: m.name || `Misconception ${idx + 1}`,
        unitId: newUnitId,
        targetSkillIds: Array.isArray(m.targetSkillIds) && m.targetSkillIds.length > 0
          ? m.targetSkillIds
          : [parsedSkills[0]?.id || ""],
        description: m.description || "",
        sampleIncorrectAnswer: m.sampleIncorrectAnswer || "Common erroneous student response",
        remediationGuidance: m.remediationGuidance || "Guidance for targeted teacher intervention or prompt hint.",
        status: "draft",
        createdAt: now,
        updatedAt: now,
      }));

      const newUnit: AuthoringUnit = {
        id: newUnitId,
        name: (draft.unitName as string) || "New Draft Unit",
        subject: (draft.subject as string) || "Life Science (Grade 7)",
        description: (draft.description as string) || textToUse,
        status: "draft",
        rejectionFeedback: null,
        skills: parsedSkills,
        misconceptions: parsedMiscs,
        createdAt: now,
        updatedAt: now,
      };

      // Save to store
      const saveRes = await fetch("/api/pedlead/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit: newUnit }),
      });

      if (!saveRes.ok) throw new Error("Failed to save drafted unit");
      const savedData = (await saveRes.json()) as { unit: AuthoringUnit };

      setAiPrompt("");
      await refreshUnits(savedData.unit.id);
      setStatusMessage("AI generated draft unit. Review and edit skills below before submitting for approval.");
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Error generating draft");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Lifecycle: Submit for Review (draft -> pending_approval)
  const handleSubmitForReview = async () => {
    if (!activeUnit) return;
    hapticTap();
    try {
      const res = await fetch("/api/pedlead/content/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: activeUnit.id }),
      });
      if (!res.ok) throw new Error("Failed to submit unit for review");
      const data = (await res.json()) as { unit: AuthoringUnit };
      await refreshUnits(data.unit.id);
      setStatusMessage("Unit submitted for review (status: Pending Approval). Content is locked from student serving until validation.");
    } catch (err) {
      console.error(err);
    }
  };

  // Lifecycle: Approve (pending_approval -> validated)
  const handleApprove = async () => {
    if (!activeUnit) return;
    hapticTap();
    try {
      const res = await fetch("/api/pedlead/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: activeUnit.id }),
      });
      if (!res.ok) throw new Error("Failed to approve unit");
      const data = (await res.json()) as { unit: AuthoringUnit };
      await refreshUnits(data.unit.id);
      setStatusMessage("Unit and associated Skill Graph validated! Content is now live and available for Space creation across schools.");
    } catch (err) {
      console.error(err);
    }
  };

  // Lifecycle: Reject with Feedback (Req 31.8a)
  const handleRejectWithFeedback = async () => {
    if (!activeUnit) return;
    hapticTap();
    const feedback = rejectFeedback.trim() || "The rubric criteria need clearer level descriptions before validation.";
    try {
      const res = await fetch("/api/pedlead/content/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: activeUnit.id, feedback }),
      });
      if (!res.ok) throw new Error("Failed to reject unit");
      const data = (await res.json()) as { unit: AuthoringUnit };
      setShowRejectModal(false);
      setRejectFeedback("");
      await refreshUnits(data.unit.id);
      setStatusMessage("Unit returned to Draft status with specific feedback for revision.");
    } catch (err) {
      console.error(err);
    }
  };

  // Live Staged Edit Application (Req 31.8b)
  const handleApplyLiveEdit = async (skillId?: string, misconceptionId?: string) => {
    if (!activeUnit) return;
    hapticTap();
    try {
      const res = await fetch("/api/pedlead/content/apply-live-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: activeUnit.id,
          skillId,
          misconceptionId,
          action: "apply",
        }),
      });
      if (!res.ok) throw new Error("Failed to commit live edit");
      const data = (await res.json()) as { unit: AuthoringUnit };
      await refreshUnits(data.unit.id);
      setStatusMessage("Live edit confirmed and published atomically to validated curriculum.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscardLiveEdit = async (skillId?: string, misconceptionId?: string) => {
    if (!activeUnit) return;
    hapticTap();
    try {
      const res = await fetch("/api/pedlead/content/apply-live-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: activeUnit.id,
          skillId,
          misconceptionId,
          action: "discard",
        }),
      });
      if (!res.ok) throw new Error("Failed to discard live edit");
      const data = (await res.json()) as { unit: AuthoringUnit };
      await refreshUnits(data.unit.id);
      setStatusMessage("Staged live edits discarded.");
    } catch (err) {
      console.error(err);
    }
  };

  // Skill CRUD / Edit
  const handleSaveSkill = async () => {
    if (!activeUnit || !editingSkill) return;
    hapticTap();
    try {
      const action = isNewSkill ? "add" : "update";
      const res = await fetch("/api/pedlead/content/skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          unitId: activeUnit.id,
          skillId: editingSkill.id,
          skill: editingSkill,
          stageAsPendingEditIfValidated: activeUnit.status === "validated" || editingSkill.status === "validated",
        }),
      });
      if (!res.ok) throw new Error("Failed to save skill");
      const data = (await res.json()) as { unit: AuthoringUnit };
      setEditingSkill(null);
      setIsNewSkill(false);
      await refreshUnits(data.unit.id);
      setStatusMessage(
        activeUnit.status === "validated" || editingSkill.status === "validated"
          ? "Changes staged as pending live edit (Req 31.8b). Confirm below to publish."
          : "Skill updated successfully."
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!activeUnit) return;
    if (!confirm("Are you sure you want to remove this skill from the graph?")) return;
    hapticTap();
    try {
      const res = await fetch("/api/pedlead/content/skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          unitId: activeUnit.id,
          skillId,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete skill");
      const data = (await res.json()) as { unit: AuthoringUnit };
      await refreshUnits(data.unit.id);
      setStatusMessage("Skill deleted.");
    } catch (err) {
      console.error(err);
    }
  };

  // Split Skill (Req 31.9)
  const handleSplitSkill = async () => {
    if (!activeUnit || !splitTargetSkill) return;
    if (!splitA.name.trim() || !splitB.name.trim()) return;
    hapticTap();

    try {
      const res = await fetch("/api/pedlead/content/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: activeUnit.id,
          skillId: splitTargetSkill.id,
          skillA: {
            slug: `${splitTargetSkill.slug}-a`,
            name: splitA.name,
            subject: activeUnit.subject,
            unitId: activeUnit.id,
            unitName: activeUnit.name,
            description: splitA.description || splitTargetSkill.description,
            evaluationStrategy: splitA.strategy,
            difficulty: Math.max(1, splitTargetSkill.difficulty - 1),
            prerequisiteSkillIds: splitTargetSkill.prerequisiteSkillIds,
            status: activeUnit.status === "validated" ? "draft" : activeUnit.status,
          },
          skillB: {
            slug: `${splitTargetSkill.slug}-b`,
            name: splitB.name,
            subject: activeUnit.subject,
            unitId: activeUnit.id,
            unitName: activeUnit.name,
            description: splitB.description || splitTargetSkill.description,
            evaluationStrategy: splitB.strategy,
            difficulty: splitTargetSkill.difficulty,
            prerequisiteSkillIds: [`${splitTargetSkill.id}_part1`],
            status: activeUnit.status === "validated" ? "draft" : activeUnit.status,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to split skill");
      const data = (await res.json()) as { unit: AuthoringUnit };
      setSplitTargetSkill(null);
      await refreshUnits(data.unit.id);
      setStatusMessage(`Skill "${splitTargetSkill.name}" split into two distinct learning targets.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Merge Skills (Req 31.9)
  const handleMergeSkills = async () => {
    if (!activeUnit || !mergeTargetA || !mergeTargetB || mergeTargetA === mergeTargetB) return;
    if (!mergedSkillData.name.trim()) return;
    hapticTap();

    try {
      const skillA = activeUnit.skills.find((s) => s.id === mergeTargetA);
      const skillB = activeUnit.skills.find((s) => s.id === mergeTargetB);
      if (!skillA || !skillB) return;

      const mergedPrereqs = Array.from(
        new Set([
          ...skillA.prerequisiteSkillIds.filter((id) => id !== mergeTargetB),
          ...skillB.prerequisiteSkillIds.filter((id) => id !== mergeTargetA),
        ])
      );

      const res = await fetch("/api/pedlead/content/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: activeUnit.id,
          skillIdA: mergeTargetA,
          skillIdB: mergeTargetB,
          mergedSkill: {
            slug: `${skillA.slug}-${skillB.slug}-synthesis`,
            name: mergedSkillData.name,
            subject: activeUnit.subject,
            unitId: activeUnit.id,
            unitName: activeUnit.name,
            description: mergedSkillData.description || `${skillA.description} combined with ${skillB.description}`,
            evaluationStrategy: mergedSkillData.strategy,
            difficulty: Math.max(skillA.difficulty, skillB.difficulty),
            prerequisiteSkillIds: mergedPrereqs,
            status: activeUnit.status === "validated" ? "draft" : activeUnit.status,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to merge skills");
      const data = (await res.json()) as { unit: AuthoringUnit };
      setShowMergeModal(false);
      setMergeTargetA("");
      setMergeTargetB("");
      setMergedSkillData({ name: "", description: "", strategy: "rubric" });
      await refreshUnits(data.unit.id);
      setStatusMessage("Selected skills merged into a unified learning outcome.");
    } catch (err) {
      console.error(err);
    }
  };

  // Misconception CRUD
  const handleSaveMisconception = async () => {
    if (!activeUnit || !editingMisconception) return;
    hapticTap();
    try {
      const action = isNewMisconception ? "add" : "update";
      const res = await fetch("/api/pedlead/content/misconception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          unitId: activeUnit.id,
          misconceptionId: editingMisconception.id,
          misconception: editingMisconception,
          stageAsPendingEditIfValidated: activeUnit.status === "validated" || editingMisconception.status === "validated",
        }),
      });
      if (!res.ok) throw new Error("Failed to save misconception");
      const data = (await res.json()) as { unit: AuthoringUnit };
      setEditingMisconception(null);
      setIsNewMisconception(false);
      await refreshUnits(data.unit.id);
      setStatusMessage(
        activeUnit.status === "validated" || editingMisconception.status === "validated"
          ? "Misconception staged as pending live edit. Confirm below to publish."
          : "Misconception saved."
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMisconception = async (misconceptionId: string) => {
    if (!activeUnit) return;
    if (!confirm("Delete this misconception taxonomy entry?")) return;
    hapticTap();
    try {
      const res = await fetch("/api/pedlead/content/misconception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          unitId: activeUnit.id,
          misconceptionId,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete misconception");
      const data = (await res.json()) as { unit: AuthoringUnit };
      await refreshUnits(data.unit.id);
      setStatusMessage("Misconception deleted.");
    } catch (err) {
      console.error(err);
    }
  };

  // Reset Demo State
  const handleReset = async () => {
    if (!confirm("Reset content store back to default seed state?")) return;
    hapticTap();
    try {
      const res = await fetch("/api/pedlead/content/reset", { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset store");
      await refreshUnits();
      setStatusMessage("Reset content store to default Grade 7 Life Science seed state.");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}>
        <EscolentLoader label="Loading curriculum authoring workspace…" size={24} />
      </div>
    );
  }

  const statusBadge = (status: ContentStatus) => {
    switch (status) {
      case "draft":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: "rgba(245, 158, 11, 0.12)",
              color: "#d97706",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d97706" }} />
            Draft
          </span>
        );
      case "pending_approval":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: "rgba(59, 130, 246, 0.12)",
              color: "#2563eb",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb" }} />
            Pending Approval
          </span>
        );
      case "validated":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#059669",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669" }} />
            Validated · Live
          </span>
        );
    }
  };

  return (
    <div className="esc-staff-foundation" style={{ maxWidth: 1160, margin: "0 auto", padding: "32px 24px 64px 24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-staff-accent)", marginBottom: 6 }}>
            Pedagogical Lead · Curriculum Studio
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-content-primary)", margin: 0 }}>
            Content Authoring & Skill Validation
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-content-secondary)", margin: "6px 0 0 0", maxWidth: 740, lineHeight: 1.5 }}>
            AI drafts, human validates. Author, split, merge, and calibrate Skill Graphs and Misconception Taxonomies.
            Strict cross-tenant content scope with zero access to student mastery records (Req 21.5).
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isEmbed && (
            <button
              type="button"
              onClick={handleReset}
              className="esc-staff-btn esc-staff-btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              title="Reset content to initial Grade 7 Science demo seed"
            >
              Reset Seed Content
            </button>
          )}
        </div>
      </div>

      {/* Notification banner */}
      {statusMessage && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: 8,
            fontSize: 13,
            color: "#065f46",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#065f46" }}
          >
            ×
          </button>
        </div>
      )}

      {/* Multi-lead Concurrency banner (Req 31.8c) */}
      {viewers.length > 0 && (
        <div
          style={{
            padding: "12px 18px",
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: 8,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#6366f1",
                display: "inline-block",
                boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)",
              }}
            />
            <div style={{ fontSize: 13, color: "var(--color-content-primary)" }}>
              <strong style={{ color: "#4f46e5" }}>{viewers.map((v) => v.displayName).join(", ")}</strong>{" "}
              {viewers.length > 1 ? "are" : "is"} currently reviewing this unit. Changes are persisted in real time.
            </div>
          </div>
          <span style={{ fontSize: 11, color: "var(--color-staff-muted)" }}>Req 31.8c Concurrency</span>
        </div>
      )}

      {/* Unit Selector tabs (if multiple units available) */}
      {units.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {units.map((u) => {
            const isSelected = u.id === activeUnit?.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setSelectedUnitId(u.id);
                  hapticTap();
                }}
                className={[
                  "esc-staff-btn",
                  isSelected ? "esc-staff-btn-primary" : "esc-staff-btn-secondary",
                ].join(" ")}
                style={{ fontSize: 12.5, padding: "6px 14px" }}
              >
                {u.name} {u.tenantOrigin ? `(${u.tenantOrigin === "teneo" ? "Teneo" : "Oakridge"})` : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* Top Authoring Generator Card (Req 31.4) */}
      <section
        data-tour="pedlead-authoring-draft"
        style={{
          background: "var(--color-surface-elevated, #fff)",
          border: "1px solid var(--color-staff-border)",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 28,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-content-primary)" }}>
            Draft New Unit from Plain Language (Req 31.4)
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-staff-muted)" }}>
            AI proposes · Human validates
          </span>
        </div>

        <p style={{ fontSize: 13, color: "var(--color-content-secondary)", margin: "0 0 12px 0" }}>
          Describe a unit, topic, or pedagogical standard. Escolent will synthesize a candidate DAG Skill Graph
          with exact-match and rubric-graded nodes, plus common diagnostic misconceptions.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setAiPrompt(ex.prompt);
                hapticTap();
              }}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 16,
                background: "var(--color-surface-subtle, rgba(0,0,0,0.03))",
                border: "1px solid var(--color-staff-border)",
                color: "var(--color-content-secondary)",
                cursor: "pointer",
              }}
            >
              + {ex.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Grade 7 Unit on Ecosystems and Food Webs: producers, primary/secondary consumers, 10% energy transfer rule, food web keystone species, and top-down trophic cascades..."
            rows={2}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-staff-border)",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              color: "var(--color-content-primary)",
              background: "var(--color-surface-base, #fafafa)",
            }}
          />
          <button
            type="button"
            onClick={() => void handleGenerateAiDraft()}
            disabled={isGeneratingAi || !aiPrompt.trim()}
            className="esc-staff-btn esc-staff-btn-primary"
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              minWidth: 160,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isGeneratingAi ? "Synthesizing..." : "Generate Unit Draft"}
          </button>
        </div>

        {aiError && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-danger, #dc2626)" }}>
            {aiError}
          </div>
        )}
      </section>

      {/* Unit Selection & Lifecycle Card */}
      {activeUnit && (
        <section
          data-tour="pedlead-authoring-lifecycle"
          style={{
            background: "var(--color-surface-elevated, #fff)",
            border: "1.5px solid var(--color-staff-border)",
            borderRadius: 12,
            padding: "22px 24px",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-staff-muted)", textTransform: "uppercase" }}>
                  {activeUnit.subject}
                </span>
                {statusBadge(activeUnit.status)}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--color-content-primary)" }}>
                {activeUnit.name}
              </h2>
              {activeUnit.sourceLocationRef && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    color: "var(--color-staff-interactive)",
                    background: "var(--color-staff-interactive-subtle)",
                    padding: "3px 8px",
                    borderRadius: 4,
                    marginTop: 6,
                    fontFamily: "monospace",
                  }}
                >
                  📍 Ingested from: {activeUnit.sourceLocationRef}
                </div>
              )}
              <p style={{ fontSize: 13.5, color: "var(--color-content-secondary)", margin: "6px 0 0 0", maxWidth: 680 }}>
                {activeUnit.description}
              </p>
            </div>

            {/* Lifecycle actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {activeUnit.status === "draft" && (
                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  className="esc-staff-btn esc-staff-btn-primary"
                  style={{ fontSize: 13, padding: "8px 16px" }}
                >
                  Submit for Approval (Req 31.5)
                </button>
              )}

              {activeUnit.status === "pending_approval" && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="esc-staff-btn esc-staff-btn-secondary"
                    style={{ fontSize: 13, padding: "8px 16px", color: "#b45309" }}
                  >
                    Reject with Feedback (Req 31.8a)
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    className="esc-staff-btn esc-staff-btn-primary"
                    style={{ fontSize: 13, padding: "8px 16px", background: "#059669", borderColor: "#059669" }}
                  >
                    Sign Off & Validate (Req 31.8)
                  </button>
                </>
              )}

              {activeUnit.status === "validated" && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#059669",
                    background: "rgba(16, 185, 129, 0.08)",
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  Live in Space Catalog
                </div>
              )}

              {!isEmbed && (
                <button
                  type="button"
                  onClick={handleSimulatePeerLead}
                  className="esc-staff-btn esc-staff-btn-secondary"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                  title="Simulate another Pedagogical Lead opening this unit"
                >
                  Simulate Peer View (31.8c)
                </button>
              )}
            </div>
          </div>

          {/* Rejection feedback callout (Req 31.8a) */}
          {activeUnit.status === "draft" && activeUnit.rejectionFeedback && (
            <div
              style={{
                marginTop: 18,
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>
                Revision Feedback from Reviewer:
              </div>
              <div style={{ fontSize: 13, color: "var(--color-content-primary)", lineHeight: 1.45 }}>
                {activeUnit.rejectionFeedback}
              </div>
            </div>
          )}

          {/* Validated notice / Stage edit protection (Req 31.8b) */}
          {activeUnit.status === "validated" && (
            <div
              data-tour="pedlead-authoring-live-edit"
              style={{
                marginTop: 18,
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.06)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                fontSize: 12.5,
                color: "var(--color-content-secondary)",
              }}
            >
              <strong style={{ color: "#065f46" }}>Live Content Isolation (Req 31.8b):</strong> Edits made to validated
              learning nodes stage as pending modifications. Active student sessions continue seeing the validated
              definition until you explicitly confirm and commit the live changes.
            </div>
          )}
        </section>
      )}

      {/* SKILL GRAPH SECTION (Req 31.1, 31.9, 31.10) */}
      {activeUnit && (
        <section data-tour="pedlead-authoring-skills" style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--color-content-primary)" }}>
                Skill Graph Nodes ({activeUnit.skills.length})
              </h2>
              <span style={{ fontSize: 12.5, color: "var(--color-staff-muted)" }}>
                DAG progression · Exact match & Rubric evaluation (Req 31.1, 31.10)
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  if (activeUnit.skills.length < 2) {
                    alert("Need at least 2 skills to merge.");
                    return;
                  }
                  setMergeTargetA(activeUnit.skills[0].id);
                  setMergeTargetB(activeUnit.skills[1].id);
                  setShowMergeModal(true);
                  hapticTap();
                }}
                className="esc-staff-btn esc-staff-btn-secondary"
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                Merge 2 Skills (Req 31.9)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewSkill(true);
                  setEditingSkill({
                    id: `skill_${Date.now().toString(36)}`,
                    slug: `new-skill-${activeUnit.skills.length + 1}`,
                    name: "",
                    subject: activeUnit.subject,
                    unitId: activeUnit.id,
                    unitName: activeUnit.name,
                    description: "",
                    evaluationStrategy: "exact_match",
                    difficulty: 3,
                    prerequisiteSkillIds: [],
                    status: activeUnit.status === "validated" ? "draft" : activeUnit.status,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                  hapticTap();
                }}
                className="esc-staff-btn esc-staff-btn-secondary"
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                + Add Skill
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {activeUnit.skills.map((skill, index) => {
              const hasPendingEdit = Boolean(skill.pendingEdit);
              const isRubric = skill.evaluationStrategy === "rubric";
              const isExpandedRubric = expandedRubricId === skill.id;

              return (
                <div
                  key={skill.id}
                  style={{
                    background: "var(--color-surface-elevated, #fff)",
                    border: hasPendingEdit
                      ? "1.5px solid #f59e0b"
                      : "1px solid var(--color-staff-border)",
                    borderRadius: 10,
                    padding: "16px 20px",
                    position: "relative",
                  }}
                >
                  {/* Skill header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-staff-muted)" }}>
                          Node #{index + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: isRubric ? "rgba(139, 92, 246, 0.12)" : "rgba(14, 165, 233, 0.12)",
                            color: isRubric ? "#7c3aed" : "#0284c7",
                          }}
                        >
                          {isRubric ? "Rubric Evaluated (Req 31.10)" : "Exact Match"}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--color-surface-subtle, rgba(0,0,0,0.04))",
                            color: "var(--color-content-secondary)",
                          }}
                        >
                          Diff: {skill.difficulty}/5
                        </span>
                        {statusBadge(skill.status)}
                      </div>

                      <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: 0, color: "var(--color-content-primary)" }}>
                        {skill.name}
                      </h3>
                    </div>

                    {/* Node Actions */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewSkill(false);
                          setEditingSkill(JSON.parse(JSON.stringify(skill)));
                          hapticTap();
                        }}
                        className="esc-staff-btn esc-staff-btn-secondary"
                        style={{ fontSize: 11.5, padding: "4px 10px" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitTargetSkill(skill);
                          setSplitA({
                            name: `${skill.name} (Foundations)`,
                            description: `Foundational concepts for ${skill.name}`,
                            strategy: "exact_match",
                          });
                          setSplitB({
                            name: `${skill.name} (Synthesis)`,
                            description: `Applied synthesis & analysis for ${skill.name}`,
                            strategy: "rubric",
                          });
                          hapticTap();
                        }}
                        className="esc-staff-btn esc-staff-btn-secondary"
                        style={{ fontSize: 11.5, padding: "4px 10px" }}
                      >
                        Split (31.9)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="esc-staff-btn esc-staff-btn-secondary"
                        style={{ fontSize: 11.5, padding: "4px 8px", color: "#dc2626" }}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: "var(--color-content-secondary)", margin: "4px 0 10px 0", lineHeight: 1.45 }}>
                    {skill.description}
                  </p>

                  {/* Prerequisites */}
                  {skill.prerequisiteSkillIds.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-staff-muted)" }}>
                        DAG Prerequisites:
                      </span>
                      {skill.prerequisiteSkillIds.map((pId) => {
                        const prereqSkill = activeUnit.skills.find((s) => s.id === pId);
                        return (
                          <span
                            key={pId}
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "rgba(0,0,0,0.04)",
                              color: "var(--color-content-primary)",
                            }}
                          >
                            ↳ {prereqSkill ? prereqSkill.name : pId}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Rubric Expandable Preview (Req 31.1, 31.10) */}
                  {isRubric && skill.rubric && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "rgba(139, 92, 246, 0.04)",
                        border: "1px solid rgba(139, 92, 246, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                        onClick={() => setExpandedRubricId(isExpandedRubric ? null : skill.id)}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9" }}>
                          Rubric Evaluation Schema: {skill.rubric.title}
                        </span>
                        <span style={{ fontSize: 12, color: "#7c3aed" }}>
                          {isExpandedRubric ? "Collapse ▲" : "View Rubric Criteria (4 Tiers) ▼"}
                        </span>
                      </div>

                      {isExpandedRubric && (
                        <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--color-content-primary)" }}>
                          <div style={{ marginBottom: 6 }}>
                            <strong>Prompt:</strong> {skill.rubric.prompt}
                          </div>
                          <div style={{ marginBottom: 10, color: "var(--color-content-secondary)" }}>
                            <strong>Exemplar:</strong> &ldquo;{skill.rubric.sampleExemplar}&rdquo;
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                            {skill.rubric.levels.map((lvl) => (
                              <div
                                key={lvl.score}
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                  background: "#fff",
                                  border: "1px solid rgba(139, 92, 246, 0.2)",
                                }}
                              >
                                <div style={{ fontWeight: 700, color: "#6d28d9", fontSize: 11.5, marginBottom: 2 }}>
                                  {lvl.label}
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--color-content-secondary)", lineHeight: 1.35 }}>
                                  {lvl.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Staged Live Edit Confirmation Box (Req 31.8b) */}
                  {hasPendingEdit && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", marginBottom: 2 }}>
                          Staged Live Edit Pending Confirmation (Req 31.8b)
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-content-secondary)" }}>
                          {skill.pendingEdit?.name ? `Proposed Name: "${skill.pendingEdit.name}" · ` : ""}
                          {skill.pendingEdit?.description ? `Proposed Description updated` : "Fields modified"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleDiscardLiveEdit(skill.id)}
                          className="esc-staff-btn esc-staff-btn-secondary"
                          style={{ fontSize: 11.5, padding: "4px 10px" }}
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyLiveEdit(skill.id)}
                          className="esc-staff-btn esc-staff-btn-primary"
                          style={{ fontSize: 11.5, padding: "4px 12px", background: "#d97706", borderColor: "#d97706" }}
                        >
                          Confirm & Publish Live Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MISCONCEPTION TAXONOMY SECTION (Req 31.4, 31.9) */}
      {activeUnit && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--color-content-primary)" }}>
                Misconception Taxonomy ({activeUnit.misconceptions.length})
              </h2>
              <span style={{ fontSize: 12.5, color: "var(--color-staff-muted)" }}>
                Diagnostic patterns · Student error models & teacher remediation hints (Req 31.4)
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewMisconception(true);
                setEditingMisconception({
                  id: `misc_${Date.now().toString(36)}`,
                  name: "",
                  unitId: activeUnit.id,
                  targetSkillIds: [activeUnit.skills[0]?.id || ""],
                  description: "",
                  sampleIncorrectAnswer: "",
                  remediationGuidance: "",
                  status: activeUnit.status === "validated" ? "draft" : activeUnit.status,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                hapticTap();
              }}
              className="esc-staff-btn esc-staff-btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              + Add Misconception
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            {activeUnit.misconceptions.map((misc) => {
              const hasPendingEdit = Boolean(misc.pendingEdit);

              return (
                <div
                  key={misc.id}
                  style={{
                    background: "var(--color-surface-elevated, #fff)",
                    border: hasPendingEdit
                      ? "1.5px solid #f59e0b"
                      : "1px solid var(--color-staff-border)",
                    borderRadius: 10,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: "var(--color-content-primary)" }}>
                        {misc.name}
                      </h3>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewMisconception(false);
                            setEditingMisconception(JSON.parse(JSON.stringify(misc)));
                            hapticTap();
                          }}
                          className="esc-staff-btn esc-staff-btn-secondary"
                          style={{ fontSize: 11, padding: "2px 8px" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMisconception(misc.id)}
                          className="esc-staff-btn esc-staff-btn-secondary"
                          style={{ fontSize: 11, padding: "2px 6px", color: "#dc2626" }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: 12.5, color: "var(--color-content-secondary)", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                      {misc.description}
                    </p>

                    <div
                      style={{
                        padding: "8px 10px",
                        background: "rgba(239, 68, 68, 0.05)",
                        borderLeft: "3px solid #ef4444",
                        borderRadius: "0 6px 6px 0",
                        fontSize: 12,
                        color: "var(--color-content-primary)",
                        marginBottom: 8,
                      }}
                    >
                      <strong style={{ color: "#dc2626" }}>Student Error:</strong> &ldquo;{misc.sampleIncorrectAnswer}&rdquo;
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        background: "rgba(16, 185, 129, 0.05)",
                        borderLeft: "3px solid #10b981",
                        borderRadius: "0 6px 6px 0",
                        fontSize: 12,
                        color: "var(--color-content-primary)",
                      }}
                    >
                      <strong style={{ color: "#059669" }}>Remediation:</strong> {misc.remediationGuidance}
                    </div>
                  </div>

                  {hasPendingEdit && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>Live Edit Pending</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleDiscardLiveEdit(undefined, misc.id)}
                          className="esc-staff-btn esc-staff-btn-secondary"
                          style={{ fontSize: 11, padding: "2px 6px" }}
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyLiveEdit(undefined, misc.id)}
                          className="esc-staff-btn esc-staff-btn-primary"
                          style={{ fontSize: 11, padding: "2px 8px", background: "#d97706", borderColor: "#d97706" }}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* EDIT / CREATE SKILL MODAL */}
      {editingSkill && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px 28px",
              width: "100%",
              maxWidth: 640,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {isNewSkill ? "Add New Skill Node" : "Edit Skill Node"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSkill(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            {editingSkill.status === "validated" && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 6,
                  fontSize: 12.5,
                  color: "#b45309",
                  marginBottom: 16,
                }}
              >
                <strong>Editing Live Validated Skill (Req 31.8b):</strong> Changes will be staged as a pending edit.
                Students won&apos;t see updates until you explicitly confirm and commit them.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Skill Name
                </label>
                <input
                  type="text"
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  placeholder="e.g. The 10% Ecological Efficiency Rule"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--color-staff-border)",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Description / Pedagogical Objective
                </label>
                <textarea
                  value={editingSkill.description}
                  onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--color-staff-border)",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Evaluation Strategy
                  </label>
                  <select
                    value={editingSkill.evaluationStrategy}
                    onChange={(e) => {
                      const strat = e.target.value as EvaluationStrategy;
                      setEditingSkill({
                        ...editingSkill,
                        evaluationStrategy: strat,
                        rubric:
                          strat === "rubric" && !editingSkill.rubric
                            ? {
                                title: `${editingSkill.name || "Skill"} Rubric`,
                                prompt: "Explain the scientific reasoning...",
                                sampleExemplar: "Complete cause and effect response.",
                                levels: [
                                  { score: 3, label: "Proficient (3 pts)", description: "Complete criteria." },
                                  { score: 2, label: "Approaching (2 pts)", description: "Partial criteria." },
                                  { score: 1, label: "Developing (1 pt)", description: "Emerging criteria." },
                                  { score: 0, label: "Incorrect (0 pts)", description: "Off-target criteria." },
                                ],
                              }
                            : editingSkill.rubric,
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--color-staff-border)",
                      fontSize: 13,
                    }}
                  >
                    <option value="exact_match">Exact Match (Symbolic/Classification)</option>
                    <option value="rubric">Rubric Evaluated (Conceptual Short Answer)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Difficulty (1 to 5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingSkill.difficulty}
                    onChange={(e) => setEditingSkill({ ...editingSkill, difficulty: parseInt(e.target.value) || 3 })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--color-staff-border)",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Rubric fields if rubric */}
              {editingSkill.evaluationStrategy === "rubric" && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "rgba(139, 92, 246, 0.05)",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                    borderRadius: 8,
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9", display: "block", marginBottom: 6 }}>
                    Rubric Prompt & Exemplar
                  </label>
                  <input
                    type="text"
                    value={editingSkill.rubric?.prompt || ""}
                    onChange={(e) =>
                      setEditingSkill({
                        ...editingSkill,
                        rubric: {
                          ...editingSkill.rubric!,
                          prompt: e.target.value,
                        },
                      })
                    }
                    placeholder="Short answer prompt for student"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--color-staff-border)",
                      fontSize: 12.5,
                      marginBottom: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  <textarea
                    value={editingSkill.rubric?.sampleExemplar || ""}
                    onChange={(e) =>
                      setEditingSkill({
                        ...editingSkill,
                        rubric: {
                          ...editingSkill.rubric!,
                          sampleExemplar: e.target.value,
                        },
                      })
                    }
                    placeholder="Ideal model student response"
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--color-staff-border)",
                      fontSize: 12.5,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="esc-staff-btn esc-staff-btn-secondary"
                  style={{ fontSize: 13, padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSkill}
                  className="esc-staff-btn esc-staff-btn-primary"
                  style={{ fontSize: 13, padding: "8px 18px" }}
                >
                  Save Skill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT SKILL MODAL (Req 31.9) */}
      {splitTargetSkill && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px 28px",
              width: "100%",
              maxWidth: 600,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px 0" }}>
              Split Skill: &ldquo;{splitTargetSkill.name}&rdquo; (Req 31.9)
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-content-secondary)", margin: "0 0 16px 0" }}>
              Decompose this complex learning target into two distinct progression steps.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: "12px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--color-staff-border)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-staff-accent)", marginBottom: 6 }}>
                  Sub-Skill A (Foundational Step)
                </div>
                <input
                  type="text"
                  value={splitA.name}
                  onChange={(e) => setSplitA({ ...splitA, name: e.target.value })}
                  placeholder="Sub-skill A Name"
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 13, boxSizing: "border-box", marginBottom: 6 }}
                />
                <textarea
                  value={splitA.description}
                  onChange={(e) => setSplitA({ ...splitA, description: e.target.value })}
                  placeholder="Description"
                  rows={2}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 12.5, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ padding: "12px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--color-staff-border)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-staff-accent)", marginBottom: 6 }}>
                  Sub-Skill B (Advanced / Synthesis Step)
                </div>
                <input
                  type="text"
                  value={splitB.name}
                  onChange={(e) => setSplitB({ ...splitB, name: e.target.value })}
                  placeholder="Sub-skill B Name"
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 13, boxSizing: "border-box", marginBottom: 6 }}
                />
                <textarea
                  value={splitB.description}
                  onChange={(e) => setSplitB({ ...splitB, description: e.target.value })}
                  placeholder="Description"
                  rows={2}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 12.5, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setSplitTargetSkill(null)}
                  className="esc-staff-btn esc-staff-btn-secondary"
                  style={{ fontSize: 13, padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSplitSkill}
                  className="esc-staff-btn esc-staff-btn-primary"
                  style={{ fontSize: 13, padding: "8px 18px" }}
                >
                  Confirm Split
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MERGE SKILLS MODAL (Req 31.9) */}
      {showMergeModal && activeUnit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px 28px",
              width: "100%",
              maxWidth: 600,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px 0" }}>
              Merge 2 Skills into One (Req 31.9)
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-content-secondary)", margin: "0 0 16px 0" }}>
              Combine two related or overlapping skills into a unified learning node.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Skill 1</label>
                  <select
                    value={mergeTargetA}
                    onChange={(e) => setMergeTargetA(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 12.5 }}
                  >
                    {activeUnit.skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Skill 2</label>
                  <select
                    value={mergeTargetB}
                    onChange={(e) => setMergeTargetB(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 12.5 }}
                  >
                    {activeUnit.skills.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.id === mergeTargetA}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Merged Skill Name
                </label>
                <input
                  type="text"
                  value={mergedSkillData.name}
                  onChange={(e) => setMergedSkillData({ ...mergedSkillData, name: e.target.value })}
                  placeholder="e.g. Energy Dynamics & Food Web Synthesis"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Merged Description
                </label>
                <textarea
                  value={mergedSkillData.description}
                  onChange={(e) => setMergedSkillData({ ...mergedSkillData, description: e.target.value })}
                  placeholder="Comprehensive description of the merged competency"
                  rows={2}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 12.5, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="esc-staff-btn esc-staff-btn-secondary"
                  style={{ fontSize: 13, padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMergeSkills}
                  disabled={!mergedSkillData.name.trim() || mergeTargetA === mergeTargetB}
                  className="esc-staff-btn esc-staff-btn-primary"
                  style={{ fontSize: 13, padding: "8px 18px" }}
                >
                  Merge Skills
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT WITH FEEDBACK MODAL (Req 31.8a) */}
      {showRejectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px 28px",
              width: "100%",
              maxWidth: 540,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px 0", color: "#b45309" }}>
              Reject Unit & Provide Written Feedback (Req 31.8a)
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-content-secondary)", margin: "0 0 14px 0" }}>
              Explain why this draft is being returned for revisions so the authoring lead can calibrate the skill graph or rubric criteria.
            </p>

            <textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="e.g. The rubric for Trophic Cascades lacks clear separation between level 2 and level 3 explanations. Please also add a misconception for energy accumulation."
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-staff-border)",
                fontSize: 13,
                fontFamily: "inherit",
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="esc-staff-btn esc-staff-btn-secondary"
                style={{ fontSize: 13, padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectWithFeedback}
                className="esc-staff-btn esc-staff-btn-primary"
                style={{ fontSize: 13, padding: "8px 18px", background: "#d97706", borderColor: "#d97706" }}
              >
                Submit Rejection Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / CREATE MISCONCEPTION MODAL */}
      {editingMisconception && activeUnit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px 28px",
              width: "100%",
              maxWidth: 580,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {isNewMisconception ? "Add Misconception" : "Edit Misconception"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMisconception(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Misconception Name
                </label>
                <input
                  type="text"
                  value={editingMisconception.name}
                  onChange={(e) => setEditingMisconception({ ...editingMisconception, name: e.target.value })}
                  placeholder="e.g. Energy Accumulation Fallacy"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Description of Flawed Intuition
                </label>
                <textarea
                  value={editingMisconception.description}
                  onChange={(e) => setEditingMisconception({ ...editingMisconception, description: e.target.value })}
                  rows={2}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 12.5, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Sample Student Error (Concrete Incorrect Answer)
                </label>
                <input
                  type="text"
                  value={editingMisconception.sampleIncorrectAnswer}
                  onChange={(e) => setEditingMisconception({ ...editingMisconception, sampleIncorrectAnswer: e.target.value })}
                  placeholder="e.g. The hawk has the most energy because it is at the top of the food chain."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Teacher Remediation Guidance / Hint Strategy
                </label>
                <textarea
                  value={editingMisconception.remediationGuidance}
                  onChange={(e) => setEditingMisconception({ ...editingMisconception, remediationGuidance: e.target.value })}
                  rows={2}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-staff-border)", fontSize: 12.5, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditingMisconception(null)}
                  className="esc-staff-btn esc-staff-btn-secondary"
                  style={{ fontSize: 13, padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMisconception}
                  className="esc-staff-btn esc-staff-btn-primary"
                  style={{ fontSize: 13, padding: "8px 18px" }}
                >
                  Save Misconception
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
