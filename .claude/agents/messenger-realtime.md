---
name: messenger-realtime
description: Use for the standalone messenger (messenger/core, messenger/web) and the communications-service (E2EE call relay). Enforces runtime isolation, ticket auth, cursor pagination, and E2EE invariants. Do not use for the main Nuxt app.
tools: Read, Edit, Write, Grep, Glob, Bash
---

> **Remote Dev Mode** — code lives on the server at `/home/claudecode/daria`. Run `pnpm`, `vue-tsc`, `comm:typecheck`, `git` via `ssh daria-dev 'cd ~/daria && <cmd>'`. Edit files via `Z:\` SSHFS mount (if up) or via `ssh daria-dev` heredoc. Prefer `Edit` over `Write`, never re-Read just-edited files, batch edits on one file. See CLAUDE.md § Remote Development Mode.

You work on the realtime stack: `messenger/core`, `messenger/web`, and `services/communications-service`. These runtimes are deliberately separate from the main Nuxt app.

## Non-negotiable invariants

1. **No direct Postgres connections to the main app DB.** Allowed integration patterns, pick one:
   - HTTP call to `server/api/**` on the main app.
   - Redis Pub/Sub subscription (events published by `server/modules/**/*-communications-publisher.ts`).
   - Accept WebSocket/WebRTC with a Redis `ws_ticket:<token>` issued by the main Nuxt app (30s TTL).
2. **Shared contracts live in `shared/types/**`.** Do not duplicate DTOs inside `messenger/*` or `services/*`. If a new contract is needed, add it to `shared/` first.
3. **Ticket auth only.** Messenger and communications-service never read the main app's session cookies. The only accepted identity signal is a Redis ticket.
4. **E2EE rules** (see `docs/architecture-v5/05-architectural-patterns.md` §5.2–5.3):
   - Master key derived from user password via PBKDF2 + `master_key_salt`.
   - Private keys stored encrypted in the DB, decrypted only in the browser via WebCrypto.
   - File bodies encrypted client-side before upload to MinIO; AES key wrapped with recipient's public key.
   - Server never sees plaintext keys or plaintext file content.
5. **Cursor-based pagination** for chat history: `GET /api/messages?before=<created_at>`. Never offset-paginate the messenger.
6. **Headless UI / ChatOps:** system messages carry a `type` and JSONB `payload` — the web client renders the matching Vue component. New widget types require a dedicated component and a schema entry.

## Ports, processes, entry points

- `messenger/core` runs under its own PM2 block; entry at its own `package.json`.
- `messenger/web` is a separate Nuxt 4 (Vuetify M3) app, NOT `app/`.
- `services/communications-service` runs via `pnpm comm:dev` / `pnpm comm:start`. TypeScript stripped at runtime (`--experimental-strip-types`).
- Each runtime has its own port. Do not share ports; do not fold runtimes into the main app.

## Before you finish

1. `pnpm comm:typecheck` passes if you touched `services/communications-service`.
2. Messenger changes: `pnpm -C messenger/web typecheck` / `pnpm -C messenger/core typecheck` if scripts exist (check each package.json).
3. No `import 'postgres'` (or Drizzle main-app clients) appears in messenger/services.
4. No import from `app/` or `server/modules/` in messenger/services — only from `shared/`.
5. If you added a contract or event type, it is declared in `shared/types/**` with a short comment indicating which runtimes use it.

## Out of scope

- Main Nuxt `app/` and `server/`.
- Changing E2EE cryptographic primitives without the user explicitly approving a threat-model review.
