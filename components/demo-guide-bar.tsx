"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useShellState } from "@/components/shell-context";
import {
  DEMO_TOUR_TOTAL_STEPS,
  demoTourCtaLabel,
  demoTourNextHref,
  demoTourStep,
  resolveDemoTourStep,
} from "@/lib/demo-tour";
import {
  isVariablesCompleted,
  subscribeDemoPersist,
} from "@/lib/demo-persistence";
import { hapticTap } from "@/lib/haptics";

/**
 * Sticky Demo coach bar — high-visibility, one instruction, one CTA.
 * Covers the full Student shell in order while tourMode is on.
 */
export function DemoGuideBar() {
  const pathname = usePathname();
  const { tourMode, exitTour } = useShellState();
  const [mastered, setMastered] = useState(false);

  useEffect(() => {
    const refresh = () => setMastered(isVariablesCompleted());
    refresh();
    return subscribeDemoPersist(refresh);
  }, []);

  if (!tourMode) return null;

  const stepId = resolveDemoTourStep(pathname, mastered);
  const step = demoTourStep(stepId);
  const href = demoTourNextHref(stepId, pathname);
  const label = demoTourCtaLabel(stepId, pathname);
  const onFinal = stepId === 6 && pathname.startsWith("/student/week");
  const onPracticeStep = stepId === 2 && pathname.startsWith("/practice");

  return (
    <div className="esc-demo-guide" role="region" aria-label="Demo guide">
      <div className="esc-demo-guide-inner">
        <div className="esc-demo-guide-meta">
          <span className="esc-demo-guide-badge">Demo</span>
          <span className="esc-demo-guide-step">
            Step {stepId} of {DEMO_TOUR_TOTAL_STEPS}
          </span>
          <span className="esc-demo-guide-title">{step.title}</span>
        </div>
        <p className="esc-demo-guide-copy">{step.instruction}</p>
        <div className="esc-demo-guide-actions">
          {onFinal ? (
            <button
              type="button"
              className="esc-demo-guide-cta esc-pressable"
              onClick={() => {
                hapticTap();
                exitTour();
              }}
            >
              Finish demo
            </button>
          ) : onPracticeStep ? (
            <span className="esc-demo-guide-stay">{label}</span>
          ) : (
            <Link
              href={href}
              className="esc-demo-guide-cta esc-pressable"
              onClick={() => hapticTap()}
            >
              {label}
            </Link>
          )}
          <button
            type="button"
            className="esc-demo-guide-exit esc-pressable"
            onClick={() => {
              hapticTap();
              exitTour();
            }}
          >
            Exit demo
          </button>
        </div>
      </div>
      <div className="esc-demo-guide-progress" aria-hidden>
        {Array.from({ length: DEMO_TOUR_TOTAL_STEPS }, (_, index) => {
          const n = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6;
          return (
            <span
              key={n}
              className={
                n <= stepId
                  ? "esc-demo-guide-dot esc-demo-guide-dot-on"
                  : "esc-demo-guide-dot"
              }
            />
          );
        })}
      </div>
    </div>
  );
}
