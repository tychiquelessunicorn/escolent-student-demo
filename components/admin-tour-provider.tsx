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
  normalizeAdminTourHref,
  readAdminTourMode,
  TOUR_CHAPTER_COUNT,
  TOUR_STEP_COUNT,
  tourPositionAt,
  writeAdminTourMode,
  type AdminTourPosition,
  type AdminTourStage,
} from "@/lib/admin-tour";

interface AdminTourValue {
  active: boolean;
  position: AdminTourPosition | null;
  stage: AdminTourStage | null;
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

const EMPTY: AdminTourValue = {
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

const AdminTourContext = createContext<AdminTourValue>(EMPTY);

export function AdminTourProvider({ children }: { children: React.ReactNode }) {
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
  const navigatedFor = useRef<number | null>(null);

  useEffect(() => {
    let tourFromUrl = false;
    let demoFromUrl = false;
    try {
      const params = new URLSearchParams(window.location.search);
      tourFromUrl = params.get("tour") === "1" || params.get("pitch") === "1";
      demoFromUrl = params.get("demo") === "1";
    } catch {
      /* ignore */
    }

    if (tourFromUrl) {
      writeAdminTourMode(true);
      setActive(true);
    } else if (demoFromUrl) {
      writeAdminTourMode(false);
      setActive(false);
    } else {
      setActive(readAdminTourMode());
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

  useEffect(() => {
    if (!active || !step) return;
    if (navigatedFor.current === index) return;
    navigatedFor.current = index;
    const here = normalizeAdminTourHref(
      window.location.pathname + window.location.search,
    );
    if (here === normalizeAdminTourHref(step.href)) return;
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
    writeAdminTourMode(false);
    setActive(false);
    router.push("/admin/briefing");
  }, [router]);

  const value = useMemo<AdminTourValue>(
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
    <AdminTourContext.Provider value={value}>{children}</AdminTourContext.Provider>
  );
}

export function useAdminTour(): AdminTourValue {
  return useContext(AdminTourContext);
}
