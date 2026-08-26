"use client";

import Link from "next/link";

/** Demo-only prerequisite gap alert for investor walkthroughs. */
export function PracticeRemediationModal({
  onStay,
}: {
  onStay: () => void;
}) {
  return (
    <div
      className="esc-remediation-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remediation-title"
    >
      <div className="esc-remediation-modal">
        <div className="esc-remediation-kicker">AI diagnostic</div>
        <div id="remediation-title" className="esc-remediation-title">
          Prerequisite Gap Detected
        </div>
        <p className="esc-remediation-body">
          Prerequisite Gap Detected in Integer Operations. Routing to foundational
          review…
        </p>
        <div className="esc-remediation-note">
          Recommended next: a 1-step equation practice to rebuild the missing
          foundation before returning to variables on both sides.
        </div>
        <div className="esc-ended-actions">
          <Link href="/practice?skill=one_step" className="esc-btn-primary esc-pressable">
            Open 1-step practice
          </Link>
          <button type="button" className="esc-btn-secondary esc-pressable" onClick={onStay}>
            Stay on this problem
          </button>
        </div>
      </div>
    </div>
  );
}
