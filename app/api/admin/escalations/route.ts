import { NextResponse } from "next/server";
import { computeEscalationOversightSummary } from "@/lib/admin-escalation-oversight";

export const runtime = "nodejs";

/** Aggregate oversight counts only — no individual escalation records (Req 15.7). */
export async function GET() {
  const summary = await computeEscalationOversightSummary();
  return NextResponse.json(summary);
}
