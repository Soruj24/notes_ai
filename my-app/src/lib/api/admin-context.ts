import type { RequestContext } from "@/src/services/admin/users.service";

/**
 * Request metadata for audit entries: first x-forwarded-for value plus
 * user agent. Proxies append, so index 0 is the originating client.
 */
export function getRequestContext(req: Request): RequestContext {
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || undefined;
  const userAgent = req.headers.get("user-agent")?.slice(0, 512) || undefined;
  return { ipAddress, userAgent };
}
