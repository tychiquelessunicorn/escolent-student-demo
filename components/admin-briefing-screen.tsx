"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminAskBox } from "@/components/admin-ask-box";
import { useAdminTour } from "@/components/admin-tour-provider";
import { getPrimaryAdmin } from "@/lib/demo-data/staff";
import { isEmbedMode } from "@/lib/embed";
import { EscolentLoader } from "@/components/escolent-logo";
import type { AdminBriefingItem, AdminBriefing } from "@/lib/admin-briefing-store";

type DemoState =
  | "auto"
  | "populated"
  | "no_rollout"
  | "insufficient_data"
  | "all_clear";

const CATEGORY_LABEL: Record<AdminBriefingItem["category"], string> = {
  escalation_oversight: "Escalation",
};

function AdminBriefingItemCard({ item }: { item: AdminBriefingItem }) {
  return (
    <Link
      href={item.actionRoute}
      className={[
        "esc-briefing-item",
        "esc-briefing-item-link",
        item.urgency === "urgent" ? "esc-briefing-item-urgent" : "esc-briefing-item-info",
        item.category === "escalation_oversight" ? "esc-briefing-item-escalation" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="esc-briefing-item-meta">
        <span
          className={[
            "esc-briefing-badge",
            item.urgency === "urgent" ? "esc-briefing-badge-urgent" : "esc-briefing-badge-info",
            item.category === "escalation_oversight" ? "esc-briefing-badge-escalation" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {CATEGORY_LABEL[item.category]}
        </span>
        <span className="esc-briefing-space">{item.scopeLabel}</span>
      </div>
      <h2 className="esc-briefing-item-title">{item.title}</h2>
      <p className="esc-briefing-item-detail">{item.detail}</p>
    </Link>
  );
}

function AdminBriefingInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const admin = getPrimaryAdmin();
  const { stage } = useAdminTour();
  const scriptedAsk =
    stage?.scriptedAsk?.screen === "briefing" ? stage.scriptedAsk : undefined;

  const briefingStateParam = (searchParams.get("briefingState") as DemoState | null) ?? "auto";
  const demoState: DemoState =
    briefingStateParam === "no_rollout" ||
    briefingStateParam === "insufficient_data" ||
    briefingStateParam === "all_clear" ||
    briefingStateParam === "populated"
      ? briefingStateParam
      : "auto";

  const isEmbed = isEmbedMode(searchParams);
  const showDemo = !isEmbed && searchParams.get("demo") === "1";

  const [data, setData] = useState<AdminBriefing | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const writeParams = useCallback(
    (patch: { briefingState?: DemoState }) => {
      const params = new URLSearchParams(searchParams.toString());
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
      try {
        const params = new URLSearchParams();
        if (demoState !== "auto") params.set("briefingState", demoState);
        const query = params.toString();
        const response = await fetch(`/api/admin/briefing${query ? `?${query}` : ""}`);
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as AdminBriefing;
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
  }, [demoState]);

  useEffect(() => {
    if (data?.state === "insufficient_data") {
      router.replace("/admin/analytics?from=briefing-insufficient");
    }
  }, [data?.state, router]);

  if (data?.state === "insufficient_data") {
    return (
      <div className="esc-screen">
        <p className="esc-staff-body">Opening school-wide Analytics — not enough signal yet…</p>
      </div>
    );
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="esc-screen esc-briefing-screen">
      <header className="esc-briefing-header">
        <div>
          <h1 className="esc-staff-foundation-title" style={{ marginBottom: 4 }}>
            Good morning, {admin.shortName}
          </h1>
          <p className="esc-mastery-scope">{dateLabel}</p>
          <p className="esc-mastery-freshness">{data?.scopeLabel ?? "Loading…"}</p>
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
            <option value="no_rollout">No rollout yet (15.4)</option>
            <option value="insufficient_data">Insufficient data → Analytics (15.5)</option>
            <option value="all_clear">Nothing urgent</option>
          </select>
        </div>
      ) : null}

      {initialLoading ? (
        <div style={{ padding: "40px 0" }}>
          <EscolentLoader label="Loading briefing…" size={22} />
        </div>
      ) : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {data && !initialLoading && !error ? (
        <div className="esc-briefing-ask" data-tour="admin-briefing-ask">
          <AdminAskBox
            task="admin_briefing_ask"
            label="Ask about this briefing"
            placeholder='Ask the briefing… e.g. "how many escalations are overdue"'
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
          {data.state === "no_rollout" ? (
            <div className="esc-staff-panel esc-briefing-edge">
              <h2 className="esc-briefing-edge-title">No rollout yet.</h2>
              <p className="esc-staff-body">
                Once your teachers create their first Spaces, your Briefing will start showing up
                here.
              </p>
            </div>
          ) : null}

          {data.state === "all_clear" ? (
            <div className="esc-staff-panel esc-briefing-edge">
              <h2 className="esc-briefing-edge-title">Everything looks steady.</h2>
              <p className="esc-staff-body">
                No pending requests, no rollout gaps, and nothing urgent across the school right
                now.
              </p>
            </div>
          ) : null}

          {data.state === "populated" ? (
            <div className="esc-briefing-list" data-tour="admin-briefing-list">
              {data.items.map((item) => (
                <AdminBriefingItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!showDemo && !isEmbed ? (
        <p className="esc-briefing-demo-hint">
          Edge states: add <code className="esc-landing-code">?demo=1</code> to open the harness,
          or set <code className="esc-landing-code">?briefingState=all_clear</code> directly.
        </p>
      ) : null}
    </div>
  );
}

export function AdminBriefingScreen() {
  return (
    <Suspense
      fallback={
        <div className="esc-screen" style={{ padding: "60px 24px", display: "flex", justifyContent: "center" }}>
          <EscolentLoader label="Loading briefing…" size={24} />
        </div>
      }
    >
      <AdminBriefingInner />
    </Suspense>
  );
}
