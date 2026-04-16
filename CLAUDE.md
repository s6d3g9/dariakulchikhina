# Daria Design Studio — Agent Context

CRM/ERP for an interior design studio. Polyruntime pnpm monorepo.

## Runtimes and top-level layout

- `app/` + `server/` + `shared/` — main Nuxt 4 app (SSR + REST + SSE in one Nitro process). Frontend follows FSD, backend follows DDD-lite.
- `messenger/core` + `messenger/web` — standalone realtime messenger (separate PM2 processes, separate ports).
- `services/communications-service` — E2EE call relay / WebRTC signaling. Separate security domain.
- `cityfarm/web` — unrelated public site. **Not part of the v5 refactor.** Do not touch unless asked.
- `scripts/` — deploy, data migrations, refactor waves tooling.
- `docs/architecture-v5/` — canonical architecture. Start at `INDEX.md`.

Roles served by the main app: admin/designer (`/admin`), client (`/client/:slug`, `/project/:slug`), contractor (`/contractor/:id`). Auth is HMAC-signed cookies.

Stack: Nuxt 4, Nitro/H3, Vue 3 + @nuxt/ui 3, Tailwind 4, Pinia (reference), Drizzle ORM 0.41, PostgreSQL 16, Redis 7, Zod 3, pnpm 10, PM2, deploy-safe.sh.

## Architecture v5.3 — core rules

Full target in `docs/architecture-v5/`. The non-negotiables:

1. **No new top-level runtime in `app/`.** New microservices go into `services/<name>/` with their own `package.json`, PM2 block, port. Playbook: `docs/architecture-v5/16-extensibility-playbook.md`.
2. **New services never connect to the main Postgres directly.** They use REST via `server/api/**`, Redis Pub/Sub, or ticket-based WS. Three allowed integration patterns in `05-architectural-patterns.md` §5.9.
3. **Cross-process contracts live only in `shared/types/**` and `shared/constants/**`.**
4. **WS auth is ticket-based** (`ws_ticket:<token>` in Redis, 30s TTL). No service reads cookies directly except the main Nuxt app.
5. **Frontend: FSD.** Layers in `app/`: `entities/` → `widgets/` → `pages/`. No upward imports. Detailed map: `10-frontend-refactor-map.md`.
6. **Backend: DDD-lite.** `server/modules/<domain>/` holds the domain; `server/api/**` is thin HTTP. Detailed map: `11-backend-shared-refactor-map.md`.
7. **Design tokens** flow through `app/entities/design-system/model/useDesignSystem.runtime.ts` → CSSOM. Persistence via `server/modules/admin-settings/**`.
8. **Optimistic concurrency (OCC):** every mutable row has `version`; server returns 409 on mismatch. Deletes are soft (`deleted_at`).
9. **Messenger pagination is cursor-based.** Never offset-paginated.

## Refactor roadmap and status

- `docs/architecture-v5/14-refactor-roadmap.md` is the **operational log** — actual batch-level progress lives there. Update it when you land a wave change.
- `docs/architecture-v5/09-target-repository-tree.md` is the target tree. Diffs against it go in `15-target-alignment-audit.md`.
- Waves order: `13-refactor-waves.md`. Don't start a later wave if an earlier one has open target gaps unless the user explicitly says so.
- Doc-consistency check: `pnpm docs:v5:verify` (runs `scripts/verify-architecture-docs.mjs`). Run before committing doc changes in `docs/architecture-v5/`.

## Commands you will actually use

```bash
pnpm dev                          # Main Nuxt app on :3000
pnpm messenger:web:dev            # Messenger web
pnpm messenger:core:dev           # Messenger realtime core
pnpm comm:dev                     # communications-service (hot)
pnpm comm:typecheck               # Typecheck communications-service
pnpm exec vue-tsc --noEmit        # Typecheck main app (no build)
pnpm db:generate                  # Drizzle: generate SQL from schema
pnpm db:migrate                   # Drizzle: apply migrations
pnpm db:studio                    # Drizzle studio
pnpm docs:v5:verify               # Architecture doc consistency check
pnpm deploy:safe:prod:dry-run     # Deploy dry-run (safe)
pnpm deploy:safe:prod:preflight   # Preflight only
pnpm snapshot:list                # List pre-deploy snapshots
```

## Deploy rules

- **Never deploy by hand.** Only through `pnpm deploy:safe:*` scripts in `scripts/deploy-safe.sh`.
- Production host: `daria-deploy` → `152.53.176.165:3000`. PM2 app: `daria-nuxt`.
- Before a real deploy: run `deploy:safe:prod:dry-run` or `deploy:safe:prod:preflight`.
- Snapshots are in `builds/pre-deploy/*.bundle`. Rollback: `pnpm snapshot:restore:last`.
- Deploy metrics: `logs/deploy-metrics.log`.

## Conventions when editing

- **Language:** project docs are in Russian. Code, comments, commit messages, and agent/command files are English.
- **Commit style:** follow recent history — `<type>(<scope>): <subject>`, e.g. `refactor(server): ...`, `docs(architecture-v5): ...`. Subject in present tense, lower case, no trailing period.
- **Before you commit code that touches `app/` or `server/`:**
  1. `pnpm exec vue-tsc --noEmit` (frontend/shared typecheck)
  2. `pnpm comm:typecheck` if `services/communications-service/**` changed
  3. Update `docs/architecture-v5/14-refactor-roadmap.md` if the change is a wave/batch step
- **Do not create new top-level directories** without reading `02-monorepo-structure.md` and `16-extensibility-playbook.md`.
- **Do not touch `cityfarm/`** unless asked — it's out of v5 scope.
- **Do not edit generated files:** `.nuxt/`, `.output/`, `drizzle/` migrations once shipped, `node_modules/`, `builds/`.
- **Secrets:** never commit `.env`, `deploy.session.env`, `admin2_id_ed25519`, `id_ed25519_oxo`.

## Where things live — quick map

| You need to... | Start here |
|----|----|
| Add a frontend page/widget | `app/pages/`, `app/widgets/`, `app/entities/` (FSD) |
| Add an HTTP endpoint | `server/api/<resource>.<method>.ts` thin + `server/modules/<domain>/` logic |
| Change DB schema | `server/db/schema/` → `pnpm db:generate` → review SQL |
| Add a realtime event | `server/modules/<domain>/*-communications-publisher.ts` → Redis Pub/Sub → messenger consumes |
| Add a new microservice | Read `16-extensibility-playbook.md` first. Create `services/<name>/` |
| Change design tokens | `app/entities/design-system/model/useDesignSystem.runtime.ts` |
| Messenger UI | `messenger/web/` (Nuxt 4 + Vuetify M3) |
| Messenger realtime | `messenger/core/` |
| E2EE calls/signaling | `services/communications-service/` |

## Git auto-sync

This repo is configured so every commit on a tracked branch is pushed to
`origin` immediately via `.githooks/post-commit`. The hook is a no-op on
branches without an upstream (e.g. local `claude/*` worktrees), so scratch
work never accidentally publishes.

Repo-local git config (installed by `pnpm hooks:install`):
- `push.default = current` — `git push` pushes the current branch
- `push.autoSetupRemote = true` — first push creates the remote branch
- `fetch.prune = true` — stale remote refs are removed on fetch

What this means in practice:
- Any commit on `main` or `refactor/architecture-v5` is on GitHub within seconds.
- A failed push (e.g. remote diverged) does not fail the commit — it warns and leaves the commit local. Reconcile with `git pull --rebase`.
- To opt a branch out of auto-push, keep it local (no upstream) or unset the upstream: `git branch --unset-upstream`.

## What is out of scope for agents

- Running production deploys without explicit confirmation.
- Force-push, branch deletion, `git reset --hard` on shared branches.
- Editing `docs/architecture-v5/09-15` target/audit docs without also updating the roadmap log.
- Adding new npm dependencies without asking — the stack is deliberate.
