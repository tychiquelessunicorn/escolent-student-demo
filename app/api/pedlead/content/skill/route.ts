import { NextResponse } from "next/server";
import {
  addSkill,
  deleteSkill,
  updateSkill,
  type AuthoringSkill,
} from "@/lib/pedlead-content-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: "add" | "update" | "delete";
      unitId: string;
      skillId?: string;
      skill?: Partial<AuthoringSkill>;
      stageAsPendingEditIfValidated?: boolean;
    };

    if (!body?.unitId || !body?.action) {
      return NextResponse.json({ error: "Missing unitId or action" }, { status: 400 });
    }

    if (body.action === "delete") {
      if (!body.skillId) return NextResponse.json({ error: "Missing skillId" }, { status: 400 });
      const updated = await deleteSkill(body.unitId, body.skillId);
      return NextResponse.json({ unit: updated });
    }

    if (body.action === "add") {
      if (!body.skill || !body.skill.name) {
        return NextResponse.json({ error: "Missing skill details" }, { status: 400 });
      }
      const updated = await addSkill(body.unitId, body.skill as AuthoringSkill);
      return NextResponse.json({ unit: updated });
    }

    if (body.action === "update") {
      if (!body.skillId || !body.skill) {
        return NextResponse.json({ error: "Missing skillId or update patch" }, { status: 400 });
      }
      const updated = await updateSkill(body.unitId, body.skillId, body.skill, {
        stageAsPendingEditIfValidated: body.stageAsPendingEditIfValidated,
      });
      return NextResponse.json({ unit: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[api/pedlead/content/skill] error:", error);
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
  }
}
