"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AskBox } from "@/components/ask-box";
import { PathIllustration } from "@/components/illustrations";
import { useShellState } from "@/components/shell-context";
import { SkillRow } from "@/components/skill-row";
import { SpaceSwitcher } from "@/components/space-switcher";
import { PageHeading, SectionLabel } from "@/components/ui";
import { TIER_STYLE } from "@/lib/demo-data";
import {
  isVariablesCompleted,
  resolveDemoSkill,
  subscribeDemoPersist,
} from "@/lib/demo-persistence";

export function LearnScreen() {
  const { currentSpace, setCurrentSpaceId } = useShellState();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toastId, setToastId] = useState<string | null>(null);
  const [mastered, setMastered] = useState(false);

  useEffect(() => {
    const refresh = () => setMastered(isVariablesCompleted());
    refresh();
    return subscribeDemoPersist(refresh);
  }, []);

  useEffect(() => {
    try {
      const space = new URLSearchParams(window.location.search).get("space");
      if (space) setCurrentSpaceId(space);
    } catch {
      /* ignore */
    }
  }, [setCurrentSpaceId]);

  // Reset expand state when switching Spaces so rows don't feel "stuck open".
  useEffect(() => {
    setExpanded({});
    setToastId(null);
  }, [currentSpace.id]);

  const skills = currentSpace.skills.map((skill) =>
    resolveDemoSkill(skill, mastered),
  );

  const openSource = (id: string) => {
    setToastId(id);
    setTimeout(() => setToastId((current) => (current === id ? null : current)), 1600);
  };

  return (
    <div className="esc-screen">
      <div className="esc-screen-top">
        <PageHeading
          area="learn"
          title="Learn"
          subtitle={<SpaceSwitcher area="learn" />}
        />
        <div className="esc-illust esc-illust-header">
          <PathIllustration size={88} style={{ marginBottom: 0 }} />
        </div>
      </div>

      <SectionLabel area="learn">Skills in this Space</SectionLabel>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}
      >
        {skills.map((skill) => (
          <SkillRow
            key={skill.id}
            skill={skill}
            area="learn"
            showOfflineBadge={skill.tier !== "not_attempted"}
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
              <div className="esc-lesson-beat">
                <div className="esc-lesson-label">Concept</div>
                <div className="esc-lesson-concept">{skill.lesson}</div>

                <div className="esc-lesson-label">Worked example</div>
                <div className="esc-worked-example">
                  <div className="esc-worked-prompt">{skill.workedExample.prompt}</div>
                  <ol className="esc-worked-steps">
                    {skill.workedExample.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>

                <Link
                  href={`/practice?skill=${skill.slug}`}
                  className="esc-btn-primary esc-pressable esc-lesson-practice"
                >
                  Practice this skill
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "var(--color-content-muted)" }}>
                  {skill.source}
                </div>
                <button
                  type="button"
                  onClick={() => openSource(skill.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-content-muted)",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  View original
                </button>
              </div>
              {toastId === skill.id ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-content-muted)",
                    marginTop: 6,
                  }}
                >
                  Opening source material…
                </div>
              ) : null}
            </div>
          </SkillRow>
        ))}
      </div>

      <AskBox
        task="learn_ask"
        surface="learn_ask"
        area="learn"
        spaceId={currentSpace.id}
        placeholder={`Ask about any skill… e.g. "${currentSpace.askExample}"`}
        loadingLabel="Thinking…"
      />
    </div>
  );
}
