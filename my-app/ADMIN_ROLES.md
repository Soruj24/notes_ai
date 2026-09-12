# NotoAI — Admin Roles & Permissions

Status: **planning only — nothing implemented.**
Companion docs: `ADMIN_ARCHITECTURE.md`, `ADMIN_ROADMAP.md`.

The existing workspace roles (`owner | admin | member | viewer`,
`src/lib/db/enums.ts`) are **unchanged**. This document defines the new,
orthogonal **platform roles** for operating the whole application.

---

## 1. Role definitions

| Role | Value | Purpose |
|---|---|---|
| User | `user` (default) | Every account. No platform privilege. |
| Support | `support` | Customer support: **read-only inspect** + safe account actions (revoke sessions, resend/retry). Cannot change config, roles, or content. |
| Admin | `admin` | Operations: everything Support can, plus moderation (trash/restore/purge), workspace membership management, feature flags, system settings (non-secret), AI config, announcements. |
| Superadmin | `superadmin` | Platform owner: everything Admin can, plus role assignment, secret-bearing settings, suspend/delete users, danger-zone actions. |

Stored as `User.role` (indexed, default `"user"`), plus `User.status`
(`active | suspended`, default `active`). Unknown/missing role ⇒ `user`.

### What each role is for (in one line)

- **Support**: "See what's wrong, unblock the user, touch nothing structural."
- **Admin**: "Run the service day-to-day without deploying."
- **Superadmin**: "Own the platform, including who else can run it."

## 2. Permission matrix

`R` = read, `W` = write/mutate, `—` = denied. All admin mutations write
`AuditLog` (see `ADMIN_ARCHITECTURE.md` §7).

### Users & access

| Capability | Support | Admin | Superadmin |
|---|---|---|---|
| List/search users | R | R | R |
| View user detail (profile, workspaces, sessions) | R | R | R |
| Revoke user sessions | W | W | W |
| Reset password (generate reset, never view) | — | W | W |
| Suspend / restore account | — | W | W |
| Change platform role | — | — | W |
| Delete user data (GDPR erase) | — | — | W (two-person confirm UI) |
| View own audit trail | R (own) | R (own) | R (all) |

### Workspaces & membership

| Capability | Support | Admin | Superadmin |
|---|---|---|---|
| List/search workspaces | R | R | R |
| View workspace detail (members, counts) | R | R | R |
| Add/remove/change workspace members | — | W | W |
| Rename workspace, transfer ownership | — | W | W |
| Delete workspace | — | — | W (two-person confirm UI) |

### Content (notes, tasks, events, projects, goals, reminders, templates, files)

| Capability | Support | Admin | Superadmin |
|---|---|---|---|
| Search across workspaces (metadata + excerpt) | R | R | R |
| Reveal full content body | R (audited per reveal) | R (audited per reveal) | R (audited per reveal) |
| Trash / restore items | — | W | W |
| Purge (hard delete) | — | — | W |
| Edit user content | — | — | — (never; platform staff do not author as users) |

### AI management

| Capability | Support | Admin | Superadmin |
|---|---|---|---|
| View provider status + usage dashboards | R | R | R |
| Change model/embedding selection, limits | — | W | W |
| Toggle AI kill-switch (`ai.command`) | — | W | W |
| Per-workspace model overrides | — | W | W |
| View conversation contents | — | — | — (usage shows counts/tokens only) |

### Platform configuration

| Capability | Support | Admin | Superadmin |
|---|---|---|---|
| View feature flags / settings | R | R | R |
| Toggle feature flags | — | W | W |
| Edit non-secret system settings | — | W | W |
| Edit secret-bearing settings (keys, SMTP) | — | — | W (write-only, redacted reads) |
| Maintenance mode on/off | — | W | W |
| Publish announcements | — | W | W |
| Re-run reminder dispatch / reindex | — | W | W |
| View system health | R | R | R |

### Unchanged workspace roles (for reference)

Workspace `owner` still outranks everyone **inside their workspace**
(invite, roles, delete content). Platform roles do not grant workspace
membership and never bypass `assertCanWrite()` in user paths — admin paths
use separate, audited service functions.

## 3. Storage & lifecycle rules

1. **Single source of truth**: `User.role` + `User.status`, read from the DB
   on every admin request (never cached in the session token).
2. **Fail closed**: missing/unknown role ⇒ treated as `user`.
3. **Bootstrap**: `ADMIN_EMAILS` env promoted via `npm run promote-admin`
   (creates `superadmin`s; script refuses to run with an empty list and
   logs to console only, never to the DB).
4. **Last-superadmin guard**: demoting/deleting the final `superadmin` is
   rejected — mirrors the last-owner guard in `workspace.repository.ts`.
5. **Self-demotion lock**: a superadmin cannot demote or suspend themselves
   (prevents accidental total lockout; another superadmin must do it).
6. **Suspend semantics**: `status=suspended` makes `getSessionUser()`
   return null ⇒ instant global lockout; existing session rows expire
   naturally. Session-revoke action gives immediate per-device effect.
7. **Role changes** require `superadmin` and record before/after in
   `AuditLog`. Downgrades take effect on the next request (no token purge
   needed since role is DB-read).

## 4. Enforcement points (how a request is gated)

```
Edge (proxy.ts) ── session cookie valid? ──► /login otherwise
        │
Admin layout (server) ── requireAdminUser() ──► redirect /login?next= or 403 page
        │
API handler ── requireAdminUser(req, roles) ──► 401 / 403 JSON
        │
Service ── assert role again for mutations (defense in depth)
        │
AuditLog.write ── every mutation, before success response
```

- Client-side nav gating (`NAV_SECTIONS` filtered by role from extended
  `/api/auth/me`) is **display-only**.
- Socket `admin:console` room: handshake verifies session, then one DB
  read of `User.role`; non-platform roles are rejected `unauthorized`.
- Cron/system jobs keep the existing `CRON_SECRET` bearer pattern;
  admin-triggered reruns go through the same job functions, not new paths.

## 5. Abuse & separation-of-duties notes

- **No impersonation ("login as user") in v1.** Support gets audited
  read-only inspect instead. Impersonation is the highest-risk support
  feature; revisit only with session-scoping + mandatory ticket reference.
- **Two-person confirm** (type-to-confirm + reason field) for: user data
  erase, workspace delete, secret rotation, maintenance mode. The reason is
  stored in `AuditLog.metadata`.
- **PII rule**: excerpts by default; full-body reveal is a distinct audited
  action (`content.reveal`), rate-limited per actor.
- **Break-glass**: if all superadmins are lost, recovery is a documented
  manual DB procedure (runbook), not a UI backdoor. There must be no
  backdoor role, header, or query param that grants privilege.
