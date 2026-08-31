import { NextResponse } from "next/server";
import { resetContentStore } from "@/lib/pedlead-content-store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const units = await resetContentStore();
    return NextResponse.json({ ok: true, units });
  } catch (error) {
    console.error("[api/pedlead/content/reset] error:", error);
    return NextResponse.json({ error: "Failed to reset content store" }, { status: 500 });
  }
}
