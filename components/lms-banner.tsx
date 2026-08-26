"use client";

import { useShellState } from "@/components/shell-context";

/** Demo-only Trojan Horse LMS presentation toggle. */
export function LmsBanner() {
  const { lmsMode, setLmsMode } = useShellState();
  const classroom = lmsMode === "classroom";

  return (
    <div
      className={`esc-lms-banner${classroom ? " esc-lms-classroom" : ""}`}
      data-esc-lms-banner="true"
    >
      <div className="esc-lms-banner-left">
        <span className="esc-lms-brand-pill">
          <span className="esc-lms-brand-dot" aria-hidden />
          <span>
            {classroom
              ? "Google Classroom Integration Mode"
              : "Standalone Mode"}
          </span>
        </span>
        <span style={{ opacity: 0.7 }}>Demo shell</span>
      </div>
      <div className="esc-lms-toggle" role="group" aria-label="LMS presentation mode">
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
          Google Classroom
        </button>
      </div>
    </div>
  );
}
