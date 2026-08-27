import type { MasteryTier } from "@/lib/demo-data/types";
import { TIER_STYLE } from "@/lib/demo-data/skills";

/** Approximate mastery depth for grid cell fill — matches prototype mapping. */
export const TIER_FILL_PCT: Record<MasteryTier, number> = {
  not_attempted: 0,
  struggling: 25,
  emerging: 48,
  tentative: 72,
  durable: 92,
};

export function tierCellStyle(tier: MasteryTier) {
  const style = TIER_STYLE[tier];
  return {
    tier,
    label: style.label,
    fillPct: TIER_FILL_PCT[tier],
    bg: style.badgeBg,
    dot: style.dotBg,
  };
}

export function formatFreshnessLabel(freshness: string): string {
  switch (freshness) {
    case "fresh":
      return "Canvas roster synced";
    case "stale":
      return "Canvas roster synced 2h ago";
    case "syncing":
      return "Syncing Canvas roster…";
    case "unavailable":
      return "Canvas roster unavailable";
    default:
      return "Roster sync unknown";
  }
}
