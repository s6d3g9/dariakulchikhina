import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderToString } from '@vue/test-utils'
import ts from 'typescript'
import * as Vue from 'vue'
import { parse, compileScript } from 'vue/compiler-sfc'
import fixtureData from '@daria/card-types/person-profile/schema.data.json'
import { personProfileSchema } from '@daria/card-types/person-profile/schemas'
import type { Entity } from '@daria/shell-panels/entity'
import { agentToEntity } from '../app/providers/refactor-provider'

const fixture = fixtureData.fixtures.find(item => item.id === 'fx-agent-1')

if (!fixture) {
  throw new Error('fx-agent-1 fixture is missing')
}

function fixtureEntity(): Entity {
  return agentToEntity(fixture)
}

function withNullFooterField(entity: Entity): Entity {
  return {
    ...entity,
    sections: entity.sections.map(section => section.key === 'footer'
      ? {
          ...section,
          fields: section.fields.map((field, index) => index === 0
            ? { ...field, value: null }
            : field),
        }
      : section),
  }
}

function toVueDestructure(importSpecifiers: string): string {
  return importSpecifiers
    .split(',')
    .map(specifier => specifier.trim().replace(/\s+as\s+/, ': '))
    .filter(Boolean)
    .join(', ')
}

function loadEntityCard() {
  const filename = fileURLToPath(new URL('../app/components/EntityCard.vue', import.meta.url))
  const source = readFileSync(filename, 'utf8')
  const { descriptor, errors } = parse(source, { filename })

  if (errors.length) {
    throw errors[0]
  }

  const compiled = compileScript(descriptor, {
    id: 'entity-card-test',
    inlineTemplate: true,
  })
  const transpiled = ts.transpileModule(compiled.content, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
      useDefineForClassFields: true,
    },
    fileName: filename,
  })
  const runnableCode = transpiled.outputText
    .replace(
      /import\s+\{([\s\S]*?)\}\s+from\s+['"]vue['"];?/g,
      (_match, importSpecifiers: string) => `const { ${toVueDestructure(importSpecifiers)} } = __Vue;`,
    )
    .replace(/export\s+default\s+/, 'return ')

  return new Function('__Vue', runnableCode)(Vue)
}

const EntityCard = loadEntityCard()

type RenderFunction = () => unknown
type VueRenderFunction = (ctx: Record<string, unknown>, cache: unknown[]) => unknown
type VNodeLike = {
  props?: Record<string, unknown>
  children?: unknown
}

function renderCard(entity: Entity, emit: (event: string) => void = () => {}): RenderFunction {
  const component = EntityCard as unknown as {
    setup: (
      props: { entity: Entity },
      context: { emit: (event: string) => void, expose: () => void, attrs: Record<string, unknown>, slots: Record<string, unknown> },
    ) => VueRenderFunction
  }

  const render = component.setup(
    { entity },
    {
      emit,
      expose: () => {},
      attrs: {},
      slots: {},
    },
  )

  return () => render({}, [])
}

function flattenVNodes(node: unknown): VNodeLike[] {
  if (Array.isArray(node)) {
    return node.flatMap(flattenVNodes)
  }

  if (!node || typeof node !== 'object') {
    return []
  }

  const current = node as VNodeLike
  return [current, ...flattenVNodes(current.children)]
}

function findAllByProp(node: unknown, prop: string, value: unknown): VNodeLike[] {
  return flattenVNodes(node).filter(item => item.props?.[prop] === value)
}

function findByFieldKey(node: unknown, key: string): VNodeLike {
  const field = flattenVNodes(node).find(item => item.props?.['data-field-key'] === key)
  if (!field) {
    throw new Error(`Field ${key} is missing`)
  }

  return field
}

function click(node: VNodeLike): void {
  const handler = node.props?.onClick
  if (typeof handler !== 'function') {
    throw new Error('VNode has no click handler')
  }

  handler({ type: 'click' })
}

describe('EntityCard', () => {
  it('renders exactly six sections in schema order', async () => {
    const html = await renderToString(EntityCard, {
      props: {
        entity: fixtureEntity(),
      },
    })
    const rendered = renderCard(fixtureEntity())()
    const sections = findAllByProp(rendered, 'data-testid', 'entity-section')

    expect(html).toContain('data-testid="entity-card"')
    expect(sections).toHaveLength(6)
    expect(sections.map(section => section.props?.['data-section-key'])).toEqual(
      personProfileSchema.sectionsSchema.instance.map(section => section.key),
    )
  })

  it('emits toggle-view from the inversion button', () => {
    const emitted: string[] = []
    const rendered = renderCard(fixtureEntity(), event => emitted.push(event))()
    const button = findAllByProp(rendered, 'data-testid', 'entity-card-toggle-view')[0]

    click(button)

    expect(emitted).toEqual(['toggle-view'])
  })

  it('opens only the clicked sections row and closes it on repeated click', () => {
    const render = renderCard(fixtureEntity())
    let rendered = render()
    const triggers = findAllByProp(rendered, 'data-testid', 'entity-card-accordion-trigger')

    click(triggers[1])
    rendered = render()

    expect(findAllByProp(rendered, 'data-testid', 'entity-card-accordion-panel')).toHaveLength(1)
    expect(String(findByFieldKey(rendered, 'skills').props?.class)).not.toContain('accordion-item-open')
    expect(String(findByFieldKey(rendered, 'pricing').props?.class)).toContain('accordion-item-open')
    expect(String(findByFieldKey(rendered, 'portfolio').props?.class)).not.toContain('accordion-item-open')

    click(findAllByProp(rendered, 'data-testid', 'entity-card-accordion-trigger')[1])
    rendered = render()

    expect(findAllByProp(rendered, 'data-testid', 'entity-card-accordion-panel')).toHaveLength(0)
  })

  it('renders null fields as an em dash', async () => {
    const html = await renderToString(EntityCard, {
      props: {
        entity: withNullFooterField(fixtureEntity()),
      },
    })

    expect(html).toContain('data-field-key="privacy_policy"')
    expect(html).toContain('—')
  })
})
