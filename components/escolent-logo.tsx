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
