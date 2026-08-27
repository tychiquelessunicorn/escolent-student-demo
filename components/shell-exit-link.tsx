"use client";

import Link from "next/link";
import { hapticTap } from "@/lib/haptics";

/**
 * Returns to the demo shell picker at `/` (demo.escolent.com on production).
 * Shared by Student and Teacher headers — same row as other chrome actions.
 */
export function ShellExitLink({ variant = "student" }: { variant?: "student" | "staff" }) {
  return (
    <Link
      href="/"
      className={[
        "esc-shell-exit",
        "esc-pressable",
        variant === "staff" ? "esc-shell-exit-staff" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Exit to demo home"
      title="Exit to demo home"
      onClick={() => hapticTap()}
    >
      <span className="esc-shell-exit-label">Exit</span>
    </Link>
  );
}
