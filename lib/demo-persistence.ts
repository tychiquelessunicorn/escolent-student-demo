/** Investor-demo persistence shared across Student shell screens. */

import type { MasteryTier, Skill } from "@/lib/demo-data/types";

const COMPLETED_KEY = "variables_completed";
const STREAK_KEY = "streak";
const LEGACY_MASTERED_KEY = "variablesOnBothSides";
const LEGACY_STREAK_KEY = "demoStreak";
const OFFLINE_SESSION_KEY = "esc_demo_offline";
const LMS_MODE_KEY = "esc_demo_lms_mode";

export const DEMO_DEFAULT_STREAK = 3;
export const DEMO_COMPLETED_STREAK = 4;
export const DEMO_TOTAL_DAILY_TASKS = 2;
export const DEMO_PERSIST_EVENT = "esc-demo-persist";

export type DemoLmsMode = "standalone" | "classroom";

export function isVariablesCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(COMPLETED_KEY) === "true" ||
      localStorage.getItem(LEGACY_MASTERED_KEY) === "mastered"
    );
  } catch {
    return false;
  }
}

export function getDemoStreak(): number {
  if (typeof window === "undefined") return DEMO_DEFAULT_STREAK;
  try {
    const primary = parseInt(localStorage.getItem(STREAK_KEY) ?? "", 10);
    if (Number.isFinite(primary)) return primary;
    const legacy = parseInt(localStorage.getItem(LEGACY_STREAK_KEY) ?? "", 10);
    if (Number.isFinite(legacy)) return legacy;
    return isVariablesCompleted() ? DEMO_COMPLETED_STREAK : DEMO_DEFAULT_STREAK;
  } catch {
    return DEMO_DEFAULT_STREAK;
  }
}

function notifyPersist(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEMO_PERSIST_EVENT));
}

export function completeVictoryLoop(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPLETED_KEY, "true");
    localStorage.setItem(LEGACY_MASTERED_KEY, "mastered");
    localStorage.setItem(STREAK_KEY, String(DEMO_COMPLETED_STREAK));
    localStorage.setItem(LEGACY_STREAK_KEY, String(DEMO_COMPLETED_STREAK));
  } catch {
    /* demo storage unavailable */
  }
  notifyPersist();
}

export function getCompletedDailyCount(): number {
  return isVariablesCompleted() ? 1 : 0;
}

export function getDailyProgressLabel(): string {
  return `${getCompletedDailyCount()} of ${DEMO_TOTAL_DAILY_TASKS} completed today`;
}

export function readDemoOffline(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(OFFLINE_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeDemoOffline(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OFFLINE_SESSION_KEY, value ? "true" : "false");
  } catch {
    /* demo storage unavailable */
  }
}

export function readDemoLmsMode(): DemoLmsMode {
  if (typeof window === "undefined") return "standalone";
  try {
    return sessionStorage.getItem(LMS_MODE_KEY) === "classroom"
      ? "classroom"
      : "standalone";
  } catch {
    return "standalone";
  }
}

export function writeDemoLmsMode(mode: DemoLmsMode): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LMS_MODE_KEY, mode);
  } catch {
    /* demo storage unavailable */
  }
}

/** Apply victory mastery overlay to the shared skill list (Progress + Learn). */
export function resolveDemoSkill(skill: Skill, mastered: boolean): Skill {
  if (skill.id === "s5" && mastered) {
    return {
      ...skill,
      tier: "durable" as MasteryTier,
      progressDetail: "Just clicked — this one is sticking now.",
    };
  }
  return skill;
}

export function subscribeDemoPersist(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onVisible = () => {
    if (document.visibilityState === "visible") listener();
  };
  window.addEventListener(DEMO_PERSIST_EVENT, listener);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener(DEMO_PERSIST_EVENT, listener);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
