import Link from "next/link";
import type { ReactNode } from "react";

/** Primary navigation CTAs for practice completion and dead-end recovery. */
export function SessionEndActions({
  onBeforeNavigate,
  extra,
}: {
  onBeforeNavigate?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="esc-ended-actions">
      <Link
        href="/student/today"
        className="esc-btn-primary esc-pressable"
        onClick={onBeforeNavigate}
      >
        Return to Dashboard
      </Link>
      <Link
        href="/student/progress"
        className="esc-btn-secondary esc-pressable"
        onClick={onBeforeNavigate}
      >
        View Progress Graph
      </Link>
      {extra}
    </div>
  );
}
