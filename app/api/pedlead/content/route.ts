import { NextResponse } from "next/server";
import { getContentUnits, saveContentUnit, type AuthoringUnit } from "@/lib/pedlead-content-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const units = await getContentUnits();
    return NextResponse.json({ units });
  } catch (error) {
    console.error("[api/pedlead/content] GET error:", error);
    return NextResponse.json({ error: "Failed to load content units" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { unit?: AuthoringUnit };
    if (!body?.unit || typeof body.unit.name !== "string" || !body.unit.id) {
      return NextResponse.json({ error: "Invalid content unit payload" }, { status: 400 });
    }

    const saved = await saveContentUnit(body.unit);
    return NextResponse.json({ unit: saved });
  } catch (error) {
    console.error("[api/pedlead/content] POST error:", error);
    return NextResponse.json({ error: "Failed to save content unit" }, { status: 500 });
  }
}
