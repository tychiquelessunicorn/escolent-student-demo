import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateToken } from "@/lib/gate";
import {
  isStudentShellApiPath,
  isStudentShellPagePath,
  resolveStudentShellAccess,
  studentShellAccessDeniedBody,
} from "@/lib/student-shell-access";

const PUBLIC_PATHS = ["/gate", "/api/gate"];

async function enforceStudentShellAccess(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!isStudentShellPagePath(pathname) && !isStudentShellApiPath(pathname, request.method)) {
    return null;
  }

  const access = await resolveStudentShellAccess();
  if (access.allowed) return null;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(studentShellAccessDeniedBody(access), { status: 403 });
  }

  // Page requests fall through to the server layout, which renders the same block UI.
  return null;
}

export async function proxy(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD;

  // Unset means the gate is off. That is the local development path; in
  // production it is a misconfiguration worth shouting about, since it leaves
  // the Anthropic balance exposed to anyone who finds the URL.
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[gate] DEMO_PASSWORD is not set — the demo is publicly open");
    }
    const studentAccessResponse = await enforceStudentShellAccess(request);
    if (studentAccessResponse) return studentAccessResponse;
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (cookie && cookie === (await gateToken(password))) {
    const studentAccessResponse = await enforceStudentShellAccess(request);
    if (studentAccessResponse) return studentAccessResponse;
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
