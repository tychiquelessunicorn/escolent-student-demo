/**
 * Generic shared "recently viewed" tracking — Req 37.7 / design §14d.
 *
 * Redis-backed from the start, keyed by recordType + recordId so deletion
 * requests (data_rights_request) and user-role management (user_role) share
 * one mechanism.
 *
 * Escalations keep their existing views[] on distress records — migrating that
 * path to this module is a separate, safety-adjacent slice (do not do here).
 */

import { formatStaffName } from "@/lib/demo-data/staff";
import { getRedis } from "@/lib/rate-limit";

export interface RecordViewEntry {
  staffId: string;
  viewedAt: string;
}

export interface RecordViewer {
  staffId: string;
  displayName: string;
  viewedAt: string;
}

const VIEW_CAP = 20;
const VIEW_TTL_SECONDS = 60 * 60 * 6;

function viewsKey(recordType: string, recordId: string): string {
  return `escolent:record-views:${recordType}:${recordId}`;
}

export async function recordView(
  recordType: string,
  recordId: string,
  staffId: string,
): Promise<RecordViewEntry[]> {
  const redis = getRedis();
  const viewedAt = new Date().toISOString();
  const entry: RecordViewEntry = { staffId, viewedAt };

  if (!redis) {
    return [entry];
  }

  try {
    const key = viewsKey(recordType, recordId);
    const raw = await redis.get<string | RecordViewEntry[]>(key);
    const existing =
      raw == null
        ? []
        : (typeof raw === "string" ? (JSON.parse(raw) as RecordViewEntry[]) : raw).filter(
            (view): view is RecordViewEntry =>
              typeof view?.staffId === "string" && typeof view?.viewedAt === "string",
          );

    const withoutDuplicate = existing.filter((view) => view.staffId !== staffId);
    const next = [entry, ...withoutDuplicate].slice(0, VIEW_CAP);
    await redis.set(key, JSON.stringify(next), { ex: VIEW_TTL_SECONDS });
    return next;
  } catch (error) {
    console.error("[shared-record-views] failed to record view", error);
    return [entry];
  }
}

export async function getRecentViewers(
  recordType: string,
  recordId: string,
  options?: { excludeStaffId?: string | null; withinMs?: number },
): Promise<RecordViewer[]> {
  const redis = getRedis();
  const withinMs = options?.withinMs ?? 15 * 60 * 1000;
  const cutoff = Date.now() - withinMs;

  let entries: RecordViewEntry[] = [];
  if (redis) {
    try {
      const raw = await redis.get<string | RecordViewEntry[]>(viewsKey(recordType, recordId));
      if (raw != null) {
        entries =
          typeof raw === "string"
            ? (JSON.parse(raw) as RecordViewEntry[])
            : raw;
      }
    } catch (error) {
      console.error("[shared-record-views] failed to read views", error);
    }
  }

  return entries
    .filter(
      (view) =>
        typeof view.staffId === "string" &&
        typeof view.viewedAt === "string" &&
        new Date(view.viewedAt).getTime() >= cutoff &&
        view.staffId !== options?.excludeStaffId,
    )
    .map((view) => ({
      staffId: view.staffId,
      displayName: formatStaffName(view.staffId, "short"),
      viewedAt: view.viewedAt,
    }));
}
