import { NextResponse } from "next/server";
import {
  changeBillingPlan,
  type BillingPlanTier,
} from "@/lib/admin-billing-store";

export const runtime = "nodejs";

function readPlanTier(value: unknown): BillingPlanTier | null {
  return value === "core" || value === "ai_adaptive" ? value : null;
}

/**
 * Structured-only plan change — Req 15c.3.
 * No plain-language routing; not reachable via /api/ai.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    planTier?: unknown;
    confirmPhrase?: string;
    intentText?: string;
    question?: string;
  };

  if (body.intentText || body.question) {
    return NextResponse.json(
      {
        error:
          "Plan changes use the structured confirmation form on the Billing page — not plain-language commands.",
      },
      { status: 400 },
    );
  }

  const planTier = readPlanTier(body.planTier);
  if (!planTier) {
    return NextResponse.json({ error: "Choose Core or AI-Adaptive." }, { status: 400 });
  }

  const result = await changeBillingPlan({
    planTier,
    confirmPhrase: body.confirmPhrase?.trim() ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ billing: result.snapshot });
}
