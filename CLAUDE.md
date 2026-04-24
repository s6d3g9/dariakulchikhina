# Daria Design Studio — Agent Context

CRM/ERP for an interior design studio. Polyruntime pnpm monorepo.

## ⚡ Remote Development Mode (READ FIRST)

Development happens on **remote server** `daria-dev` (152.53.176.165). The Windows host is a thin client for UI only; **all build/test/lint/git operations run on the server** where code actually lives at `/home/claudecode/daria`.

### SSH entry point

```bash
ssh daria-dev 'cd ~/daria && <cmd>'     # Always wrap commands like this.
ssh daria-dev 'cd ~/daria && pnpm lint:errors'
ssh daria-dev 'cd ~/daria && pnpm exec vue-tsc --noEmit'
ssh daria-dev 'cd ~/daria && git status'
```

Host `daria-dev` is in `~/.ssh/config`. Uses key `~/.ssh/claudecode_ed25519`.

### File operations

- **When `Z:\` is mounted (SSHFS)**: use standard Read / Edit / Write against `Z:\<path>` — the edits land directly on the server.
- **When `Z:\` is NOT mounted** (e.g. WinFsp launcher not yet restarted): use `ssh daria-dev 'cat ~/daria/<path>'` for Read, and `scp` / heredoc piped over SSH for writes. Prefer remounting Z:\ (run `C:\Users\STAS\mount-daria.bat` after reboot or as admin).
- **Local worktree files in `C:\Users\STAS\Downloads\dariakulchikhina-local\*`** are a legacy copy — do NOT edit them. The authoritative code is on the server.

### Which runtime runs where

| Runtime / DB            | Location                        | Port |
| ----------------------- | ------------------------------- | ---- |
| Main Nuxt app           | server: `~/daria` via pnpm      | 3000 |
| PostgreSQL (pgvector)   | server: docker `daria_postgres` | 5433 |
| Redis (dev)             | server: systemd redis-server    | 6380 |
| Hiddify Redis (untouch) | server: docker `hiddify_redis`  | 6379 |

`.env` on the server already points at these. Never change those ports.

### Minimum-rewrite rule (cost control)

Each file write over SSH/SSHFS is **expensive** (round-trip + cache invalidation). Apply these:

1. **Always prefer `Edit` over `Write`.** `Edit` sends only the diff; `Write` sends the whole file.
2. **Never `Read` a file you just `Edit`-ed.** The tool returns the new content; re-reading is wasted work.
3. **Batch edits to the same file.** Multiple `Edit` calls on one file with no intervening `Read` are fine — avoid the Read-Edit-Read-Edit ping-pong.
4. **Don't rewrite a file to change one line.** Use `Edit` with a tight `old_string`, or `replace_all` if the pattern is unique.
5. **Don't create helper / intermediate files** during a refactor. If you need scratch state, keep it in memory.
6. **When a move touches many imports, delegate to the `import-path-rewriter` agent** — it runs one mechanical pass instead of many per-file Edits.

### Parallel Workrooms (multiple Claude windows)

For parallel work across **several Claude Code windows at once**, use
**workrooms** — each window gets its own git worktree on the server with
pre-allocated ports and a dedicated Redis DB. Full spec: [docs/workrooms.md](docs/workrooms.md).

TL;DR:

```bash
# Create a workroom for this window:
./scripts/workrooms/workroom-local.sh create w1-wave-4-ui

# Then run every project command inside it:
./scripts/workrooms/workroom-local.sh run w1-wave-4-ui -- pnpm lint:errors
./scripts/workrooms/workroom-local.sh run w1-wave-4-ui -- pnpm exec vue-tsc --noEmit
./scripts/workrooms/workroom-local.sh run w1-wave-4-ui -- git add -A && git commit ...
```

Rules:
- **One Claude window = one workroom.** Never edit `~/daria/` directly.
- **Ports are index-based:** workroom index `N` owns `30N1..30N9` and Redis DB `N`.
- **Postgres is shared** (`daria_admin_refactor`). If a workroom needs destructive migrations, clone the DB first (see `docs/workrooms.md` § Cross-workroom etiquette).
- **Model per window:** Opus for architecture / ADR, Sonnet for refactor & fix, Haiku for research / import-rewriter (see `docs/workrooms.md` § Model routing).
- **Server capacity:** 3–5 workrooms in parallel is the sweet spot on this 12-core / 32 GB host. Run `workroom status` before spinning up a 6th.

### Deploy still runs from Windows

`pnpm deploy:safe:*` still runs from the Windows worktree because it ships `builds/pre-deploy/*.bundle` through a different user (`stas` via Host `daria-deploy`). Remote Dev Mode does not change deploy flow — it only moves *development* to the server.

## 🤖 Claude CLI Dispatcher

The Claude CLI dispatcher is a control plane for running multiple Claude Code sessions in parallel on the server, each accessible via the messenger UI as an agent contact. This enables collaborative dev workflows: while one window works on a feature, another can research, debug, or run bulk operations concurrently.

### Architecture

```
Windows / phone / browser
        │  http://152.53.176.165:9090  (basic auth)
        ▼
claude-web-dashboard  ←──watches── ~/state/claude-sessions/*.log
        │
        │  claude-stream-bridge per tmux ── POST /agents/:id/stream
        ▼
messenger/core ingest-handler → messenger_agent_run_events (Postgres)
                               → WS agent-stream:{agentId}
                               → messenger/web agent workspace
```

Each tmux session is a long-running Claude Code process. The dashboard polls its logs, forwarding output events to the messenger ingest endpoint. Agents appear as live contacts; send follow-ups via CLI or the UI.

### Launch a session

```bash
~/bin/claude-session create <slug> --workroom <wr> --model <m> --prompt "..."
```

This creates a tmux window, starts Claude Code with the given prompt, and streams output to the messenger dashboard.

### Monitor and interact

- **Dashboard:** http://152.53.176.165:9090 (credentials in `~/.claude-dashboard-auth`)
- **CLI:** `claude-session list`, `logs`, `tail`, `attach <slug>`
- **Send follow-up:** `claude-session send <slug> "..." ` or type in messenger UI

See [docs/claude-cli-dispatcher-runbook.md](docs/claude-cli-dispatcher-runbook.md) for detailed operator steps.

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
pnpm lint                         # ESLint (all warnings + errors)
pnpm lint:errors                  # ESLint errors only — architectural invariants
pnpm lint:fix                     # ESLint auto-fix
pnpm db:generate                  # Drizzle: generate SQL from schema
pnpm db:migrate                   # Drizzle: apply migrations
pnpm db:studio                    # Drizzle studio
pnpm docs:v5:verify               # Architecture doc consistency check
pnpm deploy:safe:prod:dry-run     # Deploy dry-run (safe)
pnpm deploy:safe:prod:preflight   # Preflight only
pnpm snapshot:list                # List pre-deploy snapshots
```

## ESLint: architectural invariants

`eslint.config.mjs` encodes the v5 invariants as enforceable rules.
Any change that violates one is a merge blocker; `pnpm lint:errors`
must return zero on PR-ready branches.

**Hard rules (error):**
- `shared/**` — cannot import from `app/`, `server/`, `messenger/`, `services/`, or any DB/runtime driver (`postgres`, `drizzle-orm`, `ioredis`, `h3`, `nuxt`). It is the pure contract layer.
- `server/api/**` — cannot import `drizzle-orm` or `server/db/schema*` directly. Fat API handlers go behind `server/modules/<domain>/`.
- `messenger/**` and `services/communications-service/**` — cannot import from `app/`, `server/`, the other runtime, or a DB driver. The only allowed cross-boundary import is `shared/**`.
- FSD direction: `app/entities/**` cannot import from `widgets/features/pages`; `app/widgets/**` cannot import from `pages`; `app/features/**` cannot import from `widgets/pages`.

**Soft rules (warn):**
- File size: 500 lines.
- Function size: 120 lines.
- Cyclomatic complexity: 15.
- Max nesting depth: 4.
- Max function params: 5.
- `@typescript-eslint/no-explicit-any`.
- `@typescript-eslint/no-unused-vars` (ignore `_`-prefixed).
- `vue/no-v-html`, `vue/no-mutating-props`.

Overrides: Nuxt middleware/plugins/pages/layouts, `*.config.ts`, and `scripts/**` are relaxed (framework contracts or one-shot helpers).

Current baseline (captured 2026-04-20): **10 errors** — mostly `process.env` access in `messenger/**` and `clicore2messenger/` (out-of-scope per v5.3 architecture). Fat API handlers in `server/api/**` have been resolved. Per-module status: see `docs/architecture-v5/11-backend-shared-refactor-map.md`.

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
  3. `pnpm lint:errors` — must report no new architectural violations
  4. Update `docs/architecture-v5/14-refactor-roadmap.md` if the change is a wave/batch step
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
