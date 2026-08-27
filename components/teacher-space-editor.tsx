"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OVERVIEW_SKILL_COLUMNS } from "@/lib/demo-data/overview-skills";
import { hapticTap } from "@/lib/haptics";
import type { ManagedTeacherSpace } from "@/lib/space-store";

type RosterRow = {
  id: string;
  fullName: string;
  baselineSpaceId: string;
  effectiveSpaceId: string;
};

type SkillOption = { id: string; name: string; short: string };

type FormState = {
  name: string;
  description: string;
  shortName: string;
  includedSkillIds: string[];
  difficultyMin: number;
  difficultyMax: number;
  classroomPacingMode: boolean;
  studentIds: string[];
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  shortName: "",
  includedSkillIds: [],
  difficultyMin: 2,
  difficultyMax: 4,
  classroomPacingMode: true,
  studentIds: [],
};

function spaceToForm(space: ManagedTeacherSpace, studentIds: string[]): FormState {
  return {
    name: space.name,
    description: space.description,
    shortName: space.shortName,
    includedSkillIds: [...space.includedSkillIds],
    difficultyMin: space.difficultyMin,
    difficultyMax: space.difficultyMax,
    classroomPacingMode: space.classroomPacingMode,
    studentIds: [...studentIds],
  };
}

export function TeacherSpaceEditor({
  mode,
  spaceId,
}: {
  mode: "create" | "edit";
  spaceId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>(
    OVERVIEW_SKILL_COLUMNS.map((skill) => ({
      id: skill.id,
      name: skill.name,
      short: skill.short,
    })),
  );
  const [spaceLabels, setSpaceLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === "edit" && spaceId) {
          const response = await fetch(`/api/teacher/spaces/${encodeURIComponent(spaceId)}`);
          if (!response.ok) throw new Error("load failed");
          const data = (await response.json()) as {
            space: ManagedTeacherSpace;
            studentIds: string[];
            roster: RosterRow[];
            spaceNames?: Record<string, string>;
          };
          if (cancelled) return;
          setForm(spaceToForm(data.space, data.studentIds));
          setRoster(data.roster);
          setSpaceLabels(data.spaceNames ?? {});
        } else {
          const response = await fetch("/api/teacher/spaces");
          if (!response.ok) throw new Error("load failed");
          const data = (await response.json()) as {
            roster: RosterRow[];
            skills: SkillOption[];
            spaces: { id: string; name: string; shortName: string }[];
          };
          if (cancelled) return;
          setRoster(data.roster);
          setSkills(data.skills);
          const labels: Record<string, string> = {};
          for (const space of data.spaces) {
            labels[space.id] = space.shortName || space.name;
          }
          setSpaceLabels(labels);
          setForm(EMPTY_FORM);
        }
      } catch {
        if (!cancelled) setError("Could not load Space editor.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, spaceId]);

  const spaceNameById = useMemo(() => {
    const map = { ...spaceLabels };
    for (const row of roster) {
      if (!map[row.effectiveSpaceId]) map[row.effectiveSpaceId] = row.effectiveSpaceId;
    }
    return map;
  }, [roster, spaceLabels]);

  const toggleSkill = (skillId: string) => {
    setForm((current) => {
      const has = current.includedSkillIds.includes(skillId);
      return {
        ...current,
        includedSkillIds: has
          ? current.includedSkillIds.filter((id) => id !== skillId)
          : [...current.includedSkillIds, skillId],
      };
    });
  };

  const toggleStudent = (studentId: string) => {
    setForm((current) => {
      const has = current.studentIds.includes(studentId);
      return {
        ...current,
        studentIds: has
          ? current.studentIds.filter((id) => id !== studentId)
          : [...current.studentIds, studentId],
      };
    });
  };

  const canContinue =
    form.name.trim().length >= 2 &&
    form.description.trim().length >= 1 &&
    form.includedSkillIds.length > 0 &&
    form.difficultyMin <= form.difficultyMax;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const path =
        mode === "create"
          ? "/api/teacher/spaces"
          : `/api/teacher/spaces/${encodeURIComponent(spaceId!)}`;
      const response = await fetch(path, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save Space.");
        return;
      }
      hapticTap();
      router.push("/teacher/spaces");
      router.refresh();
    } catch {
      setError("Could not save Space — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="esc-screen esc-spaces-screen">
        <p className="esc-staff-body">Loading…</p>
      </div>
    );
  }

  return (
    <div className="esc-screen esc-spaces-screen">
      <Link href="/teacher/spaces" className="esc-spaces-back">
        ‹ Spaces
      </Link>
      <h1 className="esc-staff-foundation-title">
        {mode === "create" ? "New Space" : "Edit Space"}
      </h1>
      <p className="esc-spaces-lede">
        Structured configuration only — plain-language AI co-authoring is a follow-up slice.
      </p>

      {step === "edit" ? (
        <>
          <section className="esc-spaces-section">
            <label className="esc-spaces-label" htmlFor="space-name">
              Name
            </label>
            <input
              id="space-name"
              className="esc-spaces-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </section>

          <section className="esc-spaces-section">
            <label className="esc-spaces-label" htmlFor="space-description">
              Description
            </label>
            <textarea
              id="space-description"
              className="esc-spaces-textarea"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </section>

          <section className="esc-spaces-section">
            <h2 className="esc-staff-section-label">Skills from the graph</h2>
            <p className="esc-spaces-hint">Same seven overview skills used elsewhere — select which belong in this Space.</p>
            <div className="esc-spaces-skill-grid">
              {skills.map((skill) => {
                const checked = form.includedSkillIds.includes(skill.id);
                return (
                  <label key={skill.id} className="esc-spaces-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSkill(skill.id)}
                    />
                    <span>{skill.name}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="esc-spaces-section">
            <h2 className="esc-staff-section-label">Difficulty range</h2>
            <p className="esc-spaces-hint">
              Saved with this Space. Practice does not yet vary problem difficulty from this setting —
              it is configuration for when that engine ships.
            </p>
            <div className="esc-spaces-difficulty">
              <label>
                Min
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="esc-spaces-input esc-spaces-input-narrow"
                  value={form.difficultyMin}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      difficultyMin: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="esc-spaces-input esc-spaces-input-narrow"
                  value={form.difficultyMax}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      difficultyMax: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="esc-spaces-section">
            <h2 className="esc-staff-section-label">Classroom pacing</h2>
            <p className="esc-spaces-hint">
              Saved with this Space. Auto-remediation vs flagged-gap behavior is not enforced in this
              demo build yet — the setting records your intent.
            </p>
            <label className="esc-spaces-check esc-spaces-check-row">
              <input
                type="checkbox"
                checked={form.classroomPacingMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    classroomPacingMode: event.target.checked,
                  }))
                }
              />
              <span>
                {form.classroomPacingMode
                  ? "Classroom pacing on — students stay on Space skills; gaps flagged for you"
                  : "Self-paced — intent is auto-remediation when gaps appear"}
              </span>
            </label>
          </section>

          <section className="esc-spaces-section">
            <h2 className="esc-staff-section-label">Assign students</h2>
            <p className="esc-spaces-hint">
              Checking a student assigns them to this Space (layered over roster baseline). To move
              someone out of a baseline Space, assign them to another Space — unchecking alone does
              not override their roster membership.
            </p>
            <div className="esc-spaces-roster">
              {roster.map((student) => {
                const checked = form.studentIds.includes(student.id);
                const elsewhere =
                  student.effectiveSpaceId &&
                  !checked &&
                  spaceNameById[student.effectiveSpaceId]
                    ? spaceNameById[student.effectiveSpaceId]
                    : student.effectiveSpaceId;
                return (
                  <label key={student.id} className="esc-spaces-check esc-spaces-roster-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(student.id)}
                    />
                    <span className="esc-spaces-roster-name">{student.fullName}</span>
                    <span className="esc-spaces-roster-meta">
                      {checked ? "This Space" : elsewhere}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <p className="esc-spaces-future-note">
            Changes apply to sessions starting from now — a session already in progress won&apos;t be
            affected.
          </p>

          <div className="esc-spaces-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              onClick={() => router.push("/teacher/spaces")}
            >
              Cancel
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={!canContinue}
              onClick={() => {
                hapticTap();
                setStep("confirm");
              }}
            >
              Review and confirm
            </button>
          </div>
        </>
      ) : (
        <section className="esc-override-flow">
          <h2 className="esc-staff-section-label">Confirm Space {mode === "create" ? "creation" : "update"}</h2>
          <p className="esc-staff-body">
            <strong>{form.name.trim()}</strong> — {form.includedSkillIds.length} skills · difficulty{" "}
            {form.difficultyMin}–{form.difficultyMax} ·{" "}
            {form.classroomPacingMode ? "classroom pacing" : "self-paced"} · {form.studentIds.length}{" "}
            students assigned
          </p>
          <p className="esc-spaces-hint">{form.description.trim()}</p>
          <p className="esc-spaces-future-note">
            Changes apply to sessions starting from now — a session already in progress won&apos;t be
            affected.
          </p>
          <div className="esc-override-flow-actions">
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-primary"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? "Saving…" : "Confirm and save"}
            </button>
            <button
              type="button"
              className="esc-staff-btn esc-staff-btn-secondary"
              disabled={submitting}
              onClick={() => setStep("edit")}
            >
              Back
            </button>
          </div>
        </section>
      )}

      {error ? <p className="esc-mastery-ask-error">{error}</p> : null}
    </div>
  );
}
