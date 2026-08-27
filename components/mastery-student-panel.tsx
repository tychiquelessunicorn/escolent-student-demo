"use client";

import Link from "next/link";
import type { MasteryOverviewStudent } from "@/lib/mastery-overview-store";
import { formatStaffName } from "@/lib/demo-data/staff";
import { TIER_STYLE } from "@/lib/demo-data/skills";
import { formatTimestamp } from "@/lib/distress-labels";

export function MasteryStudentPanel({
  student,
  onClose,
}: {
  student: MasteryOverviewStudent;
  onClose: () => void;
}) {
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

        <section className="esc-mastery-panel-section">
          <h3 className="esc-staff-section-label">Skills</h3>
          <div className="esc-mastery-panel-skill-list">
            {student.cells.map((cell) => (
              <div key={cell.skillId} className="esc-mastery-panel-skill-row">
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

        {student.override ? (
          <section className="esc-mastery-panel-section">
            <h3 className="esc-staff-section-label">Override on record</h3>
            <p className="esc-staff-body">
              {student.override.reason} — applied{" "}
              {formatTimestamp(student.override.appliedAt)} by{" "}
              {formatStaffName(student.override.teacherId)}. Override action UI is a
              separate slice; this record exists for Briefing revisit prompts.
            </p>
          </section>
        ) : null}

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
