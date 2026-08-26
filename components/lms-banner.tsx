"use client";

import { useShellState } from "@/components/shell-context";

/** Presentation toggle: Standalone app vs framed LMS launch. */
export function LmsBanner() {
  const { lmsMode, setLmsMode, demoControls } = useShellState();
  const classroom = lmsMode === "classroom";

  return (
    <div
      className={`esc-lms-banner${classroom ? " esc-lms-classroom" : ""}`}
      data-esc-lms-banner="true"
    >
      <div className="esc-lms-banner-left">
        <span className="esc-lms-brand-pill">
          <span className="esc-lms-brand-dot" aria-hidden />
          <span>{classroom ? "Opened from Google Classroom" : "Escolent"}</span>
        </span>
        {classroom ? (
          <span className="esc-lms-subtle">Grade 8 Algebra · Ms. Mokoena</span>
        ) : demoControls ? (
          <span className="esc-lms-subtle">Investor demo controls on</span>
        ) : null}
      </div>
      <div className="esc-lms-toggle" role="group" aria-label="Launch context">
        <button
          type="button"
          className={!classroom ? "esc-lms-active" : undefined}
          onClick={() => setLmsMode("standalone")}
        >
          Standalone
        </button>
        <button
          type="button"
          className={classroom ? "esc-lms-active" : undefined}
          onClick={() => setLmsMode("classroom")}
        >
          Classroom
        </button>
      </div>
    </div>
  );
}

/** Extra Classroom chrome when LMS integration mode is on. */
export function ClassroomFrame({ children }: { children: React.ReactNode }) {
  const { lmsMode } = useShellState();
  if (lmsMode !== "classroom") return <>{children}</>;

  return (
    <div className="esc-classroom-frame">
      <div className="esc-classroom-top">
        <div className="esc-classroom-mark" aria-hidden>
          G
        </div>
        <div className="esc-classroom-copy">
          <div className="esc-classroom-class">Grade 8 Algebra · Period 3</div>
          <div className="esc-classroom-assignment">
            Practice: Variables on both sides · Due today
          </div>
        </div>
        <div className="esc-classroom-status">Assigned</div>
      </div>
      <div className="esc-classroom-body">{children}</div>
    </div>
  );
}
