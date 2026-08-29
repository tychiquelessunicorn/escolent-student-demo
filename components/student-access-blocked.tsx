import Link from "next/link";
import type { StudentShellAccessResult } from "@/lib/admin-pilot-store";

/** Req 14.3 — shown when the demo student's effective Space is disabled. */
export function StudentAccessBlocked({
  access,
}: {
  access: Extract<StudentShellAccessResult, { allowed: false }>;
}) {
  return (
    <div className="esc-student-access-gate">
      <div className="esc-student-access-gate-card">
        <p className="esc-student-access-gate-eyebrow">Class access paused</p>
        <h1 className="esc-student-access-gate-title">You can&apos;t open Escolent right now</h1>
        {access.spaceName ? (
          <p className="esc-student-access-gate-space">{access.spaceName}</p>
        ) : null}
        <p className="esc-student-access-gate-message">{access.message}</p>
        <Link href="/" className="esc-student-access-gate-link">
          Back to home
        </Link>
      </div>
    </div>
  );
}
