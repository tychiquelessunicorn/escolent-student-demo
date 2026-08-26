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
import { useShellState } from "@/components/shell-context";
import { completeVictoryLoop, seedDemoState } from "@/lib/demo-persistence";
import {
  normalizeTourHref,
  TOUR_CHAPTER_COUNT,
  TOUR_STEP_COUNT,
  tourPositionAt,
  type TourPosition,
  type TourStage,
} from "@/lib/tour";

interface TourValue {
  active: boolean;
  position: TourPosition | null;
  /** Declarative screen instructions for the current step. */
  stage: TourStage | null;
  chapterCount: number;
  index: number;
  total: number;
  isLast: boolean;
  autoPlay: boolean;
  toggleAutoPlay: () => void;
  next: () => void;
  restart: () => void;
  exit: () => void;
}

const EMPTY: TourValue = {
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
  restart: () => undefined,
  exit: () => undefined,
};

const TourContext = createContext<TourValue>(EMPTY);

/**
 * Drives the chaptered `?tour=1` walkthrough. It owns exactly one piece of
 * state — which step we are on — and derives everything else, including the
 * route. Screens read `stage` off the current step rather than being told
 * which step is running, so no screen has to know the tour's shape.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const { tourMode, exitTour } = useShellState();
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const active = tourMode;
  const position = active ? tourPositionAt(index) : null;
  const step = position?.step ?? null;
  const isLast = index >= TOUR_STEP_COUNT - 1;

  /**
   * Guards the navigation effect: a push is attempted at most once per step, so
   * a route that Next.js normalizes differently than we do can never loop.
   */
  const navigatedFor = useRef<number | null>(null);

  useEffect(() => {
    if (active) return;
    setIndex(0);
    setAutoPlay(false);
    navigatedFor.current = null;
  }, [active]);

  // Every state the tour shows is a route, so advancing a step is a navigation.
  useEffect(() => {
    if (!active || !step) return;
    if (navigatedFor.current === index) return;
    navigatedFor.current = index;
    const here = normalizeTourHref(
      window.location.pathname + window.location.search,
    );
    if (here === normalizeTourHref(step.href)) return;
    router.push(step.href);
    // pathname is a dependency so a step that lands on the route it is already
    // on still settles rather than waiting on a navigation that never happens.
  }, [active, index, pathname, router, step]);

  /**
   * Mastery is a consequence the later chapters depend on: Progress reads
   * durable in chapter 6 because chapter 3 happened. Recorded here rather than
   * inside the practice screen so `?problemDemo=mastery_moment` on its own
   * stays a pure view of that state.
   */
  useEffect(() => {
    if (!active || !step?.marksMastery) return;
    completeVictoryLoop();
  }, [active, step]);

  const next = useCallback(() => {
    setIndex((current) => Math.min(current + 1, TOUR_STEP_COUNT - 1));
  }, []);

  useEffect(() => {
    if (!active || !autoPlay || isLast || !step) return;
    const timer = window.setTimeout(next, step.ms);
    return () => window.clearTimeout(timer);
  }, [active, autoPlay, index, isLast, next, step]);

  const toggleAutoPlay = useCallback(() => setAutoPlay((value) => !value), []);

  const restart = useCallback(() => {
    seedDemoState("fresh");
    navigatedFor.current = null;
    setIndex(0);
  }, []);

  const exit = useCallback(() => {
    setAutoPlay(false);
    exitTour();
  }, [exitTour]);

  const value = useMemo<TourValue>(
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
      restart,
      exit,
    }),
    [
      active,
      autoPlay,
      index,
      isLast,
      next,
      position,
      restart,
      exit,
      step,
      toggleAutoPlay,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourValue {
  return useContext(TourContext);
}
