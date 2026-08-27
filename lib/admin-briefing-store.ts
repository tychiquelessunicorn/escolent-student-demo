/**
 * Admin Briefing — synthesis over real institutional signals only (Req 15).
 *
 * This slice ships escalation oversight (15.7) from `distress-store`. Pilot
 * progress, data-subject requests, and teachers without a Space are omitted until
 * their backing systems exist (14a, 17). Billing renewal appears on Today/Week (15c);
 * Briefing billing cards remain deferred until that synthesis is extended.
 *
 * Standing rules for the Admin phase:
 * - Req 15b.5 (LMS integration setup) and 15c.3 (billing plan changes) stay
 *   structured-only forever — no plain-language AI assist on either action.
 * - Req 37.7 ("another admin already has this open") should land as one shared
 *   utility when 14a/17 arrive, reusing the views-array pattern on Escalations
 *   — not separate implementations per surface.
 *
 * Req 15.5: when activity exists but triage confidence is low, Briefing should
 * default to school-wide Analytics (15a). `BriefingScreen` redirects to
 * `/admin/analytics?from=briefing-insufficient` — same pattern as Teacher → Overview.
 */

import {
  computeEscalationOversightSummary,
  ESCALATION_OVERSIGHT_THRESHOLD_MS,
} from "@/lib/admin-escalation-oversight";

export type AdminBriefingState =
  | "populated"
  | "no_rollout"
  | "insufficient_data"
  | "all_clear";

export type AdminBriefingCategory = "escalation_oversight";

export type AdminBriefingUrgency = "urgent" | "informational";

export interface AdminBriefingItem {
  id: string;
  category: AdminBriefingCategory;
  urgency: AdminBriefingUrgency;
  scopeLabel: string;
  title: string;
  detail: string;
  actionRoute: string;
}

export interface AdminBriefing {
  state: AdminBriefingState;
  scopeLabel: string;
  computedAt: string;
  items: AdminBriefingItem[];
}

export type AdminBriefingDemoState = AdminBriefingState | "auto";

const THRESHOLD_HOURS = ESCALATION_OVERSIGHT_THRESHOLD_MS / (60 * 60 * 1000);

/** School-wide scope line — matches Admin Briefing design copy. */
export function adminBriefingScopeLabel(): string {
  return "Teneo · week 6 of the pilot, school-wide";
}

function sortItems(items: AdminBriefingItem[]): AdminBriefingItem[] {
  const urgencyRank = { urgent: 0, informational: 1 };
  return [...items].sort(
    (a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency],
  );
}

async function buildEscalationOversightItems(): Promise<AdminBriefingItem[]> {
  const summary = await computeEscalationOversightSummary();
  const count = summary.openLongerThanThresholdCount;
  if (count === 0) return [];

  const noun = count === 1 ? "Escalation" : "Escalations";
  const verb = count === 1 ? "has" : "have";

  return [
    {
      id: "escalation_oversight:aged",
      category: "escalation_oversight",
      urgency: "urgent",
      scopeLabel: "School-wide",
      title: `${count} ${noun} ${verb} been open longer than ${THRESHOLD_HOURS} hours.`,
      detail:
        "Teachers handle case detail on their Briefing — this is school-wide oversight, not primary response.",
      actionRoute: "/admin/escalations",
    },
  ];
}

export async function buildAdminBriefing(options?: {
  demoState?: AdminBriefingDemoState;
}): Promise<AdminBriefing> {
  const demoState = options?.demoState ?? "auto";
  const scopeLabel = adminBriefingScopeLabel();
  const computedAt = new Date().toISOString();

  if (demoState === "no_rollout") {
    return {
      state: "no_rollout",
      scopeLabel: "No rollout yet",
      computedAt,
      items: [],
    };
  }

  if (demoState === "insufficient_data") {
    return {
      state: "insufficient_data",
      scopeLabel,
      computedAt,
      items: [],
    };
  }

  if (demoState === "all_clear") {
    return {
      state: "all_clear",
      scopeLabel,
      computedAt,
      items: [],
    };
  }

  const items = sortItems([...(await buildEscalationOversightItems())]);

  if (items.length === 0) {
    return {
      state: "all_clear",
      scopeLabel,
      computedAt,
      items: [],
    };
  }

  return {
    state: "populated",
    scopeLabel,
    computedAt,
    items,
  };
}
