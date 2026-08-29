import { NextResponse } from "next/server";
import { inviteStaff } from "@/lib/admin-users-store";
import type { StaffRole } from "@/lib/demo-data/staff";

export const runtime = "nodejs";

function readRole(value: unknown): StaffRole | null {
  return value === "teacher" || value === "admin" ? value : null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
    role?: unknown;
    gradeLabel?: string | null;
    entryMethod?: "structured" | "conversational";
    plainLanguageTrigger?: string | null;
  };

  const role = readRole(body.role);
  if (!role) {
    return NextResponse.json({ error: "Choose Teacher or Admin." }, { status: 400 });
  }

  const result = await inviteStaff({
    fullName: body.fullName ?? "",
    email: body.email ?? "",
    role,
    gradeLabel: body.gradeLabel,
    entryMethod: body.entryMethod === "conversational" ? "conversational" : "structured",
    plainLanguageTrigger: body.plainLanguageTrigger,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ user: result.user });
}
