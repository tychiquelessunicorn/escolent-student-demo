import { NextResponse } from "next/server";
import { buildAdminTodaySchedule } from "@/lib/admin-today-store";

export const runtime = "nodejs";

export async function GET() {
  const schedule = await buildAdminTodaySchedule();
  return NextResponse.json({ ...schedule, view: "today" as const });
}
