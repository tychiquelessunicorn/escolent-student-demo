"use client";

import Image from "next/image";

interface EscolentLogoIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export function EscolentLogoIcon({
  size = 22,
  className,
  style,
  priority = true,
}: EscolentLogoIconProps) {
  return (
    <Image
      src="/logo-icon.png"
      alt="Escolent"
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{
        display: "block",
        flexShrink: 0,
        width: size,
        height: size,
        objectFit: "contain",
        ...style,
      }}
    />
  );
}

interface EscolentLogoProps {
  iconSize?: number;
  fontSize?: number;
  className?: string;
  gap?: number;
}

export function EscolentLogo({
  iconSize = 22,
  fontSize = 20,
  className,
  gap = 9,
}: EscolentLogoProps) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        lineHeight: 1,
      }}
    >
      <EscolentLogoIcon size={iconSize} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize,
          letterSpacing: "-0.03em",
          color: "var(--color-content-primary)",
          whiteSpace: "nowrap",
          lineHeight: 1.1,
        }}
      >
        Escolent
      </span>
    </div>
  );
}

interface EscolentLoadingIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function EscolentLoadingIcon({
  size = 22,
  className,
  style,
}: EscolentLoadingIconProps) {
  return (
    <div
      className={["esc-logo-loader", className].filter(Boolean).join(" ")}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      <div className="esc-logo-loader-glow" />
      <EscolentLogoIcon size={size} className="esc-logo-loader-icon" />
    </div>
  );
}

interface EscolentLoaderProps {
  label?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  vertical?: boolean;
}

export function EscolentLoader({
  label = "Loading…",
  size = 22,
  className,
  style,
  vertical = false,
}: EscolentLoaderProps) {
  return (
    <div
      className={["esc-loader-container", vertical ? "esc-loader-vertical" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      role="status"
      aria-live="polite"
    >
      <EscolentLoadingIcon size={size} />
      {label ? <span className="esc-loader-label">{label}</span> : null}
    </div>
  );
}
