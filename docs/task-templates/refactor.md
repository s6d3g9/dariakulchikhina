---
kind: backend-module
description: Extract / split / move / rename a cohesive code unit without changing behavior
---

# refactor(scope): what is being split / extracted / renamed

## Context

Current state: describe the file(s) and their size, structure, and role. Why the refactor: what invariant it violates, what maintainability debt it creates. Link to the architecture-v5 matrix row that motivated this (e.g., `10-frontend-refactor-map.md` row N, `11-backend-shared-refactor-map.md` row M).

Example: "server/modules/projects/projects.ts is 520 lines and mixes entity logic with HTTP concerns. Violates DDD-lite rule: API handlers must be thin. See `11-backend-shared-refactor-map.md` § ProjectModule."

## Target

Target file paths and line budgets (shrinking is the metric).

```
server/modules/projects/projects.ts     (520 lines → 180 lines)
├── server/modules/projects/entity.ts   (new, 220 lines)
├── server/modules/projects/service.ts  (new, 140 lines)
└── server/api/projects.get.ts          (updated, 80 lines)
```

## Steps

Numbered surgical edits. Preserve behavior; no logic change.

1. Create `server/modules/projects/entity.ts` and move `Project`, `ProjectForm` types and schema `toEntity`, `fromEntity` (60 lines).
2. Create `server/modules/projects/service.ts` and move `getProject`, `listProjects`, `createProject`, `updateProject` (120 lines).
3. Move `projectPermissions` helper and auth logic to `service.ts`.
4. Update `server/api/projects.get.ts` to call new service (one-liner per route).
5. Remove old code from `projects.ts` and ensure re-exports are in place.
6. Run `pnpm exec vue-tsc --noEmit` and `pnpm lint:errors`; verify no import breakage.

## Acceptance

- [ ] Typecheck passes: `pnpm exec vue-tsc --noEmit` (zero diff in changed files).
- [ ] No new linting errors: `pnpm lint:errors` reports zero new violations.
- [ ] One commit per move (if bundling is unavoidable, one commit max).
- [ ] Final commit message: `refactor(<scope>): <subject>` (e.g., `refactor(projects-module): extract entity and service logic`).
- [ ] All routes still pass their current behavior (smoke test manually or via existing test suite).

## Red lines

**Must NOT change:**
- Public API signatures of exported functions.
- Event names or shapes published to Redis Pub/Sub.
- HTTP response shapes for any route.
- Database schema or migration state.
- Persisted shapes (cookies, stored config, etc.).

If a refactor would change any of these, it's no longer a refactor—escalate to a feature task.

## Verification hints

After completing the refactor, run these to confirm no dangling imports:

```bash
# Check for imports of old internal helpers from outside the module
rg "from.*projects/projects" --glob "*.ts" --glob "!node_modules"

# Check for direct imports that should now route through the service
rg "from.*projects.ts\b" server/ --glob "*.ts"

# Verify the entity is exported from the module's public API
rg "export.*from.*entity" server/modules/projects/

# Ensure old file is deleted (if applicable)
ls server/modules/projects/projects.ts  # Should fail with "No such file"
```

---

**Template metadata:** Canonical refactor task template for surgical extract / split / move / rename operations. Ref: `docs/architecture-v5/14-refactor-roadmap.md`.
