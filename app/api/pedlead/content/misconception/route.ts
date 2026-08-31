import { NextResponse } from "next/server";
import {
  addMisconception,
  deleteMisconception,
  updateMisconception,
  type AuthoringMisconception,
} from "@/lib/pedlead-content-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: "add" | "update" | "delete";
      unitId: string;
      misconceptionId?: string;
      misconception?: Partial<AuthoringMisconception>;
      stageAsPendingEditIfValidated?: boolean;
    };

    if (!body?.unitId || !body?.action) {
      return NextResponse.json({ error: "Missing unitId or action" }, { status: 400 });
    }

    if (body.action === "delete") {
      if (!body.misconceptionId) return NextResponse.json({ error: "Missing misconceptionId" }, { status: 400 });
      const updated = await deleteMisconception(body.unitId, body.misconceptionId);
      return NextResponse.json({ unit: updated });
    }

    if (body.action === "add") {
      if (!body.misconception || !body.misconception.name) {
        return NextResponse.json({ error: "Missing misconception details" }, { status: 400 });
      }
      const updated = await addMisconception(body.unitId, body.misconception as AuthoringMisconception);
      return NextResponse.json({ unit: updated });
    }

    if (body.action === "update") {
      if (!body.misconceptionId || !body.misconception) {
        return NextResponse.json({ error: "Missing misconceptionId or update patch" }, { status: 400 });
      }
      const updated = await updateMisconception(body.unitId, body.misconceptionId, body.misconception, {
        stageAsPendingEditIfValidated: body.stageAsPendingEditIfValidated,
      });
      return NextResponse.json({ unit: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[api/pedlead/content/misconception] error:", error);
    return NextResponse.json({ error: "Failed to update misconception" }, { status: 500 });
  }
}
