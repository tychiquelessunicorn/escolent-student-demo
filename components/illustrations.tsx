/**
 * Abstract, geometric illustration set.
 *
 * Every motif is drawn from the learning process itself — a path, something
 * clicking into place, a spark, a gap in a path. None of them reference any
 * subject's content, so they hold up identically if the pilot subject were
 * history or biology rather than math.
 *
 * Phase 3: larger, multi-colour, and meant to show up in empty states and
 * section headers — not only as tiny mute accents. Still flat geometry only;
 * no characters, mascots, or subject-specific objects.
 */

type Props = { className?: string; style?: React.CSSProperties; size?: number };

const base: React.CSSProperties = { marginBottom: 16, flexShrink: 0 };

/** A path arriving somewhere — used for the nothing-due gate. */
export function PathIllustration({ style, size = 64 }: Props) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="8" cy="36" r="5" fill="var(--color-area-today)" opacity="0.35" />
      <circle cx="24" cy="26" r="6" fill="var(--color-area-learn)" opacity="0.55" />
      <circle cx="42" cy="20" r="7" fill="var(--color-area-progress)" opacity="0.7" />
      <circle cx="58" cy="14" r="10" fill="var(--color-accent-subtle)" />
      <circle cx="58" cy="14" r="4.5" fill="var(--color-accent)" />
    </svg>
  );
}

/** A path just beginning — first-time entry, no history behind it. */
export function BeginningIllustration({ style, size = 64 }: Props) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="10" cy="32" r="9" fill="var(--color-accent-subtle)" />
      <circle cx="10" cy="32" r="4.5" fill="var(--color-accent)" />
      <circle cx="28" cy="28" r="5" fill="var(--color-area-learn)" opacity="0.55" />
      <circle cx="44" cy="22" r="5" fill="var(--color-area-today)" opacity="0.45" />
      <circle cx="58" cy="18" r="5" fill="var(--color-area-progress)" opacity="0.35" />
    </svg>
  );
}

/** A path picked up partway along — the resume prompt. */
export function ResumeIllustration({ style, size = 64 }: Props) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="8" cy="34" r="5" fill="var(--color-area-today)" opacity="0.4" />
      <circle cx="24" cy="30" r="5" fill="var(--color-area-learn)" opacity="0.55" />
      <circle cx="40" cy="26" r="9" fill="var(--color-accent-subtle)" />
      <circle cx="40" cy="26" r="4.5" fill="var(--color-accent)" />
      <circle
        cx="58"
        cy="20"
        r="5"
        fill="none"
        stroke="var(--color-area-progress)"
        strokeWidth="2"
        opacity="0.7"
      />
    </svg>
  );
}

/** A path with a gap in it — offline, waiting to reconnect. */
export function GapIllustration({ style, size = 64 }: Props) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="8" cy="32" r="5" fill="var(--color-accent)" opacity="0.45" />
      <circle cx="24" cy="28" r="5" fill="var(--color-area-learn)" opacity="0.55" />
      <line
        x1="34"
        y1="26"
        x2="46"
        y2="22"
        stroke="var(--color-area-today)"
        strokeWidth="2.5"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
      <circle
        cx="56"
        cy="19"
        r="5"
        fill="none"
        stroke="var(--color-area-progress)"
        strokeWidth="2"
      />
    </svg>
  );
}

/** An outline where a step would be — content that isn't here yet. */
export function OutlineIllustration({ style, size = 64 }: Props) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 64 48"
      fill="none"
      style={{ ...base, ...style }}
      aria-hidden="true"
    >
      <circle cx="14" cy="28" r="5" fill="var(--color-area-today)" opacity="0.5" />
      <circle
        cx="34"
        cy="24"
        r="10"
        fill="var(--color-accent-subtle)"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <circle cx="54" cy="20" r="5" fill="var(--color-area-progress)" opacity="0.45" />
    </svg>
  );
}

/**
 * Compact header mark for section labels — three stacked arcs, learning-
 * universal, no subject content.
 */
export function HeaderMark({
  style,
  area = "practice",
}: Props & { area?: "today" | "learn" | "practice" | "progress" }) {
  const fill =
    area === "today"
      ? "var(--color-area-today)"
      : area === "learn"
        ? "var(--color-area-learn)"
        : area === "progress"
          ? "var(--color-area-progress)"
          : "var(--color-accent)";
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <circle cx="8" cy="20" r="4" fill={fill} opacity="0.35" />
      <circle cx="14" cy="14" r="5" fill={fill} opacity="0.65" />
      <circle cx="20" cy="8" r="6" fill={fill} />
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
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="8" fill="var(--color-achievement)" />
      <line
        x1="20"
        y1="20"
        x2="20"
        y2="3"
        stroke="var(--color-achievement-border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="20"
        x2="34"
        y2="11"
        stroke="var(--color-achievement-border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="20"
        x2="35"
        y2="28"
        stroke="var(--color-achievement-border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="20"
        x2="22"
        y2="36"
        stroke="var(--color-achievement-border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="20"
        x2="5"
        y2="30"
        stroke="var(--color-achievement-border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
