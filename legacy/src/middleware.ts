import { NextResponse, type NextRequest } from "next/server";

// Edge gate: only checks that a session cookie exists. The real authentication & authorization
// happen server-side (getCurrentUser / requirePermission) for every page, action and API route.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("onet_session");
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/dashboard") && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon|icon|brand|uploads).*)"] };
