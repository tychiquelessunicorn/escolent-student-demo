"use client";

import {
  BeginningIllustration,
  GapIllustration,
  HeaderMark,
  OutlineIllustration,
  PathIllustration,
  ResumeIllustration,
  SparkIllustration,
} from "@/components/illustrations";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  InsetPanel,
  PageHeading,
  SectionLabel,
} from "@/components/ui";

/**
 * Direction board for the Phase 3 visual reset. Shared primitives only —
 * the five Student screens are left alone until this direction is signed off.
 */
export default function FoundationPage() {
  return (
    <main
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "48px 24px 96px",
      }}
    >
      <div style={{ marginBottom: 48 }} className="esc-rise">
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: 12,
          }}
        >
          Escolent · Visual foundation · Phase 3
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "var(--text-2xl)",
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            margin: "0 0 16px",
          }}
        >
          Bold, colourful, and alive — without turning into a game.
        </h1>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            color: "var(--color-content-secondary)",
            maxWidth: 560,
            margin: 0,
          }}
        >
          Outfit + Plus Jakarta Sans replace Crimson Pro / Geist. Brand blue is
          used with confidence. Four area accents mark Today / Learn / Practice
          / Progress. Motion is press and rise — not rewards.
        </p>
      </div>

      <section style={{ marginBottom: 56 }}>
        <SectionLabel area="practice">Type</SectionLabel>
        <Card>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "var(--text-2xl)",
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              marginBottom: 8,
            }}
          >
            Display · Outfit 800
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "var(--text-xl)",
              letterSpacing: "-0.03em",
              marginBottom: 8,
            }}
          >
            Page titles land harder
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "var(--text-lg)",
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}
          >
            Card titles stay loud
          </div>
          <CardBody>
            Body is Plus Jakarta Sans — clear at 15–16px, denser than Geist
            without going corporate. Headlines are geometric and confident, not
            editorial-serif adult.
          </CardBody>
        </Card>
      </section>

      <section style={{ marginBottom: 56 }}>
        <SectionLabel area="practice">Colour family</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {[
            ["Brand", "var(--color-accent)", "Practice / interactive"],
            ["Today", "var(--color-area-today)", "Schedule / time"],
            ["Learn", "var(--color-area-learn)", "Exploration"],
            ["Progress", "var(--color-area-progress)", "Growth over time"],
            ["Achievement", "var(--color-achievement)", "Two moments only"],
          ].map(([label, color, note]) => (
            <div
              key={label}
              className="esc-pop"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-shell)",
                padding: 14,
              }}
            >
              <div
                style={{
                  height: 56,
                  borderRadius: "var(--radius-control)",
                  background: color,
                  marginBottom: 10,
                }}
              />
              <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--color-content-muted)" }}>
                {note}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <Card area="today">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <HeaderMark area="today" />
              <CardTitle>Today</CardTitle>
            </div>
            <CardBody>Amber identity for what is due and when.</CardBody>
          </Card>
          <Card area="learn">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <HeaderMark area="learn" />
              <CardTitle>Learn</CardTitle>
            </div>
            <CardBody>Coral identity for the course map and skills.</CardBody>
          </Card>
          <Card area="practice">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <HeaderMark area="practice" />
              <CardTitle>Practice</CardTitle>
            </div>
            <CardBody>Brand blue — the active work surface.</CardBody>
          </Card>
          <Card area="progress">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <HeaderMark area="progress" />
              <CardTitle>Progress</CardTitle>
            </div>
            <CardBody>Teal identity for growth over time.</CardBody>
          </Card>
        </div>
      </section>

      <section style={{ marginBottom: 56 }}>
        <SectionLabel area="learn">Representative components</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <PageHeading
            area="today"
            title="Hi Mia"
            subtitle="Wed, Aug 19 · direction board, not the live Today screen"
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Button>Continue practice</Button>
            <Button variant="secondary">Ask a question</Button>
            <Button variant="ghost">Not now</Button>
          </div>

          <InsetPanel>
            Hint panels and ladder copy sit on a tinted brand field now — blue
            presence without shouting over the problem itself.
          </InsetPanel>

          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--color-achievement-subtle)",
                border: "1.5px solid var(--color-achievement-border)",
                borderRadius: "var(--radius-card)",
                padding: "16px 18px",
                marginBottom: 8,
              }}
            >
              <SparkIllustration />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 17,
                    color: "var(--color-achievement-heading)",
                  }}
                >
                  You just moved fractions into Durable.
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-achievement-body)",
                    marginTop: 2,
                  }}
                >
                  Achievement colour — only at the moment it happens.
                </div>
              </div>
            </div>
          </Card>

          <EmptyState
            area="today"
            illustration={<PathIllustration size={120} />}
            title="Nothing’s due right now."
            body="Empty states carry a full illustration and a loud title — not a muted line of grey text."
            action={<Button>Back to Learn</Button>}
          />

          <EmptyState
            area="learn"
            illustration={<OutlineIllustration size={120} />}
            title="This skill isn’t in the demo yet."
            body="Same geometric language, more colour, scaled up so it actually reads as part of the product."
          />
        </div>
      </section>

      <section style={{ marginBottom: 56 }}>
        <SectionLabel area="progress">Illustration set</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 16,
          }}
        >
          {[
            ["Path", <PathIllustration key="p" size={100} />],
            ["Beginning", <BeginningIllustration key="b" size={100} />],
            ["Resume", <ResumeIllustration key="r" size={100} />],
            ["Gap", <GapIllustration key="g" size={100} />],
            ["Outline", <OutlineIllustration key="o" size={100} />],
            ["Spark", <SparkIllustration key="s" />],
          ].map(([label, node]) => (
            <div
              key={String(label)}
              className="esc-pop"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-shell)",
                padding: 16,
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>{node}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Explicitly untouched</SectionLabel>
        <div
          role="status"
          style={{
            background: "var(--color-notice-bg)",
            border: "1px solid var(--color-notice-border)",
            borderRadius: "var(--radius-shell)",
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--color-notice-fg)",
            maxWidth: 480,
          }}
        >
          Your teacher has been notified and will follow up with you.
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-content-muted)",
            marginTop: 10,
            maxWidth: 480,
          }}
        >
          Distress notice tokens and presentation stay exactly as before — calm,
          no area accent, no motion class.
        </p>
      </section>
    </main>
  );
}
