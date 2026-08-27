/**
 * Admin billing — Req 15c.
 *
 * Redis-backed tenant plan record. Pricing is fixed pilot economics:
 * Core $1.50/student/month, AI-Adaptive $2.50/student/month.
 *
 * Standing rules:
 * - 15c.2: plain-language lookup via ASK_LOOKUP_SYSTEM only (informational).
 * - 15c.3: plan changes are structured form + explicit confirmation forever —
 *   no plain-language path to change-plan (same carve-out as 15b.5 LMS setup).
 */

import { adminBriefingScopeLabel } from "@/lib/admin-briefing-store";
import {
  demoAnalyticsAnchorDate,
  formatAnalyticsDateLabel,
  toIsoDate,
} from "@/lib/demo-data/session-dates";
import { ROSTER } from "@/lib/demo-data/roster";
import { getPrimaryAdmin } from "@/lib/demo-data/staff";
import { getRedis } from "@/lib/rate-limit";
import { listExportStudents } from "@/lib/student-data-store";

export type BillingPlanTier = "core" | "ai_adaptive";

export const BILLING_PLAN_PRICING: Record<
  BillingPlanTier,
  { label: string; pricePerStudentMonth: number }
> = {
  core: { label: "Core", pricePerStudentMonth: 1.5 },
  ai_adaptive: { label: "AI-Adaptive", pricePerStudentMonth: 2.5 },
};

/** Pilot renewal is 18 days after the week-6 anchor (Aug 19 → Sep 6, 2026). */
export const PILOT_RENEWAL_OFFSET_DAYS = 18;

/** Today/Week surface renewal items within this window. */
export const RENEWAL_APPROACHING_DAYS = 30;

export const BILLING_TENANT_KEY = "escolent:billing:tenant";

export interface BillingTenantRecord {
  planTier: BillingPlanTier;
  seatCount: number;
  renewalDate: string;
  billingStatus: "active";
  lastPlanChangeAt: string | null;
  lastPlanChangeBy: string | null;
}

export interface AdminBillingSnapshot {
  scopeLabel: string;
  computedAt: string;
  planTier: BillingPlanTier;
  planLabel: string;
  pricePerStudentMonth: number;
  seatCount: number;
  seatsUsed: number;
  renewalDate: string;
  renewalDateLabel: string;
  daysUntilRenewal: number;
  monthlyEstimateUsd: number;
  billingStatus: "active";
  licensedSeatsNote: string;
}

export interface AdminBillingChangePreview {
  currentPlanTier: BillingPlanTier;
  currentPlanLabel: string;
  currentPricePerStudentMonth: number;
  newPlanTier: BillingPlanTier;
  newPlanLabel: string;
  newPricePerStudentMonth: number;
  seatsUsed: number;
  currentMonthlyEstimateUsd: number;
  newMonthlyEstimateUsd: number;
  monthlyDeltaUsd: number;
  confirmPhrase: string;
}

function defaultRenewalDate(): string {
  const anchor = demoAnalyticsAnchorDate();
  const renewal = new Date(
    anchor.getTime() + PILOT_RENEWAL_OFFSET_DAYS * 24 * 60 * 60 * 1000,
  );
  return toIsoDate(renewal);
}

function seedBillingRecord(): BillingTenantRecord {
  return {
    planTier: "core",
    seatCount: 30,
    renewalDate: defaultRenewalDate(),
    billingStatus: "active",
    lastPlanChangeAt: null,
    lastPlanChangeBy: null,
  };
}

function normalizeBillingRecord(raw: unknown): BillingTenantRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<BillingTenantRecord>;
  if (entry.planTier !== "core" && entry.planTier !== "ai_adaptive") return null;
  if (typeof entry.seatCount !== "number" || entry.seatCount < 1) return null;
  if (typeof entry.renewalDate !== "string") return null;
  if (entry.billingStatus !== "active") return null;
  return {
    planTier: entry.planTier,
    seatCount: entry.seatCount,
    renewalDate: entry.renewalDate,
    billingStatus: "active",
    lastPlanChangeAt:
      typeof entry.lastPlanChangeAt === "string" ? entry.lastPlanChangeAt : null,
    lastPlanChangeBy:
      typeof entry.lastPlanChangeBy === "string" ? entry.lastPlanChangeBy : null,
  };
}

async function readStoredBilling(): Promise<BillingTenantRecord> {
  const redis = getRedis();
  if (!redis) return seedBillingRecord();
  try {
    const raw = await redis.get<string | BillingTenantRecord>(BILLING_TENANT_KEY);
    if (raw == null) return seedBillingRecord();
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    return normalizeBillingRecord(parsed) ?? seedBillingRecord();
  } catch (error) {
    console.error("[admin-billing-store] failed to read billing record", error);
    return seedBillingRecord();
  }
}

async function writeStoredBilling(record: BillingTenantRecord): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(BILLING_TENANT_KEY, JSON.stringify(record));
    return true;
  } catch (error) {
    console.error("[admin-billing-store] failed to write billing record", error);
    return false;
  }
}

async function seedBillingIfEmpty(): Promise<BillingTenantRecord> {
  const redis = getRedis();
  const seed = seedBillingRecord();
  if (!redis) return seed;
  try {
    const existing = await redis.get(BILLING_TENANT_KEY);
    if (existing != null) return readStoredBilling();
    await redis.set(BILLING_TENANT_KEY, JSON.stringify(seed));
    return seed;
  } catch (error) {
    console.error("[admin-billing-store] failed to seed billing record", error);
    return seed;
  }
}

export function daysUntilRenewal(renewalDateIso: string, from = demoAnalyticsAnchorDate()): number {
  const renewal = new Date(`${renewalDateIso}T00:00:00.000Z`);
  const ms = renewal.getTime() - from.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function isRenewalApproaching(renewalDateIso: string): boolean {
  const days = daysUntilRenewal(renewalDateIso);
  return days >= 0 && days <= RENEWAL_APPROACHING_DAYS;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function billingChangeConfirmPhrase(planTier: BillingPlanTier): string {
  return `CHANGE TO ${BILLING_PLAN_PRICING[planTier].label.toUpperCase()}`;
}

async function seatsUsedCount(): Promise<number> {
  const students = await listExportStudents();
  return students.length > 0 ? students.length : ROSTER.length;
}

export async function getAdminBillingSnapshot(): Promise<AdminBillingSnapshot> {
  const record = await seedBillingIfEmpty();
  const seatsUsed = await seatsUsedCount();
  const pricing = BILLING_PLAN_PRICING[record.planTier];
  const daysRemaining = daysUntilRenewal(record.renewalDate);
  const monthlyEstimateUsd = seatsUsed * pricing.pricePerStudentMonth;

  return {
    scopeLabel: adminBriefingScopeLabel(),
    computedAt: new Date().toISOString(),
    planTier: record.planTier,
    planLabel: pricing.label,
    pricePerStudentMonth: pricing.pricePerStudentMonth,
    seatCount: record.seatCount,
    seatsUsed,
    renewalDate: record.renewalDate,
    renewalDateLabel: formatAnalyticsDateLabel(new Date(`${record.renewalDate}T00:00:00.000Z`)),
    daysUntilRenewal: daysRemaining,
    monthlyEstimateUsd,
    billingStatus: record.billingStatus,
    licensedSeatsNote: `${seatsUsed} of ${record.seatCount} licensed seats in use across the pilot roster.`,
  };
}

export function buildBillingChangePreview(
  snapshot: AdminBillingSnapshot,
  newPlanTier: BillingPlanTier,
): AdminBillingChangePreview {
  const current = BILLING_PLAN_PRICING[snapshot.planTier];
  const next = BILLING_PLAN_PRICING[newPlanTier];
  const currentMonthlyEstimateUsd = snapshot.seatsUsed * current.pricePerStudentMonth;
  const newMonthlyEstimateUsd = snapshot.seatsUsed * next.pricePerStudentMonth;

  return {
    currentPlanTier: snapshot.planTier,
    currentPlanLabel: current.label,
    currentPricePerStudentMonth: current.pricePerStudentMonth,
    newPlanTier,
    newPlanLabel: next.label,
    newPricePerStudentMonth: next.pricePerStudentMonth,
    seatsUsed: snapshot.seatsUsed,
    currentMonthlyEstimateUsd,
    newMonthlyEstimateUsd,
    monthlyDeltaUsd: newMonthlyEstimateUsd - currentMonthlyEstimateUsd,
    confirmPhrase: billingChangeConfirmPhrase(newPlanTier),
  };
}

/** Flat grounding lines for the Billing ask box — same numbers the UI shows (15c.2). */
export function adminBillingAskGroundingLines(snapshot: AdminBillingSnapshot): string[] {
  return [
    `- scope: ${snapshot.scopeLabel}`,
    `- plan: ${snapshot.planLabel} (${formatUsd(snapshot.pricePerStudentMonth)} per student per month)`,
    `- seats used: ${snapshot.seatsUsed} of ${snapshot.seatCount} licensed`,
    `- renewal date: ${snapshot.renewalDateLabel} (${snapshot.renewalDate})`,
    `- days until renewal (from pilot today): ${snapshot.daysUntilRenewal}`,
    `- estimated monthly charge at current usage: ${formatUsd(snapshot.monthlyEstimateUsd)}`,
    `- billing status: ${snapshot.billingStatus}`,
    `- plan change: not available via this ask box — use the structured form on the Billing page`,
  ];
}

export type ChangeBillingPlanInput = {
  planTier: BillingPlanTier;
  confirmPhrase: string;
};

export type ChangeBillingPlanResult =
  | { ok: true; snapshot: AdminBillingSnapshot }
  | { ok: false; error: string; status: number };

export async function changeBillingPlan(
  input: ChangeBillingPlanInput,
): Promise<ChangeBillingPlanResult> {
  if (input.planTier !== "core" && input.planTier !== "ai_adaptive") {
    return { ok: false, error: "Choose a valid plan.", status: 400 };
  }

  const record = await seedBillingIfEmpty();
  const expected = billingChangeConfirmPhrase(input.planTier);

  if (input.confirmPhrase.trim().toUpperCase() !== expected.toUpperCase()) {
    return { ok: false, error: `Type exactly: ${expected}`, status: 400 };
  }

  if (record.planTier === input.planTier) {
    return { ok: false, error: "That is already the current plan.", status: 409 };
  }

  const next: BillingTenantRecord = {
    ...record,
    planTier: input.planTier,
    lastPlanChangeAt: new Date().toISOString(),
    lastPlanChangeBy: getPrimaryAdmin().id,
  };

  const saved = await writeStoredBilling(next);
  if (!saved) {
    return {
      ok: false,
      error: "Could not save the plan change — Redis is unavailable.",
      status: 503,
    };
  }

  return { ok: true, snapshot: await getAdminBillingSnapshot() };
}

export interface BillingRenewalEventCopy {
  title: string;
  detail: string;
  dueMeta: string;
  daysUntilRenewal: number;
}

export async function buildBillingRenewalEventCopy(): Promise<BillingRenewalEventCopy | null> {
  const snapshot = await getAdminBillingSnapshot();
  if (!isRenewalApproaching(snapshot.renewalDate)) return null;

  const dayLabel =
    snapshot.daysUntilRenewal === 1
      ? "1 day"
      : `${snapshot.daysUntilRenewal} days`;

  return {
    daysUntilRenewal: snapshot.daysUntilRenewal,
    title: `Pilot subscription renews in ${dayLabel}.`,
    detail: `${snapshot.licensedSeatsNote} Current plan: ${snapshot.planLabel} at ${formatUsd(snapshot.pricePerStudentMonth)}/student/month — worth having ready for the renewal conversation.`,
    dueMeta: `Renews ${snapshot.renewalDateLabel}`,
  };
}
