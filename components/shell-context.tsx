"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { SyncFreshness } from "@/lib/demo-data";

interface ShellStateValue {
  connectivity: SyncFreshness;
  setConnectivity: (value: SyncFreshness) => void;
  /** Small right-aligned note in the top bar. Practice uses it for session count. */
  headerNote: string;
  setHeaderNote: (value: string) => void;
}

const ShellStateContext = createContext<ShellStateValue | null>(null);

/**
 * Connectivity is shell-level because the indicator lives in the shell's top
 * bar on every screen, but only Practice Session actually drives it through
 * offline and syncing states.
 */
export function ShellStateProvider({ children }: { children: React.ReactNode }) {
  const [connectivity, setConnectivity] = useState<SyncFreshness>("fresh");
  const [headerNote, setHeaderNote] = useState("");

  const value = useMemo(
    () => ({ connectivity, setConnectivity, headerNote, setHeaderNote }),
    [connectivity, headerNote],
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
