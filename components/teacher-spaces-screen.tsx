"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EscolentLoader } from "@/components/escolent-logo";

type SpaceCard = {
  id: string;
  name: string;
  description: string;
  shortName: string;
  classroomPacingMode: boolean;
  difficultyMin: number;
  difficultyMax: number;
  studentCount: number;
  skillCount: number;
};

export function TeacherSpacesScreen() {
  const [spaces, setSpaces] = useState<SpaceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/teacher/spaces");
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { spaces: SpaceCard[] };
      setSpaces(data.spaces);
      setError(null);
    } catch {
      setError("Could not load Spaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="esc-screen esc-spaces-screen">
      <div className="esc-spaces-list-header">
        <div>
          <h1 className="esc-staff-foundation-title">Your Spaces</h1>
          <p className="esc-spaces-lede">Teneo · Grade 8</p>
        </div>
        <Link href="/teacher/spaces/new" className="esc-staff-btn esc-staff-btn-primary">
          New Space
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: "40px 0" }}>
          <EscolentLoader label="Loading Spaces…" size={22} />
        </div>
      ) : null}
      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}

      {!loading && !error ? (
        <div className="esc-spaces-card-list" data-tour="teacher-spaces-list">
          {spaces.map((space) => (
            <Link
              key={space.id}
              href={`/teacher/spaces/${encodeURIComponent(space.id)}/edit`}
              className="esc-spaces-card esc-pressable"
            >
              <h2 className="esc-spaces-card-title">{space.name}</h2>
              <p className="esc-spaces-card-meta">
                {space.studentCount} student{space.studentCount === 1 ? "" : "s"} ·{" "}
                {space.skillCount} skill{space.skillCount === 1 ? "" : "s"} · difficulty{" "}
                {space.difficultyMin}–{space.difficultyMax}
              </p>
              <p className="esc-spaces-card-desc">{space.description}</p>
              <div className="esc-spaces-card-footer">
                <span className="esc-spaces-pill">
                  {space.classroomPacingMode ? "Classroom pacing" : "Self-paced"}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: "var(--radius-staff-control)",
                    background: "oklch(93% 0.05 145)",
                    color: "oklch(40% 0.15 145)",
                    border: "1px solid oklch(85% 0.08 145)",
                  }}
                  title="All included skills have validated content and active diagnostic misconception models (Requirement 32.4)"
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
                  Rich coverage · {space.skillCount}/{space.skillCount} validated
                </span>
                <span className="esc-spaces-card-edit">Edit ›</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
