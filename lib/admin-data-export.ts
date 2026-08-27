/**
 * Admin CSV exports — Req 16.
 */

import { OVERVIEW_SKILL_COLUMNS } from "@/lib/demo-data/overview-skills";
import { listExportStudents } from "@/lib/student-data-store";

function csvEscape(value: string | number | boolean | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export async function buildInteractionExportCsv(): Promise<string> {
  const students = await listExportStudents();
  const rows: string[][] = [];

  for (const student of students) {
    if (student.misconceptions.length === 0) {
      rows.push([
        student.id,
        student.fullName,
        student.spaceId,
        "",
        "",
        "",
        student.activityLabel,
        student.lastActivityAt,
      ]);
      continue;
    }
    for (const misc of student.misconceptions) {
      rows.push([
        student.id,
        student.fullName,
        student.spaceId,
        misc.skillId,
        misc.label,
        misc.observedAt,
        student.activityLabel,
        student.lastActivityAt,
      ]);
    }
  }

  return toCsv(
    [
      "student_id",
      "student_name",
      "space_id",
      "skill_id",
      "interaction_summary",
      "observed_at",
      "activity_label",
      "last_activity_at",
    ],
    rows,
  );
}

export async function buildMasteryExportCsv(): Promise<string> {
  const students = await listExportStudents();
  const rows: string[][] = [];

  for (const student of students) {
    student.tiers.forEach((tier, index) => {
      const skill = OVERVIEW_SKILL_COLUMNS[index];
      if (!skill) return;
      rows.push([
        student.id,
        student.fullName,
        student.spaceId,
        skill.id,
        skill.name,
        tier,
        student.flaggedSkillIds.includes(skill.id) ? "yes" : "no",
        student.override?.skillId === skill.id ? student.override.reason : "",
      ]);
    });
  }

  return toCsv(
    [
      "student_id",
      "student_name",
      "space_id",
      "skill_id",
      "skill_name",
      "mastery_tier",
      "prerequisite_gap",
      "teacher_override_note",
    ],
    rows,
  );
}

export async function buildSessionHistoryExportCsv(): Promise<string> {
  const students = await listExportStudents();
  const rows: string[][] = [];

  for (const student of students) {
    if (student.recentSessions.length === 0) {
      rows.push([student.id, student.fullName, "", "", "", ""]);
      continue;
    }
    for (const session of student.recentSessions) {
      rows.push([
        student.id,
        student.fullName,
        session.date,
        session.title,
        session.result,
        session.durationMinutes,
        session.problemsAttempted,
      ].map((cell) => String(cell)));
    }
  }

  return toCsv(
    [
      "student_id",
      "student_name",
      "session_date",
      "session_title",
      "session_result",
      "duration_minutes",
      "problems_attempted",
    ],
    rows,
  );
}

export type ExportKind = "interactions" | "mastery" | "sessions";

export async function buildExportCsv(kind: ExportKind): Promise<{ filename: string; body: string }> {
  switch (kind) {
    case "interactions":
      return {
        filename: "escolent-interactions.csv",
        body: await buildInteractionExportCsv(),
      };
    case "mastery":
      return {
        filename: "escolent-mastery.csv",
        body: await buildMasteryExportCsv(),
      };
    case "sessions":
      return {
        filename: "escolent-session-history.csv",
        body: await buildSessionHistoryExportCsv(),
      };
  }
}
