import Link from "next/link";
import { EscolentLogoIcon } from "@/components/escolent-logo";
import { TourReset } from "@/components/tour-reset";

const SHELLS: {
  label: string;
  description: string;
  href?: string;
  tourHref?: string;
  soon?: boolean;
}[] = [
  {
    label: "Student",
    description: "Today, Learn, Practice, and Progress — the adaptive learning shell.",
    href: "/student/today",
    tourHref: "/student/today?tour=1",
  },
  {
    label: "Teacher",
    description: "Escalations, briefing, and class oversight for staff.",
    href: "/teacher/briefing",
    tourHref: "/teacher/briefing?tour=1",
  },
  {
    label: "Admin",
    description: "School configuration, roster, and platform settings.",
    href: "/admin/briefing",
    tourHref: "/admin/briefing?tour=1",
  },
  {
    label: "Pedagogical Lead",
    description: "Curriculum synthesis, skill validation, and cross-school misconception intelligence.",
    href: "/pedlead/briefing",
    tourHref: "/pedlead/briefing?tour=1",
  },
];

export const metadata = { title: "Escolent Demo" };

export default function HomePage() {
  return (
    <main className="esc-landing">
      <TourReset />
      <div className="esc-landing-backdrop" aria-hidden />
      <div className="esc-landing-inner">
        <header className="esc-landing-header">
          <div className="esc-landing-pill">
            <span className="esc-landing-pill-dot" />
            Interactive Demo Environment
          </div>
          <div className="esc-landing-brand">
            <EscolentLogoIcon size={34} />
            <span className="esc-landing-wordmark">Escolent</span>
          </div>
          <p className="esc-landing-lede">
            Escolent is an adaptive learning platform for schools — one system where students
            learn, teachers respond, and leaders oversee progress from the same mastery data. The
            product is organized into four shells; choose one to explore.
          </p>
        </header>

        <div className="esc-landing-grid">
          {SHELLS.map((shell) =>
            shell.soon || !shell.href ? (
              <div
                key={shell.label}
                className="esc-landing-card esc-landing-card-disabled"
                aria-disabled="true"
                title="Coming soon"
              >
                <div className="esc-landing-card-top">
                  <h2 className="esc-landing-card-title">{shell.label}</h2>
                  <span className="esc-landing-soon">Soon</span>
                </div>
                <p className="esc-landing-card-body">{shell.description}</p>
              </div>
            ) : (
              <div key={shell.href} className="esc-landing-card">
                <div className="esc-landing-card-top">
                  <h2 className="esc-landing-card-title">{shell.label}</h2>
                </div>
                <p className="esc-landing-card-body">{shell.description}</p>
                <div className="esc-landing-card-actions">
                  <Link href={shell.href} className="esc-landing-enter esc-pressable">
                    Enter
                    <span aria-hidden>→</span>
                  </Link>
                  {shell.tourHref ? (
                    <Link href={shell.tourHref} className="esc-landing-tour esc-pressable">
                      Guided tour
                    </Link>
                  ) : null}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
