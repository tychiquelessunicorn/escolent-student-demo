"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { hapticTap } from "@/lib/haptics";
import type { AdminTodayItem, AdminTodaySchedule } from "@/lib/admin-today-store";
import type { LmsIntegrationStatusPayload } from "@/lib/lms-integration-store";

const KIND_LABEL: Record<AdminTodayItem["kind"], string> = {
  escalation_backlog: "Escalation backlog",
  curation_backlog: "Curation backlog",
};

function ViewTabs({ view }: { view: "today" | "week" }) {
  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={[
        "esc-pressable",
        "esc-teacher-today-tab",
        active ? "esc-teacher-today-tab-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </Link>
  );

  return (
    <div className="esc-view-tabs esc-teacher-today-tabs">
      {tab("Today", "/admin/today", view === "today")}
      {tab("Week", "/admin/week", view === "week")}
    </div>
  );
}

function AdminTodayItemCard({
  item,
  expanded,
  onToggle,
}: {
  item: AdminTodayItem;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const isEscalation = item.kind === "escalation_backlog";
  const isCuration = item.kind === "curation_backlog";
  const needsExpand = isCuration && (item.unmatchedEntries?.length ?? 0) > 0;

  const meta = (
    <div className="esc-teacher-today-item-meta">
      <span
        className={[
          "esc-briefing-badge",
          isEscalation
            ? "esc-briefing-badge-urgent esc-briefing-badge-escalation"
            : "esc-briefing-badge-info",
        ].join(" ")}
      >
        {KIND_LABEL[item.kind]}
      </span>
      <span className="esc-teacher-today-space">{item.scopeLabel}</span>
    </div>
  );

  const body = (
    <>
      {meta}
      <h2 className="esc-teacher-today-item-title">{item.title}</h2>
      <p className="esc-teacher-today-item-detail">{item.detail}</p>
      <span className="esc-teacher-today-meta">{item.dueMeta}</span>
    </>
  );

  const className = [
    "esc-teacher-today-item",
    isEscalation ? "esc-teacher-today-item-escalation" : "",
    isCuration ? "esc-teacher-today-item-curation" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (needsExpand && onToggle) {
    return (
      <div className={className}>
        <button type="button" className="esc-teacher-today-item-button" onClick={onToggle}>
          {body}
          <span className="esc-teacher-today-item-hint">
            {expanded
              ? "Hide unmatched errors"
              : `View ${item.unmatchedCount ?? item.unmatchedEntries?.length} unmatched errors`}
          </span>
        </button>
        {expanded && item.unmatchedEntries ? (
          <div className="esc-teacher-today-curation">
            <p className="esc-teacher-today-curation-note">
              Full curation and promotion into named misconceptions is a Pedagogical Lead
              capability — not built in this demo. Student names deep-link to Mastery Overview
              only, same as Teacher Today.
            </p>
            <ul className="esc-teacher-today-curation-list">
              {item.unmatchedEntries.map((entry) => (
                <li key={entry.id}>
                  <Link href={entry.href} className="esc-teacher-today-curation-link">
                    <span className="esc-teacher-today-curation-name">{entry.fullName}</span>
                    <span className="esc-teacher-today-curation-error">{entry.errorSummary}</span>
                    <span className="esc-teacher-today-curation-meta">
                      {entry.skillLabel} · {entry.observedLabel} · {entry.spaceLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  if (item.actionRoute) {
    return (
      <Link
        href={item.actionRoute}
        className={`${className} esc-teacher-today-item-link esc-pressable`}
      >
        <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
        <span className="esc-teacher-today-chevron" aria-hidden>
          ›
        </span>
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export function AdminTodayWeek({ view }: { view: "today" | "week" }) {
  const [schedule, setSchedule] = useState<AdminTodaySchedule | null>(null);
  const [lmsStatus, setLmsStatus] = useState<LmsIntegrationStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const path = view === "today" ? "/api/admin/today" : "/api/admin/week";
      const [scheduleResponse, lmsResponse] = await Promise.all([
        fetch(path),
        fetch("/api/admin/lms/status"),
      ]);
      if (!scheduleResponse.ok) throw new Error("load failed");
      const data = (await scheduleResponse.json()) as AdminTodaySchedule;
      setSchedule(data);
      if (lmsResponse.ok) {
        setLmsStatus((await lmsResponse.json()) as LmsIntegrationStatusPayload);
      }
    } catch {
      setError("Could not load the backlog right now.");
      setSchedule(null);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = (id: string) => {
    hapticTap();
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <div className="esc-screen esc-teacher-today-screen">
      <div className="esc-screen-top">
        <div>
          <h1 className="esc-staff-foundation-title">{view === "today" ? "Today" : "This week"}</h1>
          <p className="esc-teacher-today-date">{schedule?.todayDateLabel ?? "…"}</p>
          <p className="esc-teacher-today-scope">{schedule?.scopeLabel ?? "Loading…"}</p>
        </div>
        <div className="esc-screen-top-aside">
          <ViewTabs view={view} />
        </div>
      </div>

      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
      {!schedule && !error ? <p className="esc-teacher-today-empty">Loading…</p> : null}

      {lmsStatus ? (
        <div className="esc-staff-panel esc-admin-lms-strip" style={{ marginBottom: 20 }}>
          <p className="esc-staff-body" style={{ margin: "0 0 10px" }}>
            {lmsStatus.integrations.find((entry) => entry.lmsType === "canvas")?.status ===
            "authorized"
              ? "Canvas is connected — Student and Teacher due-date rows already come from this integration."
              : "Connect your school's LMS so Teachers and Students can see due dates from Canvas, Moodle, or Google Classroom."}
          </p>
          <Link href="/admin/lms-setup" className="esc-staff-btn esc-staff-btn-secondary esc-pressable">
            Manage LMS connections
          </Link>
        </div>
      ) : null}

      {schedule && view === "week" ? (
        <p className="esc-admin-today-week-note">{schedule.weekNote}</p>
      ) : null}

      {schedule ? (
        <div className="esc-teacher-today-list">
          {schedule.items.length === 0 ? (
            <p className="esc-teacher-today-empty">
              Nothing in the school-wide backlog right now.
            </p>
          ) : (
            schedule.items.map((item) => (
              <AdminTodayItemCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => onToggle(item.id)}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
