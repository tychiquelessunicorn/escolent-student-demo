"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { DemoBktBanner } from "@/components/demo-bkt-banner";
import { PracticeHelpDrawer } from "@/components/practice-help-drawer";
import { PracticeRemediationModal } from "@/components/practice-remediation-modal";
import { PracticeVictoryModal } from "@/components/practice-victory-modal";
import { SessionEndActions } from "@/components/session-end-actions";
import { Button, Card, CardBody, CardTitle, InsetPanel } from "@/components/ui";
import {
  completeVictoryLoop,
  isVariablesCompleted,
  readDemoOffline,
  RELATED_PRACTICE_FOR_SKILL,
} from "@/lib/demo-persistence";
import {
  FALLBACK_HINT,
  FEEDBACK_LINES,
  INVESTOR_HINT_CHAIN,
  NO_SOLUTION_PROBLEM,
  ONE_STEP_PROBLEMS,
  RUBRIC_DOT_COLORS,
  RUBRIC_FALLBACK_FEEDBACK,
  RUBRIC_TIER_LABELS,
  SAVED_INTERRUPTION,
  TWO_STEP_PROBLEMS,
  VARIABLES_BOTH_SIDES_PROBLEMS,
  isPlayablePracticeSkill,
  labelForPracticeSkill,
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
  /** In-session first-try correct count for mastery crossing — not persisted. */
  consecutiveFirstTry: number;
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
  inputInvalid: boolean;
  inputWrong: boolean;
  inputErrorMessage: string;
  socraticHintLoading: boolean;
  socraticHintText: string;
  showVictoryModal: boolean;
  endedWithMastery: boolean;
  helpDrawerOpen: boolean;
  helpDrawerLoading: boolean;
  helpDrawerContent: string;
  pageHelpNotes: { content: string }[];
  showRemediationModal: boolean;
}

const INTRO_FALLBACK =
  "Think of an equation like a balance scale: whatever you do to one side, you have to do to the other to keep it level. Right now you've got x-terms sitting on both sides, so the first move is to get them onto one side — the same subtract-to-balance move you've been using in two-step equations, just applied one extra time before you're back to a problem you already know how to finish.";

/**
 * Shared in-flight intro fetch. Survives React StrictMode remounts so the
 * first-exposure Lens call is one network request per skill key, not two.
 */
const introInFlight = new Map<string, Promise<string>>();
const INTRO_SKILL_KEY = "variables_both_sides";

const ASK_FALLBACK =
  "Couldn't reach the hint helper right now — try tapping through to the next step instead.";

const NUMERIC_ANSWER_RE = /^-?\d+(\.\d+)?$/;

const TIER_NAMES = ["Worked example", "Guided steps", "Hint", "On your own"];

function hintForAttempt(attempt: number): string {
  const idx = Math.min(Math.max(attempt, 1), INVESTOR_HINT_CHAIN.length) - 1;
  return INVESTOR_HINT_CHAIN[idx];
}

function baseState(phase: Phase): State {
  return {
    phase,
    problemIndex: 0,
    wrongAnswers: [],
    answerInput: "",
    sessionCompleted: 0,
    consecutiveFirstTry: 0,
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
    inputInvalid: false,
    inputWrong: false,
    inputErrorMessage: "",
    socraticHintLoading: false,
    socraticHintText: "",
    showVictoryModal: false,
    endedWithMastery: false,
    helpDrawerOpen: false,
    helpDrawerLoading: false,
    helpDrawerContent: "",
    pageHelpNotes: [],
    showRemediationModal: false,
  };
}

/**
 * Harness variants remount PracticeSessionInner. Initial paint must already
 * match the demo route — waiting for enterSession() in an effect flashes the
 * wrong phase (intro before scaffold, etc.) and makes the tour flicker.
 */
function initialHarnessState(params: URLSearchParams): State {
  const skillParam = params.get("skill");
  const entryVariant = (params.get("entryVariant") ??
    (skillParam && skillParam !== "variables_both_sides"
      ? "returning"
      : "first_exposure")) as EntryVariant;
  const problemDemo = params.get("problemDemo") ?? "standard";
  const directOpenDemo = params.get("directOpenDemo") ?? "not_applicable";
  const notificationPreviewDemo =
    params.get("notificationPreviewDemo") ?? "not_applicable";
  const interruptionDemo = params.get("interruptionDemo") ?? "none";

  const isRubricDemo = problemDemo === "no_solution_rubric";
  const isScaffoldDemo = problemDemo === "wrong_answer_scaffold";
  const isMasteryDemo = problemDemo === "mastery_moment";
  const isOneStepRemediation = skillParam === "one_step";
  const isVariablesSkill =
    skillParam === "variables_both_sides" ||
    (!skillParam && entryVariant === "first_exposure");
  const isUnsupportedSkill = Boolean(
    skillParam && !isPlayablePracticeSkill(skillParam),
  );

  if (notificationPreviewDemo === "shown") {
    return baseState("notificationPreview");
  }
  if (directOpenDemo === "no_valid_session") {
    return baseState("noValidSession");
  }
  if (directOpenDemo === "valid_session") {
    return baseState("checkingSession");
  }
  if (isRubricDemo) {
    return {
      ...baseState("active"),
      problemIndex: 0,
      wrongAnswers: [],
      answerInput: "",
      rubricTier: null,
      rubricFeedback: "",
    };
  }
  if (isScaffoldDemo) {
    return {
      ...baseState("active"),
      problemIndex: 0,
      wrongAnswers: [8, 3],
      answerInput: "",
      ladderExhausted: false,
      socraticHintLoading: false,
      socraticHintText: hintForAttempt(2),
    };
  }
  if (isMasteryDemo) {
    return {
      ...baseState("correct"),
      problemIndex: 0,
      wrongAnswers: [],
      answerInput: "",
      sessionCompleted: 1,
      breakthrough: true,
    };
  }
  if (isUnsupportedSkill) {
    return baseState("skillUnavailable");
  }
  if (
    interruptionDemo === "recent" &&
    entryVariant !== "first_exposure" &&
    !isVariablesSkill
  ) {
    return baseState("resumePrompt");
  }
  if (entryVariant === "nothing_due") {
    return baseState("gate");
  }
  if (isOneStepRemediation) {
    return {
      ...baseState("active"),
      problemIndex: 0,
      wrongAnswers: [],
      answerInput: "",
    };
  }
  if (isVariablesSkill) {
    if (isVariablesCompleted()) {
      return {
        ...baseState("active"),
        problemIndex: 0,
        wrongAnswers: [],
        answerInput: "",
        introText: "",
        introLoading: false,
      };
    }
    return {
      ...baseState("intro"),
      introLoading: false,
      introText: INTRO_FALLBACK,
    };
  }
  return baseState("active");
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
  const router = useRouter();
  const {
    setConnectivity,
    setHeaderNote,
    registerPracticeHelp,
    demoOffline,
    demoControls,
  } = useShellState();
  const { checkFreeText } = useDistress();

  // Test-harness variants. Query params are the mechanism, the demo panel is
  // the discoverable way to drive them.
  // Bare /student/practice defaults to first-exposure variables. An explicit ?skill=
  // always wins so Progress / schedule links don't get overridden.
  const skillParam = params.get("skill");
  const entryVariant = (params.get("entryVariant") ??
    (skillParam && skillParam !== "variables_both_sides"
      ? "returning"
      : "first_exposure")) as EntryVariant;
  const connectivityDemo = params.get("connectivityDemo") ?? "auto";
  const interruptionDemo = params.get("interruptionDemo") ?? "none";
  const directOpenDemo = params.get("directOpenDemo") ?? "not_applicable";
  const problemDemo = params.get("problemDemo") ?? "standard";
  const notificationPreviewDemo =
    params.get("notificationPreviewDemo") ?? "not_applicable";
  const aiHintsEnabled = params.get("aiHintsEnabled") !== "false";

  const isRubricDemo = problemDemo === "no_solution_rubric";
  /**
   * Two seeded mid-session states. The scaffold and the mastery moment are both
   * things a student reaches by answering, which makes them unreachable to a
   * guided walkthrough that never types — so each is also addressable as a
   * route, exactly like every other demo variant.
   */
  const isScaffoldDemo = problemDemo === "wrong_answer_scaffold";
  const isMasteryDemo = problemDemo === "mastery_moment";
  const isOneStepRemediation = skillParam === "one_step";
  const isVariablesSkill =
    skillParam === "variables_both_sides" ||
    (!skillParam && entryVariant === "first_exposure");
  const [alreadyMastered, setAlreadyMastered] = useState(false);
  const isFirstExposure = isVariablesSkill && !alreadyMastered;
  // Soft-land any non-playable skill rather than silently loading another's problems.
  const isUnsupportedSkill = Boolean(
    skillParam && !isPlayablePracticeSkill(skillParam),
  );

  const getProblems = useCallback((): PracticeProblem[] => {
    if (isRubricDemo) return [NO_SOLUTION_PROBLEM];
    if (isOneStepRemediation) return ONE_STEP_PROBLEMS;
    return isVariablesSkill ? VARIABLES_BOTH_SIDES_PROBLEMS : TWO_STEP_PROBLEMS;
  }, [isOneStepRemediation, isRubricDemo, isVariablesSkill]);

  const evaluationStrategy = isRubricDemo ? "rubric_llm" : "exact_match";
  const isInvestorDemo =
    isVariablesSkill && getProblems().length === 1 && !isRubricDemo;

  const [state, setState] = useState<State>(() => initialHarnessState(params));
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
   * Effective connectivity: live sync wins, then harness param, then the
   * header offline toggle, otherwise session state.
   */
  const conn: SyncFreshness = state.isSyncingQueue
    ? "syncing"
    : connectivityDemo !== "auto"
      ? (connectivityDemo as SyncFreshness)
      : demoOffline
        ? "unavailable"
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
   * prerequisite. Fires at most once per skill for this session instance;
   * in-flight work is deduped across StrictMode remounts; a stale response
   * never overwrites text the student is already reading.
   */
  const introRequestId = useRef(0);
  const introCommitted = useRef(false);
  const introStarted = useRef(false);

  const generateIntro = useCallback(async () => {
    if (introCommitted.current) return;
    if (introStarted.current) return;
    introStarted.current = true;

    // Instant pitch-safe copy — never block the walkthrough on the AI call.
    const requestId = ++introRequestId.current;
    introCommitted.current = true;
    patch({ introLoading: false, introText: INTRO_FALLBACK });

    let pending = introInFlight.get(INTRO_SKILL_KEY);
    if (!pending) {
      pending = (async () => {
        const text = await callAi({ task: "intro" });
        return text || INTRO_FALLBACK;
      })();
      introInFlight.set(INTRO_SKILL_KEY, pending);
    }

    try {
      const text = await pending;
      if (requestId !== introRequestId.current) return;
      if (text && text !== INTRO_FALLBACK) {
        patch({ introText: text });
      }
    } catch {
      introInFlight.delete(INTRO_SKILL_KEY);
    }
  }, [callAi, patch]);

  /** Allow a deliberate re-fetch after session state was fully reset (e.g. offline recovery). */
  const restartIntroGeneration = useCallback(() => {
    introCommitted.current = false;
    introStarted.current = false;
    introRequestId.current += 1;
    introInFlight.delete(INTRO_SKILL_KEY);
  }, []);

  /**
   * The ladder's worked-example tier, on a first-exposure skill's first wrong
   * attempt: the same rung, showing a different Lens. Not a second mechanism
   * running alongside the ladder — one ladder.
   */
  const workedLensRequestId = useRef(0);
  const generateWorkedLens = useCallback(
    async (problemIndex: number) => {
      const problem = VARIABLES_BOTH_SIDES_PROBLEMS[problemIndex];
      const fallback = `Let's walk through ${problem.text} one step at a time: first get all the x-terms onto one side by subtracting the smaller one from both sides, then handle the leftover constant the same way you would in a two-step equation, then divide to get x alone. Try it again from the start with that order.`;
      const requestId = ++workedLensRequestId.current;
      patch({ workedLensLoading: true, workedLensText: "" });
      const text = await callAi({ task: "worked_lens", problemIndex });
      if (requestId !== workedLensRequestId.current) return;
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
    /**
     * Two wrong attempts in: the ladder is showing its guided-step rung, with
     * the mini-step and the matching hint from the same chain a real second
     * attempt would have produced. Nothing here is faked further along than the
     * attempt count implies.
     */
    if (isScaffoldDemo) {
      patch({
        phase: "active",
        problemIndex: 0,
        wrongAnswers: [8, 3],
        answerInput: "",
        ladderExhausted: false,
        socraticHintLoading: false,
        socraticHintText: hintForAttempt(2),
      });
      return;
    }
    // The first-exposure resolve, which is one of the two moments allowed to
    // use the achievement accent.
    if (isMasteryDemo) {
      patch({
        phase: "correct",
        problemIndex: 0,
        wrongAnswers: [],
        answerInput: "",
        sessionCompleted: 1,
        breakthrough: true,
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
    // Resume fixture is two-step only; variables never restores a mismatched index.
    if (
      interruptionDemo === "recent" &&
      entryVariant !== "first_exposure" &&
      !isVariablesSkill
    ) {
      patch({ phase: "resumePrompt" });
      return;
    }
    if (entryVariant === "nothing_due") {
      patch({ phase: "gate" });
      return;
    }
    if (isOneStepRemediation) {
      patch({
        phase: "active",
        problemIndex: 0,
        wrongAnswers: [],
        answerInput: "",
      });
      return;
    }
    if (isVariablesSkill) {
      if (conn === "unavailable") {
        patch({ phase: "offlineBlocked", offlineBlockedVariant: "first_exposure" });
        return;
      }
      // After victory, skip the "New skill" intro so Today/Practice agree.
      if (isVariablesCompleted()) {
        patch({
          phase: "active",
          problemIndex: 0,
          wrongAnswers: [],
          answerInput: "",
          introText: "",
          introLoading: false,
        });
        return;
      }
      // Commit pitch-safe copy in the same state update as the intro phase so
      // the walkthrough never paints an empty / loading-blocked intro.
      patch({
        phase: "intro",
        introLoading: false,
        introText: INTRO_FALLBACK,
      });
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
    isMasteryDemo,
    isRubricDemo,
    isScaffoldDemo,
    isOneStepRemediation,
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
      return () => {
        clearTimeout(timer);
        // StrictMode tears this effect down and immediately runs it again.
        // Without releasing the run-once guard here the second pass returns
        // early, the cleared timer is never replaced, and Entry is stranded on
        // "Checking your session…" forever.
        mounted.current = false;
      };
    }
    enterSession();
    // enterSession is intentionally omitted: including it re-runs Entry whenever
    // conn / generateIntro identity shifts and can kick off a second intro call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directOpenDemo, notificationPreviewDemo, patch]);

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
      const nextPhase =
        variant === "nothing_due"
          ? "gate"
          : isVariablesSkill
            ? "intro"
            : "active";
      setState({
        ...baseState(nextPhase),
        ...(nextPhase === "intro"
          ? { introLoading: false, introText: INTRO_FALLBACK }
          : {}),
      });
      if (variant === "first_exposure") {
        restartIntroGeneration();
        void generateIntro();
      }
      return;
    }
    if (state.pendingSyncQueue.length > 0 && !state.isSyncingQueue) syncQueue();
  }, [
    conn,
    generateIntro,
    isVariablesSkill,
    restartIntroGeneration,
    state.isSyncingQueue,
    state.offlineBlockedVariant,
    state.pendingSyncQueue.length,
    state.phase,
    syncQueue,
  ]);

  // ---- Answers ----

  const openHelpDrawer = useCallback(() => {
    patch({ helpDrawerOpen: true, helpDrawerLoading: false, helpDrawerContent: "" });
  }, [patch]);

  useEffect(() => {
    registerPracticeHelp(openHelpDrawer);
    return () => registerPracticeHelp(null);
  }, [openHelpDrawer, registerPracticeHelp]);

  const simulateHelpResponse = useCallback(
    (content: string) => {
      // Close the drawer immediately so the backdrop doesn't trap the session.
      patch({
        helpDrawerOpen: false,
        helpDrawerLoading: true,
        helpDrawerContent: "",
      });
      setTimeout(() => {
        patch((s) => ({
          helpDrawerLoading: false,
          helpDrawerContent: content,
          pageHelpNotes: [...s.pageHelpNotes, { content }],
          socraticHintText: content,
          socraticHintLoading: false,
        }));
      }, 800);
    },
    [patch],
  );

  const handleHelpOption = useCallback(
    (kind: "socratic" | "steps" | "concept") => {
      if (kind === "socratic") {
        const attempt = Math.max(1, state.wrongAnswers.length || 1);
        simulateHelpResponse(hintForAttempt(attempt));
        return;
      }
      if (kind === "steps") {
        simulateHelpResponse(
          "Step 1: Subtract 2x from both sides → 3x + 3 = 18\nStep 2: Subtract 3 from both sides → 3x = 15\nStep 3: Divide both sides by 3 → x = 5",
        );
        return;
      }
      simulateHelpResponse(
        "When x appears on both sides, the goal is to collect all variable terms on one side — just like balancing a scale. Once they're together, you're back to a two-step equation you already know how to finish.",
      );
    },
    [simulateHelpResponse, state.wrongAnswers.length],
  );

  const finalizeEnded = useCallback(
    (endReason: "stopped" | "finished", extra: Partial<State> = {}) => {
      const withMastery = isVariablesSkill && state.sessionCompleted >= 1;
      if (withMastery) completeVictoryLoop();
      patch({
        phase: "ended",
        endReason,
        endedWithMastery: withMastery,
        ...extra,
      });
    },
    [isVariablesSkill, patch, state.sessionCompleted],
  );

  const handleSubmit = () => {
    if (isRubricDemo) {
      void handleRubricSubmit();
      return;
    }

    if (isInvestorDemo && state.phase === "active") {
      const raw = state.answerInput.trim();
      if (raw === "" || !NUMERIC_ANSWER_RE.test(raw)) {
        patch({ inputInvalid: true, inputErrorMessage: "Please enter a number." });
        hapticSoft();
        setTimeout(
          () => patch({ inputInvalid: false, inputErrorMessage: "" }),
          1200,
        );
        return;
      }

      hapticTap();
      checkFreeText("practice_answer", raw);

      const problem = getProblems()[0];
      const expected = problem?.answer ?? 5;
      const val = Number.parseFloat(raw);
      if (Math.abs(val - expected) < 1e-9) {
        completeVictoryLoop();
        hapticConfirm();
        triggerFlash("ok");
        patch({
          showVictoryModal: true,
          phase: "ended",
          endReason: "finished",
          endedWithMastery: true,
          sessionCompleted: Math.max(1, state.sessionCompleted + 1),
          inputInvalid: false,
          inputWrong: false,
          inputErrorMessage: "",
          socraticHintLoading: false,
          socraticHintText: "",
          answerInput: String(expected),
          connectivity: "fresh",
        });
        return;
      }

      const nextWrong = [...state.wrongAnswers, val];
      const attempt = nextWrong.length;
      const hintText = hintForAttempt(attempt);

      patch({
        socraticHintLoading: true,
        socraticHintText: "",
        inputWrong: true,
        inputInvalid: false,
        inputErrorMessage: "",
        wrongAnswers: nextWrong,
        answerInput: "",
      });
      hapticSoft();
      triggerFlash("miss");
      setTimeout(() => {
        patch({
          socraticHintLoading: false,
          socraticHintText: hintText,
          inputWrong: false,
        });
      }, 800);
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
          let nextFirstTry = firstTry ? s.consecutiveFirstTry + 1 : 0;
          const crossedMastery = nextFirstTry >= 3;
          if (crossedMastery) nextFirstTry = 0;
          return {
            connectivity: offline ? s.connectivity : "fresh",
            phase: "correct" as Phase,
            consecutiveFirstTry: nextFirstTry,
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
      finalizeEnded("finished", extra);
    }
  };

  // ---- Derived view values ----

  const problems = getProblems();
  const problem = problems[state.problemIndex];
  const wrongCount = state.wrongAnswers.length;
  const hasMore = state.problemIndex + 1 < problems.length;
  const skillDisplayName = isVariablesSkill
    ? "variables on both sides"
    : isOneStepRemediation
      ? "one-step equations"
      : "two-step equations";

  const sessionLabel =
    state.sessionCompleted === 0
      ? "Just getting started"
      : state.sessionCompleted === 1
        ? "1 problem this session"
        : `${state.sessionCompleted} problems this session`;

  useEffect(() => {
    setAlreadyMastered(isVariablesCompleted());
  }, []);

  useEffect(() => {
    setConnectivity(conn);
  }, [conn, setConnectivity]);

  useEffect(() => {
    return () => {
      setConnectivity(readDemoOffline() ? "unavailable" : "fresh");
    };
  }, [setConnectivity]);

  useEffect(() => {
    setHeaderNote(sessionLabel);
    return () => setHeaderNote("");
  }, [sessionLabel, setHeaderNote]);

  let reasonLine = "Let's continue with two-step equations — you were close last time.";
  if (entryVariant === "first_time") reasonLine = "Let's start with two-step equations.";
  if (entryVariant === "nothing_due")
    reasonLine = "Since you're here — a two-step equations problem, just for practice.";
  if (isVariablesSkill)
    reasonLine = alreadyMastered
      ? "You've got this skill — one more clean solve to keep it sharp."
      : "Give this one a try.";
  if (isOneStepRemediation)
    reasonLine =
      "Foundational review — rebuild this one-step move, then return to variables on both sides.";
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

  const achievementBanner = (text: string) => (
    <div
      data-tour="practice-achievement"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--color-achievement-subtle)",
        border: "1.5px solid var(--color-achievement-border)",
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
    <div className="esc-screen">
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

      {demoControls ? (
        <div className="esc-demo-tools">
          <button
            type="button"
            className="esc-demo-chip esc-pressable"
            onClick={() => patch({ showRemediationModal: true })}
          >
            Simulate Diagnostic Gap
          </button>
        </div>
      ) : null}

      {state.phase === "notificationPreview" ? (
        <Card area="practice" dataTour="practice-notification">
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
            href="/student/practice?skill=variables_both_sides"
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
        <Card key="noValidSession" area="practice">
          <Motif>
            <OutlineIllustration size={ILLUST} />
          </Motif>
          <CardTitle>Open Escolent from Canvas</CardTitle>
          <CardBody>
            We couldn&rsquo;t find an active session for you here. Open Escolent from
            Canvas to get started — that&rsquo;s where your practice is launched from.
          </CardBody>
          <SessionEndActions />
        </Card>
      ) : null}

      {state.phase === "resumePrompt" ? (
        <Card key="resumePrompt" area="practice" dataTour="practice-resume">
          <Motif>
            <ResumeIllustration size={ILLUST} />
          </Motif>
          <CardTitle>Resume where you left off?</CardTitle>
          <CardBody style={{ lineHeight: 1.55, marginBottom: 28 }}>
            Two-step equations — problem {SAVED_INTERRUPTION.problemIndex + 1} of{" "}
            {TWO_STEP_PROBLEMS.length}, {SAVED_INTERRUPTION.wrongAnswers.length} tries in.
          </CardBody>
          <div className="esc-practice-actions">
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
        <Card key="gate" area="practice" style={{ textAlign: "left" }}>
          <Motif>
            <PathIllustration size={ILLUST} />
          </Motif>
          <CardTitle>Nothing&rsquo;s due right now.</CardTitle>
          <CardBody style={{ lineHeight: 1.55, marginBottom: 28 }}>
            Want to try a two-step equations problem, just for practice?
          </CardBody>
          <div className="esc-practice-actions">
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
        <Card key="offlineBlocked" area="practice">
          <Motif>
            <GapIllustration size={ILLUST} />
          </Motif>
          <CardTitle>You&rsquo;re offline</CardTitle>
          <CardBody>
            This is new content, so it needs a connection to load. It&rsquo;ll pick up on
            its own as soon as you&rsquo;re back online.
          </CardBody>
          <SessionEndActions />
        </Card>
      ) : null}

      {state.phase === "skillUnavailable" ? (
        <Card key="skillUnavailable" area="practice">
          <Motif>
            <OutlineIllustration size={ILLUST} />
          </Motif>
          <CardTitle>Coming up next in this Space</CardTitle>
          <CardBody style={{ marginBottom: 16 }}>
            <strong>
              {(skillParam && labelForPracticeSkill(skillParam)) || "This skill"}
            </strong>{" "}
            isn&rsquo;t in today&rsquo;s live practice set. Keep the session moving with
            what&rsquo;s due now — or open the lesson on Learn.
          </CardBody>
          {skillParam && RELATED_PRACTICE_FOR_SKILL[skillParam] ? (
            <CardBody style={{ marginBottom: 20, fontSize: 14 }}>
              {RELATED_PRACTICE_FOR_SKILL[skillParam].blurb}
            </CardBody>
          ) : null}
          <div className="esc-ended-actions">
            <Link
              href="/student/practice?skill=variables_both_sides"
              className="esc-btn-primary esc-pressable"
            >
              Practice today&rsquo;s skill
            </Link>
            {skillParam && RELATED_PRACTICE_FOR_SKILL[skillParam] ? (
              <Link
                href={RELATED_PRACTICE_FOR_SKILL[skillParam].href}
                className="esc-btn-secondary esc-pressable"
              >
                {RELATED_PRACTICE_FOR_SKILL[skillParam].href.includes("/learn")
                  ? RELATED_PRACTICE_FOR_SKILL[skillParam].label
                  : `Try ${RELATED_PRACTICE_FOR_SKILL[skillParam].label}`}
              </Link>
            ) : (
              <Link href="/student/today" className="esc-btn-secondary esc-pressable">
                Back to Today
              </Link>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <SessionEndActions />
          </div>
        </Card>
      ) : null}

      {state.phase === "rubricGrading" ? (
        <Card area="practice">
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
        <Card area="practice">
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
          <div className="esc-practice-actions">
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
              <Button onClick={() => finalizeEnded("finished")}>
                Finish for today
              </Button>
            )}
          </div>
        </Card>
      ) : null}

      {state.phase === "intro" ? (
        <Card key="intro" area="practice" dataTour="practice-intro">
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
            <>
              <div
                style={{
                  fontSize: 15,
                  color: "var(--color-content-muted)",
                  animation: "esc-pulse 1.3s ease-in-out infinite",
                  marginBottom: 20,
                }}
              >
                Getting this ready…
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  patch({
                    phase: "active",
                    problemIndex: 0,
                    wrongAnswers: [],
                    answerInput: "",
                    introLoading: false,
                    introText: "",
                    askOpen: false,
                    askText: "",
                    askResponse: "",
                    hintText: "",
                    ladderExhausted: false,
                  })
                }
              >
                Skip intro — try a problem
              </Button>
            </>
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
        <Card key="closed" area="practice" subtleBorder>
          <Motif>
            <PathIllustration size={ILLUST} />
          </Motif>
          <CardTitle>All clear for now</CardTitle>
          <CardBody>Okay — nothing else scheduled right now. Check back later.</CardBody>
          <SessionEndActions />
        </Card>
      ) : null}

      {state.phase === "ended" ? (
        <Card key="ended" area="practice">
          <Motif>
            {entryVariant === "first_time" ? (
              <BeginningIllustration size={ILLUST} />
            ) : (
              <PathIllustration size={ILLUST} />
            )}
          </Motif>
          <CardTitle>Nice work today.</CardTitle>
          <CardBody>{endedMessage}</CardBody>
          {state.endedWithMastery || (isVariablesSkill && state.sessionCompleted >= 1) ? (
            <DemoBktBanner />
          ) : null}
          <SessionEndActions
            extra={
              isOneStepRemediation ? (
                <Link
                  href="/student/practice?skill=variables_both_sides"
                  className="esc-btn-secondary esc-pressable"
                >
                  Return to variables practice
                </Link>
              ) : null
            }
          />
        </Card>
      ) : null}

      {state.phase === "active" || state.phase === "correct" ? (
        <Card
          key={`${state.phase}-${state.problemIndex}-${state.sessionCompleted}`}
          area="practice"
          // The rubric problem is the whole point of its step: the prompt and
          // the free-text control only make sense lit together.
          dataTour={isRubricDemo ? "practice-rubric" : "practice-session-card"}
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

              <div className="esc-practice-actions" style={{ marginTop: 8 }}>
                {state.sessionCompleted >= 2 && hasMore ? (
                  <Button
                    variant="ghost"
                    onClick={() => finalizeEnded("stopped")}
                  >
                    Stop for now
                  </Button>
                ) : null}
                <Button
                  onClick={() => advanceOrEnd()}
                  className="esc-practice-actions-end"
                  style={{ marginLeft: "auto" }}
                >
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
                        consecutiveFirstTry: 0,
                        exhaustedCount: state.exhaustedCount + 1,
                      })
                    }
                  >
                    {hasMore ? "Next problem" : "Finish for today"}
                  </Button>
                </InsetPanel>
              ) : null}

              {wrongCount >= 1 && !state.ladderExhausted ? (
                <div data-tour="practice-scaffold">
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
                </div>
              ) : null}

              {!state.ladderExhausted ? (
                <div className="esc-practice-answer-row">
                  {evaluationStrategy !== "rubric_llm" ? (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                        x =
                      </div>
                      <input
                        type="text"
                        placeholder="?"
                        value={state.answerInput}
                        onChange={(event) =>
                          patch({
                            answerInput: event.target.value,
                            inputInvalid: false,
                            inputWrong: false,
                            inputErrorMessage: "",
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          if (
                            isInvestorDemo &&
                            (state.socraticHintLoading || state.showVictoryModal)
                          ) {
                            return;
                          }
                          handleSubmit();
                        }}
                        disabled={state.showVictoryModal || state.socraticHintLoading}
                        className={
                          state.inputInvalid
                            ? "esc-input-invalid"
                            : state.inputWrong
                              ? "esc-input-wrong"
                              : undefined
                        }
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
                    disabled={
                      isInvestorDemo
                        ? state.socraticHintLoading || state.showVictoryModal
                        : state.answerInput.trim() === ""
                    }
                    style={{ padding: "11px 22px", flexShrink: 0 }}
                  >
                    Submit
                  </Button>
                </div>
              ) : null}
              {state.inputErrorMessage ? (
                <div className="esc-input-error-msg">{state.inputErrorMessage}</div>
              ) : null}
              {state.helpDrawerLoading ? (
                <div className="esc-ai-thinking" style={{ marginTop: 12 }}>
                  <div className="esc-ai-spinner" />
                  AI Thinking…
                </div>
              ) : null}
              {state.pageHelpNotes.map((note, index) => (
                <div key={`help-${index}`} className="esc-help-response" style={{ marginTop: 12 }}>
                  {note.content}
                </div>
              ))}
              {state.socraticHintLoading ? (
                <div className="esc-ai-thinking">
                  <div className="esc-ai-spinner" />
                  AI Thinking…
                </div>
              ) : null}
              {isInvestorDemo &&
              state.wrongAnswers.length >= 2 &&
              !state.socraticHintLoading ? (
                <div className="esc-mini-step">
                  <div className="esc-mini-step-label">Mini-step</div>
                  <div className="esc-mini-step-eq">5x − 2x = ?</div>
                  <div className="esc-mini-step-note">
                    Combine the x terms first, then finish the equation.
                  </div>
                </div>
              ) : null}
              {!state.socraticHintLoading && state.socraticHintText ? (
                <div className="esc-help-response esc-socratic-hint" style={{ marginTop: 12 }}>
                  <div style={{ whiteSpace: "pre-line" }}>{state.socraticHintText}</div>
                </div>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      <PracticeHelpDrawer
        open={state.helpDrawerOpen}
        loading={state.helpDrawerLoading}
        drawerContent={state.helpDrawerContent}
        onClose={() =>
          patch({ helpDrawerOpen: false, helpDrawerLoading: false, helpDrawerContent: "" })
        }
        onSelectOption={handleHelpOption}
      />

      {state.showVictoryModal ? (
        <PracticeVictoryModal
          onReturn={() => {
            completeVictoryLoop();
            router.push("/student/today");
          }}
        />
      ) : null}

      {state.showRemediationModal ? (
        <PracticeRemediationModal
          onStay={() => patch({ showRemediationModal: false })}
        />
      ) : null}
    </div>
  );
}
