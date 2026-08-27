import { Suspense } from "react";
import { DemoPanel } from "@/components/demo-panel";
import { DistressProvider } from "@/components/distress-provider";
import { NavShell } from "@/components/nav-shell";
import { ShellStateProvider } from "@/components/shell-context";
import { StudentAccessGate } from "@/components/student-access-gate";
import { TourOverlay } from "@/components/tour-overlay";
import { TourProvider } from "@/components/tour-provider";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <StudentAccessGate>
            <NavShell>{children}</NavShell>
            <TourOverlay />
          </StudentAccessGate>
        </TourProvider>
        <Suspense fallback={null}>
          <DemoPanel />
        </Suspense>
      </DistressProvider>
    </ShellStateProvider>
  );
}
