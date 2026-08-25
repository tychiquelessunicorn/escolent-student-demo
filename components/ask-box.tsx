"use client";

import { useState } from "react";
import { useDistress } from "@/components/distress-provider";
import type { DistressSurface } from "@/lib/distress";
import { hapticSoft, hapticTap } from "@/lib/haptics";

const FALLBACK = "I couldn't check that right now — try again in a moment.";

/**
 * The one grounded ask-box used by Today, Learn and Progress. Same component,
 * not three near-copies — the screens differ only by placeholder, loading copy,
 * and which grounded task the proxy runs.
 *
 * Every submission also goes through passive distress detection, per
 * Requirement 18.1's "not one designated input". Detection runs alongside
 * answering rather than instead of it, and does not gate the answer.
 */
export function AskBox({
  task,
  surface,
  placeholder,
  loadingLabel,
}: {
  task: "today_ask" | "learn_ask" | "progress_ask";
  surface: DistressSurface;
  placeholder: string;
  loadingLabel: string;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const { checkFreeText } = useDistress();

  const submit = async () => {
    const question = text.trim();
    if (!question) return;

    hapticTap();
    checkFreeText(surface, question);

    setLoading(true);
    setAnswer("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, question }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as { text?: string };
      setAnswer(data.text?.trim() || FALLBACK);
      hapticSoft();
    } catch {
      setAnswer(FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-shell)",
          background: "var(--color-surface-raised)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 14,
            height: 14,
            border: "1.5px solid var(--color-content-muted)",
            borderRadius: 4,
            flexShrink: 0,
          }}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--color-content-primary)",
          }}
        />
        {text.trim() !== "" ? (
          <button
            type="button"
            onClick={() => void submit()}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: "var(--radius-control)",
              border: "none",
              background: "var(--color-accent)",
              color: "var(--color-surface-raised)",
              cursor: "pointer",
            }}
          >
            Ask
          </button>
        ) : null}
      </div>

      {loading ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--color-content-muted)",
            marginTop: 10,
            animation: "esc-pulse 1.3s ease-in-out infinite",
          }}
        >
          {loadingLabel}
        </div>
      ) : null}

      {!loading && answer ? (
        <div
          className="esc-rise"
          style={{
            marginTop: 10,
            background: "var(--color-accent-subtle)",
            border: "1px solid var(--color-accent-subtle-border)",
            borderRadius: "var(--radius-shell)",
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--color-accent-strong)",
          }}
        >
          {answer}
        </div>
      ) : null}
    </div>
  );
}
