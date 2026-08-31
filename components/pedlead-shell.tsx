"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPrimaryPedLead } from "@/lib/demo-data/staff";
import { ShellExitLink } from "@/components/shell-exit-link";
import { EscolentLogoIcon } from "@/components/escolent-logo";
import { hapticTap } from "@/lib/haptics";

const NAV_ITEMS: {
  label: string;
  href?: string;
  match?: string[];
  soon?: boolean;
}[] = [
  {
    label: "Briefing",
    href: "/pedlead/briefing",
    match: ["/pedlead/briefing"],
  },
  {
    label: "Content Authoring",
    href: "/pedlead/authoring",
    match: ["/pedlead/authoring", "/pedlead/content"],
  },
];

function isActive(pathname: string, match: string[] | undefined) {
  if (!match) return false;
  return match.some((path) => {
    if (pathname === path) return true;
    const segments = path.split("/").filter(Boolean);
    if (segments.length < 2) return false;
    return pathname.startsWith(`${path}/`);
  });
}

export function PedleadShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pedLead = getPrimaryPedLead();

  return (
    <div className="esc-shell-root esc-staff-shell">
      <header className="esc-shell-header">
        <div className="esc-shell-header-brand">
          <EscolentLogoIcon size={22} />
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
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-content-secondary)",
              whiteSpace: "nowrap",
            }}
          >
            Pedagogical Lead · {pedLead.shortName}
          </span>
        </div>
        <div className="esc-shell-header-actions">
          <ShellExitLink variant="staff" />
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
            borderRight: "1.5px solid var(--color-staff-border)",
            background: "transparent",
            minHeight: "100vh",
            boxSizing: "border-box",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.match);
            if (item.soon || !item.href) {
              return (
                <div
                  key={item.label}
                  className="esc-teacher-nav-disabled"
                  aria-disabled="true"
                  title="Coming soon"
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      background: "var(--color-border)",
                      flexShrink: 0,
                    }}
                  />
                  {item.label}
                  <span className="esc-teacher-nav-badge">Soon</span>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="esc-pressable"
                onClick={() => hapticTap()}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: active ? 800 : 600,
                  letterSpacing: active ? "-0.02em" : "0",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-staff-control)",
                  textDecoration: "none",
                  background: active
                    ? "var(--color-staff-interactive-subtle)"
                    : "transparent",
                  color: active
                    ? "var(--color-staff-interactive)"
                    : "var(--color-staff-content-secondary)",
                  border: active
                    ? "1.5px solid var(--color-staff-interactive-border)"
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
                    background: active
                      ? "var(--color-staff-interactive)"
                      : "var(--color-staff-border)",
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="esc-shell-main">{children}</div>
      </div>

      <nav
        id="app-bottomnav"
        aria-label="Pedagogical Lead navigation"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "color-mix(in oklch, var(--color-staff-surface-raised) 92%, transparent)",
          backdropFilter: "blur(10px)",
          borderTop: "1.5px solid var(--color-staff-border)",
          zIndex: 10,
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          if (item.soon || !item.href) {
            return (
              <div
                key={item.label}
                className="esc-teacher-bottomnav-disabled"
                aria-disabled="true"
                title="Coming soon"
              >
                <span aria-hidden className="esc-teacher-bottomnav-dot" />
                {item.label}
              </div>
            );
          }
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="esc-pressable"
              onClick={() => hapticTap()}
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
                color: active
                  ? "var(--color-staff-interactive)"
                  : "var(--color-staff-content-muted)",
                background: active
                  ? "var(--color-staff-interactive-subtle)"
                  : "transparent",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 2,
                  background: active ? "var(--color-staff-interactive)" : "transparent",
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
