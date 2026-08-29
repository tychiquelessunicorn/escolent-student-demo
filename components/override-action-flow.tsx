"use client";

import { useState } from "react";
import { OVERVIEW_SKILL_COLUMNS } from "@/lib/demo-data/overview-skills";
import { hapticTap } from "@/lib/haptics";

export type OverrideFlowMode = "mark" | "revisit";

export function OverrideActionFlow({
  studentId,
  studentName,
  skillId,
  skillName,
  mode,
  existingReason,
  onCancel,
  onApplied,
}: {
  studentId: string;
  studentName: string;
  skillId: string;
  skillName: string;
  mode: OverrideFlowMode;
  existingReason?: string | null;
  onCancel: () => void;
  onApplied: () => void;
}) {
  const [step, setStep] = useState<"revisit_choice" | "reason" | "confirm">(
    mode === "revisit" ? "revisit_choice" : "reason",
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedSkillName =
    skillName ||
    OVERVIEW_SKILL_COLUMNS.find((skill) => skill.id === skillId)?.name ||
    skillId;

  const submit = async (kind: "mark_mastered" | "reconfirm", submitReason: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/teacher/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          skillId,
          reason: submitReason,
          kind,
          entryMethod: "structured",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not apply override.");
        return;
      }
      hapticTap();
      onApplied();
    } catch {
      setError("Could not apply override — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="esc-override-flow" role="group" aria-label="Mark as mastered">
      <div className="esc-override-flow-header">
        <h3 className="esc-staff-section-label" style={{ marginBottom: 4 }}>
          {mode === "revisit" && step === "revisit_choice"
            ? "Override check"
            : step === "confirm"
              ? "Confirm override"
              : "Mark as mastered"}
        </h3>
        <p className="esc-override-flow-target">
          {studentName} · {resolvedSkillName}
        </p>
      </div>

      {step === "revisit_choice" ? (
        <>
          <p className="esc-staff-body">
            This override is more than 30 days old
            {existingReason ? (
              <>
                : “{existingReason}”
              </>
            ) : (
              "."
            )}{" "}
            Confirm it still holds, or reassess with a fresh reason.
          </p>
          <div className="esc-override-flow-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={submitting}
              onClick={() => void submit("reconfirm", existingReason ?? "")}
            >
              {submitting ? "Saving…" : "Confirm still mastered"}
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              disabled={submitting}
              onClick={() => {
                hapticTap();
                setReason("");
                setStep("reason");
              }}
            >
              Reassess
            </button>
            <button type="button" className="esc-staff-btn esc-staff-btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {step === "reason" ? (
        <>
          <label className="esc-override-flow-label" htmlFor="override-reason">
            Brief reason <span className="esc-override-flow-required">(required)</span>
          </label>
          <textarea
            id="override-reason"
            className="esc-override-flow-textarea"
            rows={3}
            maxLength={200}
            value={reason}
            placeholder="e.g. Observed fluent work in class — platform still showed struggling."
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="esc-override-flow-hint">{reason.trim().length}/200 · at least 10 characters</p>
          <div className="esc-override-flow-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={reason.trim().length < 10}
              onClick={() => {
                hapticTap();
                setStep("confirm");
              }}
            >
              Continue
            </button>
            <button type="button" className="esc-staff-btn esc-staff-btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {step === "confirm" ? (
        <>
          <p className="esc-staff-body">
            Mark <strong>{resolvedSkillName}</strong> as durable for{" "}
            <strong>{studentName}</strong>? This updates mastery immediately and is logged
            to override history.
          </p>
          <blockquote className="esc-override-flow-quote">{reason.trim()}</blockquote>
          <div className="esc-override-flow-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={submitting}
              onClick={() => void submit("mark_mastered", reason)}
            >
              {submitting ? "Saving…" : "Confirm and apply"}
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              disabled={submitting}
              onClick={() => setStep("reason")}
            >
              Back
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              disabled={submitting}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
    </div>
  );
}
