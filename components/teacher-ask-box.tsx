"use client";

import { useState } from "react";
import { EscolentLoader } from "@/components/escolent-logo";

export type TeacherAskTask = "overview_ask" | "teacher_today_ask" | "teacher_briefing_ask";

export function TeacherAskBox({
  spaceFilter,
  task = "overview_ask",
  placeholder = "Ask the grid… e.g. \"who's below 60% on two-step equations\"",
  loadingLabel = "Scanning the grid…",
  scripted,
}: {
  spaceFilter: string | null;
  task?: TeacherAskTask;
  placeholder?: string;
  loadingLabel?: string;
  /**
   * A fixed question and answer to display instead of a live input. The guided
   * tour uses this so a visitor never has to type; the pair is shown as-is and
   * nothing is sent to /api/ai.
   */
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
          spaceFilter: spaceFilter ?? "all",
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
    <div className="esc-mastery-ask">
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
      {shownLoading ? (
        <div style={{ marginTop: 10 }}>
          <EscolentLoader label={loadingLabel} size={16} />
        </div>
      ) : null}
      {error && !scripted ? <p className="esc-mastery-ask-error">{error}</p> : null}
      {shownAnswer ? <div className="esc-mastery-ask-answer">{shownAnswer}</div> : null}
    </div>
  );
}
