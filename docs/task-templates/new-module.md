# Task template: add a new domain module

Use this template when creating a new DDD-lite backend module under `server/modules/<name>/`.

## 1. Generate the skeleton

```bash
pnpm gen:module <name>
```

- `<name>` must be kebab-case: `^[a-z][a-z0-9-]{1,30}$`
- The generator refuses if `server/modules/<name>/` already exists.

Files created:

| File | Purpose |
|------|---------|
| `server/modules/<name>/index.ts` | Barrel — re-exports types and service |
| `server/modules/<name>/<name>.types.ts` | Zod schemas + inferred TypeScript DTOs |
| `server/modules/<name>/<name>.repository.ts` | Drizzle query functions (all throw until implemented) |
| `server/modules/<name>/<name>.service.ts` | Business logic layer importing from repository |
| `server/modules/<name>/__tests__/<name>.service.test.ts` | Smoke tests (pass once service is wired) |

## 2. Add the DB table

1. Add a table definition in `server/db/schema/` (follow existing files as a model).
2. Run `pnpm db:generate` and review the generated SQL in `drizzle/`.
3. Run `pnpm db:migrate` (dev) or schedule via deploy preflight (prod).

## 3. Fill in types

Open `<name>.types.ts` and replace the placeholder `z.object({})` with real fields.
Keep schemas consistent with the DB columns added in step 2.

Example:
```ts
export const CreateClientNoteSchema = z.object({
  clientId: z.number().int().positive(),
  body: z.string().min(1).max(4000),
})
```

## 4. Implement the repository

Open `<name>.repository.ts`. Uncomment the `useDb` / schema imports and implement each function using Drizzle queries.

Rules:
- Never import `drizzle-orm` in `service.ts` — all DB access goes through the repository.
- Prefer soft-deletes (`deleted_at`) over hard-deletes.
- Each mutable row should have a `version` column for optimistic concurrency (OCC).

## 5. Implement the service

Open `<name>.service.ts`. Add business rules, validate inputs with the Zod schemas from `<name>.types.ts`, and delegate persistence to the repository.

Use `createError` from `h3` for domain errors:
```ts
import { createError } from 'h3'
throw createError({ statusCode: 404, message: 'ClientNote not found' })
```

## 6. Add a thin API handler

Create `server/api/<name>/index.get.ts` (and other verbs as needed).
Handlers must be thin — import only from the module service, no Drizzle or schema imports:

```ts
// server/api/client-notes/index.get.ts
import { listClientNotes } from '~/server/modules/client-notes'

export default defineEventHandler(async () => {
  return listClientNotes()
})
```

## 7. Replace smoke tests with real tests

Open `__tests__/<name>.service.test.ts`. Replace the "throws until implemented" stubs with actual integration tests once the repository layer is working.

## 8. Verify

```bash
pnpm exec vue-tsc --noEmit   # TypeScript clean
pnpm lint:errors              # Zero architectural violations
pnpm docs:v5:verify           # Doc consistency
```

## Checklist

- [ ] `pnpm gen:module <name>` ran successfully
- [ ] DB table added and migration generated/applied
- [ ] `<name>.types.ts` — real Zod schemas, no placeholder fields
- [ ] `<name>.repository.ts` — all functions implemented
- [ ] `<name>.service.ts` — business rules complete, uses `createError` for errors
- [ ] `server/api/<name>/` — thin handler(s), no direct Drizzle imports
- [ ] `__tests__/<name>.service.test.ts` — real tests replacing smoke stubs
- [ ] `pnpm lint:errors` passes (0 errors)
- [ ] `pnpm exec vue-tsc --noEmit` passes
