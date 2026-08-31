"use client";

import { useState } from "react";
import { useDistress } from "@/components/distress-provider";
import { AREA_VARS, type AreaTone } from "@/components/ui";
import { EscolentLoader } from "@/components/escolent-logo";
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
  area = "practice",
  spaceId,
  scripted,
}: {
  task: "today_ask" | "learn_ask" | "progress_ask";
  surface: DistressSurface;
  placeholder: string;
  loadingLabel: string;
  area?: AreaTone;
  /** Current Space for Learn / Progress grounded answers. */
  spaceId?: string;
  /**
   * A fixed question and answer to display instead of a live input. The guided
   * tour uses this so a visitor never has to type to see the ask box work; the
   * pair is shown as-is and nothing is sent.
   */
  scripted?: { question: string; answer: string };
}) {
  const tone = AREA_VARS[area];
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const { checkFreeText } = useDistress();

  const shownText = scripted ? scripted.question : text;
  const shownAnswer = scripted ? scripted.answer : answer;
  const shownLoading = scripted ? false : loading;

  const submit = async () => {
    if (scripted) return;
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
        body: JSON.stringify({ task, question, spaceId }),
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
      <div className="esc-ask-box-input-row">
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
          value={shownText}
          readOnly={Boolean(scripted)}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
        {shownText.trim() !== "" ? (
          <button
            type="button"
            className="esc-pressable"
            onClick={() => void submit()}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 700,
              padding: "6px 14px",
              borderRadius: "var(--radius-control)",
              border: "none",
              background: tone.solid,
              color: "var(--color-surface-raised)",
              cursor: "pointer",
            }}
          >
            Ask
          </button>
        ) : null}
      </div>

      {shownLoading ? (
        <div style={{ marginTop: 10 }}>
          <EscolentLoader label={loadingLabel} size={16} />
        </div>
      ) : null}

      {!shownLoading && shownAnswer ? (
        <div
          className="esc-rise"
          style={{
            marginTop: 10,
            background: tone.subtle,
            border: `1px solid ${tone.border}`,
            borderRadius: "var(--radius-shell)",
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.55,
            color: tone.fg,
          }}
        >
          {shownAnswer}
        </div>
      ) : null}
    </div>
  );
}
