"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SyncFreshness } from "@/lib/demo-data";
import {
  DEMO_SPACES,
  DEFAULT_SPACE_ID,
  getDemoSpace,
  type DemoSpace,
} from "@/lib/demo-data";
import {
  readDemoControlsEnabled,
  readDemoOffline,
  readDemoSpaceId,
  seedDemoState,
  writeDemoControlsEnabled,
  writeDemoOffline,
  writeDemoSpaceId,
  type DemoSeed,
} from "@/lib/demo-persistence";

interface ShellStateValue {
  connectivity: SyncFreshness;
  setConnectivity: (value: SyncFreshness) => void;
  headerNote: string;
  setHeaderNote: (value: string) => void;
  demoOffline: boolean;
  toggleDemoOffline: () => void;
  demoControls: boolean;
  enableDemoControls: () => void;
  applyDemoSeed: (seed: DemoSeed) => void;
  currentSpaceId: string;
  currentSpace: DemoSpace;
  spaces: DemoSpace[];
  setCurrentSpaceId: (spaceId: string) => void;
  registerPracticeHelp: (handler: (() => void) | null) => void;
  openPracticeHelp: () => void;
}

const ShellStateContext = createContext<ShellStateValue | null>(null);

export function ShellStateProvider({ children }: { children: React.ReactNode }) {
  const [connectivity, setConnectivity] = useState<SyncFreshness>("fresh");
  const [headerNote, setHeaderNote] = useState("");
  const [demoOffline, setDemoOffline] = useState(false);
  const [demoControls, setDemoControls] = useState(false);
  const [currentSpaceId, setCurrentSpaceIdState] = useState(DEFAULT_SPACE_ID);
  const [practiceHelpHandler, setPracticeHelpHandler] = useState<(() => void) | null>(
    null,
  );

  useEffect(() => {
    let fromUrl = false;
    let seed: string | null = null;
    let spaceParam: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      fromUrl = params.get("demo") === "1";
      seed = params.get("seed");
      spaceParam = params.get("space");
    } catch {
      /* ignore */
    }

    if (seed === "mastered" || seed === "fresh") {
      seedDemoState(seed);
      if (seed === "fresh" && !fromUrl) {
        writeDemoControlsEnabled(false);
      }
    }

    setDemoOffline(readDemoOffline());

    const enabled = fromUrl || readDemoControlsEnabled();
    setDemoControls(enabled);
    if (fromUrl) writeDemoControlsEnabled(true);

    if (
      spaceParam &&
      DEMO_SPACES.some((space) => space.id === spaceParam)
    ) {
      writeDemoSpaceId(spaceParam);
      setCurrentSpaceIdState(spaceParam);
    } else {
      setCurrentSpaceIdState(readDemoSpaceId());
    }
  }, []);

  const toggleDemoOffline = useCallback(() => {
    setDemoOffline((current) => {
      const next = !current;
      writeDemoOffline(next);
      setConnectivity(next ? "unavailable" : "fresh");
      return next;
    });
  }, []);

  const enableDemoControls = useCallback(() => {
    writeDemoControlsEnabled(true);
    setDemoControls(true);
  }, []);

  const applyDemoSeed = useCallback((seed: DemoSeed) => {
    seedDemoState(seed);
    const offline = readDemoOffline();
    setDemoOffline(offline);
    setConnectivity(offline ? "unavailable" : "fresh");
  }, []);

  const setCurrentSpaceId = useCallback((spaceId: string) => {
    if (!DEMO_SPACES.some((space) => space.id === spaceId)) return;
    writeDemoSpaceId(spaceId);
    setCurrentSpaceIdState(spaceId);
  }, []);

  const registerPracticeHelp = useCallback((handler: (() => void) | null) => {
    setPracticeHelpHandler(() => handler);
  }, []);

  const openPracticeHelp = useCallback(() => {
    practiceHelpHandler?.();
  }, [practiceHelpHandler]);

  const currentSpace = useMemo(
    () => getDemoSpace(currentSpaceId),
    [currentSpaceId],
  );

  const value = useMemo(
    () => ({
      connectivity,
      setConnectivity,
      headerNote,
      setHeaderNote,
      demoOffline,
      toggleDemoOffline,
      demoControls,
      enableDemoControls,
      applyDemoSeed,
      currentSpaceId,
      currentSpace,
      spaces: DEMO_SPACES,
      setCurrentSpaceId,
      registerPracticeHelp,
      openPracticeHelp,
    }),
    [
      connectivity,
      headerNote,
      demoOffline,
      toggleDemoOffline,
      demoControls,
      enableDemoControls,
      applyDemoSeed,
      currentSpaceId,
      currentSpace,
      setCurrentSpaceId,
      registerPracticeHelp,
      openPracticeHelp,
    ],
  );

  return (
    <ShellStateContext.Provider value={value}>
      {children}
    </ShellStateContext.Provider>
  );
}

export function useShellState(): ShellStateValue {
  const context = useContext(ShellStateContext);
  if (!context) {
    throw new Error("useShellState must be used within a ShellStateProvider");
  }
  return context;
}
