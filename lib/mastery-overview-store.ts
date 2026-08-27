import {
  OVERVIEW_MISCONCEPTION_AGGREGATES,
  ROSTER_LMS_FRESHNESS,
  type RosterStudent,
  misconceptionsForStudent,
  rosterStudentsForSpace,
} from "@/lib/demo-data/roster";
import { OVERVIEW_SKILL_COLUMNS } from "@/lib/demo-data/overview-skills";
import { TEACHER_SPACES, teacherSpaceScopeLabel, getTeacherSpace } from "@/lib/demo-data/teacher-spaces";
import type { MasteryTier } from "@/lib/demo-data/types";
import { TIER_FILL_PCT } from "@/lib/mastery-overview-labels";
import { TIER_STYLE } from "@/lib/demo-data/skills";

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
  override: RosterStudent["override"];
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

function buildCell(student: RosterStudent, skillId: string, tier: MasteryTier): MasteryCell {
  const column = OVERVIEW_SKILL_COLUMNS.find((skill) => skill.id === skillId);
  const style = TIER_STYLE[tier];
  const isGap = student.flaggedSkillIds.includes(skillId);
  const isOverride = student.override?.skillId === skillId;
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

export function buildMasteryOverview(spaceFilter: string | null): MasteryOverviewPayload {
  const filtered = applyLiveOverlay(rosterStudentsForSpace(spaceFilter));
  const students: MasteryOverviewStudent[] = filtered.map((student) => {
    const space = getTeacherSpace(student.spaceId);
    return {
      id: student.id,
      fullName: student.fullName,
      spaceId: student.spaceId,
      spaceShort: space?.shortName ?? student.spaceId,
      activityLabel: student.activityLabel,
      isLive: student.isLive,
      cells: OVERVIEW_SKILL_COLUMNS.map((skill, index) =>
        buildCell(student, skill.id, student.tiers[index] ?? "not_attempted"),
      ),
      flaggedSkillIds: student.flaggedSkillIds,
      misconceptions: misconceptionsForStudent(student),
      override: student.override,
      recentSessions: student.recentSessions,
      escalationNote: student.escalationNote,
    };
  });

  const legend = (Object.keys(TIER_STYLE) as MasteryTier[]).map((tier) => ({
    tier,
    label: TIER_STYLE[tier].label,
    fillPct: TIER_FILL_PCT[tier],
    bg: TIER_STYLE[tier].badgeBg,
    dot: TIER_STYLE[tier].dotBg,
  }));

  return {
    refreshedAt: new Date().toISOString(),
    scopeLabel: teacherSpaceScopeLabel(spaceFilter),
    rosterFreshness: ROSTER_LMS_FRESHNESS,
    liveCount: students.filter((student) => student.isLive).length,
    spaces: TEACHER_SPACES.map((space) => ({
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

export function getMasteryOverviewStudent(
  studentId: string,
  spaceFilter: string | null,
): MasteryOverviewStudent | null {
  const overview = buildMasteryOverview(spaceFilter);
  return overview.students.find((student) => student.id === studentId) ?? null;
}
