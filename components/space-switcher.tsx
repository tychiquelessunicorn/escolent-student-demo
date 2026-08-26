"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useShellState } from "@/components/shell-context";
import { hapticTap } from "@/lib/haptics";

/** Quiet current-Space control for Learn / Progress — not a management page. */
export function SpaceSwitcher() {
  const { currentSpace, spaces, setCurrentSpaceId } = useShellState();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="esc-space-switcher" ref={rootRef}>
      <button
        type="button"
        className="esc-space-switcher-trigger esc-pressable"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          hapticTap();
          setOpen((value) => !value);
        }}
      >
        <span>
          {currentSpace.grade} · {currentSpace.name}
        </span>
        <span className="esc-space-switcher-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="esc-space-switcher-menu"
          role="listbox"
          aria-label="Your Spaces"
        >
          {spaces.map((space) => {
            const active = space.id === currentSpace.id;
            return (
              <li key={space.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={
                    active
                      ? "esc-space-switcher-option esc-space-switcher-option-active"
                      : "esc-space-switcher-option"
                  }
                  onClick={() => {
                    hapticTap();
                    setCurrentSpaceId(space.id);
                    setOpen(false);
                  }}
                >
                  <span className="esc-space-switcher-option-name">{space.name}</span>
                  <span className="esc-space-switcher-option-meta">
                    {space.subject} · {space.teacher}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
