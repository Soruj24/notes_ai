/**
 * Auth validation schemas. Pure functions, no dependencies.
 * Single source of truth used by API handlers (server) and forms (client).
 */

export type FieldErrors = Record<string, string[]>;

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  errors?: FieldErrors;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LEN = 254;
const MAX_NAME_LEN = 64;
const MIN_PASSWORD_LEN = 8;
const MAX_PASSWORD_LEN = 128;

function fail<T>(errors: FieldErrors): ValidationResult<T> {
  return { ok: false, errors };
}

function pass<T>(data: T): ValidationResult<T> {
  return { ok: true, data };
}

function cleanEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function emailIssues(email: string): string[] {
  if (!email) return ["Email is required."];
  if (email.length > MAX_EMAIL_LEN) return ["Email is too long."];
  if (!EMAIL_RE.test(email)) return ["Enter a valid email address."];
  return [];
}

function nameIssues(name: string): string[] {
  if (!name) return ["Name is required."];
  if (name.length > MAX_NAME_LEN)
    return [`Name must be ${MAX_NAME_LEN} characters or fewer.`];
  return [];
}

export interface PasswordPolicy {
  minLength?: number;
  maxLength?: number;
}

function passwordIssues(password: string, policy: PasswordPolicy = {}): string[] {
  const min = policy.minLength ?? MIN_PASSWORD_LEN;
  const max = policy.maxLength ?? MAX_PASSWORD_LEN;
  const issues: string[] = [];
  if (!password) return ["Password is required."];
  if (password.length < min)
    issues.push(`Password must be at least ${min} characters.`);
  if (password.length > max)
    issues.push(`Password must be ${max} characters or fewer.`);
  if (!/[A-Za-z]/.test(password)) issues.push("Password must contain a letter.");
  if (!/[0-9]/.test(password)) issues.push("Password must contain a number.");
  return issues;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export function validateRegister(
  input: {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  },
  policy: PasswordPolicy = {},
): ValidationResult<RegisterData> {
  const name = cleanName(input.name);
  const email = cleanEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const confirm =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  const errors: FieldErrors = {};

  const n = nameIssues(name);
  if (n.length) errors.name = n;
  const e = emailIssues(email);
  if (e.length) errors.email = e;
  const p = passwordIssues(password, policy);
  if (p.length) errors.password = p;
  if (!errors.password && password !== confirm)
    errors.confirmPassword = ["Passwords do not match."];

  if (Object.keys(errors).length) return fail(errors);
  return pass({ name, email, password });
}

export interface LoginData {
  email: string;
  password: string;
}

export function validateLogin(input: {
  email?: unknown;
  password?: unknown;
}): ValidationResult<LoginData> {
  const email = cleanEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const errors: FieldErrors = {};

  const e = emailIssues(email);
  if (e.length) errors.email = e;
  if (!password) errors.password = ["Password is required."];

  if (Object.keys(errors).length) return fail(errors);
  return pass({ email, password });
}

export interface ProfileData {
  name: string;
}

export function validateProfileUpdate(input: {
  name?: unknown;
}): ValidationResult<ProfileData> {
  const name = cleanName(input.name);
  const errors: FieldErrors = {};
  const n = nameIssues(name);
  if (n.length) errors.name = n;
  if (Object.keys(errors).length) return fail(errors);
  return pass({ name });
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export function validatePasswordChange(
  input: {
    currentPassword?: unknown;
    newPassword?: unknown;
    confirmNewPassword?: unknown;
  },
  policy: PasswordPolicy = {},
): ValidationResult<PasswordChangeData> {
  const current =
    typeof input.currentPassword === "string" ? input.currentPassword : "";
  const next = typeof input.newPassword === "string" ? input.newPassword : "";
  const confirm =
    typeof input.confirmNewPassword === "string"
      ? input.confirmNewPassword
      : "";
  const errors: FieldErrors = {};

  if (!current) errors.currentPassword = ["Current password is required."];
  const p = passwordIssues(next, policy);
  if (p.length) errors.newPassword = p;
  if (!errors.newPassword) {
    if (next === current)
      errors.newPassword = ["New password must differ from the current one."];
    else if (next !== confirm)
      errors.confirmNewPassword = ["Passwords do not match."];
  }

  if (Object.keys(errors).length) return fail(errors);
  return pass({ currentPassword: current, newPassword: next });
}

/** Allow only internal redirect targets (prevents open-redirect attacks). */
export function normalizeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
