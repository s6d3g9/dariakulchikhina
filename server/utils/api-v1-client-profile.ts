import { CLIENT_PROFILE_EDITABLE_KEYS, CLIENT_PROFILE_READABLE_KEYS } from '~/shared/constants/profile/profile-fields'
import type { ApiV1ClientProfileFile, ApiV1ClientProfileValue, ApiV1ClientProjectProfile, ApiV1ProjectRef } from '~/shared/types/api-v1'

type ProjectProfileRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  profile: Record<string, unknown>
  updatedAt: Date | string | null
}

const FILE_PROFILE_KEYS = new Set(['album_files', 'survey_files'])
const EDITABLE_PROFILE_KEYS = new Set<string>(CLIENT_PROFILE_EDITABLE_KEYS)

function safeString(value: unknown, maxLength = 10_000) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, maxLength)
  if (typeof value === 'boolean') return String(value)
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function createProjectRef(project: ProjectProfileRow): ApiV1ProjectRef {
  const updatedAt = project.updatedAt instanceof Date
    ? project.updatedAt.toISOString()
    : safeString(project.updatedAt, 80)

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt,
  }
}

function sanitizeProfileFile(rawFile: unknown): ApiV1ClientProfileFile | null {
  if (!rawFile || typeof rawFile !== 'object') return null
  const file = rawFile as Record<string, unknown>
  const url = safeString(file.url, 2000)
  const filename = safeString(file.filename || file.originalName || file.name, 500)
  if (!url && !filename) return null

  return {
    url,
    filename,
    label: safeString(file.label || file.title || filename, 500),
    category: safeString(file.category || 'other', 120) || 'other',
    mimeType: safeString(file.mimeType || file.type, 120) || undefined,
    sizeBytes: typeof file.sizeBytes === 'number' ? file.sizeBytes : typeof file.size === 'number' ? file.size : undefined,
    uploadedAt: safeString(file.uploadedAt || file.createdAt, 80) || undefined,
  }
}

function sanitizeProfileValue(key: string, value: unknown): ApiV1ClientProfileValue | undefined {
  if (value == null) return ''

  if (FILE_PROFILE_KEYS.has(key)) {
    if (!Array.isArray(value)) return []
    return value
      .map(sanitizeProfileFile)
      .filter((file): file is ApiV1ClientProfileFile => Boolean(file))
  }

  if (Array.isArray(value)) {
    return value
      .map(item => safeString(item, 500))
      .filter(Boolean)
  }

  if (typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return safeString(value)

  return undefined
}

export function createApiV1ClientProjectProfileDto(project: ProjectProfileRow): ApiV1ClientProjectProfile {
  const profile: Record<string, ApiV1ClientProfileValue> = {}

  for (const key of CLIENT_PROFILE_READABLE_KEYS) {
    const safeValue = sanitizeProfileValue(key, project.profile?.[key])
    if (safeValue !== undefined) {
      profile[key] = safeValue
    }
  }

  return {
    project: createProjectRef(project),
    profile,
  }
}

export function getApiV1ClientProfileRejectedKeys(profilePatch: Record<string, unknown>) {
  return Object.keys(profilePatch).filter(key => !EDITABLE_PROFILE_KEYS.has(key))
}

export function sanitizeApiV1ClientProfilePatch(profilePatch: Record<string, unknown>) {
  const safeFields: Record<string, string | null> = {}

  for (const [key, value] of Object.entries(profilePatch)) {
    if (!EDITABLE_PROFILE_KEYS.has(key)) continue

    const safeValue = safeString(value)
    safeFields[key] = safeValue ? safeValue : null
  }

  return safeFields
}
