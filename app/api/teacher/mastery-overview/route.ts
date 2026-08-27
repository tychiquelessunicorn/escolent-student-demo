import { NextResponse } from "next/server";
import { getRosterStudent } from "@/lib/demo-data/roster";
import {
  buildMasteryOverview,
  getMasteryOverviewStudent,
} from "@/lib/mastery-overview-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const space = url.searchParams.get("space");
  const studentId = url.searchParams.get("studentId");

  const spaceFilter =
    space && space !== "all" && (space === "algebra_8a" || space === "remediation_8a")
      ? space
      : null;

  if (studentId) {
    if (!getRosterStudent(studentId)) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const student = getMasteryOverviewStudent(studentId, spaceFilter);
    if (!student) {
      return NextResponse.json({ error: "Student not found in scope" }, { status: 404 });
    }
    return NextResponse.json({ student, refreshedAt: new Date().toISOString() });
  }

  return NextResponse.json(buildMasteryOverview(spaceFilter));
}
