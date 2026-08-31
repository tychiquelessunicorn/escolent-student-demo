import { Suspense } from "react";
import { PedleadShell } from "@/components/pedlead-shell";
import { PedleadTourOverlay } from "@/components/pedlead-tour-overlay";
import { PedleadTourProvider } from "@/components/pedlead-tour-provider";

export const metadata = {
  title: "Pedagogical Lead · Escolent",
  description: "Cross-tenant skill graph and misconception taxonomy authoring, briefing, coverage, and LMS ingestion.",
};

export default function PedleadLayout({ children }: { children: React.ReactNode }) {
  return (
    <PedleadTourProvider>
      <PedleadShell>{children}</PedleadShell>
      <Suspense fallback={null}>
        <PedleadTourOverlay />
      </Suspense>
    </PedleadTourProvider>
  );
}
