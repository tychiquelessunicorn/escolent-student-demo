import Link from "next/link";
import type { EscalationRecord } from "@/lib/distress";
import {
  formatDetectionMethod,
  formatDistressSurface,
  formatRelativeTimestamp,
} from "@/lib/distress-labels";
import { DEMO_SESSION_STAFF_ID, formatStaffName } from "@/lib/demo-data/staff";

function rowSummary(record: EscalationRecord): string | null {
  if (record.method === "student_initiated") {
    if (record.helpReason) return record.helpReason;
    if (!record.text?.trim()) return null;
  }
  if (record.text) {
    const trimmed = record.text.trim();
    return trimmed.length > 96 ? `${trimmed.slice(0, 96)}…` : trimmed;
  }
  return null;
}

function statusSummary(record: EscalationRecord): string {
  if (record.acknowledgedBy) {
    return `Acknowledged by ${formatStaffName(record.acknowledgedBy)} · ${formatRelativeTimestamp(record.acknowledgedAt ?? record.createdAt)}`;
  }
  const othersViewed = record.views.filter(
    (view) => view.staffId !== DEMO_SESSION_STAFF_ID,
  );
  if (othersViewed.length > 0) {
    const names = othersViewed
      .map((view) => formatStaffName(view.staffId))
      .join(", ");
    return `${names} viewed · not yet acknowledged`;
  }
  return "Needs acknowledgment";
}

export function EscalationRow({ record }: { record: EscalationRecord }) {
  const urgent = !record.acknowledgedBy;
  const summary = rowSummary(record);

  return (
    <Link
      href={`/teacher/escalations/${record.id}`}
      className={[
        "esc-escalation-row",
        "esc-pressable",
        urgent ? "esc-escalation-row-urgent" : "esc-escalation-row-settled",
      ].join(" ")}
    >
      <div className="esc-escalation-row-title">{record.student}</div>
      <div className="esc-escalation-row-meta">
        {formatRelativeTimestamp(record.createdAt)} · {formatDetectionMethod(record.method)} ·{" "}
        {formatDistressSurface(record.surface)}
      </div>
      {summary ? (
        <div className="esc-escalation-row-meta" style={{ marginTop: 6 }}>
          {summary}
        </div>
      ) : null}
      <div
        className={[
          "esc-escalation-row-status",
          urgent ? "esc-escalation-row-status-urgent" : "esc-escalation-row-status-settled",
        ].join(" ")}
      >
        {statusSummary(record)}
      </div>
    </Link>
  );
}
