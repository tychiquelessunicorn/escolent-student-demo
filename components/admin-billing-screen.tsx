"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BILLING_PLAN_PRICING,
  buildBillingChangePreview,
  type AdminBillingSnapshot,
  type BillingPlanTier,
} from "@/lib/admin-billing-store";

function formatUsd(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function AdminBillingAskBox() {
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
          task: "admin_billing_ask",
          question: trimmed,
        }),
      });
      if (!response.ok) throw new Error("ask failed");
      const data = (await response.json()) as { text?: string };
      setAnswer(data.text ?? "Nothing in the billing data matched that question.");
    } catch {
      setError("Could not check that right now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="esc-mastery-ask esc-admin-billing-ask">
      <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
        Ask about this subscription
      </p>
      <p className="esc-staff-body esc-admin-billing-ask-note">
        Plain-language lookup only — answers come from the billing fields shown above. Plan
        changes are not available here.
      </p>
      <div className="esc-mastery-ask-field">
        <input
          type="text"
          className="esc-mastery-ask-input"
          value={question}
          placeholder='e.g. "when does our subscription renew"'
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
        {question.trim() ? (
          <button type="button" className="esc-staff-btn esc-staff-btn-primary" onClick={() => void submit()}>
            Ask
          </button>
        ) : null}
      </div>
      {loading ? <p className="esc-mastery-ask-status">Checking the billing data…</p> : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
      {answer ? <div className="esc-mastery-ask-answer">{answer}</div> : null}
    </div>
  );
}

function PlanChangePanel({
  billing,
  onUpdated,
}: {
  billing: AdminBillingSnapshot;
  onUpdated: () => void;
}) {
  const otherTier: BillingPlanTier =
    billing.planTier === "core" ? "ai_adaptive" : "core";
  const [reviewing, setReviewing] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const preview = useMemo(
    () => buildBillingChangePreview(billing, otherTier),
    [billing, otherTier],
  );

  const resetReview = () => {
    setReviewing(false);
    setConfirmPhrase("");
    setError(null);
  };

  const submitChange = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier: preview.newPlanTier,
          confirmPhrase,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not change plan.");
      setSuccess(`Plan updated to ${preview.newPlanLabel}.`);
      resetReview();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change plan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="esc-staff-panel esc-admin-billing-panel">
      <h2 className="esc-admin-billing-panel-title">Change plan</h2>
      <p className="esc-staff-body">
        Structured confirmation only — financial commitments never run from plain-language
        commands (Requirement 15c.3).
      </p>

      {!reviewing ? (
        <>
          <p className="esc-staff-body">
            Switch from <strong>{preview.currentPlanLabel}</strong> (
            {formatUsd(preview.currentPricePerStudentMonth)}/student/month) to{" "}
            <strong>{preview.newPlanLabel}</strong> (
            {formatUsd(preview.newPricePerStudentMonth)}/student/month).
          </p>
          <button
            type="button"
            className="esc-staff-btn esc-staff-btn-secondary"
            onClick={() => {
              setReviewing(true);
              setSuccess(null);
              setError(null);
            }}
          >
            Review plan change
          </button>
        </>
      ) : (
        <div className="esc-admin-billing-change-review">
          <h3 className="esc-admin-billing-change-heading">Confirm before committing</h3>
          <dl className="esc-admin-billing-change-list">
            <div>
              <dt>Current plan</dt>
              <dd>
                {preview.currentPlanLabel} · {formatUsd(preview.currentPricePerStudentMonth)}
                /student/month
              </dd>
            </div>
            <div>
              <dt>New plan</dt>
              <dd>
                {preview.newPlanLabel} · {formatUsd(preview.newPricePerStudentMonth)}
                /student/month
              </dd>
            </div>
            <div>
              <dt>Seats in use</dt>
              <dd>{preview.seatsUsed}</dd>
            </div>
            <div>
              <dt>Estimated monthly charge</dt>
              <dd>
                {formatUsd(preview.currentMonthlyEstimateUsd)} →{" "}
                {formatUsd(preview.newMonthlyEstimateUsd)}
                {preview.monthlyDeltaUsd !== 0 ? (
                  <span className="esc-admin-billing-delta">
                    {" "}
                    ({preview.monthlyDeltaUsd > 0 ? "+" : ""}
                    {formatUsd(preview.monthlyDeltaUsd)})
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
          <label className="esc-admin-billing-field">
            <span className="esc-staff-section-label">
              Type exactly: <code className="esc-landing-code">{preview.confirmPhrase}</code>
            </span>
            <input
              type="text"
              className="esc-mastery-ask-input"
              value={confirmPhrase}
              onChange={(event) => setConfirmPhrase(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="esc-admin-billing-change-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={
                submitting ||
                confirmPhrase.trim().toUpperCase() !== preview.confirmPhrase.toUpperCase()
              }
              onClick={() => void submitChange()}
            >
              {submitting ? "Saving…" : "Confirm plan change"}
            </button>
            <button type="button" className="esc-staff-btn esc-staff-btn-secondary" onClick={resetReview}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
      {success ? <p className="esc-admin-data-success">{success}</p> : null}
    </section>
  );
}

export function AdminBillingScreen() {
  const [billing, setBilling] = useState<AdminBillingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/billing");
      if (!response.ok) throw new Error("load failed");
      setBilling((await response.json()) as AdminBillingSnapshot);
    } catch {
      setError("Could not load billing right now.");
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pricingTiers = Object.entries(BILLING_PLAN_PRICING) as [
    BillingPlanTier,
    (typeof BILLING_PLAN_PRICING)[BillingPlanTier],
  ][];

  return (
    <div className="esc-screen esc-admin-billing-screen">
      <header style={{ marginBottom: 24 }}>
        <Link href="/admin/today" className="esc-spaces-back">
          ← Today
        </Link>
        <h1 className="esc-staff-foundation-title" style={{ marginTop: 12, marginBottom: 6 }}>
          Billing
        </h1>
        <p className="esc-staff-body" style={{ margin: 0 }}>
          Pilot subscription for Teneo — Core at {formatUsd(1.5)} or AI-Adaptive at{" "}
          {formatUsd(2.5)} per student per month. Seats used reflect the live roster enrolled on
          Escolent.
        </p>
      </header>

      {loading ? <p className="esc-staff-body">Loading billing…</p> : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {billing ? (
        <>
          <section className="esc-staff-panel esc-admin-billing-summary" style={{ marginBottom: 24 }}>
            <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
              Current subscription
            </p>
            <p className="esc-mastery-scope">{billing.scopeLabel}</p>
            <div className="esc-admin-billing-metrics">
              <div className="esc-admin-billing-metric">
                <span className="esc-admin-billing-metric-label">Plan</span>
                <span className="esc-admin-billing-metric-value">{billing.planLabel}</span>
                <span className="esc-admin-billing-metric-sub">
                  {formatUsd(billing.pricePerStudentMonth)}/student/month
                </span>
              </div>
              <div className="esc-admin-billing-metric">
                <span className="esc-admin-billing-metric-label">Seats</span>
                <span className="esc-admin-billing-metric-value">
                  {billing.seatsUsed} / {billing.seatCount}
                </span>
                <span className="esc-admin-billing-metric-sub">Licensed in pilot</span>
              </div>
              <div className="esc-admin-billing-metric">
                <span className="esc-admin-billing-metric-label">Renewal</span>
                <span className="esc-admin-billing-metric-value">{billing.renewalDateLabel}</span>
                <span className="esc-admin-billing-metric-sub">
                  {billing.daysUntilRenewal === 1
                    ? "1 day from pilot today"
                    : `${billing.daysUntilRenewal} days from pilot today`}
                </span>
              </div>
              <div className="esc-admin-billing-metric">
                <span className="esc-admin-billing-metric-label">Est. monthly</span>
                <span className="esc-admin-billing-metric-value">
                  {formatUsd(billing.monthlyEstimateUsd)}
                </span>
                <span className="esc-admin-billing-metric-sub">At current seat usage</span>
              </div>
            </div>
            <p className="esc-staff-body" style={{ margin: 0 }}>
              {billing.licensedSeatsNote}
            </p>
          </section>

          <AdminBillingAskBox />

          <section className="esc-staff-panel esc-admin-billing-pricing" style={{ marginTop: 24, marginBottom: 24 }}>
            <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
              Available plans
            </p>
            <ul className="esc-admin-billing-plan-list">
              {pricingTiers.map(([tier, pricing]) => (
                <li
                  key={tier}
                  className={
                    billing.planTier === tier ? "esc-admin-billing-plan-current" : undefined
                  }
                >
                  <strong>{pricing.label}</strong> — {formatUsd(pricing.pricePerStudentMonth)} per
                  student per month
                  {billing.planTier === tier ? " · current" : ""}
                </li>
              ))}
            </ul>
          </section>

          <PlanChangePanel billing={billing} onUpdated={() => void load()} />
        </>
      ) : null}
    </div>
  );
}
