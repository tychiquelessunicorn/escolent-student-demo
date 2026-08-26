"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AskBox } from "@/components/ask-box";
import { ConnectivityGlyph } from "@/components/connectivity-indicator";
import { ResumeIllustration } from "@/components/illustrations";
import { PageHeading, SectionLabel } from "@/components/ui";
import {
  FRESHNESS_LABELS,
  SCHEDULE_DAYS,
  SCHEDULE_ITEMS,
  STUDENT,
  TODAY_DATE_LABEL,
  TODAY_KEY,
  type ScheduleItem,
} from "@/lib/demo-data";
import { getDemoStreak, getDailyProgressLabel, isVariablesCompleted, subscribeDemoPersist } from "@/lib/demo-persistence";
import { hapticTap } from "@/lib/haptics";

/**
 * Requirement 7a.2: an LMS item is shown so the student sees one honest picture
 * of the day, but it stays visibly reference-only — dashed border, muted, and a
 * link back to its source rather than anything that looks actionable here.
 * Escolent can't grade someone else's essay, so it doesn't pretend to.
 */
function LmsItem({ item, compact }: { item: ScheduleItem; compact?: boolean }) {
  const [toast, setToast] = useState(false);
  const freshness = item.freshness ?? "fresh";

  const openInLms = () => {
    hapticTap();
    setToast(true);
    setTimeout(() => setToast(false), 1600);
  };

  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--color-surface)",
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius-control)",
          padding: "10px 14px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-content-secondary)",
            }}
          >
            {item.title}
          </div>
        </div>
        <ConnectivityGlyph state={freshness} size={7} />
        <div style={{ fontSize: 12, color: "var(--color-content-muted)" }}>
          {item.dueMeta}
        </div>
      </div>
    );
  }

  return (
    <div
      className="esc-schedule-item"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--color-surface)",
        border: "1px dashed var(--color-border)",
        borderRadius: "var(--radius-shell)",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
        className="esc-schedule-item-header"
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-content-muted)" }}>
            {item.subjectLine}
          </div>
          <div className="esc-space-tag">{item.spaceTag}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <ConnectivityGlyph state={freshness} />
          <div style={{ fontSize: 11, color: "var(--color-content-muted)" }}>
            {FRESHNESS_LABELS[freshness]}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "var(--color-content-muted)",
          }}
        >
          Reference only
        </div>
        <button
          type="button"
          onClick={openInLms}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-accent)",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          View in {STUDENT.lms} ↗
        </button>
      </div>
      {toast ? (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-content-muted)",
            marginTop: 8,
          }}
        >
          Opening in {STUDENT.lms}…
        </div>
      ) : null}
    </div>
  );
}

function EscolentItem({
  item,
  compact,
  complete,
}: {
  item: ScheduleItem;
  compact?: boolean;
  complete?: boolean;
}) {
  const href = item.actionRoute ?? "/practice";
  const accent = complete ? "oklch(55% 0.14 150)" : "var(--color-area-today)";

  if (compact) {
    return (
      <Link
        href={href}
        className="esc-pressable esc-schedule-item-compact"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "inherit",
          background: "var(--color-area-today-subtle)",
          border: "1.5px solid var(--color-area-today-border)",
          borderLeft: `3px solid ${accent}`,
          borderRadius: "4px 14px 14px 4px",
          padding: "10px 14px",
          opacity: complete ? 0.82 : 1,
        }}
      >
        <div style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {item.title}
            <span className="esc-offline-badge">Available Offline</span>
          </span>
        </div>
        {complete ? (
          <div className="esc-tdy-check" aria-label="Completed">
            ✓
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--color-content-muted)" }}>
            {item.dueMeta}
          </div>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="esc-pressable esc-schedule-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        textDecoration: "none",
        color: "inherit",
        background: "var(--color-area-today-subtle)",
        border: "1.5px solid var(--color-area-today-border)",
        borderLeft: `4px solid ${accent}`,
        borderRadius: "6px 20px 20px 6px",
        padding: "18px 20px",
        opacity: complete ? 0.82 : 1,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "-0.02em",
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {item.title}
          <span className="esc-offline-badge">Available Offline</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--color-content-secondary)" }}>
          {item.subjectLine}
        </div>
        <div className="esc-space-tag">{item.spaceTag}</div>
        {complete ? (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "oklch(38% 0.1 150)",
              marginTop: 4,
            }}
          >
            Completed
          </div>
        ) : null}
      </div>
      {complete ? (
        <div className="esc-tdy-check" aria-label="Completed">
          ✓
        </div>
      ) : (
        <div style={{ fontSize: 20, color: "var(--color-area-today-fg)" }}>›</div>
      )}
    </Link>
  );
}

function ViewTabs({ view }: { view: "today" | "week" }) {
  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className="esc-pressable"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: active ? 800 : 600,
        letterSpacing: active ? "-0.02em" : "0",
        padding: "8px 16px",
        borderRadius: "var(--radius-control)",
        textDecoration: "none",
        background: active ? "var(--color-area-today-subtle)" : "transparent",
        color: active ? "var(--color-area-today-fg)" : "var(--color-content-secondary)",
        border: active
          ? "1.5px solid var(--color-area-today-border)"
          : "1.5px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </Link>
  );

  return (
    <div
      className="esc-view-tabs"
      style={{
        display: "flex",
        gap: 4,
        background: "var(--color-surface-sunken)",
        padding: 4,
        borderRadius: "var(--radius-shell)",
      }}
    >
      {tab("Today", "/student/today", view === "today")}
      {tab("Week", "/student/week", view === "week")}
    </div>
  );
}

export function TodayWeek({ view }: { view: "today" | "week" }) {
  const [streak, setStreak] = useState(3);
  const [taskComplete, setTaskComplete] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setStreak(getDemoStreak());
      setTaskComplete(isVariablesCompleted());
    };
    refresh();
    return subscribeDemoPersist(refresh);
  }, [view]);

  const todayItems = SCHEDULE_ITEMS.filter((item) => item.day === TODAY_KEY);
  const nativeToday = todayItems.filter((item) => item.source === "escolent");
  const lmsToday = todayItems.filter((item) => item.source === "lms");

  return (
    <div className="esc-screen">
      <div className="esc-screen-top">
        <PageHeading
          area="today"
          title={`Hi ${STUDENT.firstName}`}
          subtitle={TODAY_DATE_LABEL}
        />
        <div className="esc-screen-top-aside">
          <div className="esc-streak-badge" aria-label={`${streak}-day streak`}>
            {streak}-day streak
          </div>
          <div className="esc-illust esc-illust-header">
            <ResumeIllustration size={72} style={{ marginBottom: 0 }} />
          </div>
          <ViewTabs view={view} />
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <AskBox
          task="today_ask"
          surface="today_ask"
          area="today"
          placeholder={'Ask what\u2019s due… e.g. "what do I have due Thursday"'}
          loadingLabel="Checking what's due…"
        />
      </div>

      {view === "today" ? (
        <>
          <SectionLabel area="today">From Escolent</SectionLabel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: -8,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div className="esc-completed-chip">{getDailyProgressLabel()}</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 36,
            }}
          >
            {nativeToday.map((item) => (
              <EscolentItem
                key={item.id}
                item={item}
                complete={Boolean(item.demoTask && taskComplete)}
              />
            ))}
          </div>

          <SectionLabel>Also due — from {STUDENT.lms}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lmsToday.map((item) => (
              <LmsItem key={item.id} item={item} />
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {SCHEDULE_DAYS.map((day) => (
            <div key={day.key}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    fontWeight: day.isToday ? 800 : 700,
                    letterSpacing: day.isToday ? "-0.02em" : "0",
                    color: day.isToday
                      ? "var(--color-area-today-fg)"
                      : "var(--color-content-primary)",
                  }}
                >
                  {day.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-content-muted)" }}>
                  {day.dateLabel}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SCHEDULE_ITEMS.filter((item) => item.day === day.key).map((item) =>
                  item.source === "escolent" ? (
                    <EscolentItem
                      key={item.id}
                      item={item}
                      compact
                      complete={Boolean(item.demoTask && taskComplete)}
                    />
                  ) : (
                    <LmsItem key={item.id} item={item} compact />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
