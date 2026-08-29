/**
 * School-wide escalation oversight aggregates — Req 15.7.
 *
 * Reads the same `distress-store` records Teacher Escalations uses, but exposes
 * counts and age thresholds only. Admin is oversight, not the primary responder;
 * individual records never leave this module toward Admin UI surfaces.
 */

import type { EscalationRecord } from "@/lib/distress";
import { listEscalations, seedEscalationsIfEmpty } from "@/lib/distress-store";

/** Aging threshold for Admin Briefing escalation_oversight items (Req 15.7). */
export const ESCALATION_OVERSIGHT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export interface EscalationOversightSummary {
  openCount: number;
  openLongerThanThresholdCount: number;
  thresholdHours: number;
  oldestOpenAgeHours: number | null;
  computedAt: string;
}

function openRecords(records: EscalationRecord[]): EscalationRecord[] {
  return records.filter((record) => !record.acknowledgedBy);
}

function ageMs(record: EscalationRecord, now: number): number {
  const created = new Date(record.createdAt).getTime();
  return Number.isFinite(created) ? Math.max(0, now - created) : 0;
}

export async function computeEscalationOversightSummary(): Promise<EscalationOversightSummary> {
  await seedEscalationsIfEmpty();
  const records = await listEscalations();
  const now = Date.now();
  const open = openRecords(records);
  const aged = open.filter((record) => ageMs(record, now) > ESCALATION_OVERSIGHT_THRESHOLD_MS);
  const oldestOpenAgeHours =
    open.length === 0
      ? null
      : Math.round(Math.max(...open.map((record) => ageMs(record, now))) / (60 * 60 * 1000));

  return {
    openCount: open.length,
    openLongerThanThresholdCount: aged.length,
    thresholdHours: ESCALATION_OVERSIGHT_THRESHOLD_MS / (60 * 60 * 1000),
    oldestOpenAgeHours,
    computedAt: new Date().toISOString(),
  };
}
