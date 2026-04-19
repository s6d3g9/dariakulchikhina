---
id: tests-YYYYMMDD-brief-slug
kind: tests  # primary kind for test-suite work
model: sonnet
base_branch: main
priority: 40
auto_push: true
depends_on: []  # optional: list other task IDs if this blocks on them
---

# tests: [scope and coverage description]

## Context

**What's being tested:** [module/feature name and brief description]

**Why:** [business driver — improved coverage, new code paths, regression protection, etc.]

Example: "Projects repository needs unit tests to prevent mutations regressions; currently 0 coverage."

**Tracking:** [link to issue/Linear ticket if applicable]

## Scope

What test suite will you create or extend? List the key cases:

1. **[Repository/service name]:** Add unit/integration tests for [method/flow]. Affects: `__tests__/...`.
2. **[Edge case or error path]:** Test [error condition or boundary]. Affects: `__tests__/...`.
3. **[Integration flow]:** Test [end-to-end or cross-module behavior]. Affects: `__tests__/...`.
4. **[Regression guard]:** Add test for [prior bug or invariant]. Affects: `__tests__/...`.

## Test strategy

- **Test type:** Unit / Integration / E2E (circle one).
- **Framework:** Vitest / Playwright / other.
- **Coverage target:** [e.g., "80% line coverage", "all error paths"].
- **Mocking strategy:** [e.g., "real database via test Postgres", "mocked service layer"].

## Acceptance

- [ ] All tests pass: `pnpm test` or `pnpm test:<suite>` completes with 0 errors.
- [ ] No new architecture violations: `pnpm lint:errors` reports no new violations.
- [ ] Coverage meets target: [e.g., `nyc report --lines 80`].
- [ ] One commit: `test(<scope>): <coverage description>`.
- [ ] Final report includes:
  - Commit hash (from `git log --oneline`).
  - Test output (pass count and any warnings).
  - Coverage summary (lines / branches / functions).

## Notes

- Tests live in `__tests__/` parallel to source; see `docs/architecture-v5/17-coding-standards.md`.
- Do not mock the database for repository/integration tests unless explicitly approved (we got burned once: see CLAUDE.md § Conventions).
- Use Zod fixtures or factories for consistent test data, not hand-rolled objects.
