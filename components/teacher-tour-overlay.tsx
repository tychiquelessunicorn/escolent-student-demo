"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTeacherTour } from "@/components/teacher-tour-provider";
import { hapticTap } from "@/lib/haptics";
import {
  TOUR_CHAPTERS,
  TOUR_TEACHER_DEMO_LABEL,
  tourPositionAt,
  type TeacherTourDemoCardKind,
} from "@/lib/teacher-tour";

/** Breathing room between the spotlight ring and the element it surrounds. */
const SPOT_PAD = 8;

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: string;
}

function readRect(target: string | null): SpotRect | null {
  if (!target) return null;
  const element = document.querySelector<HTMLElement>(
    `[data-tour="${target}"]`,
  );
  if (!element) return null;
  const box = element.getBoundingClientRect();
  // A collapsed dimension means the target is not laid out yet; an even dim is
  // better than a ring with no area.
  if (box.width < 1 || box.height < 1) return null;
  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    radius: window.getComputedStyle(element).borderRadius || "16px",
  };
}

function sameRect(a: SpotRect | null, b: SpotRect | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5 &&
    a.radius === b.radius
  );
}

function litFromRect(
  rect: SpotRect,
  viewport: { width: number; height: number },
) {
  const top = Math.max(0, Math.min(rect.top - SPOT_PAD, viewport.height));
  const left = Math.max(0, Math.min(rect.left - SPOT_PAD, viewport.width));
  return {
    top,
    left,
    bottom: Math.max(
      top,
      Math.min(rect.top + rect.height + SPOT_PAD, viewport.height),
    ),
    right: Math.max(
      left,
      Math.min(rect.left + rect.width + SPOT_PAD, viewport.width),
    ),
  };
}

function elementInViewport(element: Element): boolean {
  const box = element.getBoundingClientRect();
  return box.top >= 48 && box.bottom <= window.innerHeight - 48;
}

/**
 * Simulated teacher flows — never call override POST, space co-author AI, or
 * digest generation. The demo label stays on screen the whole time.
 */
function TeacherDemoCard({ kind }: { kind: TeacherTourDemoCardKind }) {
  return (
    <div className="esc-tour-demo">
      <div className="esc-tour-demo-label">{TOUR_TEACHER_DEMO_LABEL}</div>
      {kind === "override_revisit" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-said">
              Elena Cruz · Integer operations — override check
            </div>
            <div className="esc-tour-demo-answer">
              Confirm still mastered? “Observed fluent integer work in class —
              platform still showed struggling.” Reconfirming would keep durable
              mastery; reassessment would clear the override and restore the
              measured tier.
            </div>
          </div>
          <div className="esc-tour-demo-notice">
            Confirm mastery — simulated only; no override record is written
          </div>
          <div className="esc-tour-demo-foot">
            In production this step POSTs a reconfirm. The tour never calls
            /api/teacher/override, so the demo roster stays unchanged.
          </div>
        </>
      ) : null}
      {kind === "space_coauthor" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-said">
              “Catch-up Space for students still shaky on one-step and two-step
              equations — keep problems easy to medium”
            </div>
            <div className="esc-tour-demo-answer">
              Suggested skills: One-step equations, Two-step equations ·
              Difficulty 1–3. Name and description stay yours; review every
              checkbox before saving.
            </div>
          </div>
          <div className="esc-tour-demo-foot">
            Scripted draft result — not a live co-author call. Nothing is saved
            and nothing is billed.
          </div>
        </>
      ) : null}
      {kind === "digest_preview" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-answer">
              This week in your Spaces: Elena Cruz’s integer-operations override
              is due for revisit — confirm still mastered or reassess from the
              Overview panel. Zainab Osei shows a recurring misconception on
              two-step equations (treating negative coefficients as positive when
              dividing); five students share related patterns this week. Two
              prerequisite gaps remain flagged in Algebra 8A.
            </div>
          </div>
          <div className="esc-tour-demo-foot">
            Normally AI-generated from this week’s metrics. Fixed sample for the
            tour — not generated live and not emailed.
          </div>
        </>
      ) : null}
    </div>
  );
}

export function TeacherTourOverlay() {
  const {
    active,
    position,
    chapterCount,
    index,
    isFirst,
    isLast,
    autoPlay,
    toggleAutoPlay,
    next,
    back,
    restart,
    exit,
  } = useTeacherTour();

  const step = position?.step ?? null;
  const target = step?.target ?? null;

  /** Last measured spotlight — kept across step changes so the ring can animate. */
  const [displayRect, setDisplayRect] = useState<SpotRect | null>(null);
  /** Caption updates only after the new target is painted and measured. */
  const [contentIndex, setContentIndex] = useState(index);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const calloutRef = useRef<HTMLDivElement | null>(null);

  const contentPosition = tourPositionAt(contentIndex);
  const contentStep = contentPosition.step;
  const {
    chapter: contentChapter,
    chapterNumber: contentChapterNumber,
    stepNumber: contentStepNumber,
    stepCount: contentStepCount,
  } = contentPosition;

  useEffect(() => {
    if (!active) {
      setDisplayRect(null);
      setContentIndex(0);
    }
  }, [active]);

  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Targets appear asynchronously (route change, expanded cards settling). Keep
  // the previous rect until the new one is found so the spotlight never flashes
  // to full-screen dim between steps.
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 120) {
        last = now;
        const found = readRect(target);
        if (found) {
          setDisplayRect((current) => (sameRect(current, found) ? current : found));
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  // Steps with no anchor ease to full dim once the ring has finished moving.
  useEffect(() => {
    if (!active || target) return;
    const timer = window.setTimeout(() => setDisplayRect(null), 320);
    return () => window.clearTimeout(timer);
  }, [active, index, target]);

  // Defer caption updates until the new target exists — prevents the callout
  // from describing step N+1 while the spotlight is still on step N.
  useEffect(() => {
    if (!active) return;
    if (index === contentIndex) return;

    if (!target) {
      const timer = window.setTimeout(() => setContentIndex(index), 320);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    let attempts = 0;
    const settle = () => {
      if (cancelled) return;
      const found = readRect(target);
      if (found) {
        setDisplayRect((current) => (sameRect(current, found) ? current : found));
        requestAnimationFrame(() => {
          if (!cancelled) setContentIndex(index);
        });
        return;
      }
      attempts += 1;
      if (attempts < 48) {
        requestAnimationFrame(settle);
      } else {
        setContentIndex(index);
      }
    };
    requestAnimationFrame(settle);
    return () => {
      cancelled = true;
    };
  }, [active, contentIndex, index, target]);

  // Same-route steps often have the target already painted — measure immediately.
  useLayoutEffect(() => {
    if (!active || !target) return;
    const found = readRect(target);
    if (found) {
      setDisplayRect((current) => (sameRect(current, found) ? current : found));
    }
  }, [active, index, target]);

  // Scroll only when the target is off-screen — mid-page jumps fight the overlay.
  useEffect(() => {
    if (!active || !target) return;
    const timer = window.setTimeout(() => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      if (element && !elementInViewport(element)) {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [active, index, target]);

  const advance = useCallback(() => {
    hapticTap();
    if (isLast) exit();
    else next();
  }, [exit, isLast, next]);

  const goBack = useCallback(() => {
    if (isFirst) return;
    hapticTap();
    back();
  }, [back, isFirst]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exit();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        advance();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, advance, exit, goBack]);

  if (!active || !step || !position) return null;

  const { chapterNumber, stepNumber, stepCount } = position;
  const showRing = Boolean(displayRect && target);
  const lit = displayRect
    ? litFromRect(displayRect, viewport)
    : {
        top: 0,
        left: 0,
        bottom: viewport.height,
        right: viewport.width,
      };

  return (
    <>
      <div className="esc-tour-block" aria-hidden />
      <div
        className="esc-tour-shade"
        aria-hidden
        style={{ top: 0, left: 0, right: 0, height: lit.top }}
      />
      <div
        className="esc-tour-shade"
        aria-hidden
        style={{ top: lit.bottom, left: 0, right: 0, bottom: 0 }}
      />
      <div
        className="esc-tour-shade"
        aria-hidden
        style={{
          top: lit.top,
          height: lit.bottom - lit.top,
          left: 0,
          width: lit.left,
        }}
      />
      <div
        className="esc-tour-shade"
        aria-hidden
        style={{
          top: lit.top,
          height: lit.bottom - lit.top,
          left: lit.right,
          right: 0,
        }}
      />
      {showRing ? (
        <div
          className="esc-tour-ring"
          aria-hidden
          style={{
            top: lit.top,
            left: lit.left,
            width: lit.right - lit.left,
            height: lit.bottom - lit.top,
            borderRadius: `calc(${displayRect?.radius ?? "16px"} + ${SPOT_PAD}px)`,
          }}
        />
      ) : (
        <div
          className="esc-tour-ring esc-tour-ring-hidden"
          aria-hidden
          style={{
            top: lit.top,
            left: lit.left,
            width: Math.max(0, lit.right - lit.left),
            height: Math.max(0, lit.bottom - lit.top),
            borderRadius: `calc(${displayRect?.radius ?? "16px"} + ${SPOT_PAD}px)`,
          }}
        />
      )}

      <div
        ref={calloutRef}
        className="esc-tour-callout esc-tour-callout-docked"
        role="region"
        aria-label="Guided tour"
      >
        <div className="esc-tour-chapters" aria-hidden>
          {TOUR_CHAPTERS.map((entry, entryIndex) => {
            const number = entryIndex + 1;
            const fill =
              number < chapterNumber
                ? 1
                : number > chapterNumber
                  ? 0
                  : stepNumber / stepCount;
            return (
              <span
                key={entry.id}
                className="esc-tour-chapter-seg"
                title={`${number}. ${entry.title}`}
              >
                <span
                  className="esc-tour-chapter-seg-fill"
                  style={{ width: `${fill * 100}%` }}
                />
              </span>
            );
          })}
        </div>

        <div className="esc-tour-body" aria-live="polite">
          <div className="esc-tour-meta">
            <span className="esc-tour-badge">
              Chapter {contentChapterNumber} of {chapterCount}
            </span>
            <span className="esc-tour-chapter-name">{contentChapter.title}</span>
            <span className="esc-tour-screen">
              {contentStep.screen ?? contentChapter.screen}
            </span>
            <span className="esc-tour-substep">
              Step {contentStepNumber} of {contentStepCount}
            </span>
          </div>

          <h2 className="esc-tour-title">{contentStep.title}</h2>
          <p className="esc-tour-caption">{contentStep.caption}</p>

          {contentStep.demoCard ? (
            <TeacherDemoCard kind={contentStep.demoCard} />
          ) : null}
        </div>

        {autoPlay && !isLast ? (
          <div className="esc-tour-timer" aria-hidden>
            <span
              key={index}
              className="esc-tour-timer-fill"
              style={{ animationDuration: `${step.ms}ms` }}
            />
          </div>
        ) : null}

        <div className="esc-tour-actions">
          <button
            type="button"
            className="esc-tour-back esc-pressable"
            onClick={goBack}
            disabled={isFirst}
          >
            Back
          </button>
          <button
            type="button"
            className="esc-tour-next esc-pressable"
            onClick={advance}
          >
            {isLast ? "Finish tour" : "Next"}
          </button>
          <button
            type="button"
            className="esc-tour-toggle esc-pressable"
            aria-pressed={autoPlay}
            onClick={() => {
              hapticTap();
              toggleAutoPlay();
            }}
            disabled={isLast}
          >
            {autoPlay ? "Pause auto-play" : "Auto-play"}
          </button>
          <div className="esc-tour-actions-end">
            {isLast ? (
              <button
                type="button"
                className="esc-tour-quiet esc-pressable"
                onClick={() => {
                  hapticTap();
                  restart();
                }}
              >
                Start over
              </button>
            ) : null}
            <button
              type="button"
              className="esc-tour-quiet esc-pressable"
              onClick={() => {
                hapticTap();
                exit();
              }}
            >
              Exit tour
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
