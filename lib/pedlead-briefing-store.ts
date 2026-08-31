/**
 * Pedagogical Lead Briefing Synthesis Store (Requirement 31a).
 *
 * Requirements: 21.5, 31a.1-31a.7
 *
 * ARCHITECTURAL CONSTRAINT (Req 21.5):
 * Cross-tenant read/write access to Skill and Misconception content ONLY.
 * Zero access, ever, to Student, Teacher, Session, or Mastery_State data across
 * or within any school.
 *
 * Features:
 * - Content-scoped synthesized items (pending review, thin coverage, cross-tenant patterns)
 * - Review backlog aging expressed via documented threshold (default: 5 business days, configurable)
 * - Aggregates across every school tenant by default with drill-down filters (31a.2)
 * - Cross-tenant patterns report affected school counts without ever naming schools operationally (31a.7)
 * - Direct navigation to authoring flow records (31a.3)
 * - Honest empty states (31a.6) and first-run handling note (31a.5)
 */

import { getContentUnits, type AuthoringUnit, type ContentStatus } from "@/lib/pedlead-content-store";

export type PedleadBriefingCategory = "pending_review" | "thin_coverage" | "cross_tenant_pattern";
export type PedleadBriefingUrgency = "attention" | "informational";
export type PedleadBriefingState = "populated" | "all_clear" | "no_curated_content";

export interface PedleadBriefingItem {
  id: string;
  category: PedleadBriefingCategory;
  urgency: PedleadBriefingUrgency;
  title: string;
  summary: string; // aging-threshold framing (Req 31a.4)
  detail: string;
  scopeLabel: string;
  unitId: string;
  skillId?: string;
  misconceptionId?: string;
  actionRoute: string; // direct deep-link into authoring flow (Req 31a.3)
  /** Present for cross_tenant_pattern items only — never names schools (Req 31a.7) */
  affectedSchoolCount?: number;
  computedAt: string;
}

export interface PedleadBriefing {
  state: PedleadBriefingState;
  scopeLabel: string;
  agingThresholdBusinessDays: number;
  computedAt: string;
  items: PedleadBriefingItem[];
}

/** Default documented aging threshold for pedagogical review (5 business days = ~7 calendar days) */
export const DEFAULT_PENDING_REVIEW_AGING_THRESHOLD_DAYS = 5;

/** Tenant display labels for content-origin drilldown */
export const TENANT_LABELS: Record<string, string> = {
  all: "All Schools (Platform-wide)",
  teneo: "Teneo School content",
  oakridge: "Oakridge Academy content",
};

export interface BuildPedleadBriefingOptions {
  tenantFilter?: string | null;
  demoState?: "auto" | "populated" | "all_clear" | "no_curated_content";
  agingThresholdDays?: number;
}

export function pedleadBriefingScopeLabel(tenantFilter?: string | null): string {
  if (!tenantFilter || tenantFilter === "all") {
    return "Platform-wide · Cross-tenant curriculum lens";
  }
  return `${TENANT_LABELS[tenantFilter] ?? tenantFilter} · Content authoring lens`;
}

/**
 * Computes business days elapsed between two dates.
 */
function businessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const cur = new Date(startDate.getTime());
  while (cur < endDate) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function buildPedleadBriefing(
  options?: BuildPedleadBriefingOptions,
): Promise<PedleadBriefing> {
  const tenantFilter = options?.tenantFilter || "all";
  const agingThreshold = options?.agingThresholdDays ?? DEFAULT_PENDING_REVIEW_AGING_THRESHOLD_DAYS;
  const now = new Date();
  const computedAt = now.toISOString();

  // Manual edge demo states
  if (options?.demoState === "no_curated_content") {
    return {
      state: "no_curated_content",
      scopeLabel: pedleadBriefingScopeLabel(tenantFilter),
      agingThresholdBusinessDays: agingThreshold,
      computedAt,
      items: [],
    };
  }

  if (options?.demoState === "all_clear") {
    return {
      state: "all_clear",
      scopeLabel: pedleadBriefingScopeLabel(tenantFilter),
      agingThresholdBusinessDays: agingThreshold,
      computedAt,
      items: [],
    };
  }

  const allUnits = await getContentUnits();

  // Filter units if specific tenant selected
  const units =
    tenantFilter === "all"
      ? allUnits
      : allUnits.filter((u) => u.tenantOrigin === tenantFilter);

  if (units.length === 0 && allUnits.length === 0) {
    // Note on Req 31a.5: In this demo, seed units exist from Task 28/31, so this won't trigger
    // in normal execution unless explicitly cleared.
    return {
      state: "no_curated_content",
      scopeLabel: pedleadBriefingScopeLabel(tenantFilter),
      agingThresholdBusinessDays: agingThreshold,
      computedAt,
      items: [],
    };
  }

  const items: PedleadBriefingItem[] = [];

  // 1. Pending Review items exceeding aging threshold (Req 31a.4)
  for (const unit of units) {
    const pendingSkills = unit.skills.filter((s) => s.status === "pending_approval");
    const pendingMiscs = unit.misconceptions.filter((m) => m.status === "pending_approval");

    if (unit.status === "pending_approval" || pendingSkills.length > 0 || pendingMiscs.length > 0) {
      const createdAt = new Date(unit.createdAt || unit.updatedAt);
      const elapsedBizDays = Math.max(1, businessDaysBetween(createdAt, now));
      const exceedsThreshold = elapsedBizDays >= agingThreshold;

      const summary = exceedsThreshold
        ? `Pending review for ${elapsedBizDays} business days (exceeds ${agingThreshold}-day review target)`
        : `Pending review for ${elapsedBizDays} business days (within ${agingThreshold}-day target)`;

      items.push({
        id: `briefing_review_${unit.id}`,
        category: "pending_review",
        urgency: exceedsThreshold ? "attention" : "informational",
        title: `Curriculum Unit Awaiting Sign-Off: ${unit.name}`,
        summary,
        detail: `${pendingSkills.length} skill nodes and ${pendingMiscs.length} misconceptions are waiting for validation sign-off before being servable to students.`,
        scopeLabel: unit.subject,
        unitId: unit.id,
        actionRoute: `/pedlead/authoring?unitId=${unit.id}`,
        computedAt,
      });
    }
  }

  // 2. Thin Coverage Skills (Req 31a.1)
  // Simple content-level signals: rubric missing exemplar, or skill with 0 attached misconceptions
  for (const unit of units) {
    for (const skill of unit.skills) {
      const hasMissingExemplar =
        skill.evaluationStrategy === "rubric" &&
        (!skill.rubric?.sampleExemplar || skill.rubric.sampleExemplar.trim().length === 0);

      const attachedMiscs = unit.misconceptions.filter((m) =>
        m.targetSkillIds.includes(skill.id),
      );
      const hasZeroMisconceptions = attachedMiscs.length === 0;

      if (hasMissingExemplar) {
        items.push({
          id: `briefing_thin_exemplar_${skill.id}`,
          category: "thin_coverage",
          urgency: "attention",
          title: `Thin Rubric Coverage: ${skill.name}`,
          summary: "Rubric evaluation schema is missing a validated model response exemplar",
          detail: `Rubric-based evaluation requires an exemplar for automated 4-tier grading calibration before live practice sessions.`,
          scopeLabel: `${unit.name} · Node #${unit.skills.indexOf(skill) + 1}`,
          unitId: unit.id,
          skillId: skill.id,
          actionRoute: `/pedlead/authoring?unitId=${unit.id}&editSkill=${skill.id}`,
          computedAt,
        });
      } else if (hasZeroMisconceptions) {
        items.push({
          id: `briefing_thin_misc_${skill.id}`,
          category: "thin_coverage",
          urgency: "informational",
          title: `No Misconceptions Mapped: ${skill.name}`,
          summary: "Skill has zero mapped diagnostic error models in the taxonomy",
          detail: `Adaptive hints and diagnostic remediations rely on named misconception models to intercept common student failure modes.`,
          scopeLabel: `${unit.name} · Node #${unit.skills.indexOf(skill) + 1}`,
          unitId: unit.id,
          skillId: skill.id,
          actionRoute: `/pedlead/authoring?unitId=${unit.id}&addMiscForSkill=${skill.id}`,
          computedAt,
        });
      }
    }
  }

  // 3. Cross-Tenant Misconception Patterns (Req 31a.1, 31a.7)
  // Aggregate misconception names across all school content units.
  // Never names schools; reports affected school count.
  if (tenantFilter === "all") {
    const misconceptionClusters = new Map<
      string,
      { name: string; unitIds: string[]; tenants: Set<string>; sampleMiscs: typeof allUnits[0]["misconceptions"] }
    >();

    for (const unit of allUnits) {
      const tenant = unit.tenantOrigin || "teneo";
      for (const misc of unit.misconceptions) {
        const normalizedKey = misc.name.trim().toLowerCase();
        const existing = misconceptionClusters.get(normalizedKey) ?? {
          name: misc.name,
          unitIds: [],
          tenants: new Set<string>(),
          sampleMiscs: [],
        };
        existing.unitIds.push(unit.id);
        existing.tenants.add(tenant);
        existing.sampleMiscs.push(misc);
        misconceptionClusters.set(normalizedKey, existing);
      }
    }

    for (const [key, cluster] of misconceptionClusters.entries()) {
      if (cluster.tenants.size > 1) {
        const count = cluster.tenants.size;
        items.push({
          id: `briefing_cross_tenant_${key.replace(/\s+/g, "_")}`,
          category: "cross_tenant_pattern",
          urgency: "attention",
          title: `Recurring Cross-Tenant Misconception: ${cluster.name}`,
          summary: `Identified across content from ${count} distinct school programs`,
          detail: `Students across multiple independent schools exhibit this identical flawed reasoning pattern ("${cluster.sampleMiscs[0]?.sampleIncorrectAnswer}"). Consider standardizing the platform-level remediation guidance.`,
          scopeLabel: "Life Science · Platform Cross-Tenant Pattern",
          unitId: cluster.unitIds[0],
          misconceptionId: cluster.sampleMiscs[0]?.id,
          actionRoute: `/pedlead/authoring?unitId=${cluster.unitIds[0]}`,
          affectedSchoolCount: count,
          computedAt,
        });
      }
    }
  }

  const finalState: PedleadBriefingState =
    items.length > 0 ? "populated" : "all_clear";

  return {
    state: finalState,
    scopeLabel: pedleadBriefingScopeLabel(tenantFilter),
    agingThresholdBusinessDays: agingThreshold,
    computedAt,
    items,
  };
}

/**
 * Grounding lines for Pedlead Briefing AI queries (Req 31a).
 */
export function pedleadBriefingAskGroundingLines(briefing: PedleadBriefing): string[] {
  if (briefing.state === "all_clear") {
    return ["- state: all_clear | no content items requiring pedagogical review or calibration"];
  }
  if (briefing.state === "no_curated_content") {
    return ["- state: no_curated_content | no units authored yet — prompt authoring flow"];
  }

  return briefing.items.map((item) => {
    const schoolCountStr =
      item.affectedSchoolCount !== undefined
        ? ` | affected_schools: ${item.affectedSchoolCount}`
        : "";
    return `- [${item.urgency}] ${item.category} | ${item.scopeLabel} | title: ${item.title} | summary: ${item.summary} | detail: ${item.detail}${schoolCountStr}`;
  });
}
