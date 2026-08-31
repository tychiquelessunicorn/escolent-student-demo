import { NextResponse } from "next/server";
import { splitSkill, type AuthoringSkill } from "@/lib/pedlead-content-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      unitId: string;
      skillId: string;
      skillA: Omit<AuthoringSkill, "id" | "createdAt" | "updatedAt">;
      skillB: Omit<AuthoringSkill, "id" | "createdAt" | "updatedAt">;
    };

    if (!body?.unitId || !body?.skillId || !body?.skillA?.name || !body?.skillB?.name) {
      return NextResponse.json({ error: "Missing split parameters" }, { status: 400 });
    }

    const updated = await splitSkill(body.unitId, body.skillId, body.skillA, body.skillB);
    return NextResponse.json({ unit: updated });
  } catch (error) {
    console.error("[api/pedlead/content/split] error:", error);
    return NextResponse.json({ error: "Failed to split skill" }, { status: 500 });
  }
}
