import {
  OVERVIEW_MISCONCEPTION_AGGREGATES,
  ROSTER_LMS_FRESHNESS,
  type RosterStudent,
  misconceptionsForStudent,
} from "@/lib/demo-data/roster";
import { OVERVIEW_SKILL_COLUMNS } from "@/lib/demo-data/overview-skills";
import { getTeacherSpace } from "@/lib/demo-data/teacher-spaces";
import type { MasteryTier } from "@/lib/demo-data/types";
import { TIER_FILL_PCT } from "@/lib/mastery-overview-labels";
import { TIER_STYLE } from "@/lib/demo-data/skills";
import type { MasteryOverrideRecord } from "@/lib/demo-data/roster";
import {
  getEffectiveStudent,
  listActiveOverrides,
  listEffectiveStudents,
  listOverrideHistory,
  type OverrideHistoryEntry,
} from "@/lib/override-store";
import { getSpace, listSpaces, teacherSpaceScopeLabelAsync } from "@/lib/space-store";

export interface MasteryCell {
  skillId: string;
  skillName: string;
  skillShort: string;
  tier: MasteryTier;
  label: string;
  fillPct: number;
  bg: string;
  dot: string;
  isGap: boolean;
  isOverride: boolean;
}

export interface MasteryOverviewStudent {
  id: string;
  fullName: string;
  spaceId: string;
  spaceShort: string;
  activityLabel: string;
  isLive: boolean;
  cells: MasteryCell[];
  flaggedSkillIds: string[];
  misconceptions: RosterStudent["misconceptions"];
  /** Primary/oldest active override — Briefing revisit compatibility. */
  override: RosterStudent["override"];
  activeOverrides: NonNullable<RosterStudent["override"]>[];
  overrideHistory: OverrideHistoryEntry[];
  recentSessions: RosterStudent["recentSessions"];
  escalationNote: string | null;
}

export interface MasteryOverviewPayload {
  refreshedAt: string;
  scopeLabel: string;
  rosterFreshness: typeof ROSTER_LMS_FRESHNESS;
  liveCount: number;
  spaces: { id: string; name: string; shortName: string }[];
  skills: typeof OVERVIEW_SKILL_COLUMNS;
  students: MasteryOverviewStudent[];
  gapAlerts: { studentId: string; studentName: string; skillId: string; skillName: string }[];
  misconceptions: { id: string; label: string; skillName: string; studentCount: number }[];
  legend: { tier: MasteryTier; label: string; fillPct: number; bg: string; dot: string }[];
}

function buildCell(
  student: RosterStudent,
  skillId: string,
  tier: MasteryTier,
  activeOverrides: MasteryOverrideRecord[],
): MasteryCell {
  const column = OVERVIEW_SKILL_COLUMNS.find((skill) => skill.id === skillId);
  const style = TIER_STYLE[tier];
  const isGap = student.flaggedSkillIds.includes(skillId);
  const isOverride = activeOverrides.some((entry) => entry.skillId === skillId);
  return {
    skillId,
    skillName: column?.name ?? skillId,
    skillShort: column?.short ?? skillId,
    tier,
    label: style.label,
    fillPct: TIER_FILL_PCT[tier],
    bg: style.badgeBg,
    dot: style.dotBg,
    isGap,
    isOverride,
  };
}

function buildGapAlerts(students: RosterStudent[]) {
  return students.flatMap((student) =>
    student.flaggedSkillIds.map((skillId) => {
      const skill = OVERVIEW_SKILL_COLUMNS.find((column) => column.id === skillId);
      return {
        studentId: student.id,
        studentName: student.fullName,
        skillId,
        skillName: skill?.name ?? skillId,
      };
    }),
  );
}

function buildMisconceptionAggregates(students: RosterStudent[]) {
  const visibleIds = new Set(students.map((student) => student.id));
  return OVERVIEW_MISCONCEPTION_AGGREGATES.map((entry) => ({
    id: entry.id,
    label: entry.label,
    skillName: entry.skillName,
    studentCount: entry.studentIds.filter((id) => visibleIds.has(id)).length,
  })).filter((entry) => entry.studentCount > 0);
}

/** Live-activity overlay — practicing students stay live; timestamps refresh on poll. */
function applyLiveOverlay(students: RosterStudent[]): RosterStudent[] {
  const now = Date.now();
  return students.map((student) => {
    if (student.isLive) {
      return {
        ...student,
        activityLabel: "Practicing now",
        lastActivityAt: new Date(now).toISOString(),
      };
    }
    return student;
  });
}

async function toOverviewStudent(student: RosterStudent): Promise<MasteryOverviewStudent> {
  const managed = await getSpace(student.spaceId);
  const space = managed ?? getTeacherSpace(student.spaceId);
  const [activeOverrides, overrideHistory] = await Promise.all([
    listActiveOverrides(student.id),
    listOverrideHistory(student.id),
  ]);
  return {
    id: student.id,
    fullName: student.fullName,
    spaceId: student.spaceId,
    spaceShort: space?.shortName ?? student.spaceId,
    activityLabel: student.activityLabel,
    isLive: student.isLive,
    cells: OVERVIEW_SKILL_COLUMNS.map((skill, index) =>
      buildCell(student, skill.id, student.tiers[index] ?? "not_attempted", activeOverrides),
    ),
    flaggedSkillIds: student.flaggedSkillIds,
    misconceptions: misconceptionsForStudent(student),
    override: student.override,
    activeOverrides,
    overrideHistory,
    recentSessions: student.recentSessions,
    escalationNote: student.escalationNote,
  };
}

export async function buildMasteryOverview(
  spaceFilter: string | null,
): Promise<MasteryOverviewPayload> {
  const filtered = applyLiveOverlay(await listEffectiveStudents(spaceFilter));
  const students = await Promise.all(filtered.map((student) => toOverviewStudent(student)));
  const managedSpaces = await listSpaces();

  const legend = (Object.keys(TIER_STYLE) as MasteryTier[]).map((tier) => ({
    tier,
    label: TIER_STYLE[tier].label,
    fillPct: TIER_FILL_PCT[tier],
    bg: TIER_STYLE[tier].badgeBg,
    dot: TIER_STYLE[tier].dotBg,
  }));

  return {
    refreshedAt: new Date().toISOString(),
    scopeLabel: await teacherSpaceScopeLabelAsync(spaceFilter),
    rosterFreshness: ROSTER_LMS_FRESHNESS,
    liveCount: students.filter((student) => student.isLive).length,
    spaces: managedSpaces.map((space) => ({
      id: space.id,
      name: space.name,
      shortName: space.shortName,
    })),
    skills: OVERVIEW_SKILL_COLUMNS,
    students,
    gapAlerts: buildGapAlerts(filtered),
    misconceptions: buildMisconceptionAggregates(filtered),
    legend,
  };
}

export async function getMasteryOverviewStudent(
  studentId: string,
  spaceFilter: string | null,
): Promise<MasteryOverviewStudent | null> {
  const overview = await buildMasteryOverview(spaceFilter);
  return overview.students.find((student) => student.id === studentId) ?? null;
}

export async function getEffectiveOverviewStudent(
  studentId: string,
): Promise<MasteryOverviewStudent | null> {
  const student = await getEffectiveStudent(studentId);
  if (!student) return null;
  return toOverviewStudent(student);
}
