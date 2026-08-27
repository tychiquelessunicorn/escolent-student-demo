import { NextResponse } from "next/server";
import { parseDeletionIntent } from "@/lib/deletion-intent";
import { getPrimaryAdmin } from "@/lib/demo-data/staff";
import {
  createDeletionRequest,
  deletionConfirmPhrase,
  isDeletionDemoElapsedEnabled,
  listDeletionRequests,
  listExportStudents,
} from "@/lib/student-data-store";

export const runtime = "nodejs";

export async function GET() {
  const [students, requests, demoElapsed] = await Promise.all([
    listExportStudents(),
    listDeletionRequests(),
    isDeletionDemoElapsedEnabled(),
  ]);

  return NextResponse.json({
    exportStudentCount: students.length,
    students: students.map((student) => ({
      id: student.id,
      fullName: student.fullName,
      confirmPhrase: deletionConfirmPhrase(student.fullName),
    })),
    requests,
    demoElapsed,
    adminId: getPrimaryAdmin().id,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    studentId?: string;
    confirmPhrase?: string;
    plainLanguageTrigger?: string | null;
    intentText?: string;
  };

  let studentId = body.studentId?.trim() ?? "";
  let plainLanguageTrigger = body.plainLanguageTrigger?.trim() || null;

  if (body.intentText?.trim()) {
    const parsed = parseDeletionIntent(body.intentText);
    if (!parsed.isDeletionIntent) {
      return NextResponse.json(
        {
          error:
            "That reads like a general request — describe a data deletion (e.g. remove this graduated student's account).",
        },
        { status: 400 },
      );
    }
    if (!parsed.matchedStudentId) {
      return NextResponse.json(
        { error: "Name a student in the school roster so Escolent knows whose data to delete." },
        { status: 400 },
      );
    }
    studentId = parsed.matchedStudentId;
    plainLanguageTrigger = parsed.normalizedPhrase;
  }

  if (!studentId) {
    return NextResponse.json({ error: "Choose a student." }, { status: 400 });
  }

  const result = await createDeletionRequest({
    studentId,
    confirmPhrase: body.confirmPhrase?.trim() ?? "",
    plainLanguageTrigger,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ request: result.request });
}
