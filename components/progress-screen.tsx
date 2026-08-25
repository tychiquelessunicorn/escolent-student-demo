"use client";

import Link from "next/link";
import { useState } from "react";
import { AskBox } from "@/components/ask-box";
import { BeginningIllustration } from "@/components/illustrations";
import { SkillRow } from "@/components/skill-row";
import { PageHeading, SectionLabel } from "@/components/ui";
import {
  NEXT_REVIEW,
  RECENT_SESSIONS,
  SKILLS,
  STUDENT,
} from "@/lib/demo-data";

const wrapper = {
  maxWidth: "var(--container-focused)",
  margin: "0 auto",
  padding: "20px 24px 90px",
  minHeight: "100vh",
  boxSizing: "border-box" as const,
};

export function ProgressScreen() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div style={wrapper}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <PageHeading
          area="progress"
          title="My progress"
          subtitle={`${STUDENT.grade} · ${STUDENT.spaceName}`}
        />
        <div className="esc-illust" style={{ flexShrink: 0 }}>
          <BeginningIllustration size={88} style={{ marginBottom: 0 }} />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <AskBox
          task="progress_ask"
          surface="progress_ask"
          placeholder={'Ask about your progress… e.g. "how am I doing on fractions"'}
          loadingLabel="Checking your progress…"
        />
      </div>

      {/*
        Spaced repetition is surfaced as a plain upcoming review. No streak, no
        countdown pressure, nothing that turns a gap into a loss.
      */}
      <div
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)",
          padding: "24px 28px",
          marginBottom: 36,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "var(--color-content-muted)",
            marginBottom: 10,
          }}
        >
          Next review
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 19,
            marginBottom: 6,
          }}
        >
          {NEXT_REVIEW.skillName}, {NEXT_REVIEW.whenLabel}
        </div>
        <div style={{ fontSize: 14, color: "var(--color-content-secondary)" }}>
          {NEXT_REVIEW.note}
        </div>
      </div>

      <SectionLabel area="progress">Skill progression</SectionLabel>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 36 }}
      >
        {SKILLS.map((skill) => (
          <SkillRow
            key={skill.id}
            skill={skill}
            showFlag
            expanded={Boolean(expanded[skill.id])}
            onToggle={() =>
              setExpanded((current) => ({
                ...current,
                [skill.id]: !current[skill.id],
              }))
            }
          >
            <div style={{ padding: "0 18px 16px 41px" }}>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-content-secondary)",
                  lineHeight: 1.5,
                  marginBottom: 12,
                }}
              >
                {skill.progressDetail}
              </div>
              {/*
                Routes to the skill actually clicked. An earlier build sent every
                row to the same two-step-equations demo, which silently mislabeled
                what the student was practising.
              */}
              <Link
                href={`/practice?skill=${skill.slug}`}
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-control)",
                  border: "1.5px solid var(--color-accent-subtle-border)",
                  background: "transparent",
                  color: "var(--color-accent)",
                  textDecoration: "none",
                }}
              >
                Practice this now
              </Link>
            </div>
          </SkillRow>
        ))}
      </div>

      <SectionLabel area="progress">Recent sessions</SectionLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-shell)",
          overflow: "hidden",
          background: "var(--color-surface-raised)",
        }}
      >
        {RECENT_SESSIONS.map((session, index) => (
          <div
            key={`${session.date}-${session.title}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 18px",
              borderBottom:
                index === RECENT_SESSIONS.length - 1
                  ? "none"
                  : "1px solid var(--color-border-subtle)",
            }}
          >
            <div
              style={{
                width: 64,
                fontSize: 12,
                color: "var(--color-content-muted)",
                flexShrink: 0,
              }}
            >
              {session.date}
            </div>
            <div style={{ flex: 1, fontSize: 14 }}>{session.title}</div>
            <div
              style={{
                fontSize: 12,
                color: "var(--color-content-muted)",
                textAlign: "right",
              }}
            >
              {session.result}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
