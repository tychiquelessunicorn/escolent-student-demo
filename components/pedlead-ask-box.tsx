"use client";

import { useState } from "react";

export function PedleadAskBox({
  tenantFilter,
  placeholder,
  loadingLabel,
  label,
}: {
  tenantFilter?: string | null;
  placeholder: string;
  loadingLabel: string;
  label: string;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "pedlead_briefing_ask",
          question: trimmed,
          tenantFilter: tenantFilter || null,
        }),
      });
      if (!response.ok) throw new Error("ask failed");
      const data = (await response.json()) as { text?: string };
      setAnswer(data.text ?? "Nothing in the curriculum data matched that question.");
    } catch {
      setError("Could not check that right now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="esc-mastery-ask esc-admin-ask" style={{ marginTop: 28 }}>
      <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
        {label}
      </p>
      <div className="esc-mastery-ask-input-row">
        <input
          type="text"
          className="esc-mastery-ask-input"
          placeholder={placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          disabled={loading}
          aria-label={label}
        />
        <button
          type="button"
          className="esc-mastery-ask-submit esc-pressable"
          onClick={() => void submit()}
          disabled={loading || !question.trim()}
          aria-label="Ask AI about content synthesis"
        >
          Ask
        </button>
      </div>
      {loading ? (
        <p className="esc-mastery-ask-status" aria-live="polite">
          {loadingLabel}
        </p>
      ) : null}
      {error ? (
        <p className="esc-mastery-ask-status esc-mastery-ask-error" role="alert">
          {error}
        </p>
      ) : null}
      {answer ? (
        <div className="esc-mastery-ask-answer" aria-live="polite">
          <p className="esc-mastery-ask-answer-text">{answer}</p>
        </div>
      ) : null}
    </div>
  );
}
