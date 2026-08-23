import type {
  Entity,
  EntityFieldValue,
  EntitySection,
  PanelDescriptor,
} from '@daria/shell-panels/entity'
import {
  personProfileSchema,
  type CardTypeSchema,
  type FieldDef,
  type PanelSlot,
  type SectionDef,
  type ViewMode,
} from '@daria/card-types/person-profile/schemas'

export interface EntityProvider {
  getEntity(kind: string, id: string, view: ViewMode): Promise<Entity>
}

export interface RefactorProviderOptions {
  apiBase?: string
  fetcher?: typeof fetch
  readToken?: () => string | null
}

type UnknownRecord = Record<string, unknown>

const PERSON_PROFILE_KIND = 'person-profile'
const DEFAULT_API_BASE = '/refactor/api'
const AUTH_STORAGE_KEYS = ['daria-messenger-token', 'daria-messenger-token-session'] as const

export class AuthRequiredError extends Error {
  constructor() {
    super('Auth token is required')
    this.name = 'AuthRequiredError'
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function objectValues(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord)
  }

  if (isRecord(value)) {
    return Object.values(value).filter(isRecord)
  }

  return []
}

function compactStrings(values: Array<unknown>): string[] {
  return values
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map(String)
    .filter(Boolean)
}

function readNested(source: unknown, path: string): unknown {
  if (!isRecord(source)) {
    return undefined
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined
    }

    return current[key]
  }, source)
}

function readFirst(source: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = readNested(source, path)
    if (value !== undefined) {
      return value
    }
  }

  return undefined
}

function readString(source: unknown, paths: string[]): string | undefined {
  const value = readFirst(source, paths)
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return undefined
}

function toFieldValue(value: unknown): string | number | null {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  return null
}

function toCounterValue(value: unknown): string | number | null {
  if (Array.isArray(value)) {
    return value.length
  }

  if (isRecord(value)) {
    return Object.keys(value).length
  }

  return toFieldValue(value)
}

function normalizeAgent(agent: unknown): UnknownRecord {
  if (!isRecord(agent)) {
    return {}
  }

  if (isRecord(agent.values)) {
    return {
      ...agent.values,
      ...agent,
    }
  }

  return agent
}

function readAgentField(agent: UnknownRecord, section: SectionDef, field: FieldDef): string | number | null {
  if (section.key === 'actions') {
    return field.key
  }

  if (section.key === 'sections') {
    return toCounterValue(readFirst(agent, agentFieldPaths(field.key)))
  }

  return toFieldValue(readFirst(agent, agentFieldPaths(field.key)))
}

function agentFieldPaths(key: string): string[] {
  const paths: Record<string, string[]> = {
    avatar: ['avatar', 'avatarUrl', 'imageUrl', 'photoUrl'],
    created: ['created', 'createdAt', 'created_at'],
    last_active: ['last_active', 'lastActive', 'lastActiveAt', 'last_active_at'],
    updated: ['updated', 'updatedAt', 'updated_at'],
    tasks_done: ['tasks_done', 'tasksDone', 'taskCount', 'stats.tasksDone', 'counters.tasks_done'],
    conversations: ['conversations', 'conversationCount', 'stats.conversations', 'counters.conversations'],
    tokens_used: ['tokens_used', 'tokensUsed', 'stats.tokensUsed', 'counters.tokens_used'],
  }

  return paths[key] ?? [key]
}

function buildSections(
  sections: readonly SectionDef[],
  mapField: (section: SectionDef, field: FieldDef) => string | number | null,
): EntitySection[] {
  return sections.map(section => ({
    key: section.key,
    title: section.title_ru,
    role: section.role,
    fields: section.fields.map<EntityFieldValue>(field => ({
      key: field.key,
      label: field.label_ru,
      value: mapField(section, field),
    })),
  }))
}

function panelDescriptor(schema: CardTypeSchema, slot: PanelSlot, view: ViewMode): PanelDescriptor {
  const panel = schema.panels[slot][view]

  return {
    title: panel.title_ru,
    contentKind: panel.content_kind,
    items: [],
  }
}

function buildPanels(schema: CardTypeSchema, view: ViewMode): Entity['panels'] {
  return {
    top: panelDescriptor(schema, 'top', view),
    left: panelDescriptor(schema, 'left', view),
    right: panelDescriptor(schema, 'right', view),
    bottom: panelDescriptor(schema, 'bottom', view),
  }
}

function readBrowserToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  for (const key of AUTH_STORAGE_KEYS) {
    const localToken = window.localStorage.getItem(key)
    if (localToken) {
      return localToken
    }

    const sessionToken = window.sessionStorage.getItem(key)
    if (sessionToken) {
      return sessionToken
    }
  }

  return null
}

function assertToken(readToken: () => string | null): string {
  const token = readToken()
  if (!token) {
    throw new AuthRequiredError()
  }

  return token
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

async function requestJson<T>(url: string, token: string, fetcher: typeof fetch): Promise<T> {
  const response = await fetcher(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  return await response.json() as T
}

export function agentToEntity(agentInput: unknown, schema: CardTypeSchema = personProfileSchema): Entity {
  const agent = normalizeAgent(agentInput)
  const id = readString(agent, ['id']) ?? 'unknown'
  const name = readString(agent, ['name']) ?? id
  const subtitleParts = compactStrings([
    readFirst(agent, ['role']),
    readFirst(agent, ['projectName', 'project.name']),
  ])
  const linkedId = readString(agent, ['linkedId', 'typeId', 'classId', 'personTypeId'])

  return {
    id,
    kind: PERSON_PROFILE_KIND,
    view: 'instance',
    title: name,
    ...(subtitleParts.length ? { subtitle: subtitleParts.join(' / ') } : {}),
    ...(readString(agent, ['classId']) ? { classId: readString(agent, ['classId']) } : {}),
    sections: buildSections(
      schema.sectionsSchema.instance,
      (section, field) => readAgentField(agent, section, field),
    ),
    panels: buildPanels(schema, 'instance'),
    modes: [...schema.modes.instance],
    ...(linkedId ? { linkedId } : {}),
  }
}

function normalizeAxes(value: unknown): Record<string, string[]> | undefined {
  if (!value) {
    return undefined
  }

  const axes: Record<string, string[]> = {}

  if (Array.isArray(value)) {
    for (const axis of value) {
      if (!isRecord(axis)) {
        continue
      }

      const key = readString(axis, ['key', 'id', 'name'])
      if (!key) {
        continue
      }

      axes[key] = compactStrings([
        ...objectValues(axis.values).map(item => readFirst(item, ['key', 'id', 'name', 'label', 'title'])),
        ...compactStrings([axis.value]),
      ])
    }
  } else if (isRecord(value)) {
    for (const [key, axisValue] of Object.entries(value)) {
      if (Array.isArray(axisValue)) {
        axes[key] = compactStrings(axisValue.map(item => isRecord(item) ? readFirst(item, ['key', 'id', 'name', 'label', 'title']) : item))
      } else if (isRecord(axisValue)) {
        axes[key] = compactStrings([
          ...objectValues(axisValue.values).map(item => readFirst(item, ['key', 'id', 'name', 'label', 'title'])),
          ...Object.values(axisValue).filter(value => typeof value === 'string' || typeof value === 'number'),
        ])
      } else {
        axes[key] = compactStrings([axisValue])
      }
    }
  }

  return Object.keys(axes).length ? axes : undefined
}

function collectWorldModelRecords(worldModel: unknown): UnknownRecord[] {
  if (!isRecord(worldModel)) {
    return []
  }

  return [
    ...objectValues(worldModel.classes),
    ...objectValues(worldModel.entities),
    ...objectValues(worldModel.items),
    ...objectValues(worldModel.records),
    ...objectValues(worldModel.nodes),
  ]
}

function isPersonClass(record: UnknownRecord): boolean {
  const candidates = compactStrings([
    record.key,
    record.id,
    record.classId,
    record.familyKey,
    record.type,
    record.kind,
    readFirst(record, ['labels.default']),
    readFirst(record, ['labels.en']),
    readFirst(record, ['labels.ru']),
    record.title,
    record.name,
  ]).map(value => value.toLowerCase())

  return candidates.some(value => value === 'person' || value.includes('person'))
}

function findPersonClass(worldModel: unknown): UnknownRecord {
  const direct = readFirst(worldModel, ['person'])
  if (isRecord(direct)) {
    return direct
  }

  return collectWorldModelRecords(worldModel).find(isPersonClass) ?? {}
}

function readTypeField(personClass: UnknownRecord, axes: Record<string, string[]> | undefined, field: FieldDef): string | number | null {
  const direct = readFirst(personClass, [field.key, `values.${field.key}`, `meta.${field.key}`])
  const value = toFieldValue(direct)
  if (value !== null) {
    return value
  }

  const axisValues = axes?.[field.key]
  if (axisValues?.length) {
    return axisValues.join(', ')
  }

  return null
}

export function worldModelToEntity(
  worldModel: unknown,
  id: string,
  schema: CardTypeSchema = personProfileSchema,
): Entity {
  const personClass = findPersonClass(worldModel)
  const axes = normalizeAxes(readFirst(personClass, ['axes', 'facets']) ?? readFirst(worldModel, ['axes', 'facets']))
  const classId = readString(personClass, ['classId', 'id', 'key'])
  const title = readString(personClass, ['title', 'name', 'labels.ru', 'labels.default', 'labels.en']) ?? 'person'
  const subtitle = readString(personClass, ['description', 'labels.description', 'meta.description'])

  return {
    id,
    kind: PERSON_PROFILE_KIND,
    view: 'type',
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(classId ? { classId } : {}),
    ...(axes ? { axes } : {}),
    sections: buildSections(
      schema.sectionsSchema.type,
      (section, field) => section.key === 'actions' ? field.key : readTypeField(personClass, axes, field),
    ),
    panels: buildPanels(schema, 'type'),
    modes: [...schema.modes.type],
  }
}

export function createRefactorProvider(options: RefactorProviderOptions = {}): EntityProvider {
  const apiBase = options.apiBase ?? DEFAULT_API_BASE
  const fetcher = options.fetcher ?? globalThis.fetch
  const readToken = options.readToken ?? readBrowserToken

  return {
    async getEntity(kind: string, id: string, view: ViewMode) {
      if (kind !== PERSON_PROFILE_KIND) {
        throw new Error(`Unsupported entity kind: ${kind}`)
      }

      const token = assertToken(readToken)

      if (view === 'instance') {
        const agent = await requestJson<unknown>(joinUrl(apiBase, `/agents/${encodeURIComponent(id)}`), token, fetcher)
        return agentToEntity(agent)
      }

      const worldModel = await requestJson<unknown>(
        joinUrl(apiBase, `/projects/${encodeURIComponent(id)}/world-model`),
        token,
        fetcher,
      )
      return worldModelToEntity(worldModel, id)
    },
  }
}

export const refactorProvider = createRefactorProvider()
