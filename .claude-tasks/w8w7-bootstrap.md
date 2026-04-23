---
id: w8w7-bootstrap
model: sonnet
kind: backend-api
base_branch: main
priority: 65
auto_push: true
---

## Scope
Wave 8 W7 — extend `POST /project-engine/projects/bootstrap` to support a new `mode: 'preset'` that returns the agent-template catalog (no LLM call, no DB writes), so UI can offer a picker of preset agents instead of forcing free-form auto-bootstrap.

Context: Doc-23 § 6 Phase 7 lists this as pending debt. Existing handler at `messenger/core/src/realtime/server.ts:936` already handles `manual` and `auto` modes.

### Depends on
Sibling task `w8w7-templates` (the `listAgentTemplates()` export must exist). If not yet merged when this worker starts, re-check `messenger/core/src/agents/agent-templates.ts` and rebase/wait. Do NOT duplicate the template records.

### Steps
1. Edit bootstrap handler (`messenger/core/src/realtime/server.ts` around the `/project-engine/projects/bootstrap` route):
   - Zod body schema adds `'preset'` to the `mode` enum.
   - When `mode === 'preset'`: return `{ ok: true, mode: 'preset', templates: listAgentTemplates() }` — no DB reads, no Claude CLI calls.
   - `manual` and `auto` paths are unchanged.
2. If bootstrap has an OpenAPI/route-level type export, update it so frontend can type against it.
3. Add a smoke test (same style as existing core tests):
   - `mode: 'preset'` returns `{ ok: true, mode: 'preset', templates: [...] }` with ≥1 template.
   - `mode: 'manual'` still returns `{ ok: true }` with no extra keys (regression check).

## Acceptance
- `pnpm lint:errors` — 0 new errors.
- Smoke test passes via `node --experimental-strip-types --test <path-to-new-test>`.
- Manual curl check (doc in commit body) against local `messenger-core` on port 3043 (this workroom's port):
  `POST /project-engine/projects/bootstrap` with body `{"projectId":"<any-uuid>","mode":"preset"}` returns 200 + templates array.
- Commit message: `feat(messenger/core): add preset mode to project bootstrap (wave8 W7)`.
- Auto-push to `origin/claude/workroom-w8-w7-sweep`.

## Out-of-scope
- Frontend preset picker UI.
- Changing `manual` or `auto` semantics.
- Template catalog content (owned by `w8w7-templates`).
