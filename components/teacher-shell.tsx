"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPrimaryTeacher } from "@/lib/demo-data/staff";

const NAV_ITEMS: {
  label: string;
  href?: string;
  match?: string[];
  soon?: boolean;
}[] = [
  { label: "Briefing", soon: true },
  { label: "Today", soon: true },
  { label: "Overview", soon: true },
  {
    label: "Escalations",
    href: "/teacher/escalations",
    match: ["/teacher/escalations"],
  },
];

function isActive(pathname: string, match: string[] | undefined) {
  if (!match) return false;
  return match.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function TeacherShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const teacher = getPrimaryTeacher();

  return (
    <div className="esc-shell-root esc-staff-shell">
      <header className="esc-shell-header">
        <div className="esc-shell-header-brand">
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: "var(--color-escalation)",
              boxShadow:
                "0 0 0 4px color-mix(in oklch, var(--color-escalation) 22%, transparent)",
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
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-content-secondary)",
              whiteSpace: "nowrap",
            }}
          >
            Teacher · {teacher.shortName}
          </span>
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
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: active ? 800 : 600,
                  letterSpacing: active ? "-0.02em" : "0",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-control)",
                  textDecoration: "none",
                  background: active ? "var(--color-escalation-subtle)" : "transparent",
                  color: active ? "var(--color-escalation-fg)" : "var(--color-content-secondary)",
                  border: active
                    ? "1.5px solid var(--color-escalation-border)"
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
                    background: active ? "var(--color-escalation)" : "var(--color-border)",
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
    </div>
  );
}
