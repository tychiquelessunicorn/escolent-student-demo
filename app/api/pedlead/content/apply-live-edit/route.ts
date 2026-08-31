import { NextResponse } from "next/server";
import {
  applyLiveValidatedSkillEdit,
  discardLiveValidatedSkillEdit,
  applyLiveValidatedMisconceptionEdit,
  discardLiveValidatedMisconceptionEdit,
} from "@/lib/pedlead-content-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      unitId: string;
      skillId?: string;
      misconceptionId?: string;
      action: "apply" | "discard";
    };

    if (!body?.unitId || !body?.action) {
      return NextResponse.json({ error: "Missing unitId or action" }, { status: 400 });
    }

    if (body.skillId) {
      const updated =
        body.action === "apply"
          ? await applyLiveValidatedSkillEdit(body.unitId, body.skillId)
          : await discardLiveValidatedSkillEdit(body.unitId, body.skillId);
      return NextResponse.json({ unit: updated });
    }

    if (body.misconceptionId) {
      const updated =
        body.action === "apply"
          ? await applyLiveValidatedMisconceptionEdit(body.unitId, body.misconceptionId)
          : await discardLiveValidatedMisconceptionEdit(body.unitId, body.misconceptionId);
      return NextResponse.json({ unit: updated });
    }

    return NextResponse.json({ error: "Specify skillId or misconceptionId" }, { status: 400 });
  } catch (error) {
    console.error("[api/pedlead/content/apply-live-edit] error:", error);
    return NextResponse.json({ error: "Failed to apply/discard live edit" }, { status: 500 });
  }
}
