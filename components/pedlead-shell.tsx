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
    label: "Content Authoring",
    href: "/pedlead/authoring",
    match: ["/pedlead/authoring", "/pedlead/content", "/pedlead"],
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
          className="esc-staff-rail"
          aria-label="Pedagogical Lead navigation"
        >
          <div style={{ marginBottom: 12, padding: "0 8px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-staff-muted)",
              }}
            >
              Curriculum & Mastery
            </div>
          </div>

          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.match);
            if (item.soon || !item.href) {
              return (
                <div
                  key={item.label}
                  className="esc-staff-nav-item esc-staff-nav-item-soon"
                  title="Coming soon"
                >
                  <span className="esc-staff-nav-label">{item.label}</span>
                  <span className="esc-badge-soon">Soon</span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  "esc-staff-nav-item",
                  "esc-pressable",
                  active ? "esc-staff-nav-item-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
                onClick={() => hapticTap()}
              >
                <span className="esc-staff-nav-label">{item.label}</span>
                {active ? <span className="esc-staff-nav-active-dot" aria-hidden /> : null}
              </Link>
            );
          })}

          <div
            style={{
              marginTop: "auto",
              padding: "16px 8px 8px 8px",
              borderTop: "1px solid var(--color-staff-border)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--color-staff-muted)",
                lineHeight: 1.4,
              }}
            >
              Cross-tenant skill & misconception authoring. Isolated from student mastery records.
            </div>
          </div>
        </nav>

        <main className="esc-shell-main esc-staff-main">{children}</main>
      </div>
    </div>
  );
}
