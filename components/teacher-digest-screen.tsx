"use client";

import { useEffect, useState } from "react";
import { hapticTap } from "@/lib/haptics";
import {
  DIGEST_WEEKDAY_OPTIONS,
  type DigestSchedule,
  type DigestWeekday,
  type WeeklyDigestMetrics,
} from "@/lib/digest-types";

type Step = "edit" | "confirm";

function formatWeekday(weekday: DigestWeekday): string {
  return DIGEST_WEEKDAY_OPTIONS.find((option) => option.id === weekday)?.label ?? weekday;
}

export function TeacherDigestScreen() {
  const [schedule, setSchedule] = useState<DigestSchedule | null>(null);
  const [draftWeekday, setDraftWeekday] = useState<DigestWeekday>("friday");
  const [draftTime, setDraftTime] = useState("16:00");
  const [metrics, setMetrics] = useState<WeeklyDigestMetrics | null>(null);
  const [step, setStep] = useState<Step>("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/teacher/digest");
        if (!response.ok) throw new Error("load failed");
        const data = (await response.json()) as {
          schedule: DigestSchedule;
          metrics: WeeklyDigestMetrics;
        };
        if (cancelled) return;
        setSchedule(data.schedule);
        setDraftWeekday(data.schedule.weekday);
        setDraftTime(data.schedule.time);
        setMetrics(data.metrics);
      } catch {
        if (!cancelled) setError("Could not load digest settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty =
    schedule != null &&
    (draftWeekday !== schedule.weekday || draftTime !== schedule.time);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/teacher/digest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekday: draftWeekday, time: draftTime }),
      });
      const data = (await response.json()) as { schedule?: DigestSchedule; error?: string };
      if (!response.ok || !data.schedule) {
        setError(data.error ?? "Could not save schedule.");
        return;
      }
      hapticTap();
      setSchedule(data.schedule);
      setStep("edit");
    } catch {
      setError("Could not save schedule — try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = async () => {
    setGenerating(true);
    setError(null);
    setPreview(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "teacher_weekly_digest" }),
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not generate digest preview.");
        return;
      }
      hapticTap();
      setPreview(data.text?.trim() || "Nothing to summarize for this week.");
    } catch {
      setError("Could not generate digest preview — try again in a moment.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="esc-screen esc-digest-screen">
        <p className="esc-staff-body">Loading…</p>
      </div>
    );
  }

  return (
    <div className="esc-screen esc-digest-screen">
      <h1 className="esc-staff-foundation-title">Settings</h1>
      <p className="esc-spaces-lede">
        Weekly digest schedule and a preview of the email that would be sent — content is generated
        from this week&apos;s real metrics; nothing is emailed from this demo.
      </p>

      {step === "edit" ? (
        <>
          <section className="esc-spaces-section">
            <h2 className="esc-staff-section-label">Weekly digest schedule</h2>
            <p className="esc-spaces-hint">
              Day and time the digest would go out (Req 12.5). Saved per teacher in Redis — not
              in-memory.
            </p>
            <div className="esc-digest-schedule">
              <label className="esc-spaces-label" htmlFor="digest-weekday">
                Day
              </label>
              <select
                id="digest-weekday"
                className="esc-mastery-filter-select esc-digest-select"
                value={draftWeekday}
                onChange={(event) => setDraftWeekday(event.target.value as DigestWeekday)}
              >
                {DIGEST_WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="esc-spaces-label" htmlFor="digest-time">
                Time
              </label>
              <input
                id="digest-time"
                type="time"
                className="esc-spaces-input esc-digest-time"
                value={draftTime}
                onChange={(event) => setDraftTime(event.target.value)}
              />
            </div>
            <div className="esc-spaces-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="esc-staff-btn esc-staff-btn-primary"
                disabled={!dirty}
                onClick={() => {
                  hapticTap();
                  setStep("confirm");
                }}
              >
                Review and confirm
              </button>
            </div>
          </section>

          <section className="esc-spaces-section">
            <h2 className="esc-staff-section-label">This week&apos;s metrics</h2>
            <p className="esc-spaces-hint">
              Grounding numbers for the digest — same sources Overview and Briefing already use.
            </p>
            {metrics ? (
              <ul className="esc-digest-metrics">
                <li>
                  <strong>{metrics.durableMasteryCount}</strong> students reached durable mastery
                  this week (teacher-confirmed)
                </li>
                <li>
                  <strong>{metrics.flaggedGapCount}</strong> students with flagged prerequisite gaps
                </li>
                <li>
                  Most common misconceptions:{" "}
                  {metrics.misconceptions.length > 0
                    ? metrics.misconceptions
                        .slice(0, 3)
                        .map((item) => `${item.label} (${item.studentCount})`)
                        .join("; ")
                    : "none"}
                </li>
              </ul>
            ) : null}
          </section>

          <section className="esc-spaces-section">
            <h2 className="esc-staff-section-label">Email preview</h2>
            <p className="esc-spaces-hint">
              Generate a real AI draft from the metrics above — not a static template with blanks
              filled in.
            </p>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              disabled={generating}
              onClick={() => void generatePreview()}
            >
              {generating ? "Generating…" : "Generate this week’s preview"}
            </button>

            {preview ? (
              <div className="esc-digest-preview">
                <div className="esc-digest-preview-label">
                  Preview — email that would be sent, not a live send
                </div>
                <p className="esc-digest-preview-body">{preview}</p>
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <section className="esc-override-flow">
          <h2 className="esc-staff-section-label">Confirm digest schedule</h2>
          <p className="esc-staff-body">
            Send weekly digests on <strong>{formatWeekday(draftWeekday)}</strong> at{" "}
            <strong>{draftTime}</strong>.
          </p>
          <p className="esc-spaces-hint">
            This saves when the digest would go out. This demo does not send email.
          </p>
          <div className="esc-override-flow-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Confirm and save"}
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              disabled={saving}
              onClick={() => setStep("edit")}
            >
              Back
            </button>
          </div>
        </section>
      )}

      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
    </div>
  );
}
