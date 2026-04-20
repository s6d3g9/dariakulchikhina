#!/usr/bin/env node
// Generator: creates a new DDD-lite server module skeleton under server/modules/<name>/.
// Usage: pnpm gen:module <name>

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const NAME_RE = /^[a-z][a-z0-9-]{1,30}$/

const name = process.argv[2]

if (!name) {
  console.error('Usage: pnpm gen:module <name>')
  console.error('  name: kebab-case, e.g. client-notes')
  process.exit(1)
}

if (!NAME_RE.test(name)) {
  console.error(`Error: module name "${name}" is invalid.`)
  console.error('  Must match ^[a-z][a-z0-9-]{1,30}$ (kebab-case, 2-31 chars)')
  process.exit(1)
}

const moduleDir = resolve(REPO_ROOT, 'server', 'modules', name)

if (existsSync(moduleDir)) {
  console.error(`Error: server/modules/${name}/ already exists. Aborting.`)
  process.exit(1)
}

// Convert kebab-case to PascalCase for type names, e.g. client-notes → ClientNotes
const pascal = name
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('')

// Convert kebab-case to camelCase for function names, e.g. client-notes → clientNotes
const camel = name
  .split('-')
  .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
  .join('')

const testsDir = resolve(moduleDir, '__tests__')
mkdirSync(testsDir, { recursive: true })

// --- index.ts ---
writeFileSync(
  resolve(moduleDir, 'index.ts'),
  `export * from './${name}.types'
export * from './${name}.service'
`,
)

// --- <name>.types.ts ---
writeFileSync(
  resolve(moduleDir, `${name}.types.ts`),
  `import { z } from 'zod'

// TODO: Replace placeholders with real fields for the ${pascal} domain.

export const Create${pascal}Schema = z.object({
  // e.g. name: z.string().min(1),
})
export type Create${pascal}Input = z.infer<typeof Create${pascal}Schema>

export const Update${pascal}Schema = Create${pascal}Schema.partial()
export type Update${pascal}Input = z.infer<typeof Update${pascal}Schema>

export const ${pascal}Schema = Create${pascal}Schema.extend({
  id: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type ${pascal}DTO = z.infer<typeof ${pascal}Schema>
`,
)

// --- <name>.repository.ts ---
writeFileSync(
  resolve(moduleDir, `${name}.repository.ts`),
  `// TODO: Import useDb and schema tables once the DB table for ${pascal} is created.
// import { useDb } from '~/server/db/index'
// import { ${camel}s } from '~/server/db/schema'

import type { Create${pascal}Input, Update${pascal}Input, ${pascal}DTO } from './${name}.types'

export async function find${pascal}ById(_id: number): Promise<${pascal}DTO | null> {
  // TODO: implement
  throw new Error('Not implemented: find${pascal}ById')
}

export async function list${pascal}s(): Promise<${pascal}DTO[]> {
  // TODO: implement
  throw new Error('Not implemented: list${pascal}s')
}

export async function create${pascal}(_input: Create${pascal}Input): Promise<${pascal}DTO> {
  // TODO: implement
  throw new Error('Not implemented: create${pascal}')
}

export async function update${pascal}(_id: number, _input: Update${pascal}Input): Promise<${pascal}DTO> {
  // TODO: implement
  throw new Error('Not implemented: update${pascal}')
}

export async function delete${pascal}(_id: number): Promise<void> {
  // TODO: implement (prefer soft-delete: set deleted_at)
  throw new Error('Not implemented: delete${pascal}')
}
`,
)

// --- <name>.service.ts ---
writeFileSync(
  resolve(moduleDir, `${name}.service.ts`),
  `import { createError } from 'h3'
import * as repo from './${name}.repository'
import type { Create${pascal}Input, Update${pascal}Input } from './${name}.types'

export async function get${pascal}(id: number) {
  const item = await repo.find${pascal}ById(id)
  if (!item) throw createError({ statusCode: 404, message: '${pascal} not found' })
  return item
}

export async function list${pascal}s() {
  return repo.list${pascal}s()
}

export async function create${pascal}(input: Create${pascal}Input) {
  // TODO: validate business rules before persisting
  return repo.create${pascal}(input)
}

export async function update${pascal}(id: number, input: Update${pascal}Input) {
  await get${pascal}(id) // ensures 404 on missing
  return repo.update${pascal}(id, input)
}

export async function delete${pascal}(id: number) {
  await get${pascal}(id) // ensures 404 on missing
  return repo.delete${pascal}(id)
}
`,
)

// --- __tests__/<name>.service.test.ts ---
writeFileSync(
  resolve(testsDir, `${name}.service.test.ts`),
  `import { describe, it, expect } from 'vitest'
import * as service from '../${name}.service'

// Smoke tests: repository stubs throw "Not implemented", so service must propagate.
// Replace these with real integration tests once the repository is implemented.

describe('${name} service — smoke', () => {
  it('get${pascal} throws for any id until implemented', async () => {
    await expect(service.get${pascal}(1)).rejects.toThrow()
  })

  it('list${pascal}s throws until implemented', async () => {
    await expect(service.list${pascal}s()).rejects.toThrow()
  })

  it('create${pascal} throws until implemented', async () => {
    await expect(service.create${pascal}({})).rejects.toThrow()
  })
})
`,
)

console.log(`
✓ Module skeleton created: server/modules/${name}/

Files generated:
  server/modules/${name}/index.ts
  server/modules/${name}/${name}.types.ts
  server/modules/${name}/${name}.repository.ts
  server/modules/${name}/${name}.service.ts
  server/modules/${name}/__tests__/${name}.service.test.ts

Next steps:
  1. Add a DB table in server/db/schema/ for ${pascal}, run pnpm db:generate.
  2. Fill in ${name}.types.ts — define real Zod schemas and DTOs.
  3. Implement ${name}.repository.ts — write Drizzle queries.
  4. Implement ${name}.service.ts — add business rules and error handling.
  5. Create a thin handler in server/api/${name}/ that imports from the service.
  6. Replace smoke tests in __tests__/${name}.service.test.ts with real tests.
  7. Run pnpm lint:errors to verify no architectural violations.
`)
