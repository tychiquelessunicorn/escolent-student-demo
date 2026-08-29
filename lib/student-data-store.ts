/**
 * Student personal data lifecycle — Req 16 export source + Req 17 deletion.
 *
 * Baseline roster lives in demo-data; deletions overlay in Redis. Analytics
 * retains anonymized tier/session contributions (17.4) without recomputing
 * aggregates downward when a student is removed.
 */

import { randomUUID } from "crypto";
import {
  ROSTER,
  getRosterStudent,
  type RosterStudent,
} from "@/lib/demo-data/roster";
import { getPrimaryAdmin } from "@/lib/demo-data/staff";
import type { MasteryTier, SessionRecord } from "@/lib/demo-data/types";
import { getEffectiveStudent, listEffectiveStudents } from "@/lib/override-store";
import { getRedis } from "@/lib/rate-limit";

export const DELETION_HOLD_MS = 72 * 60 * 60 * 1000;

export type DataDeletionStatus = "pending" | "complete";

export interface DataDeletionRequest {
  id: string;
  studentId: string;
  studentName: string;
  initiatedBy: "admin";
  adminId: string;
  status: DataDeletionStatus;
  requestedAt: string;
  scheduledCompletionAt: string;
  completedAt: string | null;
  plainLanguageTrigger: string | null;
}

const DELETED_STUDENTS_KEY = "escolent:student-data:deleted-ids";
const ANONYMOUS_TIERS_KEY = "escolent:student-data:anonymous-tiers";
const ANONYMOUS_SESSIONS_KEY = "escolent:student-data:anonymous-sessions";
const DELETION_REQUESTS_KEY = "escolent:student-data:deletion-requests";
const DELETION_DEMO_ELAPSED_KEY = "escolent:student-data:deletion-demo-elapsed";

/** Original pilot roster size — analytics denominators stay stable after deletion (17.4). */
export const BASELINE_ROSTER_SIZE = ROSTER.length;

function normalizeRequest(raw: unknown): DataDeletionRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<DataDeletionRequest>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.studentId !== "string" ||
    typeof entry.studentName !== "string" ||
    typeof entry.adminId !== "string" ||
    typeof entry.requestedAt !== "string" ||
    typeof entry.scheduledCompletionAt !== "string"
  ) {
    return null;
  }
  if (entry.status !== "pending" && entry.status !== "complete") return null;
  return {
    id: entry.id,
    studentId: entry.studentId,
    studentName: entry.studentName,
    initiatedBy: "admin",
    adminId: entry.adminId,
    status: entry.status,
    requestedAt: entry.requestedAt,
    scheduledCompletionAt: entry.scheduledCompletionAt,
    completedAt: typeof entry.completedAt === "string" ? entry.completedAt : null,
    plainLanguageTrigger:
      typeof entry.plainLanguageTrigger === "string" ? entry.plainLanguageTrigger : null,
  };
}

async function readDeletedIds(): Promise<Set<string>> {
  const redis = getRedis();
  if (!redis) return new Set();
  try {
    const raw = await redis.get<string | string[]>(DELETED_STUDENTS_KEY);
    if (raw == null) return new Set();
    const list = typeof raw === "string" ? (JSON.parse(raw) as string[]) : raw;
    return new Set(list.filter((id) => typeof id === "string"));
  } catch (error) {
    console.error("[student-data-store] failed to read deleted ids", error);
    return new Set();
  }
}

async function writeDeletedIds(ids: Set<string>): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(DELETED_STUDENTS_KEY, JSON.stringify([...ids]));
  } catch (error) {
    console.error("[student-data-store] failed to write deleted ids", error);
  }
}

async function readAnonymousTiers(): Promise<MasteryTier[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.get<string | MasteryTier[]>(ANONYMOUS_TIERS_KEY);
    if (raw == null) return [];
    const list = typeof raw === "string" ? (JSON.parse(raw) as MasteryTier[]) : raw;
    return list.filter((tier): tier is MasteryTier => typeof tier === "string");
  } catch {
    return [];
  }
}

async function appendAnonymousTiers(tiers: MasteryTier[]): Promise<void> {
  const redis = getRedis();
  if (!redis || tiers.length === 0) return;
  const existing = await readAnonymousTiers();
  await redis.set(ANONYMOUS_TIERS_KEY, JSON.stringify([...existing, ...tiers]));
}

async function readAnonymousSessions(): Promise<SessionRecord[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.get<string | SessionRecord[]>(ANONYMOUS_SESSIONS_KEY);
    if (raw == null) return [];
    const list = typeof raw === "string" ? (JSON.parse(raw) as SessionRecord[]) : raw;
    return list.filter((session) => typeof session?.date === "string");
  } catch {
    return [];
  }
}

async function appendAnonymousSessions(sessions: SessionRecord[]): Promise<void> {
  const redis = getRedis();
  if (!redis || sessions.length === 0) return;
  const existing = await readAnonymousSessions();
  await redis.set(ANONYMOUS_SESSIONS_KEY, JSON.stringify([...existing, ...sessions]));
}

async function readRequests(): Promise<DataDeletionRequest[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.get<string | DataDeletionRequest[]>(DELETION_REQUESTS_KEY);
    if (raw == null) return [];
    const list = typeof raw === "string" ? (JSON.parse(raw) as unknown[]) : raw;
    return list
      .map((entry) => normalizeRequest(entry))
      .filter((entry): entry is DataDeletionRequest => Boolean(entry));
  } catch (error) {
    console.error("[student-data-store] failed to read deletion requests", error);
    return [];
  }
}

async function writeRequests(requests: DataDeletionRequest[]): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(DELETION_REQUESTS_KEY, JSON.stringify(requests));
    return true;
  } catch (error) {
    console.error("[student-data-store] failed to write deletion requests", error);
    return false;
  }
}

export async function isStudentDeleted(studentId: string): Promise<boolean> {
  const deleted = await readDeletedIds();
  return deleted.has(studentId);
}

export async function isDeletionDemoElapsedEnabled(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    return Boolean(await redis.get(DELETION_DEMO_ELAPSED_KEY));
  } catch {
    return false;
  }
}

export async function setDeletionDemoElapsed(enabled: boolean): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (enabled) await redis.set(DELETION_DEMO_ELAPSED_KEY, "1");
    else await redis.del(DELETION_DEMO_ELAPSED_KEY);
  } catch (error) {
    console.error("[student-data-store] failed to set deletion demo elapsed", error);
  }
}

async function shouldComplete(request: DataDeletionRequest): Promise<boolean> {
  if (request.status !== "pending") return false;
  if (await isDeletionDemoElapsedEnabled()) return true;
  return Date.now() >= new Date(request.scheduledCompletionAt).getTime();
}

async function purgeStudentPersonalData(studentId: string, tiers: MasteryTier[], sessions: SessionRecord[]): Promise<void> {
  await appendAnonymousTiers(tiers);
  await appendAnonymousSessions(sessions);

  const deleted = await readDeletedIds();
  deleted.add(studentId);
  await writeDeletedIds(deleted);

  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`escolent:overrides:live:${studentId}`);
    } catch (error) {
      console.error("[student-data-store] failed to clear override live state", error);
    }
  }
}

async function processDueDeletions(requests: DataDeletionRequest[]): Promise<DataDeletionRequest[]> {
  let changed = false;
  const next = [...requests];

  for (let index = 0; index < next.length; index += 1) {
    const request = next[index];
    if (!(await shouldComplete(request))) continue;

    const student = await getEffectiveStudent(request.studentId);
    if (student && !(await isStudentDeleted(request.studentId))) {
      await purgeStudentPersonalData(
        request.studentId,
        student.tiers,
        student.recentSessions,
      );
    }

    next[index] = {
      ...request,
      status: "complete",
      completedAt: new Date().toISOString(),
    };
    changed = true;
  }

  if (changed) await writeRequests(next);
  return next;
}

/** Students with identifiable data available for CSV export (Req 16). */
export async function listExportStudents(): Promise<RosterStudent[]> {
  const deleted = await readDeletedIds();
  const students = await Promise.all(ROSTER.map((row) => getEffectiveStudent(row.id)));
  return students.filter(
    (student): student is RosterStudent =>
      student != null && !deleted.has(student.id),
  );
}

/** Tier cells for analytics — live roster plus anonymized retained cells (17.4). */
export async function listAnalyticsTierCells(): Promise<MasteryTier[]> {
  const deleted = await readDeletedIds();
  const students = await listEffectiveStudents(null);
  const liveCells = students
    .filter((student) => !deleted.has(student.id))
    .flatMap((student) => student.tiers);
  const anonymous = await readAnonymousTiers();
  return [...liveCells, ...anonymous];
}

/** Session rows counted in analytics adoption — includes anonymized history (17.4). */
export async function listAnalyticsSessionRecords(): Promise<SessionRecord[]> {
  const deleted = await readDeletedIds();
  const live = (await listExportStudents()).flatMap((student) => student.recentSessions);
  const anonymous = await readAnonymousSessions();
  void deleted;
  return [...live, ...anonymous];
}

export async function listDeletionRequests(): Promise<DataDeletionRequest[]> {
  const requests = await readRequests();
  return processDueDeletions(requests);
}

export async function getDeletionRequest(id: string): Promise<DataDeletionRequest | null> {
  const requests = await listDeletionRequests();
  return requests.find((request) => request.id === id) ?? null;
}

export type CreateDeletionRequestInput = {
  studentId: string;
  confirmPhrase: string;
  plainLanguageTrigger?: string | null;
};

export type CreateDeletionRequestResult =
  | { ok: true; request: DataDeletionRequest }
  | { ok: false; error: string; status: number };

export async function createDeletionRequest(
  input: CreateDeletionRequestInput,
): Promise<CreateDeletionRequestResult> {
  const base = getRosterStudent(input.studentId);
  if (!base) {
    return { ok: false, error: "Unknown student.", status: 404 };
  }
  if (await isStudentDeleted(input.studentId)) {
    return { ok: false, error: "This student's identifiable data is already deleted.", status: 409 };
  }

  const expected = `DELETE ${base.fullName}`;
  if (input.confirmPhrase.trim().toUpperCase() !== expected.toUpperCase()) {
    return {
      ok: false,
      error: `Type exactly: ${expected}`,
      status: 400,
    };
  }

  const requests = await listDeletionRequests();
  const existingPending = requests.find(
    (request) => request.studentId === input.studentId && request.status === "pending",
  );
  if (existingPending) {
    return {
      ok: false,
      error: "A pending deletion request already exists for this student.",
      status: 409,
    };
  }

  const now = new Date();
  const request: DataDeletionRequest = {
    id: randomUUID(),
    studentId: base.id,
    studentName: base.fullName,
    initiatedBy: "admin",
    adminId: getPrimaryAdmin().id,
    status: "pending",
    requestedAt: now.toISOString(),
    scheduledCompletionAt: new Date(now.getTime() + DELETION_HOLD_MS).toISOString(),
    completedAt: null,
    plainLanguageTrigger: input.plainLanguageTrigger?.trim() || null,
  };

  const saved = await writeRequests([request, ...requests]);
  if (!saved) {
    return {
      ok: false,
      error: "Could not save the deletion request — Redis is unavailable.",
      status: 503,
    };
  }

  return { ok: true, request };
}

export function deletionConfirmPhrase(studentName: string): string {
  return `DELETE ${studentName}`;
}
