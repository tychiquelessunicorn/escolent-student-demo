import { Suspense } from "react";
import { TeacherShell } from "@/components/teacher-shell";
import { TeacherTourOverlay } from "@/components/teacher-tour-overlay";
import { TeacherTourProvider } from "@/components/teacher-tour-provider";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TeacherTourProvider>
      <TeacherShell>{children}</TeacherShell>
      <Suspense fallback={null}>
        <TeacherTourOverlay />
      </Suspense>
    </TeacherTourProvider>
  );
}
