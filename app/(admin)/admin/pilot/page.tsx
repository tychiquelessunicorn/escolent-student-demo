import { Suspense } from "react";
import { AdminPilotScreen } from "@/components/admin-pilot-screen";

export const metadata = { title: "Pilot · Escolent" };

export default function AdminPilotPage() {
  return (
    <Suspense fallback={null}>
      <AdminPilotScreen />
    </Suspense>
  );
}
