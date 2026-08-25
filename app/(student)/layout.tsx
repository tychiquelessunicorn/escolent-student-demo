import { Suspense } from "react";
import { DemoPanel } from "@/components/demo-panel";
import { DistressProvider } from "@/components/distress-provider";
import { NavShell } from "@/components/nav-shell";
import { ShellStateProvider } from "@/components/shell-context";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShellStateProvider>
      <DistressProvider>
        <NavShell>{children}</NavShell>
        <Suspense fallback={null}>
          <DemoPanel />
        </Suspense>
      </DistressProvider>
    </ShellStateProvider>
  );
}
