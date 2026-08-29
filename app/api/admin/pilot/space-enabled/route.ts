import { NextResponse } from "next/server";
import {
  PILOT_SPACE_IDS,
  type PilotSpaceId,
  setPilotSpaceEnabled,
} from "@/lib/admin-pilot-store";

export const runtime = "nodejs";

function readSpaceId(value: unknown): PilotSpaceId | null {
  return typeof value === "string" && PILOT_SPACE_IDS.includes(value as PilotSpaceId)
    ? (value as PilotSpaceId)
    : null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { spaceId?: unknown; enabled?: unknown };
  const spaceId = readSpaceId(body.spaceId);
  if (!spaceId) {
    return NextResponse.json({ error: "Choose a pilot Space." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be true or false." }, { status: 400 });
  }

  const result = await setPilotSpaceEnabled(spaceId, body.enabled);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ spaceId, enabled: body.enabled });
}
