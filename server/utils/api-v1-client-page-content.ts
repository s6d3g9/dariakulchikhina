import { findPage } from '~/shared/constants/navigation/pages'
import type {
  ApiV1ClientPageJson,
  ApiV1ClientProjectPage,
  ApiV1ClientProjectPageAnswers,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'

export const API_V1_CLIENT_PAGE_ANSWERS_PREFIX = '__answers__:'

type ProjectPageRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  pages: string[]
  updatedAt: Date | string | null
}

type PageContentRow = {
  content: Record<string, unknown> | null
  updatedAt: Date | string | null
} | null | undefined

type ClientPageAnswersInput = {
  selections?: Record<string, unknown>
  textAnswers?: Record<string, unknown>
  numberAnswers?: Record<string, unknown>
}

const PAGE_SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/

function safeString(value: unknown, maxLength = 10_000) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, maxLength)
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.toISOString()
  return safeString(value, 80)
}

function createProjectRef(project: ProjectPageRow): ApiV1ProjectRef {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt: safeDate(project.updatedAt),
  }
}

export function normalizeApiV1ClientPageSlug(rawPage: unknown) {
  const page = safeString(rawPage, 200)
  if (!page || page.startsWith(API_V1_CLIENT_PAGE_ANSWERS_PREFIX) || !PAGE_SLUG_PATTERN.test(page)) {
    return ''
  }

  return page
}

export function canReadApiV1ClientProjectPage(project: Pick<ProjectPageRow, 'pages'>, pageSlug: string) {
  const pageDef = findPage(pageSlug)
  if (pageDef?.clientVisible === false) return false
  if (pageDef && !pageDef.phase) return true
  if (pageSlug === 'communications') return true
  return project.pages.includes(pageSlug)
}

function sanitizeChoiceItem(rawItem: unknown): ApiV1ClientPageJson | null {
  if (typeof rawItem === 'string') return safeString(rawItem, 2_000)
  if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) return null

  const item = rawItem as Record<string, unknown>
  const sanitized: Record<string, ApiV1ClientPageJson> = {}
  const text = safeString(item.text, 2_000)
  const label = safeString(item.label, 2_000)

  if (text) sanitized.text = text
  if (label) sanitized.label = label

  return Object.keys(sanitized).length ? sanitized : null
}

function sanitizeGroups(rawGroups: unknown): ApiV1ClientPageJson[] {
  if (!Array.isArray(rawGroups)) return []

  return rawGroups.slice(0, 80).map((rawGroup) => {
    const group = rawGroup && typeof rawGroup === 'object' && !Array.isArray(rawGroup)
      ? rawGroup as Record<string, unknown>
      : {}
    const items = Array.isArray(group.items)
      ? group.items.slice(0, 200).map(sanitizeChoiceItem).filter((item): item is ApiV1ClientPageJson => item !== null)
      : []

    return {
      label: safeString(group.label, 500),
      items,
    }
  })
}

function sanitizeTabs(rawTabs: unknown): ApiV1ClientPageJson[] {
  if (!Array.isArray(rawTabs)) return []

  return rawTabs.slice(0, 40).map((rawTab, index) => {
    const tab = rawTab && typeof rawTab === 'object' && !Array.isArray(rawTab)
      ? rawTab as Record<string, unknown>
      : {}

    return {
      id: safeString(tab.id, 120) || `tab-${index + 1}`,
      title: safeString(tab.title, 500),
      heading: safeString(tab.heading, 500),
      image: safeString(tab.image, 2_000),
      groups: sanitizeGroups(tab.groups),
    }
  })
}

function sanitizeQuestions(rawQuestions: unknown): ApiV1ClientPageJson[] {
  if (!Array.isArray(rawQuestions)) return []

  return rawQuestions.slice(0, 250).map((rawQuestion) => {
    const question = rawQuestion && typeof rawQuestion === 'object' && !Array.isArray(rawQuestion)
      ? rawQuestion as Record<string, unknown>
      : {}
    const type = safeString(question.type, 80)
    const sanitized: Record<string, ApiV1ClientPageJson> = {
      label: safeString(question.label, 2_000),
    }

    if (type) sanitized.type = type

    return sanitized
  })
}

function sanitizeSections(rawSections: unknown): ApiV1ClientPageJson[] {
  if (!Array.isArray(rawSections)) return []

  return rawSections.slice(0, 80).map((rawSection, index) => {
    const section = rawSection && typeof rawSection === 'object' && !Array.isArray(rawSection)
      ? rawSection as Record<string, unknown>
      : {}

    return {
      id: safeString(section.id, 120) || `section-${index + 1}`,
      num: safeString(section.num, 40) || String(index + 1),
      title: safeString(section.title, 500),
      questions: sanitizeQuestions(section.questions),
    }
  })
}

export function sanitizeApiV1ClientPageContent(rawContent: unknown): Record<string, ApiV1ClientPageJson> {
  const content = rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
    ? rawContent as Record<string, unknown>
    : {}
  const sanitized: Record<string, ApiV1ClientPageJson> = {}
  const tabs = sanitizeTabs(content.tabs)
  const sections = sanitizeSections(content.sections)

  if (tabs.length) sanitized.tabs = tabs
  if (sections.length) sanitized.sections = sections

  return sanitized
}

export function sanitizeApiV1ClientPageAnswers(
  pageSlug: string,
  rawAnswers: ClientPageAnswersInput | null | undefined,
): ApiV1ClientProjectPageAnswers {
  const selections: Record<string, boolean | number> = {}
  const textAnswers: Record<string, string> = {}
  const numberAnswers: Record<string, number> = {}

  for (const [key, value] of Object.entries(rawAnswers?.selections || {}).slice(0, 500)) {
    const safeKey = safeString(key, 200)
    if (!safeKey) continue
    if (typeof value === 'boolean') selections[safeKey] = value
    if (typeof value === 'number' && Number.isFinite(value)) selections[safeKey] = value
  }

  for (const [key, value] of Object.entries(rawAnswers?.textAnswers || {}).slice(0, 500)) {
    const safeKey = safeString(key, 200)
    if (!safeKey) continue
    textAnswers[safeKey] = safeString(value, 10_000)
  }

  for (const [key, value] of Object.entries(rawAnswers?.numberAnswers || {}).slice(0, 500)) {
    const safeKey = safeString(key, 200)
    if (!safeKey) continue
    const numberValue = Math.max(0, Number(value) || 0)
    if (Number.isFinite(numberValue)) numberAnswers[safeKey] = numberValue
  }

  return {
    pageSlug,
    selections,
    textAnswers,
    numberAnswers,
  }
}

export function createApiV1ClientProjectPageDto(
  project: ProjectPageRow,
  pageSlug: string,
  contentRow: PageContentRow,
  answersRow: PageContentRow,
): ApiV1ClientProjectPage {
  const pageDef = findPage(pageSlug)
  const answersContent = (answersRow?.content || {}) as ClientPageAnswersInput

  return {
    project: createProjectRef(project),
    page: {
      slug: pageSlug,
      title: pageDef?.title || pageSlug,
      contentUpdatedAt: safeDate(contentRow?.updatedAt),
      answersUpdatedAt: safeDate(answersRow?.updatedAt),
    },
    content: sanitizeApiV1ClientPageContent(contentRow?.content),
    answers: sanitizeApiV1ClientPageAnswers(pageSlug, answersContent),
  }
}
