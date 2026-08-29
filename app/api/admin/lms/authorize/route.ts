import { NextResponse } from "next/server";
import { authorizeLmsIntegration, type LmsType } from "@/lib/lms-integration-store";

export const runtime = "nodejs";

function readLmsType(value: unknown): LmsType | null {
  if (value === "canvas" || value === "moodle" || value === "google_classroom") return value;
  return null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const lmsType = readLmsType(body.lmsType);
  if (!lmsType) {
    return NextResponse.json({ error: "Invalid lmsType" }, { status: 400 });
  }

  if (lmsType === "google_classroom") {
    return NextResponse.json(
      {
        error:
          "Google Classroom connects through domain OAuth on Google's authorization screen — not through this endpoint.",
      },
      { status: 400 },
    );
  }

  if (lmsType === "canvas") {
    const result = await authorizeLmsIntegration({
      lmsType: "canvas",
      instanceUrl: String(body.instanceUrl ?? ""),
      developerKey: String(body.developerKey ?? ""),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ integration: result.integration });
  }

  const enabledRaw = body.enabledFunctions;
  const enabledFunctions = Array.isArray(enabledRaw)
    ? enabledRaw.filter((fn): fn is string => typeof fn === "string")
    : [];

  const result = await authorizeLmsIntegration({
    lmsType: "moodle",
    instanceUrl: String(body.instanceUrl ?? ""),
    wsToken: String(body.wsToken ?? ""),
    enabledFunctions,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ integration: result.integration });
}
