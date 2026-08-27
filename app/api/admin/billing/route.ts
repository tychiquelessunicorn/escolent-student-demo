import { NextResponse } from "next/server";
import { getAdminBillingSnapshot } from "@/lib/admin-billing-store";

export const runtime = "nodejs";

export async function GET() {
  const billing = await getAdminBillingSnapshot();
  return NextResponse.json(billing);
}
