"use client";

import Link from "next/link";
import { hapticTap } from "@/lib/haptics";
import { useIsEmbed } from "@/lib/use-is-embed";
import { writeTourMode } from "@/lib/demo-persistence";
import { writeTeacherTourMode } from "@/lib/teacher-tour";
import { writeAdminTourMode } from "@/lib/admin-tour";
import { writePedleadTourMode } from "@/lib/pedlead-tour";

/**
 * Returns to the demo shell picker at `/` (demo.escolent.com on production).
 * Shared by Student and Teacher headers — same row as other chrome actions.
 * In embed mode (?embed=1), this is omitted to keep the embedded frame self-contained.
 */
export function ShellExitLink({ variant = "student" }: { variant?: "student" | "staff" }) {
  const isEmbed = useIsEmbed();
  if (isEmbed) return null;

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
      onClick={() => {
        hapticTap();
        writeTourMode(false);
        writeTeacherTourMode(false);
        writeAdminTourMode(false);
        writePedleadTourMode(false);
      }}
    >
      <svg
        className="esc-shell-exit-icon"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M6.5 3H4.25C3.56 3 3 3.56 3 4.25v7.5C3 12.44 3.56 13 4.25 13H6.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 11.5 13.5 8 10 4.5M13.25 8H6.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="esc-shell-exit-label">Exit</span>
    </Link>
  );
}
