import { NextResponse } from "next/server";
import { applyOverride, type OverrideEntryMethod, type OverrideKind } from "@/lib/override-store";

export const runtime = "nodejs";

type Body = Record<string, unknown>;

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const skillId = typeof body.skillId === "string" ? body.skillId : "";
  const reason = typeof body.reason === "string" ? body.reason : "";
  const kind = body.kind === "reconfirm" ? "reconfirm" : "mark_mastered";
  const entryMethod: OverrideEntryMethod =
    body.entryMethod === "conversational" ? "conversational" : "structured";

  if (!studentId || !skillId) {
    return NextResponse.json({ error: "studentId and skillId are required" }, { status: 400 });
  }

  const result = await applyOverride({
    studentId,
    skillId,
    reason,
    kind: kind as OverrideKind,
    entryMethod,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    entry: result.entry,
    studentId: result.student.id,
    appliedAt: result.entry.appliedAt,
  });
}
