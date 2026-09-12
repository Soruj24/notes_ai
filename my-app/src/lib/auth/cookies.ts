import { SESSION_COOKIE } from "@/src/lib/auth/constants";

/** Edge-safe: read the session token from a Request's Cookie header. */
export function getSessionTokenFromRequest(req: Request): string | undefined {
  const raw = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
