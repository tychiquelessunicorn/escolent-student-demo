"use client";

import Link from "next/link";

/**
 * Direction board for the Teacher visual foundation. Staff surfaces share the
 * Student type family for brand continuity but use a denser, quieter system —
 * cool neutrals, brand-blue interactive chrome, escalation red reserved for
 * distress status. No decorative illustration.
 *
 * Interactive/accent chroma is raised on this page only (foundation pass),
 * matching Student --color-accent* values as separate --color-staff-* tokens.
 */
export default function TeacherFoundationPage() {
  return (
    <main className="esc-staff-foundation">
      <div className="esc-staff-foundation-inner">
        <header className="esc-staff-foundation-header">
          <Link href="/" className="esc-staff-foundation-back">
            ← Demo entry
          </Link>
          <p className="esc-staff-foundation-kicker">Escolent · Teacher visual foundation</p>
          <h1 className="esc-staff-foundation-title">
            Dense and functional — neutrals for structure, brand blue for action.
          </h1>
          <p className="esc-staff-foundation-lede">
            Outfit and Plus Jakarta Sans stay for brand continuity, but headings run smaller
            and lighter than Student. Surfaces stay cool neutrals. Interactive chrome uses the
            same brand-blue chroma as Student (separate staff tokens, not aliases). Escalation
            red remains reserved for distress — not a general accent. No area rainbow, no
            achievement bursts, no illustration set.
          </p>
        </header>

        <section className="esc-staff-foundation-section">
          <h2 className="esc-staff-section-label">Type</h2>
          <div className="esc-staff-panel">
            <p className="esc-staff-display-xl">Display · Outfit 700 · 20px</p>
            <p className="esc-staff-display-lg">Page title · 17px</p>
            <p className="esc-staff-display-md">Section title · 15px</p>
            <p className="esc-staff-body">
              Body at 14px with 1.45 line height — tighter than Student&apos;s 15–16px
              marketing rhythm. Labels are 11px uppercase with wider tracking; metadata sits at
              13px in secondary colour.
            </p>
          </div>
        </section>

        <section className="esc-staff-foundation-section">
          <h2 className="esc-staff-section-label">Colour</h2>
          <div className="esc-staff-swatches">
            {[
              ["Surface", "var(--color-staff-surface)", "Page ground"],
              ["Raised", "var(--color-staff-surface-raised)", "Cards, rows"],
              ["Border", "var(--color-staff-border)", "Structure only"],
              ["Primary text", "var(--color-staff-content-primary)", "Headings, values"],
              ["Secondary", "var(--color-staff-content-secondary)", "Metadata"],
            ].map(([label, color, note]) => (
              <div key={label} className="esc-staff-swatch">
                <div className="esc-staff-swatch-chip" style={{ background: color }} />
                <div className="esc-staff-swatch-label">{label}</div>
                <div className="esc-staff-swatch-note">{note}</div>
              </div>
            ))}
          </div>

          <p className="esc-staff-section-label" style={{ marginTop: 20, marginBottom: 12 }}>
            Interactive · brand blue
          </p>
          <div className="esc-staff-swatches">
            {[
              ["Interactive", "var(--color-staff-interactive)", "Primary actions, links"],
              ["Hover", "var(--color-staff-interactive-hover)", "Pressed / hover fill"],
              ["Subtle", "var(--color-staff-interactive-subtle)", "Selected / tinted rows"],
              ["Border", "var(--color-staff-interactive-border)", "Focus, active outline"],
            ].map(([label, color, note]) => (
              <div key={label} className="esc-staff-swatch">
                <div className="esc-staff-swatch-chip" style={{ background: color }} />
                <div className="esc-staff-swatch-label">{label}</div>
                <div className="esc-staff-swatch-note">{note}</div>
              </div>
            ))}
          </div>

          <div className="esc-staff-panel esc-staff-panel-semantic">
            <p className="esc-staff-section-label" style={{ marginBottom: 8 }}>
              Semantic only · escalation red unchanged
            </p>
            <div className="esc-escalation-row esc-escalation-row-urgent" style={{ pointerEvents: "none" }}>
              <div className="esc-escalation-row-title">Escalation · needs acknowledgment</div>
              <div className="esc-escalation-row-meta">
                Escalation red appears on unacknowledged distress records — nowhere else in
                general chrome.
              </div>
            </div>
          </div>
        </section>

        <section className="esc-staff-foundation-section">
          <h2 className="esc-staff-section-label">Representative components</h2>
          <p className="esc-staff-body" style={{ marginBottom: 14 }}>
            Same staff components as production screens — primary button, secondary, links, and
            selected chrome should read as blue on this page only until the tokens propagate.
          </p>
          <div className="esc-staff-stack">
            <div className="esc-staff-panel">
              <div className="esc-staff-page-heading">
                <h3>Escalations</h3>
                <p>Student distress signals — same records the Student shell creates.</p>
              </div>
            </div>

            <div className="esc-staff-toolbar">
              <button type="button" className="esc-staff-btn esc-staff-btn-primary">
                Mark as acknowledged
              </button>
              <button type="button" className="esc-staff-btn esc-staff-btn-secondary">
                Back to list
              </button>
            </div>

            <div className="esc-staff-data-row">
              <div>
                <div className="esc-staff-data-primary">Mia Ndlovu</div>
                <div className="esc-staff-data-meta">24 min ago · Chose to ask directly</div>
              </div>
              <span className="esc-staff-status esc-staff-status-urgent">Needs acknowledgment</span>
            </div>

            <div className="esc-staff-data-row esc-staff-data-row-settled">
              <div>
                <div className="esc-staff-data-primary">Mia Ndlovu</div>
                <div className="esc-staff-data-meta">2 days ago · Detected automatically</div>
              </div>
              <span className="esc-staff-status">Acknowledged by Ms. Mokoena</span>
            </div>

            <div className="esc-staff-field-grid">
              <div>
                <div className="esc-staff-field-label">How the student reached out</div>
                <div className="esc-staff-field-value">Chose to ask directly</div>
              </div>
              <div>
                <div className="esc-staff-field-label">Where</div>
                <div className="esc-staff-field-value">Today ask box</div>
              </div>
            </div>

            <div className="esc-staff-panel">
              <p className="esc-staff-body" style={{ marginBottom: 12 }}>
                Link and selected-row treatments using the same interactive tokens:
              </p>
              <Link href="/teacher/foundation" className="esc-staff-foundation-back" style={{ marginBottom: 14 }}>
                Sample text link
              </Link>
              <div
                className="esc-staff-data-row"
                style={{
                  borderColor: "var(--color-staff-interactive-border)",
                  background: "var(--color-staff-interactive-subtle)",
                }}
              >
                <div>
                  <div className="esc-staff-data-primary">Selected row chrome</div>
                  <div className="esc-staff-data-meta">Subtle fill + interactive border</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="esc-staff-foundation-section">
          <h2 className="esc-staff-section-label">Motion</h2>
          <div className="esc-staff-panel">
            <p className="esc-staff-body">
              No entrance pop, rise, or phase animations on staff surfaces. Hover and focus use
              short border/colour transitions only — functional feedback, not delight. Press
              scale stays disabled on dense rows.
            </p>
            <button type="button" className="esc-staff-btn esc-staff-btn-secondary esc-staff-motion-demo">
              Hover for border shift only
            </button>
          </div>
        </section>

        <section className="esc-staff-foundation-section">
          <h2 className="esc-staff-section-label">Explicitly absent</h2>
          <ul className="esc-staff-absent-list">
            <li>Student area accents (Today amber, Learn coral, Progress teal)</li>
            <li>Achievement colour and mastery celebration UI</li>
            <li>Decorative illustration set</li>
            <li>Large 800-weight display headlines and playful empty states</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
