import { NextResponse } from "next/server";
import { resendInvite, getStaffAccount } from "@/lib/admin-users-store";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const account = await getStaffAccount(id);
  if (!account) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const result = await resendInvite(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
