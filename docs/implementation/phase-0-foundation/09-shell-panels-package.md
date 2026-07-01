# Phase 0 / Week 2 / Thursday: shell-panels package

Цель: `@daria/shell-panels` — контракты для panel-providers и EntityProvider. Pure TS types, no runtime React.

## Шаг 1: Structure

```
packages/shell-panels/
├── package.json
├── src/
│   ├── index.ts
│   ├── types.ts              — PanelContext, PanelProvider, PolicyDecision
│   ├── entity-provider.ts    — EntityProvider interface + registry
│   ├── card-type.ts          — CardTypeDefinition + defineCardType helper
│   └── panel-definitions.ts  — definePanels helper
```

## Шаг 2: types.ts

```ts
export type PanelSlot = 'top' | 'left' | 'right' | 'bottom'
export type ViewMode = 'instance' | 'type'
export type EntityMode = 'consumer' | 'provider' | 'creator' | 'marketplace' | string

export interface PanelContext<TData = unknown> {
  kind: string
  entityId: string
  view: ViewMode
  mode?: EntityMode
  access: 'readonly' | 'edit' | 'admin'
  policy?: PolicyDecision
  data?: TData
}

export interface PolicyDecision {
  effect: 'allow' | 'distill' | 'deny'
  reason?: string
  mask?: string[]
}

export interface PanelProvider<TProps = unknown> {
  slot: PanelSlot
  view: ViewMode
  component: () => Promise<{ default: any }>  // React.ComponentType
  prefetch?: (ctx: PanelContext) => Promise<TProps>
}
```

## Шаг 3: entity-provider.ts

```ts
export interface EntityProvider<Kind extends string = string> {
  kind: Kind
  resolveInstance(id: string): Promise<InstanceEntity>
  resolveType(typeId: string): Promise<TypeEntity>
  linkInstanceToType(instanceId: string): Promise<string | null>
}

export interface InstanceEntity {
  id: string
  kind: string
  view: 'instance'
  [key: string]: unknown
}

export interface TypeEntity {
  id: string
  kind: string
  view: 'type'
  [key: string]: unknown
}

// Registry для все EntityProvider'ов
const registry = new Map<string, EntityProvider>()

export function registerEntityProvider<K extends string>(
  provider: EntityProvider<K>,
): void {
  registry.set(provider.kind, provider)
}

export function getEntityProvider(kind: string): EntityProvider | undefined {
  return registry.get(kind)
}

export async function resolveInstance(kind: string, id: string): Promise<InstanceEntity> {
  const provider = getEntityProvider(kind)
  if (!provider) throw new Error(`No EntityProvider для kind: ${kind}`)
  return provider.resolveInstance(id)
}
```

## Шаг 4: card-type.ts

```ts
import type { PanelProvider, EntityMode } from './types'

export interface CardTypeDefinition {
  kind: string
  primitives: readonly string[]
  instance: {
    view: () => Promise<{ default: any }>
    top: () => Promise<{ default: any }>
    left: () => Promise<{ default: any }>
    right: () => Promise<{ default: any }>
    bottom: () => Promise<{ default: any }>
  }
  type: {
    view: () => Promise<{ default: any }>
    top: () => Promise<{ default: any }>
    left: () => Promise<{ default: any }>
    right: () => Promise<{ default: any }>
    bottom: () => Promise<{ default: any }>
  }
  modes?: readonly EntityMode[]
  link?: {
    instanceToType?: (instanceId: string) => Promise<string | null>
  }
}

/**
 * Helper для card-type authors. Validates structure at compile-time.
 */
export function defineCardType(def: CardTypeDefinition): CardTypeDefinition {
  // Runtime checks
  if (!def.kind) throw new Error('CardType must have kind')
  if (!def.instance) throw new Error(`${def.kind}: missing instance view (I3)`)
  if (!def.type) throw new Error(`${def.kind}: missing type view (I3)`)
  
  for (const slot of ['top', 'left', 'right', 'bottom'] as const) {
    if (!def.instance[slot]) {
      throw new Error(`${def.kind}: missing instance.${slot} (I19)`)
    }
    if (!def.type[slot]) {
      throw new Error(`${def.kind}: missing type.${slot} (I19)`)
    }
  }

  return def
}
```

## Шаг 5: panel-definitions.ts

```ts
import type { PanelSlot, ViewMode, PanelProvider } from './types'

type PanelsConfig<T = unknown> = {
  [slot in PanelSlot]: {
    instance: PanelProvider<T>
    type: PanelProvider<T>
  }
}

export function definePanels<T>(panels: PanelsConfig<T>): PanelsConfig<T> {
  return panels
}
```

## Шаг 6: index.ts

```ts
export * from './types'
export * from './entity-provider'
export * from './card-type'
export * from './panel-definitions'
```

## Шаг 7: package.json

```json
{
  "name": "@daria/shell-panels",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

## Шаг 8: Tests

```ts
// tests/card-type.test.ts
import { describe, it, expect } from 'vitest'
import { defineCardType } from '../src/card-type'

describe('defineCardType', () => {
  it('accepts valid card-type', () => {
    const def = defineCardType({
      kind: 'test',
      primitives: ['identity'],
      instance: {
        view: async () => ({ default: () => null }),
        top: async () => ({ default: () => null }),
        left: async () => ({ default: () => null }),
        right: async () => ({ default: () => null }),
        bottom: async () => ({ default: () => null }),
      },
      type: {
        view: async () => ({ default: () => null }),
        top: async () => ({ default: () => null }),
        left: async () => ({ default: () => null }),
        right: async () => ({ default: () => null }),
        bottom: async () => ({ default: () => null }),
      },
    })
    expect(def.kind).toBe('test')
  })

  it('rejects missing instance view (I3)', () => {
    expect(() =>
      defineCardType({
        kind: 'test',
        primitives: [],
        // @ts-expect-error
        type: { view: async () => null, top: null, left: null, right: null, bottom: null },
      })
    ).toThrow(/I3/)
  })
})
```

## Checklist

- [ ] Package builds, typecheck passes
- [ ] `defineCardType()` validates I3 / I19 / I22 at runtime
- [ ] EntityProvider registry working
- [ ] Tests pass

## Next

Friday: `@daria/ui-react` with first components.
