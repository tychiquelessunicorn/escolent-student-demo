import { NextResponse } from "next/server";
import { getPrimaryAdmin } from "@/lib/demo-data/staff";
import { getRecentViewers } from "@/lib/shared-record-views";
import { changeStaffRole, getStaffAccount } from "@/lib/admin-users-store";
import type { StaffRole } from "@/lib/demo-data/staff";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const account = await getStaffAccount(id);
  if (!account) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const adminId = getPrimaryAdmin().id;
  const otherViewers = await getRecentViewers("user_role", id, {
    excludeStaffId: adminId,
  });

  return NextResponse.json({ account, otherViewers });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    newRole?: unknown;
    entryMethod?: "structured" | "conversational";
    plainLanguageTrigger?: string | null;
  };

  const newRole = body.newRole === "teacher" || body.newRole === "admin" ? body.newRole : null;
  if (!newRole) {
    return NextResponse.json({ error: "Choose Teacher or Admin." }, { status: 400 });
  }

  const result = await changeStaffRole({
    userId: id,
    newRole: newRole as StaffRole,
    entryMethod: body.entryMethod === "conversational" ? "conversational" : "structured",
    plainLanguageTrigger: body.plainLanguageTrigger,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ user: result.user });
}
