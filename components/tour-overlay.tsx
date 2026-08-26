"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useTour } from "@/components/tour-provider";
import { DISTRESS_SCRIPTED_MESSAGE } from "@/lib/distress";
import { hapticTap } from "@/lib/haptics";
import {
  TOUR_CHAPTERS,
  TOUR_SAFETY_DEMO_LABEL,
  type TourDemoCardKind,
} from "@/lib/tour";

/** Breathing room between the spotlight ring and the element it surrounds. */
const SPOT_PAD = 8;
const CALLOUT_GAP = 16;
/** Below this the callout docks: an anchored card would cover the screen anyway. */
const ANCHOR_MIN_WIDTH = 760;

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
  if (box.width < 1 && box.height < 1) return null;
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

/**
 * Chapter 4 shows the two distress surfaces without touching the live path:
 * these are rendered by the tour from the same scripted constant the product
 * uses, so no request is made and no escalation record is created. The label is
 * on screen the whole time so nobody watching can read it as a real one.
 */
function SafetyDemoCard({ kind }: { kind: TourDemoCardKind }) {
  return (
    <div className="esc-tour-demo">
      <div className="esc-tour-demo-label">{TOUR_SAFETY_DEMO_LABEL}</div>
      {kind === "passive_detection" ? (
        <div className="esc-tour-demo-thread">
          <div className="esc-tour-demo-said">
            “i give up, none of this matters anyway. what do i do after
            subtracting 2x”
          </div>
          <div className="esc-tour-demo-answer">
            Once you subtract 2x from both sides you are left with 3x + 3 = 18 —
            from there it is the same two moves as a two-step equation.
          </div>
        </div>
      ) : null}
      <div className="esc-tour-demo-notice">{DISTRESS_SCRIPTED_MESSAGE}</div>
      <div className="esc-tour-demo-foot">
        {kind === "help_button"
          ? "That one sentence is a constant in the code. It is never reworded, never generated at the point of display, and identical whichever path raised it."
          : "The answer and the notice arrive together. Detection never gates the reply, because making every question wait on a slower safety model would be a worse experience for no safety gain."}
      </div>
    </div>
  );
}

export function TourOverlay() {
  const {
    active,
    position,
    chapterCount,
    index,
    isLast,
    autoPlay,
    toggleAutoPlay,
    next,
    restart,
    exit,
  } = useTour();

  const step = position?.step ?? null;
  const target = step?.target ?? null;

  const [rect, setRect] = useState<SpotRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const [calloutSize, setCalloutSize] = useState({ width: 420, height: 280 });
  const calloutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Targets appear asynchronously (a route change, an AI-backed card settling),
  // so the rect is re-read on a loop rather than measured once per step.
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 120) {
        last = now;
        const found = readRect(target);
        setRect((current) => (sameRect(current, found) ? current : found));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  // Same reason: keep trying to bring the target into view for a moment after
  // the step starts, instead of scrolling to wherever it was at step change.
  useEffect(() => {
    if (!active) return;
    const delays = [0, 220, 600, 1200];
    const timers = delays.map((delay) =>
      window.setTimeout(() => {
        const element = target
          ? document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
          : null;
        if (element) element.scrollIntoView({ block: "center", behavior: "smooth" });
        else if (delay === 0) window.scrollTo({ top: 0, behavior: "smooth" });
      }, delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active, index, target]);

  useLayoutEffect(() => {
    const element = calloutRef.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      setCalloutSize((current) =>
        Math.abs(current.width - box.width) < 1 &&
        Math.abs(current.height - box.height) < 1
          ? current
          : { width: box.width, height: box.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, index]);

  const advance = useCallback(() => {
    hapticTap();
    if (isLast) exit();
    else next();
  }, [exit, isLast, next]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exit();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, advance, exit]);

  if (!active || !step || !position) return null;

  const { chapter, chapterNumber, stepNumber, stepCount } = position;
  // A step with its own demo card needs the width; anchoring it beside a
  // header button would squeeze the thing it exists to show.
  const mustDock =
    !rect || viewport.width < ANCHOR_MIN_WIDTH || Boolean(step.demoCard);

  /**
   * The lit area, padded and clamped to the viewport. Dimming is four panels
   * around this box rather than one huge box-shadow, because a shadow that
   * wide is at the mercy of whichever ancestor happens to be clipping.
   */
  const lit = rect
    ? (() => {
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
      })()
    : null;

  let anchored: CSSProperties | undefined;
  if (!mustDock && rect) {
    const below = rect.top + rect.height + SPOT_PAD + CALLOUT_GAP;
    const above = rect.top - SPOT_PAD - CALLOUT_GAP - calloutSize.height;
    const top =
      below + calloutSize.height + CALLOUT_GAP <= viewport.height
        ? below
        : above >= CALLOUT_GAP
          ? above
          : null;
    if (top !== null) {
      const centred = rect.left + rect.width / 2 - calloutSize.width / 2;
      const maxLeft = Math.max(
        CALLOUT_GAP,
        viewport.width - calloutSize.width - CALLOUT_GAP,
      );
      anchored = { top, left: Math.min(Math.max(CALLOUT_GAP, centred), maxLeft) };
    }
  }
  // A target taller than the viewport leaves no room either side of it, and
  // docking clips its bottom edge rather than covering its middle.
  const docked = !anchored;

  return (
    <>
      {/*
        The tour is watched, not driven: blocking the app underneath is what
        guarantees the only way forward is Next, and it is also what keeps
        chapter 4 from ever reaching the real escalation endpoint.
      */}
      <div className="esc-tour-block" aria-hidden />
      {lit ? (
        <>
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
          <div
            className="esc-tour-ring"
            aria-hidden
            style={{
              top: lit.top,
              left: lit.left,
              width: lit.right - lit.left,
              height: lit.bottom - lit.top,
              borderRadius: `calc(${rect?.radius ?? "16px"} + ${SPOT_PAD}px)`,
            }}
          />
        </>
      ) : (
        <div
          className="esc-tour-shade"
          aria-hidden
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      <div
        ref={calloutRef}
        className={
          docked ? "esc-tour-callout esc-tour-callout-docked" : "esc-tour-callout"
        }
        style={anchored}
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

        <div className="esc-tour-body">
          <div className="esc-tour-meta">
            <span className="esc-tour-badge">
              Chapter {chapterNumber} of {chapterCount}
            </span>
            <span className="esc-tour-chapter-name">{chapter.title}</span>
            <span className="esc-tour-screen">
              {step.screen ?? chapter.screen}
            </span>
            <span className="esc-tour-substep">
              Step {stepNumber} of {stepCount}
            </span>
          </div>

          <h2 className="esc-tour-title">{step.title}</h2>
          <p className="esc-tour-caption">{step.caption}</p>

          {step.demoCard ? <SafetyDemoCard kind={step.demoCard} /> : null}
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
