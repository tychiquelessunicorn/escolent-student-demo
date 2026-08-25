"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  DISTRESS_SCRIPTED_MESSAGE,
  type DistressSurface,
} from "@/lib/distress";

interface DistressContextValue {
  /** True once an escalation has been confirmed recorded by the server. */
  escalated: boolean;
  /** True when we could not reach the server to raise one. */
  deliveryFailed: boolean;
  /** The zero-friction "I need help" path. No confirmation step. */
  requestHelp: () => void;
  /** Passive detection. Call from every free-text surface, never awaited. */
  checkFreeText: (surface: DistressSurface, text: string) => void;
}

const DistressContext = createContext<DistressContextValue | null>(null);

/**
 * The single shared detection function behind all five Student free-text
 * surfaces plus the help button (Requirement 18.1, 18.6). There is exactly one
 * copy of this logic; surfaces call into it rather than reimplementing it.
 *
 * State lives at the shell layout, so once the message appears it persists
 * across problem advances, panel closes, and navigation between screens.
 */
export function DistressProvider({ children }: { children: React.ReactNode }) {
  const [escalated, setEscalated] = useState(false);
  const [deliveryFailed, setDeliveryFailed] = useState(false);

  const raise = useCallback(
    async (payload: {
      method: "passive_pattern" | "student_initiated";
      surface: DistressSurface;
      text?: string;
    }) => {
      try {
        const response = await fetch("/api/distress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const data = (await response.json()) as { escalated?: boolean };
        if (data.escalated) {
          setEscalated(true);
          setDeliveryFailed(false);
        }
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const checkFreeText = useCallback(
    (surface: DistressSurface, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // A response with no letters in it — "5", "-12", "3/4" — cannot carry
      // distress language, so there is nothing for a classifier to read. This
      // keeps the numeric answer field covered without paying for a strong
      // model on every arithmetic submission. Anything containing words still
      // goes through, whichever field it was typed into.
      if (!/[a-z]/i.test(trimmed)) return;
      // A network failure here means no record could be created. We deliberately
      // stay silent rather than claim a teacher was notified when none was —
      // the server-side fail-open covers classifier failure, not an unreachable
      // server.
      void raise({ method: "passive_pattern", surface, text: trimmed });
    },
    [raise],
  );

  const requestHelp = useCallback(() => {
    void (async () => {
      const sent = await raise({
        method: "student_initiated",
        surface: "need_help_button",
      });
      if (sent) return;
      const retried = await raise({
        method: "student_initiated",
        surface: "need_help_button",
      });
      // Honest about the failure rather than showing the scripted message,
      // which would promise a notification that never happened.
      if (!retried) setDeliveryFailed(true);
    })();
  }, [raise]);

  const value = useMemo(
    () => ({ escalated, deliveryFailed, requestHelp, checkFreeText }),
    [escalated, deliveryFailed, requestHelp, checkFreeText],
  );

  return (
    <DistressContext.Provider value={value}>{children}</DistressContext.Provider>
  );
}

export function useDistress(): DistressContextValue {
  const context = useContext(DistressContext);
  if (!context) {
    throw new Error("useDistress must be used within a DistressProvider");
  }
  return context;
}

/**
 * Renders the scripted message and nothing else. The string is a constant
 * imported from lib/distress — it is never assembled, interpolated, or
 * received from the API.
 */
export function DistressNotice() {
  const { escalated, deliveryFailed } = useDistress();

  if (escalated) {
    return (
      <div
        role="status"
        style={{
          marginTop: 20,
          background: "var(--color-notice-bg)",
          border: "1px solid var(--color-notice-border)",
          borderRadius: "var(--radius-shell)",
          padding: "14px 16px",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--color-notice-fg)",
        }}
      >
        {DISTRESS_SCRIPTED_MESSAGE}
      </div>
    );
  }

  if (deliveryFailed) {
    return (
      <div
        role="status"
        style={{
          marginTop: 20,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-shell)",
          padding: "14px 16px",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--color-content-secondary)",
        }}
      >
        We couldn&rsquo;t send that just now — check your connection and try
        again.
      </div>
    );
  }

  return null;
}
