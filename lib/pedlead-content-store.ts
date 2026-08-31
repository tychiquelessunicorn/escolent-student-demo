/**
 * Pedagogical Lead Content Authoring & Curriculum Validation Store.
 *
 * Requirements: 21.5, 31.1, 31.4-31.10, 31a.1-31a.7
 *
 * ARCHITECTURAL CONSTRAINT (Req 21.5):
 * The Pedagogical Lead role has cross-tenant read/write access to Skill and
 * Misconception content ONLY. Zero access, ever, to Student, Teacher, Session,
 * Escalation, or Mastery_State data across or within any school.
 * No function in this store accesses roster, session, or student records.
 */

import { getRedis } from "@/lib/rate-limit";
import { DEMO_PEDLEAD_STAFF_ID } from "@/lib/demo-data/staff";

export type ContentStatus = "draft" | "pending_approval" | "validated";
export type EvaluationStrategy = "exact_match" | "rubric";

export interface RubricLevel {
  score: number; // e.g. 0 to 3
  label: string; // e.g. "Proficient (3 pts)"
  description: string; // specific evidence required
}

export interface SkillRubric {
  title: string;
  prompt: string;
  sampleExemplar: string;
  levels: RubricLevel[];
}

export interface AuthoringSkill {
  id: string;
  slug: string;
  name: string;
  subject: string;
  unitId: string;
  unitName: string;
  description: string;
  evaluationStrategy: EvaluationStrategy;
  exactMatchSpec?: {
    canonicalAnswers: string[];
    acceptedVariations: string[];
  };
  rubric?: SkillRubric;
  prerequisiteSkillIds: string[];
  difficulty: number; // 1 to 5
  status: ContentStatus;
  rejectionFeedback?: string | null;
  /** Illustrative tenant origin tag (Req 31a.1 / 31a.7) - content context only */
  tenantOrigin?: string;
  /** Req 31.8b: staged edits for already-validated content */
  pendingEdit?: Partial<Omit<AuthoringSkill, "id" | "status" | "pendingEdit">> | null;
  authorId?: string;
  validatorId?: string | null;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string | null;
}

export interface AuthoringMisconception {
  id: string;
  name: string;
  unitId: string;
  targetSkillIds: string[];
  description: string;
  sampleIncorrectAnswer: string;
  remediationGuidance: string;
  status: ContentStatus;
  rejectionFeedback?: string | null;
  /** Illustrative tenant origin tag (Req 31a.1 / 31a.7) - content context only */
  tenantOrigin?: string;
  /** Req 31.8b: staged edits for already-validated content */
  pendingEdit?: Partial<Omit<AuthoringMisconception, "id" | "status" | "pendingEdit">> | null;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string | null;
}

export interface AuthoringUnit {
  id: string;
  name: string;
  subject: string;
  description: string;
  status: ContentStatus;
  rejectionFeedback?: string | null;
  /** Illustrative tenant origin tag (Req 31a.1 / 31a.7) - content context only */
  tenantOrigin?: string;
  skills: AuthoringSkill[];
  misconceptions: AuthoringMisconception[];
  createdAt: string;
  updatedAt: string;
  validatedAt?: string | null;
  validatorId?: string | null;
}

const REDIS_UNITS_KEY = "escolent:pedlead:content-units";

// Realistic dates representing review aging (pending > 5 business days ago, e.g., 7 days old)
const SEED_TIMESTAMP_TENEO = "2026-08-20T10:00:00.000Z";
const SEED_TIMESTAMP_OAKRIDGE = "2026-08-21T14:30:00.000Z";

export const SEED_SCIENCE_UNIT: AuthoringUnit = {
  id: "unit_ecosystems_energy_flow",
  name: "Ecosystems & Energy Flow",
  subject: "Life Science (Grade 7)",
  description:
    "Grade 7 NGSS-aligned unit covering trophic levels, the 10% energy transfer rule, food webs, and trophic cascades caused by keystone species.",
  status: "pending_approval",
  rejectionFeedback: null,
  tenantOrigin: "teneo",
  createdAt: SEED_TIMESTAMP_TENEO,
  updatedAt: SEED_TIMESTAMP_TENEO,
  validatedAt: null,
  validatorId: null,
  skills: [
    {
      id: "eco_trophic_levels",
      slug: "trophic-levels-roles",
      name: "Trophic Levels & Organism Roles",
      subject: "Life Science (Grade 7)",
      unitId: "unit_ecosystems_energy_flow",
      unitName: "Ecosystems & Energy Flow",
      description:
        "Classify organisms as producers, primary consumers (herbivores), secondary consumers (carnivores/omnivores), or decomposers based on their energy source.",
      evaluationStrategy: "exact_match",
      exactMatchSpec: {
        canonicalAnswers: ["producer", "primary consumer", "secondary consumer", "decomposer"],
        acceptedVariations: [
          "producers",
          "primary consumers",
          "secondary consumers",
          "decomposers",
          "herbivore",
          "carnivore",
          "autotroph",
          "heterotroph",
        ],
      },
      prerequisiteSkillIds: [],
      difficulty: 2,
      status: "validated",
      validatedAt: "2026-08-20T10:00:00.000Z",
      validatorId: DEMO_PEDLEAD_STAFF_ID,
      tenantOrigin: "teneo",
      createdAt: SEED_TIMESTAMP_TENEO,
      updatedAt: SEED_TIMESTAMP_TENEO,
    },
    {
      id: "eco_energy_transfer_rule",
      slug: "ten-percent-energy-rule",
      name: "The 10% Ecological Efficiency Rule",
      subject: "Life Science (Grade 7)",
      unitId: "unit_ecosystems_energy_flow",
      unitName: "Ecosystems & Energy Flow",
      description:
        "Calculate and trace energy dissipation across successive trophic levels (90% lost to cellular respiration and metabolic heat).",
      evaluationStrategy: "exact_match",
      exactMatchSpec: {
        canonicalAnswers: ["10%", "10 percent", "100 kcal", "100 J", "0.1"],
        acceptedVariations: ["10 %", "ten percent", "10% energy", "90% lost"],
      },
      prerequisiteSkillIds: ["eco_trophic_levels"],
      difficulty: 3,
      status: "pending_approval",
      tenantOrigin: "teneo",
      createdAt: SEED_TIMESTAMP_TENEO,
      updatedAt: SEED_TIMESTAMP_TENEO,
    },
    {
      id: "eco_trophic_cascades",
      slug: "food-web-cascades",
      name: "Food Web Interdependence & Trophic Cascades",
      subject: "Life Science (Grade 7)",
      unitId: "unit_ecosystems_energy_flow",
      unitName: "Ecosystems & Energy Flow",
      description:
        "Analyze how removing or introducing a keystone apex predator triggers top-down trophic cascades affecting multiple non-adjacent trophic populations.",
      evaluationStrategy: "rubric",
      rubric: {
        title: "Trophic Cascade Multi-Step Analysis",
        prompt:
          "Predict the ecological consequences on riverbank vegetation and beaver populations if wolves are removed from the Yellowstone ecosystem. Explain the multi-step mechanism.",
        sampleExemplar:
          "Removing wolves reduces predation on elk, causing the elk population to increase. The larger elk population overgrazes willow and aspen saplings along riverbanks. Without sufficient willow trees, beavers lose both food and dam-building materials, leading to beaver colony decline and wetland habitat loss.",
        levels: [
          {
            score: 3,
            label: "Proficient (3 pts)",
            description:
              "Explains both the direct prey population surge (elk) and the indirect secondary impact on producers (willow) and downstream species (beavers).",
          },
          {
            score: 2,
            label: "Approaching (2 pts)",
            description:
              "Identifies elk increase and willow overgrazing, but misses the indirect consequence on beavers or wetland ecology.",
          },
          {
            score: 1,
            label: "Developing (1 pt)",
            description:
              "Only states that elk will increase without explaining the vegetative or aquatic cascade.",
          },
          {
            score: 0,
            label: "Incorrect (0 pts)",
            description:
              "Incorrectly claims wolf removal has no effect, or assumes energy increases for all organisms.",
          },
        ],
      },
      prerequisiteSkillIds: ["eco_trophic_levels", "eco_energy_transfer_rule"],
      difficulty: 4,
      status: "pending_approval",
      tenantOrigin: "teneo",
      createdAt: SEED_TIMESTAMP_TENEO,
      updatedAt: SEED_TIMESTAMP_TENEO,
    },
    {
      id: "eco_nutrient_cycling",
      slug: "matter-cycling-vs-energy",
      name: "Matter Cycling vs. Energy Dissipation",
      subject: "Life Science (Grade 7)",
      unitId: "unit_ecosystems_energy_flow",
      unitName: "Ecosystems & Energy Flow",
      description:
        "Contrast the closed cyclical conservation of matter (carbon and nitrogen cycles via decomposers) with the open, one-way unidirectional flow and dissipation of energy.",
      evaluationStrategy: "rubric",
      rubric: {
        title: "Matter Conservation vs. Energy Flow",
        prompt:
          "Explain why nutrients like carbon can be recycled indefinitely in a closed ecosystem, but sunlight energy must be constantly replenished.",
        sampleExemplar: "", // Thin coverage demonstration: rubric missing exemplar (Req 31a.1)
        levels: [
          {
            score: 3,
            label: "Proficient (3 pts)",
            description:
              "Clearly contrasts closed matter cycling (decomposer recycling) with open energy dissipation (thermal heat loss).",
          },
          {
            score: 2,
            label: "Approaching (2 pts)",
            description:
              "Explains that matter is recycled by decomposers, but provides only vague reasoning for why energy cannot be recycled.",
          },
          {
            score: 1,
            label: "Developing (1 pt)",
            description:
              "Mentions decomposers or the sun, but confuses the difference between matter conservation and energy flow.",
          },
          {
            score: 0,
            label: "Incorrect (0 pts)",
            description:
              "Claims energy is recycled in a circle like water, or that atoms are consumed and destroyed.",
          },
        ],
      },
      prerequisiteSkillIds: ["eco_energy_transfer_rule"],
      difficulty: 3,
      status: "pending_approval",
      tenantOrigin: "teneo",
      createdAt: SEED_TIMESTAMP_TENEO,
      updatedAt: SEED_TIMESTAMP_TENEO,
    },
    {
      id: "eco_bioaccumulation_pesticides",
      slug: "bioaccumulation-biomagnification",
      name: "Biomagnification in Aquatic Food Chains",
      subject: "Life Science (Grade 7)",
      unitId: "unit_ecosystems_energy_flow",
      unitName: "Ecosystems & Energy Flow",
      description:
        "Track concentration increases of non-biodegradable toxins across apex predator trophic levels.",
      evaluationStrategy: "exact_match",
      exactMatchSpec: {
        canonicalAnswers: ["biomagnification", "bioaccumulation"],
        acceptedVariations: ["magnification", "toxic buildup"],
      },
      prerequisiteSkillIds: ["eco_trophic_levels"],
      difficulty: 3,
      status: "draft",
      tenantOrigin: "teneo",
      createdAt: SEED_TIMESTAMP_TENEO,
      updatedAt: SEED_TIMESTAMP_TENEO,
    },
  ],
  misconceptions: [
    {
      id: "misc_energy_accumulation",
      name: "Energy Accumulation Fallacy",
      unitId: "unit_ecosystems_energy_flow",
      targetSkillIds: ["eco_energy_transfer_rule"],
      description:
        "Student believes energy accumulates as it moves up trophic levels because apex predators are 'stronger' or require more total energy.",
      sampleIncorrectAnswer:
        "The hawk has the most energy because it sits at the top of the food chain and absorbs all the energy from every animal below it.",
      remediationGuidance:
        "Highlight the 10% rule: 90% of energy is dissipated as metabolic heat at every transfer. Producers contain the highest total available energy.",
      status: "pending_approval",
      tenantOrigin: "teneo",
      createdAt: SEED_TIMESTAMP_TENEO,
      updatedAt: SEED_TIMESTAMP_TENEO,
    },
    {
      id: "misc_direct_prey_only",
      name: "Direct Prey Only Blindspot",
      unitId: "unit_ecosystems_energy_flow",
      targetSkillIds: ["eco_trophic_cascades"],
      description:
        "Student assumes removing an apex predator only affects the single species it directly eats, ignoring indirect cascades across other populations.",
      sampleIncorrectAnswer:
        "If sea otters disappear, only sea urchins are affected because otters don't eat kelp or fish.",
      remediationGuidance:
        "Prompt the student to trace the second order effect: more sea urchins will overgraze the kelp forests, destroying fish nurseries and crashing the whole reef.",
      status: "pending_approval",
      tenantOrigin: "teneo",
      createdAt: SEED_TIMESTAMP_TENEO,
      updatedAt: SEED_TIMESTAMP_TENEO,
    },
    {
      id: "misc_herbivore_energy_creation",
      name: "Herbivore Energy Creation",
      unitId: "unit_ecosystems_energy_flow",
      targetSkillIds: ["eco_trophic_levels"],
      description:
        "Student treats eating plants as creating new energy inside the animal rather than consuming and transferring stored chemical energy.",
      sampleIncorrectAnswer:
        "Cows create energy inside their bodies when they eat grass.",
      remediationGuidance:
        "Clarify that animals cannot synthesize energy; only photosynthetic autotrophs (producers) convert radiant solar energy into stored glucose.",
      status: "validated",
      validatedAt: "2026-08-20T10:00:00.000Z",
      tenantOrigin: "teneo",
      createdAt: SEED_TIMESTAMP_TENEO,
      updatedAt: SEED_TIMESTAMP_TENEO,
    },
  ],
};

/**
 * Second illustrative tenant: Oakridge Academy (Req 31a.1, 31a.7).
 * Exists purely as a content-authoring context (which unit/skill content is attached to which tenant),
 * never as operational student/teacher data. Demonstrates cross-tenant misconception patterns.
 */
export const SEED_OAKRIDGE_SCIENCE_UNIT: AuthoringUnit = {
  id: "unit_oakridge_marine_trophic_dynamics",
  name: "Marine Trophic Dynamics & Estuary Networks",
  subject: "Life Science (Grade 7)",
  description:
    "Coastal and estuary food web interactions, kelp forest keystone dynamics, and marine trophic pyramids.",
  status: "pending_approval",
  rejectionFeedback: null,
  tenantOrigin: "oakridge",
  createdAt: SEED_TIMESTAMP_OAKRIDGE,
  updatedAt: SEED_TIMESTAMP_OAKRIDGE,
  validatedAt: null,
  validatorId: null,
  skills: [
    {
      id: "oak_marine_producers",
      slug: "phytoplankton-primary-producers",
      name: "Phytoplankton & Marine Primary Production",
      subject: "Life Science (Grade 7)",
      unitId: "unit_oakridge_marine_trophic_dynamics",
      unitName: "Marine Trophic Dynamics & Estuary Networks",
      description:
        "Quantify marine primary production from phytoplankton and kelp beds as the energetic foundation of pelagic food chains.",
      evaluationStrategy: "exact_match",
      exactMatchSpec: {
        canonicalAnswers: ["phytoplankton", "kelp", "algae"],
        acceptedVariations: ["marine phytoplankton", "microalgae", "producers"],
      },
      prerequisiteSkillIds: [],
      difficulty: 2,
      status: "validated",
      validatedAt: "2026-08-22T09:00:00.000Z",
      tenantOrigin: "oakridge",
      createdAt: SEED_TIMESTAMP_OAKRIDGE,
      updatedAt: SEED_TIMESTAMP_OAKRIDGE,
    },
    {
      id: "oak_keystone_predator_balance",
      slug: "keystone-sea-otter-dynamics",
      name: "Keystone Predator Equilibrium in Marine Canopies",
      subject: "Life Science (Grade 7)",
      unitId: "unit_oakridge_marine_trophic_dynamics",
      unitName: "Marine Trophic Dynamics & Estuary Networks",
      description:
        "Model the population stability of kelp holdfasts when sea otter apex predation controls herbivorous sea urchin density.",
      evaluationStrategy: "rubric",
      rubric: {
        title: "Kelp Forest Keystone Equilibrium",
        prompt:
          "Explain why sea otters are classified as keystone species in kelp forest communities even when their total biomass is relatively small.",
        sampleExemplar:
          "Sea otters eat sea urchins, preventing urchins from overgrazing the kelp holdfasts. Without otters, urchin barrens form, collapsing the entire 3D habitat that hundreds of fish and invertebrate species rely upon.",
        levels: [
          { score: 3, label: "Proficient (3 pts)", description: "Explains disproportionate community impact via sea urchin herbivory control." },
          { score: 2, label: "Approaching (2 pts)", description: "Mentions urchins eating kelp, but does not explain the broader community collapse." },
          { score: 1, label: "Developing (1 pt)", description: "States only that otters are important predators." },
          { score: 0, label: "Incorrect (0 pts)", description: "Claims otters eat kelp directly or have no ecological impact." },
        ],
      },
      prerequisiteSkillIds: ["oak_marine_producers"],
      difficulty: 4,
      status: "pending_approval",
      tenantOrigin: "oakridge",
      createdAt: SEED_TIMESTAMP_OAKRIDGE,
      updatedAt: SEED_TIMESTAMP_OAKRIDGE,
    },
  ],
  misconceptions: [
    {
      id: "misc_oakridge_direct_prey",
      name: "Direct Prey Only Blindspot",
      unitId: "unit_oakridge_marine_trophic_dynamics",
      targetSkillIds: ["oak_keystone_predator_balance"],
      description:
        "Student assumes removing an apex predator only affects the single species it directly eats, ignoring indirect cascades across other populations.",
      sampleIncorrectAnswer:
        "If otters leave the bay, only urchins will be affected because otters do not feed on kelp or rockfish.",
      remediationGuidance:
        "Prompt the student to trace the secondary cascade: more urchins will overgraze the kelp holdfasts, destroying fish nurseries and crashing the whole reef.",
      status: "pending_approval",
      tenantOrigin: "oakridge",
      createdAt: SEED_TIMESTAMP_OAKRIDGE,
      updatedAt: SEED_TIMESTAMP_OAKRIDGE,
    },
    {
      id: "misc_oakridge_energy_accumulation",
      name: "Energy Accumulation Fallacy",
      unitId: "unit_oakridge_marine_trophic_dynamics",
      targetSkillIds: ["oak_keystone_predator_balance"],
      description:
        "Student believes energy accumulates as it moves up trophic levels because apex predators are 'stronger' or require more total energy.",
      sampleIncorrectAnswer:
        "Great white sharks have more energy than all the phytoplankton because they are at the top of the ocean.",
      remediationGuidance:
        "Reiterate the 10% ecological transfer rule: 90% of energy is lost as metabolic heat at every tier. Phytoplankton contain the largest pool of total energy.",
      status: "pending_approval",
      tenantOrigin: "oakridge",
      createdAt: SEED_TIMESTAMP_OAKRIDGE,
      updatedAt: SEED_TIMESTAMP_OAKRIDGE,
    },
  ],
};

let inMemoryUnits: AuthoringUnit[] = [
  JSON.parse(JSON.stringify(SEED_SCIENCE_UNIT)),
  JSON.parse(JSON.stringify(SEED_OAKRIDGE_SCIENCE_UNIT)),
];

export async function getContentUnits(): Promise<AuthoringUnit[]> {
  const redis = getRedis();
  if (!redis) {
    return inMemoryUnits;
  }

  try {
    const raw = await redis.get<string | AuthoringUnit[]>(REDIS_UNITS_KEY);
    if (!raw) {
      // Seed defaults
      await redis.set(REDIS_UNITS_KEY, JSON.stringify(inMemoryUnits));
      return inMemoryUnits;
    }
    const parsed =
      typeof raw === "string" ? (JSON.parse(raw) as AuthoringUnit[]) : raw;
    if (Array.isArray(parsed) && parsed.length > 0) {
      inMemoryUnits = parsed;
      return parsed;
    }
    return inMemoryUnits;
  } catch (error) {
    console.error("[pedlead-content-store] failed to get units", error);
    return inMemoryUnits;
  }
}

async function persistUnits(units: AuthoringUnit[]): Promise<void> {
  inMemoryUnits = units;
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(REDIS_UNITS_KEY, JSON.stringify(units));
    } catch (error) {
      console.error("[pedlead-content-store] failed to persist units", error);
    }
  }
}

export async function getContentUnit(unitId: string): Promise<AuthoringUnit | null> {
  const units = await getContentUnits();
  return units.find((u) => u.id === unitId) ?? null;
}

export async function saveContentUnit(unit: AuthoringUnit): Promise<AuthoringUnit> {
  const units = await getContentUnits();
  const existingIndex = units.findIndex((u) => u.id === unit.id);
  const updatedUnit: AuthoringUnit = {
    ...unit,
    updatedAt: new Date().toISOString(),
  };

  let nextUnits: AuthoringUnit[];
  if (existingIndex >= 0) {
    nextUnits = [...units];
    nextUnits[existingIndex] = updatedUnit;
  } else {
    nextUnits = [updatedUnit, ...units];
  }

  await persistUnits(nextUnits);
  return updatedUnit;
}

/**
 * Submit unit for Pedagogical Lead review (draft -> pending_approval)
 * Req 31.5, 31.7
 */
export async function submitUnitForReview(unitId: string): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const now = new Date().toISOString();
  const nextSkills = unit.skills.map((s) => {
    if (s.status === "draft") {
      return { ...s, status: "pending_approval" as ContentStatus, rejectionFeedback: null, updatedAt: now };
    }
    return s;
  });

  const nextMisconceptions = unit.misconceptions.map((m) => {
    if (m.status === "draft") {
      return { ...m, status: "pending_approval" as ContentStatus, rejectionFeedback: null, updatedAt: now };
    }
    return m;
  });

  const updated: AuthoringUnit = {
    ...unit,
    status: "pending_approval",
    rejectionFeedback: null,
    skills: nextSkills,
    misconceptions: nextMisconceptions,
    updatedAt: now,
  };

  return saveContentUnit(updated);
}

/**
 * Explicit sign-off / approval of content into 'validated' status.
 * Req 31.8 — Promotion to validated only via explicit sign-off; never automatic.
 */
export async function approveUnit(
  unitId: string,
  validatorId: string = DEMO_PEDLEAD_STAFF_ID,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const now = new Date().toISOString();
  const nextSkills = unit.skills.map((s) => {
    if (s.status === "pending_approval" || s.status === "draft") {
      return {
        ...s,
        status: "validated" as ContentStatus,
        validatorId,
        validatedAt: now,
        rejectionFeedback: null,
        updatedAt: now,
      };
    }
    return s;
  });

  const nextMisconceptions = unit.misconceptions.map((m) => {
    if (m.status === "pending_approval" || m.status === "draft") {
      return {
        ...m,
        status: "validated" as ContentStatus,
        validatedAt: now,
        rejectionFeedback: null,
        updatedAt: now,
      };
    }
    return m;
  });

  const updated: AuthoringUnit = {
    ...unit,
    status: "validated",
    validatorId,
    validatedAt: now,
    rejectionFeedback: null,
    skills: nextSkills,
    misconceptions: nextMisconceptions,
    updatedAt: now,
  };

  return saveContentUnit(updated);
}

/**
 * Reject-with-feedback: moves pending_approval item back to draft with written feedback (Req 31.8a).
 */
export async function rejectUnitWithFeedback(
  unitId: string,
  feedback: string,
  reviewerId: string = DEMO_PEDLEAD_STAFF_ID,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const now = new Date().toISOString();
  const trimmedFeedback = feedback.trim() || "Requires revisions before validation.";

  const nextSkills = unit.skills.map((s) => {
    if (s.status === "pending_approval") {
      return {
        ...s,
        status: "draft" as ContentStatus,
        rejectionFeedback: trimmedFeedback,
        updatedAt: now,
      };
    }
    return s;
  });

  const nextMisconceptions = unit.misconceptions.map((m) => {
    if (m.status === "pending_approval") {
      return {
        ...m,
        status: "draft" as ContentStatus,
        rejectionFeedback: trimmedFeedback,
        updatedAt: now,
      };
    }
    return m;
  });

  const updated: AuthoringUnit = {
    ...unit,
    status: "draft",
    rejectionFeedback: trimmedFeedback,
    skills: nextSkills,
    misconceptions: nextMisconceptions,
    updatedAt: now,
  };

  return saveContentUnit(updated);
}

/**
 * Update a skill:
 * If skill is already validated and live, staging is used for Req 31.8b
 * ("editing already-validated content needs a separate confirmation").
 */
export async function updateSkill(
  unitId: string,
  skillId: string,
  patch: Partial<Omit<AuthoringSkill, "id" | "status" | "pendingEdit">>,
  options?: { stageAsPendingEditIfValidated?: boolean },
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const skill = unit.skills.find((s) => s.id === skillId);
  if (!skill) throw new Error(`Skill ${skillId} not found in unit ${unitId}`);

  const now = new Date().toISOString();
  const isLiveValidated = skill.status === "validated";
  const stageEdit = options?.stageAsPendingEditIfValidated !== false && isLiveValidated;

  let updatedSkill: AuthoringSkill;
  if (stageEdit) {
    // Stage into pendingEdit (Req 31.8b)
    const existingPending = skill.pendingEdit ?? {};
    updatedSkill = {
      ...skill,
      pendingEdit: {
        ...existingPending,
        ...patch,
      },
      updatedAt: now,
    };
  } else {
    // Direct mutation
    updatedSkill = {
      ...skill,
      ...patch,
      updatedAt: now,
    };
  }

  const nextSkills = unit.skills.map((s) => (s.id === skillId ? updatedSkill : s));
  return saveContentUnit({ ...unit, skills: nextSkills });
}

/**
 * Confirm and apply staged live edits onto a validated skill (Req 31.8b).
 */
export async function applyLiveValidatedSkillEdit(
  unitId: string,
  skillId: string,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const skill = unit.skills.find((s) => s.id === skillId);
  if (!skill) throw new Error(`Skill ${skillId} not found`);
  if (!skill.pendingEdit) return unit;

  const now = new Date().toISOString();
  const committedSkill: AuthoringSkill = {
    ...skill,
    ...skill.pendingEdit,
    pendingEdit: null,
    updatedAt: now,
  };

  const nextSkills = unit.skills.map((s) => (s.id === skillId ? committedSkill : s));
  return saveContentUnit({ ...unit, skills: nextSkills });
}

/**
 * Discard staged live edits for a validated skill.
 */
export async function discardLiveValidatedSkillEdit(
  unitId: string,
  skillId: string,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const nextSkills = unit.skills.map((s) => {
    if (s.id === skillId) {
      return { ...s, pendingEdit: null, updatedAt: new Date().toISOString() };
    }
    return s;
  });

  return saveContentUnit({ ...unit, skills: nextSkills });
}

/**
 * Update a misconception:
 * If already validated, stages into pendingEdit (Req 31.8b).
 */
export async function updateMisconception(
  unitId: string,
  misconceptionId: string,
  patch: Partial<Omit<AuthoringMisconception, "id" | "status" | "pendingEdit">>,
  options?: { stageAsPendingEditIfValidated?: boolean },
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const misc = unit.misconceptions.find((m) => m.id === misconceptionId);
  if (!misc) throw new Error(`Misconception ${misconceptionId} not found`);

  const now = new Date().toISOString();
  const isLiveValidated = misc.status === "validated";
  const stageEdit = options?.stageAsPendingEditIfValidated !== false && isLiveValidated;

  let updatedMisc: AuthoringMisconception;
  if (stageEdit) {
    const existingPending = misc.pendingEdit ?? {};
    updatedMisc = {
      ...misc,
      pendingEdit: {
        ...existingPending,
        ...patch,
      },
      updatedAt: now,
    };
  } else {
    updatedMisc = {
      ...misc,
      ...patch,
      updatedAt: now,
    };
  }

  const nextMiscs = unit.misconceptions.map((m) => (m.id === misconceptionId ? updatedMisc : m));
  return saveContentUnit({ ...unit, misconceptions: nextMiscs });
}

export async function applyLiveValidatedMisconceptionEdit(
  unitId: string,
  misconceptionId: string,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const misc = unit.misconceptions.find((m) => m.id === misconceptionId);
  if (!misc || !misc.pendingEdit) return unit;

  const now = new Date().toISOString();
  const committedMisc: AuthoringMisconception = {
    ...misc,
    ...misc.pendingEdit,
    pendingEdit: null,
    updatedAt: now,
  };

  const nextMiscs = unit.misconceptions.map((m) => (m.id === misconceptionId ? committedMisc : m));
  return saveContentUnit({ ...unit, misconceptions: nextMiscs });
}

export async function discardLiveValidatedMisconceptionEdit(
  unitId: string,
  misconceptionId: string,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const nextMiscs = unit.misconceptions.map((m) => {
    if (m.id === misconceptionId) {
      return { ...m, pendingEdit: null, updatedAt: new Date().toISOString() };
    }
    return m;
  });

  return saveContentUnit({ ...unit, misconceptions: nextMiscs });
}

/**
 * Split a skill into two distinct sub-skills (Req 31.9).
 */
export async function splitSkill(
  unitId: string,
  skillIdToSplit: string,
  skillA: Omit<AuthoringSkill, "id" | "createdAt" | "updatedAt">,
  skillB: Omit<AuthoringSkill, "id" | "createdAt" | "updatedAt">,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const existingIndex = unit.skills.findIndex((s) => s.id === skillIdToSplit);
  if (existingIndex < 0) throw new Error(`Skill ${skillIdToSplit} not found`);

  const now = new Date().toISOString();
  const idA = `${skillIdToSplit}_part1`;
  const idB = `${skillIdToSplit}_part2`;

  const newSkillA: AuthoringSkill = {
    ...skillA,
    id: idA,
    unitId: unit.id,
    unitName: unit.name,
    createdAt: now,
    updatedAt: now,
  };

  const newSkillB: AuthoringSkill = {
    ...skillB,
    id: idB,
    unitId: unit.id,
    unitName: unit.name,
    createdAt: now,
    updatedAt: now,
  };

  const nextSkills = [...unit.skills];
  nextSkills.splice(existingIndex, 1, newSkillA, newSkillB);

  // Update any misconception that targeted skillIdToSplit
  const nextMiscs = unit.misconceptions.map((m) => {
    if (m.targetSkillIds.includes(skillIdToSplit)) {
      const filtered = m.targetSkillIds.filter((id) => id !== skillIdToSplit);
      return {
        ...m,
        targetSkillIds: [...filtered, idA, idB],
        updatedAt: now,
      };
    }
    return m;
  });

  return saveContentUnit({ ...unit, skills: nextSkills, misconceptions: nextMiscs });
}

/**
 * Merge two skills into one comprehensive skill (Req 31.9).
 */
export async function mergeSkills(
  unitId: string,
  skillIdA: string,
  skillIdB: string,
  merged: Omit<AuthoringSkill, "id" | "createdAt" | "updatedAt">,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const indexA = unit.skills.findIndex((s) => s.id === skillIdA);
  const indexB = unit.skills.findIndex((s) => s.id === skillIdB);
  if (indexA < 0 || indexB < 0) throw new Error("One or both skills to merge not found");

  const now = new Date().toISOString();
  const mergedId = `${skillIdA}_${skillIdB}_merged`;

  const mergedSkill: AuthoringSkill = {
    ...merged,
    id: mergedId,
    unitId: unit.id,
    unitName: unit.name,
    createdAt: now,
    updatedAt: now,
  };

  const nextSkills = unit.skills
    .filter((s) => s.id !== skillIdA && s.id !== skillIdB)
    .concat(mergedSkill);

  // Remap prerequisites
  for (const skill of nextSkills) {
    if (skill.prerequisiteSkillIds.includes(skillIdA) || skill.prerequisiteSkillIds.includes(skillIdB)) {
      const filtered = skill.prerequisiteSkillIds.filter((id) => id !== skillIdA && id !== skillIdB);
      skill.prerequisiteSkillIds = Array.from(new Set([...filtered, mergedId]));
    }
  }

  // Remap misconceptions
  const nextMiscs = unit.misconceptions.map((m) => {
    if (m.targetSkillIds.includes(skillIdA) || m.targetSkillIds.includes(skillIdB)) {
      const filtered = m.targetSkillIds.filter((id) => id !== skillIdA && id !== skillIdB);
      return {
        ...m,
        targetSkillIds: Array.from(new Set([...filtered, mergedId])),
        updatedAt: now,
      };
    }
    return m;
  });

  return saveContentUnit({ ...unit, skills: nextSkills, misconceptions: nextMiscs });
}

export async function addSkill(
  unitId: string,
  skill: Omit<AuthoringSkill, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const now = new Date().toISOString();
  const id = skill.id || `skill_${Date.now().toString(36)}`;
  const newSkill: AuthoringSkill = {
    ...skill,
    id,
    unitId: unit.id,
    unitName: unit.name,
    createdAt: now,
    updatedAt: now,
  };

  return saveContentUnit({
    ...unit,
    skills: [...unit.skills, newSkill],
  });
}

export async function deleteSkill(unitId: string, skillId: string): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const nextSkills = unit.skills.filter((s) => s.id !== skillId);
  // Clean references in prerequisites
  for (const s of nextSkills) {
    s.prerequisiteSkillIds = s.prerequisiteSkillIds.filter((id) => id !== skillId);
  }

  const nextMiscs = unit.misconceptions.map((m) => ({
    ...m,
    targetSkillIds: m.targetSkillIds.filter((id) => id !== skillId),
  }));

  return saveContentUnit({ ...unit, skills: nextSkills, misconceptions: nextMiscs });
}

export async function addMisconception(
  unitId: string,
  misc: Omit<AuthoringMisconception, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const now = new Date().toISOString();
  const id = misc.id || `misc_${Date.now().toString(36)}`;
  const newMisc: AuthoringMisconception = {
    ...misc,
    id,
    unitId: unit.id,
    createdAt: now,
    updatedAt: now,
  };

  return saveContentUnit({
    ...unit,
    misconceptions: [...unit.misconceptions, newMisc],
  });
}

export async function deleteMisconception(
  unitId: string,
  misconceptionId: string,
): Promise<AuthoringUnit> {
  const unit = await getContentUnit(unitId);
  if (!unit) throw new Error(`Unit ${unitId} not found`);

  const nextMiscs = unit.misconceptions.filter((m) => m.id !== misconceptionId);
  return saveContentUnit({ ...unit, misconceptions: nextMiscs });
}

/**
 * Reset content store back to initial seed data.
 */
export async function resetContentStore(): Promise<AuthoringUnit[]> {
  const fresh: AuthoringUnit[] = [
    JSON.parse(JSON.stringify(SEED_SCIENCE_UNIT)),
    JSON.parse(JSON.stringify(SEED_OAKRIDGE_SCIENCE_UNIT)),
  ];
  await persistUnits(fresh);
  return fresh;
}
