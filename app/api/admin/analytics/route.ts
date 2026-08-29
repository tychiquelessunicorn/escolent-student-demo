import { NextResponse } from "next/server";
import {
  buildAdminAnalytics,
  readAdminAnalyticsDateRange,
} from "@/lib/admin-analytics-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateRange = readAdminAnalyticsDateRange(url.searchParams.get("range"));
  const analytics = await buildAdminAnalytics({ dateRange });
  return NextResponse.json(analytics);
}
