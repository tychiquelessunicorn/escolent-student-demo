import { NextResponse } from "next/server";
import { rejectUnitWithFeedback } from "@/lib/pedlead-content-store";
import { DEMO_PEDLEAD_STAFF_ID } from "@/lib/demo-data/staff";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { unitId?: string; feedback?: string; reviewerId?: string };
    if (!body?.unitId) {
      return NextResponse.json({ error: "Missing unitId" }, { status: 400 });
    }

    const feedback = typeof body.feedback === "string" ? body.feedback : "Requires revisions before validation.";
    const reviewerId = body.reviewerId || DEMO_PEDLEAD_STAFF_ID;
    const updated = await rejectUnitWithFeedback(body.unitId, feedback, reviewerId);
    return NextResponse.json({ unit: updated });
  } catch (error) {
    console.error("[api/pedlead/content/reject] error:", error);
    return NextResponse.json({ error: "Failed to reject unit" }, { status: 500 });
  }
}
