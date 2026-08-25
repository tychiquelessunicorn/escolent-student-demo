import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  style,
  subtleBorder = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  subtleBorder?: boolean;
}) {
  return (
    <div
      className="esc-card"
      style={{
        background: "var(--color-surface-raised)",
        border: `1px solid ${subtleBorder ? "var(--color-border-subtle)" : "var(--color-border)"}`,
        borderRadius: "var(--radius-card)",
        padding: "36px 32px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 22,
        marginBottom: 10,
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
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: "var(--color-content-muted)",
        marginBottom: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 26,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--color-content-muted)",
            marginTop: 2,
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
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const shared: CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: 15,
    fontWeight: 600,
    borderRadius: "var(--radius-control)",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      padding: "11px 20px",
      border: "none",
      background: disabled ? "var(--color-disabled-surface)" : "var(--color-accent)",
      color: disabled
        ? "var(--color-content-muted)"
        : "var(--color-surface-raised)",
    },
    secondary: {
      padding: "10px 20px",
      border: "1.5px solid var(--color-accent-subtle-border)",
      background: "transparent",
      color: "var(--color-accent)",
    },
    ghost: {
      padding: "10px 20px",
      border: "none",
      background: "transparent",
      color: "var(--color-content-muted)",
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
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
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
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
