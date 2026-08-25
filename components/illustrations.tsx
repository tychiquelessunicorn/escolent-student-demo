/**
 * Abstract, geometric illustration set.
 *
 * Every motif is drawn from the learning process itself — a path, something
 * clicking into place, a spark, a gap in a path. None of them reference any
 * subject's content, so they hold up identically if the pilot subject were
 * history or biology rather than math. A previous proposal used a balance-scale
 * motif; that was subject-specific and was rejected for exactly this reason.
 *
 * Flat circles and strokes only, matching the two illustrations already in the
 * prototype rather than introducing a second visual language. All colours come
 * from tokens, and all of these are decorative — the surrounding copy always
 * carries the meaning.
 */

type Props = { className?: string; style?: React.CSSProperties };

const base: React.CSSProperties = { marginBottom: 16 };

/** A path arriving somewhere — used for the nothing-due gate. */
export function PathIllustration({ style }: Props) {
  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="8" cy="36" r="4" fill="oklch(88% 0.014 55)" />
      <circle cx="24" cy="26" r="5" fill="oklch(82% 0.020 55)" />
      <circle cx="42" cy="20" r="6" fill="oklch(75% 0.030 55)" />
      <circle cx="58" cy="14" r="8" fill="var(--color-accent-subtle)" />
      <circle cx="58" cy="14" r="3.5" fill="var(--color-accent)" />
    </svg>
  );
}

/** A path just beginning — first-time entry, no history behind it. */
export function BeginningIllustration({ style }: Props) {
  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="8" cy="32" r="7" fill="var(--color-accent-subtle)" />
      <circle cx="8" cy="32" r="3.5" fill="var(--color-accent)" />
      <circle cx="26" cy="28" r="4" fill="oklch(88% 0.014 55)" />
      <circle cx="42" cy="24" r="4" fill="oklch(90% 0.012 55)" />
      <circle cx="57" cy="20" r="4" fill="oklch(93% 0.008 55)" />
    </svg>
  );
}

/** A path picked up partway along — the resume prompt. */
export function ResumeIllustration({ style }: Props) {
  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="8" cy="34" r="4" fill="oklch(88% 0.014 55)" />
      <circle cx="24" cy="30" r="4" fill="oklch(88% 0.014 55)" />
      <circle cx="40" cy="26" r="7" fill="var(--color-accent-subtle)" />
      <circle cx="40" cy="26" r="3.5" fill="var(--color-accent)" />
      <circle
        cx="58"
        cy="20"
        r="4"
        fill="none"
        stroke="oklch(88% 0.014 55)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** A path with a gap in it — offline, waiting to reconnect. */
export function GapIllustration({ style }: Props) {
  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="8" cy="32" r="4" fill="oklch(88% 0.014 55)" />
      <circle cx="24" cy="28" r="4" fill="oklch(88% 0.014 55)" />
      <line
        x1="34"
        y1="26"
        x2="46"
        y2="22"
        stroke="oklch(88% 0.014 55)"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <circle
        cx="56"
        cy="19"
        r="4"
        fill="none"
        stroke="oklch(88% 0.014 55)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** An outline where a step would be — content that isn't here yet. */
export function OutlineIllustration({ style }: Props) {
  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="16" cy="28" r="4" fill="oklch(90% 0.012 55)" />
      <circle
        cx="34"
        cy="24"
        r="8"
        fill="none"
        stroke="oklch(88% 0.014 55)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle cx="54" cy="20" r="4" fill="oklch(93% 0.008 55)" />
    </svg>
  );
}

/**
 * The spark. Scoped to the two achievement moments and nowhere else — crossing
 * a mastery tier, and a first-exposure skill clicking into place.
 */
export function SparkIllustration({ style }: Props) {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 40 40"
      fill="none"
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="7" fill="var(--color-achievement)" />
      <line x1="20" y1="20" x2="20" y2="4" stroke="oklch(70% 0.13 215)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="20" x2="33" y2="12" stroke="oklch(70% 0.13 215)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="20" x2="34" y2="28" stroke="oklch(70% 0.13 215)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="20" x2="22" y2="35" stroke="oklch(70% 0.13 215)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="20" x2="6" y2="30" stroke="oklch(70% 0.13 215)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
