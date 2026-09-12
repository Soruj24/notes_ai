# NotoAI — Admin Control Center: Roadmap

Status: **planning only — nothing implemented.**
Companion docs: `ADMIN_ARCHITECTURE.md`, `ADMIN_ROLES.md`.

Each phase is independently shippable and ends with: `tsc --noEmit`,
`npm run lint` (0 errors), `npm run build`, plus manual QA of the touched
surfaces in light + dark mode. No new production dependencies in any phase
(reuse Mongoose, RTK Query, Socket.IO, `lucide-react`, Tailwind).

---

## Phase 0 — Foundations (platform privilege + audit)

Goal: the role system, enforcement helpers, and audit trail exist; no UI.

- [ ] `User.role` (`user|support|admin|superadmin`, default `user`, indexed)
  + `User.status` (`active|suspended`, default `active`); `getSessionUser()`
  rejects suspended.
- [ ] `src/lib/api/admin.ts`: `requireAdminUser(req, roles?)` (401/403).
- [ ] `AuditLog` model (`actorId, actorEmail, action, targetType, targetId,
  workspaceId?, metadata, ip, createdAt`, indexes) + `services/admin/audit`
  (`logAdminAction()` — write failure fails the request).
- [ ] Extend `/api/auth/me` with `role, status` (display-only for nav gating).
- [ ] `npm run promote-admin` script (`ADMIN_EMAILS` env; refuses empty list).
- [ ] Unit tests: role default/fail-closed, last-superadmin guard,
  suspended lockout, audit write failure behavior.
- [ ] Seed: promote demo account per env (dev only).

**Acceptance**: non-admin hitting any (future) admin helper gets 401/403;
every helper writes audit; suspended user cannot authenticate anywhere.
**Risks**: none to user paths if helpers are additive-only (verify by full
existing test/build pass).

## Phase 1 — Users & workspaces management

Goal: operate accounts and workspaces without the database.

- [ ] Route group `app/(admin)/admin/*` + layout (`requireAdminUser`,
  redirect `/login?next=`); `/admin` in `proxy.ts PROTECTED_PREFIXES`;
  `NAV_SECTIONS` Admin section (role-gated display).
- [ ] `GET /api/admin/overview` (counts, recent audit).
- [ ] Users: list/search/paginate, detail (profile, workspaces, sessions),
  revoke sessions, suspend/restore, role change (superadmin, guards per
  `ADMIN_ROLES.md` §3).
- [ ] Workspaces: list/search, detail (members, per-domain counts),
  add/remove/change members, rename, transfer ownership.
- [ ] `src/store/adminApi.ts` RTK Query slice + `data-table` based list pages
  + `EmptyState`/`Dialog` confirmations (type-to-confirm for destructive).
- [ ] Every mutation → `AuditLog`.

**Acceptance**: full user/workspach lifecycle operable from UI; workspace
`owner` flows untouched; audit entries for each action.
**Risks**: destructive actions — mitigate with confirm UI + superadmin-only.

## Phase 2 — Support tooling & content moderation

Goal: safe customer support without impersonation.

- [ ] Cross-workspace content search (lexical via `searchWorkspace()`,
  metadata + excerpt; **not** vector search — avoids cross-workspace vector
  leakage per architecture doc §15).
- [ ] Read-only inspect pages per entity with audited `content.reveal`
  for full bodies (rate-limited per actor).
- [ ] Moderation: trash/restore via existing services; purge superadmin-only.
- [ ] User timeline view (activity + audit entries concerning the user).
- [ ] Explicit non-goal enforced: no "login as user".

**Acceptance**: support can diagnose + unblock without config/content-write
powers; each reveal logged.
**Risks**: PII exposure — mitigate with excerpt-by-default + reveal audit.

## Phase 3 — AI management & usage

Goal: run the AI subsystem from the console.

- [ ] Layered AI config: env defaults → `SystemSetting ai.*` →
  `getAIConfig({ workspaceId? })` workspace-aware variant; `isAIConfigured()`
  unchanged as gate.
- [ ] Admin UI: provider status (Ollama ping, model list), model/embedding
  selection, temperature/maxTokens, kill-switch flag, per-workspace overrides.
- [ ] `AiUsageDaily` rollup (cron pattern like reminder dispatch) from
  `AiMessage` token fields; usage dashboard (calls/tokens by model,
  workspace, day; no message content).
- [ ] Per-user/per-workspace daily AI call caps as settings, enforced in
  `ai/command` before `createAgent()`.
- [ ] Feature flags consumed by AI routes (`ai.command` kill-switch first).

**Acceptance**: model swap + kill-switch without deploy; usage visible;
caps enforced with friendly 503 messages via existing `toUserError()`.
**Risks**: config caching staleness — invalidate on write (version counter).

## Phase 4 — Feature flags, settings, announcements

Goal: operate the product surface without deploys.

- [ ] `FeatureFlag` model + `isFeatureEnabled()` + public `/api/config`
  (allowlisted keys) + admin flags UI. First flag: `auth.registration`.
- [ ] `SystemSetting` registry (zod-validated per key) + grouped settings UI
  (site, auth, AI, notifications, limits, maintenance); secret values
  write-only/redacted; in-memory cache + invalidation.
- [ ] Maintenance mode (non-admin 503, admin bypass).
- [ ] Announcements → `type:"system"` notifications via existing
  `sendToChannels()` + realtime fan-out.
- [ ] `admin:console` socket room + `admin.audit` live refresh in console.

**Acceptance**: registration closed, maintenance page shown, announcement
delivered, all without redeploy; audit covers each change.
**Risks**: settings cache bugs — mitigate with version counter + tests.

## Phase 5 — Production hardening

Goal: close the security gaps found during inspection.

- [ ] Shared rate limiter (Redis-ready interface; in-memory fallback):
  apply to `/api/admin/*`, auth, AI command.
- [ ] Security headers (CSP/HSTS/etc.) in `next.config.ts` — required
  before admin ships widely (admin pages are the top XSS target).
- [ ] TOTP 2FA on `User`, **required** for platform roles.
- [ ] Optional `ADMIN_IP_ALLOWLIST` env enforcement in `requireAdminUser()`.
- [ ] Backup/export runbook + data-erase (GDPR) tested end-to-end.
- [ ] Break-glass superadmin recovery runbook (manual DB procedure).
- [ ] Load/perf pass on admin list endpoints (indexes verified via
  `explain()` on the new query patterns).

**Acceptance**: headers present, limiter shared-store capable, 2FA enforced
for roles, runbooks written and rehearsed on staging.
**Risks**: 2FA lockout — mitigate with break-glass runbook + backup codes.

## Test strategy (all phases)

- `npx tsc --noEmit`, `npm run lint` (0 errors), `npm run build` green.
- Seed an admin (`ADMIN_EMAILS=demo@notoai.app npm run promote-admin`)
  after `npm run seed`; walk every new page light + dark, mobile width.
- Negative tests per phase: viewer/member API access → 403/404; suspended
  user → locked out everywhere; demote-last-superadmin → rejected;
  audit write verified for each mutation (query `/api/admin/audit`).
- Re-verify user paths after each phase (login, workspace CRUD, notes,
  tasks, AI command) — admin must never regress member flows.

## Ordering rationale

Privilege + audit (0) must precede any power (1–4); users/workspaces (1)
before content (2) because moderation needs account context; AI (3) before
flags/settings (4) so the kill-switch lands early; hardening (5) last
because CSP/2FA/limiter touch global behavior and deserve a stable base.
