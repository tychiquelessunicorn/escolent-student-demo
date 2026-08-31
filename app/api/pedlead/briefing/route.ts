import { NextResponse } from "next/server";
import {
  buildPedleadBriefing,
  DEFAULT_PENDING_REVIEW_AGING_THRESHOLD_DAYS,
  type BuildPedleadBriefingOptions,
} from "@/lib/pedlead-briefing-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantFilter = searchParams.get("tenantFilter");
    const demoState = searchParams.get("demoState") as BuildPedleadBriefingOptions["demoState"];
    const thresholdParam = searchParams.get("agingThresholdDays");
    const agingThresholdDays = thresholdParam
      ? parseInt(thresholdParam, 10) || DEFAULT_PENDING_REVIEW_AGING_THRESHOLD_DAYS
      : DEFAULT_PENDING_REVIEW_AGING_THRESHOLD_DAYS;

    const briefing = await buildPedleadBriefing({
      tenantFilter,
      demoState: demoState || "auto",
      agingThresholdDays,
    });

    return NextResponse.json({ briefing });
  } catch (error) {
    console.error("[api/pedlead/briefing] GET error:", error);
    return NextResponse.json({ error: "Failed to generate pedagogical lead briefing" }, { status: 500 });
  }
}
