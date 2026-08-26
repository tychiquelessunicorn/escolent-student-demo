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
  readDemoLmsMode,
  readDemoOffline,
  writeDemoLmsMode,
  writeDemoOffline,
  type DemoLmsMode,
} from "@/lib/demo-persistence";

interface ShellStateValue {
  connectivity: SyncFreshness;
  setConnectivity: (value: SyncFreshness) => void;
  headerNote: string;
  setHeaderNote: (value: string) => void;
  demoOffline: boolean;
  toggleDemoOffline: () => void;
  lmsMode: DemoLmsMode;
  setLmsMode: (mode: DemoLmsMode) => void;
  registerPracticeHelp: (handler: (() => void) | null) => void;
  openPracticeHelp: () => void;
}

const ShellStateContext = createContext<ShellStateValue | null>(null);

export function ShellStateProvider({ children }: { children: React.ReactNode }) {
  const [connectivity, setConnectivity] = useState<SyncFreshness>("fresh");
  const [headerNote, setHeaderNote] = useState("");
  const [demoOffline, setDemoOffline] = useState(false);
  const [lmsMode, setLmsModeState] = useState<DemoLmsMode>("standalone");
  const [practiceHelpHandler, setPracticeHelpHandler] = useState<(() => void) | null>(
    null,
  );

  useEffect(() => {
    setDemoOffline(readDemoOffline());
    setLmsModeState(readDemoLmsMode());
  }, []);

  const toggleDemoOffline = useCallback(() => {
    setDemoOffline((current) => {
      const next = !current;
      writeDemoOffline(next);
      setConnectivity(next ? "unavailable" : "fresh");
      return next;
    });
  }, []);

  const setLmsMode = useCallback((mode: DemoLmsMode) => {
    writeDemoLmsMode(mode);
    setLmsModeState(mode);
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
      lmsMode,
      setLmsMode,
      registerPracticeHelp,
      openPracticeHelp,
    }),
    [
      connectivity,
      headerNote,
      demoOffline,
      toggleDemoOffline,
      lmsMode,
      setLmsMode,
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
