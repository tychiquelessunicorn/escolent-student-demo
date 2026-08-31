"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  normalizeTeacherTourHref,
  readTeacherTourMode,
  TOUR_CHAPTER_COUNT,
  TOUR_STEP_COUNT,
  tourPositionAt,
  writeTeacherTourMode,
  type TeacherTourPosition,
  type TeacherTourStage,
} from "@/lib/teacher-tour";
import { isEmbedParam } from "@/lib/embed";

interface TeacherTourValue {
  active: boolean;
  position: TeacherTourPosition | null;
  /** Declarative screen instructions for the current step. */
  stage: TeacherTourStage | null;
  chapterCount: number;
  index: number;
  total: number;
  isLast: boolean;
  autoPlay: boolean;
  toggleAutoPlay: () => void;
  next: () => void;
  back: () => void;
  isFirst: boolean;
  restart: () => void;
  exit: () => void;
}

const EMPTY: TeacherTourValue = {
  active: false,
  position: null,
  stage: null,
  chapterCount: TOUR_CHAPTER_COUNT,
  index: 0,
  total: TOUR_STEP_COUNT,
  isLast: false,
  autoPlay: false,
  toggleAutoPlay: () => undefined,
  next: () => undefined,
  back: () => undefined,
  isFirst: true,
  restart: () => undefined,
  exit: () => undefined,
};

const TeacherTourContext = createContext<TeacherTourValue>(EMPTY);

/**
 * Drives the chaptered `?tour=1` walkthrough on teacher routes. Self-contained:
 * Teacher layout has no ShellStateProvider, so activation, persistence, and exit
 * live here. Screens read `stage` off the current step rather than knowing the
 * tour's shape.
 */
export function TeacherTourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [booted, setBooted] = useState(false);

  const position = active ? tourPositionAt(index) : null;
  const step = position?.step ?? null;
  const isLast = index >= TOUR_STEP_COUNT - 1;
  const isFirst = index <= 0;

  /**
   * Guards the navigation effect: a push is attempted at most once per step, so
   * a route that Next.js normalizes differently than we do can never loop.
   */
  const navigatedFor = useRef<number | null>(null);

  useEffect(() => {
    let tourFromUrl = false;
    let demoFromUrl = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const embedFromUrl = isEmbedParam(params.get("embed"));
      tourFromUrl = params.get("tour") === "1" || params.get("pitch") === "1";
      demoFromUrl = !embedFromUrl && params.get("demo") === "1";
    } catch {
      /* ignore */
    }

    // Keep separate from the ?demo=1 harness — opening the harness clears tour.
    if (tourFromUrl) {
      writeTeacherTourMode(true);
      setActive(true);
    } else {
      writeTeacherTourMode(false);
      setActive(false);
    }
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted) return;
    if (active) return;
    setIndex(0);
    setAutoPlay(false);
    navigatedFor.current = null;
  }, [active, booted]);

  // Every state the tour shows is a route, so advancing a step is a navigation.
  useEffect(() => {
    if (!active || !step) return;
    if (navigatedFor.current === index) return;
    navigatedFor.current = index;
    const here = normalizeTeacherTourHref(
      window.location.pathname + window.location.search,
    );
    if (here === normalizeTeacherTourHref(step.href)) return;
    router.push(step.href);
  }, [active, index, pathname, router, step]);

  const next = useCallback(() => {
    navigatedFor.current = null;
    setIndex((current) => Math.min(current + 1, TOUR_STEP_COUNT - 1));
  }, []);

  const back = useCallback(() => {
    navigatedFor.current = null;
    setIndex((current) => Math.max(current - 1, 0));
  }, []);

  useEffect(() => {
    if (!active || !autoPlay || isLast || !step) return;
    const timer = window.setTimeout(next, step.ms);
    return () => window.clearTimeout(timer);
  }, [active, autoPlay, index, isLast, next, step]);

  const toggleAutoPlay = useCallback(() => setAutoPlay((value) => !value), []);

  const restart = useCallback(() => {
    navigatedFor.current = null;
    setIndex(0);
  }, []);

  const exit = useCallback(() => {
    setAutoPlay(false);
    writeTeacherTourMode(false);
    setActive(false);
    router.push("/teacher/briefing");
  }, [router]);

  const value = useMemo<TeacherTourValue>(
    () => ({
      active,
      position,
      stage: step?.stage ?? null,
      chapterCount: TOUR_CHAPTER_COUNT,
      index,
      total: TOUR_STEP_COUNT,
      isLast,
      autoPlay,
      toggleAutoPlay,
      next,
      back,
      isFirst,
      restart,
      exit,
    }),
    [
      active,
      autoPlay,
      index,
      isFirst,
      isLast,
      next,
      back,
      position,
      restart,
      exit,
      step,
      toggleAutoPlay,
    ],
  );

  return (
    <TeacherTourContext.Provider value={value}>{children}</TeacherTourContext.Provider>
  );
}

export function useTeacherTour(): TeacherTourValue {
  return useContext(TeacherTourContext);
}
