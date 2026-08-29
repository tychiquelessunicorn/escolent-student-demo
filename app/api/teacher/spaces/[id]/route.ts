import { NextResponse } from "next/server";
import {
  deleteSpace,
  getSpace,
  listSpaces,
  listStudentIdsForSpace,
  updateSpace,
  getEffectiveSpaceId,
} from "@/lib/space-store";
import { ROSTER } from "@/lib/demo-data/roster";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const space = await getSpace(id);
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }
  const studentIds = await listStudentIdsForSpace(id);
  const spaces = await listSpaces();
  const spaceNames = Object.fromEntries(spaces.map((entry) => [entry.id, entry.shortName || entry.name]));
  const roster = await Promise.all(
    ROSTER.map(async (student) => ({
      id: student.id,
      fullName: student.fullName,
      baselineSpaceId: student.spaceId,
      effectiveSpaceId: (await getEffectiveSpaceId(student.id)) ?? student.spaceId,
    })),
  );
  return NextResponse.json({ space, studentIds, roster, spaceNames });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const result = await updateSpace(id, {
    name: typeof body.name === "string" ? body.name : "",
    description: typeof body.description === "string" ? body.description : "",
    shortName: typeof body.shortName === "string" ? body.shortName : undefined,
    grade: typeof body.grade === "string" ? body.grade : undefined,
    includedSkillIds: Array.isArray(body.includedSkillIds)
      ? body.includedSkillIds.filter((sid): sid is string => typeof sid === "string")
      : [],
    difficultyMin: typeof body.difficultyMin === "number" ? body.difficultyMin : 1,
    difficultyMax: typeof body.difficultyMax === "number" ? body.difficultyMax : 5,
    classroomPacingMode: Boolean(body.classroomPacingMode),
    studentIds: Array.isArray(body.studentIds)
      ? body.studentIds.filter((sid): sid is string => typeof sid === "string")
      : [],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ space: result.space });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await deleteSpace(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, space: result.space });
}
