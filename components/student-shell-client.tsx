"use client";

import { Suspense } from "react";
import { DemoPanel } from "@/components/demo-panel";
import { DistressProvider } from "@/components/distress-provider";
import { NavShell } from "@/components/nav-shell";
import { ShellStateProvider } from "@/components/shell-context";
import { TourOverlay } from "@/components/tour-overlay";
import { TourProvider } from "@/components/tour-provider";

/** Client providers and chrome — only mounted after server access check passes. */
export function StudentShellClient({ children }: { children: React.ReactNode }) {
  return (
    <ShellStateProvider>
      <DistressProvider>
        {/*
          The guided tour wraps the shell so the screens can read the current
          step's stage, and the overlay sits outside NavShell so it dims the
          header and nav too. The ?demo=1 harness panel below is a separate
          system and shares nothing with it.
        */}
        <TourProvider>
          <NavShell>{children}</NavShell>
          <TourOverlay />
        </TourProvider>
        <Suspense fallback={null}>
          <DemoPanel />
        </Suspense>
      </DistressProvider>
    </ShellStateProvider>
  );
}
