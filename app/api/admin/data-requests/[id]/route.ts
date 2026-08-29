import { NextResponse } from "next/server";
import { getPrimaryAdmin } from "@/lib/demo-data/staff";
import { getRecentViewers } from "@/lib/shared-record-views";
import { getDeletionRequest } from "@/lib/student-data-store";

export const runtime = "nodejs";

const RECORD_TYPE = "data_rights_request";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const request = await getDeletionRequest(id);
  if (!request) {
    return NextResponse.json({ error: "Deletion request not found." }, { status: 404 });
  }

  const adminId = getPrimaryAdmin().id;
  const otherViewers = await getRecentViewers(RECORD_TYPE, id, {
    excludeStaffId: adminId,
  });

  return NextResponse.json({ request, otherViewers });
}
