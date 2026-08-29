import { NextResponse } from "next/server";
import {
  computeWeeklyDigestMetrics,
  getDigestSchedule,
  saveDigestSchedule,
} from "@/lib/digest-store";

export const runtime = "nodejs";

export async function GET() {
  const [schedule, metrics] = await Promise.all([
    getDigestSchedule(),
    computeWeeklyDigestMetrics(),
  ]);
  return NextResponse.json({ schedule, metrics });
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const result = await saveDigestSchedule({
    weekday: body.weekday,
    time: body.time,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ schedule: result.schedule });
}
