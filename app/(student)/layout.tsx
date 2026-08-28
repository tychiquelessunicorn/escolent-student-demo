import { Suspense } from "react";
import { StudentAccessBlocked } from "@/components/student-access-blocked";
import { StudentShellClient } from "@/components/student-shell-client";
import { checkStudentShellAccess } from "@/lib/student-shell-access";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkStudentShellAccess();

  if (!access.allowed) {
    return <StudentAccessBlocked access={access} />;
  }

  return (
    <Suspense fallback={null}>
      <StudentShellClient>{children}</StudentShellClient>
    </Suspense>
  );
}
