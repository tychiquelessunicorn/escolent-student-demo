import { NextResponse } from "next/server";
import { getRecentViewers, recordView } from "@/lib/shared-record-views";
import { DEMO_PEDLEAD_STAFF_ID, DEMO_PEER_PEDLEAD_ID } from "@/lib/demo-data/staff";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId") || "unit_ecosystems_energy_flow";
    const viewers = await getRecentViewers("content_unit", unitId, {
      excludeStaffId: DEMO_PEDLEAD_STAFF_ID,
    });
    return NextResponse.json({ viewers });
  } catch (error) {
    console.error("[api/pedlead/content/view] GET error:", error);
    return NextResponse.json({ viewers: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { unitId?: string; staffId?: string; simulatePeer?: boolean };
    const unitId = body.unitId || "unit_ecosystems_energy_flow";
    const staffId = body.simulatePeer
      ? DEMO_PEER_PEDLEAD_ID
      : body.staffId || DEMO_PEDLEAD_STAFF_ID;

    const views = await recordView("content_unit", unitId, staffId);
    const viewers = await getRecentViewers("content_unit", unitId, {
      excludeStaffId: DEMO_PEDLEAD_STAFF_ID,
    });
    return NextResponse.json({ views, viewers });
  } catch (error) {
    console.error("[api/pedlead/content/view] POST error:", error);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}
