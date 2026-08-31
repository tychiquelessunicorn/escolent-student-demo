"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EscolentLoader } from "@/components/escolent-logo";
import type { EscalationOversightSummary } from "@/lib/admin-escalation-oversight";

export function AdminEscalationOversightScreen() {
  const [data, setData] = useState<EscalationOversightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/escalations");
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as EscalationOversightSummary;
        if (cancelled) return;
        setData(payload);
        setError(null);
      } catch {
        if (cancelled) return;
        setError("Could not load escalation oversight right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="esc-screen">
      <header style={{ marginBottom: 24 }}>
        <Link href="/admin/briefing" className="esc-spaces-back">
          ← Briefing
        </Link>
        <h1 className="esc-staff-foundation-title" style={{ marginTop: 12, marginBottom: 6 }}>
          Escalation oversight
        </h1>
        <p className="esc-staff-body" style={{ margin: 0 }}>
          School-wide counts from the same distress store teachers respond in — aggregate only, no
          individual records.
        </p>
      </header>

      {loading ? (
        <div style={{ padding: "40px 0" }}>
          <EscolentLoader label="Loading oversight summary…" size={22} />
        </div>
      ) : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {data && !loading && !error ? (
        <div className="esc-staff-panel" style={{ display: "grid", gap: 20 }}>
          <div>
            <p className="esc-staff-section-label">Open now</p>
            <p className="esc-staff-foundation-title" style={{ margin: 0, fontSize: 28 }}>
              {data.openCount}
            </p>
            <p className="esc-staff-body" style={{ marginTop: 6 }}>
              Unacknowledged across the school — teachers handle case detail on their Briefing.
            </p>
          </div>

          <div>
            <p className="esc-staff-section-label">
              Open longer than {data.thresholdHours} hours
            </p>
            <p className="esc-staff-foundation-title" style={{ margin: 0, fontSize: 28 }}>
              {data.openLongerThanThresholdCount}
            </p>
            <p className="esc-staff-body" style={{ marginTop: 6 }}>
              The aging threshold Admin Briefing surfaces as an oversight signal (Req 15.7).
            </p>
          </div>

          {data.oldestOpenAgeHours !== null ? (
            <div>
              <p className="esc-staff-section-label">Oldest open case</p>
              <p className="esc-staff-body" style={{ margin: 0 }}>
                {data.oldestOpenAgeHours} hour{data.oldestOpenAgeHours === 1 ? "" : "s"} since
                raised — still unacknowledged somewhere in the school.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
