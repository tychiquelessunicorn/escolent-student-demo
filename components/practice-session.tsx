"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useDistress } from "@/components/distress-provider";
import {
  BeginningIllustration,
  GapIllustration,
  OutlineIllustration,
  PathIllustration,
  ResumeIllustration,
  SparkIllustration,
} from "@/components/illustrations";
import { useShellState } from "@/components/shell-context";
import { Button, Card, CardBody, CardTitle, InsetPanel } from "@/components/ui";
import {
  FALLBACK_HINT,
  FEEDBACK_LINES,
  NO_SOLUTION_PROBLEM,
  RUBRIC_DOT_COLORS,
  RUBRIC_FALLBACK_FEEDBACK,
  RUBRIC_TIER_LABELS,
  SAVED_INTERRUPTION,
  TWO_STEP_PROBLEMS,
  UNSUPPORTED_SKILL_LABELS,
  VARIABLES_BOTH_SIDES_PROBLEMS,
  type PracticeProblem,
  type SyncFreshness,
} from "@/lib/demo-data";
import { hapticConfirm, hapticSoft, hapticTap } from "@/lib/haptics";

/** Visible empty/sparse-state motif — large enough to read as part of the product. */
function Motif({ children }: { children: ReactNode }) {
  return (
    <div className="esc-illust" style={{ marginBottom: 8 }}>
      {children}
    </div>
  );
}

const ILLUST = 112;
type Phase =
  | "checkingSession"
  | "noValidSession"
  | "notificationPreview"
  | "resumePrompt"
  | "gate"
  | "closed"
  | "intro"
  | "active"
  | "correct"
  | "ended"
  | "offlineBlocked"
  | "skillUnavailable"
  | "rubricGrading"
  | "rubricResult";

type EntryVariant = "returning" | "first_time" | "first_exposure" | "nothing_due";

interface State {
  phase: Phase;
  problemIndex: number;
  wrongAnswers: number[];
  answerInput: string;
  sessionCompleted: number;
  streak: number;
  showMasteryMsg: boolean;
  breakthrough: boolean;
  ladderExhausted: boolean;
  connectivity: SyncFreshness;
  askOpen: boolean;
  askText: string;
  askLoading: boolean;
  askResponse: string;
  hintText: string;
  hintLoading: boolean;
  endReason: "stopped" | "finished" | null;
  exhaustedCount: number;
  introText: string;
  introLoading: boolean;
  workedLensText: string;
  workedLensLoading: boolean;
  pendingSyncQueue: { problemText: string; value: number; correct: boolean }[];
  isSyncingQueue: boolean;
  justSynced: boolean;
  offlineBlockedVariant: EntryVariant | null;
  interruptionHandled: boolean;
  rubricTier: string | null;
  rubricFeedback: string;
}

const INTRO_FALLBACK =
  "Think of an equation like a balance scale: whatever you do to one side, you have to do to the other to keep it level. Right now you've got x-terms sitting on both sides, so the first move is to get them onto one side — the same subtract-to-balance move you've been using in two-step equations, just applied one extra time before you're back to a problem you already know how to finish.";

const ASK_FALLBACK =
  "Couldn't reach the hint helper right now — try tapping through to the next step instead.";

const TIER_NAMES = ["Worked example", "Guided steps", "Hint", "On your own"];

function baseState(phase: Phase): State {
  return {
    phase,
    problemIndex: 0,
    wrongAnswers: [],
    answerInput: "",
    sessionCompleted: 0,
    streak: 0,
    showMasteryMsg: false,
    breakthrough: false,
    ladderExhausted: false,
    connectivity: "fresh",
    askOpen: false,
    askText: "",
    askLoading: false,
    askResponse: "",
    hintText: "",
    hintLoading: false,
    endReason: null,
    exhaustedCount: 0,
    introText: "",
    introLoading: false,
    workedLensText: "",
    workedLensLoading: false,
    pendingSyncQueue: [],
    isSyncingQueue: false,
    justSynced: false,
    offlineBlockedVariant: null,
    interruptionHandled: false,
    rubricTier: null,
    rubricFeedback: "",
  };
}

/**
 * Changing a harness variant has to restart Entry, not patch a running session,
 * so the inner component is keyed on the variant signature and remounts.
 */
export function PracticeSession() {
  const params = useSearchParams();
  const signature = HARNESS_PARAMS.map((key) => params.get(key) ?? "").join("|");
  return <PracticeSessionInner key={signature} />;
}

export const HARNESS_PARAMS = [
  "entryVariant",
  "connectivityDemo",
  "interruptionDemo",
  "directOpenDemo",
  "problemDemo",
  "notificationPreviewDemo",
  "aiHintsEnabled",
  "skill",
] as const;

function PracticeSessionInner() {
  const params = useSearchParams();
  const { setConnectivity, setHeaderNote } = useShellState();
  const { checkFreeText } = useDistress();

  // Test-harness variants. Query params are the mechanism, the demo panel is
  // the discoverable way to drive them.
  const entryVariant = (params.get("entryVariant") ??
    "first_exposure") as EntryVariant;
  const connectivityDemo = params.get("connectivityDemo") ?? "auto";
  const interruptionDemo = params.get("interruptionDemo") ?? "none";
  const directOpenDemo = params.get("directOpenDemo") ?? "not_applicable";
  const problemDemo = params.get("problemDemo") ?? "standard";
  const notificationPreviewDemo =
    params.get("notificationPreviewDemo") ?? "not_applicable";
  const aiHintsEnabled = params.get("aiHintsEnabled") !== "false";
  const skillParam = params.get("skill");

  const isRubricDemo = problemDemo === "no_solution_rubric";
  const isVariablesSkill =
    entryVariant === "first_exposure" || skillParam === "variables_both_sides";
  const isFirstExposure = isVariablesSkill;
  const isUnsupportedSkill = Boolean(
    skillParam && UNSUPPORTED_SKILL_LABELS[skillParam],
  );

  const getProblems = useCallback((): PracticeProblem[] => {
    if (isRubricDemo) return [NO_SOLUTION_PROBLEM];
    return isVariablesSkill ? VARIABLES_BOTH_SIDES_PROBLEMS : TWO_STEP_PROBLEMS;
  }, [isRubricDemo, isVariablesSkill]);

  const evaluationStrategy = isRubricDemo ? "rubric_llm" : "exact_match";

  const [state, setState] = useState<State>(() => baseState("intro"));
  const [submitFlash, setSubmitFlash] = useState<"ok" | "miss" | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFlash = useCallback((kind: "ok" | "miss") => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setSubmitFlash(kind);
    flashTimer.current = setTimeout(() => setSubmitFlash(null), 520);
  }, []);
  const patch = useCallback(
    (update: Partial<State> | ((s: State) => Partial<State>)) => {
      setState((s) => ({
        ...s,
        ...(typeof update === "function" ? update(s) : update),
      }));
    },
    [],
  );

  /**
   * Single source of truth for effective connectivity: a live sync always shows
   * syncing, otherwise the demo override wins when set, otherwise real state.
   */
  const conn: SyncFreshness = state.isSyncingQueue
    ? "syncing"
    : connectivityDemo !== "auto"
      ? (connectivityDemo as SyncFreshness)
      : state.connectivity;

  // ---- AI calls, all routed through the server proxy ----

  const callAi = useCallback(
    async (payload: Record<string, unknown>): Promise<string | null> => {
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) return null;
        const data = (await response.json()) as { text?: string };
        return data.text?.trim() || null;
      } catch {
        return null;
      }
    },
    [],
  );

  /**
   * First-exposure instruction: fixed concrete/analogy Lens, bridged to the
   * prerequisite. The fallback shows immediately so the student never waits on
   * a blank card, and the generated version replaces it when it lands.
   */
  const generateIntro = useCallback(async () => {
    patch({ introLoading: false, introText: INTRO_FALLBACK });
    const text = await callAi({ task: "intro" });
    if (text) patch({ introText: text });
  }, [callAi, patch]);

  /**
   * The ladder's worked-example tier, on a first-exposure skill's first wrong
   * attempt: the same rung, showing a different Lens. Not a second mechanism
   * running alongside the ladder — one ladder.
   */
  const generateWorkedLens = useCallback(
    async (problemIndex: number) => {
      const problem = VARIABLES_BOTH_SIDES_PROBLEMS[problemIndex];
      const fallback = `Let's walk through ${problem.text} one step at a time: first get all the x-terms onto one side by subtracting the smaller one from both sides, then handle the leftover constant the same way you would in a two-step equation, then divide to get x alone. Try it again from the start with that order.`;
      patch({ workedLensLoading: true, workedLensText: "" });
      const text = await callAi({ task: "worked_lens", problemIndex });
      patch({ workedLensLoading: false, workedLensText: text || fallback });
    },
    [callAi, patch],
  );

  const generateHint = useCallback(
    async (problemIndex: number, wrongAnswers: number[]) => {
      if (!aiHintsEnabled) {
        patch({ hintText: FALLBACK_HINT });
        return;
      }
      patch({ hintLoading: true, hintText: "" });
      const text = await callAi({
        task: "hint",
        skillKey: isVariablesSkill ? "variables_both_sides" : "two_step",
        problemIndex,
        wrongAnswers,
      });
      patch({ hintLoading: false, hintText: text || FALLBACK_HINT });
    },
    [aiHintsEnabled, callAi, isVariablesSkill, patch],
  );

  // ---- Entry ----

  const enterSession = useCallback(() => {
    // The rubric demo takes priority and bypasses the ladder, first-exposure,
    // and every other Entry state — it is testing rubric grading, not those.
    if (isRubricDemo) {
      patch({
        phase: "active",
        problemIndex: 0,
        wrongAnswers: [],
        answerInput: "",
        rubricTier: null,
        rubricFeedback: "",
      });
      return;
    }
    // A skill with no real content is an honest dead end rather than silently
    // loading the wrong skill's problems under the right label.
    if (isUnsupportedSkill) {
      patch({ phase: "skillUnavailable" });
      return;
    }
    // 'expired' behaves identically to 'none' — the saved state is never surfaced.
    if (interruptionDemo === "recent" && entryVariant !== "first_exposure") {
      patch({ phase: "resumePrompt" });
      return;
    }
    if (entryVariant === "nothing_due") {
      patch({ phase: "gate" });
      return;
    }
    if (isVariablesSkill) {
      if (conn === "unavailable") {
        patch({ phase: "offlineBlocked", offlineBlockedVariant: "first_exposure" });
        return;
      }
      patch({ phase: "intro" });
      void generateIntro();
      return;
    }
    patch({ phase: "active" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conn,
    entryVariant,
    generateIntro,
    interruptionDemo,
    isRubricDemo,
    isUnsupportedSkill,
    isVariablesSkill,
    patch,
  ]);

  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    /**
     * Requirement 1.7-1.8, direct open: arriving at Escolent directly via a
     * bookmark, PWA icon or URL rather than clicking through from the LMS.
     * 'not_applicable' is an ordinary LMS launch. 'valid_session' shows a brief
     * check then proceeds through the same shared entry path any launch uses.
     * 'no_valid_session' stops before Entry — there is no standalone Student
     * login, so the only honest way back in is the LMS.
     */
    if (notificationPreviewDemo === "shown") {
      patch({ phase: "notificationPreview" });
      return;
    }
    if (directOpenDemo === "no_valid_session") {
      patch({ phase: "noValidSession" });
      return;
    }
    if (directOpenDemo === "valid_session") {
      patch({ phase: "checkingSession" });
      const timer = setTimeout(() => enterSession(), 900);
      return () => clearTimeout(timer);
    }
    enterSession();
  }, [directOpenDemo, enterSession, notificationPreviewDemo, patch]);

  // ---- Connectivity: auto-recovery and queue sync ----

  const syncQueue = useCallback(() => {
    patch({ isSyncingQueue: true });
    setTimeout(() => {
      patch({ pendingSyncQueue: [], isSyncingQueue: false, justSynced: true });
      setTimeout(() => patch({ justSynced: false }), 1600);
    }, 1300);
  }, [patch]);

  /**
   * Continuing an already-loaded session works offline; starting a genuinely
   * new one needs connectivity. A blocked load resumes on its own the moment
   * connectivity returns — there is no retry button anywhere.
   *
   * This watches effective connectivity rather than the raw internal field,
   * which is what makes recovery actually fire when the offline state came from
   * the demo override.
   */
  const prevConn = useRef<SyncFreshness>(conn);
  useEffect(() => {
    const reconnected = prevConn.current === "unavailable" && conn !== "unavailable";
    prevConn.current = conn;
    if (!reconnected) return;

    if (state.phase === "offlineBlocked" && state.offlineBlockedVariant) {
      const variant = state.offlineBlockedVariant;
      setState({
        ...baseState(
          variant === "nothing_due"
            ? "gate"
            : isVariablesSkill
              ? "intro"
              : "active",
        ),
      });
      if (variant === "first_exposure") void generateIntro();
      return;
    }
    if (state.pendingSyncQueue.length > 0 && !state.isSyncingQueue) syncQueue();
  }, [
    conn,
    generateIntro,
    isVariablesSkill,
    state.isSyncingQueue,
    state.offlineBlockedVariant,
    state.pendingSyncQueue.length,
    state.phase,
    syncQueue,
  ]);

  // ---- Answers ----

  const handleSubmit = () => {
    if (isRubricDemo) {
      void handleRubricSubmit();
      return;
    }
    if (state.answerInput.trim() === "") return;

    hapticTap();

    const raw = state.answerInput;
    // Requirement 18.1 names practice responses explicitly, so the answer field
    // is a monitored surface like any other.
    checkFreeText("practice_answer", raw);

    const problems = getProblems();
    const problem = problems[state.problemIndex];
    const value = Number.parseFloat(raw);
    const offline = conn === "unavailable";
    const correct =
      !Number.isNaN(value) &&
      problem.answer !== undefined &&
      Math.abs(value - problem.answer) < 1e-9;
    const nextWrong = correct ? state.wrongAnswers : [...state.wrongAnswers, value];

    const apply = () => {
      patch((s) => {
        const queue = offline
          ? [...s.pendingSyncQueue, { problemText: problem.text, value, correct }]
          : s.pendingSyncQueue;

        if (correct) {
          const firstTry = s.wrongAnswers.length === 0;
          let newStreak = firstTry ? s.streak + 1 : 0;
          const crossedMastery = newStreak >= 3;
          if (crossedMastery) newStreak = 0;
          return {
            connectivity: offline ? s.connectivity : "fresh",
            phase: "correct" as Phase,
            streak: newStreak,
            showMasteryMsg: crossedMastery,
            breakthrough: isFirstExposure && !firstTry,
            sessionCompleted: s.sessionCompleted + 1,
            answerInput: "",
            pendingSyncQueue: queue,
          };
        }

        return {
          connectivity: offline ? s.connectivity : "fresh",
          wrongAnswers: nextWrong,
          answerInput: "",
          ladderExhausted: nextWrong.length >= 5,
          pendingSyncQueue: queue,
        };
      });

      if (correct) {
        hapticConfirm();
        triggerFlash("ok");
      } else {
        hapticSoft();
        triggerFlash("miss");
      }
      if (
        isFirstExposure &&
        nextWrong.length === 1 &&
        !state.workedLensText &&
        !state.workedLensLoading
      ) {
        void generateWorkedLens(state.problemIndex);
      }
      if (nextWrong.length === 3 && !state.hintText && !state.hintLoading) {
        void generateHint(state.problemIndex, nextWrong);
      }
    };

    // Offline: evaluate and advance the ladder immediately, client-side, and
    // queue the response for sync. No round trip is needed for the decision.
    if (offline) {
      apply();
      return;
    }

    patch({ connectivity: "syncing" });
    setTimeout(apply, 550);
  };

  /**
   * Genuine rubric_llm grading. The AI is primary; the regex below is only a
   * fallback for a failed call or unusable output, exactly as before.
   */
  const handleRubricSubmit = async () => {
    if (state.answerInput.trim() === "") return;
    hapticTap();
    const text = state.answerInput;
    checkFreeText("practice_rubric", text);
    patch({ phase: "rubricGrading" });

    const lower = text.toLowerCase();
    const mentionsNoSolution =
      /no solution|cannot be solved|can.t be solved|no value of x|never true|not possible/.test(
        lower,
      );
    const mentionsReasoning =
      /cancel|same coefficient|both sides|contradiction|false|3\s*=\s*7|not equal|never true/.test(
        lower,
      );
    const fallbackTier = mentionsNoSolution
      ? mentionsReasoning
        ? "strong"
        : "weak"
      : "incorrect";

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "rubric_grade", response: text }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as { tier?: string; feedback?: string };
      const tier = data.tier ?? fallbackTier;
      patch({
        phase: "rubricResult",
        rubricTier: tier,
        rubricFeedback: data.feedback?.trim() || RUBRIC_FALLBACK_FEEDBACK[tier],
      });
      if (tier === "strong") hapticConfirm();
      else hapticSoft();
    } catch {
      patch({
        phase: "rubricResult",
        rubricTier: fallbackTier,
        rubricFeedback: RUBRIC_FALLBACK_FEEDBACK[fallbackTier],
      });
      hapticSoft();
    }
  };

  const handleAskSubmit = async () => {
    const question = state.askText.trim();
    if (question === "") return;

    hapticTap();
    // Detection runs alongside answering, not instead of it. It deliberately
    // does not gate the answer: the classifier runs on a stronger, slower model
    // and making every question wait on it would be a worse experience for no
    // safety gain.
    checkFreeText("practice_ask", question);

    patch({ askLoading: true, askResponse: "" });
    const text = await callAi({
      task: "practice_ask",
      skillKey: isVariablesSkill ? "variables_both_sides" : "two_step",
      problemIndex: state.problemIndex,
      question,
    });
    patch({ askLoading: false, askResponse: text || ASK_FALLBACK });
  };

  // ---- Navigation within the session ----

  const advanceOrEnd = (extra: Partial<State> = {}) => {
    const hasMore = state.problemIndex + 1 < getProblems().length;
    if (hasMore) {
      patch({
        phase: "active",
        problemIndex: state.problemIndex + 1,
        wrongAnswers: [],
        ladderExhausted: false,
        showMasteryMsg: false,
        breakthrough: false,
        askOpen: false,
        askText: "",
        askResponse: "",
        hintText: "",
        hintLoading: false,
        answerInput: "",
        ...extra,
      });
    } else {
      patch({ phase: "ended", endReason: "finished" });
    }
  };

  // ---- Derived view values ----

  const problems = getProblems();
  const problem = problems[state.problemIndex];
  const wrongCount = state.wrongAnswers.length;
  const hasMore = state.problemIndex + 1 < problems.length;
  const skillDisplayName = isVariablesSkill
    ? "variables on both sides"
    : "two-step equations";

  const sessionLabel =
    state.sessionCompleted === 0
      ? "Just getting started"
      : state.sessionCompleted === 1
        ? "1 problem this session"
        : `${state.sessionCompleted} problems this session`;

  useEffect(() => {
    setConnectivity(conn);
  }, [conn, setConnectivity]);

  useEffect(() => {
    setHeaderNote(sessionLabel);
    return () => setHeaderNote("");
  }, [sessionLabel, setHeaderNote]);

  let reasonLine = "Let's continue with two-step equations — you were close last time.";
  if (entryVariant === "first_time") reasonLine = "Let's start with two-step equations.";
  if (entryVariant === "nothing_due")
    reasonLine = "Since you're here — a two-step equations problem, just for practice.";
  if (isVariablesSkill) reasonLine = "Give this one a try.";
  if (isRubricDemo)
    reasonLine = "This one asks you to explain your thinking — not just give a number.";

  const queueCount = state.pendingSyncQueue.length;
  const showQueueBanner = queueCount > 0 || state.isSyncingQueue || state.justSynced;
  const queueBannerText = state.isSyncingQueue
    ? "Syncing…"
    : state.justSynced
      ? "Synced"
      : queueCount === 1
        ? "1 response saved — will sync when back online"
        : `${queueCount} responses saved — will sync when back online`;

  let endedMessage = "";
  if (state.endReason === "stopped") {
    endedMessage = `${
      sessionLabel === "Just getting started"
        ? "A little practice on"
        : `${state.sessionCompleted} problem${state.sessionCompleted === 1 ? "" : "s"} on`
    } ${skillDisplayName} today.`;
  } else if (state.endReason === "finished") {
    endedMessage = `That's everything queued for ${skillDisplayName} today — ${state.sessionCompleted} problem${state.sessionCompleted === 1 ? "" : "s"} done.`;
  }
  if (state.exhaustedCount > 0) {
    endedMessage += " We'll come back to the one that didn't click yet.";
  }

  const tiers = TIER_NAMES.map((name, i) => {
    const idx = wrongCount - 1;
    const status = idx > i ? "done" : idx === i ? "current" : "upcoming";
    return {
      name,
      dotBg:
        status === "upcoming"
          ? "var(--color-mastery-not-attempted)"
          : "var(--color-accent)",
      dotBorder:
        status === "upcoming" ? "1px solid var(--color-mastery-not-attempted)" : "none",
      textColor:
        status === "current"
          ? "var(--color-content-primary)"
          : "var(--color-content-muted)",
      fontWeight: status === "current" ? 700 : 500,
    };
  });

  const wrapper = {
    maxWidth: "var(--container-focused)",
    margin: "0 auto",
    padding: "8px 24px 90px",
    minHeight: "100vh",
    boxSizing: "border-box" as const,
  };

  const achievementBanner = (text: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--color-achievement-subtle)",
        color: "var(--color-achievement-heading)",
        fontSize: 14,
        padding: "12px 16px",
        borderRadius: "var(--radius-control)",
        marginBottom: 24,
      }}
    >
      <SparkIllustration />
      <div>{text}</div>
    </div>
  );

  return (
    <div style={wrapper}>
      {showQueueBanner ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--color-content-secondary)",
            background: "var(--color-accent-subtle)",
            borderRadius: 999,
            padding: "5px 12px",
            marginBottom: 20,
          }}
        >
          {queueBannerText}
        </div>
      ) : null}

      {state.phase === "notificationPreview" ? (
        <Card>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "var(--color-content-muted)",
              marginBottom: 20,
            }}
          >
            Mockup — preview of a system notification, not a live send
          </div>
          <a
            href="/practice?skill=variables_both_sides"
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              maxWidth: 380,
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-shell)",
              padding: "14px 16px",
              boxShadow: "0 2px 10px oklch(24% 0.014 55 / 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  background: "var(--color-accent)",
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Escolent</div>
              <div style={{ fontSize: 12, color: "var(--color-content-muted)" }}>now</div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.4 }}>
              Variables on both sides is ready for review.
            </div>
          </a>
          <div
            style={{
              fontSize: 13,
              color: "var(--color-content-secondary)",
              marginTop: 20,
            }}
          >
            Tapping it opens Practice Session with that skill pre-selected — the same
            ?skill= routing Progress already uses for &ldquo;Practice this now.&rdquo;
          </div>
        </Card>
      ) : null}

      {state.phase === "checkingSession" ? (
        <div
          style={{
            fontSize: 14,
            color: "var(--color-content-muted)",
            animation: "esc-pulse 1.3s ease-in-out infinite",
            padding: "8px 0",
          }}
        >
          Checking your session…
        </div>
      ) : null}

      {state.phase === "noValidSession" ? (
        <Card key="noValidSession">
          <Motif>
            <OutlineIllustration size={ILLUST} />
          </Motif>
          <CardTitle>Open Escolent from Canvas</CardTitle>
          <CardBody>
            We couldn&rsquo;t find an active session for you here. Open Escolent from
            Canvas to get started — that&rsquo;s where your practice is launched from.
          </CardBody>
        </Card>
      ) : null}

      {state.phase === "resumePrompt" ? (
        <Card key="resumePrompt">
          <Motif>
            <ResumeIllustration size={ILLUST} />
          </Motif>
          <CardTitle>Resume where you left off?</CardTitle>
          <CardBody style={{ lineHeight: 1.55, marginBottom: 28 }}>
            Two-step equations — problem {SAVED_INTERRUPTION.problemIndex + 1} of{" "}
            {TWO_STEP_PROBLEMS.length}, {SAVED_INTERRUPTION.wrongAnswers.length} tries in.
          </CardBody>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              onClick={() =>
                patch({
                  interruptionHandled: true,
                  phase: entryVariant === "nothing_due" ? "gate" : "active",
                })
              }
            >
              Start fresh instead
            </Button>
            <Button
              onClick={() =>
                patch({
                  interruptionHandled: true,
                  phase: "active",
                  problemIndex: SAVED_INTERRUPTION.problemIndex,
                  wrongAnswers: [...SAVED_INTERRUPTION.wrongAnswers],
                  answerInput: "",
                  ladderExhausted: false,
                })
              }
            >
              Resume
            </Button>
          </div>
        </Card>
      ) : null}

      {state.phase === "gate" ? (
        <Card key="gate" style={{ textAlign: "left" }}>
          <Motif>
            <PathIllustration size={ILLUST} />
          </Motif>
          <CardTitle>Nothing&rsquo;s due right now.</CardTitle>
          <CardBody style={{ lineHeight: 1.55, marginBottom: 28 }}>
            Want to try a two-step equations problem, just for practice?
          </CardBody>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => patch({ phase: "closed" })}>
              Not now
            </Button>
            <Button onClick={() => patch({ phase: "active" })}>
              Sure, let&rsquo;s try one
            </Button>
          </div>
        </Card>
      ) : null}

      {state.phase === "offlineBlocked" ? (
        <Card key="offlineBlocked">
          <Motif>
            <GapIllustration size={ILLUST} />
          </Motif>
          <CardTitle>You&rsquo;re offline</CardTitle>
          <CardBody>
            This is new content, so it needs a connection to load. It&rsquo;ll pick up on
            its own as soon as you&rsquo;re back online.
          </CardBody>
        </Card>
      ) : null}

      {state.phase === "skillUnavailable" ? (
        <Card key="skillUnavailable">
          <Motif>
            <OutlineIllustration size={ILLUST} />
          </Motif>
          <CardTitle>Not part of the demo yet</CardTitle>
          <CardBody>
            {(skillParam && UNSUPPORTED_SKILL_LABELS[skillParam]) || "This skill"}{" "}
            isn&rsquo;t wired up in this prototype — only two-step equations and variables
            on both sides have real practice content right now.
          </CardBody>
        </Card>
      ) : null}

      {state.phase === "rubricGrading" ? (
        <Card>
          <div
            style={{
              fontSize: 15,
              color: "var(--color-content-muted)",
              animation: "esc-pulse 1.3s ease-in-out infinite",
            }}
          >
            Checking your reasoning…
          </div>
        </Card>
      ) : null}

      {state.phase === "rubricResult" && state.rubricTier ? (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: RUBRIC_DOT_COLORS[state.rubricTier],
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: 17, fontWeight: 600 }}>
              {RUBRIC_TIER_LABELS[state.rubricTier]}
            </div>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
            {state.rubricFeedback}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {state.rubricTier !== "strong" ? (
              <Button
                onClick={() =>
                  patch({
                    phase: "active",
                    answerInput: "",
                    rubricTier: null,
                    rubricFeedback: "",
                  })
                }
              >
                Try again
              </Button>
            ) : (
              <Button onClick={() => patch({ phase: "ended", endReason: "stopped" })}>
                Finish for today
              </Button>
            )}
          </div>
        </Card>
      ) : null}

      {state.phase === "intro" ? (
        <Card key="intro" area="practice">
          <Motif>
            <BeginningIllustration size={ILLUST} />
          </Motif>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-area-practice-fg)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              marginBottom: 12,
            }}
          >
            New skill: Variables on both sides
          </div>
          {state.introLoading ? (
            <div
              style={{
                fontSize: 15,
                color: "var(--color-content-muted)",
                animation: "esc-pulse 1.3s ease-in-out infinite",
              }}
            >
              Getting this ready…
            </div>
          ) : null}
          {!state.introLoading && state.introText ? (
            <>
              <div style={{ fontSize: 16, lineHeight: 1.65, marginBottom: 28 }}>
                {state.introText}
              </div>
              <Button
                onClick={() =>
                  patch({
                    phase: "active",
                    problemIndex: 0,
                    wrongAnswers: [],
                    answerInput: "",
                    askOpen: false,
                    askText: "",
                    askResponse: "",
                    hintText: "",
                    ladderExhausted: false,
                  })
                }
              >
                Let&rsquo;s try one
              </Button>
            </>
          ) : null}
        </Card>
      ) : null}

      {state.phase === "closed" ? (
        <Card key="closed" subtleBorder>
          <Motif>
            <PathIllustration size={ILLUST} />
          </Motif>
          <CardTitle>All clear for now</CardTitle>
          <CardBody>Okay — nothing else scheduled right now. Check back later.</CardBody>
        </Card>
      ) : null}

      {state.phase === "ended" ? (
        <Card key="ended">
          <Motif>
            {entryVariant === "first_time" ? (
              <BeginningIllustration size={ILLUST} />
            ) : (
              <PathIllustration size={ILLUST} />
            )}
          </Motif>
          <CardTitle>Nice work today.</CardTitle>
          <CardBody>{endedMessage}</CardBody>
        </Card>
      ) : null}

      {state.phase === "active" || state.phase === "correct" ? (
        <Card
          key={`${state.phase}-${state.problemIndex}-${state.sessionCompleted}`}
          className={
            submitFlash === "ok"
              ? "esc-flash-ok"
              : submitFlash === "miss"
                ? "esc-flash-miss"
                : undefined
          }
        >
          {state.phase === "correct" ? (
            <>
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--color-mastery-durable)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: 17, fontWeight: 600 }}>
                  {FEEDBACK_LINES[state.sessionCompleted % FEEDBACK_LINES.length]}
                </div>
              </div>

              {state.showMasteryMsg
                ? achievementBanner(
                    "That's three in a row with good gaps — this one's sticking.",
                  )
                : null}
              {state.breakthrough
                ? achievementBanner(
                    "Variables on both sides just clicked — that's a new skill landing.",
                  )
                : null}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {state.sessionCompleted >= 2 && hasMore ? (
                  <Button
                    variant="ghost"
                    onClick={() => patch({ phase: "ended", endReason: "stopped" })}
                  >
                    Stop for now
                  </Button>
                ) : null}
                <Button onClick={() => advanceOrEnd()} style={{ marginLeft: "auto" }}>
                  {hasMore ? "Next problem" : "Finish for today"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {state.sessionCompleted === 0 ? (
                <Motif>
                  <BeginningIllustration size={ILLUST} />
                </Motif>
              ) : null}
              <div
                style={{
                  fontSize: 15,
                  color: "var(--color-content-secondary)",
                  marginBottom: 18,
                }}
              >
                {reasonLine}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: "0.01em",
                  marginBottom: 24,
                }}
              >
                {problem.text}
              </div>

              {state.ladderExhausted ? (
                <InsetPanel style={{ padding: "20px 22px" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 18,
                      marginBottom: 8,
                    }}
                  >
                    Let&rsquo;s come back to this one.
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--color-content-secondary)",
                      lineHeight: 1.55,
                      marginBottom: 18,
                    }}
                  >
                    This one hasn&rsquo;t clicked yet. We&rsquo;ll pick it up again another
                    time — let&rsquo;s try something else for now.
                  </div>
                  <Button
                    onClick={() =>
                      advanceOrEnd({
                        streak: 0,
                        exhaustedCount: state.exhaustedCount + 1,
                      })
                    }
                  >
                    {hasMore ? "Next problem" : "Finish for today"}
                  </Button>
                </InsetPanel>
              ) : null}

              {wrongCount >= 1 && !state.ladderExhausted ? (
                <>
                  <div
                    className="esc-ladder-row"
                    style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 20 }}
                  >
                    {tiers.map((tier) => (
                      <div
                        key={tier.name}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          width: 64,
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: tier.dotBg,
                            border: tier.dotBorder,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 11,
                            marginTop: 6,
                            textAlign: "center",
                            color: tier.textColor,
                            fontWeight: tier.fontWeight,
                          }}
                        >
                          {tier.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  {wrongCount === 1 && !isFirstExposure ? (
                    <InsetPanel>
                      <div
                        style={{
                          color: "var(--color-content-muted)",
                          fontSize: 12,
                          marginBottom: 6,
                        }}
                      >
                        Here&rsquo;s a similar one, worked out:
                      </div>
                      <div>{problem.similarText}</div>
                      <div>{problem.similarStep1}</div>
                      <div style={{ marginBottom: 8 }}>{problem.similarStep2}</div>
                      <div style={{ color: "var(--color-content-secondary)" }}>
                        Now try yours again.
                      </div>
                    </InsetPanel>
                  ) : null}

                  {wrongCount === 1 && isFirstExposure ? (
                    <InsetPanel>
                      {state.workedLensLoading ? (
                        <div
                          style={{
                            color: "var(--color-content-muted)",
                            animation: "esc-pulse 1.3s ease-in-out infinite",
                          }}
                        >
                          Thinking of another way to show this…
                        </div>
                      ) : (
                        <div>{state.workedLensText}</div>
                      )}
                    </InsetPanel>
                  ) : null}

                  {wrongCount === 2 ? (
                    <InsetPanel>
                      <div>{problem.partialStep}</div>
                      <div
                        style={{ color: "var(--color-content-secondary)", marginTop: 6 }}
                      >
                        Now solve for x from here.
                      </div>
                    </InsetPanel>
                  ) : null}

                  {wrongCount === 3 ? (
                    <div
                      style={{
                        background: "var(--color-accent-subtle)",
                        border: "1px solid var(--color-accent-subtle-border)",
                        borderRadius: "var(--radius-shell)",
                        padding: "18px 20px",
                        marginBottom: 20,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: "var(--color-accent-strong)",
                      }}
                    >
                      {state.hintLoading ? (
                        <div style={{ animation: "esc-pulse 1.3s ease-in-out infinite" }}>
                          Thinking of a good hint…
                        </div>
                      ) : (
                        <div>{state.hintText}</div>
                      )}
                    </div>
                  ) : null}

                  {wrongCount === 4 ? (
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--color-content-secondary)",
                        marginBottom: 20,
                      }}
                    >
                      Give this one your best shot — you&rsquo;ve got the tools.
                    </div>
                  ) : null}

                  {wrongCount >= 1 && wrongCount <= 4 ? (
                    <div style={{ marginBottom: 20 }}>
                      {!state.askOpen ? (
                        <button
                          type="button"
                          onClick={() => patch({ askOpen: true })}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            fontFamily: "var(--font-body)",
                            fontSize: 13,
                            color: "var(--color-content-muted)",
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                        >
                          Ask a specific question
                        </button>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <input
                              type="text"
                              placeholder="e.g. why do we subtract first"
                              value={state.askText}
                              onChange={(event) =>
                                patch({ askText: event.target.value })
                              }
                              style={{
                                flex: 1,
                                boxSizing: "border-box",
                                fontFamily: "var(--font-body)",
                                fontSize: 14,
                                padding: "8px 12px",
                                borderRadius: "var(--radius-control)",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface-raised)",
                                color: "var(--color-content-primary)",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void handleAskSubmit()}
                              style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 13,
                                fontWeight: 600,
                                padding: "8px 14px",
                                borderRadius: "var(--radius-control)",
                                border: "1.5px solid var(--color-accent-subtle-border)",
                                background: "transparent",
                                color: "var(--color-accent)",
                                cursor: "pointer",
                              }}
                            >
                              Ask
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                patch({ askOpen: false, askText: "", askResponse: "" })
                              }
                              style={{
                                background: "none",
                                border: "none",
                                fontSize: 13,
                                color: "var(--color-content-muted)",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                          {state.askLoading ? (
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--color-content-muted)",
                                marginTop: 8,
                                animation: "esc-pulse 1.3s ease-in-out infinite",
                              }}
                            >
                              Thinking…
                            </div>
                          ) : null}
                          {!state.askLoading && state.askResponse ? (
                            <div
                              style={{
                                marginTop: 10,
                                background: "var(--color-surface)",
                                borderRadius: "var(--radius-control)",
                                padding: "12px 14px",
                                fontSize: 14,
                                lineHeight: 1.55,
                              }}
                            >
                              {state.askResponse}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}

              {!state.ladderExhausted ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {evaluationStrategy !== "rubric_llm" ? (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                        x =
                      </div>
                      <input
                        type="text"
                        placeholder="?"
                        value={state.answerInput}
                        onChange={(event) => patch({ answerInput: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleSubmit();
                        }}
                        style={{
                          flex: 1,
                          boxSizing: "border-box",
                          fontFamily: "var(--font-body)",
                          fontSize: 16,
                          padding: "10px 14px",
                          borderRadius: "var(--radius-control)",
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface-raised)",
                          color: "var(--color-content-primary)",
                        }}
                      />
                    </>
                  ) : (
                    <textarea
                      rows={3}
                      placeholder="Explain your answer…"
                      value={state.answerInput}
                      onChange={(event) => patch({ answerInput: event.target.value })}
                      style={{
                        flex: 1,
                        boxSizing: "border-box",
                        fontFamily: "var(--font-body)",
                        fontSize: 15,
                        padding: "10px 14px",
                        borderRadius: "var(--radius-control)",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-raised)",
                        color: "var(--color-content-primary)",
                        resize: "vertical",
                      }}
                    />
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={state.answerInput.trim() === ""}
                    style={{ padding: "11px 22px", flexShrink: 0 }}
                  >
                    Submit
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
