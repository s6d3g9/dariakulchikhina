# Phase 0 / Week 1 / Friday: Testing harnesses

Цель: Vitest + fractal-harness + contract-harness bootstrapped.

## Шаг 1: Vitest root config

```bash
pnpm add -D -w vitest @vitest/ui @vitest/coverage-v8 happy-dom
```

Create `vitest.workspace.ts` в корне:

```ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/*',
  'packages/card-types/*',
  'services/*',
  'apps/*',
])
```

## Шаг 2: Shared vitest config

Create `vitest.base.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**', 'dist/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    testTimeout: 10000,
  },
})
```

Каждый package extends это:

```ts
// packages/contracts-domain/vitest.config.ts
import baseConfig from '../../vitest.base.config'
export default baseConfig
```

## Шаг 3: Fractal-harness package

Create `packages/testing/fractal-harness/package.json`:

```json
{
  "name": "@daria/testing-fractal-harness",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "vitest": "^2.0.0"
  }
}
```

### `packages/testing/fractal-harness/src/index.ts`

```ts
import type { CardTypeDefinition } from '@daria/card-types/_registry'

export interface FractalReport {
  kind: string
  passed: boolean
  violations: Violation[]
  snapshot: StructuralSnapshot
}

export interface Violation {
  rule: string      // e.g. 'I19', 'I21'
  view: 'instance' | 'type'
  slot?: string
  message: string
}

export interface StructuralSnapshot {
  kind: string
  views: Record<'instance' | 'type', {
    view: ComponentTree
    panels: Record<'top' | 'left' | 'right' | 'bottom', ComponentTree>
  }>
  gestures: string[]
  toggles: string[]
}

export interface ComponentTree {
  component: string
  role?: string
  children?: ComponentTree[]
}

const CANONICAL_CARD_VIEW_SECTIONS = [
  'CardHeader',
  'CardTimeline',
  'CardSummary',
  'CardActions',
  'CardSectionStack',
  'CardFooter',
]

const CANONICAL_PANEL_VIEW_SECTIONS = [
  'PanelHeader',
  'PanelStream',
  'PanelFooter',
]

const CANONICAL_GESTURES = [
  'swipe-x', 'swipe-y', 'tap', 'long-press', 'pinch', 'inversion',
]

const CANONICAL_TOGGLES = [
  'InversionButton', 'ModeToggle',
]

export class FractalHarness {
  async run(cardType: CardTypeDefinition): Promise<FractalReport> {
    const violations: Violation[] = []
    const snapshot: StructuralSnapshot = {
      kind: cardType.kind,
      views: { instance: { view: null as any, panels: {} as any }, type: { view: null as any, panels: {} as any } },
      gestures: CANONICAL_GESTURES,
      toggles: CANONICAL_TOGGLES,
    }

    // I3: dual-view contract
    if (!cardType.instance) {
      violations.push({ rule: 'I3', view: 'instance', message: 'Missing instance view' })
    }
    if (!cardType.type) {
      violations.push({ rule: 'I3', view: 'type', message: 'Missing type view' })
    }

    // I21: timeline обязателен
    try {
      const timelineModule = await import(`@daria/card-type-${cardType.kind}/timeline`)
      if (!timelineModule.default || typeof timelineModule.default.steps === 'undefined') {
        violations.push({ rule: 'I21', view: 'instance', message: 'Timeline missing or malformed' })
      }
    } catch {
      violations.push({ rule: 'I21', view: 'instance', message: 'Timeline file missing' })
    }

    // I19/I20: analyze each view structure
    for (const view of ['instance', 'type'] as const) {
      const viewDef = cardType[view]
      if (!viewDef) continue

      // Center card
      const viewTree = await this.analyzeViewComponent(viewDef.view)
      snapshot.views[view].view = viewTree

      // Check 6 canonical sections
      const sections = this.extractSections(viewTree)
      for (const canonical of CANONICAL_CARD_VIEW_SECTIONS) {
        if (!sections.includes(canonical)) {
          violations.push({
            rule: 'I19',
            view,
            message: `CardView missing canonical section: ${canonical}`,
          })
        }
      }

      // 4 panels
      for (const slot of ['top', 'left', 'right', 'bottom'] as const) {
        const panelTree = await this.analyzeViewComponent(viewDef[slot])
        snapshot.views[view].panels[slot] = panelTree

        const panelSections = this.extractSections(panelTree)
        for (const canonical of CANONICAL_PANEL_VIEW_SECTIONS) {
          if (!panelSections.includes(canonical)) {
            violations.push({
              rule: 'I19',
              view,
              slot,
              message: `Panel missing canonical section: ${canonical}`,
            })
          }
        }
      }
    }

    return {
      kind: cardType.kind,
      passed: violations.length === 0,
      violations,
      snapshot,
    }
  }

  private async analyzeViewComponent(loader: () => Promise<any>): Promise<ComponentTree> {
    try {
      const module = await loader()
      const Component = module.default
      // Statically introspect — check imports or AST (simplified here)
      return this.introspect(Component)
    } catch {
      return { component: 'ERROR', children: [] }
    }
  }

  private introspect(Component: any): ComponentTree {
    // В real implementation — parse JSX/TSX via @babel/parser
    // MVP: parse component.toString() for component usage
    const str = Component?.toString?.() ?? ''
    const components = Array.from(str.matchAll(/<(\w+)/g)).map(m => m[1])
    return {
      component: Component?.name ?? 'Unknown',
      children: components.map(c => ({ component: c })),
    }
  }

  private extractSections(tree: ComponentTree): string[] {
    const result: string[] = []
    const visit = (node: ComponentTree) => {
      result.push(node.component)
      node.children?.forEach(visit)
    }
    visit(tree)
    return result
  }
}

export const fractalHarness = new FractalHarness()
```

### `packages/testing/fractal-harness/src/snapshot.ts`

```ts
import { expect } from 'vitest'
import type { FractalReport, StructuralSnapshot } from './index'

export function expectFractalPass(report: FractalReport) {
  if (!report.passed) {
    console.error('Fractal violations:')
    for (const v of report.violations) {
      console.error(`  - [${v.rule}] ${v.view}${v.slot ? `/${v.slot}` : ''}: ${v.message}`)
    }
  }
  expect(report.violations).toEqual([])
  expect(report.passed).toBe(true)
}

export function expectStructurallyEqual(
  actual: StructuralSnapshot,
  expected: StructuralSnapshot,
) {
  // Сравниваем component tree structure, ignoring data
  const normalize = (s: StructuralSnapshot) => {
    return {
      views: Object.fromEntries(
        Object.entries(s.views).map(([view, v]) => [
          view,
          {
            view: normalizeTree(v.view),
            panels: Object.fromEntries(
              Object.entries(v.panels).map(([slot, p]) => [slot, normalizeTree(p)]),
            ),
          },
        ]),
      ),
      gestures: [...s.gestures].sort(),
      toggles: [...s.toggles].sort(),
    }
  }
  expect(normalize(actual)).toEqual(normalize(expected))
}

function normalizeTree(tree: any): any {
  return {
    component: tree.component,
    role: tree.role,
    children: tree.children?.map(normalizeTree) ?? [],
  }
}
```

## Шаг 4: Contract-harness package

```json
{
  "name": "@daria/testing-contract-harness",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "zod": "^3.23.0",
    "vitest": "^2.0.0"
  }
}
```

### `packages/testing/contract-harness/src/index.ts`

```ts
import { z, ZodSchema } from 'zod'
import { expect } from 'vitest'

export class ContractHarness {
  /**
   * Validate that sample objects conform to Zod schema.
   */
  expectValid<T>(schema: ZodSchema<T>, samples: unknown[]) {
    for (const sample of samples) {
      const result = schema.safeParse(sample)
      if (!result.success) {
        console.error('Contract violation:', result.error.format())
      }
      expect(result.success).toBe(true)
    }
  }

  /**
   * Validate that invalid samples are rejected.
   */
  expectInvalid<T>(schema: ZodSchema<T>, samples: unknown[]) {
    for (const sample of samples) {
      const result = schema.safeParse(sample)
      expect(result.success).toBe(false)
    }
  }

  /**
   * Check that API response matches schema (integration tests).
   */
  async expectApiResponse<T>(
    fetcher: () => Promise<unknown>,
    schema: ZodSchema<T>,
  ): Promise<T> {
    const response = await fetcher()
    const parsed = schema.parse(response)
    return parsed
  }

  /**
   * OpenAPI schema drift check.
   */
  async checkOpenAPIDrift(
    zodExported: Record<string, ZodSchema>,
    openapiPath: string,
  ): Promise<{ drifted: string[] }> {
    const openapi = JSON.parse(await Bun.file?.(openapiPath).text() ?? '{}')
    const drifted: string[] = []

    for (const [name, zod] of Object.entries(zodExported)) {
      const openapiSchema = openapi.components?.schemas?.[name]
      if (!openapiSchema) {
        drifted.push(`${name}: missing in OpenAPI`)
        continue
      }
      // Compare shapes (simplified — real impl uses zod-to-json-schema)
      // ...
    }

    return { drifted }
  }
}

export const contractHarness = new ContractHarness()
```

## Шаг 5: Unit test examples

Create `packages/events/tests/cloudevents.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { contractHarness } from '@daria/testing-contract-harness'
import { z } from 'zod'

const ZCloudEvent = z.object({
  specversion: z.literal('1.0'),
  type: z.string().regex(/^app\.daria\.[a-z0-9-]+\.[a-z0-9-]+\.v[0-9]+$/),
  source: z.string().regex(/^\/services\/[a-z0-9-]+$/),
  id: z.string().uuid(),
  time: z.string().datetime(),
  datacontenttype: z.literal('application/json'),
  data: z.record(z.unknown()),
})

describe('CloudEvents base schema', () => {
  it('accepts valid event', () => {
    contractHarness.expectValid(ZCloudEvent, [
      {
        specversion: '1.0',
        type: 'app.daria.booking.slot-reserved.v1',
        source: '/services/booking',
        id: '018fabd0-6a87-7000-8000-000000000000',
        time: '2026-05-10T12:00:00Z',
        datacontenttype: 'application/json',
        data: { bookingId: 'abc' },
      },
    ])
  })

  it('rejects invalid type format', () => {
    contractHarness.expectInvalid(ZCloudEvent, [
      {
        specversion: '1.0',
        type: 'booking.slot-reserved',  // missing app.daria prefix
        source: '/services/booking',
        id: '018fabd0-6a87-7000-8000-000000000000',
        time: '2026-05-10T12:00:00Z',
        datacontenttype: 'application/json',
        data: {},
      },
    ])
  })

  it('rejects non-UUID id', () => {
    contractHarness.expectInvalid(ZCloudEvent, [
      {
        specversion: '1.0',
        type: 'app.daria.booking.slot-reserved.v1',
        source: '/services/booking',
        id: 'not-a-uuid',
        time: '2026-05-10T12:00:00Z',
        datacontenttype: 'application/json',
        data: {},
      },
    ])
  })
})
```

## Шаг 6: Root test scripts

Update root `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:fractal": "turbo run test:fractal",
    "test:contract": "turbo run test:contract"
  }
}
```

## Шаг 7: Validate

```bash
# Install
pnpm install

# Run tests (should be empty OK)
pnpm test

# Run fractal (no card-types yet, should be no-op)
pnpm test:fractal

# Run specific package tests
pnpm -F @daria/events test
```

Expected: tests pass (or "no tests found" — OK при старте).

## Шаг 8: Commit

```bash
git add .
git commit -m "test: bootstrap vitest + fractal-harness + contract-harness"
git push
```

## Checklist — Friday done (end of Week 1)

- [ ] `pnpm test` работает
- [ ] `vitest.workspace.ts` лоадит все packages
- [ ] `packages/testing/fractal-harness/` bootstrapped
- [ ] `packages/testing/contract-harness/` bootstrapped
- [ ] Example test проходит (CloudEvents schema)
- [ ] Coverage reporter настроен (70% threshold)
- [ ] CI runs tests automatically

## Next

Week 2 / Monday: `@daria/contracts-*` packages. См. `06-contracts-packages.md`.
