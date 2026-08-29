"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConnectivityGlyph } from "@/components/connectivity-indicator";
import { TeacherAskBox } from "@/components/teacher-ask-box";
import { useTeacherTour } from "@/components/teacher-tour-provider";
import { hapticTap } from "@/lib/haptics";
import type {
  TeacherTodayItem,
  TeacherTodaySchedule,
} from "@/lib/teacher-today-store";

const KIND_LABEL: Record<TeacherTodayItem["kind"], string> = {
  escalation: "Escalation",
  override_followup: "Override check",
  curation_backlog: "Curation",
  lms_assignment_due: "Assignment due",
  lms_grading_deadline: "Grading deadline",
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
      {tab("Today", "/teacher/today", view === "today")}
      {tab("Week", "/teacher/week", view === "week")}
    </div>
  );
}

function LmsItem({
  item,
  compact,
  lmsName,
}: {
  item: TeacherTodayItem;
  compact?: boolean;
  lmsName: string;
}) {
  const [toast, setToast] = useState(false);
  const freshness = item.freshness ?? "fresh";

  const openInLms = () => {
    hapticTap();
    setToast(true);
    window.setTimeout(() => setToast(false), 1600);
  };

  if (compact) {
    return (
      <div
        className="esc-teacher-today-lms esc-teacher-today-lms-compact"
        data-tour={freshness === "stale" ? "teacher-today-stale-lms" : undefined}
      >
        <div className="esc-teacher-today-lms-body">
          <div className="esc-teacher-today-lms-title">{item.title}</div>
        </div>
        <ConnectivityGlyph state={freshness} size={7} />
        <div className="esc-teacher-today-meta">{item.dueMeta}</div>
      </div>
    );
  }

  return (
    <div
      className="esc-teacher-today-lms"
      data-tour={freshness === "stale" ? "teacher-today-stale-lms" : undefined}
    >
      <div className="esc-teacher-today-lms-header">
        <div>
          <div className="esc-teacher-today-lms-title">{item.title}</div>
          <div className="esc-teacher-today-lms-detail">{item.detail}</div>
          <div className="esc-teacher-today-space">{item.spaceLabel}</div>
        </div>
        <div className="esc-teacher-today-freshness">
          <ConnectivityGlyph state={freshness} />
          <span>{item.freshnessLabel ?? freshness}</span>
        </div>
      </div>
      <div className="esc-teacher-today-lms-footer">
        <span className="esc-teacher-today-ref">Reference only · from {lmsName}</span>
        <button type="button" className="esc-teacher-today-lms-link" onClick={openInLms}>
          {item.lmsActionLabel ?? `Open in ${lmsName}`} ↗
        </button>
      </div>
      {toast ? (
        <div className="esc-teacher-today-toast">Opening in {lmsName}…</div>
      ) : null}
    </div>
  );
}

function EscolentItem({
  item,
  compact,
  expanded,
  onToggle,
}: {
  item: TeacherTodayItem;
  compact?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const isEscalation = item.kind === "escalation";
  const isCuration = item.kind === "curation_backlog";
  const needsExpand = isCuration && (item.unmatchedEntries?.length ?? 0) > 0;

  const meta = (
    <div className="esc-teacher-today-item-meta">
      <span
        className={[
          "esc-briefing-badge",
          isEscalation ? "esc-briefing-badge-urgent esc-briefing-badge-escalation" : "esc-briefing-badge-info",
        ].join(" ")}
      >
        {KIND_LABEL[item.kind]}
      </span>
      <span className="esc-teacher-today-space">{item.spaceLabel}</span>
    </div>
  );

  const titleBlock = (
    <>
      {meta}
      <h2 className={compact ? "esc-teacher-today-item-title-sm" : "esc-teacher-today-item-title"}>
        {item.title}
      </h2>
      {!compact ? <p className="esc-teacher-today-item-detail">{item.detail}</p> : null}
    </>
  );

  const className = [
    "esc-teacher-today-item",
    compact ? "esc-teacher-today-item-compact" : "",
    isEscalation ? "esc-teacher-today-item-escalation" : "",
    isCuration ? "esc-teacher-today-item-curation" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tourAttr = isCuration ? { "data-tour": "teacher-today-curation" } : {};

  if (needsExpand && onToggle) {
    return (
      <div className={className} {...tourAttr}>
        <button type="button" className="esc-teacher-today-item-button" onClick={onToggle}>
          {titleBlock}
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
              only.
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
        {...tourAttr}
      >
        <div style={{ flex: 1, minWidth: 0 }}>{titleBlock}</div>
        {!compact ? <span className="esc-teacher-today-chevron" aria-hidden>›</span> : (
          <span className="esc-teacher-today-meta">{item.dueMeta}</span>
        )}
      </Link>
    );
  }

  return (
    <div className={className} {...tourAttr}>
      {titleBlock}
    </div>
  );
}

function TodaySections({
  schedule,
  expandedId,
  onToggle,
}: {
  schedule: TeacherTodaySchedule;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  const todayItems = schedule.items.filter((item) => item.day === schedule.todayKey);
  const native = todayItems.filter((item) => item.source === "escolent");
  const lms = todayItems.filter((item) => item.source === "lms");

  return (
    <>
      <h2 className="esc-staff-section-label">From Escolent</h2>
      <div className="esc-teacher-today-list">
        {native.length === 0 ? (
          <p className="esc-teacher-today-empty">Nothing Escolent-native needs you today.</p>
        ) : (
          native.map((item) => (
            <EscolentItem
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => onToggle(item.id)}
            />
          ))
        )}
      </div>

      <h2 className="esc-staff-section-label esc-teacher-today-section-gap">
        Also due — from {schedule.lmsName}
      </h2>
      <div className="esc-teacher-today-list">
        {lms.length === 0 ? (
          <p className="esc-teacher-today-empty">No LMS deadlines today.</p>
        ) : (
          lms.map((item) => (
            <LmsItem key={item.id} item={item} lmsName={schedule.lmsName} />
          ))
        )}
      </div>
    </>
  );
}

function WeekSections({
  schedule,
  expandedId,
  onToggle,
}: {
  schedule: TeacherTodaySchedule;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="esc-teacher-today-week">
      {schedule.days.map((day) => (
        <section key={day.key} className="esc-teacher-today-day">
          <div className="esc-teacher-today-day-head">
            <h2 className="esc-teacher-today-day-label">{day.label}</h2>
            <span className="esc-teacher-today-day-date">{day.dateLabel}</span>
          </div>
          {day.items.length === 0 ? (
            <p className="esc-teacher-today-empty">Nothing scheduled.</p>
          ) : (
            <div className="esc-teacher-today-list esc-teacher-today-list-compact">
              {day.items.map((item) =>
                item.source === "lms" ? (
                  <LmsItem key={item.id} item={item} compact lmsName={schedule.lmsName} />
                ) : (
                  <EscolentItem
                    key={item.id}
                    item={item}
                    compact
                    expanded={expandedId === item.id}
                    onToggle={() => onToggle(item.id)}
                  />
                ),
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

export function TeacherTodayWeek({ view }: { view: "today" | "week" }) {
  const [schedule, setSchedule] = useState<TeacherTodaySchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { active: tourActive, position, stage } = useTeacherTour();

  const load = useCallback(async () => {
    setError(null);
    try {
      const path = view === "today" ? "/api/teacher/today" : "/api/teacher/week";
      const response = await fetch(path);
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as TeacherTodaySchedule;
      setSchedule(data);
    } catch {
      setError("Could not load what’s due — try refreshing.");
      setSchedule(null);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  // Tour opens the curation disclosure so Pedagogical Lead copy is visible.
  useEffect(() => {
    if (!tourActive || !schedule) return;
    if (position?.step.target !== "teacher-today-curation") return;
    const curation = schedule.items.find((item) => item.kind === "curation_backlog");
    if (curation) setExpandedId(curation.id);
  }, [tourActive, position?.step.target, schedule]);

  const onToggle = (id: string) => {
    hapticTap();
    setExpandedId((current) => (current === id ? null : id));
  };

  const scriptedAsk =
    stage?.scriptedAsk?.screen === "today" ? stage.scriptedAsk : undefined;

  return (
    <div className="esc-screen esc-teacher-today-screen">
      <div className="esc-screen-top">
        <div>
          <h1 className="esc-staff-foundation-title">{view === "today" ? "Today" : "This week"}</h1>
          <p className="esc-teacher-today-date">
            {schedule?.todayDateLabel ?? "…"}
          </p>
          <p className="esc-teacher-today-scope">
            {schedule?.scopeLabel ?? "Loading your Spaces…"}
          </p>
        </div>
        <div className="esc-screen-top-aside">
          <ViewTabs view={view} />
        </div>
      </div>

      <div className="esc-teacher-today-ask" data-tour="teacher-today-ask">
        <TeacherAskBox
          spaceFilter={null}
          task="teacher_today_ask"
          placeholder={`Ask what's due… e.g. "what's due for Grade 8A Remediation this week"`}
          loadingLabel="Checking what’s due…"
          scripted={scriptedAsk}
        />
      </div>

      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {!schedule && !error ? (
        <p className="esc-teacher-today-empty">Loading…</p>
      ) : null}

      {schedule && view === "today" ? (
        <TodaySections schedule={schedule} expandedId={expandedId} onToggle={onToggle} />
      ) : null}

      {schedule && view === "week" ? (
        <div data-tour="teacher-week-grid">
          <WeekSections schedule={schedule} expandedId={expandedId} onToggle={onToggle} />
        </div>
      ) : null}
    </div>
  );
}
