"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isEmbedMode } from "@/lib/embed";
import type {
  AdminPilotPayload,
  PilotSpaceAccess,
  PilotSpaceId,
} from "@/lib/admin-pilot-store";

function SpaceToggleRow({
  space,
  toggling,
  onToggle,
}: {
  space: PilotSpaceAccess;
  toggling: PilotSpaceId | null;
  onToggle: (spaceId: PilotSpaceId, enabled: boolean) => void;
}) {
  return (
    <li className="esc-admin-pilot-space-row">
      <div className="esc-admin-pilot-space-main">
        <div className="esc-admin-pilot-space-head">
          <span className="esc-admin-pilot-space-name">{space.name}</span>
          <span
            className={`esc-admin-pilot-space-status ${
              space.enabled ? "esc-admin-pilot-space-status-on" : "esc-admin-pilot-space-status-off"
            }`}
          >
            {space.enabled ? "Access on" : "Access off"}
          </span>
        </div>
        <p className="esc-staff-body esc-admin-pilot-space-meta">
          {space.grade} · {space.teacherName} · {space.studentCount} students enrolled
        </p>
        {!space.enabled ? (
          <p className="esc-admin-pilot-space-enforcement">
            Students assigned here are blocked from the Student shell until access is turned back on.
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className={`esc-staff-btn ${
          space.enabled ? "esc-staff-btn-secondary" : "esc-staff-btn-primary"
        }`}
        disabled={toggling === space.id}
        onClick={() => onToggle(space.id, !space.enabled)}
      >
        {toggling === space.id ? "Saving…" : space.enabled ? "Disable access" : "Enable access"}
      </button>
    </li>
  );
}

function Day21Panel({ payload }: { payload: AdminPilotPayload }) {
  const { day21 } = payload;
  const summary = day21.summary;

  if (day21.mode === "not_yet_due") {
    return (
      <p className="esc-staff-body">
        Day-{payload.checkpointDay} checkpoint is scheduled for {day21.checkpointDateLabel}. The
        summary will appear once the pilot reaches that day.
      </p>
    );
  }

  const modeLabel =
    day21.mode === "historical"
      ? `Recorded on ${summary?.generatedDateLabel ?? day21.checkpointDateLabel}`
      : "Demo harness — simulated as if today is day 21";

  return (
    <div className="esc-admin-pilot-day21">
      <p className="esc-admin-pilot-day21-mode">{modeLabel}</p>
      {summary ? (
        <>
          <dl className="esc-admin-pilot-day21-metrics">
            <div>
              <dt>Students with sessions</dt>
              <dd>
                {summary.studentsWithSessions} / {payload.totalStudents}
              </dd>
            </div>
            <div>
              <dt>Active in final week</dt>
              <dd>{summary.activeStudents}</dd>
            </div>
            <div>
              <dt>Sessions logged</dt>
              <dd>{summary.totalSessions}</dd>
            </div>
            <div>
              <dt>Practice problems</dt>
              <dd>{summary.totalPracticeProblems}</dd>
            </div>
            <div>
              <dt>Avg durable skills</dt>
              <dd>{summary.averageDurableSkillsPerStudent}</dd>
            </div>
          </dl>
          <ul className="esc-admin-pilot-day21-lines">
            {summary.summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function AdminPilotInner() {
  const searchParams = useSearchParams();
  const isEmbed = isEmbedMode(searchParams);
  const demoMode = !isEmbed && searchParams.get("demo") === "1";

  const [payload, setPayload] = useState<AdminPilotPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingSpace, setTogglingSpace] = useState<PilotSpaceId | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/pilot");
      if (!response.ok) throw new Error("load failed");
      setPayload((await response.json()) as AdminPilotPayload);
    } catch {
      setError("Could not load pilot scope right now.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSpace = async (spaceId: PilotSpaceId, enabled: boolean) => {
    setTogglingSpace(spaceId);
    setSpaceError(null);
    try {
      const response = await fetch("/api/admin/pilot/space-enabled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, enabled }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update Space access.");
      await load();
    } catch (err) {
      setSpaceError(err instanceof Error ? err.message : "Could not update Space access.");
    } finally {
      setTogglingSpace(null);
    }
  };

  const toggleDemoAtDay21 = async (enabled: boolean) => {
    await fetch("/api/admin/pilot/demo-at-day21", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load();
  };

  return (
    <div className="esc-screen esc-admin-pilot-screen">
      <header style={{ marginBottom: 24 }}>
        <Link href="/admin/today" className="esc-spaces-back">
          ← Today
        </Link>
        <h1 className="esc-staff-foundation-title" style={{ marginTop: 12, marginBottom: 6 }}>
          Pilot scope
        </h1>
        <p className="esc-staff-body" style={{ margin: 0 }}>
          {payload?.scopeLabel ?? "Teneo pilot"} — week {payload?.pilotWeek ?? 6}, day{" "}
          {payload?.currentPilotDay ?? "…"} of the rollout. Enable or pause Platform access per
          teaching Space; student enforcement is live when a Space is off.
        </p>
      </header>

      {demoMode ? (
        <section className="esc-staff-panel esc-admin-pilot-demo" style={{ marginBottom: 24 }}>
          <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
            Demo harness
          </p>
          <p className="esc-staff-body esc-admin-pilot-demo-note">
            The live pilot is already past day {payload?.checkpointDay ?? 21}, so the checkpoint
            summary is stored as a historical record. Toggle below to simulate &ldquo;currently at
            day 21&rdquo; for walkthroughs — same pattern as the deletion hold and Elena&apos;s
            override demo.
          </p>
          <button
            type="button"
            className="esc-staff-btn esc-staff-btn-secondary"
            onClick={() => void toggleDemoAtDay21(!(payload?.demoAtDay21 ?? false))}
          >
            {payload?.demoAtDay21 ? "Use historical day-21 record" : "Simulate currently at day 21"}
          </button>
        </section>
      ) : null}

      {loading ? <p className="esc-staff-body">Loading pilot scope…</p> : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
      {spaceError ? <p className="esc-mastery-ask-error">{spaceError}</p> : null}

      {payload ? (
        <>
          <section className="esc-staff-panel esc-admin-pilot-section" style={{ marginBottom: 24 }}>
            <h2 className="esc-staff-section-title">Spaces (Req 14.1)</h2>
            <p className="esc-staff-body">
              Two teaching Spaces in the pilot — toggle Platform access without changing roster
              membership.
            </p>
            <ul className="esc-admin-pilot-space-list">
              {payload.spaces.map((space) => (
                <SpaceToggleRow
                  key={space.id}
                  space={space}
                  toggling={togglingSpace}
                  onToggle={(spaceId, enabled) => void toggleSpace(spaceId, enabled)}
                />
              ))}
            </ul>
          </section>

          <section className="esc-staff-panel esc-admin-pilot-section" style={{ marginBottom: 24 }}>
            <h2 className="esc-staff-section-title">Teachers &amp; staff (Req 14.2)</h2>
            <p className="esc-staff-body">
              Active accounts with Platform access — {payload.totalStudents} students enrolled across
              both Spaces.
            </p>
            <ul className="esc-admin-pilot-staff-list">
              {payload.staff.map((member) => (
                <li key={member.id} className="esc-admin-pilot-staff-row">
                  <div className="esc-admin-pilot-staff-main">
                    <span className="esc-admin-pilot-staff-name">{member.fullName}</span>
                    <span className="esc-admin-pilot-staff-email">{member.email}</span>
                  </div>
                  <span className="esc-admin-pilot-staff-role">{member.roleLabel}</span>
                  <span
                    className={`esc-admin-users-status esc-admin-users-status-${member.statusLabel.toLowerCase()}`}
                  >
                    {member.statusLabel}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="esc-staff-panel esc-admin-pilot-section" style={{ marginBottom: 24 }}>
            <h2 className="esc-staff-section-title">
              Day-{payload.checkpointDay} progress summary (Req 14.4)
            </h2>
            <p className="esc-staff-body">
              Checkpoint date {payload.checkpointDateLabel}. Metrics are computed from roster session
              data through that date and persisted as a historical record.
            </p>
            <Day21Panel payload={payload} />
          </section>

          <section className="esc-staff-panel esc-admin-pilot-notes">
            <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
              Out of scope in this build
            </p>
            <p className="esc-staff-body" style={{ marginBottom: 8 }}>
              {payload.notes.req145Deferred}
            </p>
            <p className="esc-staff-body" style={{ margin: 0 }}>
              {payload.notes.req146Satisfied}
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

export function AdminPilotScreen() {
  return (
    <Suspense fallback={<div className="esc-screen esc-admin-pilot-screen">Loading…</div>}>
      <AdminPilotInner />
    </Suspense>
  );
}
