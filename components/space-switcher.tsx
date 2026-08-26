"use client";

import { useShellState } from "@/components/shell-context";
import { AREA_VARS, type AreaTone } from "@/components/ui";
import { hapticTap } from "@/lib/haptics";

/**
 * Visible current-Space control for Learn / Progress.
 * All enrolled Spaces stay on-screen as chips — no hidden dropdown.
 */
export function SpaceSwitcher({ area = "learn" }: { area?: AreaTone }) {
  const { currentSpace, spaces, setCurrentSpaceId } = useShellState();
  const tone = AREA_VARS[area];

  return (
    <div className="esc-space-switcher">
      <div className="esc-space-switcher-label">Your Spaces</div>
      <div
        className="esc-space-switcher-chips"
        role="listbox"
        aria-label="Your Spaces"
      >
        {spaces.map((space) => {
          const active = space.id === currentSpace.id;
          return (
            <button
              key={space.id}
              type="button"
              role="option"
              aria-selected={active}
              className={
                active
                  ? "esc-space-chip esc-space-chip-active esc-pressable"
                  : "esc-space-chip esc-pressable"
              }
              style={
                active
                  ? {
                      borderColor: tone.border,
                      background: tone.subtle,
                    }
                  : undefined
              }
              onClick={() => {
                if (active) return;
                hapticTap();
                setCurrentSpaceId(space.id);
              }}
            >
              <span className="esc-space-chip-name">{space.name}</span>
              <span className="esc-space-chip-meta">{space.subject}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
