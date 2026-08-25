"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AskBox } from "@/components/ask-box";
import { BeginningIllustration } from "@/components/illustrations";
import { SkillRow } from "@/components/skill-row";
import { PageHeading, SectionLabel, Card, CardBody, CardTitle } from "@/components/ui";
import {
  NEXT_REVIEW,
  RECENT_SESSIONS,
  SKILLS,
  STUDENT,
  TIER_STYLE,
  type MasteryTier,
  type Skill,
} from "@/lib/demo-data";
import { isVariablesCompleted } from "@/lib/demo-persistence";

function resolveSkill(skill: Skill, mastered: boolean): Skill {
  if (skill.id === "s5" && mastered) {
    return {
      ...skill,
      tier: "durable" as MasteryTier,
      progressDetail: "Just clicked — this one is sticking now.",
    };
  }
  return skill;
}

export function ProgressScreen() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mastered, setMastered] = useState(false);

  useEffect(() => {
    const refresh = () => setMastered(isVariablesCompleted());
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const skills = SKILLS.map((skill) => resolveSkill(skill, mastered));

  return (
    <div className="esc-screen">
      <div className="esc-screen-top">
        <PageHeading
          area="progress"
          title="My progress"
          subtitle={`${STUDENT.grade} · ${STUDENT.spaceName}`}
        />
        <div className="esc-illust esc-illust-header">
          <BeginningIllustration size={88} style={{ marginBottom: 0 }} />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <AskBox
          task="progress_ask"
          surface="progress_ask"
          area="progress"
          placeholder={'Ask about your progress… e.g. "how am I doing on fractions"'}
          loadingLabel="Checking your progress…"
        />
      </div>

      <Card area="progress" style={{ padding: "24px 28px", marginBottom: 36 }}>
        <SectionLabel area="progress" style={{ marginBottom: 10 }}>
          Next review
        </SectionLabel>
        <CardTitle style={{ fontSize: 19, marginBottom: 6 }}>
          {NEXT_REVIEW.skillName}, {NEXT_REVIEW.whenLabel}
        </CardTitle>
        <CardBody style={{ fontSize: 14 }}>{NEXT_REVIEW.note}</CardBody>
      </Card>

      <SectionLabel area="progress">Skill progression</SectionLabel>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 36 }}
      >
        {skills.map((skill) => (
          <SkillRow
            key={skill.id}
            skill={skill}
            area="progress"
            showFlag
            badgeLabel={
              skill.id === "s5" && mastered
                ? "Durable (85%)"
                : TIER_STYLE[skill.tier].label
            }
            expanded={Boolean(expanded[skill.id])}
            onToggle={() =>
              setExpanded((current) => ({
                ...current,
                [skill.id]: !current[skill.id],
              }))
            }
          >
            <div className="esc-skill-expanded">
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
              <Link
                href={`/practice?skill=${skill.slug}`}
                className="esc-pressable"
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-control)",
                  border: "1.5px solid var(--color-area-progress-border)",
                  background: "var(--color-area-progress-subtle)",
                  color: "var(--color-area-progress-fg)",
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
          border: "1.5px solid var(--color-area-progress-border)",
          borderRadius: "var(--radius-shell)",
          overflow: "hidden",
          background: "var(--color-area-progress-subtle)",
        }}
      >
        {RECENT_SESSIONS.map((session, index) => (
          <div
            key={`${session.date}-${session.title}`}
            className="esc-recent-session-row"
            style={{
              padding: "12px 18px",
              borderBottom:
                index === RECENT_SESSIONS.length - 1
                  ? "none"
                  : "1px solid var(--color-area-progress-border)",
            }}
          >
            <div
              className="esc-recent-session-date"
              style={{
                fontSize: 12,
                color: "var(--color-content-muted)",
              }}
            >
              {session.date}
            </div>
            <div style={{ flex: 1, fontSize: 14, minWidth: 0 }}>{session.title}</div>
            <div
              className="esc-recent-session-result"
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
