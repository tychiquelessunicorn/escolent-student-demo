import { NextResponse } from "next/server";
import { getLmsIngestionStatus } from "@/lib/pedlead-lms-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = await getLmsIngestionStatus();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/pedlead/lms] failed to fetch LMS ingestion status", error);
    return NextResponse.json({ error: "Failed to read LMS ingestion status" }, { status: 500 });
  }
}
