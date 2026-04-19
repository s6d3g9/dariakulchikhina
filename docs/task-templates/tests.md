---
kind: tests
---

# test(<scope>): <what is covered>

Template for a test-writing task: unit, integration, or smoke suite for a specific module or feature.

Replace `<scope>` with the feature/module under test (e.g., `auth`, `cart`, `messaging-dedup`). Replace `<what is covered>` with a one-line summary of the coverage goal (e.g., "login flow and session validation", "concurrent notification merging").

**Purpose:** Document what to test and how, so reviewers can verify the suite is complete and the tests stay maintainable.

## Target module

Which module, file, or service is under test? Provide the path:
- Example: `server/modules/orders/order-service.ts`, `app/widgets/checkout/useCheckout.ts`, `messenger/core/dedup.ts`.

State the **current coverage gap** (what is missing from existing tests):
- Which test cases are missing? (e.g., concurrent mutations, permission checks, multi-tenant isolation)
- Which edge cases or error paths are untested? (e.g., retry logic, timeout handling, circuit breaker)
- What fixture state is missing? (e.g., multi-tenant contexts, Redis failure modes, quota exhaustion)

Note: Prioritize the most critical gaps. Complete coverage of every path is not required; focus on the scenarios that would break in production.

## Test plan

Numbered checklist of what to test and how:

1. **Fixtures:** Data/state setup needed (seeded DB rows, mock external services, Redis state, test user identities). Be explicit about shared vs. per-test setup.
2. **Happy path:** Primary user flow (successful operation). Assert that: function returns expected result, DB state changes correctly, side effects fire in order, events are published.
3. **Edge cases:** Boundary values, empty inputs, concurrent requests, partial failures, timeout, rate limiting. One assertion per case.
4. **Error cases:** Invalid input validation, permission denied, resource not found, external service failure, network retry exhaustion. One assertion per case.
5. **Assertion style:** Use framework conventions (`vitest expect()`, `node --test assert()`, etc.). Verify return values, mutations, and error messages—not implementation details.

## Scope

**Directory:** New tests in one of:
- `src/**/__tests__/<name>.test.ts` for unit tests
- `src/**/<name>.smoke.ts` for integration/smoke tests
- `messenger/core/**/__tests__/<name>.test.ts` for realtime tests

**Runner:** vitest (main app, messenger), node --test (services), or messenger smoke harness (realtime flows).

**Constraints:**
- Max 300 lines per test file; split if larger to keep readability.
- Use deterministic fixtures; avoid snapshot testing unless absolutely required (e.g., error message validation).
- Test behavior, not implementation — refactoring should not break tests.

## Acceptance

Verification checklist before commit:

- [ ] **New tests pass:** `pnpm test` or `pnpm comm:test` returns zero exit, showing all new tests green.
- [ ] **No regressions:** Existing test suite passes without breaking any test.
- [ ] **Typecheck:** `pnpm exec vue-tsc --noEmit` (or `pnpm comm:typecheck` if services/).
- [ ] **Lint:** `pnpm lint:errors` shows zero new violations.
- [ ] **One commit:** Subject format `test(<scope>): <summary>` (e.g., `test(auth): concurrent retry coverage`).
- [ ] **TASK.md deleted** before final push.
- [ ] **Final report:** Include `pnpm test` console output proving new tests passing.

## Out of scope

**Production code changes.** This task writes tests only; it does not modify runtime behavior.

If you discover a bug while writing tests (e.g., a test fails because the implementation is broken), do **not** fix it in this task. Instead:
1. Open a separate bug TASK or issue.
2. Note the bug in your final report.
3. Continue with test-only changes.

Separating test logic from bug fixes keeps each task focused and reviewable. Tests that expose regressions are still valuable — they document the intended behavior.

## Notes

- Keep tests focused on behavior, not implementation. Refactors should not break tests.
- Document WHY edge cases matter in test comments if the reason is non-obvious (e.g., "concurrent mutations expose race condition under DB lock contention").
- Reuse fixtures across tests when possible to reduce setup duplication.
