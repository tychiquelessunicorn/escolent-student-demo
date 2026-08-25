"use client";

import type { ReactNode } from "react";
import { TIER_STYLE, type Skill } from "@/lib/demo-data";

/**
 * The expandable skill row shared by Learn and Progress. Both screens show the
 * same seven skills at the same tiers, so they share the row rather than each
 * rendering their own near-copy.
 */
export function SkillRow({
  skill,
  expanded,
  onToggle,
  showFlag = false,
  children,
}: {
  skill: Skill;
  expanded: boolean;
  onToggle: () => void;
  showFlag?: boolean;
  children: ReactNode;
}) {
  const tier = TIER_STYLE[skill.tier];

  return (
    <div
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-shell)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          width: "100%",
          background: "none",
          border: "none",
          textAlign: "left",
          fontFamily: "var(--font-body)",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: tier.dotBg,
            border: tier.dotBorder,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{skill.name}</div>
        {showFlag && skill.flagged ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.02em",
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--color-accent-subtle)",
              color: "var(--color-accent-strong)",
            }}
          >
            Prerequisite gap
          </span>
        ) : null}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 11px",
            borderRadius: 999,
            background: tier.badgeBg,
            color: tier.badgeColor,
          }}
        >
          {tier.label}
        </span>
        <div
          aria-hidden
          style={{
            fontSize: 13,
            color: "var(--color-content-muted)",
            width: 14,
            textAlign: "center",
          }}
        >
          {expanded ? "\u2304" : "\u203a"}
        </div>
      </button>
      {expanded ? children : null}
    </div>
  );
}
