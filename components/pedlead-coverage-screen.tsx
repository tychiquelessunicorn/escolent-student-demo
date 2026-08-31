"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CoverageLevel,
  PedleadCoveragePayload,
  SkillCoverageReport,
  UnitCoverageSummary,
} from "@/lib/pedlead-coverage-store";
import { hapticTap } from "@/lib/haptics";

export function PedleadCoverageScreen() {
  const [data, setData] = useState<PedleadCoveragePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [coverageFilter, setCoverageFilter] = useState<"all" | "priority" | "gap" | "thin" | "rich">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadCoverage = useCallback(async (tenant: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pedlead/coverage?tenant=${encodeURIComponent(tenant)}`);
      if (!res.ok) throw new Error("Failed to load coverage intelligence");
      const json = (await res.json()) as PedleadCoveragePayload;
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Could not load coverage intelligence. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCoverage(selectedTenant);
  }, [selectedTenant, loadCoverage]);

  const filteredSkills = useMemo(() => {
    if (!data) return [];
    return data.skills.filter((skill) => {
      // Coverage filter
      if (coverageFilter === "priority" && skill.coverageLevel === "rich") return false;
      if (coverageFilter === "gap" && skill.coverageLevel !== "gap") return false;
      if (coverageFilter === "thin" && skill.coverageLevel !== "thin") return false;
      if (coverageFilter === "rich" && skill.coverageLevel !== "rich") return false;

      // Text query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = skill.name.toLowerCase().includes(q);
        const matchesUnit = skill.unitName.toLowerCase().includes(q);
        const matchesSubject = skill.subject.toLowerCase().includes(q);
        const matchesReason = skill.coverageReason.toLowerCase().includes(q);
        if (!matchesName && !matchesUnit && !matchesSubject && !matchesReason) return false;
      }

      return true;
    });
  }, [data, coverageFilter, searchQuery]);

  return (
    <div className="esc-screen esc-staff-screen" style={{ maxWidth: 1140, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header (Req 32.7) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "3px 9px",
              borderRadius: "var(--radius-staff-control)",
              background: "var(--color-staff-interactive-subtle)",
              color: "var(--color-staff-interactive)",
              border: "1px solid var(--color-staff-interactive-border)",
            }}
          >
            Requirement 32.7 · Curriculum Intelligence
          </span>
          <span style={{ fontSize: 12, color: "var(--color-staff-content-muted)" }}>
            Cross-tenant content analytics
          </span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--color-staff-content-primary)",
            margin: "0 0 6px 0",
          }}
        >
          Curriculum Coverage & Prioritization
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--color-staff-content-secondary)",
            margin: 0,
            maxWidth: 820,
          }}
        >
          Synthesized cross-tenant view of graph completeness and diagnostic misconception depth. Helps
          prioritize where authoring and validation effort is most urgently needed next. Contains zero operational
          student or teacher data (Requirement 21.5).
        </p>
      </div>

      {/* Prioritization Purpose Banner */}
      <div
        style={{
          background: "var(--color-staff-surface-raised)",
          border: "1.5px solid var(--color-staff-border)",
          borderRadius: "var(--radius-staff-control)",
          padding: "14px 18px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 280 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>🎯</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-staff-content-primary)" }}>
              Authoring Prioritization Rule
            </div>
            <div style={{ fontSize: 12, color: "var(--color-staff-content-secondary)", marginTop: 2, lineHeight: 1.4 }}>
              <strong>Gap</strong> = Unvalidated or draft node (blocks student practice).{" "}
              <strong>Thin</strong> = Validated, but missing diagnostic misconceptions or rubric exemplar (degrades hint fidelity).{" "}
              <strong>Rich</strong> = Validated with active diagnostic error models mapped.
            </div>
          </div>
        </div>

        <Link
          href="/pedlead/authoring"
          className="esc-staff-btn esc-staff-btn-primary"
          style={{ textDecoration: "none", fontSize: 12.5, padding: "7px 14px", flexShrink: 0 }}
        >
          Launch Authoring Studio →
        </Link>
      </div>

      {/* Scope & Tenant Filter Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-staff-content-muted)" }}>
            Tenant Scope:
          </span>
          {(
            [
              { id: "all", label: "All Tenants" },
              { id: "teneo", label: "Teneo Academy" },
              { id: "oakridge", label: "Oakridge Academy" },
            ] as const
          ).map((tenant) => {
            const isSelected = selectedTenant === tenant.id;
            return (
              <button
                key={tenant.id}
                type="button"
                onClick={() => {
                  setSelectedTenant(tenant.id);
                  hapticTap();
                }}
                className={[
                  "esc-staff-btn",
                  isSelected ? "esc-staff-btn-primary" : "esc-staff-btn-secondary",
                ].join(" ")}
                style={{ fontSize: 12, padding: "5px 12px" }}
              >
                {tenant.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="text"
            placeholder="Search skills, units, subjects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: "var(--radius-staff-control)",
              border: "1.5px solid var(--color-staff-border)",
              background: "var(--color-staff-surface-raised)",
              color: "var(--color-staff-content-primary)",
              minWidth: 220,
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-staff-content-muted)" }}>
          Computing cross-tenant coverage metrics…
        </div>
      ) : error ? (
        <div
          style={{
            padding: 20,
            borderRadius: "var(--radius-staff-control)",
            background: "oklch(94% 0.04 25)",
            color: "oklch(40% 0.15 25)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : data ? (
        <>
          {/* Top Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {/* Total Prioritized Action Card */}
            <div
              style={{
                background: "var(--color-staff-surface-raised)",
                border: "1.5px solid var(--color-staff-border)",
                borderRadius: "var(--radius-staff-control)",
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-staff-content-muted)", textTransform: "uppercase" }}>
                Prioritized Action Nodes
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "var(--color-staff-interactive)" }}>
                  {data.summary.prioritizedActionCount}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-staff-content-secondary)" }}>
                  of {data.totalSkills} total skills
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-staff-content-muted)", marginTop: 4 }}>
                Gaps & thin nodes requiring editorial review
              </div>
            </div>

            {/* Gap Card */}
            <div
              style={{
                background: "var(--color-staff-surface-raised)",
                border: "1.5px solid oklch(85% 0.08 25)",
                borderRadius: "var(--radius-staff-control)",
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "oklch(45% 0.15 25)", textTransform: "uppercase" }}>
                Curriculum Gaps
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "oklch(45% 0.18 25)" }}>
                  {data.gapCount}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-staff-content-secondary)" }}>
                  ({data.summary.gapPercentage}%)
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-staff-content-muted)", marginTop: 4 }}>
                Draft / pending validation sign-off
              </div>
            </div>

            {/* Thin Card */}
            <div
              style={{
                background: "var(--color-staff-surface-raised)",
                border: "1.5px solid oklch(85% 0.08 80)",
                borderRadius: "var(--radius-staff-control)",
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "oklch(45% 0.15 80)", textTransform: "uppercase" }}>
                Thin Coverage
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "oklch(45% 0.18 80)" }}>
                  {data.thinCount}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-staff-content-secondary)" }}>
                  ({data.summary.thinPercentage}%)
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-staff-content-muted)", marginTop: 4 }}>
                Missing misconceptions or rubric exemplar
              </div>
            </div>

            {/* Rich Card */}
            <div
              style={{
                background: "var(--color-staff-surface-raised)",
                border: "1.5px solid oklch(85% 0.08 145)",
                borderRadius: "var(--radius-staff-control)",
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "oklch(40% 0.15 145)", textTransform: "uppercase" }}>
                Rich Coverage
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "oklch(40% 0.16 145)" }}>
                  {data.richCount}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-staff-content-secondary)" }}>
                  ({data.summary.richPercentage}%)
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-staff-content-muted)", marginTop: 4 }}>
                Validated with diagnostic taxonomy active
              </div>
            </div>
          </div>

          {/* Unit Progress Breakdown Bar */}
          <div
            style={{
              background: "var(--color-staff-surface-raised)",
              border: "1.5px solid var(--color-staff-border)",
              borderRadius: "var(--radius-staff-control)",
              padding: "16px 20px",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-staff-content-primary)", marginBottom: 14 }}>
              Authored Unit Progression Overview
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.units.map((unit) => {
                const richPct = (unit.richCount / unit.totalSkills) * 100;
                const thinPct = (unit.thinCount / unit.totalSkills) * 100;
                const gapPct = (unit.gapCount / unit.totalSkills) * 100;

                return (
                  <div key={unit.unitId} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, color: "var(--color-staff-content-primary)" }}>
                          {unit.unitName}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 7px",
                            borderRadius: 4,
                            background: "var(--color-staff-surface-sunken)",
                            color: "var(--color-staff-content-muted)",
                          }}
                        >
                          {unit.tenantLabel} · {unit.subject}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--color-staff-content-secondary)", fontWeight: 600 }}>
                        {unit.richCount} Rich · {unit.thinCount} Thin · {unit.gapCount} Gap ({unit.totalSkills} skills)
                      </div>
                    </div>

                    {/* Stacked bar */}
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: "var(--color-staff-surface-sunken)",
                        overflow: "hidden",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          width: `${richPct}%`,
                          background: "oklch(60% 0.18 145)",
                          transition: "width 0.3s ease",
                        }}
                        title={`${unit.richCount} Rich (${Math.round(richPct)}%)`}
                      />
                      <div
                        style={{
                          width: `${thinPct}%`,
                          background: "oklch(68% 0.18 80)",
                          transition: "width 0.3s ease",
                        }}
                        title={`${unit.thinCount} Thin (${Math.round(thinPct)}%)`}
                      />
                      <div
                        style={{
                          width: `${gapPct}%`,
                          background: "oklch(60% 0.18 25)",
                          transition: "width 0.3s ease",
                        }}
                        title={`${unit.gapCount} Gap (${Math.round(gapPct)}%)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter Tabs for the Skill List */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(
                [
                  { id: "all", label: `All Skills (${data.totalSkills})` },
                  { id: "priority", label: `Priority Queue (${data.summary.prioritizedActionCount})` },
                  { id: "gap", label: `Gaps (${data.gapCount})` },
                  { id: "thin", label: `Thin (${data.thinCount})` },
                  { id: "rich", label: `Rich (${data.richCount})` },
                ] as const
              ).map((tab) => {
                const isSelected = coverageFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCoverageFilter(tab.id);
                      hapticTap();
                    }}
                    className={[
                      "esc-staff-btn",
                      isSelected ? "esc-staff-btn-primary" : "esc-staff-btn-secondary",
                    ].join(" ")}
                    style={{ fontSize: 12, padding: "5px 12px" }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: "var(--color-staff-content-muted)" }}>
              Showing {filteredSkills.length} skill{filteredSkills.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* Skill Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredSkills.map((skill) => {
              return (
                <div
                  key={skill.id}
                  style={{
                    background: "var(--color-staff-surface-raised)",
                    border: "1.5px solid var(--color-staff-border)",
                    borderRadius: "var(--radius-staff-control)",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 280 }}>
                    {/* Top badging row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      {/* Coverage Status Badge */}
                      {skill.coverageLevel === "gap" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: "oklch(93% 0.05 25)",
                            color: "oklch(45% 0.16 25)",
                            border: "1px solid oklch(85% 0.08 25)",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "oklch(55% 0.2 25)",
                            }}
                          />
                          GAP · High Priority
                        </span>
                      ) : skill.coverageLevel === "thin" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: "oklch(93% 0.06 80)",
                            color: "oklch(45% 0.15 80)",
                            border: "1px solid oklch(85% 0.08 80)",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "oklch(65% 0.18 80)",
                            }}
                          />
                          THIN · Diagnostic Deficit
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: "oklch(93% 0.05 145)",
                            color: "oklch(40% 0.15 145)",
                            border: "1px solid oklch(85% 0.08 145)",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "oklch(55% 0.18 145)",
                            }}
                          />
                          RICH · Validated & Mapped
                        </span>
                      )}

                      {/* Subject and Tenant Origin */}
                      <span style={{ fontSize: 11.5, color: "var(--color-staff-content-muted)" }}>
                        {skill.tenantLabel} · {skill.unitName}
                      </span>

                      {/* Evaluation Strategy */}
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "var(--color-staff-surface-sunken)",
                          color: "var(--color-staff-content-secondary)",
                        }}
                      >
                        {skill.evaluationStrategy === "rubric" ? "Rubric Evaluated" : "Exact Match"}
                      </span>

                      {/* Lifecycle Status */}
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background:
                            skill.status === "validated"
                              ? "var(--color-staff-interactive-subtle)"
                              : "var(--color-staff-surface-sunken)",
                          color:
                            skill.status === "validated"
                              ? "var(--color-staff-interactive)"
                              : "var(--color-staff-content-muted)",
                          fontWeight: 600,
                        }}
                      >
                        {skill.status === "validated"
                          ? "Live Validated"
                          : skill.status === "pending_approval"
                            ? "Pending Sign-off"
                            : "Draft"}
                      </span>
                    </div>

                    {/* Skill Title & Slug */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "var(--color-staff-content-primary)",
                          margin: 0,
                        }}
                      >
                        {skill.name}
                      </h3>
                      <span style={{ fontSize: 11.5, color: "var(--color-staff-content-muted)", fontFamily: "monospace" }}>
                        {skill.slug}
                      </span>
                    </div>

                    {/* Coverage Reason / Prioritization Detail */}
                    <p
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: "var(--color-staff-content-secondary)",
                        margin: "6px 0 8px 0",
                      }}
                    >
                      {skill.coverageReason}
                    </p>

                    {/* Mapped Misconceptions Detail */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-staff-content-muted)" }}>
                        Mapped Misconceptions ({skill.mappedMisconceptionCount}):
                      </span>
                      {skill.mappedMisconceptions.length > 0 ? (
                        skill.mappedMisconceptions.map((m) => (
                          <span
                            key={m.id}
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "var(--color-staff-surface-sunken)",
                              color: "var(--color-staff-content-primary)",
                              border: "1px solid var(--color-staff-border-subtle)",
                            }}
                          >
                            {m.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 11, color: "oklch(45% 0.15 80)", fontStyle: "italic" }}>
                          None mapped (Taxonomy gap)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Direct Action Link to Authoring Flow */}
                  <div style={{ alignSelf: "center", flexShrink: 0 }}>
                    <Link
                      href={skill.actionRoute}
                      className="esc-staff-btn esc-staff-btn-secondary"
                      style={{
                        fontSize: 12,
                        padding: "6px 14px",
                        textDecoration: "none",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        color:
                          skill.coverageLevel === "gap"
                            ? "oklch(45% 0.18 25)"
                            : skill.coverageLevel === "thin"
                              ? "oklch(45% 0.15 80)"
                              : "var(--color-staff-interactive)",
                      }}
                    >
                      {skill.actionLabel}
                    </Link>
                  </div>
                </div>
              );
            })}

            {filteredSkills.length === 0 && (
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  background: "var(--color-staff-surface-raised)",
                  borderRadius: "var(--radius-staff-control)",
                  color: "var(--color-staff-content-muted)",
                  fontSize: 13,
                }}
              >
                No curriculum skills match the current filter selection.
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
