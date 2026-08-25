import Link from "next/link";

/** Primary navigation CTAs for practice completion and dead-end recovery. */
export function SessionEndActions({
  onBeforeNavigate,
}: {
  onBeforeNavigate?: () => void;
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
    </div>
  );
}
