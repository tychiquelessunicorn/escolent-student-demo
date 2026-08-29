import { NextResponse } from "next/server";
import { DEMO_PEER_ADMIN_ID, getPrimaryAdmin } from "@/lib/demo-data/staff";
import { getRecentViewers, recordView } from "@/lib/shared-record-views";
import { getDeletionRequest } from "@/lib/student-data-store";

export const runtime = "nodejs";

const RECORD_TYPE = "data_rights_request";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const deletionRequest = await getDeletionRequest(id);
  if (!deletionRequest) {
    return NextResponse.json({ error: "Deletion request not found." }, { status: 404 });
  }

  let staffId = getPrimaryAdmin().id;
  try {
    const body = (await request.json()) as { demoPeer?: boolean };
    if (body.demoPeer) staffId = DEMO_PEER_ADMIN_ID;
  } catch {
    // empty body is fine — record the signed-in admin's view
  }

  await recordView(RECORD_TYPE, id, staffId);

  const otherViewers = await getRecentViewers(RECORD_TYPE, id, {
    excludeStaffId: getPrimaryAdmin().id,
  });

  return NextResponse.json({ otherViewers });
}
