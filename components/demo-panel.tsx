"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SKILLS } from "@/lib/demo-data";

/**
 * Query params are the underlying mechanism — the same `?skill=` routing
 * Progress and the notification mockup already use, so any state stays
 * linkable. This panel exists because most of the built scenarios (first
 * exposure, offline, resume, rubric grading, direct-open auth) are otherwise
 * undiscoverable to anyone who doesn't already know the exact URL.
 *
 * It stays out of the DOM entirely unless deliberately opened: `?demo=1`, or
 * Ctrl/Cmd + Shift + E.
 */

interface Control {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}

const CONTROLS: Control[] = [
  {
    param: "entryVariant",
    label: "Entry",
    defaultValue: "first_exposure",
    options: [
      { value: "first_exposure", label: "First exposure (new skill)" },
      { value: "returning", label: "Returning" },
      { value: "first_time", label: "First time, no history" },
      { value: "nothing_due", label: "Nothing due" },
    ],
  },
  {
    param: "connectivityDemo",
    label: "Connectivity",
    defaultValue: "auto",
    options: [
      { value: "auto", label: "Auto (real state)" },
      { value: "fresh", label: "Fresh" },
      { value: "stale", label: "Stale" },
      { value: "syncing", label: "Syncing" },
      { value: "unavailable", label: "Offline" },
    ],
  },
  {
    param: "interruptionDemo",
    label: "Saved session",
    defaultValue: "none",
    options: [
      { value: "none", label: "None" },
      { value: "recent", label: "Recent (offer resume)" },
      { value: "expired", label: "Older than 24h" },
    ],
  },
  {
    param: "directOpenDemo",
    label: "Direct open",
    defaultValue: "not_applicable",
    options: [
      { value: "not_applicable", label: "Normal LMS launch" },
      { value: "valid_session", label: "Direct, valid session" },
      { value: "no_valid_session", label: "Direct, no session" },
    ],
  },
  {
    param: "problemDemo",
    label: "Problem type",
    defaultValue: "standard",
    options: [
      { value: "standard", label: "Standard (exact match)" },
      { value: "no_solution_rubric", label: "Rubric-graded" },
    ],
  },
  {
    param: "notificationPreviewDemo",
    label: "Review notification",
    defaultValue: "not_applicable",
    options: [
      { value: "not_applicable", label: "Hidden" },
      { value: "shown", label: "Show mockup" },
    ],
  },
  {
    param: "aiHintsEnabled",
    label: "AI hints",
    defaultValue: "true",
    options: [
      { value: "true", label: "Enabled" },
      { value: "false", label: "Disabled (static fallback)" },
    ],
  },
  {
    param: "skill",
    label: "Skill (?skill=)",
    defaultValue: "",
    options: [
      { value: "", label: "Not set" },
      ...SKILLS.map((skill) => ({ value: skill.slug, label: skill.name })),
    ],
  },
];

export function DemoPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("demo") === "1") setOpen(true);
  }, [params]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  const update = (param: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "") next.delete(param);
    else next.set(param, value);
    next.set("demo", "1");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const reset = () => router.replace(`${pathname}?demo=1`, { scroll: false });

  return (
    <aside
      style={{
        position: "fixed",
        right: 16,
        bottom: 72,
        zIndex: 50,
        width: 268,
        maxHeight: "70vh",
        overflowY: "auto",
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "0 8px 24px oklch(24% 0.014 55 / 0.18)",
        padding: 18,
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--color-content-muted)",
          }}
        >
          Demo controls
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            fontSize: 13,
            color: "var(--color-content-muted)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Close
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CONTROLS.map((control) => (
          <label key={control.param} style={{ display: "block" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4,
                color: "var(--color-content-secondary)",
              }}
            >
              {control.label}
            </div>
            <select
              value={params.get(control.param) ?? control.defaultValue}
              onChange={(event) => update(control.param, event.target.value)}
              style={{
                width: "100%",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                padding: "7px 10px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-content-primary)",
              }}
            >
              {control.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: 16,
          width: "100%",
          fontFamily: "var(--font-body)",
          fontSize: 13,
          fontWeight: 600,
          padding: "8px 12px",
          borderRadius: "var(--radius-control)",
          border: "1.5px solid var(--color-accent-subtle-border)",
          background: "transparent",
          color: "var(--color-accent)",
          cursor: "pointer",
        }}
      >
        Reset to defaults
      </button>

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          lineHeight: 1.5,
          color: "var(--color-content-muted)",
        }}
      >
        Entry, connectivity, saved-session and direct-open apply to Practice.
        Toggle this panel with Ctrl/Cmd + Shift + E.
      </div>
    </aside>
  );
}
