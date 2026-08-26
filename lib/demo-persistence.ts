/** Investor-demo persistence shared across Student shell screens. */

import type { MasteryTier, Skill } from "@/lib/demo-data/types";

const COMPLETED_KEY = "variables_completed";
const LEGACY_MASTERED_KEY = "variablesOnBothSides";
const OFFLINE_SESSION_KEY = "esc_demo_offline";
const DEMO_CONTROLS_KEY = "esc_demo_controls";
const CURRENT_SPACE_KEY = "esc_demo_space";
const TOUR_MODE_KEY = "esc_demo_tour";
/** @deprecated Migrated to TOUR_MODE_KEY */
const LEGACY_PITCH_MODE_KEY = "esc_demo_pitch";
const MIRROR_PREFIX = "esc_mirror_";

export const DEMO_TOTAL_DAILY_TASKS = 3;
export const DEMO_PERSIST_EVENT = "esc-demo-persist";

export type DemoSeed = "fresh" | "mastered";
export const DEMO_DEFAULT_SPACE_ID = "math";

const KNOWN_SPACE_IDS = new Set(["math", "geography", "english", "algebra", "life_sciences"]);

function normalizeSpaceId(value: string | null): string {
  if (value === "algebra") return "math";
  if (value === "life_sciences") return "geography";
  if (value === "math" || value === "geography" || value === "english") {
    return value;
  }
  return DEMO_DEFAULT_SPACE_ID;
}

function mirrorSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem(MIRROR_PREFIX + key, value);
  } catch {
    /* ignore */
  }
}

function mirrorGet(key: string): string | null {
  try {
    const primary = localStorage.getItem(key);
    if (primary != null) return primary;
  } catch {
    /* ignore */
  }
  try {
    return sessionStorage.getItem(MIRROR_PREFIX + key);
  } catch {
    return null;
  }
}

function mirrorRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(MIRROR_PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function isVariablesCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      mirrorGet(COMPLETED_KEY) === "true" ||
      mirrorGet(LEGACY_MASTERED_KEY) === "mastered"
    );
  } catch {
    return false;
  }
}

function notifyPersist(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEMO_PERSIST_EVENT));
}

const LEGACY_STREAK_KEYS = ["streak", "demoStreak"] as const;

/** Remove gamification keys left by earlier demo builds. Safe to call on every load. */
export function purgeLegacyGamificationKeys(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_STREAK_KEYS) {
    mirrorRemove(key);
  }
}

export function completeVictoryLoop(): void {
  if (typeof window === "undefined") return;
  mirrorSet(COMPLETED_KEY, "true");
  mirrorSet(LEGACY_MASTERED_KEY, "mastered");
  notifyPersist();
}

export function seedDemoState(seed: DemoSeed): void {
  if (typeof window === "undefined") return;
  if (seed === "mastered") {
    completeVictoryLoop();
  } else {
    mirrorRemove(COMPLETED_KEY);
    mirrorRemove(LEGACY_MASTERED_KEY);
  }
  purgeLegacyGamificationKeys();
  // Pitch seeds should not inherit a leftover offline block.
  try {
    sessionStorage.removeItem(OFFLINE_SESSION_KEY);
  } catch {
    /* ignore */
  }
  notifyPersist();
}

export function resetDemoState(): void {
  seedDemoState("fresh");
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

export function readDemoControlsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DEMO_CONTROLS_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeDemoControlsEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DEMO_CONTROLS_KEY, value ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export function readTourMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(TOUR_MODE_KEY) === "true") return true;
    // Migrate leftover pitch flag from earlier builds.
    if (sessionStorage.getItem(LEGACY_PITCH_MODE_KEY) === "true") {
      sessionStorage.setItem(TOUR_MODE_KEY, "true");
      sessionStorage.removeItem(LEGACY_PITCH_MODE_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function writeTourMode(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TOUR_MODE_KEY, value ? "true" : "false");
    sessionStorage.removeItem(LEGACY_PITCH_MODE_KEY);
  } catch {
    /* ignore */
  }
}

export function readDemoSpaceId(): string {
  if (typeof window === "undefined") return DEMO_DEFAULT_SPACE_ID;
  try {
    return normalizeSpaceId(sessionStorage.getItem(CURRENT_SPACE_KEY));
  } catch {
    /* ignore */
  }
  return DEMO_DEFAULT_SPACE_ID;
}

export function writeDemoSpaceId(spaceId: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeSpaceId(spaceId);
  if (!KNOWN_SPACE_IDS.has(spaceId) && !KNOWN_SPACE_IDS.has(normalized)) {
    return;
  }
  try {
    sessionStorage.setItem(CURRENT_SPACE_KEY, normalized);
  } catch {
    /* ignore */
  }
  notifyPersist();
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

/** Soft-land free-roam taps on skills that aren't in today's live practice set. */
export const RELATED_PRACTICE_FOR_SKILL: Record<
  string,
  { href: string; label: string; blurb: string }
> = {
  equation_basics: {
    href: "/student/practice?skill=two_step",
    label: "Two-step equations",
    blurb: "Balance skills stay sharp through two-step practice.",
  },
  integer_operations: {
    href: "/student/practice?skill=one_step",
    label: "One-step equations",
    blurb: "Integer fluency shows up first in one-step moves.",
  },
  multi_step: {
    href: "/student/practice?skill=two_step",
    label: "Two-step equations",
    blurb: "Multi-step builds on the two-step ladder you're already on.",
  },
  inequalities: {
    href: "/student/practice?skill=variables_both_sides",
    label: "Variables on both sides",
    blurb: "Inequalities come after variables on both sides in Equations.",
  },
  map_scale: {
    href: "/student/learn?space=geography",
    label: "Geography on Learn",
    blurb: "Open the Geography Space for this skill's lesson beat.",
  },
  climate_zones: {
    href: "/student/learn?space=geography",
    label: "Geography on Learn",
    blurb: "Open the Geography Space for this skill's lesson beat.",
  },
  population_density: {
    href: "/student/learn?space=geography",
    label: "Geography on Learn",
    blurb: "Open the Geography Space for this skill's lesson beat.",
  },
  thesis_statements: {
    href: "/student/learn?space=english",
    label: "English on Learn",
    blurb: "Open the English Space for this skill's lesson beat.",
  },
  evidence_citations: {
    href: "/student/learn?space=english",
    label: "English on Learn",
    blurb: "Open the English Space for this skill's lesson beat.",
  },
  paragraph_structure: {
    href: "/student/learn?space=english",
    label: "English on Learn",
    blurb: "Open the English Space for this skill's lesson beat.",
  },
  food_chains: {
    href: "/student/learn?space=geography",
    label: "Geography on Learn",
    blurb: "Open Geography for related lesson beats in this demo.",
  },
  cells_basics: {
    href: "/student/learn?space=geography",
    label: "Geography on Learn",
    blurb: "Open Geography for related lesson beats in this demo.",
  },
  photosynthesis_intro: {
    href: "/student/learn?space=geography",
    label: "Geography on Learn",
    blurb: "Open Geography for related lesson beats in this demo.",
  },
};
