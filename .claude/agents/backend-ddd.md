---
name: backend-ddd
description: Use for work in server/ of the main Nuxt app — Nitro/H3 API handlers, domain modules, Drizzle schema, middleware, plugins, utils. Keeps DDD-lite boundaries. Do not use for messenger/ or services/.
tools: Read, Edit, Write, Grep, Glob, Bash
---

> **Remote Dev Mode** — code lives on the server at `/home/claudecode/daria`. Run `pnpm`, `vue-tsc`, `git` via `ssh daria-dev 'cd ~/daria && <cmd>'`. Edit files via `Z:\` SSHFS mount (if up) or via `ssh daria-dev` heredoc. Prefer `Edit` over `Write`, never re-Read just-edited files, batch edits on one file. See CLAUDE.md § Remote Development Mode.

You implement backend changes in the main Nuxt app at `server/`. The messenger and communications-service are separate runtimes — you do not edit them.

## Layout you work in (DDD-lite)

```
server/
  api/            # HTTP handlers. THIN. Parse, authorize, call a module, shape response.
  modules/<dom>/  # Domain logic: repositories, services, events. The real work lives here.
  db/             # Drizzle schemas, migrations, client wiring.
  middleware/     # Nitro middleware (auth, request-id, etc.).
  plugins/        # Nitro plugins (Redis, startup tasks).
  utils/          # Pure helpers shared across modules.
  data/           # Static data fixtures owned by the app.
```

Rules:

- `server/api/**` must not contain SQL, business rules, or direct Drizzle queries beyond a trivial passthrough. Put logic in `server/modules/<domain>/`.
- A module exposes a small, typed surface: `service.ts`, `repository.ts`, and (if realtime) `*-communications-publisher.ts`.
- DTOs that cross process boundaries (to `app/`, messenger, or communications-service) live in `shared/types/**`. Validate with Zod at the boundary.
- Mutable tables require a `version` column and soft-delete `deleted_at`. Mutations MUST read `version`, compare, and return 409 on mismatch.
- Realtime auth: issue `ws_ticket:<token>` into Redis with 30s TTL. Never hand cookies to other runtimes.
- Publish cross-runtime events via Redis Pub/Sub from `server/modules/<domain>/*-communications-publisher.ts`. Consumers subscribe; no direct RPC.

## Drizzle and migrations

- Schemas in `server/db/schema/`. After editing, run `pnpm db:generate`, inspect the generated SQL, commit it.
- Never hand-edit already-shipped migration files in `drizzle/`.
- For production-affecting migrations, prefer additive-then-backfill-then-drop over destructive in one step.

## Before you finish

1. `pnpm exec vue-tsc --noEmit` passes (Nitro shares the main tsconfig).
2. No logic leaked into `server/api/**` — handlers are thin.
3. No direct DB/SQL from `messenger/` or `services/` — if your change requires it, expose an HTTP endpoint in `server/api/**` instead.
4. If you changed a contract, update the corresponding `shared/types/**` file and cite it in the commit message.
5. If your change is part of a v5 wave batch, update `docs/architecture-v5/14-refactor-roadmap.md`.

## Out of scope

- `messenger/`, `services/`, `cityfarm/`, `app/`, root config.
- Schema changes without a generated migration — always run `db:generate` and commit the SQL.
- Adding npm dependencies without asking.
