import { NextResponse } from "next/server";
import { DEMO_SESSION_STAFF_ID } from "@/lib/demo-data/staff";
import { updateEscalation } from "@/lib/distress-store";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const now = new Date().toISOString();

  const record = await updateEscalation(id, (current) => {
    if (current.views.some((view) => view.staffId === DEMO_SESSION_STAFF_ID)) {
      return current;
    }
    return {
      ...current,
      views: [...current.views, { staffId: DEMO_SESSION_STAFF_ID, viewedAt: now }],
    };
  });

  if (!record) {
    return NextResponse.json({ error: "Escalation not found" }, { status: 404 });
  }

  return NextResponse.json({ record });
}
