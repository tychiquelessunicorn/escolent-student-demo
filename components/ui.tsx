import type { CSSProperties, ReactNode } from "react";
import { hapticTap } from "@/lib/haptics";

export type AreaTone = "today" | "learn" | "practice" | "progress";

export const AREA_VARS: Record<
  AreaTone,
  { fg: string; subtle: string; border: string; solid: string }
> = {
  today: {
    solid: "var(--color-area-today)",
    subtle: "var(--color-area-today-subtle)",
    border: "var(--color-area-today-border)",
    fg: "var(--color-area-today-fg)",
  },
  learn: {
    solid: "var(--color-area-learn)",
    subtle: "var(--color-area-learn-subtle)",
    border: "var(--color-area-learn-border)",
    fg: "var(--color-area-learn-fg)",
  },
  practice: {
    solid: "var(--color-area-practice)",
    subtle: "var(--color-area-practice-subtle)",
    border: "var(--color-area-practice-border)",
    fg: "var(--color-area-practice-fg)",
  },
  progress: {
    solid: "var(--color-area-progress)",
    subtle: "var(--color-area-progress-subtle)",
    border: "var(--color-area-progress-border)",
    fg: "var(--color-area-progress-fg)",
  },
};

export function Card({
  children,
  style,
  subtleBorder = false,
  area,
  className,
  dataTour,
}: {
  children: ReactNode;
  style?: CSSProperties;
  subtleBorder?: boolean;
  /** Optional functional area wash — identity, not decoration. */
  area?: AreaTone;
  className?: string;
  /** Spotlight anchor for the guided tour. */
  dataTour?: string;
}) {
  const tone = area ? AREA_VARS[area] : null;
  return (
    <div
      className={["esc-card", "esc-phase", className].filter(Boolean).join(" ")}
      data-tour={dataTour}
      style={{
        background: tone ? tone.subtle : "var(--color-surface-raised)",
        border: `1.5px solid ${
          tone ? tone.border : subtleBorder ? "var(--color-border-subtle)" : "var(--color-border)"
        }`,
        borderRadius: "var(--radius-card)",
        padding: "36px 32px",
        boxShadow: "0 1px 0 oklch(22% 0.03 55 / 0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: "var(--text-lg)",
        letterSpacing: "-0.02em",
        lineHeight: 1.15,
        marginBottom: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 15,
        color: "var(--color-content-secondary)",
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  style,
  area,
}: {
  children: ReactNode;
  style?: CSSProperties;
  area?: AreaTone;
}) {
  const tone = area ? AREA_VARS[area] : null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-display)",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: tone ? tone.fg : "var(--color-content-muted)",
        marginBottom: 14,
        ...style,
      }}
    >
      {tone ? (
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 3,
            background: tone.solid,
          }}
        />
      ) : null}
      {children}
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  area,
}: {
  title: string;
  subtitle?: ReactNode;
  area?: AreaTone;
}) {
  const tone = area ? AREA_VARS[area] : null;
  return (
    <div className="esc-rise">
      {tone ? (
        <div
          aria-hidden
          style={{
            width: 36,
            height: 6,
            borderRadius: 999,
            background: tone.solid,
            marginBottom: 14,
          }}
        />
      ) : null}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "var(--text-xl)",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: 15,
            color: "var(--color-content-secondary)",
            marginTop: 8,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  style,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const shared: CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: 15,
    fontWeight: 700,
    borderRadius: "var(--radius-control)",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      padding: "12px 22px",
      border: "none",
      background: disabled ? "var(--color-disabled-surface)" : "var(--color-accent)",
      color: disabled
        ? "var(--color-content-muted)"
        : "var(--color-surface-raised)",
      boxShadow: disabled
        ? "none"
        : "0 6px 16px oklch(48.8% 0.217 264.4 / 0.28)",
    },
    secondary: {
      padding: "11px 22px",
      border: "1.5px solid var(--color-accent-subtle-border)",
      background: "var(--color-accent-subtle)",
      color: "var(--color-accent-strong)",
    },
    ghost: {
      padding: "11px 22px",
      border: "none",
      background: "transparent",
      color: "var(--color-content-muted)",
    },
  };

  return (
    <button
      type="button"
      className={["esc-pressable", className].filter(Boolean).join(" ")}
      onClick={() => {
        if (!disabled) hapticTap();
        onClick?.();
      }}
      disabled={disabled}
      style={{ ...shared, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

/** The muted inset panel the scaffold ladder and the exhausted state both use. */
export function InsetPanel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--color-accent-field)",
        border: "1px solid var(--color-accent-subtle-border)",
        borderRadius: "var(--radius-shell)",
        padding: "18px 20px",
        marginBottom: 20,
        fontSize: 14,
        lineHeight: 1.7,
        color: "var(--color-content-primary)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Empty-state frame: large illustration + bold title + short support line. */
export function EmptyState({
  illustration,
  title,
  body,
  action,
  area = "practice",
}: {
  illustration: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  area?: AreaTone;
}) {
  const tone = AREA_VARS[area];
  return (
    <div
      className="esc-rise"
      style={{
        textAlign: "center",
        padding: "40px 28px",
        borderRadius: "var(--radius-card)",
        background: tone.subtle,
        border: `1.5px solid ${tone.border}`,
      }}
    >
      <div className="esc-pop" style={{ display: "flex", justifyContent: "center" }}>
        {illustration}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "var(--text-lg)",
          letterSpacing: "-0.02em",
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 15,
          color: "var(--color-content-secondary)",
          lineHeight: 1.55,
          maxWidth: 360,
          margin: "0 auto 20px",
        }}
      >
        {body}
      </div>
      {action}
    </div>
  );
}
