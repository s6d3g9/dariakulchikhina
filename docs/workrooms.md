# Parallel Workrooms

Daria development is Remote Dev Mode (see [CLAUDE.md](../CLAUDE.md)). For
parallel work across several Claude Code windows, each window gets its own
**workroom**: a git worktree on the server with pre-allocated dev ports and
its own Redis DB index.

All workrooms share the Postgres instance (`daria_admin_refactor` DB on
`localhost:5433`) and the dev Redis instance (`localhost:6380`, different DB
per workroom).

## Architecture

```
Windows 11 (4 Claude windows, one per workroom)
        │
        ▼  SSH (MaxSessions=60 on the server)
┌──────────────────────────────────────────────────────────────┐
│  /home/claudecode/                                           │
│  ├── daria/                  main clone, NEVER edited        │
│  └── workrooms/                                              │
│      ├── w1-<slug>/         git worktree, its own branch     │
│      ├── w2-<slug>/                                          │
│      └── ... (up to w9)                                      │
│                                                              │
│  Shared services:                                            │
│    daria_postgres  :5433   DB = daria_admin_refactor         │
│    redis-server    :6380   DB index = workroom index         │
│    hiddify_redis   :6379   (not ours — do not touch)         │
└──────────────────────────────────────────────────────────────┘
```

## Port allocation

Each workroom has an `index` N in 1..9. Its dev ports are:

| Service                    | Port formula | w1   | w2   | w3   | w4   |
| -------------------------- | ------------ | ---- | ---- | ---- | ---- |
| Nuxt main app              | `30N1`       | 3011 | 3021 | 3031 | 3041 |
| Messenger web              | `30N2`       | 3012 | 3022 | 3032 | 3042 |
| Messenger core (WS)        | `30N3`       | 3013 | 3023 | 3033 | 3043 |
| Communications service     | `30N4`       | 3014 | 3024 | 3034 | 3044 |
| Redis DB index             | `N`          | 1    | 2    | 3    | 4    |

The `.env` inside each workroom exports `NUXT_PORT`, `MESSENGER_WEB_PORT`,
`MESSENGER_CORE_PORT`, `COMMUNICATIONS_SERVICE_PORT`, and a `REDIS_URL` with
the DB index embedded. Dev scripts pick those up automatically.

## Commands (from the Windows host, in the repo root)

```bash
# Create a workroom from main.
./scripts/workrooms/workroom-local.sh create w1-wave-4-ui

# List all active workrooms with ports and branches.
./scripts/workrooms/workroom-local.sh list

# Show current server load and which workrooms have dev servers up.
./scripts/workrooms/workroom-local.sh status

# Show port allocation for a workroom.
./scripts/workrooms/workroom-local.sh ports w1-wave-4-ui

# Run a one-off command inside a workroom (its .env is loaded).
./scripts/workrooms/workroom-local.sh run w1-wave-4-ui -- pnpm lint:errors
./scripts/workrooms/workroom-local.sh run w1-wave-4-ui -- pnpm exec vue-tsc --noEmit
./scripts/workrooms/workroom-local.sh run w1-wave-4-ui -- git status

# Open an interactive shell already cd'd into the workroom.
./scripts/workrooms/workroom-local.sh shell w1-wave-4-ui

# Remove a workroom (must stop its dev servers first).
./scripts/workrooms/workroom-local.sh remove w1-wave-4-ui
```

On the server side the same commands are available as `workroom <subcmd>`
(the script lives at `~/bin/workroom`).

## Claude Code workflow (one window per workroom)

1. Pick a slug for the window (e.g. `w1-wave-4-ui`, `w2-hotfix-auth`).
2. Create the workroom:
   `./scripts/workrooms/workroom-local.sh create <slug>`
3. Tell the Claude window at its first turn:
   > Operate in workroom **`<slug>`**. All `pnpm`, `vue-tsc`, `eslint`,
   > `git`, `docs:v5:verify` must run via
   > `./scripts/workrooms/workroom-local.sh run <slug> -- <cmd>`.
   > The worktree on the server is at `~/workrooms/<slug>`. Do not touch
   > `~/daria/` (that is the read-only canonical clone).
4. When finished: open a PR from `claude/workroom-<slug>` into `main`.
5. After merge, tear down the workroom:
   `./scripts/workrooms/workroom-local.sh remove <slug>`

## Capacity on the server (12 cores, 32 GB)

| Workrooms active | CPU (peak typecheck) | RAM  | Comfortable? |
| ---------------- | -------------------- | ---- | ------------ |
| 1                | 2 cores              | 3 GB | trivial      |
| 3                | 6 cores              | 9 GB | ✅ recommended |
| 5                | 10 cores             | 15 GB| ✅ still fine |
| 7+               | >10 cores            | 20+ GB | watch `status` |

Dev servers (`pnpm dev`) are long-lived and cheap (~1 GB, 1 core each).
Typechecks and lint runs are bursty but short (~30 s). Running 3–5 workrooms
in parallel is the sweet spot.

## Model routing across windows

Each Claude Code window is independent — pick the model per window:

| Window role                   | Suggested model | Why |
| ----------------------------- | --------------- | --- |
| Architecture planner / ADR    | **Opus**        | Complex invariants in `docs/architecture-v5` |
| Refactor-wave implementer     | **Sonnet**      | Balanced code-gen quality/cost; mechanical batches |
| Hotfix / bug triage           | **Sonnet**      | Fast turnaround, keeps coherent reasoning |
| Read-only research / audits   | **Haiku 4.5**   | Cheap and fast for Grep/Glob/Read-only agents |
| Import-path-rewriter wave     | **Haiku 4.5**   | Mechanical, zero judgement |

Run different models in different windows at the same time — they don't
share state, only the server.

## Cross-workroom etiquette

- **Never edit files in `~/daria/`.** That clone is the canonical baseline.
  Always work inside `~/workrooms/<slug>/`.
- **Never merge branches from another workroom** without explicit instruction
  — each workroom's branch belongs to one Claude window at a time.
- **Never run migrations in parallel workrooms against the same DB.**
  If a workroom needs a destructive `db:migrate`, it must use its own DB:
  create one with
  `ssh daria-dev 'sudo docker exec daria_postgres psql -U daria -c "CREATE DATABASE daria_<slug> TEMPLATE daria_admin_refactor;"'`
  and point the workroom `.env` at it.
- **Use `status` before creating a new workroom** to check load. If the
  server is already at 5+ active workrooms with dev servers running, drop
  an unused one first.
