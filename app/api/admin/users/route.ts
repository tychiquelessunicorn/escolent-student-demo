import { NextResponse } from "next/server";
import { listAdminUsers } from "@/lib/admin-users-store";

export const runtime = "nodejs";

export async function GET() {
  const payload = await listAdminUsers();
  return NextResponse.json(payload);
}
