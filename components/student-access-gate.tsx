"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { StudentShellAccessResult } from "@/lib/admin-pilot-store";

type AccessState =
  | { status: "loading" }
  | { status: "ready"; access: StudentShellAccessResult };

/**
 * Req 14.3 — blocks the Student shell when the demo student's effective Space
 * is disabled in Admin pilot scope. Enforcement runs server-side; this gate
 * only reflects that check before rendering NavShell.
 */
export function StudentAccessGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessState>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/student/access", { cache: "no-store" });
      if (!response.ok) throw new Error("access check failed");
      const access = (await response.json()) as StudentShellAccessResult;
      setState({ status: "ready", access });
    } catch {
      setState({
        status: "ready",
        access: {
          allowed: false,
          spaceId: null,
          spaceName: null,
          message: "Escolent could not verify your class access right now. Try again in a moment.",
        },
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  if (state.status === "loading") {
    return (
      <div className="esc-student-access-gate">
        <p className="esc-student-access-gate-status">Checking class access…</p>
      </div>
    );
  }

  if (!state.access.allowed) {
    return (
      <div className="esc-student-access-gate">
        <div className="esc-student-access-gate-card">
          <p className="esc-student-access-gate-eyebrow">Class access paused</p>
          <h1 className="esc-student-access-gate-title">You can&apos;t open Escolent right now</h1>
          {state.access.spaceName ? (
            <p className="esc-student-access-gate-space">{state.access.spaceName}</p>
          ) : null}
          <p className="esc-student-access-gate-message">{state.access.message}</p>
          <Link href="/" className="esc-student-access-gate-link">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
