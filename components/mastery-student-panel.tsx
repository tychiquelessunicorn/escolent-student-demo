"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OverrideActionFlow, type OverrideFlowMode } from "@/components/override-action-flow";
import type { MasteryOverviewStudent } from "@/lib/mastery-overview-store";
import { formatStaffName } from "@/lib/demo-data/staff";
import { OVERVIEW_SKILL_COLUMNS } from "@/lib/demo-data/overview-skills";
import { TIER_STYLE } from "@/lib/demo-data/skills";
import { formatTimestamp } from "@/lib/distress-labels";
import { hapticTap } from "@/lib/haptics";

export function MasteryStudentPanel({
  student,
  onClose,
  onChanged,
  initialOverrideSkillId,
  initialOverrideMode,
}: {
  student: MasteryOverviewStudent;
  onClose: () => void;
  onChanged?: () => void;
  initialOverrideSkillId?: string | null;
  initialOverrideMode?: OverrideFlowMode | null;
}) {
  const [flow, setFlow] = useState<{
    skillId: string;
    skillName: string;
    mode: OverrideFlowMode;
  } | null>(null);

  useEffect(() => {
    if (!initialOverrideSkillId) return;
    const cell = student.cells.find((entry) => entry.skillId === initialOverrideSkillId);
    const skillName =
      cell?.skillName ??
      OVERVIEW_SKILL_COLUMNS.find((skill) => skill.id === initialOverrideSkillId)?.name ??
      initialOverrideSkillId;
    setFlow({
      skillId: initialOverrideSkillId,
      skillName,
      mode: initialOverrideMode === "revisit" ? "revisit" : "mark",
    });
  }, [initialOverrideSkillId, initialOverrideMode, student.id]);

  const existingReason =
    flow != null
      ? student.activeOverrides.find((entry) => entry.skillId === flow.skillId)?.reason ??
        student.overrideHistory.find((entry) => entry.skillId === flow.skillId)?.reason ??
        null
      : null;

  const history = student.overrideHistory;
  const skillLabel = (skillId: string) =>
    OVERVIEW_SKILL_COLUMNS.find((skill) => skill.id === skillId)?.name ?? skillId;

  return (
    <div className="esc-mastery-panel-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="esc-mastery-panel"
        role="dialog"
        aria-labelledby="mastery-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="esc-mastery-panel-header">
          <div>
            <h2 id="mastery-panel-title" className="esc-mastery-panel-title">
              {student.fullName}
            </h2>
            <p className="esc-mastery-panel-meta">
              {student.spaceShort} · {student.activityLabel}
              {student.isLive ? " · Practicing now" : ""}
            </p>
          </div>
          <button type="button" className="esc-staff-btn esc-staff-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {student.escalationNote ? (
          <div className="esc-mastery-panel-note">
            {student.escalationNote}{" "}
            <Link href="/teacher/escalations" className="esc-mastery-panel-link">
              Open Escalations
            </Link>
          </div>
        ) : null}

        {flow ? (
          <section className="esc-mastery-panel-section">
            <OverrideActionFlow
              studentId={student.id}
              studentName={student.fullName}
              skillId={flow.skillId}
              skillName={flow.skillName}
              mode={flow.mode}
              existingReason={existingReason}
              onCancel={() => setFlow(null)}
              onApplied={() => {
                setFlow(null);
                onChanged?.();
              }}
            />
          </section>
        ) : null}

        <section className="esc-mastery-panel-section">
          <h3 className="esc-staff-section-label">Skills</h3>
          <div className="esc-mastery-panel-skill-list">
            {student.cells.map((cell) => (
              <div key={cell.skillId} className="esc-mastery-panel-skill-row">
                <div className="esc-mastery-panel-skill-main">
                  <div className="esc-staff-data-primary" style={{ fontSize: 14 }}>
                    {cell.skillName}
                  </div>
                  <div className="esc-mastery-panel-skill-badges">
                    <span
                      className="esc-mastery-tier-badge"
                      style={{
                        background: cell.bg,
                        color: TIER_STYLE[cell.tier].badgeColor,
                      }}
                    >
                      {cell.label}
                    </span>
                    {cell.isGap ? (
                      <span className="esc-mastery-gap-badge">Prerequisite gap</span>
                    ) : null}
                    {cell.isOverride ? (
                      <span className="esc-mastery-override-badge">Teacher override</span>
                    ) : null}
                  </div>
                </div>
                {cell.tier !== "durable" && !flow ? (
                  <button
                    type="button"
                    className="esc-staff-btn esc-staff-btn-secondary esc-mastery-override-trigger"
                    onClick={() => {
                      hapticTap();
                      setFlow({
                        skillId: cell.skillId,
                        skillName: cell.skillName,
                        mode: "mark",
                      });
                    }}
                  >
                    Mark as mastered
                  </button>
                ) : null}
                {cell.tier === "durable" && cell.isOverride && !flow ? (
                  <button
                    type="button"
                    className="esc-staff-btn esc-staff-btn-secondary esc-mastery-override-trigger"
                    onClick={() => {
                      hapticTap();
                      setFlow({
                        skillId: cell.skillId,
                        skillName: cell.skillName,
                        mode: "revisit",
                      });
                    }}
                  >
                    Confirm or reassess
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {student.misconceptions.length > 0 ? (
          <section className="esc-mastery-panel-section">
            <h3 className="esc-staff-section-label">Misconceptions</h3>
            <ul className="esc-mastery-panel-list">
              {student.misconceptions.map((misc) => (
                <li key={`${misc.skillId}-${misc.label}`}>
                  <strong>{misc.skillName}:</strong> {misc.label}
                  <span className="esc-mastery-panel-list-meta">
                    {" "}
                    · observed {formatTimestamp(misc.observedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="esc-mastery-panel-section">
          <h3 className="esc-staff-section-label">Override on record</h3>
          {history.length > 0 ? (
            <ul className="esc-mastery-panel-list esc-override-history-list">
              {history.map((entry) => (
                <li key={entry.id} className="esc-override-history-item">
                  <div className="esc-override-history-skill">{skillLabel(entry.skillId)}</div>
                  <p className="esc-staff-body" style={{ margin: "4px 0 0" }}>
                    {entry.reason}
                  </p>
                  <span className="esc-mastery-panel-list-meta">
                    {entry.kind === "reconfirm" ? "Reconfirmed" : "Marked mastered"} ·{" "}
                    {formatTimestamp(entry.appliedAt)} by {formatStaffName(entry.teacherId)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="esc-staff-body">No overrides on file for this student.</p>
          )}
        </section>

        <section className="esc-mastery-panel-section">
          <h3 className="esc-staff-section-label">Recent sessions</h3>
          {student.recentSessions.length > 0 ? (
            <ul className="esc-mastery-panel-list">
              {student.recentSessions.map((session) => (
                <li key={`${session.date}-${session.title}`}>
                  <strong>{session.date}</strong> · {session.title} — {session.result}
                </li>
              ))}
            </ul>
          ) : (
            <p className="esc-staff-body">No session history recorded yet for this student.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
