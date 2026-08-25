"use client";

import Link from "next/link";
import { useState } from "react";
import { AskBox } from "@/components/ask-box";
import { ConnectivityGlyph } from "@/components/connectivity-indicator";
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

const wrapper = {
  maxWidth: "var(--container-focused)",
  margin: "0 auto",
  padding: "20px 24px 90px",
  minHeight: "100vh",
  boxSizing: "border-box" as const,
};

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
      style={{
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
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-content-muted)" }}>
            {item.subjectLine}
          </div>
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

function EscolentItem({ item, compact }: { item: ScheduleItem; compact?: boolean }) {
  const href = item.actionRoute ?? "/practice";

  if (compact) {
    return (
      <Link
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "inherit",
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          borderLeft: "3px solid var(--color-accent)",
          borderRadius: "4px 14px 14px 4px",
          padding: "10px 14px",
        }}
      >
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{item.title}</div>
        <div style={{ fontSize: 12, color: "var(--color-content-muted)" }}>
          {item.dueMeta}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        textDecoration: "none",
        color: "inherit",
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        borderLeft: "4px solid var(--color-accent)",
        borderRadius: "6px 20px 20px 6px",
        padding: "18px 20px",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 4,
          }}
        >
          {item.title}
        </div>
        <div style={{ fontSize: 13, color: "var(--color-content-secondary)" }}>
          {item.subjectLine}
        </div>
      </div>
      <div style={{ fontSize: 20, color: "var(--color-content-muted)" }}>›</div>
    </Link>
  );
}

function ViewTabs({ view }: { view: "today" | "week" }) {
  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 14,
        fontWeight: 600,
        padding: "8px 16px",
        borderRadius: "var(--radius-control)",
        textDecoration: "none",
        background: active ? "var(--color-surface-raised)" : "transparent",
        color: active ? "var(--color-accent)" : "var(--color-content-secondary)",
      }}
    >
      {label}
    </Link>
  );

  return (
    <div
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
  const todayItems = SCHEDULE_ITEMS.filter((item) => item.day === TODAY_KEY);
  const nativeToday = todayItems.filter((item) => item.source === "escolent");
  const lmsToday = todayItems.filter((item) => item.source === "lms");

  return (
    <div style={wrapper}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <PageHeading
          area="today"
          title={`Hi ${STUDENT.firstName}`}
          subtitle={TODAY_DATE_LABEL}
        />
        <ViewTabs view={view} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <AskBox
          task="today_ask"
          surface="today_ask"
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
              flexDirection: "column",
              gap: 12,
              marginBottom: 36,
            }}
          >
            {nativeToday.map((item) => (
              <EscolentItem key={item.id} item={item} />
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
                    fontSize: 14,
                    fontWeight: 700,
                    color: day.isToday
                      ? "var(--color-accent)"
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
                    <EscolentItem key={item.id} item={item} compact />
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
