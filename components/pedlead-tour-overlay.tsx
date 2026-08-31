"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePedleadTour } from "@/components/pedlead-tour-provider";
import { hapticTap } from "@/lib/haptics";
import {
  TOUR_CHAPTERS,
  TOUR_PEDLEAD_DEMO_LABEL,
  tourPositionAt,
  type PedleadTourDemoCardKind,
} from "@/lib/pedlead-tour";

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
 * Simulated pedagogical lead flows — never fire billed AI calls or mutations.
 * The demo label stays on screen the whole time.
 */
function PedleadDemoCard({ kind }: { kind: PedleadTourDemoCardKind }) {
  return (
    <div className="esc-tour-demo">
      <div className="esc-tour-demo-label">{TOUR_PEDLEAD_DEMO_LABEL}</div>
      {kind === "authoring_draft" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-said">
              “Grade 7 Unit on Ecosystems and Food Webs: producers, primary/secondary consumers, decomposers, 10% rule, and trophic cascades.”
            </div>
            <div className="esc-tour-demo-answer">
              Synthesized 5 candidate skill nodes (exact match & rubric evaluated) + 3 diagnostic misconception models in a progressive DAG.
            </div>
          </div>
          <div className="esc-tour-demo-notice">
            Candidate unit generated in draft state — never auto-saved or published
          </div>
          <div className="esc-tour-demo-foot">
            In production this calls /api/ai with task: content_authoring_draft. The tour shows fixed copy without billing an AI call.
          </div>
        </>
      ) : null}

      {kind === "reject_feedback" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-said">Review Decision: Reject with Feedback (Req 31.8a)</div>
            <div className="esc-tour-demo-answer">
              Feedback: “Please attach a 4-level rubric task with model exemplar to the Nutrient Cycling skill before resubmission.”
            </div>
          </div>
          <div className="esc-tour-demo-notice">
            Rejection with feedback returns unit to draft — simulated read-only preview
          </div>
          <div className="esc-tour-demo-foot">
            In production this POSTs to /api/pedlead/content/reject. The tour never submits, leaving stored units untouched.
          </div>
        </>
      ) : null}

      {kind === "live_edit_confirm" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-said">Live Validated Content Edit Safeguard (Req 31.8b)</div>
            <div className="esc-tour-demo-answer">
              Modifying an active skill stages edits into a pending review container. Requires separate explicit sign-off to apply live.
            </div>
          </div>
          <div className="esc-tour-demo-notice">
            Active student practice is never disturbed by unstaged draft edits
          </div>
          <div className="esc-tour-demo-foot">
            Protects student sessions from in-flight curriculum alterations while preserving real-time editorial flexibility.
          </div>
        </>
      ) : null}

      {kind === "lms_text" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-said">Source: Canvas LMS · Unit 4 Symbiotic Relationships</div>
            <div className="esc-tour-demo-answer">
              Parsed mutualism, commensalism, and parasitism text into 2 draft skill graph nodes + 1 misconception model with provenance reference.
            </div>
          </div>
          <div className="esc-tour-demo-notice">
            Read-only course material access — Canvas source files are never altered (Req 33.4)
          </div>
          <div className="esc-tour-demo-foot">
            In production this calls /api/ai with task: lms_ingest_text. The tour shows fixed copy without billing an AI call.
          </div>
        </>
      ) : null}

      {kind === "lms_vision" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-said">Source: Canvas File · trophic-energy-pyramid.png</div>
            <div className="esc-tour-demo-answer">
              Vision AI OCR detected 7 tier labels & Joules calculations. Synthesized &ldquo;10% Energy Transfer Computation&rdquo; & &ldquo;Thermodynamic Heat Loss&rdquo;.
            </div>
          </div>
          <div className="esc-tour-demo-notice">
            Multimodal Vision OCR parsing — genuine capability displayed via pre-scripted tour sample
          </div>
          <div className="esc-tour-demo-foot">
            In production this calls /api/ai with task: lms_ingest_vision. Pre-scripted here to avoid billing multimodal tokens on every tour play.
          </div>
        </>
      ) : null}

      {kind === "lms_sparse" ? (
        <>
          <div className="esc-tour-demo-thread">
            <div className="esc-tour-demo-said">Source: Canvas Page · Tundra & Desert Stub (&lt;25 words)</div>
            <div className="esc-tour-demo-answer">
              Sparse-content detected (Req 33.5). Seamlessly redirects to Authoring Studio with topic pre-filled.
            </div>
          </div>
          <div className="esc-tour-demo-notice">
            Transparent fallback connects LMS ingestion with plain-language authoring flow
          </div>
          <div className="esc-tour-demo-foot">
            Honest handling of thin LMS source stubs without fabricating fake curriculum substance.
          </div>
        </>
      ) : null}
    </div>
  );
}

export function PedleadTourOverlay() {
  const {
    active,
    position,
    index,
    total,
    isLast,
    isFirst,
    autoPlay,
    toggleAutoPlay,
    next,
    back,
    exit,
  } = usePedleadTour();

  const [rect, setRect] = useState<SpotRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [progress, setProgress] = useState(0);

  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const measure = useCallback(() => {
    if (!position) {
      setRect(null);
      return;
    }
    const target = position.step.target;
    const r = readRect(target);
    setRect((prev) => (sameRect(prev, r) ? prev : r));
    setViewport({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [position]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
  }, [active, position, measure]);

  useEffect(() => {
    if (!active) return;
    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [active, measure]);

  // Scroll spotlight target into view if needed
  useEffect(() => {
    if (!active || !position?.step.target) return;
    const element = document.querySelector<HTMLElement>(
      `[data-tour="${position.step.target}"]`,
    );
    if (element && !elementInViewport(element)) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(measure, 300);
    }
  }, [active, position, measure]);

  // Auto-play progress timer
  useEffect(() => {
    if (!active || !autoPlay || !position) {
      setProgress(0);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const duration = position.step.ms || 14000;
    const interval = 50;
    let elapsed = 0;
    setProgress(0);

    intervalRef.current = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min(100, (elapsed / duration) * 100));
    }, interval);

    timerRef.current = setTimeout(() => {
      if (!isLast) {
        hapticTap();
        next();
      } else {
        exit();
      }
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, autoPlay, position, isLast, next, exit]);

  if (!active || !position) return null;

  const { step, chapter, chapterNumber, stepNumber, stepCount } = position;
  const lit = rect ? litFromRect(rect, viewport) : null;

  return (
    <div className="esc-tour-overlay" aria-live="polite">
      {/* Spotlight cutout mask */}
      {lit ? (
        <div
          className="esc-tour-spotlight"
          style={{
            top: lit.top,
            left: lit.left,
            width: lit.right - lit.left,
            height: lit.bottom - lit.top,
            borderRadius: rect?.radius ?? "16px",
          }}
        />
      ) : (
        <div className="esc-tour-dimmer" />
      )}

      {/* Floating Tour Card */}
      <aside
        className="esc-tour-card"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          maxWidth: 440,
          zIndex: 9999,
        }}
      >
        {/* Auto-play progress bar */}
        {autoPlay ? (
          <div
            className="esc-tour-progress-bar"
            style={{ width: `${progress}%` }}
          />
        ) : null}

        {/* Header: Chapter & Screen badge */}
        <div className="esc-tour-card-header">
          <div className="esc-tour-card-chapter">
            Chapter {chapterNumber} of {TOUR_CHAPTERS.length} · {chapter.title}
          </div>
          <button
            type="button"
            onClick={() => {
              hapticTap();
              exit();
            }}
            className="esc-tour-close"
            aria-label="Exit tour"
          >
            ✕
          </button>
        </div>

        {/* Title & Caption */}
        <h2 className="esc-tour-card-title">{step.title}</h2>
        <p className="esc-tour-card-caption">{step.caption}</p>

        {/* Simulated Demo Card if needed */}
        {step.demoCard ? <PedleadDemoCard kind={step.demoCard} /> : null}

        {/* Step dots */}
        <div className="esc-tour-dots" aria-hidden>
          {TOUR_CHAPTERS.map((ch, chIdx) => {
            const isCurrentChapter = chIdx + 1 === chapterNumber;
            const isPastChapter = chIdx + 1 < chapterNumber;
            return (
              <div
                key={ch.id}
                className={[
                  "esc-tour-chapter-group",
                  isCurrentChapter ? "esc-tour-chapter-group-active" : "",
                ].join(" ")}
              >
                {ch.steps.map((st, stIdx) => {
                  const absoluteIdx = tourPositionAt(
                    TOUR_CHAPTERS.slice(0, chIdx).reduce(
                      (acc, c) => acc + c.steps.length,
                      0,
                    ) + stIdx,
                  );
                  const isCurrentStep = isCurrentChapter && stIdx + 1 === stepNumber;
                  const isPastStep =
                    isPastChapter || (isCurrentChapter && stIdx + 1 < stepNumber);

                  return (
                    <span
                      key={st.id}
                      className={[
                        "esc-tour-dot",
                        isCurrentStep ? "esc-tour-dot-active" : "",
                        isPastStep ? "esc-tour-dot-past" : "",
                      ].join(" ")}
                      title={`${ch.title} (${stIdx + 1}/${ch.steps.length})`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer controls */}
        <div className="esc-tour-card-footer">
          <div className="esc-tour-nav-left">
            <button
              type="button"
              onClick={() => {
                hapticTap();
                toggleAutoPlay();
              }}
              className={[
                "esc-tour-btn",
                "esc-tour-btn-ghost",
                autoPlay ? "esc-tour-btn-active" : "",
              ].join(" ")}
            >
              {autoPlay ? "Pause auto-play" : "Auto-play"}
            </button>
          </div>

          <div className="esc-tour-nav-right">
            {!isFirst && (
              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  back();
                }}
                className="esc-tour-btn esc-tour-btn-secondary"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                hapticTap();
                if (isLast) exit();
                else next();
              }}
              className="esc-tour-btn esc-tour-btn-primary"
            >
              {isLast ? "Done" : "Next ›"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
