import { NextResponse } from "next/server";
import { buildAdminPilotPayload } from "@/lib/admin-pilot-store";

export const runtime = "nodejs";

export async function GET() {
  const payload = await buildAdminPilotPayload();
  return NextResponse.json(payload);
}
