import { NextResponse } from "next/server";
import {
  buildAdminBriefing,
  type AdminBriefingDemoState,
} from "@/lib/admin-briefing-store";

export const runtime = "nodejs";

function readDemoState(value: string | null): AdminBriefingDemoState {
  if (
    value === "no_rollout" ||
    value === "insufficient_data" ||
    value === "all_clear" ||
    value === "populated" ||
    value === "auto"
  ) {
    return value;
  }
  return "auto";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const demoState = readDemoState(url.searchParams.get("briefingState"));
  const briefing = await buildAdminBriefing({ demoState });
  return NextResponse.json(briefing);
}
