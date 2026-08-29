import { NextResponse } from "next/server";
import { setDeletionDemoElapsed } from "@/lib/student-data-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { enabled?: boolean };
  const enabled = Boolean(body.enabled);
  await setDeletionDemoElapsed(enabled);
  return NextResponse.json({ demoElapsed: enabled });
}
