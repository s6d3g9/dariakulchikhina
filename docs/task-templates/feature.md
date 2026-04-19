---
id: feature-YYYYMMDD-brief-slug
kind: frontend-ui  # allowed: frontend-ui, backend-api, backend-module, messenger-realtime, frontend-research
model: sonnet
base_branch: main
priority: 50
auto_push: true
depends_on: []  # optional: list other task IDs if this blocks on them
---

# Feature: [descriptive title]

## Context

**Why:** [one sentence on the user need or business driver — which story/issue, link if applicable]

Example: "Users need to filter projects by status to focus on active work (issue #245)."

**Story/issue:** [link to tracking system — Linear, GitHub, etc.]

## Scope

What code changes will you make? List 3–5 numbered steps:

1. **[Component/module name]:** Add [feature detail]. Affects: `app/pages/...`, `app/widgets/...`.
2. **[Backend endpoint or module]:** Implement [logic]. Affects: `server/api/...`, `server/modules/...`.
3. **[Database or shared type]:** Update [schema/type]. Affects: `server/db/schema/...`, `shared/types/...`.
4. **[Integration/messaging]:** Wire [realtime event or API call]. Affects: `server/modules/.../*-publisher.ts`, messenger consumer.
5. **[Tests]:** Add integration tests for [flow]. Affects: `__tests__/...`.

## Acceptance

- [ ] Typecheck passes: `pnpm exec vue-tsc --noEmit` (frontend/shared) and `pnpm comm:typecheck` if touching comms.
- [ ] Lint clean: `pnpm lint:errors` reports no new violations.
- [ ] One commit per logical step (typically 2–4 commits).
- [ ] Final commit deletes this TASK.md.
- [ ] Final report includes:
  - Commit hashes (from `git log --oneline`).
  - Verify results (typecheck + lint output).
  - Any blockers or deviations from scope.

## Out of scope

- Do not refactor [adjacent component] — that's [future task ID or wave number].
- Do not add new dependencies (check CLAUDE.md § "stack is deliberate").
- Do not change database migrations once shipped (use new migrations for schema evolution).
- Do not modify `cityfarm/` or unrelated services.

## Notes

- Ref: `docs/architecture-v5/10-frontend-refactor-map.md` for FSD layer rules.
- Ref: `docs/architecture-v5/11-backend-shared-refactor-map.md` for DDD module patterns.
- Design tokens flow through `app/entities/design-system/model/useDesignSystem.runtime.ts`.
- Realtime: use Redis Pub/Sub + messenger ticket-based WS; see `05-architectural-patterns.md` §5.9.
- OCC: mutable rows must have `version`; server returns 409 on mismatch.
