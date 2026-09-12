# NotoAI — Development Roadmap

> Builds toward ARCHITECTURE.md; addresses every finding in PROJECT_AUDIT.md. Phase order is load-bearing — do not start AI features before Phase 0–1 land. No packages to be installed without explicit user approval at each phase gate.

## Phase 0 — Foundation & Decisions (gate: everything below)

- [ ] Decide: Postgres+pgvector vs. SQLite/Turso (Phase 1); Auth.js vs. managed auth; AI provider + embedding model + $/user/day ceiling; zustand vs. context-only; attachments in MVP? (ARCHITECTURE.md §10)
- [ ] Rebrand `app/layout.tsx` metadata + OG tags; fix `globals.css` font override (remove Arial fallback) and switch dark mode from media query to `class`.
- [ ] Harden `next.config.ts`: security headers (CSP, HSTS, X-Content-Type-Options), image config, redirects `/` → `/dashboard` (or app entry).
- [ ] Add `src/lib/env.ts` (zod-validated env, fail-fast), `middleware.ts` skeleton, `loading.tsx` / `error.tsx` / `not-found.tsx` / `global-error.tsx`.
- [ ] Add `src/components/ui/` primitives (button, input, dialog, skeleton, empty-state) + `AppShell` (sidebar/topbar/⌘K/assistant panel skeleton) + `(marketing)` / `(app)` route groups.
- [ ] Tooling: Prettier + import sorter, Husky/lint-staged (or `lefthook`), CI (`lint` + `tsc --noEmit` + `build`), Vitest + Playwright skeleton, seed script stub.
- Exit criteria: `npm run dev/build/lint` green; `/` + empty `(app)` shell render with correct light/dark toggle; CI passes.

## Phase 1 — Data Core: Notes, Tasks, Reminders (first shippable)

- [ ] Schema + migrations: `users, notes, tasks, reminders` (+ ownership FKs); queries layer `src/lib/db/queries/*` with per-row `ownerId` checks; zod schemas in `src/lib/validation/`.
- [ ] Routes: `/notes`, `/notes/[id]` (editor with autosave + optimistic UI), `/tasks` (quick-add, check, filter via URL params), `/reminders` (one-time + recurring, timezone-aware date lib + unit tests).
- [ ] Reminder dispatch: `app/api/cron/reminders/route.ts` + scheduler config; empty/loading/error states everywhere.
- [ ] Tests: unit (recurrence, validation) + Playwright (create task → set reminder → dispatch stub fires).
- Exit criteria: multi-user-safe CRUD demo; reminders fire at correct local time; no business logic in `page.tsx`.

## Phase 2 — Time & Organization: Calendar, Schedule, Projects, Goals

- [ ] `events` table + `/calendar` (day/week/month, drag-to-reschedule as draft mutation) + `/schedule` (agenda: today/tomorrow, conflict display).
- [ ] `/projects` + `/projects/[id]` (notes/tasks/events linked to project) + `/goals` (targets + links to tasks/projects, progress rollup).
- [ ] Shared calendar/event components; URL state (`?view=&date=&filter=`) for shareable views; dashboard `page.tsx` composes schedule + due tasks + goal progress with `<Suspense>` streaming.
- Exit criteria: plan a week end-to-end (goal → project → tasks → scheduled events) without AI.

## Phase 3 — Search & Assistant Shell (non-AI first, AI-ready)

- [ ] Global keyword search `/search` (title/body full-text across notes/tasks/projects) + ⌘K palette; result rows deep-link to canonical URLs.
- [ ] `src/lib/ai/` skeleton: `providers.ts`, `prompts/`, `tools/` (zod-typed `createTask`, `createReminder`, `searchNotes`, `planDay`), `runs.ts` audit log; assistant panel UI with tool-confirmation flow (writes require explicit confirm).
- [ ] `app/api/ai/chat/route.ts` behind auth + rate limit; deterministic fallback copy when provider unreachable; no client-side keys.
- Exit criteria: assistant answers from keyword context and proposes (but never auto-commits) task/reminder drafts.

## Phase 4 — AI Differentiation: Semantic Search, Planning, Insights

- [ ] Embeddings pipeline (`embeddings.ts` + chunker + backfill script) over notes/tasks/events; `embeddings` table + vector index; `app/api/ai/search/route.ts` hybrid keyword+vector ranking with citations.
- [ ] `app/api/ai/plan/route.ts`: day/week planner generating draft tasks/events from goals + calendar availability; preview-and-accept UX.
- [ ] `app/api/ai/insights/route.ts` + `/insights`: precomputed daily aggregations (focus time, completion rate, overdue load) + cached LLM summary; golden-prompt eval set + regression script.
- [ ] Guardrails: PII redaction, token budgets, timeouts, output validation; `ai_runs` cost/latency dashboard query.
- Exit criteria: semantic search beats keyword on golden set; plans acceptable in preview; insights cached and cheap; provider outage degrades gracefully.

## Phase 5 — Production-Grade Hardening

- [ ] Auth enforcement audit (every query/action/handler), rate limits + abuse caps on all `/api/ai/*`, CSP/reporting, backup/restore runbook.
- [ ] Observability: structured logs, Sentry/OpenTelemetry, Web Vitals, `ai_runs` cost alerts; Playwright suite covers critical flows incl. AI-draft-accept and reminder delivery.
- [ ] Performance: route-level code splitting, list virtualization, ISR where valid, image/attachment optimization; Lighthouse + bundle budget gates in CI.
- [ ] Docs: user guide, keyboard shortcuts, API/env reference, incident playbook; attachment storage decision revisited here if deferred.
- Exit criteria: deploy to staging → prod with migrations, cron, and rollback verified; ALL 12 NotoAI surfaces live: Notes, Tasks, Calendar, Schedule, Projects, Goals, Reminders, Search, AI Assistant, AI semantic search, AI planning, AI productivity insights.

## Dependency Proposals (install only at gated phases, with approval)

- Phase 0: `zod`, `clsx`/`tailwind-merge`/`cva`, `@radix-ui/*` (or headless alt), `zustand`, `nuqs` (optional).
- Phase 1: Drizzle (`drizzle-orm`) or Prisma + driver; `date-fns` or `luxon`; Vitest + Playwright.
- Phase 3–4: AI SDK (`ai` + provider package), `pgvector` (if Postgres), `nanoid`/`ulid`.
- Phase 5: Sentry, OpenTelemetry exporter.

## Working Agreements

- Server-first; `app/` = routing + composition; features isolated; `@/*` imports; extract shared UI on second use.
- Every new Next.js API usage checked against `node_modules/next/dist/docs/` first (Next 16 breaking-change rule).
- Stop-and-ask gates: DB choice, auth provider, AI provider/cost, any new dependency, any schema change after Phase 1.
