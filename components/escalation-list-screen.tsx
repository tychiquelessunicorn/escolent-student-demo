"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EscalationRow } from "@/components/escalation-row";
import { PageHeading, SectionLabel } from "@/components/ui";
import type { EscalationRecord } from "@/lib/distress";
import { hapticTap } from "@/lib/haptics";

const POLL_MS = 17_000;

export function EscalationListScreen() {
  const [records, setRecords] = useState<EscalationRecord[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/distress");
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as {
        records?: EscalationRecord[];
        note?: string;
      };
      setRecords(data.records ?? []);
      setNote(data.note ?? null);
      setError(null);
    } catch {
      setError("Could not load escalations right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const unacknowledged = records.filter((record) => !record.acknowledgedBy);

  return (
    <div className="esc-screen">
      <div className="esc-screen-top">
        <PageHeading
          title="Escalations"
          subtitle="Student distress signals and direct help requests — the same records the Student shell creates."
        />
      </div>

      {loading ? (
        <p style={{ color: "var(--color-content-secondary)", fontSize: 15 }}>Loading…</p>
      ) : null}

      {error ? (
        <p style={{ color: "var(--color-error)", fontSize: 15 }}>{error}</p>
      ) : null}

      {note ? (
        <p
          style={{
            color: "var(--color-content-secondary)",
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {note}
        </p>
      ) : null}

      {!loading && !error && records.length === 0 ? (
        <p style={{ color: "var(--color-content-secondary)", fontSize: 15, lineHeight: 1.55 }}>
          No escalation records yet. Trigger one from the Student shell — a help-reason tap or
          passive detection on any ask box — and it will appear here within a few seconds.
        </p>
      ) : null}

      {unacknowledged.length > 0 ? (
        <section style={{ marginBottom: 32 }} data-tour="teacher-escalations-list">
          <SectionLabel>Needs acknowledgment ({unacknowledged.length})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {unacknowledged.map((record) => (
              <EscalationRow key={record.id} record={record} />
            ))}
          </div>
        </section>
      ) : null}

      {records.filter((record) => record.acknowledgedBy).length > 0 ? (
        <section data-tour={unacknowledged.length === 0 ? "teacher-escalations-list" : undefined}>
          <SectionLabel>Acknowledged</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {records
              .filter((record) => record.acknowledgedBy)
              .map((record) => (
                <EscalationRow key={record.id} record={record} />
              ))}
          </div>
        </section>
      ) : null}

      <div style={{ marginTop: 28 }}>
        <Link
          href="/student/today"
          className="esc-pressable"
          onClick={() => hapticTap()}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-accent-strong)",
          }}
        >
          Open Student shell to trigger a live record
        </Link>
      </div>
    </div>
  );
}
