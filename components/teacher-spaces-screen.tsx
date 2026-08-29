"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

      {loading ? <p className="esc-staff-body">Loading…</p> : null}
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
                <span className="esc-spaces-card-edit">Edit ›</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
