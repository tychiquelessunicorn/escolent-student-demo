/**
 * Public-safe embed mode for marketing / landing page embeds (e.g. escolent.com).
 *
 * When `?embed=1` (or `?embed=true`) is present in the URL:
 * 1. The demo harness panel (DEMO CONTROLS) is structurally absent from the render
 *    — never mounts, never opens via `?demo=1`, never listens to Ctrl/Cmd+Shift+E.
 * 2. All QA/harness sections (edge-state selectors, simulated hold/peer viewers,
 *    day-21 harness, diagnostic gap simulation) are completely hidden.
 * 3. Visibly internal-sounding hint copy ("Edge states: add ?demo=1 to open...")
 *    is omitted.
 * 4. Header exit-to-demo-home links and offline demo toggle affordances are disabled.
 *
 * Scripted state params (e.g. `problemDemo=...`, `briefingState=...`, `skill=...`,
 * `overrideMode=...`, etc.) continue to seed the exact real state requested.
 */

import { useEffect, useState } from "react";

export function isEmbedParam(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isEmbedMode(
  searchParams?: URLSearchParams | { get: (key: string) => string | null } | null,
): boolean {
  if (searchParams) {
    if (isEmbedParam(searchParams.get("embed"))) return true;
  }
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      if (isEmbedParam(params.get("embed"))) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * React hook to reactively check if the current page is running in embed mode.
 */
export function useIsEmbed(): boolean {
  const [isEmbed, setIsEmbed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        return isEmbedParam(params.get("embed"));
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setIsEmbed(isEmbedParam(params.get("embed")));
    } catch {
      setIsEmbed(false);
    }
  }, []);

  return isEmbed;
}
