import { NextResponse } from "next/server";
import { approveUnit } from "@/lib/pedlead-content-store";
import { DEMO_PEDLEAD_STAFF_ID } from "@/lib/demo-data/staff";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { unitId?: string; validatorId?: string };
    if (!body?.unitId) {
      return NextResponse.json({ error: "Missing unitId" }, { status: 400 });
    }

    const validatorId = body.validatorId || DEMO_PEDLEAD_STAFF_ID;
    const updated = await approveUnit(body.unitId, validatorId);
    return NextResponse.json({ unit: updated });
  } catch (error) {
    console.error("[api/pedlead/content/approve] error:", error);
    return NextResponse.json({ error: "Failed to approve unit" }, { status: 500 });
  }
}
