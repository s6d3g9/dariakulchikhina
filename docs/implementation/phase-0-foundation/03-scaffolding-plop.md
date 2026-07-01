# Phase 0 / Week 1 / Thursday: Scaffolding with plop.js

Цель: `pnpm create card-type/service/event/law-profile <name>` генерирует полные skeletons.

## Шаг 1: Install plop

```bash
pnpm add -D -w plop
```

## Шаг 2: plopfile.mjs в корне

```javascript
// plopfile.mjs
export default function (plop) {
  // Helpers
  plop.setHelper('pascalCase', (str) => 
    str.replace(/(^\w|-\w)/g, c => c.replace('-', '').toUpperCase())
  )
  plop.setHelper('camelCase', (str) =>
    str.replace(/-\w/g, c => c.replace('-', '').toUpperCase())
  )

  // === card-type ===
  plop.setGenerator('card-type', {
    description: 'Create new card-type в packages/card-types/',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Card-type kind (kebab-case, e.g. flight-ticket):',
        validate: (v) => /^[a-z][a-z0-9-]+$/.test(v) || 'lowercase kebab-case only'
      },
      {
        type: 'checkbox',
        name: 'primitives',
        message: 'Which primitives does this card-type use?',
        choices: [
          'identity', 'booking', 'inventory', 'payments', 'wallet',
          'authorship-registry', 'ownership-registry', 'subscription-engine',
          'escrow-service', 'financing-service', 'policy-engine',
          'credentials-vault', 'media-pipeline', 'messenger', 'feed',
          'reviews-ratings', 'location', 'notifications'
        ]
      },
      {
        type: 'confirm',
        name: 'hasTypeView',
        message: 'Has meaningful type-view? (press N if only instance-view makes sense initially)',
        default: true
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/package.json',
        templateFile: 'scripts/codegen/templates/card-type/package.json.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/README.md',
        templateFile: 'scripts/codegen/templates/card-type/README.md.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/index.ts',
        templateFile: 'scripts/codegen/templates/card-type/index.ts.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/schemas.ts',
        templateFile: 'scripts/codegen/templates/card-type/schemas.ts.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/timeline.ts',
        templateFile: 'scripts/codegen/templates/card-type/timeline.ts.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/entity-provider.ts',
        templateFile: 'scripts/codegen/templates/card-type/entity-provider.ts.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/instance.view.ts',
        templateFile: 'scripts/codegen/templates/card-type/view.ts.hbs',
        data: { view: 'instance' }
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/type.view.ts',
        templateFile: 'scripts/codegen/templates/card-type/view.ts.hbs',
        data: { view: 'type' }
      },
      // 8 panels
      ...['top', 'left', 'right', 'bottom'].flatMap(slot =>
        ['instance', 'type'].map(view => ({
          type: 'add',
          path: `packages/card-types/{{name}}/panels/${slot}.${view}.ts`,
          templateFile: 'scripts/codegen/templates/card-type/panel.ts.hbs',
          data: { slot, view }
        }))
      ),
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/tests/fractal.snapshot.test.ts',
        templateFile: 'scripts/codegen/templates/card-type/test.fractal.ts.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/tests/contract.test.ts',
        templateFile: 'scripts/codegen/templates/card-type/test.contract.ts.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/i18n/en.json',
        templateFile: 'scripts/codegen/templates/card-type/i18n.json.hbs'
      },
      {
        type: 'add',
        path: 'packages/card-types/{{name}}/i18n/ru.json',
        templateFile: 'scripts/codegen/templates/card-type/i18n.json.hbs'
      },
      // Update _registry.ts
      {
        type: 'modify',
        path: 'packages/card-types/_registry.ts',
        pattern: /(\/\/ === REGISTRY INSERT POINT ===)/,
        template: "import {{camelCase name}} from './{{name}}'\n$1"
      },
      {
        type: 'modify',
        path: 'packages/card-types/_registry.ts',
        pattern: /(\/\/ === REGISTRY MAP INSERT POINT ===)/,
        template: "  '{{name}}': {{camelCase name}},\n$1"
      }
    ]
  })

  // === service ===
  plop.setGenerator('service', {
    description: 'Create new service в services/',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Service name (kebab-case):',
        validate: (v) => /^[a-z][a-z0-9-]+$/.test(v)
      },
      {
        type: 'list',
        name: 'layer',
        message: 'Layer:',
        choices: [
          { name: 'Layer 2 — Platform', value: '2' },
          { name: 'Layer 3 — Domain Primitive', value: '3' },
          { name: 'Layer 6 — Governance', value: '6' }
        ]
      },
      {
        type: 'list',
        name: 'runtime',
        message: 'Runtime:',
        choices: ['ts', 'go', 'python', 'rust']
      }
    ],
    actions: function(data) {
      const actions = [
        {
          type: 'add',
          path: 'services/{{name}}/README.md',
          templateFile: 'scripts/codegen/templates/service/README.md.hbs'
        }
      ]
      if (data.runtime === 'ts') {
        actions.push(
          { type: 'add', path: 'services/{{name}}/package.json', templateFile: 'scripts/codegen/templates/service-ts/package.json.hbs' },
          { type: 'add', path: 'services/{{name}}/tsconfig.json', templateFile: 'scripts/codegen/templates/service-ts/tsconfig.json.hbs' },
          { type: 'add', path: 'services/{{name}}/src/index.ts', templateFile: 'scripts/codegen/templates/service-ts/index.ts.hbs' },
          { type: 'add', path: 'services/{{name}}/src/config.ts', templateFile: 'scripts/codegen/templates/service-ts/config.ts.hbs' },
          { type: 'add', path: 'services/{{name}}/src/db/schema.ts', templateFile: 'scripts/codegen/templates/service-ts/db.schema.ts.hbs' },
          { type: 'add', path: 'services/{{name}}/Dockerfile', templateFile: 'scripts/codegen/templates/service-ts/Dockerfile.hbs' },
          { type: 'add', path: 'services/{{name}}/.env.example', templateFile: 'scripts/codegen/templates/service-ts/env.example.hbs' }
        )
      }
      if (data.runtime === 'go') {
        actions.push(
          { type: 'add', path: 'services/{{name}}/go.mod', templateFile: 'scripts/codegen/templates/service-go/go.mod.hbs' },
          { type: 'add', path: 'services/{{name}}/main.go', templateFile: 'scripts/codegen/templates/service-go/main.go.hbs' },
          { type: 'add', path: 'services/{{name}}/Dockerfile', templateFile: 'scripts/codegen/templates/service-go/Dockerfile.hbs' }
        )
      }
      if (data.runtime === 'python') {
        actions.push(
          { type: 'add', path: 'services/{{name}}/pyproject.toml', templateFile: 'scripts/codegen/templates/service-python/pyproject.toml.hbs' },
          { type: 'add', path: 'services/{{name}}/src/main.py', templateFile: 'scripts/codegen/templates/service-python/main.py.hbs' },
          { type: 'add', path: 'services/{{name}}/Dockerfile', templateFile: 'scripts/codegen/templates/service-python/Dockerfile.hbs' }
        )
      }
      return actions
    }
  })

  // === event ===
  plop.setGenerator('event', {
    description: 'Create new CloudEvent schema в packages/events/domains/',
    prompts: [
      {
        type: 'input',
        name: 'domain',
        message: 'Domain (e.g. booking, identity, wallet):',
        validate: (v) => /^[a-z][a-z-]+$/.test(v)
      },
      {
        type: 'input',
        name: 'eventName',
        message: 'Event name (kebab-case, past-tense, e.g. slot-reserved):',
        validate: (v) => /^[a-z][a-z0-9-]+$/.test(v)
      },
      {
        type: 'input',
        name: 'version',
        message: 'Schema version (default v1):',
        default: 'v1'
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/events/domains/{{domain}}/{{eventName}}.{{version}}.schema.json',
        templateFile: 'scripts/codegen/templates/event/schema.json.hbs'
      }
    ]
  })

  // === law-profile ===
  plop.setGenerator('law-profile', {
    description: 'Create law-profile YAML for a region',
    prompts: [
      {
        type: 'input',
        name: 'region',
        message: 'Region code (ISO-3166 alpha-2, e.g. RU, US, UZ):',
        validate: (v) => /^[A-Z]{2}$/.test(v)
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'platform/law-profiles/{{region}}.yaml',
        templateFile: 'scripts/codegen/templates/law-profile/region.yaml.hbs'
      }
    ]
  })
}
```

## Шаг 3: Templates для card-type

### `scripts/codegen/templates/card-type/package.json.hbs`

```hbs
{
  "name": "@daria/card-type-{{name}}",
  "version": "0.0.1",
  "private": true,
  "main": "index.ts",
  "types": "index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test:fractal": "vitest run tests/fractal.snapshot.test.ts",
    "test:contract": "vitest run tests/contract.test.ts",
    "test": "pnpm test:fractal && pnpm test:contract"
  },
  "peerDependencies": {
    "@daria/contracts-domain": "workspace:*",
    "@daria/shell-panels": "workspace:*",
    "@daria/ui-react": "workspace:*",
    "zod": "^3.23.0"
  }
}
```

### `scripts/codegen/templates/card-type/index.ts.hbs`

```hbs
/**
 * packages/card-types/{{name}}/index.ts
 */

import type { CardTypeDefinition } from '../_registry'

const {{camelCase name}}CardType: CardTypeDefinition = {
  kind: '{{name}}',
  primitives: [
    {{#each primitives}}
    '{{this}}',
    {{/each}}
  ],
  instance: {
    view: () => import('./instance.view'),
    top: () => import('./panels/top.instance'),
    left: () => import('./panels/left.instance'),
    right: () => import('./panels/right.instance'),
    bottom: () => import('./panels/bottom.instance'),
  },
  type: {
    view: () => import('./type.view'),
    top: () => import('./panels/top.type'),
    left: () => import('./panels/left.type'),
    right: () => import('./panels/right.type'),
    bottom: () => import('./panels/bottom.type'),
  },
  modes: ['consumer'],
  link: {
    instanceToType: async (instanceId: string) => {
      // TODO: implement
      void instanceId
      return null
    },
  },
}

export default {{camelCase name}}CardType
```

### `scripts/codegen/templates/card-type/schemas.ts.hbs`

```hbs
/**
 * Zod schemas для {{name}} card-type.
 */

import { z } from 'zod'

// Instance — конкретный экземпляр
export const Z{{pascalCase name}}Instance = z.object({
  id: z.string(),
  kind: z.literal('{{name}}'),
  view: z.literal('instance'),
  
  // Identity
  title: z.string(),
  // TODO: add specific fields
  
  // System (см. инвариант I9)
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional(),
})
export type {{pascalCase name}}Instance = z.infer<typeof Z{{pascalCase name}}Instance>

{{#if hasTypeView}}
// Type — публичный класс / модель
export const Z{{pascalCase name}}Type = z.object({
  id: z.string(),
  kind: z.literal('{{name}}'),
  view: z.literal('type'),
  
  title: z.string(),
  description: z.string().optional(),
  // TODO: add specific fields
  
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type {{pascalCase name}}Type = z.infer<typeof Z{{pascalCase name}}Type>
{{/if}}
```

### `scripts/codegen/templates/card-type/timeline.ts.hbs`

```hbs
/**
 * Timeline definition for {{name}}.
 * See `10-timeline-engine.md`.
 */

import { defineTimeline } from '@daria/contracts-domain/timeline'

export default defineTimeline({
  kind: '{{name}}',
  steps: [
    { id: 'created',  kind: 'auto',     title: 'Created' },
    { id: 'active',   kind: 'auto',     title: 'Active' },
    { id: 'archived', kind: 'auto',     title: 'Archived' },
  ],
  completion: { on: 'archived.done' },
})
```

### `scripts/codegen/templates/card-type/entity-provider.ts.hbs`

```hbs
/**
 * EntityProvider for {{name}}.
 */

import type { EntityProvider } from '@daria/shell-panels/entity-provider'
import type { {{pascalCase name}}Instance{{#if hasTypeView}}, {{pascalCase name}}Type{{/if}} } from './schemas'

export const entityProvider: EntityProvider<'{{name}}'> = {
  kind: '{{name}}',
  
  async resolveInstance(id: string): Promise<{{pascalCase name}}Instance> {
    // TODO: call SDK to fetch instance data
    throw new Error('not implemented')
  },
  
  {{#if hasTypeView}}
  async resolveType(typeId: string): Promise<{{pascalCase name}}Type> {
    // TODO: call SDK to fetch type data
    throw new Error('not implemented')
  },
  
  async linkInstanceToType(instanceId: string): Promise<string | null> {
    // TODO: derive typeId from instance (e.g. VIN → model)
    return null
  },
  {{else}}
  async resolveType() { throw new Error('no type-view for this card-type') },
  async linkInstanceToType() { return null },
  {{/if}}
}
```

### `scripts/codegen/templates/card-type/view.ts.hbs`

```hbs
/**
 * {{view}}.view — center card view for {{name}} in {{view}} mode.
 */

import React from 'react'
import { CardView, CardHeader, CardTimeline, CardSummary, CardActions, CardSectionStack, CardFooter } from '@daria/ui-react'

export default function {{pascalCase name}}{{pascalCase view}}View(props: { entityId: string }) {
  return (
    <CardView>
      <CardHeader entityId={props.entityId} view="{{view}}" />
      <CardTimeline entityId={props.entityId} />
      <CardSummary entityId={props.entityId} view="{{view}}" />
      <CardActions entityId={props.entityId} view="{{view}}" />
      <CardSectionStack entityId={props.entityId} view="{{view}}" />
      <CardFooter entityId={props.entityId} view="{{view}}" />
    </CardView>
  )
}
```

### `scripts/codegen/templates/card-type/panel.ts.hbs`

```hbs
/**
 * {{slot}} panel, {{view}} view, for {{name}}.
 */

import React from 'react'
import { PanelHeader, PanelStream, PanelFooter } from '@daria/ui-react'

export default function {{pascalCase name}}{{pascalCase slot}}{{pascalCase view}}Panel(props: { entityId: string }) {
  return (
    <>
      <PanelHeader title="{{slot}} / {{view}}" />
      <PanelStream
        source={/* TODO: connect data source */ null}
        emptyState={<div>No content yet</div>}
      />
      <PanelFooter />
    </>
  )
}
```

### `scripts/codegen/templates/card-type/test.fractal.ts.hbs`

```hbs
/**
 * Fractal harness test — ensures this card-type conforms to I19 grammar.
 */

import { describe, it, expect } from 'vitest'
import { fractalHarness } from '@daria/testing-fractal-harness'
import cardType from '../index'

describe('{{name}} — fractal conformance', () => {
  it('passes structural snapshot match с эталоном', async () => {
    const report = await fractalHarness.run(cardType)
    expect(report.passed).toBe(true)
    expect(report.violations).toEqual([])
  })
})
```

### `scripts/codegen/templates/card-type/test.contract.ts.hbs`

```hbs
/**
 * Contract test — валидирует Zod schemas.
 */

import { describe, it, expect } from 'vitest'
import { Z{{pascalCase name}}Instance{{#if hasTypeView}}, Z{{pascalCase name}}Type{{/if}} } from '../schemas'

describe('{{name}} — contract', () => {
  it('instance schema accepts minimal valid object', () => {
    const result = Z{{pascalCase name}}Instance.safeParse({
      id: 'test_1',
      kind: '{{name}}',
      view: 'instance',
      title: 'Test',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    expect(result.success).toBe(true)
  })
})
```

### `scripts/codegen/templates/card-type/i18n.json.hbs`

```hbs
{
  "title": "{{name}}",
  "instance": {
    "title": "My {{name}}",
    "empty": "No {{name}} yet"
  },
  "type": {
    "title": "{{name}} catalog"
  },
  "actions": {
    "create": "Create {{name}}",
    "delete": "Delete"
  }
}
```

### `scripts/codegen/templates/card-type/README.md.hbs`

```hbs
# packages/card-types/{{name}}

{{pascalCase name}} card-type.

## Primitives

{{#each primitives}}
- `{{this}}`
{{/each}}

## Status

Generated by plop. Fill in schemas, entity-provider, panels.

## Checklist

- [ ] Fill `schemas.ts` with domain-specific fields
- [ ] Implement `entity-provider.ts` resolveInstance{{#if hasTypeView}} + resolveType{{/if}}
- [ ] Implement each panel (8 total)
- [ ] Implement timeline with real steps
- [ ] i18n strings для en + ru
- [ ] `tests/fractal.snapshot.test.ts` passes
- [ ] `tests/contract.test.ts` passes
- [ ] Register in `packages/card-types/_registry.ts` (auto by plop)
- [ ] Document in `docs/architecture-v6/06-card-types-matrix.md`
```

## Шаг 4: Usage

```bash
# Create new card-type
pnpm create card-type

# Interactive prompts → generates:
# packages/card-types/<name>/ со всеми файлами

# Create new service
pnpm create service

# Create new event
pnpm create event

# Create law-profile
pnpm create law-profile
```

## Шаг 5: Validate

```bash
pnpm create card-type
# Enter: test-card
# Select primitives: identity, feed
# Generates all files

# Check structure
ls packages/card-types/test-card/
# Should list all 15+ files

# Typecheck
pnpm -C packages/card-types/test-card typecheck
# Should pass (with TODO stubs)

# Clean up test
rm -rf packages/card-types/test-card
# Manually revert _registry.ts changes
```

## Checklist — Thursday done

- [ ] `pnpm create` работает interactively
- [ ] `card-type` generator создаёт 15+ files
- [ ] `service` generator работает для ts/go/python/rust
- [ ] `event` generator создаёт schema.json
- [ ] `law-profile` generator создаёт yaml
- [ ] Templates в `scripts/codegen/templates/` все created
- [ ] Test run — create & delete card-type работает

## Next

Friday: Testing infrastructure → `04-testing-harnesses.md`.
