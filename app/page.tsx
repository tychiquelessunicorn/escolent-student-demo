import Link from "next/link";

const SHELLS: {
  label: string;
  description: string;
  href?: string;
  soon?: boolean;
}[] = [
  {
    label: "Student",
    description: "Today, Learn, Practice, and Progress — the adaptive learning shell.",
    href: "/student/today",
  },
  {
    label: "Teacher",
    description: "Escalations, briefing, and class oversight for staff.",
    href: "/teacher/escalations",
  },
  {
    label: "Admin",
    description: "School configuration, roster, and platform settings.",
    soon: true,
  },
  {
    label: "Pedagogical Lead",
    description: "Curriculum lens, skill graph, and instructional quality.",
    soon: true,
  },
];

export const metadata = { title: "Escolent Demo" };

export default function HomePage() {
  return (
    <main className="esc-landing">
      <div className="esc-landing-inner">
        <header className="esc-landing-header">
          <div className="esc-landing-brand">
            <span className="esc-landing-mark" aria-hidden />
            <span className="esc-landing-wordmark">Escolent</span>
          </div>
          <p className="esc-landing-lede">
            Investor demo — pick a shell to enter. Deep links such as{" "}
            <code className="esc-landing-code">?tour=1</code> and{" "}
            <code className="esc-landing-code">?demo=1</code> still work on their routes; this
            page is an optional front door.
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
              <Link key={shell.href} href={shell.href} className="esc-landing-card esc-pressable">
                <div className="esc-landing-card-top">
                  <h2 className="esc-landing-card-title">{shell.label}</h2>
                  <span className="esc-landing-enter">Enter</span>
                </div>
                <p className="esc-landing-card-body">{shell.description}</p>
              </Link>
            ),
          )}
        </div>

        <footer className="esc-landing-footer">
          <Link href="/foundation" className="esc-landing-footer-link">
            Student visual foundation
          </Link>
          <span aria-hidden>·</span>
          <Link href="/teacher/foundation" className="esc-landing-footer-link">
            Teacher visual foundation
          </Link>
        </footer>
      </div>
    </main>
  );
}
