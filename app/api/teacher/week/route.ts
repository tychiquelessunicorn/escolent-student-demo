import { NextResponse } from "next/server";
import { buildTeacherTodaySchedule } from "@/lib/teacher-today-store";
import { isKnownSpaceId } from "@/lib/space-store";

export const runtime = "nodejs";

async function readSpaceFilter(value: string | null): Promise<string | null> {
  if (value && value !== "all" && (await isKnownSpaceId(value))) return value;
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spaceFilter = await readSpaceFilter(url.searchParams.get("space"));
  const schedule = await buildTeacherTodaySchedule({ spaceFilter });
  return NextResponse.json({
    ...schedule,
    view: "week",
  });
}
