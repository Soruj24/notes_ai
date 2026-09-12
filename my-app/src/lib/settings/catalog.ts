import type { Permission } from "@/src/lib/rbac/permissions";

/**
 * Typed system settings registry. Every key declares its native type,
 * default, category, edit permission, and validator — values are stored
 * natively (string/number/boolean), never as opaque JSON blobs. Unknown
 * keys are rejected: the console cannot invent settings.
 *
 * Enforcement map (each key is read where it takes effect):
 * site.name → app shell brand; general.defaultWorkspaceName → bootstrap
 * auth.* → register/login routes + auth validation
 * security.* → login throttle + password validation
 * notifications.* → channel fan-out gate
 * email.* → email channel config (preparatory: no SMTP transport yet)
 * storage.* → attachment repository choke point
 * search.* → search/semantic defaults
 * calendar.* → schedule range clamp
 * ratelimit.* → login throttle
 * maintenance.* → API gate + app layout
 * appearance.* → theme default via root layout
 */

export const SETTING_CATEGORIES = [
  "General",
  "Authentication",
  "Security",
  "AI",
  "Notifications",
  "Email",
  "Storage",
  "Search",
  "Calendar",
  "Rate Limits",
  "Maintenance",
  "Appearance",
] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

export type SettingValueType = "string" | "number" | "boolean" | "enum";

export interface SettingDef {
  key: string;
  label: string;
  description: string;
  category: Exclude<SettingCategory, "AI">;
  type: SettingValueType;
  options?: readonly string[];
  default: string | number | boolean;
  /** Permission required to edit. Reads need settings.view. */
  permission: Permission;
  superadminOnly?: boolean;
}

function def(d: SettingDef): SettingDef {
  return d;
}

export const SETTING_DEFS: Record<string, SettingDef> = {
  "site.name": def({
    key: "site.name",
    label: "Site name",
    description: "Product brand shown in the workspace shell.",
    category: "General",
    type: "string",
    default: "NotoAI",
    permission: "settings.update",
  }),
  "general.defaultWorkspaceName": def({
    key: "general.defaultWorkspaceName",
    label: "Default workspace name",
    description: "Name of the auto-created first workspace.",
    category: "General",
    type: "string",
    default: "Personal",
    permission: "settings.update",
  }),
  "auth.registration": def({
    key: "auth.registration",
    label: "Open registration",
    description: "When off, new accounts cannot register (existing sign-ins unaffected).",
    category: "Authentication",
    type: "boolean",
    default: true,
    permission: "settings.update",
  }),
  "auth.passwordMinLength": def({
    key: "auth.passwordMinLength",
    label: "Minimum password length",
    description: "Applies to registration and password changes (8–32).",
    category: "Authentication",
    type: "number",
    default: 8,
    permission: "settings.update",
  }),
  "security.passwordMaxLength": def({
    key: "security.passwordMaxLength",
    label: "Maximum password length",
    description: "Upper bound guarding hash input (64–256).",
    category: "Security",
    type: "number",
    default: 128,
    permission: "settings.update",
  }),
  "notifications.enabled": def({
    key: "notifications.enabled",
    label: "Notifications",
    description: "Master switch for notification fan-out. Inbox history is kept.",
    category: "Notifications",
    type: "boolean",
    default: true,
    permission: "settings.update",
  }),
  "email.enabled": def({
    key: "email.enabled",
    label: "Email delivery",
    description: "Preparatory: no SMTP transport is wired yet; the channel reports not-delivered until then.",
    category: "Email",
    type: "boolean",
    default: false,
    permission: "settings.update",
  }),
  "email.provider": def({
    key: "email.provider",
    label: "Email provider",
    description: "Transport selector for when delivery lands.",
    category: "Email",
    type: "enum",
    options: ["none", "smtp"],
    default: "none",
    permission: "settings.update",
  }),
  "email.fromName": def({
    key: "email.fromName",
    label: "From name",
    description: "Display name on outbound mail.",
    category: "Email",
    type: "string",
    default: "NotoAI",
    permission: "settings.update",
  }),
  "email.fromAddress": def({
    key: "email.fromAddress",
    label: "From address",
    description: "Sender address on outbound mail. Empty = unconfigured.",
    category: "Email",
    type: "string",
    default: "",
    permission: "settings.update",
  }),
  "storage.maxAttachmentMb": def({
    key: "storage.maxAttachmentMb",
    label: "Max attachment size (MB)",
    description: "Per-file cap enforced at upload (1–100).",
    category: "Storage",
    type: "number",
    default: 25,
    permission: "settings.update",
  }),
  "storage.workspaceQuotaMb": def({
    key: "storage.workspaceQuotaMb",
    label: "Workspace storage quota (MB)",
    description: "Total attachments per workspace. 0 = unlimited.",
    category: "Storage",
    type: "number",
    default: 0,
    permission: "settings.update",
  }),
  "search.resultsPerType": def({
    key: "search.resultsPerType",
    label: "Results per type",
    description: "Default hits per entity in keyword search (1–25).",
    category: "Search",
    type: "number",
    default: 6,
    permission: "settings.update",
  }),
  "search.semanticTopK": def({
    key: "search.semanticTopK",
    label: "Semantic top-K",
    description: "Default candidates for vector search (1–50).",
    category: "Search",
    type: "number",
    default: 10,
    permission: "settings.update",
  }),
  "calendar.scheduleLookaheadDays": def({
    key: "calendar.scheduleLookaheadDays",
    label: "Schedule lookahead (days)",
    description: "How far ahead the schedule API reads. Caps abuse (7–365).",
    category: "Calendar",
    type: "number",
    default: 90,
    permission: "settings.update",
  }),
  "ratelimit.loginMaxAttempts": def({
    key: "ratelimit.loginMaxAttempts",
    label: "Login max attempts",
    description: "Failed logins per window before lockout (3–20).",
    category: "Rate Limits",
    type: "number",
    default: 5,
    permission: "settings.update",
  }),
  "ratelimit.loginWindowMinutes": def({
    key: "ratelimit.loginWindowMinutes",
    label: "Login window (minutes)",
    description: "Throttle window for failed logins (1–60).",
    category: "Rate Limits",
    type: "number",
    default: 10,
    permission: "settings.update",
  }),
  "maintenance.enabled": def({
    key: "maintenance.enabled",
    label: "Maintenance mode",
    description: "Downtime switch. Who stays in is controlled below — never hardcoded.",
    category: "Maintenance",
    type: "boolean",
    default: false,
    permission: "settings.update",
  }),
  "maintenance.message": def({
    key: "maintenance.message",
    label: "Maintenance message",
    description: "Shown on the maintenance page (max 500 chars).",
    category: "Maintenance",
    type: "string",
    default: "NotoAI is down for scheduled maintenance. Please check back soon.",
    permission: "settings.update",
  }),
  "maintenance.estimatedEndTime": def({
    key: "maintenance.estimatedEndTime",
    label: "Estimated end time",
    description: "ISO date-time shown on the maintenance page. Empty = unknown.",
    category: "Maintenance",
    type: "string",
    default: "",
    permission: "settings.update",
  }),
  "maintenance.allowAdminAccess": def({
    key: "maintenance.allowAdminAccess",
    label: "Allow admin access",
    description: "When off, even staff see the maintenance page and API 503 (database recovery only).",
    category: "Maintenance",
    type: "boolean",
    default: true,
    permission: "settings.update",
  }),
  "maintenance.allowAuthentication": def({
    key: "maintenance.allowAuthentication",
    label: "Allow sign-in / registration",
    description: "When off, login and registration return 503. Existing sessions follow the rules above.",
    category: "Maintenance",
    type: "boolean",
    default: true,
    permission: "settings.update",
  }),
  "appearance.theme": def({
    key: "appearance.theme",
    label: "Default theme",
    description: "Theme for visitors without a saved preference.",
    category: "Appearance",
    type: "enum",
    options: ["system", "light", "dark"],
    default: "system",
    permission: "settings.update",
  }),
};

export const SETTING_KEYS = Object.keys(SETTING_DEFS);

export function isSettingKey(value: unknown): value is keyof typeof SETTING_DEFS {
  return typeof value === "string" && value in SETTING_DEFS;
}

function asInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SettingValidation {
  value?: string | number | boolean;
  errors?: Record<string, string[]>;
}

/** Validate a candidate value. Returns the cleaned value or field errors. */
export function validateSettingValue(key: string, value: unknown): SettingValidation {
  const fail = (msg: string): SettingValidation => ({ errors: { value: [msg] } });
  const defn = SETTING_DEFS[key];
  if (!defn) return fail("Unknown setting key.");
  switch (key) {
    case "site.name":
      if (typeof value !== "string" || !value.trim()) return fail("Site name is required.");
      if (value.trim().length > 60) return fail("Site name must be 60 characters or fewer.");
      return { value: value.trim() };
    case "general.defaultWorkspaceName":
      if (typeof value !== "string" || !value.trim()) return fail("Workspace name is required.");
      if (value.trim().length > 80) return fail("Must be 80 characters or fewer.");
      return { value: value.trim() };
    case "auth.passwordMinLength":
      {
        const n = asInt(value);
        if (n === undefined || n < 8 || n > 32) {
          return fail("Must be an integer between 8 and 32.");
        }
        return { value: n };
      }
    case "security.passwordMaxLength":
      {
        const n = asInt(value);
        if (n === undefined || n < 64 || n > 256) {
          return fail("Must be an integer between 64 and 256.");
        }
        return { value: n };
      }
    case "storage.maxAttachmentMb":
      {
        const n = asInt(value);
        if (n === undefined || n < 1 || n > 100) {
          return fail("Must be an integer between 1 and 100.");
        }
        return { value: n };
      }
    case "storage.workspaceQuotaMb":
      {
        const n = asInt(value);
        if (n === undefined || n < 0 || n > 102400) {
          return fail("Must be an integer between 0 (unlimited) and 102400.");
        }
        return { value: n };
      }
    case "search.resultsPerType":
      {
        const n = asInt(value);
        if (n === undefined || n < 1 || n > 25) {
          return fail("Must be an integer between 1 and 25.");
        }
        return { value: n };
      }
    case "search.semanticTopK":
      {
        const n = asInt(value);
        if (n === undefined || n < 1 || n > 50) {
          return fail("Must be an integer between 1 and 50.");
        }
        return { value: n };
      }
    case "calendar.scheduleLookaheadDays":
      {
        const n = asInt(value);
        if (n === undefined || n < 7 || n > 365) {
          return fail("Must be an integer between 7 and 365.");
        }
        return { value: n };
      }
    case "ratelimit.loginMaxAttempts":
      {
        const n = asInt(value);
        if (n === undefined || n < 3 || n > 20) {
          return fail("Must be an integer between 3 and 20.");
        }
        return { value: n };
      }
    case "ratelimit.loginWindowMinutes":
      {
        const n = asInt(value);
        if (n === undefined || n < 1 || n > 60) {
          return fail("Must be an integer between 1 and 60.");
        }
        return { value: n };
      }
    case "email.provider":
      return value === "none" || value === "smtp" ? { value } : fail("Must be none or smtp.");
    case "email.fromName":
      if (typeof value !== "string") return fail("Must be a string.");
      if (value.length > 80) return fail("Must be 80 characters or fewer.");
      return { value: value.trim() };
    case "email.fromAddress": {
      if (typeof value !== "string") return fail("Must be a string.");
      const trimmed = value.trim().toLowerCase();
      if (trimmed && !EMAIL_RE.test(trimmed)) return fail("Must be a valid email address or empty.");
      return { value: trimmed };
    }
    case "maintenance.message":
      if (typeof value !== "string") return fail("Must be a string.");
      if (value.length > 500) return fail("Must be 500 characters or fewer.");
      return { value };
    case "maintenance.estimatedEndTime": {
      if (typeof value !== "string") return fail("Must be a string.");
      const trimmed = value.trim();
      if (trimmed && Number.isNaN(Date.parse(trimmed))) {
        return fail("Must be a valid ISO date-time or empty.");
      }
      return { value: trimmed };
    }
    case "appearance.theme":
      return value === "system" || value === "light" || value === "dark"
        ? { value }
        : fail("Must be system, light, or dark.");
    default:
      // Booleans: auth.registration, notifications.enabled, email.enabled, maintenance.enabled
      if (defn.type === "boolean") {
        return typeof value === "boolean" ? { value } : fail("Must be a boolean.");
      }
      return fail("Unsupported setting type.");
  }
}
