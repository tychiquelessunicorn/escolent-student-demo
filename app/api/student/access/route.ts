import { NextResponse } from "next/server";
import { checkStudentShellAccess } from "@/lib/student-shell-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Req 14.3 — Student shell resolves effective Space and blocks when disabled. */
export async function GET() {
  const access = await checkStudentShellAccess();
  return NextResponse.json(access);
}
