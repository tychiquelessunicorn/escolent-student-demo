import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AdminTourOverlay } from "@/components/admin-tour-overlay";
import { AdminTourProvider } from "@/components/admin-tour-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminTourProvider>
      <AdminShell>{children}</AdminShell>
      <Suspense fallback={null}>
        <AdminTourOverlay />
      </Suspense>
    </AdminTourProvider>
  );
}
