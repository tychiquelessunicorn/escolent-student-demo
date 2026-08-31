"use client";

import { useState } from "react";

export function PedleadAskBox({
  tenantFilter,
  placeholder,
  loadingLabel,
  label,
  scripted,
}: {
  tenantFilter?: string | null;
  placeholder: string;
  loadingLabel: string;
  label: string;
  scripted?: { question: string; answer: string };
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shownQuestion = scripted ? scripted.question : question;
  const shownAnswer = scripted ? scripted.answer : answer;
  const shownLoading = scripted ? false : loading;

  const submit = async () => {
    if (scripted) return;
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
          value={shownQuestion}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          disabled={shownLoading || Boolean(scripted)}
          aria-label={label}
        />
        <button
          type="button"
          className="esc-mastery-ask-submit esc-pressable"
          onClick={() => void submit()}
          disabled={shownLoading || !shownQuestion.trim() || Boolean(scripted)}
          aria-label="Ask AI about content synthesis"
        >
          Ask
        </button>
      </div>
      {shownLoading ? (
        <p className="esc-mastery-ask-status" aria-live="polite">
          {loadingLabel}
        </p>
      ) : null}
      {error ? (
        <p className="esc-mastery-ask-error" role="alert">
          {error}
        </p>
      ) : null}
      {shownAnswer ? (
        <p className="esc-mastery-ask-answer" aria-live="polite">
          {shownAnswer}
        </p>
      ) : null}
    </div>
  );
}
