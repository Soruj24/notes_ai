import { createHash } from "node:crypto";
import { getAuthSecret, SESSION_TTL_MS } from "@/src/lib/auth/config";
import { hashPassword, verifyPassword } from "@/src/lib/auth/password";
import { createSessionToken } from "@/src/lib/auth/tokens";
import {
  createSessionRecord,
  deleteSessionByTokenHash,
  deleteSessionsForUser,
  findSessionByTokenHash,
} from "@/src/repositories/session.repository";
import {
  createUser,
  findUserById,
  findUserWithHash,
  touchLastActiveAt,
  touchLastLoginAt,
  updateUserName,
  updateUserPasswordHash,
  type UserRecord,
} from "@/src/repositories/user.repository";

/**
 * Auth use-cases. Route handlers validate input, then delegate here.
 * No HTTP or React concerns in this module.
 */

/** Minimum gap between lastActiveAt writes (avoids a write per request). */
const ACTIVE_TOUCH_MS = 15 * 60 * 1000;

export interface AuthResult {
  user: UserRecord;
  token: string;
  expiresAt: Date;
}

/** SHA-256 token hash for storage/lookup (not a password hash). */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const token = await createSessionToken(userId, getAuthSecret(), SESSION_TTL_MS);
  await createSessionRecord({ tokenHash: hashSessionToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });
  const { token, expiresAt } = await issueSession(user.id);
  return { user, token, expiresAt };
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthResult | null> {
  const found = await findUserWithHash(email);
  if (!found) return null;
  const valid = await verifyPassword(password, found.passwordHash);
  if (!valid) return null;
  // Non-active accounts fail closed with the same generic 401 (no enumeration).
  if (found.status !== "ACTIVE") return null;
  const { id, name, email: userEmail, role, status, isAdmin, createdAt, updatedAt } = found;
  const user: UserRecord = { id, name, email: userEmail, role, status, isAdmin, createdAt, updatedAt };
  await touchLastLoginAt(id).catch(() => {});
  const { token, expiresAt } = await issueSession(user.id);
  return { user, token, expiresAt };
}

export async function getSessionUser(token: string): Promise<(UserRecord & { createdAt: Date }) | null> {
  const row = await findSessionByTokenHash(hashSessionToken(token));
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    if (row) await deleteSessionByTokenHash(hashSessionToken(token));
    return null;
  }
  const user = await findUserById(row.userId);
  // Suspended/banned/deleted accounts lock out instantly; rows expire naturally.
  if (!user || user.status !== "ACTIVE") return null;
  // Throttled activity touch: at most one write per session per window.
  const last = user.lastActiveAt?.getTime() ?? 0;
  if (Date.now() - last > ACTIVE_TOUCH_MS) {
    await touchLastActiveAt(user.id).catch(() => {});
  }
  return user;
}

export async function revokeSession(token: string): Promise<void> {
  await deleteSessionByTokenHash(hashSessionToken(token));
}

export async function renameUser(userId: string, name: string): Promise<UserRecord | null> {
  await updateUserName(userId, name);
  return findUserById(userId);
}

/**
 * Verify current password, set the new one, revoke every session, and
 * return a fresh token so the current device stays signed in.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ token: string } | { error: "invalid_current" }> {
  const found = await findUserById(userId);
  if (!found) return { error: "invalid_current" };
  const withHash = await findUserWithHash(found.email);
  if (!withHash || !(await verifyPassword(currentPassword, withHash.passwordHash))) {
    return { error: "invalid_current" };
  }
  await updateUserPasswordHash(userId, await hashPassword(newPassword));
  await deleteSessionsForUser(userId);
  const { token } = await issueSession(userId);
  return { token };
}
