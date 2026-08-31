import { NextResponse } from "next/server";
import { mergeSkills, type AuthoringSkill } from "@/lib/pedlead-content-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      unitId: string;
      skillIdA: string;
      skillIdB: string;
      mergedSkill: Omit<AuthoringSkill, "id" | "createdAt" | "updatedAt">;
    };

    if (!body?.unitId || !body?.skillIdA || !body?.skillIdB || !body?.mergedSkill?.name) {
      return NextResponse.json({ error: "Missing merge parameters" }, { status: 400 });
    }

    const updated = await mergeSkills(body.unitId, body.skillIdA, body.skillIdB, body.mergedSkill);
    return NextResponse.json({ unit: updated });
  } catch (error) {
    console.error("[api/pedlead/content/merge] error:", error);
    return NextResponse.json({ error: "Failed to merge skills" }, { status: 500 });
  }
}
