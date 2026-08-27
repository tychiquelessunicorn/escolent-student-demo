import { NextResponse } from "next/server";
import { getLmsIntegrationStatus } from "@/lib/lms-integration-store";

export const runtime = "nodejs";

export async function GET() {
  const status = await getLmsIntegrationStatus();
  return NextResponse.json(status);
}
