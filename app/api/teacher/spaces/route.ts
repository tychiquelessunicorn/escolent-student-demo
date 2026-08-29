import { NextResponse } from "next/server";
import { buildSpacesListPayload, createSpace } from "@/lib/space-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await buildSpacesListPayload());
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const result = await createSpace({
    name: typeof body.name === "string" ? body.name : "",
    description: typeof body.description === "string" ? body.description : "",
    shortName: typeof body.shortName === "string" ? body.shortName : undefined,
    grade: typeof body.grade === "string" ? body.grade : undefined,
    includedSkillIds: Array.isArray(body.includedSkillIds)
      ? body.includedSkillIds.filter((id): id is string => typeof id === "string")
      : [],
    difficultyMin: typeof body.difficultyMin === "number" ? body.difficultyMin : 1,
    difficultyMax: typeof body.difficultyMax === "number" ? body.difficultyMax : 5,
    classroomPacingMode: Boolean(body.classroomPacingMode),
    studentIds: Array.isArray(body.studentIds)
      ? body.studentIds.filter((id): id is string => typeof id === "string")
      : [],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ space: result.space }, { status: 201 });
}
