"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectivityGlyph } from "@/components/connectivity-indicator";
import { DistressNotice, useDistress } from "@/components/distress-provider";
import { useShellState } from "@/components/shell-context";
import { CONNECTIVITY_LABELS } from "@/lib/demo-data";

const NAV_ITEMS = [
  { label: "Today", href: "/student/today", match: ["/student/today", "/student/week"] },
  { label: "Learn", href: "/student/learn", match: ["/student/learn"] },
  { label: "Practice", href: "/practice", match: ["/practice"] },
  { label: "Progress", href: "/student/progress", match: ["/student/progress"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * The always-available help button (Requirement 18.6). It lives here, in the
 * shell, so it is present on every Student screen rather than only on Practice
 * Session. Zero friction by design: one tap, no confirmation step, no form.
 */
function HelpButton({ minimal }: { minimal: boolean }) {
  const { requestHelp } = useDistress();

  return (
    <button
      type="button"
      onClick={requestHelp}
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 12,
        fontWeight: 600,
        padding: minimal ? "6px 12px" : "7px 14px",
        borderRadius: 999,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface-raised)",
        color: "var(--color-content-secondary)",
        cursor: "pointer",
      }}
    >
      I need help
    </button>
  );
}

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connectivity, headerNote } = useShellState();

  /**
   * During active practice the chrome drops to minimal weight — smaller, lower
   * contrast, no divider — rather than disappearing. Quiet and available, never
   * competing with the problem itself.
   */
  const minimal = pathname === "/practice";

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: minimal ? "10px 24px" : "14px 24px",
          background: minimal ? "transparent" : "var(--color-surface-raised)",
          borderBottom: minimal ? "none" : "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: minimal ? 14 : 17,
              color: minimal
                ? "var(--color-content-muted)"
                : "var(--color-content-primary)",
            }}
          >
            Escolent
          </span>
          <div
            style={{
              width: 1,
              height: minimal ? 12 : 14,
              background: minimal
                ? "var(--color-border-subtle)"
                : "var(--color-border)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ConnectivityGlyph state={connectivity} />
            <span style={{ fontSize: 12, color: "var(--color-content-muted)" }}>
              {CONNECTIVITY_LABELS[connectivity]}
            </span>
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <HelpButton minimal={minimal} />
          {headerNote ? (
            <span style={{ fontSize: 12, color: "var(--color-content-muted)" }}>
              {headerNote}
            </span>
          ) : null}
        </div>
      </header>

      <div style={{ display: "flex" }}>
        <nav
          id="app-rail"
          style={{
            flexDirection: "column",
            width: 250,
            flexShrink: 0,
            padding: "24px 16px",
            gap: 4,
            borderRight: "1px solid var(--color-border)",
            background: "var(--color-surface-raised)",
            minHeight: "100vh",
            boxSizing: "border-box",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "12px 16px",
                  borderRadius: "var(--radius-control)",
                  textDecoration: "none",
                  background: active ? "var(--color-accent-subtle)" : "transparent",
                  color: active
                    ? "var(--color-accent)"
                    : "var(--color-content-secondary)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              maxWidth: "var(--container-focused)",
              margin: "0 auto",
              padding: "0 24px",
            }}
          >
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
          background: "var(--color-surface-raised)",
          borderTop: "1px solid var(--color-border)",
          zIndex: 10,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                height: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                textDecoration: "none",
                fontFamily: "var(--font-body)",
                fontSize: 12,
                fontWeight: active ? 700 : 600,
                color: active
                  ? "var(--color-accent)"
                  : "var(--color-content-muted)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
