# 25. Module Maturity Audit — server/modules

Snapshot date: 2026-04-20. Scope: `server/modules/**` only. Messenger and services are excluded.

## Maturity legend

| Level | Criteria |
|-------|----------|
| **stub** | No repository layer, OR primary service file < 40 LOC |
| **partial** | Repository + service present (service ≥ 40 LOC), but no dedicated `__tests__/` directory |
| **mature** | Repository + service + `__tests__/` (or sibling test file ≥ 100 LOC referencing the module) |

> **Universal gap:** Zero modules currently have a `*.types.ts` file. Type definitions are embedded in service/repository files. This is noted in each section but not used as the sole maturity discriminator, since it is a cross-cutting concern.

---

## Summary table

| module | files | has_repo | has_service | has_types | has_tests | prod LOC | maturity |
|---|---|---|---|---|---|---|---|
| admin | 4 | ✓ | ✓ | ✗ | ✓ (top-level) | 290 | **mature** |
| admin-settings | 2 | ✓ | ✓ | ✗ | ✗ | 91 | **stub** |
| agent-registry | 3 | ✓ | ✓ | ✗ | ✗ | 153 | **partial** |
| ai | 7 | ✓ | ✓ | ✗ | ✓ | 399 | **mature** |
| auth | 9 | ✓ | ✓ | ✗ | ✓ | 1 018 | **mature** |
| chat | 3 | ✗ | ✓ | ✗ | ✗ | 607 | **stub** |
| clients | 2 | ✓ | ✓ | ✗ | ✓ | 443 | **mature** |
| communications | 4 | ✓ | ✓ | ✗ | ✗ | 658 | **partial** |
| contractors | 6 | ✓ | ✓ | ✗ | ✗ | 885 | **partial** |
| designers | 4 | ✓ | ✓ | ✗ | ✗ | 953 | **partial** |
| documents | 2 | ✓ | ✓ | ✗ | ✓ (top-level) | 369 | **mature** |
| gallery | 2 | ✓ | ✓ | ✗ | ✓ (top-level) | 233 | **mature** |
| managers | 2 | ✓ | ✓ | ✗ | ✗ | 160 | **partial** |
| projects | 27 | ✓ | ✓ | ✗ | ✗ | 5 488 | **partial** |
| sellers | 2 | ✓ | ✓ | ✗ | ✗ | 210 | **partial** |
| uploads | 2 | ✗ | ✓ | ✗ | ✗ | 111 | **stub** |

**Totals:** 16 modules · ~10 970 prod LOC · 6 mature · 7 partial · 3 stub

---

## Stubs to flesh out

These three modules have structural gaps that warrant concrete action before the next feature wave.

### `admin-settings` (91 LOC, stub)
- `admin-settings.service.ts` is 20 LOC — a one-method upsert facade.
- The repository (`admin-settings.repository.ts`, 71 LOC) contains five functions but the service exposes only one orchestration point.
- **Gap:** No types file; service does not wrap validation or error mapping — callers reach into the repository indirectly through thin service.
- **Action:** Expand service to own the full upsert contract (validate key/value pair, emit event); extract `AdminSettingKey` and `AdminSettingValue` into `admin-settings.types.ts`.

### `chat` (607 LOC, stub — no repository)
- Three service files (`chat-users.service.ts` 423 LOC, `chat-communications.service.ts` 113 LOC, `chat-agents.service.ts` 71 LOC).
- No repository file. Services call other modules' repositories directly (auth, communications, agent-registry).
- This works today but violates DDD-lite isolation: the chat domain has no persistence boundary of its own, making it impossible to test in isolation.
- **Action:** Introduce `chat.repository.ts` to own any chat-specific DB queries (e.g. session tokens, presence state). Move cross-module reads through defined interfaces rather than direct repository calls.

### `uploads` (111 LOC, stub — no repository)
- `upload-validation.service.ts` (93 LOC) + `upload-storage.service.ts` (18 LOC).
- The storage service is a filesystem utility (mkdir, public URL resolution) — legitimately thin.
- No DB persistence: file metadata is written by the calling domain (clients, contractors, etc.).
- **Gap:** No domain type for `UploadedFile` contract; callers duplicate the shape.
- **Action:** Add `uploads.types.ts` exporting `UploadedFile`, `UploadValidationResult`, and `StoragePath` so callers share a single contract instead of inlining the shape.

---

## Partial — repo + service present, no tests

These seven modules have a functioning two-layer DDD structure but lack a test suite.

### `agent-registry` (153 LOC)
- `agent-registry.repository.ts` (54 LOC) + `agent-registry.service.ts` (83 LOC) + `agent-registry-audit.service.ts` (16 LOC).
- Audit service is a structured-logging helper; deliberately thin.
- **Gap:** No tests, no types file.

### `communications` (658 LOC)
- Bootstrap repository (96 LOC) + bootstrap service (308 LOC) + two relay services (127 LOC each).
- Relay services duplicate significant logic; relay pattern is an abstraction candidate.
- **Gap:** No tests; relay duplication increases risk of divergence.

### `contractors` (885 LOC)
- Three sub-domains (main CRUD, documents, work-items) each with a repository + service pair — well-structured.
- **Gap:** No tests despite 30+ exported repository functions. Risk of silent regressions.

### `designers` (953 LOC)
- Two sub-domains (main CRUD, documents); designers.service.ts at 511 LOC is the largest single service file.
- **Gap:** No tests; service is approaching the 500-line size warning threshold.

### `managers` (160 LOC) · `sellers` (210 LOC)
- Mirror-image modules. Both expose identical CRUD + project-listing patterns.
- **Gap:** Neither has tests; the pattern is repetitive enough that a single parametric test fixture could cover both.

### `projects` (5 488 LOC — 8 repos, 19 services)
- Largest module by far (45 % of all production module LOC).
- Contains eight distinct sub-domains: governance, communications, work-status, extra-services, partners, relations, pages, mutations.
- Each sub-domain has its own repository and service; the boundary is coherent but the module is a monolith.
- **Gap:** No tests on any of the 27 files. No types file. Governance state service alone is 491 LOC.

---

## Mature — repo + service + tests

Six modules have a full two-layer structure with test coverage.

| module | prod LOC | test LOC | notes |
|---|---|---|---|
| admin | 290 | 414 | Tests in top-level `__tests__/admin.repositories.test.ts` |
| ai | 399 | 169 | Tests in `ai/__tests__/ai.repositories.test.ts`; covers both ai and rag repos |
| auth | 1 018 | 273 | Tests in `auth/__tests__/auth.repository.test.ts`; covers 23 exported functions |
| clients | 443 | 252 | Tests in `clients/__tests__/clients.repository.test.ts` |
| documents | 369 | 374† | Tests shared in top-level `__tests__/documents-gallery.repositories.test.ts` |
| gallery | 233 | 374† | Same shared test file as documents |

† `documents` and `gallery` share one 374-LOC test file; each is credited with the full count since both modules are covered.

**Common remaining gap:** All six mature modules still lack a `*.types.ts` file. Type definitions are co-located with repository/service implementations, which makes cross-module reuse harder to discover.

---

## Recommended next wave

### 1. Extract a `*.types.ts` file for every module (high impact, low risk)
Every module co-locates its domain types inside service or repository files. A single `<module>.types.ts` per domain would:
- make the public contract explicit and grep-able,
- reduce the re-export surface when shared types move to `shared/types/`,
- be a prerequisite for the `shared/` migration of cross-module types (`ClientProfile`, `ProjectSummary`, etc.).

Suggested batch: start with the six mature modules (they already have stable APIs), then propagate to partial.

### 2. Add repository-layer tests for `contractors` and `designers`
These two modules have the most exported functions (30+ and 24+ respectively) with zero test coverage. Given their role in the admin UI, they are high-risk. A parametric test fixture can be shared since both follow the same repo/service split pattern.

### 3. Introduce `chat.repository.ts` to own chat-domain persistence
The chat module's services call foreign repositories directly. Introducing even a thin `chat.repository.ts` that proxies the cross-module reads establishes the isolation boundary, enabling mock-based testing of the chat service layer without spinning up a real DB.

### 4. Decompose `projects` into domain sub-modules
At 5 488 LOC across 27 files, the projects module is a bounded-context monolith. Governance, communications, work-status, and extra-services are each large enough to stand alone. A phased split (governance first, then work-status) would reduce cognitive load and enable targeted test suites per sub-domain.

### 5. Add tests for `managers` and `sellers` via a shared fixture
Both modules are structurally identical (7-function CRUD + project-listing). A single parametric test helper (`createModuleTestSuite({ repo, table, fixtures })`) could generate full coverage for both with minimal duplication, and serve as a template for future CRUD modules.
