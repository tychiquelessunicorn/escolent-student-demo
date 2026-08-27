"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TeacherAskBox } from "@/components/teacher-ask-box";
import { useTeacherTour } from "@/components/teacher-tour-provider";
import { getPrimaryTeacher } from "@/lib/demo-data/staff";
import type { BriefingItem, TeacherBriefing } from "@/lib/briefing-store";

type SpaceFilter = string; // "all" or a managed Space id
type DemoState = "auto" | "populated" | "no_spaces" | "insufficient_data" | "all_clear";

const CATEGORY_LABEL: Record<BriefingItem["category"], string> = {
  escalation_pending: "Escalation",
  struggling_students: "Urgent",
  misconception_spike: "Informational",
  override_revisit: "Override check",
  low_priority: "Quiet note",
};

function BriefingItemCard({
  item,
  expanded,
  onToggle,
  tourExpanded,
}: {
  item: BriefingItem;
  expanded: boolean;
  onToggle: () => void;
  tourExpanded?: boolean;
}) {
  const needsSet = item.affectedStudents.length > 1 && !item.actionRoute;
  const href = item.actionRoute;
  const tourAttr = tourExpanded ? { "data-tour": "teacher-briefing-expanded" } : {};

  const body = (
    <>
      <div className="esc-briefing-item-meta">
        <span
          className={[
            "esc-briefing-badge",
            item.urgency === "urgent" ? "esc-briefing-badge-urgent" : "esc-briefing-badge-info",
            item.category === "escalation_pending" ? "esc-briefing-badge-escalation" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {CATEGORY_LABEL[item.category]}
        </span>
        <span className="esc-briefing-space">{item.spaceLabel}</span>
      </div>
      <h2 className="esc-briefing-item-title">{item.title}</h2>
      <p className="esc-briefing-item-detail">{item.detail}</p>
    </>
  );

  if (needsSet) {
    return (
      <div
        {...tourAttr}
        className={[
          "esc-briefing-item",
          item.urgency === "urgent" ? "esc-briefing-item-urgent" : "esc-briefing-item-info",
          item.category === "escalation_pending" ? "esc-briefing-item-escalation" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button type="button" className="esc-briefing-item-button" onClick={onToggle}>
          {body}
          <span className="esc-briefing-item-hint">
            {expanded
              ? "Hide students"
              : item.affectedStudents.length === 1
                ? "Open student"
                : `Choose among ${item.affectedStudents.length} students`}
          </span>
        </button>
        {expanded ? (
          <ul className="esc-briefing-set-list">
            {item.affectedStudents.map((student) => (
              <li key={student.id}>
                <Link href={student.href} className="esc-briefing-set-link">
                  {student.fullName}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (href) {
    return (
      <Link
        {...tourAttr}
        href={href}
        className={[
          "esc-briefing-item",
          "esc-briefing-item-link",
          item.urgency === "urgent" ? "esc-briefing-item-urgent" : "esc-briefing-item-info",
          item.category === "escalation_pending" ? "esc-briefing-item-escalation" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      {...tourAttr}
      className={[
        "esc-briefing-item",
        item.urgency === "urgent" ? "esc-briefing-item-urgent" : "esc-briefing-item-info",
      ].join(" ")}
    >
      {body}
    </div>
  );
}

function BriefingInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const teacher = getPrimaryTeacher();
  const { stage } = useTeacherTour();

  const spaceParam = searchParams.get("space");
  const briefingStateParam = (searchParams.get("briefingState") as DemoState | null) ?? "auto";

  const spaceFilter: SpaceFilter =
    spaceParam && spaceParam !== "all" ? spaceParam : "all";
  const demoState: DemoState =
    briefingStateParam === "no_spaces" ||
    briefingStateParam === "insufficient_data" ||
    briefingStateParam === "all_clear" ||
    briefingStateParam === "populated"
      ? briefingStateParam
      : "auto";

  const showDemo = searchParams.get("demo") === "1";

  const [data, setData] = useState<TeacherBriefing | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tourExpandId = stage?.expandBriefingId ?? null;
  const effectiveExpandedId = tourExpandId ?? expandedId;
  const scriptedAsk =
    stage?.scriptedAsk?.screen === "briefing" ? stage.scriptedAsk : undefined;

  useEffect(() => {
    if (tourExpandId) setExpandedId(tourExpandId);
  }, [tourExpandId]);

  const writeParams = useCallback(
    (patch: { space?: SpaceFilter; briefingState?: DemoState }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (patch.space !== undefined) {
        if (patch.space === "all") params.delete("space");
        else params.set("space", patch.space);
      }
      if (patch.briefingState !== undefined) {
        if (patch.briefingState === "auto") params.delete("briefingState");
        else params.set("briefingState", patch.briefingState);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setRefreshing(true);
      setExpandedId(null);
      try {
        const params = new URLSearchParams();
        if (spaceFilter !== "all") params.set("space", spaceFilter);
        if (demoState !== "auto") params.set("briefingState", demoState);
        const query = params.toString();
        const response = await fetch(
          `/api/teacher/briefing${query ? `?${query}` : ""}`,
        );
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as TeacherBriefing;
        if (cancelled) return;
        setData(payload);
        setError(null);
      } catch {
        if (cancelled) return;
        setError("Could not load your briefing right now.");
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [demoState, spaceFilter]);

  useEffect(() => {
    if (data?.state === "insufficient_data") {
      router.replace("/teacher/overview?from=briefing-insufficient");
    }
  }, [data?.state, router]);

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  if (data?.state === "insufficient_data") {
    return (
      <div className="esc-screen">
        <p className="esc-staff-body">Opening Mastery Overview — not enough session data yet…</p>
      </div>
    );
  }

  return (
    <div className="esc-screen esc-briefing-screen">
      <header className="esc-briefing-header">
        <div>
          <h1 className="esc-staff-foundation-title" style={{ marginBottom: 4 }}>
            Good morning, {teacher.shortName}
          </h1>
          <p className="esc-mastery-scope">{dateLabel}</p>
          <p className="esc-mastery-freshness">{data?.scopeLabel ?? "Loading…"}</p>
        </div>
        <div
          className="esc-mastery-space-switch"
          role="tablist"
          aria-label="Space filter"
          data-tour="teacher-briefing-space-filter"
        >
          {[
            { id: "all", label: "All Spaces" },
            ...(data?.spaces ?? []).map((space) => ({
              id: space.id,
              label: space.name,
            })),
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={spaceFilter === option.id}
              className={[
                "esc-mastery-space-tab",
                spaceFilter === option.id ? "esc-mastery-space-tab-active" : "",
              ].join(" ")}
              onClick={() => writeParams({ space: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {showDemo ? (
        <div className="esc-briefing-demo" aria-label="Briefing demo harness">
          <span className="esc-staff-section-label" style={{ marginBottom: 0 }}>
            Demo state
          </span>
          <select
            className="esc-mastery-filter-select"
            value={demoState}
            onChange={(event) =>
              writeParams({ briefingState: event.target.value as DemoState })
            }
          >
            <option value="auto">Auto (live synthesis)</option>
            <option value="populated">Populated</option>
            <option value="no_spaces">No Spaces yet (10.4)</option>
            <option value="insufficient_data">Insufficient data → Overview (10.5)</option>
            <option value="all_clear">Nothing urgent (10.6)</option>
          </select>
        </div>
      ) : null}

      {initialLoading ? <p className="esc-staff-body">Loading…</p> : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {data && !initialLoading && !error ? (
        <div className="esc-briefing-ask" data-tour="teacher-briefing-ask">
          <TeacherAskBox
            spaceFilter={spaceFilter === "all" ? null : spaceFilter}
            task="teacher_briefing_ask"
            placeholder='Ask the briefing… e.g. "why is Marcus flagged today"'
            loadingLabel="Checking the briefing…"
            scripted={scriptedAsk}
          />
        </div>
      ) : null}

      {data && !initialLoading && !error ? (
        <div
          className={[
            "esc-briefing-body",
            refreshing ? "esc-briefing-body-refreshing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-busy={refreshing}
        >
          {data.state === "no_spaces" ? (
            <div className="esc-staff-panel esc-briefing-edge">
              <h2 className="esc-briefing-edge-title">No Spaces yet.</h2>
              <p className="esc-staff-body">
                Once you create a Space, your Briefing will start showing what needs attention
                here.
              </p>
              <Link href="/teacher/spaces/new" className="esc-staff-btn esc-staff-btn-primary">
                Create a Space
              </Link>
            </div>
          ) : null}

          {data.state === "all_clear" ? (
            <div className="esc-staff-panel esc-briefing-edge">
              <h2 className="esc-briefing-edge-title">Everything looks steady.</h2>
              <p className="esc-staff-body">
                No flags and nothing urgent across this view right now.
              </p>
              {data.lowPriority.length > 0 ? (
                <div className="esc-briefing-list" style={{ marginTop: 20 }}>
                  {data.lowPriority.map((item) => (
                    <BriefingItemCard
                      key={item.id}
                      item={item}
                      expanded={false}
                      onToggle={() => undefined}
                      tourExpanded={effectiveExpandedId === item.id}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {data.state === "populated" ? (
            <div className="esc-briefing-list" data-tour="teacher-briefing-list">
              {data.items.map((item) => (
                <BriefingItemCard
                  key={item.id}
                  item={item}
                  expanded={effectiveExpandedId === item.id}
                  onToggle={() =>
                    setExpandedId((current) => (current === item.id ? null : item.id))
                  }
                  tourExpanded={
                    Boolean(tourExpandId) && effectiveExpandedId === item.id
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!showDemo ? (
        <p className="esc-briefing-demo-hint">
          Edge states: add <code className="esc-landing-code">?demo=1</code> to open the
          harness, or set{" "}
          <code className="esc-landing-code">?briefingState=all_clear</code> directly.
        </p>
      ) : null}
    </div>
  );
}

export function BriefingScreen() {
  return (
    <Suspense
      fallback={
        <div className="esc-screen">
          <p className="esc-staff-body">Loading…</p>
        </div>
      }
    >
      <BriefingInner />
    </Suspense>
  );
}
