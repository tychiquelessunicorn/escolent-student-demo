"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, PageHeading, SectionLabel } from "@/components/ui";
import {
  DEMO_SESSION_STAFF_ID,
  formatStaffName,
  getStaffMember,
} from "@/lib/demo-data/staff";
import { DISTRESS_SCRIPTED_MESSAGE } from "@/lib/distress";
import {
  formatClassifierNote,
  formatDetectionMethod,
  formatDistressSurface,
  formatTimestamp,
} from "@/lib/distress-labels";
import type { EscalationRecord } from "@/lib/distress";
import { hapticTap } from "@/lib/haptics";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="esc-escalation-field-label">{label}</div>
      <div className="esc-escalation-field-value">{children}</div>
    </div>
  );
}

export function EscalationDetailScreen({ escalationId }: { escalationId: string }) {
  const [record, setRecord] = useState<EscalationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/distress?id=${encodeURIComponent(escalationId)}`);
      if (response.status === 404) {
        setRecord(null);
        setError("This escalation could not be found.");
        return;
      }
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as { record: EscalationRecord };
      setRecord(data.record);
      setError(null);
    } catch {
      setError("Could not load this escalation.");
    } finally {
      setLoading(false);
    }
  }, [escalationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!escalationId) return;
    void fetch(`/api/distress/${escalationId}/view`, { method: "POST" }).then((response) => {
      if (response.ok) {
        void response.json().then((data: { record?: EscalationRecord }) => {
          if (data.record) setRecord(data.record);
        });
      }
    });
  }, [escalationId]);

  const acknowledge = async () => {
    if (!record?.id || record.acknowledgedBy) return;
    hapticTap();
    setAcknowledging(true);
    try {
      const response = await fetch(`/api/distress/${record.id}/acknowledge`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("ack failed");
      const data = (await response.json()) as { record: EscalationRecord };
      setRecord(data.record);
    } catch {
      setError("Could not acknowledge just now — try again.");
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="esc-screen">
        <p style={{ color: "var(--color-content-secondary)", fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="esc-screen">
        <PageHeading title="Escalation" subtitle={error ?? "Not found"} />
        <Link href="/teacher/escalations" style={{ fontSize: 14, fontWeight: 600 }}>
          Back to list
        </Link>
      </div>
    );
  }

  const sarahView = record.views.find((view) => view.staffId === DEMO_SESSION_STAFF_ID);
  const otherViews = record.views.filter((view) => view.staffId !== DEMO_SESSION_STAFF_ID);

  return (
    <div className="esc-screen">
      <div className="esc-screen-top">
        <PageHeading
          title={record.student}
          subtitle={`Escalation · ${formatTimestamp(record.createdAt)}`}
        />
      </div>

      <Card
        style={{
          padding: "28px 24px",
          borderColor: record.acknowledgedBy
            ? "var(--color-border-subtle)"
            : "var(--color-escalation-border)",
          background: record.acknowledgedBy
            ? "var(--color-surface-raised)"
            : "var(--color-escalation-subtle)",
          boxShadow: record.acknowledgedBy
            ? undefined
            : "inset 4px 0 0 var(--color-escalation)",
        }}
      >
        <div className="esc-escalation-detail-grid">
          <Field label="How the student reached out">{formatDetectionMethod(record.method)}</Field>
          <Field label="Where">{formatDistressSurface(record.surface)}</Field>

          {record.helpReason ? (
            <Field label="What they said they needed">{record.helpReason}</Field>
          ) : null}

          {record.text ? (
            <Field label="In their own words">
              <blockquote className="esc-escalation-quote">{record.text}</blockquote>
            </Field>
          ) : null}

          <Field label="What the student saw">
            <div className="esc-escalation-student-notice">{DISTRESS_SCRIPTED_MESSAGE}</div>
          </Field>

          <Field label="Classifier">
            <div className="esc-escalation-classifier-note">
              {formatClassifierNote(record.classifierFailed)}
            </div>
          </Field>

          <Field label="Staff presence">
            <div className="esc-escalation-presence">
              {otherViews.length > 0 ? (
                <div>
                  Viewed by{" "}
                  {otherViews
                    .map(
                      (view) =>
                        `${formatStaffName(view.staffId)} (${formatTimestamp(view.viewedAt)})`,
                    )
                    .join("; ")}
                </div>
              ) : (
                <div>No other staff member has opened this record yet.</div>
              )}
              {sarahView ? (
                <div>
                  You opened this record at {formatTimestamp(sarahView.viewedAt)}
                  {sarahView.staffId === DEMO_SESSION_STAFF_ID ? " (you)" : ""}.
                </div>
              ) : null}
              {record.acknowledgedBy ? (
                <div>
                  Acknowledged by {formatStaffName(record.acknowledgedBy)} at{" "}
                  {formatTimestamp(record.acknowledgedAt ?? record.createdAt)}.
                </div>
              ) : (
                <div>Not yet acknowledged.</div>
              )}
            </div>
          </Field>

          <Field label="Safeguarding">
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--color-content-secondary)" }}>
              Follow your school&apos;s safeguarding policy for next steps. Escolent records the
              signal; your school decides the response.
            </p>
          </Field>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 28,
            alignItems: "center",
          }}
        >
          <Button
            onClick={() => void acknowledge()}
            disabled={Boolean(record.acknowledgedBy) || acknowledging}
          >
            {record.acknowledgedBy
              ? `Acknowledged by ${formatStaffName(record.acknowledgedBy)}`
              : acknowledging
                ? "Saving…"
                : "Mark as acknowledged"}
          </Button>
          <Link
            href="/teacher/escalations"
            className="esc-pressable"
            onClick={() => hapticTap()}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-content-secondary)",
            }}
          >
            Back to list
          </Link>
        </div>
      </Card>

      {getStaffMember(DEMO_SESSION_STAFF_ID) ? (
        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "var(--color-content-muted)",
          }}
        >
          Signed in as {formatStaffName(DEMO_SESSION_STAFF_ID, "full")} for this demo session.
        </p>
      ) : null}
    </div>
  );
}
