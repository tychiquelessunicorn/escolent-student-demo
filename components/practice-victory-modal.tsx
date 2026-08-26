"use client";

import Link from "next/link";
import { DemoBktBanner } from "@/components/demo-bkt-banner";
import { completeVictoryLoop } from "@/lib/demo-persistence";

export function PracticeVictoryModal({
  onReturn,
}: {
  onReturn: () => void;
}) {
  const persist = () => completeVictoryLoop();

  return (
    <div
      className="esc-victory-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <div className="esc-victory-modal">
        <div className="esc-victory-check" aria-hidden>
          ✓
        </div>
        <div id="victory-title" className="esc-victory-title">
          Session Complete
        </div>
        <div className="esc-victory-subtitle">Variables on both sides</div>
        <DemoBktBanner />
        <p
          style={{
            fontSize: 13,
            color: "var(--color-content-secondary)",
            margin: "8px 0 0",
            lineHeight: 1.5,
          }}
        >
          Today&apos;s task counter will update when you return to the dashboard.
        </p>
        <div className="esc-ended-actions" style={{ marginTop: 20 }}>
          <button type="button" className="esc-btn-primary esc-pressable" onClick={onReturn}>
            Return to Dashboard
          </button>
          <Link
            href="/student/progress"
            className="esc-btn-secondary esc-pressable"
            onClick={persist}
          >
            View Progress Graph
          </Link>
        </div>
      </div>
    </div>
  );
}
