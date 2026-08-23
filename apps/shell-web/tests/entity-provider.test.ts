import { describe, expect, it } from 'vitest'
import fixtureData from '@daria/card-types/person-profile/schema.data.json'
import { personProfileSchema } from '@daria/card-types/person-profile/schemas'
import { agentToEntity } from '../app/providers/refactor-provider'

const fixture = fixtureData.fixtures.find(item => item.id === 'fx-agent-1')

if (!fixture) {
  throw new Error('fx-agent-1 fixture is missing')
}

describe('agentToEntity', () => {
  it('maps the person-profile fixture to the C4 Entity contract', () => {
    const entity = agentToEntity(fixture)

    expect(entity.id).toBe('fx-agent-1')
    expect(entity.kind).toBe('person-profile')
    expect(entity.view).toBe('instance')
    expect(entity.title).toBe('Композитор AI')
    expect(entity.sections).toHaveLength(6)
    expect(entity.sections.map(section => section.role)).toEqual(
      personProfileSchema.sectionsSchema.instance.map(section => section.role),
    )
    expect(entity.sections.map(section => section.key)).toEqual([
      'header',
      'timeline',
      'summary',
      'actions',
      'sections',
      'footer',
    ])
    expect(entity.sections[3]?.fields.map(field => field.value)).toEqual([
      'start_chat',
      'assign_task',
      'view_history',
    ])
    expect(entity.sections[4]?.fields).toEqual([
      { key: 'skills', label: 'Навыки', value: 3 },
      { key: 'pricing', label: 'Стоимость', value: 2 },
      { key: 'portfolio', label: 'Портфолио', value: 2 },
    ])
  })

  it('keeps absent schema fields as null', () => {
    const sparseFixture = {
      ...fixture,
      values: {
        ...fixture.values,
        rating: undefined,
        updated: undefined,
        support: undefined,
      },
    }

    const entity = agentToEntity(sparseFixture)
    const header = entity.sections.find(section => section.key === 'header')
    const timeline = entity.sections.find(section => section.key === 'timeline')
    const footer = entity.sections.find(section => section.key === 'footer')

    expect(header?.fields.find(field => field.key === 'rating')?.value).toBeNull()
    expect(timeline?.fields.find(field => field.key === 'updated')?.value).toBeNull()
    expect(footer?.fields.find(field => field.key === 'support')?.value).toBeNull()
  })
})
