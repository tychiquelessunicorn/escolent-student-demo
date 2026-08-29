import { NextResponse } from "next/server";
import { resolveAdminUserCommand } from "@/lib/admin-user-command";

export const runtime = "nodejs";

const MAX_LENGTH = 500;

export async function POST(request: Request) {
  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  if (!text || text.length > MAX_LENGTH) {
    return NextResponse.json({ error: "Enter a shorter command." }, { status: 400 });
  }

  try {
    const result = await resolveAdminUserCommand(text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/users/command] failed", error);
    return NextResponse.json(
      { error: "Couldn't process that right now — try again in a moment." },
      { status: 503 },
    );
  }
}
