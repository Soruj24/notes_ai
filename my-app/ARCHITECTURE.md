# NotoAI — Architecture

> Status: TARGET architecture (greenfield). Current repo is a vanilla `create-next-app` scaffold with no product code. Nothing below is implemented yet. This document is the build constraint for all future work.
> Stack baseline: Next.js 16.3.4 (App Router) / React 19.2.8 / Tailwind CSS v4 / TypeScript strict / ESLint 9. Node 24. No additional dependencies installed.

## 1. Goals & Constraints

- Single Next.js app serving Notes, Tasks, Calendar, Schedule, Projects, Goals, Reminders, Search, AI Assistant, AI semantic search, AI planning, AI productivity insights.
- Production-grade: typed end-to-end, testable, observable, secure by default, AI-failure-tolerant (every AI feature degrades to a deterministic non-AI path).
- Server-first: Server Components for reads, Server Actions / Route Handlers for writes and AI streaming. Client components only at interaction boundaries.
- No new packages installed during audit phase. All dependencies below are PROPOSED and require explicit approval.

## 2. High-Level Structure

```
app/
  (marketing)/            # public landing, pricing — static, no auth
    page.tsx
    layout.tsx
  (app)/                  # authenticated workspace shell
    layout.tsx            # sidebar + topbar + command palette + AI panel
    page.tsx              # dashboard / today view (schedule + tasks + insights)
    notes/
    tasks/
    calendar/
    schedule/
    projects/
    goals/
    reminders/
    search/
    insights/             # AI productivity insights
    assistant/            # full-page AI assistant (embedded panel also available)
  api/                    # Route Handlers only where needed:
    ai/chat/route.ts      # AI streaming (SSE)
    ai/search/route.ts    # semantic search
    ai/plan/route.ts      # planning generation
    ai/insights/route.ts  # aggregations
    cron/reminders/route.ts # scheduled reminder dispatch (Vercel Cron / external)
  loading.tsx / error.tsx / not-found.tsx / global-error.tsx

src/
  components/
    ui/                   # design-system primitives (button, input, dialog, etc.)
    layout/               # AppShell, Sidebar, TopBar, CommandPalette
    features/             # one folder per domain (notes-editor, task-list, …)
  lib/
    db/                   # schema, client, migrations, queries
    auth/                 # session helpers, middleware guards
    ai/                   # prompts, tools, embeddings, rerank, guardrails
    search/               # keyword + vector hybrid search
    validation/           # zod schemas (single source of truth)
    utils/                # date, recurrence, formatting (no business logic)
  stores/                 # client state (zustand) — UI-only state
  hooks/                  # shared client hooks
  types/                  # cross-cutting domain types (prefer co-located otherwise)
```

Rules:

1. `app/` contains routing + composition only. No SQL, no LLM calls, no business logic in `page.tsx`/`layout.tsx`.
2. `src/lib/` is framework-independent where possible (pure functions, easily unit-tested).
3. Features never import from each other directly; shared code goes to `components/ui` or `lib/`.
4. Path alias `@/*` (already configured in `tsconfig.json`) is mandatory for cross-boundary imports.

## 3. Routing (App Router, Next 16)

- Route groups `(marketing)` and `(app)` separate public vs. authenticated layouts without affecting URLs.
- Domain routes: `/notes`, `/notes/[id]`, `/tasks`, `/calendar`, `/schedule`, `/projects`, `/projects/[id]`, `/goals`, `/reminders`, `/search`, `/insights`, `/assistant`.
- Dynamic segments use typed params; `layout.tsx` uses Next 16 typed `LayoutProps<"/…">` pattern (current `app/layout.tsx:20` already does this — preserve it).
- Required conventions per route: `loading.tsx` (skeleton), `error.tsx` (recoverable), `not-found.tsx` where `[id]` exists.
- Intercepting routes (`@modal` / `(.)notes/[id]`) for quick-preview of notes/tasks from search/calendar.
- `middleware.ts` (to be added) does auth gating + locale/clock headers only — never data fetching.
- Deep-linking: command palette (`⌘K`) and search results link to canonical URLs; AI assistant citations render as links.

## 4. Data & Backend

Proposed (not installed):

- DB: Postgres + Drizzle ORM (or Prisma). Why: relational productivity data + `pgvector` for embeddings in one store. SQLite (`better-sqlite3`/Turso) acceptable for local-first Phase 1 if Postgres ops is a concern — decision point in roadmap.
- Schema domains: `users, notes, tasks, events, projects, project_members, goals, goal_links, reminders, embeddings, ai_runs`.
- Access pattern: Server Components + Server Actions via a `src/lib/db/queries/*` layer. Route Handlers only for streaming/SSE, cron, and non-Action clients.
- Validation: `zod` schemas in `src/lib/validation/` shared by forms, Actions, and API routes. Never trust client input.
- Migrations checked in (`src/lib/db/migrations/`). Seed script for demo workspace.
- Caching: `fetch`/`unstable_cache` semantics per Next 16 docs (`node_modules/next/dist/docs/01-app/`); `revalidateTag("notes")`-style invalidation on mutation. Dynamic user data defaults to no-store; only public/marketing is static.
- Files/attachments (Phase 3+): object storage (S3-compatible) + DB metadata rows, never base64 in DB.

## 5. State Management

| Kind | Where | Tool |
|---|---|---|
| Server state (notes, tasks, events) | Server Components, streamed with `<Suspense>` | `fetch` / Actions, no client cache lib initially |
| URL state (selected date, filters, query, view=day/week) | `searchParams` | `nuqs`-style parsing (or manual typed parser if dependency-averse) |
| Client UI state (sidebar, palette, editor draft, assistant panel) | Client Components | `zustand` (proposed) + `useOptimistic` for mutations |
| Form state | Local | Controlled inputs / `react-hook-form` only if complexity demands |

Forbidden: global client store mirroring server DB; prop-drilling more than 2 levels (use composition or store); `localStorage` as source of truth (cache only, with schema version).

## 6. AI Subsystem

Isolated in `src/lib/ai/` so model/provider swaps don't touch product code:

```
src/lib/ai/
  providers.ts    # provider factory (OpenAI-compatible interface)
  prompts/        # versioned system prompts per capability
  tools/          # createTask, createReminder, searchNotes, planDay — zod-typed
  embeddings.ts   # embed + chunk pipeline
  guardrails.ts   # PII redaction, token limits, output validation
  runs.ts         # ai_runs logging (input hash, latency, cost, feedback)
```

- Capabilities map 1:1 to API routes: `chat`, `search` (hybrid keyword+vector), `plan` (day/week planner generating tasks/events as drafts, never auto-committing), `insights` (precomputed aggregations + LLM summary, cached daily).
- RAG: note/task/event chunks → embeddings → `pgvector` cosine search → rerank → cite chunk IDs in answers.
- Safety: tool calls require user confirmation for writes; token budgets per request; strict timeouts; fallback copy when provider is down; all prompts server-side only (no `NEXT_PUBLIC_*` keys).
- Eval: golden prompt set + regression script before prompt changes (Phase 4).

## 7. UI/UX System

- Tailwind v4 tokens in `app/globals.css` (`@theme inline` already present — extend with brand, spacing, radius scales). Dark mode via `class`, not `prefers-color-scheme` media query (current `globals.css:15` must change).
- `components/ui/*` primitives with `cva` + Radix/Headless primitives (proposed). No raw `<button>`/`<dialog>` in feature code.
- App shell: persistent sidebar (Notes/Tasks/Calendar/Projects/Goals/Reminders/Search/Insights), topbar (global search + ⌘K + assistant toggle), right AI panel (collapsible).
- States matrix enforced per view: loading skeleton / empty CTA / error retry / offline notice.
- Accessibility: focus trap in dialogs/palette, keyboard-first task flows, `aria-` on custom controls, contrast-checked tokens. Responsive: mobile = bottom nav + full-screen assistant sheet.

## 8. Cross-Cutting Concerns

- Auth (proposed: Auth.js/NextAuth or clerk alternative — decision in roadmap Phase 0): session in Server Components via `auth()` helper; no client session polling.
- Config: `src/lib/env.ts` with zod-validated `process.env`; fail fast at boot. `.gitignore` already ignores `.env*` — keep.
- Errors: `error.tsx` boundaries per segment + structured server logging; client reports with error digest only.
- Observability: request logging, `ai_runs` table, Web Vitals; Sentry/OpenTelemetry in Phase 5.
- Testing: Vitest (unit: recurrence, search ranking, planners) + Playwright (critical flows: create task → schedule → reminder fires; assistant creates draft plan). No test infra exists today.
- Security: Server Actions check session + ownership on every query (`where ownerId = session.user.id`); rate-limit AI routes; CSP headers in `next.config.ts` (currently empty — must be configured).

## 9. What Exists Today vs. Target

Keep: `app/layout.tsx` font setup + metadata pattern; `app/globals.css` Tailwind import + theme block; `tsconfig.json` strict + `@/*` alias; `eslint.config.mjs` flat config; `postcss.config.mjs`.
Delete/replace: `app/page.tsx` boilerplate marketing starter; `README.md` generic template; empty `next.config.ts`.
Add: everything in §2–§8.

## 10. Decision Log (open)

1. DB: Postgres+pgvector vs. SQLite+Turso for Phase 1?
2. Auth provider: Auth.js self-host vs. managed (Clerk)?
3. AI provider + embedding model; cost ceiling per user/day?
4. Client store: zustand vs. React context only?
5. Attachment storage needed in MVP?
