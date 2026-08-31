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
  normalizePedleadTourHref,
  readPedleadTourMode,
  TOUR_CHAPTER_COUNT,
  TOUR_STEP_COUNT,
  tourPositionAt,
  writePedleadTourMode,
  type PedleadTourPosition,
  type PedleadTourStage,
} from "@/lib/pedlead-tour";
import { isEmbedParam } from "@/lib/embed";

interface PedleadTourValue {
  active: boolean;
  position: PedleadTourPosition | null;
  stage: PedleadTourStage | null;
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

const EMPTY: PedleadTourValue = {
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

const PedleadTourContext = createContext<PedleadTourValue>(EMPTY);

export function PedleadTourProvider({ children }: { children: React.ReactNode }) {
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
      const embedFromUrl = isEmbedParam(params.get("embed"));
      tourFromUrl = params.get("tour") === "1" || params.get("pitch") === "1";
      demoFromUrl = !embedFromUrl && params.get("demo") === "1";
    } catch {
      /* ignore */
    }

    if (tourFromUrl) {
      writePedleadTourMode(true);
      setActive(true);
    } else {
      writePedleadTourMode(false);
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

  useEffect(() => {
    if (!booted) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const embedFromUrl = isEmbedParam(params.get("embed"));
      if (embedFromUrl) {
        writePedleadTourMode(false);
        setActive(false);
        return;
      }
      if (params.get("tour") === "1" || params.get("pitch") === "1") {
        writePedleadTourMode(true);
        setActive(true);
      }
    } catch {
      /* ignore */
    }
  }, [pathname, booted]);

  useEffect(() => {
    if (!active || !step) return;
    if (navigatedFor.current === index) return;
    navigatedFor.current = index;

    const targetUrl = new URL(step.href, "http://local");
    const currentNormalized = normalizePedleadTourHref(
      `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`,
    );
    const targetNormalized = normalizePedleadTourHref(step.href);

    if (currentNormalized !== targetNormalized) {
      targetUrl.searchParams.set("tour", "1");
      if (autoPlay) targetUrl.searchParams.set("autoplay", "1");
      router.push(`${targetUrl.pathname}${targetUrl.search}`);
    }
  }, [active, index, step, pathname, router, autoPlay]);

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

  const restart = useCallback(() => {
    navigatedFor.current = null;
    setIndex(0);
  }, []);

  const exit = useCallback(() => {
    writePedleadTourMode(false);
    setActive(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      url.searchParams.delete("pitch");
      url.searchParams.delete("autoplay");
      router.replace(`${url.pathname}${url.search}`);
    } catch {
      /* ignore */
    }
  }, [router]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((current) => !current);
  }, []);

  const value = useMemo<PedleadTourValue>(
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
      position,
      step,
      index,
      isLast,
      autoPlay,
      toggleAutoPlay,
      next,
      back,
      isFirst,
      restart,
      exit,
    ],
  );

  return <PedleadTourContext.Provider value={value}>{children}</PedleadTourContext.Provider>;
}

export function usePedleadTour(): PedleadTourValue {
  return useContext(PedleadTourContext);
}
