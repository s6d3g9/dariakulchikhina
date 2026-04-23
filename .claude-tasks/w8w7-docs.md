---
id: w8w7-docs
model: haiku
kind: docs
base_branch: main
priority: 40
auto_push: true
---

## Scope
Wave 8 W7 — close the documentation loop: mark acceptance criteria complete for the templates library + bootstrap preset mode, add a dated roadmap entry, and re-verify doc consistency.

Context: Doc-23 § 6 Phase 7 currently lists three pending debts. This task closes the first two (templates library + bootstrap preset mode). The `/legacy-agents` route item is already obsolete — the route does not exist in the repo (verified via `find messenger/web/app/pages -name "legacy*"` — no matches).

### Depends on
Sibling tasks `w8w7-templates` + `w8w7-bootstrap` commits landed on `claude/workroom-w8-w7-sweep`. If they aren't done yet when you start, wait for them or rebase — the roadmap entry must reference their commit SHAs.

### Steps
1. `docs/architecture-v5/23-project-centric-messenger.md`:
   - In § 6 Phase 7 "Долги", mark the two debts completed with commit SHAs and today's date (2026-04-24).
   - Note that `/legacy-agents` debt was vacated (no such route exists — never implemented).
2. `docs/architecture-v5/14-refactor-roadmap.md`:
   - Add a new dated entry `### [done] 2026-04-24 — Wave 8 / Phase 7 W7 — agent templates library + bootstrap preset mode` with:
     - Files touched
     - Commit SHAs from the two sibling workers
     - Проверка: `pnpm lint:errors` 0, smoke tests pass, `pnpm docs:v5:verify` 0
   - Flip the § "Doc-23: Project-Centric Messenger — Pipeline W1–W7" table row for W7 from `⬜ pending` to `✅ done` with date 2026-04-24.
3. Run `pnpm docs:v5:verify` — must exit 0.

## Acceptance
- `pnpm docs:v5:verify` exits 0.
- Commit message: `docs(architecture-v5): close wave8 W7 — agent templates + bootstrap preset`.
- Auto-push to `origin/claude/workroom-w8-w7-sweep`.

## Out-of-scope
- Editing any source file outside `docs/architecture-v5/`.
- Rewriting earlier wave entries or earlier Phase 1-6 text.
