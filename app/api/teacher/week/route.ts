import { NextResponse } from "next/server";
import { buildTeacherTodaySchedule } from "@/lib/teacher-today-store";

export const runtime = "nodejs";

function readSpaceFilter(value: string | null): string | null {
  if (value === "algebra_8a" || value === "remediation_8a") return value;
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spaceFilter = readSpaceFilter(url.searchParams.get("space"));
  const schedule = await buildTeacherTodaySchedule({ spaceFilter });
  return NextResponse.json({
    ...schedule,
    view: "week",
  });
}
