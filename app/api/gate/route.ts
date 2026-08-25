import { NextResponse } from "next/server";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const form = await request.formData();
  const submitted = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/practice");
  // Only same-origin paths, so the gate can't be turned into an open redirect.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/practice";

  if (submitted !== password) {
    const url = new URL("/gate", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", destination);
    return NextResponse.redirect(url, 303);
  }

  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set({
    name: GATE_COOKIE,
    value: await gateToken(password),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
