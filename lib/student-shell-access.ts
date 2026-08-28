/**
 * Student shell access — Req 14.3 enforcement entry point.
 *
 * Resolves the demo student's effective Space and blocks when Admin has disabled
 * Platform access for that pilot Space via isPilotSpaceEnabled().
 */

import {
  checkStudentShellAccess,
  isPilotSpaceEnabled,
  type StudentShellAccessResult,
} from "@/lib/admin-pilot-store";
import { DEMO_SESSION_STUDENT_ID } from "@/lib/demo-data/roster";
import { getEffectiveSpaceId } from "@/lib/space-store";

export { checkStudentShellAccess, isPilotSpaceEnabled };
export type { StudentShellAccessResult };

const STUDENT_PAGE_PREFIXES = ["/student", "/practice"] as const;

const STUDENT_API_PREFIXES = ["/api/student"] as const;

const STUDENT_AI_TASKS = new Set([
  "intro",
  "worked_lens",
  "hint",
  "practice_ask",
  "rubric_grade",
  "today_ask",
  "learn_ask",
  "progress_ask",
]);

export function isStudentShellPagePath(pathname: string): boolean {
  return STUDENT_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isStudentShellApiPath(pathname: string, method = "GET"): boolean {
  if (
    STUDENT_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  return pathname === "/api/distress" && method === "POST";
}

export function isStudentAiTask(task: string): boolean {
  return STUDENT_AI_TASKS.has(task);
}

/** Same resolution path the shell uses — effective Space + pilot enable flag. */
export async function resolveStudentShellAccess(
  studentId: string = DEMO_SESSION_STUDENT_ID,
): Promise<StudentShellAccessResult> {
  return checkStudentShellAccess(studentId);
}

/** JSON body for API routes and proxy denials. */
export function studentShellAccessDeniedBody(
  access: Extract<StudentShellAccessResult, { allowed: false }>,
) {
  return {
    error: access.message,
    code: "pilot_space_disabled" as const,
    spaceId: access.spaceId,
    spaceName: access.spaceName,
  };
}

/** Convenience for diagnostics — confirms which Space and flag drove the decision. */
export async function studentShellAccessDebug(
  studentId: string = DEMO_SESSION_STUDENT_ID,
): Promise<{
  studentId: string;
  effectiveSpaceId: string | null;
  pilotSpaceEnabled: boolean | null;
}> {
  const effectiveSpaceId = await getEffectiveSpaceId(studentId);
  const pilotSpaceEnabled =
    effectiveSpaceId == null ? null : await isPilotSpaceEnabled(effectiveSpaceId);
  return { studentId, effectiveSpaceId, pilotSpaceEnabled };
}
