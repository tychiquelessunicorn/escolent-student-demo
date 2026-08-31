"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PedleadAskBox } from "@/components/pedlead-ask-box";
import { getPrimaryPedLead } from "@/lib/demo-data/staff";
import { isEmbedMode } from "@/lib/embed";
import { hapticTap } from "@/lib/haptics";
import { usePedleadTour } from "@/components/pedlead-tour-provider";
import type {
  PedleadBriefing,
  PedleadBriefingItem,
  PedleadBriefingState,
} from "@/lib/pedlead-briefing-store";

const CATEGORY_LABEL: Record<PedleadBriefingItem["category"], string> = {
  pending_review: "Awaiting Review",
  thin_coverage: "Thin Coverage",
  cross_tenant_pattern: "Cross-School Pattern",
};

function PedleadBriefingItemCard({
  item,
  dataTour,
}: {
  item: PedleadBriefingItem;
  dataTour?: string;
}) {
  const isUrgent = item.urgency === "attention";
  const isCrossTenant = item.category === "cross_tenant_pattern";

  return (
    <Link
      href={item.actionRoute}
      onClick={() => hapticTap()}
      data-tour={dataTour}
      className={[
        "esc-briefing-item",
        "esc-briefing-item-link",
        isUrgent ? "esc-briefing-item-urgent" : "esc-briefing-item-info",
        isCrossTenant ? "esc-briefing-item-escalation" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.1s ease, box-shadow 0.1s ease",
      }}
    >
      <div className="esc-briefing-item-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className={[
              "esc-briefing-badge",
              isUrgent ? "esc-briefing-badge-urgent" : "esc-briefing-badge-info",
              isCrossTenant ? "esc-briefing-badge-escalation" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {CATEGORY_LABEL[item.category]}
          </span>
          <span className="esc-briefing-space">{item.scopeLabel}</span>
        </div>

        {item.affectedSchoolCount !== undefined && (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              background: "rgba(99, 102, 241, 0.12)",
              color: "#4f46e5",
            }}
          >
            {item.affectedSchoolCount} Schools Affected (Req 31a.7)
          </span>
        )}
      </div>

      <h2 className="esc-briefing-item-title" style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px 0" }}>
        {item.title}
      </h2>

      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: isUrgent ? "#b45309" : "var(--color-staff-muted)",
          marginBottom: 6,
        }}
      >
        {item.summary}
      </div>

      <p className="esc-briefing-item-detail" style={{ fontSize: 13, color: "var(--color-content-secondary)", margin: 0, lineHeight: 1.45 }}>
        {item.detail}
      </p>

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--color-staff-accent)" }}>
        <span>Open in Authoring Studio</span>
        <span>→</span>
      </div>
    </Link>
  );
}

function PedleadBriefingInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pedLead = getPrimaryPedLead();
  const { stage } = usePedleadTour();

  const isEmbed = isEmbedMode(searchParams);
  const showDemo = !isEmbed && searchParams.get("demo") === "1";

  const tenantParam = searchParams.get("tenantFilter") || "all";
  const demoStateParam = searchParams.get("briefingState") || "auto";
  const thresholdParam = searchParams.get("agingThresholdDays") || "5";

  const [data, setData] = useState<PedleadBriefing | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agingThreshold, setAgingThreshold] = useState<number>(
    parseInt(thresholdParam, 10) || 5
  );

  const writeParams = useCallback(
    (patch: { tenantFilter?: string; briefingState?: string; agingThresholdDays?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (patch.tenantFilter !== undefined) {
        if (patch.tenantFilter === "all") params.delete("tenantFilter");
        else params.set("tenantFilter", patch.tenantFilter);
      }
      if (patch.briefingState !== undefined) {
        if (patch.briefingState === "auto") params.delete("briefingState");
        else params.set("briefingState", patch.briefingState);
      }
      if (patch.agingThresholdDays !== undefined) {
        if (patch.agingThresholdDays === 5) params.delete("agingThresholdDays");
        else params.set("agingThresholdDays", patch.agingThresholdDays.toString());
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
        if (tenantParam !== "all") params.set("tenantFilter", tenantParam);
        if (demoStateParam !== "auto") params.set("demoState", demoStateParam);
        params.set("agingThresholdDays", agingThreshold.toString());

        const query = params.toString();
        const response = await fetch(`/api/pedlead/briefing${query ? `?${query}` : ""}`);
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as { briefing: PedleadBriefing };
        if (cancelled) return;
        setData(payload.briefing);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError("Could not load your curriculum briefing right now.");
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
  }, [tenantParam, demoStateParam, agingThreshold]);

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="esc-screen esc-briefing-screen" style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 64px 24px" }}>
      {/* Header */}
      <header className="esc-briefing-header" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-staff-accent)", marginBottom: 4 }}>
            Pedagogical Lead · Cross-Tenant Intelligence
          </div>
          <h1 className="esc-staff-foundation-title" style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px 0", color: "var(--color-content-primary)" }}>
            Good morning, {pedLead.shortName}
          </h1>
          <p className="esc-mastery-scope" style={{ fontSize: 13, color: "var(--color-content-secondary)", margin: "0 0 4px 0" }}>
            {dateLabel}
          </p>
          <p className="esc-mastery-freshness" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-staff-muted)", margin: 0 }}>
            {data?.scopeLabel ?? "Platform-wide cross-tenant curriculum lens"}
          </p>
        </div>
      </header>

      {/* Scope and Filter Toolbar (Req 31a.2) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "14px 18px",
          background: "var(--color-surface-elevated, #fff)",
          border: "1px solid var(--color-staff-border)",
          borderRadius: 10,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-staff-muted)", textTransform: "uppercase" }}>
            Curriculum Scope:
          </span>
          <select
            className="esc-mastery-filter-select"
            value={tenantParam}
            onChange={(e) => writeParams({ tenantFilter: e.target.value })}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--color-staff-border)",
              background: "var(--color-surface-base, #fafafa)",
            }}
          >
            <option value="all">All Schools (Cross-Tenant Synthesis, Req 31a.2)</option>
            <option value="teneo">Teneo School Content Only</option>
            <option value="oakridge">Oakridge Academy Content Only</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-staff-muted)", textTransform: "uppercase" }}>
            Aging Threshold:
          </span>
          <select
            value={agingThreshold}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setAgingThreshold(val);
              writeParams({ agingThresholdDays: val });
            }}
            style={{
              padding: "6px 10px",
              fontSize: 12.5,
              borderRadius: 6,
              border: "1px solid var(--color-staff-border)",
              background: "var(--color-surface-base, #fafafa)",
            }}
            title="Policy threshold for flagging aged review items (Req 31a.4)"
          >
            <option value={3}>&gt; 3 business days</option>
            <option value={5}>&gt; 5 business days (Standard Target)</option>
            <option value={10}>&gt; 10 business days</option>
          </select>
        </div>
      </div>

      {/* Demo State Control (Edge states) */}
      {showDemo && (
        <div className="esc-briefing-demo" style={{ marginBottom: 20 }}>
          <span className="esc-staff-section-label" style={{ marginBottom: 0 }}>
            Harness Edge State
          </span>
          <select
            className="esc-mastery-filter-select"
            value={demoStateParam}
            onChange={(e) => writeParams({ briefingState: e.target.value })}
          >
            <option value="auto">Auto (Live synthesis)</option>
            <option value="populated">Populated</option>
            <option value="all_clear">All Clear (Nothing pending, Req 31a.6)</option>
            <option value="no_curated_content">No Content (First-run, Req 31a.5)</option>
          </select>
        </div>
      )}

      {initialLoading && <p className="esc-staff-body">Synthesizing cross-tenant curriculum intelligence…</p>}
      {error && <p className="esc-mastery-ask-error">{error}</p>}

      {/* AI Ask box grounded only in content briefing items */}
      {data && !initialLoading && !error && (
        <div data-tour="pedlead-briefing-ask">
          <PedleadAskBox
            tenantFilter={tenantParam}
            label="Ask about this briefing"
            placeholder='Ask about pending items… e.g. "which misconceptions span multiple schools" or "what needs review"'
            loadingLabel="Analyzing curriculum briefing synthesis…"
            scripted={stage?.scriptedAsk}
          />
        </div>
      )}

      {/* Briefing Items or Edge States */}
      {data && !initialLoading && !error && (
        <div
          data-tour="pedlead-briefing-list"
          className={[
            "esc-briefing-body",
            refreshing ? "esc-briefing-body-refreshing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ marginTop: 28 }}
          aria-busy={refreshing}
        >
          {data.state === "no_curated_content" && (
            <div className="esc-staff-panel esc-briefing-edge" style={{ padding: "32px 28px", textAlign: "center" }}>
              <h2 className="esc-briefing-edge-title" style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                No curated content yet (Req 31a.5).
              </h2>
              <p className="esc-staff-body" style={{ maxWidth: 540, margin: "0 auto 18px auto", color: "var(--color-content-secondary)" }}>
                No Skill Graphs or Misconception Taxonomies have been authored on the platform yet.
                Begin by drafting your first unit from a plain-language curriculum standard.
              </p>
              <Link
                href="/pedlead/authoring"
                className="esc-staff-btn esc-staff-btn-primary"
                style={{ display: "inline-block", padding: "10px 20px" }}
              >
                Open Content Authoring Studio →
              </Link>
            </div>
          )}

          {data.state === "all_clear" && (
            <div className="esc-staff-panel esc-briefing-edge" style={{ padding: "32px 28px", textAlign: "center" }}>
              <h2 className="esc-briefing-edge-title" style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "#059669" }}>
                All curriculum graphs verified (Req 31a.6).
              </h2>
              <p className="esc-staff-body" style={{ maxWidth: 520, margin: "0 auto", color: "var(--color-content-secondary)" }}>
                No items pending validation sign-off, no thin rubric exemplars, and all cross-school misconception patterns are currently calibrated.
              </p>
            </div>
          )}

          {data.state === "populated" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.items.map((item, idx) => (
                <PedleadBriefingItemCard
                  key={item.id}
                  item={item}
                  dataTour={idx === 0 ? "pedlead-briefing-item-primary" : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PedleadBriefingScreen() {
  return (
    <Suspense fallback={<div className="esc-screen"><p className="esc-staff-body">Loading briefing…</p></div>}>
      <PedleadBriefingInner />
    </Suspense>
  );
}
