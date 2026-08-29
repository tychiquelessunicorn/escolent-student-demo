"use client";

import { useState } from "react";

export type AdminAskTask = "admin_briefing_ask" | "admin_today_ask";

export function AdminAskBox({
  task,
  view = "today",
  placeholder,
  loadingLabel,
  label,
  scripted,
}: {
  task: AdminAskTask;
  view?: "today" | "week";
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
          task,
          question: trimmed,
          ...(task === "admin_today_ask" ? { view } : {}),
        }),
      });
      if (!response.ok) throw new Error("ask failed");
      const data = (await response.json()) as { text?: string };
      setAnswer(data.text ?? "Nothing in the data matched that question.");
    } catch {
      setError("Could not check that right now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="esc-mastery-ask esc-admin-ask">
      <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
        {label}
      </p>
      <div className="esc-mastery-ask-field">
        <input
          type="text"
          className="esc-mastery-ask-input"
          value={shownQuestion}
          readOnly={Boolean(scripted)}
          placeholder={placeholder}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
        {!scripted && question.trim() ? (
          <button type="button" className="esc-staff-btn esc-staff-btn-primary" onClick={() => void submit()}>
            Ask
          </button>
        ) : null}
      </div>
      {shownLoading ? <p className="esc-mastery-ask-status">{loadingLabel}</p> : null}
      {error && !scripted ? <p className="esc-mastery-ask-error">{error}</p> : null}
      {shownAnswer ? <div className="esc-mastery-ask-answer">{shownAnswer}</div> : null}
    </div>
  );
}
