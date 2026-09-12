import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/src/lib/auth/constants";
import { verifySessionToken } from "@/src/lib/auth/tokens";
import { normalizeNextPath } from "@/src/lib/auth/validation";

const PROTECTED_PREFIXES = [
  "/profile",
  "/dashboard",
  "/planner",
  "/notes",
  "/tasks",
  "/calendar",
  "/schedule",
  "/projects",
  "/goals",
  "/reminders",
  "/templates",
  "/notifications",
  "/search",
  "/analytics",
  "/assistant",
  "/admin",
];

const AUTH_PAGES = ["/login", "/register"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Edge gate (Next 16 "proxy", formerly middleware): signature + expiry
 * pre-check (no DB here — revocation is enforced by server
 * components/handlers via verifyRequestSession).
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isProtected = matches(pathname, PROTECTED_PREFIXES);
  const isAuthPage = matches(pathname, AUTH_PAGES);
  if (!isProtected && !isAuthPage) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET ?? "";
  const session =
    token && secret ? await verifySessionToken(token, secret) : null;

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const next = normalizeNextPath(
      req.nextUrl.searchParams.get("next"),
      "/profile",
    );
    const url = req.nextUrl.clone();
    url.pathname = next;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
