---
id: w8w7-templates
model: sonnet
kind: backend-module
base_branch: main
priority: 70
auto_push: true
---

## Scope
Wave 8 W7 — extract hardcoded `MESSENGER_AGENTS` list from `messenger/core/src/agents/agent-store.ts` into a dedicated template library so it becomes a reusable preset catalog for project bootstrap (consumed by the bootstrap handler in sibling task `w8w7-bootstrap`).

Context: Doc-23 § 6 Phase 7 marks this as pending debt. The 12-agents list is currently the fallback when no DB-backed agents exist (agent-store.ts:395,405,421,552). New structure must preserve that fallback semantics unchanged.

### Steps
1. Create `messenger/core/src/agents/agent-templates.ts`:
   - Export `AGENT_TEMPLATES: MessengerAgentTemplate[]` (same records as current `MESSENGER_AGENTS`, keeping `id`, `displayName`, `description`, `capabilities`, `defaultModel`, `iconKey`, `color`, `kind` fields).
   - Export `getAgentTemplate(id: string): MessengerAgentTemplate | null`.
   - Export `listAgentTemplates(): MessengerAgentTemplate[]`.
   - Keep the `MessengerAgentRecord` type importing from its existing home (don't duplicate).
2. Refactor `agent-store.ts`:
   - Replace inline `MESSENGER_AGENTS` with `import { AGENT_TEMPLATES, getAgentTemplate } from './agent-templates'`.
   - Use `AGENT_TEMPLATES` in the same fallback sites (lines ~395, ~405, ~421, ~552).
3. Unit smoke test `messenger/core/src/agents/__tests__/agent-templates.test.ts` (plain `node --test` style — repo uses `node --experimental-strip-types --test`):
   - 12 templates exist, all have non-empty `id` + `displayName`.
   - `getAgentTemplate('<any-real-id>')` returns that template.
   - `getAgentTemplate('bogus')` returns null.

## Acceptance
- `pnpm lint:errors` — 0 new errors.
- `pnpm exec vue-tsc --noEmit` — no new errors.
- Smoke test: `node --experimental-strip-types --test messenger/core/src/agents/__tests__/agent-templates.test.ts` — passes.
- Behavioral check: grep for `MESSENGER_AGENTS` returns only comment/history references, not live code.
- Commit message: `refactor(messenger/core): extract agent templates library (wave8 W7)`.
- Auto-push to `origin/claude/workroom-w8-w7-sweep`.

## Out-of-scope
- Exposing templates over HTTP (sibling task `w8w7-bootstrap` does that via bootstrap handler).
- Removing `/legacy-agents` route (no such route exists in repo — verified absent).
- Changing agent CRUD logic, DB schema, or any handler surfaces.
