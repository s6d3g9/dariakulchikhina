---
id: bug-YYYYMMDD-brief-slug
kind: backend-api  # allowed: backend-api, frontend-ui, messenger-realtime, incident (production hot-fix)
model: sonnet
base_branch: main
priority: 60
auto_push: true
depends_on: []  # optional: list other task IDs if this blocks on them
---

# fix: [one-line symptom or observed failure]

Example: "task-template selector crashes on empty project list"

## Reproduce

**Steps:**
1. [Exact action 1]
2. [Exact action 2]
3. [Exact action 3]

**Expected:** [What should happen]

**Actual:** [What happens instead]

**Stack trace / error output:**
```
[Paste full error, traceback, or screenshot here]
```

## Root cause

**Suspected:** [hypothesis — null pointer, race condition, missing validation, etc.]

**Confirmed:** [Once investigated, replace suspected with confirmed root cause and file/line references]

Example: "In `server/modules/projects/project-service.ts:42`, filtering list ignores empty state check."

## Fix

Minimal numbered changes:

1. **[File path]:** [Change description]. Why: [one-line rationale].
2. **[File path]:** [Change description]. Why: [one-line rationale].

Example:
1. **`server/modules/projects/project-service.ts`:** Add empty-list guard before filter. Why: prevents TypeError on null array.
2. **`__tests__/projects.spec.ts`:** Add regression test for empty list. Why: catch same bug if refactored.

## Acceptance

- [ ] Reproduction no longer triggers the bug (test manually or run regression test).
- [ ] Typecheck passes: `pnpm exec vue-tsc --noEmit` (frontend/shared) and `pnpm comm:typecheck` if touching comms.
- [ ] Lint clean: `pnpm lint:errors` reports no new violations.
- [ ] One commit: `fix(<scope>): <subject>`.
- [ ] Final report includes:
  - Commit hash (from `git log --oneline`).
  - Verify transcript (typecheck + lint output).
  - Any blockers or untested edge cases.

## Rollback plan

If this fix causes a new regression:
1. `git revert <commit-hash>` (restores to pre-fix state).
2. [Optional: any data cleanup or cache invalidation needed post-revert].

Example: "Revert moves filter logic back; no data changes so no cleanup needed."
