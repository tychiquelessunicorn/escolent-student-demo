import { NextResponse } from "next/server";
import { checkStudentShellAccess } from "@/lib/admin-pilot-store";

export const runtime = "nodejs";

/** Req 14.3 — Student shell resolves effective Space and blocks when disabled. */
export async function GET() {
  const access = await checkStudentShellAccess();
  return NextResponse.json(access);
}
