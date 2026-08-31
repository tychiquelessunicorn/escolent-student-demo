import { NextResponse } from "next/server";
import { submitUnitForReview } from "@/lib/pedlead-content-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { unitId?: string };
    if (!body?.unitId) {
      return NextResponse.json({ error: "Missing unitId" }, { status: 400 });
    }

    const updated = await submitUnitForReview(body.unitId);
    return NextResponse.json({ unit: updated });
  } catch (error) {
    console.error("[api/pedlead/content/submit] error:", error);
    return NextResponse.json({ error: "Failed to submit unit for review" }, { status: 500 });
  }
}
