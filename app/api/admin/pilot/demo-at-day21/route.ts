import { NextResponse } from "next/server";
import { setPilotDemoAtDay21 } from "@/lib/admin-pilot-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { enabled?: boolean };
  const enabled = Boolean(body.enabled);
  await setPilotDemoAtDay21(enabled);
  return NextResponse.json({ demoAtDay21: enabled });
}
