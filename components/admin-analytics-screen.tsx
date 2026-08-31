"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminTour } from "@/components/admin-tour-provider";
import { EscolentLoader } from "@/components/escolent-logo";
import type {
  AdminAnalyticsDateRangePreset,
  AdminAnalyticsPayload,
} from "@/lib/admin-analytics-store";

type DateRangePreset = AdminAnalyticsDateRangePreset;

function AdminAnalyticsAskBox({
  dateRange,
  scripted,
}: {
  dateRange: DateRangePreset;
  scripted?: { question: string; answer: string };
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shownQuestion = scripted ? scripted.question : question;
  const shownAnswer = scripted ? scripted.answer : answer;
  const shownLoading = scripted ? false : loading;

  const submit = async () => {
    if (scripted) return;
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "admin_analytics_ask",
          question: trimmed,
          dateRange,
        }),
      });
      if (!response.ok) throw new Error("ask failed");
      const data = (await response.json()) as { text?: string };
      setAnswer(data.text ?? "Nothing in the data matched that question.");
    } catch {
      setError("Could not check that right now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="esc-mastery-ask esc-admin-analytics-ask" data-tour="admin-analytics-ask">
      <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
        Ask about these metrics
      </p>
      <div className="esc-mastery-ask-field">
        <input
          type="text"
          className="esc-mastery-ask-input"
          value={shownQuestion}
          readOnly={Boolean(scripted)}
          placeholder='e.g. "how many students practiced this week"'
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
        {!scripted && question.trim() ? (
          <button type="button" className="esc-staff-btn esc-staff-btn-primary" onClick={() => void submit()}>
            Ask
          </button>
        ) : null}
      </div>
      {shownLoading ? <p className="esc-mastery-ask-status">Checking the metrics…</p> : null}
      {error && !scripted ? <p className="esc-mastery-ask-error">{error}</p> : null}
      {shownAnswer ? <div className="esc-mastery-ask-answer">{shownAnswer}</div> : null}
    </div>
  );
}

function AdminAnalyticsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stage } = useAdminTour();
  const scriptedAsk =
    stage?.scriptedAsk?.screen === "analytics" ? stage.scriptedAsk : undefined;
  const fromBriefing = searchParams.get("from") === "briefing-insufficient";

  const rangeParam = searchParams.get("range");
  const dateRange: DateRangePreset =
    rangeParam === "14d" || rangeParam === "all" ? rangeParam : "7d";

  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const writeRange = useCallback(
    (range: DateRangePreset) => {
      const params = new URLSearchParams(searchParams.toString());
      if (range === "7d") params.delete("range");
      else params.set("range", range);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const query = dateRange === "7d" ? "" : `?range=${encodeURIComponent(dateRange)}`;
        const response = await fetch(`/api/admin/analytics${query}`);
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as AdminAnalyticsPayload;
        if (cancelled) return;
        setData(payload);
        setError(null);
      } catch {
        if (cancelled) return;
        setError("Could not load analytics right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  const maxTierCount =
    data?.mastery.tierDistribution.reduce((max, bucket) => Math.max(max, bucket.count), 0) ?? 0;

  return (
    <div className="esc-screen esc-admin-analytics-screen">
      {fromBriefing ? (
        <div className="esc-staff-panel" style={{ marginBottom: 20 }}>
          <p className="esc-staff-body" style={{ margin: 0 }}>
            Not enough signal yet for a confident Briefing — school-wide Analytics is the right
            place to start while activity accumulates.
          </p>
        </div>
      ) : null}

      <header className="esc-briefing-header">
        <div>
          <h1 className="esc-staff-foundation-title" style={{ marginBottom: 4 }}>
            School-wide analytics
          </h1>
          <p className="esc-mastery-scope">{data?.scopeLabel ?? "Loading…"}</p>
          <p className="esc-mastery-freshness">Computed live on each view</p>
        </div>
      </header>

      <div className="esc-admin-analytics-toolbar">
        <label className="esc-admin-analytics-filter">
          <span className="esc-staff-section-label">Date range</span>
          <select
            className="esc-mastery-filter-select"
            value={dateRange}
            onChange={(event) => writeRange(event.target.value as DateRangePreset)}
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="all">All logged sessions</option>
          </select>
        </label>
        <div className="esc-admin-analytics-filter esc-admin-analytics-filter-disabled">
          <span className="esc-staff-section-label">Teacher</span>
          <select className="esc-mastery-filter-select" disabled aria-disabled="true">
            <option>All teachers</option>
          </select>
          <p className="esc-admin-analytics-filter-note">
            {data?.teacherFilterNote ??
              "Teacher filter unavailable in this pilot — only Ms. Mokoena has a Space on Escolent."}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px 0" }}>
          <EscolentLoader label="Loading analytics…" size={22} />
        </div>
      ) : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {data && !loading && !error ? (
        <>
          <section
            className="esc-admin-analytics-section"
            aria-labelledby="admin-adoption-heading"
            data-tour="admin-analytics-adoption"
          >
            <h2 id="admin-adoption-heading" className="esc-staff-section-label">
              Adoption
            </h2>
            <div className="esc-admin-analytics-cards">
              <div className="esc-admin-analytics-card">
                <p className="esc-admin-analytics-card-label">Active students</p>
                <p className="esc-admin-analytics-card-value">
                  {data.adoption.activeStudents}
                  <span className="esc-admin-analytics-card-denom">
                    / {data.adoption.totalStudents}
                  </span>
                </p>
                <p className="esc-admin-analytics-card-detail">Practiced within the last 7 days</p>
              </div>
              <div className="esc-admin-analytics-card">
                <p className="esc-admin-analytics-card-label">Avg session duration</p>
                <p className="esc-admin-analytics-card-value">
                  {data.adoption.averageSessionDurationMinutes === null
                    ? "—"
                    : data.adoption.averageSessionDurationMinutes}
                  {data.adoption.averageSessionDurationMinutes !== null ? (
                    <span className="esc-admin-analytics-card-unit"> min</span>
                  ) : null}
                </p>
                <p className="esc-admin-analytics-card-detail">
                  {data.adoption.sessionsInRange} session
                  {data.adoption.sessionsInRange === 1 ? "" : "s"} in range
                </p>
              </div>
              <div className="esc-admin-analytics-card">
                <p className="esc-admin-analytics-card-label">Practice problems</p>
                <p className="esc-admin-analytics-card-value">
                  {data.adoption.totalPracticeProblems}
                </p>
                <p className="esc-admin-analytics-card-detail">Attempted in selected range</p>
              </div>
            </div>
          </section>

          <section className="esc-admin-analytics-section" aria-labelledby="admin-mastery-heading">
            <h2 id="admin-mastery-heading" className="esc-staff-section-label">
              Mastery snapshot
            </h2>
            <div className="esc-admin-analytics-cards">
              <div className="esc-admin-analytics-card">
                <p className="esc-admin-analytics-card-label">Avg durable skills</p>
                <p className="esc-admin-analytics-card-value">
                  {data.mastery.averageDurableSkillsPerStudent}
                </p>
                <p className="esc-admin-analytics-card-detail">Per student across the roster</p>
              </div>
              <div className="esc-admin-analytics-card">
                <p className="esc-admin-analytics-card-label">Skill cells tracked</p>
                <p className="esc-admin-analytics-card-value">{data.mastery.totalSkillCells}</p>
                <p className="esc-admin-analytics-card-detail">Students × skills on Overview</p>
              </div>
            </div>

            <div className="esc-staff-panel esc-admin-analytics-distribution" data-tour="admin-analytics-tiers">
              <p className="esc-staff-section-label" style={{ marginBottom: 14 }}>
                Tier distribution
              </p>
              <ul className="esc-admin-analytics-bars">
                {data.mastery.tierDistribution.map((bucket) => (
                  <li key={bucket.tier} className="esc-admin-analytics-bar-row">
                    <span className="esc-admin-analytics-bar-label">{bucket.label}</span>
                    <div className="esc-admin-analytics-bar-track" aria-hidden>
                      <div
                        className={`esc-admin-analytics-bar-fill esc-admin-analytics-bar-fill-${bucket.tier}`}
                        style={{
                          width:
                            maxTierCount === 0
                              ? "0%"
                              : `${Math.round((bucket.count / maxTierCount) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="esc-admin-analytics-bar-count">
                      {bucket.count}
                      <span className="esc-admin-analytics-bar-pct"> ({bucket.sharePct}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <AdminAnalyticsAskBox dateRange={dateRange} scripted={scriptedAsk} />
        </>
      ) : null}
    </div>
  );
}

export function AdminAnalyticsScreen() {
  return (
    <Suspense
      fallback={
        <div className="esc-screen" style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}>
          <EscolentLoader label="Loading analytics…" size={24} />
        </div>
      }
    >
      <AdminAnalyticsInner />
    </Suspense>
  );
}
