"use client";

import { useState } from "react";
import { AskBox } from "@/components/ask-box";
import { SkillRow } from "@/components/skill-row";
import { PageHeading } from "@/components/ui";
import { SKILLS, STUDENT } from "@/lib/demo-data";

const wrapper = {
  maxWidth: "var(--container-focused)",
  margin: "0 auto",
  padding: "20px 24px 90px",
  minHeight: "100vh",
  boxSizing: "border-box" as const,
};

export function LearnScreen() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toastId, setToastId] = useState<string | null>(null);

  const openSource = (id: string) => {
    setToastId(id);
    setTimeout(() => setToastId((current) => (current === id ? null : current)), 1600);
  };

  return (
    <div style={wrapper}>
      <div style={{ marginBottom: 24 }}>
        <PageHeading title="Learn" subtitle={`${STUDENT.grade} · ${STUDENT.spaceName}`} />
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}
      >
        {SKILLS.map((skill) => (
          <SkillRow
            key={skill.id}
            skill={skill}
            expanded={Boolean(expanded[skill.id])}
            onToggle={() =>
              setExpanded((current) => ({
                ...current,
                [skill.id]: !current[skill.id],
              }))
            }
          >
            <div style={{ padding: "0 18px 18px 41px" }}>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "var(--color-content-primary)",
                  marginBottom: 14,
                }}
              >
                {skill.lesson}
              </div>
              {/*
                Requirement 32.2: synthesized content always shows what it was
                derived from, and the original stays reachable.
              */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

      {/*
        Two behaviours this ask box carries beyond answering: it says plainly
        when a question is outside this Space rather than inventing an answer
        (Requirement 32.5), and it redirects a request for a bare final answer
        back to the student's own reasoning instead of handing it over (32.7).
        Both live in the server-side prompt.
      */}
      <AskBox
        task="learn_ask"
        surface="learn_ask"
        placeholder={
          'Ask about any skill… e.g. "why do we flip the sign in inequalities"'
        }
        loadingLabel="Thinking…"
      />
    </div>
  );
}
