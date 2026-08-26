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
  readDemoControlsEnabled,
  readDemoOffline,
  seedDemoState,
  writeDemoControlsEnabled,
  writeDemoOffline,
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
  registerPracticeHelp: (handler: (() => void) | null) => void;
  openPracticeHelp: () => void;
}

const ShellStateContext = createContext<ShellStateValue | null>(null);

export function ShellStateProvider({ children }: { children: React.ReactNode }) {
  const [connectivity, setConnectivity] = useState<SyncFreshness>("fresh");
  const [headerNote, setHeaderNote] = useState("");
  const [demoOffline, setDemoOffline] = useState(false);
  const [demoControls, setDemoControls] = useState(false);
  const [practiceHelpHandler, setPracticeHelpHandler] = useState<(() => void) | null>(
    null,
  );

  useEffect(() => {
    let fromUrl = false;
    let seed: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      fromUrl = params.get("demo") === "1";
      seed = params.get("seed");
    } catch {
      /* ignore */
    }

    if (seed === "mastered" || seed === "fresh") {
      seedDemoState(seed);
      // Clean pitch URL without ?demo=1 should not keep sticky harness chrome.
      if (seed === "fresh" && !fromUrl) {
        writeDemoControlsEnabled(false);
      }
    }

    setDemoOffline(readDemoOffline());

    const enabled = fromUrl || readDemoControlsEnabled();
    setDemoControls(enabled);
    if (fromUrl) writeDemoControlsEnabled(true);
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

  const registerPracticeHelp = useCallback((handler: (() => void) | null) => {
    setPracticeHelpHandler(() => handler);
  }, []);

  const openPracticeHelp = useCallback(() => {
    practiceHelpHandler?.();
  }, [practiceHelpHandler]);

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
