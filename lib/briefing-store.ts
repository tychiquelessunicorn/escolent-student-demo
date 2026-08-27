/**
 * Teacher Briefing — synthesis over existing roster, misconception aggregates,
 * overrides, and distress escalations. No parallel "briefing items" inventing.
 */

import {
  OVERVIEW_MISCONCEPTION_AGGREGATES,
  getRosterStudent,
  type RosterStudent,
} from "@/lib/demo-data/roster";
import { OVERVIEW_SKILL_COLUMNS } from "@/lib/demo-data/overview-skills";
import { getTeacherSpace, teacherSpaceScopeLabel } from "@/lib/demo-data/teacher-spaces";
import type { EscalationRecord } from "@/lib/distress";
import { listEscalations, seedEscalationsIfEmpty } from "@/lib/distress-store";
import { getEffectiveStudent, listEffectiveStudents } from "@/lib/override-store";

export type BriefingState =
  | "populated"
  | "no_spaces"
  | "insufficient_data"
  | "all_clear";

export type BriefingCategory =
  | "escalation_pending"
  | "struggling_students"
  | "misconception_spike"
  | "override_revisit"
  | "low_priority";

export type BriefingUrgency = "urgent" | "informational";

export interface BriefingAffectedStudent {
  id: string;
  fullName: string;
  href: string;
}

export interface BriefingItem {
  id: string;
  category: BriefingCategory;
  urgency: BriefingUrgency;
  spaceId: string | null;
  spaceLabel: string;
  title: string;
  detail: string;
  /** Deep link when the item concerns one record; null when a set must be chosen first. */
  actionRoute: string | null;
  affectedStudents: BriefingAffectedStudent[];
}

export interface TeacherBriefing {
  state: BriefingState;
  scopeLabel: string;
  computedAt: string;
  items: BriefingItem[];
  /** Present when state is all_clear — never dressed as urgent. */
  lowPriority: BriefingItem[];
}

const OVERRIDE_REVISIT_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function skillName(skillId: string): string {
  return OVERVIEW_SKILL_COLUMNS.find((skill) => skill.id === skillId)?.name ?? skillId;
}

function spaceLabel(spaceId: string | null): string {
  if (!spaceId) return "Across your Spaces";
  return getTeacherSpace(spaceId)?.name ?? spaceId;
}

function formatNameList(names: string[]): string {
  if (names.length === 0) return "Students";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.length} students`;
}

function studentHref(studentId: string): string {
  return `/teacher/overview?student=${encodeURIComponent(studentId)}`;
}

function toAffected(students: RosterStudent[]): BriefingAffectedStudent[] {
  return students.map((student) => ({
    id: student.id,
    fullName: student.fullName,
    href: studentHref(student.id),
  }));
}

async function matchRosterByName(fullName: string): Promise<RosterStudent | null> {
  const roster = await listEffectiveStudents(null);
  return roster.find((student) => student.fullName === fullName) ?? null;
}

async function buildEscalationItems(
  records: EscalationRecord[],
  spaceFilter: string | null,
): Promise<BriefingItem[]> {
  const pending = records.filter((record) => !record.acknowledgedBy);
  const items: BriefingItem[] = [];

  for (const record of pending) {
    const roster = await matchRosterByName(record.student);
    if (spaceFilter && roster && roster.spaceId !== spaceFilter) continue;
    if (spaceFilter && !roster) continue;

    const spaceId = roster?.spaceId ?? null;
    items.push({
      id: `escalation:${record.id}`,
      category: "escalation_pending",
      urgency: "urgent",
      spaceId,
      spaceLabel: spaceLabel(spaceId),
      title: `${record.student} may need support.`,
      detail: record.helpReason
        ? `Asked for help: “${record.helpReason}” — not yet acknowledged.`
        : record.text
          ? "Flagged from free-text — still unresolved."
          : "Pending escalation — still unresolved.",
      actionRoute: `/teacher/escalations/${record.id}`,
      affectedStudents: roster
        ? toAffected([roster])
        : [{ id: record.id, fullName: record.student, href: `/teacher/escalations/${record.id}` }],
    });
  }

  return items;
}

async function buildMisconceptionItems(spaceFilter: string | null): Promise<BriefingItem[]> {
  const items: BriefingItem[] = [];

  for (const aggregate of OVERVIEW_MISCONCEPTION_AGGREGATES) {
    const resolved = await Promise.all(
      aggregate.studentIds.map(async (id) => (await getEffectiveStudent(id)) ?? getRosterStudent(id)),
    );
    const students = resolved
      .filter((student): student is RosterStudent => Boolean(student))
      .filter((student) => !spaceFilter || student.spaceId === spaceFilter);

    if (students.length < 2) continue;

    const spaceIds = [...new Set(students.map((student) => student.spaceId))];
    const itemSpaceId = spaceIds.length === 1 ? spaceIds[0] : null;
    const itemSpaceLabel =
      spaceIds.length === 1
        ? spaceLabel(spaceIds[0])
        : spaceIds
            .map((id) => getTeacherSpace(id)?.name)
            .filter(Boolean)
            .join(" · ");

    const names = students.map((student) => student.fullName);
    items.push({
      id: `misconception:${aggregate.id}:${itemSpaceId ?? "multi"}`,
      category: "misconception_spike",
      urgency: "informational",
      spaceId: itemSpaceId,
      spaceLabel: itemSpaceLabel,
      title: `${formatNameList(names)} show the same misconception on ${skillName(aggregate.skillId).toLowerCase()}.`,
      detail: `${aggregate.label} — ${students.length} students this week.`,
      actionRoute: null,
      affectedStudents: toAffected(students),
    });
  }

  return items;
}

async function buildStrugglingItems(spaceFilter: string | null): Promise<BriefingItem[]> {
  const roster = await listEffectiveStudents(spaceFilter);
  const groups = new Map<string, { skillId: string; spaceId: string; students: RosterStudent[] }>();

  for (const student of roster) {
    student.tiers.forEach((tier, index) => {
      const skillId = OVERVIEW_SKILL_COLUMNS[index]?.id;
      if (!skillId) return;
      const flagged = student.flaggedSkillIds.includes(skillId);
      if (tier !== "struggling" && !flagged) return;
      const key = `${student.spaceId}:${skillId}`;
      const existing = groups.get(key);
      if (existing) {
        if (!existing.students.some((entry) => entry.id === student.id)) {
          existing.students.push(student);
        }
      } else {
        groups.set(key, { skillId, spaceId: student.spaceId, students: [student] });
      }
    });
  }

  const items: BriefingItem[] = [];
  for (const group of groups.values()) {
    const names = group.students.map((student) => student.fullName);
    const skill = skillName(group.skillId);
    const isGap = group.students.some((student) =>
      student.flaggedSkillIds.includes(group.skillId),
    );
    items.push({
      id: `struggling:${group.spaceId}:${group.skillId}`,
      category: "struggling_students",
      urgency: "urgent",
      spaceId: group.spaceId,
      spaceLabel: spaceLabel(group.spaceId),
      title:
        group.students.length === 1
          ? `${names[0]} is struggling on ${skill.toLowerCase()}.`
          : `${formatNameList(names)} are stuck on ${skill.toLowerCase()}.`,
      detail: isGap
        ? "Includes a flagged prerequisite gap — worth reinforcing before the unit moves on."
        : "Still struggling — worth a check-in before the unit moves on.",
      actionRoute: group.students.length === 1 ? studentHref(group.students[0].id) : null,
      affectedStudents: toAffected(group.students),
    });
  }

  return items;
}

async function buildOverrideItems(spaceFilter: string | null): Promise<BriefingItem[]> {
  const now = Date.now();
  const items: BriefingItem[] = [];

  for (const student of await listEffectiveStudents(spaceFilter)) {
    if (!student.override) continue;
    const ageMs = now - new Date(student.override.appliedAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs < OVERRIDE_REVISIT_DAYS * MS_PER_DAY) continue;

    const days = Math.floor(ageMs / MS_PER_DAY);
    items.push({
      id: `override:${student.id}:${student.override.skillId}`,
      category: "override_revisit",
      urgency: "informational",
      spaceId: student.spaceId,
      spaceLabel: spaceLabel(student.spaceId),
      title: `${student.fullName}'s override is due for a check.`,
      detail: `${skillName(student.override.skillId)} — overridden ${days} days ago. Confirm or reassess.`,
      actionRoute: `/teacher/overview?student=${encodeURIComponent(student.id)}&overrideSkill=${encodeURIComponent(student.override.skillId)}&overrideMode=revisit`,
      affectedStudents: toAffected([student]),
    });
  }

  return items;
}

async function buildLowPriority(spaceFilter: string | null): Promise<BriefingItem[]> {
  // Soft signal for all_clear: someone tentative on a mid-unit skill, not urgent.
  const candidates = (await listEffectiveStudents(spaceFilter)).filter((student) => {
    const multiStep = student.tiers[4];
    return multiStep === "emerging" || multiStep === "tentative";
  });
  if (candidates.length === 0) return [];
  const student = candidates[0];
  return [
    {
      id: `low:${student.id}:s4`,
      category: "low_priority",
      urgency: "informational",
      spaceId: student.spaceId,
      spaceLabel: spaceLabel(student.spaceId),
      title: `${student.fullName} is still building multi-step equations.`,
      detail: "Not flagged — a quiet glance, not something that needs attention today.",
      actionRoute: studentHref(student.id),
      affectedStudents: toAffected([student]),
    },
  ];
}

function sortItems(items: BriefingItem[]): BriefingItem[] {
  const urgencyRank = { urgent: 0, informational: 1 };
  const categoryRank: Record<BriefingCategory, number> = {
    escalation_pending: 0,
    struggling_students: 1,
    misconception_spike: 2,
    override_revisit: 3,
    low_priority: 4,
  };
  return [...items].sort((a, b) => {
    const byUrgency = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (byUrgency !== 0) return byUrgency;
    return categoryRank[a.category] - categoryRank[b.category];
  });
}

export type BriefingDemoState = BriefingState | "auto";

/**
 * Pending escalations — same builder Briefing uses. Teacher Today must call
 * this rather than inventing a parallel pending list (Req 10a.1).
 */
export async function listPendingEscalationItems(
  spaceFilter: string | null = null,
): Promise<BriefingItem[]> {
  await seedEscalationsIfEmpty();
  const escalations = await listEscalations();
  return buildEscalationItems(escalations, spaceFilter);
}

/**
 * Overrides past the revisit window — same builder Briefing uses.
 */
export async function listOverrideRevisitItems(
  spaceFilter: string | null = null,
): Promise<BriefingItem[]> {
  return buildOverrideItems(spaceFilter);
}

export async function buildTeacherBriefing(options: {
  spaceFilter?: string | null;
  /** Harness override — when not auto, short-circuits synthesis for edge demos. */
  demoState?: BriefingDemoState;
}): Promise<TeacherBriefing> {
  const spaceFilter = options.spaceFilter ?? null;
  const demoState = options.demoState ?? "auto";
  const scopeLabel = teacherSpaceScopeLabel(spaceFilter);
  const computedAt = new Date().toISOString();

  if (demoState === "no_spaces") {
    return {
      state: "no_spaces",
      scopeLabel: "No Spaces yet",
      computedAt,
      items: [],
      lowPriority: [],
    };
  }

  if (demoState === "insufficient_data") {
    return {
      state: "insufficient_data",
      scopeLabel,
      computedAt,
      items: [],
      lowPriority: [],
    };
  }

  if (demoState === "all_clear") {
    return {
      state: "all_clear",
      scopeLabel,
      computedAt,
      items: [],
      lowPriority: await buildLowPriority(spaceFilter),
    };
  }

  const items = sortItems([
    ...(await listPendingEscalationItems(spaceFilter)),
    ...(await buildStrugglingItems(spaceFilter)),
    ...(await buildMisconceptionItems(spaceFilter)),
    ...(await listOverrideRevisitItems(spaceFilter)),
  ]);

  // Forced populated harness: keep real items even if somehow empty.
  if (demoState === "populated" || demoState === "auto") {
    if (items.length === 0) {
      return {
        state: "all_clear",
        scopeLabel,
        computedAt,
        items: [],
        lowPriority: await buildLowPriority(spaceFilter),
      };
    }
    return {
      state: "populated",
      scopeLabel,
      computedAt,
      items,
      lowPriority: [],
    };
  }

  return {
    state: "populated",
    scopeLabel,
    computedAt,
    items,
    lowPriority: [],
  };
}
