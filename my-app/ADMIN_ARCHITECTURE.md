# NotoAI — Admin Control Center: Architecture

Status: **planning only — nothing implemented.** This document defines how a
production-grade Admin Control Center integrates with the existing NotoAI
codebase without breaking its conventions.

Companion docs: `ADMIN_ROLES.md` (roles + permission matrix),
`ADMIN_ROADMAP.md` (phased build plan).

---

## 1. What exists today (verified)

- **Auth** (`app/api/auth/*`, `src/lib/auth/*`, `src/services/auth.service.ts`):
  custom cookie-session auth. `notoai_session` httpOnly cookie, HMAC-signed
  token (`tokens.ts`), server-side session registry (`session.model.ts`,
  token stored as SHA-256 hash, TTL auto-expiry). scrypt password hashing.
  Login has an in-memory per-email throttle; no general API rate limiter.
- **Authorization** (`src/repositories/base.ts`, `src/lib/db/enums.ts`): all
  privilege is **per-workspace membership** — roles
  `owner | admin | member | viewer`. Enforced via `requireMembership()` (miss
  returns 404 to hide existence), `requireRole()`, `assertCanWrite()`.
  **There is no platform/global role.** `user.model.ts` has no role field;
  grep for `isAdmin|superuser` returns nothing.
- **API** (`app/api/**`, `src/lib/api/request.ts`): route handlers use
  `requireApiUser()` → `parseJsonBody()` → validate → service →
  `toApiError()`. Errors are `{error}` / `{errors:{field:[msgs]}}`.
- **Layering**: `repositories/*` (Mongoose, membership-gated) →
  `services/*` (delegation + `publishDomainEvent()` + best-effort
  `logActivity()`) → route handlers. Never DB-direct from routes/agent.
- **Models** (`src/models/`, 18): users, sessions, workspaces,
  workspace-members, notes, tasks, events, reminders, projects, goals, tags,
  attachments, notifications, ai-conversations, ai-messages, activity-logs,
  templates, embeddings. Every workspace row carries `workspaceId`.
- **Edge gate** (`proxy.ts`): cookie signature+expiry check only (no DB);
  revocation is enforced later by `verifyRequestSession()`.
- **Realtime** (`src/lib/realtime/*`): standalone Socket.IO on
  `SOCKET_PORT` (default 3001); browser sockets auth by session cookie;
  rooms `user:{id}` / `ws:{workspaceId}`; internal emit via
  `SOCKET_EMIT_SECRET`. Events in `domain.ts:DOMAIN_EVENTS`.
- **Notifications**: `notification.model.ts` + `InAppChannel` (always on);
  email/push channels are stubs. Cron (`app/api/cron/reminders`) fans out
  via `sendToChannels()` + `emitToUser()`.
- **AI** (`src/lib/ai/*`): global env-only config (`OLLAMA_API_KEY`,
  `AI_MODEL`, `OLLAMA_BASE_URL`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`);
  no per-workspace override, no usage accounting UI (token counts are stored
  on `AiMessage` but never aggregated). Agent tools are workspace-bound and
  service-backed.
- **Frontend**: `app/(app)/*` pages are route-free (no `[wid]` in URLs;
  workspace resolved server-side via `requireWorkspace()`); `[wid]` exists
  only under `app/api/workspaces/[wid]/`. State is 7 RTK Query APIs + 1 UI
  slice; no auth slice (httpOnly cookie). Shell: `AppShell`, `Sidebar`
  (driven by `layout/nav.ts:NAV_SECTIONS`), `Topbar`, `BottomNav`,
  `MobileNav`. No `/settings` or admin pages exist. Tailwind v4, class-based
  dark mode, `lucide-react` icons, `ui/*` primitives (`Dialog`, `Drawer`,
  `EmptyState`, `Popover`, `OptionMenu`, …).

## 2. Design principles for the Admin Center

1. **Reuse, don't fork.** Admin reads/writes go through the same
   services/repositories/validators as user paths. New code lives in
   `services/admin/*` and `app/api/admin/*`, mirroring existing structure.
2. **Explicit privilege escalation.** Normal membership checks stay the
   default; admin code paths call clearly-named overrides
   (`requireAdminUser()`, `…Unscoped…`) so a reviewer can spot every place
   workspace isolation is bypassed.
3. **Everything audited.** Every admin mutation writes an `AuditLog` entry
   (actor, action, target, before/after, IP). Audit log is append-only.
4. **Fail closed.** Unknown role / missing role field ⇒ no admin access.
   Client-side gating is cosmetic; enforcement is server-only (layout +
   API), because the edge proxy cannot do DB checks.
5. **No direct DB manipulation.** Admin operates via services and API routes
   only — the same paths a user request would take, minus membership scope.

## 3. Privilege model (summary; full matrix in ADMIN_ROLES.md)

Add a platform role on the user document:

```ts
// user.model.ts (addition)
role: { type: String, enum: ["user", "support", "admin", "superadmin"], default: "user", index: true }
```

- Workspace roles (`owner|admin|member|viewer`) are **unchanged** and stay
  orthogonal: a platform `admin` is not automatically a workspace member.
- Role is read from the DB on every admin request (never embedded in the
  session token) so demotion/revocation takes effect immediately.
- Bootstrap: `ADMIN_EMAILS` env (comma-separated) promoted by a
  `npm run promote-admin` script; role changes require `superadmin`;
  the last `superadmin` cannot be demoted (mirrors the last-owner guard in
  `workspace.repository.ts`).

## 4. Routes

New route group `app/(admin)/admin/*` with its own layout:

```
app/(admin)/layout.tsx          → requireAdminUser() or redirect /login?next=
app/(admin)/admin/page.tsx      → overview dashboard (counts, health, recent audit)
app/(admin)/admin/users/page.tsx
app/(admin)/admin/users/[id]/page.tsx
app/(admin)/admin/workspaces/page.tsx
app/(admin)/admin/workspaces/[id]/page.tsx
app/(admin)/admin/content/page.tsx        → cross-workspace inspect (read-only first)
app/(admin)/admin/ai/page.tsx             → provider/model config + usage
app/(admin)/admin/features/page.tsx       → feature flags
app/(admin)/admin/settings/page.tsx       → system settings
app/(admin)/admin/audit/page.tsx          → audit log explorer
app/(admin)/admin/system/page.tsx         → health, jobs, announcements
```

- Add `/admin` to `PROTECTED_PREFIXES` in `proxy.ts` (edge still only checks
  session validity; the admin layout does the role check server-side — same
  split of responsibilities as today).
- Add an `Admin` section to `layout/nav.ts:NAV_SECTIONS`, rendered only for
  platform roles (role must come from a server component / `/api/auth/me`
  extension — never from client state). `BottomNav` stays user-only.
- Reuse shell primitives: `Card`, `data-table`, `EmptyState`, `Dialog`,
  `Drawer`, `OptionMenu`, `Badge`, `Tabs`.

## 5. API namespace

`app/api/admin/*`, all handlers start with a new helper mirroring
`requireApiUser()`:

```ts
// src/lib/api/admin.ts
requireAdminUser(req, roles = ["admin", "superadmin"])
  → Promise<{ user } | NextResponse>   // 401 unauthenticated, 403 insufficient
```

Planned surface (each with GET list/detail + POST/PATCH actions as needed):

| Namespace | Purpose |
|---|---|
| `/api/admin/overview` | counts (users, workspaces, tasks…), queue health, recent audit |
| `/api/admin/users` `…/[id]` `…/[id]/role` `…/[id]/sessions` `…/[id]/suspend` | list/search, detail, role change (superadmin), revoke sessions, suspend/restore |
| `/api/admin/workspaces` `…/[id]` `…/[id]/members` | list/search, detail, membership management |
| `/api/admin/content/*` | read-only cross-workspace search + inspect (notes/tasks/events/…); moderation actions (trash/purge/restore) via existing services |
| `/api/admin/ai` `/api/admin/ai/usage` | provider/model/embedding config, per-workspace overrides, token usage aggregation |
| `/api/admin/features` | feature flag CRUD |
| `/api/admin/settings` | system setting get/set (validated per key) |
| `/api/admin/audit` | append-only log query (filters, pagination) |
| `/api/admin/system` | health (db ping, socket, ollama, cron), re-run reminder dispatch, announcements |

Conventions follow existing code: `parseJsonBody`, hand-rolled validators
in `src/lib/validation/admin.ts`, `toApiError()` shapes, `clampLimit()`
pagination, 404-on-miss to avoid enumeration where appropriate.

## 6. Database changes (all additive, indexed)

| Model | Change |
|---|---|
| `User` | `+ role` enum (platform role, indexed, absent = zero permissions), `+ status` (`ACTIVE` default; only ACTIVE authenticates — `getSessionUser()` rejects the rest), `+ isAdmin` (denormalized, synced by `setUserPlatformRole()`), `+ lastLoginAt/lastActiveAt` (throttled touch), `+ suspendedAt/suspensionReason` (reason stripped from all serializers) |
| `SystemSetting` | `{ key (unique), value: Mixed, type, category, description, isPublic, isEditable, updatedBy }`; secret-bearing keys redacted by `toSafeRecord()` |
| `FeatureFlag` | `{ key (unique), name, description, enabled, rolloutPercentage 0–100, targetRoles, targetUsers, environment, updatedBy }` |
| `AdminAuditLog` | `{ actorId, actorRole, action, resourceType, resourceId, workspaceId?, metadata, ipAddress, userAgent, timestamp }`; repository exposes create + list only — no update/delete |
| `AdminRole` / `AdminPermission` | named role + permission registry (built-in grants stay in code; `isSystem` rows non-deletable) |
| `AdminNotification` | staff console inbox (`severity`, `targetRole`, `readBy`) |
| `SecurityEvent` | typed security stream (`login.*`, `permission.denied`, …) with user/ip/time indexes |
| `SystemAnnouncement` | `draft → active → expired` lifecycle for user broadcasts |
| `AiUsageDaily` | (planned) rollup from `AiMessage` token fields |

`ActivityLog` stays the per-workspace user trail; `AuditLog` is the
platform trail. Never merge them — different readers, different retention.

## 7. Audit logging

- Helper `src/services/admin/audit.service.ts:logAdminAction()` called from
  every admin mutation **before returning success**; failures to write audit
  fail the request (opposite of `logActivity()`'s best-effort).
- Capture: actor id/email, action verb, target type+id (+workspace where
  relevant), before/after snapshot for config/role changes, IP
  (`x-forwarded-for` first value), timestamp.
- Readers: `/admin/audit` UI + `/api/admin/audit` with filters
  (actor, action, target, date range). No edit/delete endpoints exist.
- Realtime: publish `admin.audit` domain event so open admin consoles
  refresh (reuse `publishDomainEvent` + an `admin:{role}` room — see §10).

## 8. Security requirements

- **Enforcement layers**: (1) edge proxy: session-valid only; (2) admin
  layout: `requireAdminUser()` server-side, redirect otherwise;
  (3) every `/api/admin/*` handler: `requireAdminUser(roles)`; (4) service
  layer: admin services assert role again (defense in depth, cheap).
- **Session/role freshness**: role read from DB per request; suspend sets
  `status=suspended` which `getSessionUser()` honors → instant lockout
  without touching session rows (plus explicit per-user session revoke
  action for immediacy).
- **CSRF**: cookie `sameSite:"lax"` already; admin mutations additionally
  require `content-type: application/json` (already the convention via
  `parseJsonBody`) — no form posts.
- **Rate limiting**: extend `lib/auth/rate-limit.ts` pattern to a shared
  (upgradable to Redis) limiter and apply to `/api/admin/*` and AI command;
  current in-memory Map is single-instance — flag as pre-production debt.
- **Secrets hygiene**: admin must never display secret values
  (`AUTH_SECRET`, keys); settings API redacts values flagged sensitive,
  updates require re-entry (write-only).
- **PII minimization**: content-inspect views show metadata + excerpt by
  default; full bodies behind an explicit "reveal" that is itself audited.
- **Headers**: add CSP/HSTS/security headers in `next.config.ts` (missing
  today) before admin ships — admin pages are the highest-value XSS target.
- **Admin 2FA + IP allowlist**: roadmap phase 5 (TOTP on the user model,
  enforced for platform roles; optional `ADMIN_IP_ALLOWLIST` env).
- **Cron**: keep `CRON_SECRET` bearer pattern for any admin-triggered jobs.

## 9. Feature management

- `FeatureFlag` rows, e.g. `ai.command`, `ai.note-intelligence`,
  `semantic.search`, `templates.public`, `auth.registration`.
- Server check helper `isFeatureEnabled(key, { workspaceId?, userId? })`
  with precedence: default → global flag → workspace override (optional
  `FeatureOverride` later; start global-only).
- Client-safe flags exposed via `GET /api/config` (public, allowlisted
  keys only) for UI gating; enforcement always server-side.
- Registration kill-switch (`auth.registration`) is the canonical first
  flag — it closes open signup without a deploy.

## 10. AI management

- Today AI is env-only (`getAIConfig()`). Introduce layered resolution:
  **env defaults → `SystemSetting` (`ai.model`, `ai.baseUrl`, `ai.temperature`,
  `ai.maxTokens`, `ai.embeddings.*`) → optional per-workspace override**
  (`AiWorkspaceConfig`, phase 3+). `getAIConfig()` gains an optional
  workspace-aware variant; `isAIConfigured()` stays the gate.
- Admin UI: provider status (Ollama ping + model list via `/api/tags`),
  model/embedding selection, kill-switch flag (`ai.command`), per-workspace
  model override table.
- Usage: nightly rollup job (cron route pattern) aggregates `AiMessage`
  token fields into `AiUsageDaily`; dashboard shows calls/tokens by model,
  workspace, day. No per-message content in admin views (PII rule §8).
- Rate limits: per-user/per-workspace daily AI call caps as system settings,
  checked in `ai/command` route before `createAgent()`.

## 11. System settings

- `SystemSetting` key registry with zod-validated schemas, e.g.
  `site.name`, `auth.registration`, `ai.*`, `notifications.email.*`,
  `limits.*`, `maintenance.mode` (+ `maintenance.message`).
- Maintenance mode: when on, non-admin requests get 503 page (checked in
  proxy-safe server path, not edge), admins bypass.
- Settings UI: grouped form per namespace, typed inputs (reuse `Input`,
  `OptionMenu`, `Switch`), sensitive values write-only.
- Cache: in-memory Map with version counter, invalidated on write; no
  extra infra. Documented upgrade path to Redis alongside rate limiting.

## 12. Realtime + notifications (admin)

- New room `admin:console` joined only by platform roles (socket middleware
  checks `user.role` after session verify — one DB read at handshake).
- `publishDomainEvent()` reused for `admin.audit` + `admin.announcement`.
- Announcements: `Announcement` → fan-out as `type:"system"`
  notifications via existing `sendToChannels()` + `emitToUser()`; no new
  transport until email/push graduate from stub.

## 13. State management (admin frontend)

- New RTK Query slice `src/store/adminApi.ts` (`/api/admin/*`, tag
  `Admin*`), plus `ReduxProvider` already composes stores — just register
  the reducer/middleware in `store.ts` like the other 7 APIs.
- No admin auth slice (same httpOnly cookie session). Role for UI gating
  comes from extended `/api/auth/me` (`+ role, status`) — display-only.

## 14. Non-goals (explicit)

- No user impersonation in v1 (support uses audited read-only inspect).
- No direct Mongo/console access from the UI.
- No multi-tenancy billing/quotas (usage tracked, not billed).
- No changes to workspace member roles or the user-facing permission model.

## 15. Risks / open decisions

1. In-memory login throttle + future admin limiter are single-instance —
   sticky sessions or shared store required before horizontal scale.
2. `role` on `User` vs separate `Admin` collection: chosen single-field
   (simpler session flow, one login) — revisit if admin 2FA diverges.
3. Semantic-search vectors (`embedding.model.ts`) are per-workspace;
   admin content search should prefer lexical `searchWorkspace()` +
   direct fetch to avoid cross-workspace vector leakage.
4. `next dev` block comment (`AGENTS.md` agent-rules) must be honored when
   writing code later: read `node_modules/next/dist/docs/` guides first.
