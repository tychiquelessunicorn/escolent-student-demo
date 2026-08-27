import { NextResponse } from "next/server";
import { buildExportCsv, type ExportKind } from "@/lib/admin-data-export";

export const runtime = "nodejs";

const KINDS: ExportKind[] = ["interactions", "mastery", "sessions"];

function readKind(value: string | null): ExportKind | null {
  if (!value) return null;
  return KINDS.includes(value as ExportKind) ? (value as ExportKind) : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = readKind(url.searchParams.get("kind"));
  if (!kind) {
    return NextResponse.json(
      { error: "Unknown export kind. Use interactions, mastery, or sessions." },
      { status: 400 },
    );
  }

  const { filename, body } = await buildExportCsv(kind);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
