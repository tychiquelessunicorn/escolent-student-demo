import type { SyncFreshness } from "@/lib/demo-data";

/**
 * Sync state is carried by a glyph rather than a color family — "stale" isn't a
 * hue, it's a freshness signal. Colour is never the only carrier here: each
 * state has a distinct shape, and the adjacent label states it in words.
 */
export function ConnectivityGlyph({
  state,
  size = 8,
  demoOffline = false,
}: {
  state: SyncFreshness;
  size?: number;
  demoOffline?: boolean;
}) {
  if (demoOffline) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "oklch(52% 0.14 18)",
        }}
      />
    );
  }

  if (state === "fresh") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "oklch(55% 0.14 150)",
        }}
      />
    );
  }

  const muted = "var(--color-content-muted)";

  if (state === "stale") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `1.5px solid ${muted}`,
        }}
      />
    );
  }

  if (state === "syncing") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "1.5px solid var(--color-border-subtle)",
          borderTopColor: muted,
          animation: "esc-spin 1s linear infinite",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1.5px solid ${muted}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: -1,
          width: size + 2,
          height: 1.5,
          background: muted,
          transform: "translateY(-50%) rotate(45deg)",
        }}
      />
    </div>
  );
}
