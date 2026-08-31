"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  LMS_GOOGLE_OAUTH_NOTE,
  LMS_MVP_SCOPE_LINES,
  LMS_PHASE_EXCLUDED,
  LMS_PROVIDER_INSTRUCTIONS,
  LMS_SETUP_INTRO,
} from "@/lib/lms-integration-copy";
import {
  MOODLE_MVP_FUNCTIONS,
  type LmsIntegrationPublic,
  type LmsIntegrationStatusPayload,
} from "@/lib/lms-integration-store";
import { hapticTap } from "@/lib/haptics";
import { EscolentLoader } from "@/components/escolent-logo";

function StatusBadge({ status }: { status: LmsIntegrationPublic["status"] }) {
  const label =
    status === "authorized" ? "Connected" : status === "error" ? "Error" : "Not connected";
  const className =
    status === "authorized"
      ? "esc-admin-lms-badge-connected"
      : status === "error"
        ? "esc-admin-lms-badge-error"
        : "esc-admin-lms-badge-idle";
  return <span className={["esc-admin-lms-badge", className].join(" ")}>{label}</span>;
}

function CapabilityList() {
  return (
    <ul className="esc-admin-lms-capabilities">
      {LMS_MVP_SCOPE_LINES.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function CanvasPanel({
  integration,
  onUpdated,
}: {
  integration: LmsIntegrationPublic;
  onUpdated: () => void;
}) {
  const copy = LMS_PROVIDER_INSTRUCTIONS.canvas;
  const [instanceUrl, setInstanceUrl] = useState(integration.instanceUrl ?? "");
  const [developerKey, setDeveloperKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInstanceUrl(integration.instanceUrl ?? "");
  }, [integration.instanceUrl]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/lms/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lmsType: "canvas",
          instanceUrl,
          developerKey,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save Canvas connection.");
      setSaved(true);
      setDeveloperKey("");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Canvas connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="esc-staff-panel esc-admin-lms-panel" data-tour="admin-lms-canvas">
      <div className="esc-admin-lms-panel-head">
        <h2 className="esc-admin-lms-provider-title">Canvas</h2>
        <StatusBadge status={integration.status} />
      </div>
      <p className="esc-staff-body">{copy.fieldNote}</p>
      <ol className="esc-admin-lms-steps">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <CapabilityList />
      {integration.lastSyncAt ? (
        <p className="esc-admin-lms-meta">
          Last sync {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(integration.lastSyncAt))}
          {integration.credentialsMask ? ` · Key ${integration.credentialsMask}` : null}
        </p>
      ) : null}
      <div className="esc-admin-lms-form">
        <label className="esc-admin-lms-field">
          <span className="esc-staff-section-label">Instance URL</span>
          <input
            className="esc-mastery-filter-input"
            type="url"
            value={instanceUrl}
            onChange={(event) => setInstanceUrl(event.target.value)}
            placeholder="https://yourschool.instructure.com"
          />
        </label>
        <label className="esc-admin-lms-field">
          <span className="esc-staff-section-label">Developer key</span>
          <input
            className="esc-mastery-filter-input"
            type="password"
            autoComplete="off"
            value={developerKey}
            onChange={(event) => setDeveloperKey(event.target.value)}
            placeholder={integration.credentialsMask ?? "Paste developer key"}
          />
        </label>
      </div>
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
      {saved ? <p className="esc-admin-lms-success">Connection updated.</p> : null}
      <button
        type="button"
        className="esc-staff-btn esc-staff-btn-primary"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {integration.status === "authorized" ? "Update connection" : "Connect Canvas"}
      </button>
    </section>
  );
}

function MoodlePanel({
  integration,
  onUpdated,
}: {
  integration: LmsIntegrationPublic;
  onUpdated: () => void;
}) {
  const copy = LMS_PROVIDER_INSTRUCTIONS.moodle;
  const [instanceUrl, setInstanceUrl] = useState("");
  const [wsToken, setWsToken] = useState("");
  const [enabled, setEnabled] = useState<string[]>([...MOODLE_MVP_FUNCTIONS]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFunction = (fn: string) => {
    setEnabled((current) =>
      current.includes(fn) ? current.filter((entry) => entry !== fn) : [...current, fn],
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/lms/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lmsType: "moodle",
          instanceUrl,
          wsToken,
          enabledFunctions: enabled,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not connect Moodle.");
      setWsToken("");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect Moodle.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="esc-staff-panel esc-admin-lms-panel">
      <div className="esc-admin-lms-panel-head">
        <h2 className="esc-admin-lms-provider-title">Moodle</h2>
        <StatusBadge status={integration.status} />
      </div>
      <ol className="esc-admin-lms-steps">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <CapabilityList />
      <fieldset className="esc-admin-lms-functions">
        <legend className="esc-staff-section-label">MVP web-service functions</legend>
        {MOODLE_MVP_FUNCTIONS.map((fn) => (
          <label key={fn} className="esc-admin-lms-check">
            <input
              type="checkbox"
              checked={enabled.includes(fn)}
              onChange={() => toggleFunction(fn)}
            />
            <code className="esc-landing-code">{fn}</code>
          </label>
        ))}
      </fieldset>
      <div className="esc-admin-lms-form">
        <label className="esc-admin-lms-field">
          <span className="esc-staff-section-label">Site URL</span>
          <input
            className="esc-mastery-filter-input"
            type="url"
            value={instanceUrl}
            onChange={(event) => setInstanceUrl(event.target.value)}
            placeholder="https://moodle.yourschool.edu"
          />
        </label>
        <label className="esc-admin-lms-field">
          <span className="esc-staff-section-label">Web-service token</span>
          <input
            className="esc-mastery-filter-input"
            type="password"
            autoComplete="off"
            value={wsToken}
            onChange={(event) => setWsToken(event.target.value)}
            placeholder="Paste token from Moodle admin"
          />
        </label>
      </div>
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
      <button
        type="button"
        className="esc-staff-btn esc-staff-btn-primary"
        disabled={submitting}
        onClick={() => void submit()}
      >
        Connect Moodle
      </button>
    </section>
  );
}

function GooglePanel({ integration }: { integration: LmsIntegrationPublic }) {
  const copy = LMS_PROVIDER_INSTRUCTIONS.google_classroom;
  const [toast, setToast] = useState(false);

  const startOAuth = () => {
    hapticTap();
    setToast(true);
    window.setTimeout(() => setToast(false), 2200);
  };

  return (
    <section className="esc-staff-panel esc-admin-lms-panel">
      <div className="esc-admin-lms-panel-head">
        <h2 className="esc-admin-lms-provider-title">Google Classroom</h2>
        <StatusBadge status={integration.status} />
      </div>
      <p className="esc-staff-body">{copy.fieldNote}</p>
      <ol className="esc-admin-lms-steps">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <CapabilityList />
      <div className="esc-admin-lms-oauth">
        <p className="esc-staff-body" style={{ margin: 0 }}>
          Domain authorization is initiated outside Escolent — there are no OAuth fields on this
          page.
        </p>
        <button type="button" className="esc-staff-btn esc-staff-btn-secondary" onClick={startOAuth}>
          Continue with Google Workspace
        </button>
        {toast ? <p className="esc-admin-lms-oauth-toast">{LMS_GOOGLE_OAUTH_NOTE}</p> : null}
      </div>
    </section>
  );
}

export function AdminLmsSetupScreen() {
  const [data, setData] = useState<LmsIntegrationStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/lms/status");
      if (!response.ok) throw new Error("load failed");
      setData((await response.json()) as LmsIntegrationStatusPayload);
    } catch {
      setError("Could not load LMS connection status.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byType = (type: LmsIntegrationPublic["lmsType"]) =>
    data?.integrations.find((entry) => entry.lmsType === type);

  return (
    <div className="esc-screen esc-admin-lms-screen">
      <header style={{ marginBottom: 24 }}>
        <Link href="/admin/today" className="esc-spaces-back">
          ← Today
        </Link>
        <h1 className="esc-staff-foundation-title" style={{ marginTop: 12, marginBottom: 6 }}>
          LMS integration
        </h1>
        <p className="esc-staff-body" style={{ margin: 0 }}>
          {LMS_SETUP_INTRO}
        </p>
      </header>

      <div className="esc-staff-panel esc-admin-lms-scope" style={{ marginBottom: 24 }}>
        <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
          MVP scope (Requirements 36.1–36.2)
        </p>
        <CapabilityList />
        <p className="esc-admin-lms-phase-note">{LMS_PHASE_EXCLUDED}</p>
      </div>

      {loading ? (
        <div style={{ padding: "40px 0" }}>
          <EscolentLoader label="Loading LMS status…" size={22} />
        </div>
      ) : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {data && !loading ? (
        <div className="esc-admin-lms-panels">
          {byType("canvas") ? (
            <CanvasPanel integration={byType("canvas")!} onUpdated={() => void load()} />
          ) : null}
          {byType("moodle") ? (
            <MoodlePanel integration={byType("moodle")!} onUpdated={() => void load()} />
          ) : null}
          {byType("google_classroom") ? (
            <GooglePanel integration={byType("google_classroom")!} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
