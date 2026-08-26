"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectivityGlyph } from "@/components/connectivity-indicator";
import { DistressNotice, useDistress } from "@/components/distress-provider";
import { useShellState } from "@/components/shell-context";
import { useTour } from "@/components/tour-provider";
import { CONNECTIVITY_LABELS } from "@/lib/demo-data";
import { HELP_REASON_LABELS, type HelpReasonLabel } from "@/lib/distress";
import { STUDENT_PRACTICE_PATH } from "@/lib/routes";
import { hapticTap } from "@/lib/haptics";
import type { AreaTone } from "@/components/ui";

const NAV_ITEMS: {
  label: string;
  href: string;
  match: string[];
  area: AreaTone;
}[] = [
  {
    label: "Today",
    href: "/student/today",
    match: ["/student/today", "/student/week"],
    area: "today",
  },
  { label: "Learn", href: "/student/learn", match: ["/student/learn"], area: "learn" },
  { label: "Practice", href: STUDENT_PRACTICE_PATH, match: [STUDENT_PRACTICE_PATH], area: "practice" },
  {
    label: "Progress",
    href: "/student/progress",
    match: ["/student/progress"],
    area: "progress",
  },
];

const AREA_ACTIVE: Record<
  AreaTone,
  { bg: string; fg: string; border: string; solid: string }
> = {
  today: {
    bg: "var(--color-area-today-subtle)",
    fg: "var(--color-area-today-fg)",
    border: "var(--color-area-today-border)",
    solid: "var(--color-area-today)",
  },
  learn: {
    bg: "var(--color-area-learn-subtle)",
    fg: "var(--color-area-learn-fg)",
    border: "var(--color-area-learn-border)",
    solid: "var(--color-area-learn)",
  },
  practice: {
    bg: "var(--color-area-practice-subtle)",
    fg: "var(--color-area-practice-fg)",
    border: "var(--color-area-practice-border)",
    solid: "var(--color-area-practice)",
  },
  progress: {
    bg: "var(--color-area-progress-subtle)",
    fg: "var(--color-area-progress-fg)",
    border: "var(--color-area-progress-border)",
    solid: "var(--color-area-progress)",
  },
};

function isActive(pathname: string, match: string[]) {
  return match.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function activeArea(pathname: string): AreaTone {
  const hit = NAV_ITEMS.find((item) => isActive(pathname, item.match));
  return hit?.area ?? "practice";
}

/**
 * Always-available student-initiated help (Requirement 18.6). Lives in the
 * shell so it is on every Student screen. On Practice the control is the hint
 * drawer; everywhere else one "I need help" button opens five reasons — picking
 * one IS sending, with no confirmation step and no free-text field.
 */
function HelpControls() {
  const { requestHelp } = useDistress();
  const { openPracticeHelp } = useShellState();
  const { stage } = useTour();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const onPractice =
    pathname.startsWith(STUDENT_PRACTICE_PATH) && !stage?.helpButtonEscalates;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        closeMenu();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const helpButtonStyle = {
    fontFamily: "var(--font-body)",
    fontSize: 12,
    fontWeight: 700,
    padding: "8px 16px",
    borderRadius: "var(--radius-control)",
    border: "1.5px solid var(--color-accent-subtle-border)",
    background: "var(--color-accent-subtle)",
    color: "var(--color-accent-strong)",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

  if (onPractice) {
    return (
      <button
        type="button"
        className="esc-pressable"
        data-tour="help-button"
        onClick={() => {
          hapticTap();
          openPracticeHelp();
        }}
        style={helpButtonStyle}
      >
        Need a hint?
      </button>
    );
  }

  const sendReason = (label: HelpReasonLabel) => {
    hapticTap();
    closeMenu();
    requestHelp(label);
  };

  return (
    <div className="esc-help-menu" ref={menuRef}>
      <button
        type="button"
        className="esc-help-trigger esc-pressable"
        data-tour="help-button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="esc-help-menu-panel"
        onClick={() => {
          hapticTap();
          setMenuOpen((open) => !open);
        }}
        style={helpButtonStyle}
      >
        I need help
      </button>
      {menuOpen ? (
        <div
          id="esc-help-menu-panel"
          className="esc-help-menu-panel"
          role="menu"
          aria-label="Tell your teacher you need help"
        >
          {HELP_REASON_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="esc-help-menu-option esc-pressable"
              onClick={() => sendReason(label)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connectivity, headerNote, demoOffline, toggleDemoOffline } =
    useShellState();
  const area = activeArea(pathname);
  const tone = AREA_ACTIVE[area];
  const headerBorder = `1.5px solid color-mix(in oklch, ${tone.border} 55%, transparent)`;
  // Trust shell connectivity (practice harness can override the offline toggle).
  const offlineDisplay = connectivity === "unavailable";
  const connectivityLabel = offlineDisplay
    ? demoOffline
      ? "Offline - Edge Saved"
      : CONNECTIVITY_LABELS.unavailable
    : CONNECTIVITY_LABELS[connectivity];
  const connectivityColor = offlineDisplay
    ? "oklch(52% 0.14 18)"
    : "var(--color-content-secondary)";

  return (
    <div className="esc-shell-root">
      <header className="esc-shell-header" style={{ borderBottom: headerBorder }}>
        <div className="esc-shell-header-brand">
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: tone.solid,
              boxShadow: `0 0 0 4px color-mix(in oklch, ${tone.solid} 22%, transparent)`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: "-0.03em",
              color: "var(--color-content-primary)",
              whiteSpace: "nowrap",
            }}
          >
            Escolent
          </span>
          <div
            aria-hidden
            style={{
              width: 1.5,
              height: 16,
              background: "var(--color-border)",
              opacity: 0.7,
              flexShrink: 0,
            }}
          />
          <button
            type="button"
            className="esc-conn-toggle esc-pressable"
            data-tour="connectivity"
            title="Toggle offline demo"
            onClick={() => {
              hapticTap();
              toggleDemoOffline();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <ConnectivityGlyph
              state={connectivity}
              demoOffline={offlineDisplay && demoOffline}
            />
            <span
              className="esc-shell-connectivity-label"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: connectivityColor,
                whiteSpace: "nowrap",
              }}
            >
              {connectivityLabel}
            </span>
          </button>
        </div>

        <div className="esc-shell-header-actions">
          <HelpControls />
          {headerNote ? (
            <span
              className="esc-shell-header-note"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-content-secondary)",
              }}
            >
              {headerNote}
            </span>
          ) : null}
        </div>
      </header>

      <div className="esc-shell-layout">
        <nav
          id="app-rail"
          style={{
            flexDirection: "column",
            width: 250,
            flexShrink: 0,
            padding: "20px 16px",
            gap: 6,
            borderRight: "1.5px solid var(--color-border)",
            background: "transparent",
            minHeight: "100vh",
            boxSizing: "border-box",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.match);
            const itemTone = AREA_ACTIVE[item.area];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="esc-pressable"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: active ? 800 : 600,
                  letterSpacing: active ? "-0.02em" : "0",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-control)",
                  textDecoration: "none",
                  background: active ? itemTone.bg : "transparent",
                  color: active ? itemTone.fg : "var(--color-content-secondary)",
                  border: active
                    ? `1.5px solid ${itemTone.border}`
                    : "1.5px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 3,
                    background: active ? itemTone.solid : "var(--color-border)",
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="esc-shell-main">
          <div className="esc-shell-inset">
            <DistressNotice />
          </div>
          {children}
        </div>
      </div>

      <nav
        id="app-bottomnav"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "color-mix(in oklch, var(--color-surface-raised) 92%, transparent)",
          backdropFilter: "blur(10px)",
          borderTop: "1.5px solid var(--color-border)",
          zIndex: 10,
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.match);
          const itemTone = AREA_ACTIVE[item.area];
          return (
            <Link
              key={item.href}
              href={item.href}
              className="esc-pressable"
              style={{
                flex: 1,
                height: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                textDecoration: "none",
                fontFamily: "var(--font-display)",
                fontSize: 11,
                fontWeight: active ? 800 : 600,
                letterSpacing: "-0.01em",
                color: active ? itemTone.fg : "var(--color-content-muted)",
                background: active ? itemTone.bg : "transparent",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 2,
                  background: active ? itemTone.solid : "transparent",
                }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
