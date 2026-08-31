"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getPrimaryAdmin } from "@/lib/demo-data/staff";
import { isEmbedMode } from "@/lib/embed";
import { useAdminTour } from "@/components/admin-tour-provider";
import { parseDeletionIntent } from "@/lib/deletion-intent";
import type { DataDeletionRequest } from "@/lib/student-data-store";
import { DELETION_HOLD_MS } from "@/lib/student-data-store";
import { EscolentLoader } from "@/components/escolent-logo";

type ExportKind = "interactions" | "mastery" | "sessions";

interface ExportStudentOption {
  id: string;
  fullName: string;
  confirmPhrase: string;
}

interface RecordViewer {
  staffId: string;
  displayName: string;
  viewedAt: string;
}

interface DataRequestsPayload {
  exportStudentCount: number;
  students: ExportStudentOption[];
  requests: DataDeletionRequest[];
  demoElapsed: boolean;
  adminId: string;
}

const EXPORT_OPTIONS: { kind: ExportKind; title: string; detail: string; filename: string }[] = [
  {
    kind: "interactions",
    title: "Interaction data",
    detail: "Misconception observations and activity labels per student.",
    filename: "escolent-interactions.csv",
  },
  {
    kind: "mastery",
    title: "Mastery state",
    detail: "Skill tiers, prerequisite gaps, and teacher override notes.",
    filename: "escolent-mastery.csv",
  },
  {
    kind: "sessions",
    title: "Session history",
    detail: "Practice sessions with duration and problems attempted.",
    filename: "escolent-session-history.csv",
  },
];

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function holdHoursLabel(): string {
  return `${DELETION_HOLD_MS / (60 * 60 * 1000)} hours`;
}

function DeletionStatusBadge({ request }: { request: DataDeletionRequest }) {
  const className =
    request.status === "complete"
      ? "esc-admin-data-badge-complete"
      : "esc-admin-data-badge-pending";
  const label = request.status === "complete" ? "Complete" : "Pending";
  return <span className={["esc-admin-data-badge", className].join(" ")}>{label}</span>;
}

function AdminDataRequestsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const admin = getPrimaryAdmin();
  const { stage } = useAdminTour();
  const tourDeletionDemo = Boolean(stage?.showDeletionConfirmDemo);
  const isEmbed = isEmbedMode(searchParams);
  const demoMode = !isEmbed && searchParams.get("demo") === "1";
  const selectedId = searchParams.get("request") ?? null;

  const [payload, setPayload] = useState<DataRequestsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherViewers, setOtherViewers] = useState<RecordViewer[]>([]);

  const [plainLanguage, setPlainLanguage] = useState("");
  const [intentRouting, setIntentRouting] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/data-requests");
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as DataRequestsPayload;
      setPayload(data);
    } catch {
      setError("Could not load data requests right now.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!tourDeletionDemo || !payload?.students.length) return;
    const mia =
      payload.students.find((student) => student.id === "mia_ndlovu") ??
      payload.students[0];
    if (!mia) return;
    setStudentId(mia.id);
    setConfirmPhrase(`DELETE ${mia.fullName}`);
    setIntentRouting(null);
    setPlainLanguage("");
  }, [payload?.students, tourDeletionDemo]);

  const selectedRequest = useMemo(
    () => payload?.requests.find((request) => request.id === selectedId) ?? null,
    [payload?.requests, selectedId],
  );

  const selectRequest = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("request", id);
      else params.delete("request");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!selectedId) {
      setOtherViewers([]);
      return;
    }

    let cancelled = false;

    async function openDetail() {
      try {
        await fetch(`/api/admin/data-requests/${selectedId}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const response = await fetch(`/api/admin/data-requests/${selectedId}`);
        if (!response.ok) return;
        const data = (await response.json()) as {
          request: DataDeletionRequest;
          otherViewers: RecordViewer[];
        };
        if (cancelled) return;
        setOtherViewers(data.otherViewers);
        setPayload((current) =>
          current
            ? {
                ...current,
                requests: current.requests.map((entry) =>
                  entry.id === data.request.id ? data.request : entry,
                ),
              }
            : current,
        );
      } catch {
        if (!cancelled) setOtherViewers([]);
      }
    }

    void openDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedStudent = payload?.students.find((student) => student.id === studentId) ?? null;
  const expectedPhrase = selectedStudent?.confirmPhrase ?? "";

  const routePlainLanguage = () => {
    const trimmed = plainLanguage.trim();
    if (!trimmed) return;
    const parsed = parseDeletionIntent(trimmed);
    if (!parsed.isDeletionIntent) {
      setFormError(
        "That reads like a general request — describe a data deletion (e.g. remove this graduated student's account).",
      );
      return;
    }
    if (!parsed.matchedStudentId) {
      setFormError("Name a student in the school roster so Escolent knows whose data to delete.");
      return;
    }
    setFormError(null);
    setIntentRouting(trimmed);
    setStudentId(parsed.matchedStudentId);
    setConfirmPhrase("");
  };

  const submitDeletion = async (viaIntent: boolean) => {
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const body = viaIntent
        ? { intentText: intentRouting ?? plainLanguage, confirmPhrase }
        : { studentId, confirmPhrase, plainLanguageTrigger: null };
      const response = await fetch("/api/admin/data-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string; request?: DataDeletionRequest };
      if (!response.ok) throw new Error(data.error ?? "Could not submit deletion request.");
      setFormSuccess(
        `Deletion scheduled — identifiable data for ${data.request?.studentName ?? "the student"} will be removed after the ${holdHoursLabel()} hold unless you cancel in production.`,
      );
      setConfirmPhrase("");
      setPlainLanguage("");
      setIntentRouting(null);
      await load();
      if (data.request) selectRequest(data.request.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit deletion request.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDemoElapsed = async (enabled: boolean) => {
    await fetch("/api/admin/data-requests/demo-elapsed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load();
    if (selectedId) {
      const response = await fetch(`/api/admin/data-requests/${selectedId}`);
      if (response.ok) {
        const data = (await response.json()) as { request: DataDeletionRequest };
        setPayload((current) =>
          current
            ? {
                ...current,
                requests: current.requests.map((entry) =>
                  entry.id === data.request.id ? data.request : entry,
                ),
                demoElapsed: enabled,
              }
            : current,
        );
      }
    }
  };

  const simulatePeerViewer = async () => {
    if (!selectedId) return;
    const response = await fetch(`/api/admin/data-requests/${selectedId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoPeer: true }),
    });
    if (response.ok) {
      const data = (await response.json()) as { otherViewers: RecordViewer[] };
      setOtherViewers(data.otherViewers);
    }
  };

  const downloadExport = (kind: ExportKind) => {
    window.location.assign(`/api/admin/export?kind=${encodeURIComponent(kind)}`);
  };

  return (
    <div className="esc-screen esc-admin-data-screen">
      <header style={{ marginBottom: 24 }}>
        <Link href="/admin/today" className="esc-spaces-back">
          ← Today
        </Link>
        <h1 className="esc-staff-foundation-title" style={{ marginTop: 12, marginBottom: 6 }}>
          Data export & deletion
        </h1>
        <p className="esc-staff-body" style={{ margin: 0 }}>
          CSV exports from the live pilot roster ({payload?.exportStudentCount ?? "…"} students with
          identifiable data). Deletion requests run through explicit confirmation and a{" "}
          {holdHoursLabel()} hold before personal records are removed — aggregate analytics keep
          anonymized contributions.
        </p>
      </header>

      {demoMode ? (
        <section className="esc-staff-panel esc-admin-data-demo" style={{ marginBottom: 24 }}>
          <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
            Demo harness
          </p>
          <p className="esc-staff-body esc-admin-data-demo-note">
            Simulate the 72-hour hold as already elapsed (same idea as Elena&apos;s 31-day override
            demo). Toggle off to return to real timestamps.
          </p>
          <div className="esc-admin-data-demo-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              onClick={() => void toggleDemoElapsed(!(payload?.demoElapsed ?? false))}
            >
              {payload?.demoElapsed ? "Use real 72-hour hold" : "Simulate hold elapsed"}
            </button>
            {selectedId ? (
              <button
                type="button"
                className="esc-staff-btn esc-staff-btn-secondary"
                onClick={() => void simulatePeerViewer()}
              >
                Simulate another admin viewing
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section
        className="esc-staff-panel esc-admin-data-section"
        style={{ marginBottom: 24 }}
        data-tour="admin-data-export"
      >
        <h2 className="esc-staff-section-title">Export (Requirement 16)</h2>
        <p className="esc-staff-body">
          Three CSV files from current roster and session data — ready for regulatory or parent
          access requests.
        </p>
        <div className="esc-admin-data-export-grid">
          {EXPORT_OPTIONS.map((option) => (
            <div key={option.kind} className="esc-admin-data-export-card">
              <h3 className="esc-admin-data-export-title">{option.title}</h3>
              <p className="esc-staff-body">{option.detail}</p>
              <p className="esc-admin-data-export-meta">{option.filename}</p>
              <button
                type="button"
                className="esc-staff-btn esc-staff-btn-primary"
                onClick={() => downloadExport(option.kind)}
                disabled={loading || (payload?.exportStudentCount ?? 0) === 0}
              >
                Download CSV
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="esc-admin-data-layout">
        <section className="esc-staff-panel esc-admin-data-section" data-tour="admin-data-deletion">
          <h2 className="esc-staff-section-title">Delete student data (Requirement 17)</h2>
          <p className="esc-staff-body">
            Plain-language requests route here — they never delete in one click. Confirm with the
            typed phrase before the {holdHoursLabel()} hold starts.
          </p>

          <label className="esc-admin-data-field">
            <span className="esc-staff-section-label">Plain-language trigger</span>
            <input
              type="text"
              className="esc-mastery-ask-input"
              placeholder='e.g. "remove this graduated student&apos;s account"'
              value={plainLanguage}
              readOnly={tourDeletionDemo}
              onChange={(event) => setPlainLanguage(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="esc-staff-btn esc-staff-btn-secondary"
            disabled={!plainLanguage.trim() || tourDeletionDemo}
            onClick={routePlainLanguage}
          >
            Route to structured flow
          </button>

          {intentRouting && selectedStudent ? (
            <p className="esc-admin-data-routing-note">
              Routed: &ldquo;{intentRouting}&rdquo; — confirm deletion for{" "}
              <strong>{selectedStudent.fullName}</strong> below.
            </p>
          ) : null}

          <div className="esc-admin-data-form-divider" aria-hidden />

          <label className="esc-admin-data-field">
            <span className="esc-staff-section-label">Student</span>
            <select
              className="esc-mastery-filter-select"
              value={studentId}
              onChange={(event) => {
                setStudentId(event.target.value);
                setConfirmPhrase("");
              }}
              disabled={Boolean(intentRouting)}
            >
              <option value="">Choose a student…</option>
              {payload?.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
          </label>

          {expectedPhrase ? (
            <div data-tour="admin-data-deletion-confirm">
              <label className="esc-admin-data-field">
                <span className="esc-staff-section-label">
                  Type exactly: <code className="esc-landing-code">{expectedPhrase}</code>
                </span>
                <input
                  type="text"
                  className="esc-mastery-ask-input"
                  value={confirmPhrase}
                  readOnly={tourDeletionDemo}
                  onChange={(event) => setConfirmPhrase(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            className="esc-staff-btn esc-staff-btn-primary"
            disabled={
              tourDeletionDemo ||
              submitting ||
              !confirmPhrase.trim() ||
              (!intentRouting && !studentId) ||
              (Boolean(expectedPhrase) &&
                confirmPhrase.trim().toUpperCase() !== expectedPhrase.toUpperCase())
            }
            onClick={() => void submitDeletion(Boolean(intentRouting))}
          >
            {submitting ? "Submitting…" : "Confirm deletion request"}
          </button>

          {formError ? <p className="esc-mastery-ask-error">{formError}</p> : null}
          {formSuccess ? <p className="esc-admin-data-success">{formSuccess}</p> : null}
        </section>

        <section className="esc-staff-panel esc-admin-data-section">
          <h2 className="esc-staff-section-title">Deletion requests</h2>
          {loading ? (
            <div style={{ padding: "20px 0" }}>
              <EscolentLoader label="Loading requests…" size={20} />
            </div>
          ) : null}
          {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
          {!loading && !error && (payload?.requests.length ?? 0) === 0 ? (
            <p className="esc-staff-body">No deletion requests yet.</p>
          ) : null}
          <ul className="esc-admin-data-request-list">
            {payload?.requests.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  className={[
                    "esc-admin-data-request-row",
                    selectedId === request.id ? "esc-admin-data-request-row-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => selectRequest(request.id)}
                >
                  <div className="esc-admin-data-request-head">
                    <span className="esc-admin-data-request-name">{request.studentName}</span>
                    <DeletionStatusBadge request={request} />
                  </div>
                  <p className="esc-admin-data-request-meta">
                    Requested {formatTimestamp(request.requestedAt)}
                    {request.status === "pending"
                      ? ` · Completes ${formatTimestamp(request.scheduledCompletionAt)}`
                      : request.completedAt
                        ? ` · Completed ${formatTimestamp(request.completedAt)}`
                        : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {selectedRequest ? (
            <div className="esc-admin-data-detail">
              <h3 className="esc-admin-data-detail-title">{selectedRequest.studentName}</h3>
              <DeletionStatusBadge request={selectedRequest} />
              <dl className="esc-admin-data-detail-list">
                <div>
                  <dt>Requested</dt>
                  <dd>{formatTimestamp(selectedRequest.requestedAt)}</dd>
                </div>
                <div>
                  <dt>Scheduled completion</dt>
                  <dd>{formatTimestamp(selectedRequest.scheduledCompletionAt)}</dd>
                </div>
                <div>
                  <dt>Initiated by</dt>
                  <dd>{admin.shortName}</dd>
                </div>
                {selectedRequest.plainLanguageTrigger ? (
                  <div>
                    <dt>Plain-language trigger</dt>
                    <dd>{selectedRequest.plainLanguageTrigger}</dd>
                  </div>
                ) : null}
                {selectedRequest.status === "complete" && selectedRequest.completedAt ? (
                  <div>
                    <dt>Completed</dt>
                    <dd>{formatTimestamp(selectedRequest.completedAt)}</dd>
                  </div>
                ) : null}
              </dl>
              {selectedRequest.status === "pending" ? (
                <p className="esc-staff-body esc-admin-data-detail-note">
                  While pending, mastery state, session history, and interaction logs stay visible
                  in exports. After completion they are removed; anonymized analytics are unchanged.
                </p>
              ) : (
                <p className="esc-staff-body esc-admin-data-detail-note">
                  Identifiable records for this student are deleted. School-wide analytics still
                  include their anonymized practice and mastery contributions.
                </p>
              )}
              {otherViewers.length > 0 ? (
                <div className="esc-admin-data-viewers" role="status">
                  <p className="esc-staff-section-label" style={{ marginBottom: 4 }}>
                    Also viewing this request
                  </p>
                  <ul>
                    {otherViewers.map((viewer) => (
                      <li key={viewer.staffId}>
                        {viewer.displayName} · opened{" "}
                        {formatTimestamp(viewer.viewedAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <button
                type="button"
                className="esc-staff-btn esc-staff-btn-secondary"
                style={{ marginTop: 12 }}
                onClick={() => selectRequest(null)}
              >
                Close detail
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export function AdminDataRequestsScreen() {
  return (
    <Suspense fallback={<div className="esc-screen esc-admin-data-screen" style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}><EscolentLoader label="Loading data requests…" size={24} /></div>}>
      <AdminDataRequestsInner />
    </Suspense>
  );
}
