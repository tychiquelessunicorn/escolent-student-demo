"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MasteryStudentPanel } from "@/components/mastery-student-panel";
import { TeacherAskBox } from "@/components/teacher-ask-box";
import type { MasteryOverviewPayload, MasteryOverviewStudent } from "@/lib/mastery-overview-store";
import { formatFreshnessLabel } from "@/lib/mastery-overview-labels";
import { FRESHNESS_LABELS } from "@/lib/demo-data/schedule";

const POLL_MS = 17_000;

type SpaceFilter = "all" | "algebra_8a" | "remediation_8a";

function freshnessLabel(freshness: MasteryOverviewPayload["rosterFreshness"]): string {
  return FRESHNESS_LABELS[freshness] ?? formatFreshnessLabel(freshness);
}

export function MasteryOverviewScreen() {
  const [spaceFilter, setSpaceFilter] = useState<SpaceFilter>("all");
  const [studentQuery, setStudentQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");
  const [data, setData] = useState<MasteryOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<MasteryOverviewStudent | null>(null);

  const refresh = useCallback(async () => {
    try {
      const query =
        spaceFilter === "all" ? "" : `?space=${encodeURIComponent(spaceFilter)}`;
      const response = await fetch(`/api/teacher/mastery-overview${query}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const payload = (await response.json()) as MasteryOverviewPayload;
      setData(payload);
      setError(null);
      setSelectedStudent((current) => {
        if (!current) return current;
        return payload.students.find((student) => student.id === current.id) ?? null;
      });
    } catch {
      setError("Could not load mastery overview right now.");
    } finally {
      setLoading(false);
    }
  }, [spaceFilter]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visibleSkills = useMemo(() => {
    if (!data) return [];
    if (skillFilter === "all") return data.skills;
    return data.skills.filter((skill) => skill.id === skillFilter);
  }, [data, skillFilter]);

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    const query = studentQuery.trim().toLowerCase();
    return data.students.filter((student) =>
      query ? student.fullName.toLowerCase().includes(query) : true,
    );
  }, [data, studentQuery]);

  const apiSpaceFilter = spaceFilter === "all" ? null : spaceFilter;

  return (
    <div className="esc-screen esc-mastery-screen">
      <header className="esc-mastery-screen-header">
        <div>
          <h1 className="esc-staff-foundation-title" style={{ marginBottom: 4 }}>
            Mastery Overview
          </h1>
          <p className="esc-mastery-scope">{data?.scopeLabel ?? "Loading scope…"}</p>
          {data ? (
            <p className="esc-mastery-freshness">
              {freshnessLabel(data.rosterFreshness)}
              {data.liveCount > 0
                ? ` · ${data.liveCount} student${data.liveCount === 1 ? "" : "s"} practicing now`
                : ""}
            </p>
          ) : null}
        </div>
        <div className="esc-mastery-space-switch" role="tablist" aria-label="Space filter">
          {[
            { id: "all" as const, label: "Both Spaces" },
            { id: "algebra_8a" as const, label: "Grade 8A Algebra" },
            { id: "remediation_8a" as const, label: "Grade 8A Remediation" },
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
              onClick={() => setSpaceFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <TeacherAskBox spaceFilter={apiSpaceFilter} />

      <div className="esc-mastery-toolbar">
        <input
          type="search"
          className="esc-mastery-filter-input"
          placeholder="Filter by student…"
          value={studentQuery}
          onChange={(event) => setStudentQuery(event.target.value)}
        />
        <select
          className="esc-mastery-filter-select"
          value={skillFilter}
          onChange={(event) => setSkillFilter(event.target.value)}
        >
          <option value="all">All skills</option>
          {data?.skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        {data ? (
          <div className="esc-mastery-legend" aria-label="Mastery tier legend">
            {data.legend.map((entry) => (
              <div key={entry.tier} className="esc-mastery-legend-item">
                <span
                  className="esc-mastery-legend-swatch"
                  style={{ background: entry.bg }}
                  aria-hidden
                >
                  <span
                    className="esc-mastery-legend-fill"
                    style={{ height: `${entry.fillPct}%`, background: entry.dot }}
                  />
                </span>
                <span>{entry.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? <p className="esc-staff-body">Loading…</p> : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {data && !error ? (
        <>
          <div className="esc-mastery-grid-wrap">
            <table className="esc-mastery-grid">
              <thead>
                <tr>
                  <th className="esc-mastery-grid-sticky-col">Student</th>
                  {visibleSkills.map((skill) => (
                    <th key={skill.id} title={skill.name}>
                      {skill.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="esc-mastery-grid-sticky-col">
                      <button
                        type="button"
                        className="esc-mastery-student-button"
                        onClick={() => setSelectedStudent(student)}
                      >
                        {student.isLive ? (
                          <span className="esc-mastery-live-dot" aria-hidden />
                        ) : null}
                        <span>
                          <span className="esc-mastery-student-name">{student.fullName}</span>
                          <span className="esc-mastery-student-meta">
                            {student.spaceShort} · {student.activityLabel}
                          </span>
                        </span>
                      </button>
                    </td>
                    {visibleSkills.map((skill) => {
                      const cell = student.cells.find((entry) => entry.skillId === skill.id);
                      if (!cell) return <td key={skill.id} />;
                      return (
                        <td key={skill.id}>
                          <div
                            className={[
                              "esc-mastery-cell",
                              cell.tier === "tentative" ? "esc-mastery-cell-tentative" : "",
                              cell.tier === "durable" ? "esc-mastery-cell-durable" : "",
                              cell.isGap ? "esc-mastery-cell-gap" : "",
                              cell.isOverride ? "esc-mastery-cell-override" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            title={`${cell.skillName}: ${cell.label}${cell.isGap ? " · Prerequisite gap" : ""}${cell.isOverride ? " · Teacher override" : ""}`}
                          >
                            <span
                              className="esc-mastery-cell-fill"
                              style={{ height: `${cell.fillPct}%`, background: cell.dot }}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="esc-mastery-sidecards">
            <section className="esc-staff-panel">
              <h2 className="esc-staff-section-label">Prerequisite gap alerts</h2>
              {data.gapAlerts.length > 0 ? (
                <ul className="esc-mastery-side-list">
                  {data.gapAlerts.map((gap) => (
                    <li key={`${gap.studentId}-${gap.skillId}`} className="esc-mastery-side-row">
                      <span>{gap.studentName}</span>
                      <span className="esc-mastery-gap-badge">{gap.skillName}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="esc-staff-body">No flagged prerequisite gaps in this view.</p>
              )}
            </section>

            <section className="esc-staff-panel">
              <h2 className="esc-staff-section-label">Misconceptions this week</h2>
              {data.misconceptions.length > 0 ? (
                <ul className="esc-mastery-side-list">
                  {data.misconceptions.map((misc) => (
                    <li key={misc.id} className="esc-mastery-side-row">
                      <span>{misc.label}</span>
                      <span className="esc-mastery-side-count">
                        {misc.studentCount} student{misc.studentCount === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="esc-staff-body">No misconceptions recorded this week.</p>
              )}
            </section>
          </div>
        </>
      ) : null}

      {selectedStudent ? (
        <MasteryStudentPanel student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      ) : null}
    </div>
  );
}
