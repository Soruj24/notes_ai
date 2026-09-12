# NotoAI — Project Audit

> Date: 2026-09-09. Scope: full repo at commit `f754394` ("Initial commit from Create Next App"), branch `master`, clean tree. Method: file-by-file inspection; no code executed beyond `git log/status` and directory listing; no packages installed.

## 1. Inventory (excluding node_modules/.next/.git)

19 files. Product code = 3 files:

| File | Lines | Role |
|---|---|---|
| `app/layout.tsx` | 29 | Root layout, Geist fonts, metadata |
| `app/page.tsx` | 69 | Default create-next-app starter page |
| `app/globals.css` | 26 | Tailwind v4 import + theme tokens |
| `next.config.ts` | 7 | Empty Next config |
| `tsconfig.json` | 34 | Strict TS, `@/*` alias |
| `eslint.config.mjs` | 18 | Flat config, next/core-web-vitals + TS |
| `postcss.config.mjs` | 7 | Tailwind v4 plugin |
| `package.json` | 26 | 3 deps, 8 devDeps |
| `public/*` (5 svg) | — | Template icons only |
| `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `next-env.d.ts` | — | Template / generated |

Missing entirely: `src/`, `components/`, `lib/`, `hooks/`, `stores/`, `middleware.ts`, `app/api/`, any domain routes, env files, tests, CI, Dockerfile, seed/migration scripts.

## 2. Framework & Dependencies

- Next.js `16.3.4` (App Router), React `19.2.8` / `react-dom`, Tailwind `^4` + `@tailwindcss/postcss`, TypeScript `^5` (strict), ESLint `^9` + `eslint-config-next`, `@types/*`.
- Per `AGENTS.md`, this Next.js major has breaking changes vs. training data; local docs at `node_modules/next/dist/docs/` (App/Pages routers, guides, API ref) are the authority. Notable: `app/layout.tsx:20` uses the new typed `LayoutProps<"/">` — future layouts must follow this pattern.
- Runtime verified: Node v24.18.0, npm 11.16.0.

## 3. Reusable Code (keep)

1. `app/layout.tsx` — font-variable pattern (`Geist`/`Geist_Mono`), `<html lang class>` + body flex scaffold, typed `metadata`. Keep shape; will need title/description rebrand + theme `class` handling.
2. `app/globals.css` — `@import "tailwindcss"` + `@theme inline` token bridge (`--color-background/foreground`, `--font-sans/mono`). Keep and extend; fix dark-mode mechanism (see §8).
3. `tsconfig.json` — `strict`, `bundler` resolution, `@/*` alias, `isolatedModules`. Keep as-is.
4. `eslint.config.mjs` + `postcss.config.mjs` + `.gitignore` (covers `node_modules`, `.next`, `build`, `.env*`, `.vercel`) — keep.
5. `public/*.svg` — disposable; replace with NotoAI brand assets.

## 4. Architectural Problems

- **P0 — No domain layer.** Zero modules for notes/tasks/calendar/schedule/projects/goals/reminders/search/AI. Everything must be built greenfield.
- **P0 — No persistence.** No DB client, schema, migrations, or seed. No `lib/db`.
- **P0 — No auth/session boundary.** No login, no user scoping, no middleware. Any multi-user build without this leaks data.
- **P1 — Logic has nowhere to live.** No `src/lib`, no validation layer, no error taxonomy. Risk: business logic lands in `page.tsx`.
- **P1 — No API surface.** No Route Handlers, no Server Actions, no `api/` dir. AI streaming/cron/search have no home.
- **P1 — Empty `next.config.ts`.** No headers (CSP/HSTS), no image domains, no redirects, no bundle tuning.
- **P2 — No observability/testing.** No logger, no error tracker, no unit/e2e harness, no CI.

## 5. Duplicate Components

None — codebase too small to have duplication. Negative finding recorded deliberately: no shared `ui/` primitives exist, so the first duplicated button/input/dialog will be the signal to create `src/components/ui/`. Do not preemptively abstract; extract on second use.

## 6. Oversized Files

None. Largest file is `app/page.tsx` (69 lines, 3 KB) and it is 100% starter boilerplate slated for deletion. No file exceeds 100 lines of product code. Risk is forward-looking: without segment colocation (route-level `components/`, `actions.ts`, `queries.ts`), future `notes/[id]/page.tsx` and calendar views will bloat — enforce the colocation rule in ARCHITECTURE.md §2.

## 7. Routing Problems

1. Single route `/` (`app/page.tsx`). All 12 NotoAI surfaces (`/notes`, `/tasks`, `/calendar`, `/schedule`, `/projects`, `/goals`, `/reminders`, `/search`, `/insights`, `/assistant`, …) return 404.
2. No route groups: marketing vs. authenticated app layouts cannot diverge.
3. No dynamic segments (`notes/[id]`, `projects/[id]`), no `loading.tsx`/`error.tsx`/`not-found.tsx` boundaries anywhere — first fetch failure = full-page crash.
4. No `middleware.ts` for auth gating / redirects.
5. `page.tsx` links only to external vercel/next.js URLs; zero internal navigation to audit.

## 8. State-Management Problems

- No state of any kind: no server-state fetching, no URL-state parsing, no client store, no forms, no optimistic updates.
- Concrete gaps for NotoAI: selected date/range, calendar view (day/week/month), filters, search query, palette open, assistant panel, editor drafts — none modeled.
- Forward risk: stuffing filter/date state into `useState` instead of `searchParams` breaks shareable links and back-button behavior. Mandate URL-as-state for view/filter params (ARCHITECTURE.md §5).

## 9. API / Backend Problems

- No Route Handlers, no Server Actions, no validation (`zod` absent), no rate limiting, no env validation (`src/lib/env.ts` absent).
- AI blockers: no provider client, no embeddings pipeline, no vector store, no prompt/tool registry, no `ai_runs` audit log, no token budget or timeout policy. API keys would currently have to live client-side or unvalidated — both unacceptable.
- Reminders/scheduling: no cron route, no recurrence library, no timezone handling (`Intl`/ Luxon-style utils absent).
- Search: no keyword index, no semantic index, no hybrid ranking — global search box has nothing to query.

## 10. UI/UX Problems

1. `app/page.tsx` is template marketing content ("To get started, edit page.tsx", Deploy Now / Documentation) — must be replaced, not restyled.
2. No app shell: no sidebar, topbar, command palette, AI panel, or mobile nav.
3. Dark mode uses `prefers-color-scheme` media query (`globals.css:15`); production app needs user-controlled `class` toggle persisted per user.
4. `body { font-family: Arial… }` (`globals.css:25`) overrides the Geist variables loaded in `layout.tsx` — fonts as configured never actually render.
5. No design tokens beyond background/foreground; no button/input/dialog/skeleton/empty-state primitives; no focus/keyboard story; no loading/empty/error/offline states.
6. Fixed `max-w-3xl` centered starter layout is not a workspace layout; calendar/schedule/assistant need full-bleed, resizable, keyboard-driven surfaces.
7. `metadata` title/description ("Create Next App") unshipped for any brand; no OG tags, no per-route titles.

## 11. Risk Register

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Building AI before DB/auth/validation | Data leaks, untestable prompts | Roadmap Phase 0–1 first (schema, auth, validation) |
| 2 | Next 16 API drift (cached components, typed routes, `LayoutProps`) | Build/runtime breaks from stale patterns | Consult `node_modules/next/dist/docs/` before each new API use |
| 3 | Prompt logic scattered in components | Provider lock-in, key exposure | Isolate in `src/lib/ai/`; keys server-only |
| 4 | Client store mirroring DB | Stale data, sync bugs | Server-first reads; store holds UI state only |
| 5 | Timezone/recurrence bugs in calendar/reminders | Missed reminders | Central date lib + unit tests from day one |
| 6 | Zero test/observability baseline | Silent regressions | Add Vitest + Playwright + `ai_runs` logging in Phase 1–2 |

## 12. Verdict

Clean, healthy, empty scaffold — no tech debt, no dead code, no conflicting patterns. Reuse config + font/theme skeleton; delete starter page content; build NotoAI per ARCHITECTURE.md via DEVELOPMENT_ROADMAP.md phase order. No code changes made in this audit.
