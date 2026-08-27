import { NextResponse } from "next/server";
import { DEMO_PEER_ADMIN_ID, getPrimaryAdmin } from "@/lib/demo-data/staff";
import { getRecentViewers, recordView } from "@/lib/shared-record-views";
import { getStaffAccount } from "@/lib/admin-users-store";

export const runtime = "nodejs";

const RECORD_TYPE = "user_role";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const account = await getStaffAccount(id);
  if (!account) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  let staffId = getPrimaryAdmin().id;
  try {
    const body = (await request.json()) as { demoPeer?: boolean };
    if (body.demoPeer) staffId = DEMO_PEER_ADMIN_ID;
  } catch {
    // empty body is fine
  }

  await recordView(RECORD_TYPE, id, staffId);

  const otherViewers = await getRecentViewers(RECORD_TYPE, id, {
    excludeStaffId: getPrimaryAdmin().id,
  });

  return NextResponse.json({ otherViewers });
}
