/**
 * Cross-Tenant Curriculum Coverage Store & Calculation Engine (Requirements 32.4 & 32.7)
 *
 * Strict Architectural Boundary (Requirement 21.5):
 * ZERO access to Student, Teacher, Session, or Mastery_State data.
 * Aggregates only curriculum skill graphs and misconception taxonomies.
 *
 * Concrete Coverage Definitions:
 * - gap:  No validated content exists for the skill yet (status is draft or pending_approval).
 * - thin: Validated, but missing something substantive:
 *         1) Zero mapped diagnostic misconceptions, OR
 *         2) Rubric-based skill with no model answer exemplar.
 * - rich: Validated with real diagnostic misconceptions mapped (and rubric exemplar present if rubric).
 */

import { getContentUnits, type AuthoringSkill, type AuthoringMisconception } from "@/lib/pedlead-content-store";
import { SKILLS as MATH_SKILLS } from "@/lib/demo-data/skills";

export type CoverageLevel = "rich" | "thin" | "gap";

export interface SkillCoverageReport {
  id: string;
  name: string;
  slug: string;
  subject: string;
  unitId: string;
  unitName: string;
  tenantOrigin: string; // "teneo" | "oakridge"
  tenantLabel: string;
  status: "validated" | "pending_approval" | "draft";
  evaluationStrategy: "exact_match" | "rubric";
  hasRubricExemplar: boolean;
  mappedMisconceptionCount: number;
  mappedMisconceptions: { id: string; name: string }[];
  coverageLevel: CoverageLevel;
  coverageReason: string;
  priorityRank: number; // 1 = Highest (Gap), 2 = Medium (Thin), 3 = Complete (Rich)
  actionRoute?: string | null;
  actionLabel?: string | null;
}

export interface UnitCoverageSummary {
  unitId: string;
  unitName: string;
  subject: string;
  tenantOrigin: string;
  tenantLabel: string;
  totalSkills: number;
  richCount: number;
  thinCount: number;
  gapCount: number;
  coverageStatus: CoverageLevel; // Majority/Aggregate status
}

export interface PedleadCoveragePayload {
  scopeLabel: string;
  totalSkills: number;
  richCount: number;
  thinCount: number;
  gapCount: number;
  summary: {
    richPercentage: number;
    thinPercentage: number;
    gapPercentage: number;
    prioritizedActionCount: number; // Gaps + Thin needing attention
  };
  units: UnitCoverageSummary[];
  skills: SkillCoverageReport[];
  computedAt: string;
}

const TENANT_LABELS: Record<string, string> = {
  teneo: "Teneo Academy",
  oakridge: "Oakridge Academy",
  universal: "Core Curriculum",
};

/**
 * Core coverage calculation for any skill.
 */
export function calculateSkillCoverage(
  skill: {
    id: string;
    name: string;
    status: "validated" | "pending_approval" | "draft";
    evaluationStrategy: "exact_match" | "rubric";
    rubric?: { sampleExemplar?: string | null } | null;
  },
  mappedMisconceptions: { id: string; name: string }[],
): {
  coverageLevel: CoverageLevel;
  coverageReason: string;
  priorityRank: number;
} {
  // Gap: Not yet validated
  if (skill.status !== "validated") {
    const isPending = skill.status === "pending_approval";
    return {
      coverageLevel: "gap",
      coverageReason: isPending
        ? "Skill content authored and awaiting pedagogical validation sign-off."
        : "Skill content is in initial draft state and not yet submitted for validation.",
      priorityRank: 1, // Highest priority to reach validated baseline
    };
  }

  // Check thin conditions on validated content
  const isRubric = skill.evaluationStrategy === "rubric";
  const missingExemplar =
    isRubric && (!skill.rubric?.sampleExemplar || skill.rubric.sampleExemplar.trim().length === 0);
  const zeroMisconceptions = mappedMisconceptions.length === 0;

  if (missingExemplar && zeroMisconceptions) {
    return {
      coverageLevel: "thin",
      coverageReason: "Validated, but missing both a rubric model response exemplar and diagnostic error models.",
      priorityRank: 2,
    };
  }

  if (missingExemplar) {
    return {
      coverageLevel: "thin",
      coverageReason: "Validated rubric skill missing a calibrated model response exemplar for scoring.",
      priorityRank: 2,
    };
  }

  if (zeroMisconceptions) {
    return {
      coverageLevel: "thin",
      coverageReason: "Validated skill with zero diagnostic misconceptions mapped in the taxonomy.",
      priorityRank: 2,
    };
  }

  // Rich: Validated + has misconceptions + (has exemplar if rubric)
  return {
    coverageLevel: "rich",
    coverageReason: `Validated with ${mappedMisconceptions.length} diagnostic misconception model${
      mappedMisconceptions.length === 1 ? "" : "s"
    } mapped and active.`,
    priorityRank: 3, // Complete
  };
}

/**
 * Build the Math Algebra baseline unit (all validated in production).
 */
function buildMathAlgebraCoverage(): {
  unit: UnitCoverageSummary;
  skills: SkillCoverageReport[];
} {
  const mathMisconceptionsBySkill: Record<string, { id: string; name: string }[]> = {
    s0: [{ id: "m_op_inv", name: "Operation order inversion" }],
    s1: [{ id: "m_neg_drop", name: "Negative sign drop in subtraction" }],
    s2: [{ id: "m_add_inv", name: "Additive vs multiplicative inverse confusion" }],
    s3: [{ id: "m_sub_before_div", name: "Subtracting before dividing in two-step equations" }],
    s4: [{ id: "m_dist_drop", name: "Distributive property term omission" }],
    s5: [{ id: "m_var_side", name: "Moving variable drops negative sign" }],
    s6: [{ id: "m_sign_flip", name: "Inequality sign flip omission on negative division" }],
  };

  const skills: SkillCoverageReport[] = MATH_SKILLS.map((s) => {
    const miscs = mathMisconceptionsBySkill[s.id] ?? [{ id: `m_${s.id}`, name: "General procedural slip" }];
    const calc = calculateSkillCoverage(
      {
        id: s.id,
        name: s.name,
        status: "validated",
        evaluationStrategy: "exact_match",
      },
      miscs,
    );

    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      subject: "Mathematics (Grade 8)",
      unitId: "unit_algebra_linear_equations",
      unitName: "Linear Equations & Inequalities",
      tenantOrigin: "teneo",
      tenantLabel: "Teneo Academy",
      status: "validated",
      evaluationStrategy: "exact_match",
      hasRubricExemplar: false,
      mappedMisconceptionCount: miscs.length,
      mappedMisconceptions: miscs,
      coverageLevel: calc.coverageLevel,
      coverageReason: calc.coverageReason,
      priorityRank: calc.priorityRank,
      actionRoute: null,
      actionLabel: null,
    };
  });

  const unit: UnitCoverageSummary = {
    unitId: "unit_algebra_linear_equations",
    unitName: "Linear Equations & Inequalities",
    subject: "Mathematics (Grade 8)",
    tenantOrigin: "teneo",
    tenantLabel: "Teneo Academy",
    totalSkills: skills.length,
    richCount: skills.length,
    thinCount: 0,
    gapCount: 0,
    coverageStatus: "rich",
  };

  return { unit, skills };
}

/**
 * Build the full cross-tenant coverage intelligence payload (Req 32.7).
 */
export async function buildPedleadCoverage(tenantFilter?: string | null): Promise<PedleadCoveragePayload> {
  const authoringUnits = await getContentUnits();
  const mathData = buildMathAlgebraCoverage();

  const allSkillReports: SkillCoverageReport[] = [];
  const allUnitSummaries: UnitCoverageSummary[] = [];

  // 1. Add Math baseline if tenant matches or filter is all
  if (!tenantFilter || tenantFilter === "all" || tenantFilter === "teneo") {
    allUnitSummaries.push(mathData.unit);
    allSkillReports.push(...mathData.skills);
  }

  // 2. Add Authoring Units (Science, etc.)
  for (const unit of authoringUnits) {
    const tenant = unit.tenantOrigin || "teneo";
    if (tenantFilter && tenantFilter !== "all" && tenant !== tenantFilter) {
      continue;
    }

    const tenantLabel = TENANT_LABELS[tenant] ?? "Teneo Academy";
    let richCount = 0;
    let thinCount = 0;
    let gapCount = 0;

    const unitSkills: SkillCoverageReport[] = unit.skills.map((skill: AuthoringSkill) => {
      const mappedMiscs = unit.misconceptions
        .filter((m: AuthoringMisconception) => m.targetSkillIds.includes(skill.id))
        .map((m: AuthoringMisconception) => ({ id: m.id, name: m.name }));

      const calc = calculateSkillCoverage(
        {
          id: skill.id,
          name: skill.name,
          status: skill.status,
          evaluationStrategy: skill.evaluationStrategy,
          rubric: skill.rubric,
        },
        mappedMiscs,
      );

      if (calc.coverageLevel === "rich") richCount++;
      else if (calc.coverageLevel === "thin") thinCount++;
      else gapCount++;

      let actionRoute = `/pedlead/authoring?unitId=${unit.id}`;
      let actionLabel = "Open in Studio";

      if (calc.coverageLevel === "gap") {
        actionRoute = `/pedlead/authoring?unitId=${unit.id}&editSkill=${skill.id}`;
        actionLabel = "Review in Studio →";
      } else if (calc.coverageLevel === "thin") {
        if (
          skill.evaluationStrategy === "rubric" &&
          (!skill.rubric?.sampleExemplar || skill.rubric.sampleExemplar.trim().length === 0)
        ) {
          actionRoute = `/pedlead/authoring?unitId=${unit.id}&editSkill=${skill.id}`;
          actionLabel = "Add Exemplar →";
        } else {
          actionRoute = `/pedlead/authoring?unitId=${unit.id}&addMiscForSkill=${skill.id}`;
          actionLabel = "Map Misconceptions →";
        }
      } else {
        actionRoute = `/pedlead/authoring?unitId=${unit.id}&editSkill=${skill.id}`;
        actionLabel = "Inspect Node →";
      }

      return {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        subject: skill.subject || unit.subject,
        unitId: unit.id,
        unitName: unit.name,
        tenantOrigin: tenant,
        tenantLabel,
        status: skill.status,
        evaluationStrategy: skill.evaluationStrategy,
        hasRubricExemplar: Boolean(skill.rubric?.sampleExemplar && skill.rubric.sampleExemplar.trim().length > 0),
        mappedMisconceptionCount: mappedMiscs.length,
        mappedMisconceptions: mappedMiscs,
        coverageLevel: calc.coverageLevel,
        coverageReason: calc.coverageReason,
        priorityRank: calc.priorityRank,
        actionRoute,
        actionLabel,
      };
    });

    const unitStatus: CoverageLevel =
      gapCount > 0 ? "gap" : thinCount > 0 ? "thin" : "rich";

    allUnitSummaries.push({
      unitId: unit.id,
      unitName: unit.name,
      subject: unit.subject,
      tenantOrigin: tenant,
      tenantLabel,
      totalSkills: unitSkills.length,
      richCount,
      thinCount,
      gapCount,
      coverageStatus: unitStatus,
    });

    allSkillReports.push(...unitSkills);
  }

  // Sort by priority rank ascending (Gaps = 1 first, Thin = 2 second, Rich = 3 last)
  allSkillReports.sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
    return a.name.localeCompare(b.name);
  });

  const totalSkills = allSkillReports.length;
  const richCount = allSkillReports.filter((s) => s.coverageLevel === "rich").length;
  const thinCount = allSkillReports.filter((s) => s.coverageLevel === "thin").length;
  const gapCount = allSkillReports.filter((s) => s.coverageLevel === "gap").length;

  const richPercentage = totalSkills > 0 ? Math.round((richCount / totalSkills) * 100) : 0;
  const thinPercentage = totalSkills > 0 ? Math.round((thinCount / totalSkills) * 100) : 0;
  const gapPercentage = totalSkills > 0 ? Math.round((gapCount / totalSkills) * 100) : 0;

  const scopeLabel =
    !tenantFilter || tenantFilter === "all"
      ? "Cross-tenant curriculum (All schools)"
      : tenantFilter === "teneo"
        ? "Teneo Academy curriculum"
        : "Oakridge Academy curriculum";

  return {
    scopeLabel,
    totalSkills,
    richCount,
    thinCount,
    gapCount,
    summary: {
      richPercentage,
      thinPercentage,
      gapPercentage,
      prioritizedActionCount: gapCount + thinCount,
    },
    units: allUnitSummaries,
    skills: allSkillReports,
    computedAt: new Date().toISOString(),
  };
}
