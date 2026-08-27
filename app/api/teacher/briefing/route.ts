import { NextResponse } from "next/server";
import {
  buildTeacherBriefing,
  type BriefingDemoState,
} from "@/lib/briefing-store";

export const runtime = "nodejs";

function readDemoState(value: string | null): BriefingDemoState {
  if (
    value === "no_spaces" ||
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
  const space = url.searchParams.get("space");
  const spaceFilter =
    space && space !== "all" && (space === "algebra_8a" || space === "remediation_8a")
      ? space
      : null;
  const demoState = readDemoState(url.searchParams.get("briefingState"));

  const briefing = await buildTeacherBriefing({ spaceFilter, demoState });
  return NextResponse.json(briefing);
}
