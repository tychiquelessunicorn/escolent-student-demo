import { NextResponse } from "next/server";
import { deactivateStaff } from "@/lib/admin-users-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    entryMethod?: "structured" | "conversational";
    plainLanguageTrigger?: string | null;
  };

  const result = await deactivateStaff({
    userId: id,
    entryMethod: body.entryMethod === "conversational" ? "conversational" : "structured",
    plainLanguageTrigger: body.plainLanguageTrigger,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ user: result.user });
}
