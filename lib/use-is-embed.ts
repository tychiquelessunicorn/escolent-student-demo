"use client";

import { useEffect, useState } from "react";
import { isEmbedParam } from "@/lib/embed";

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
