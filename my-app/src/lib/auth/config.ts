import { SESSION_COOKIE, SESSION_TTL_MS } from "@/src/lib/auth/constants";

/**
 * Server-side auth config. Reads AUTH_SECRET from the environment
 * (.env.local, gitignored). Throws with a clear message when missing.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short (min 32 chars). Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" and add it to .env.local.",
    );
  }
  return secret;
}

export function sessionMaxAgeSeconds(): number {
  return Math.floor(SESSION_TTL_MS / 1000);
}

export interface SessionCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
}

export function sessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  };
}

export function clearCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export { SESSION_COOKIE, SESSION_TTL_MS };
