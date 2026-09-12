/**
 * Signed session tokens, verified with WebCrypto so both the Node runtime
 * (API handlers, pages) and the edge runtime (middleware) can use them.
 * Format: base64url(payload).base64url(hmac-sha256(payload)).
 */

export interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(
  userId: string,
  secret: string,
  ttlMs: number,
  now = Date.now(),
): Promise<string> {
  const payload: SessionPayload = {
    sub: userId,
    iat: now,
    exp: now + ttlMs,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<SessionPayload | null> {
  try {
    const dot = token.indexOf(".");
    if (dot <= 0) return null;
    const payloadBytes = b64urlDecode(token.slice(0, dot));
    const sigBytes = b64urlDecode(token.slice(dot + 1));
    if (payloadBytes.length === 0 || sigBytes.length === 0) return null;
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    ) as Partial<SessionPayload>;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.sub.length === 0
    ) {
      return null;
    }
    if (payload.exp <= now) return null;
    return { sub: payload.sub, iat: payload.iat, exp: payload.exp };
  } catch {
    return null;
  }
}
