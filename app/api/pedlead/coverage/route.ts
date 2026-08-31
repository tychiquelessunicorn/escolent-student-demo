import { NextResponse } from "next/server";
import { buildPedleadCoverage } from "@/lib/pedlead-coverage-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantFilter = url.searchParams.get("tenant") || "all";
    const payload = await buildPedleadCoverage(tenantFilter);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/pedlead/coverage] failed to build coverage report", error);
    return NextResponse.json({ error: "Failed to compute coverage intelligence" }, { status: 500 });
  }
}
