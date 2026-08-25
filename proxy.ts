import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

const PUBLIC_PATHS = ["/gate", "/api/gate"];

export async function proxy(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD;

  // Unset means the gate is off. That is the local development path; in
  // production it is a misconfiguration worth shouting about, since it leaves
  // the Anthropic balance exposed to anyone who finds the URL.
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[gate] DEMO_PASSWORD is not set — the demo is publicly open");
    }
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (cookie && cookie === (await gateToken(password))) {
    return NextResponse.next();
  }

  // API routes get an honest status rather than an HTML redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
