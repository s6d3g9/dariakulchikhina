import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { ROADMAP_TEMPLATES } from '~/shared/types/roadmap-templates'
import {
  type CreateRoadmapTemplate,
  type RoadmapTemplate,
  RoadmapTemplateSchema,
} from '~/shared/types/roadmap-template'

const DATA_DIR = path.join(process.cwd(), 'server', 'data')
const FILE_PATH = path.join(DATA_DIR, 'roadmap-templates.custom.json')

function normalizeKey(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export async function readCustomRoadmapTemplates(): Promise<RoadmapTemplate[]> {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(item => RoadmapTemplateSchema.safeParse(item))
      .filter(result => result.success)
      .map(result => result.data)
  } catch {
    return []
  }
}

export async function writeCustomRoadmapTemplates(templates: RoadmapTemplate[]) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(FILE_PATH, JSON.stringify(templates, null, 2), 'utf-8')
}

export async function listRoadmapTemplates() {
  const custom = await readCustomRoadmapTemplates()
  const builtIn = ROADMAP_TEMPLATES.map(template => ({ ...template, isBuiltIn: true }))
  const customWithMeta = custom.map(template => ({ ...template, isBuiltIn: false }))
  return [...builtIn, ...customWithMeta]
}

export async function createCustomRoadmapTemplate(payload: CreateRoadmapTemplate) {
  const current = await readCustomRoadmapTemplates()
  const base = normalizeKey(payload.title) || 'template'
  let key = `custom-${base}`
  let idx = 1
  const hasKey = (value: string) =>
    current.some(t => t.key === value) || ROADMAP_TEMPLATES.some(t => t.key === value)
  while (hasKey(key)) {
    idx += 1
    key = `custom-${base}-${idx}`
  }
  const created: RoadmapTemplate = { ...payload, key }
  current.push(created)
  await writeCustomRoadmapTemplates(current)
  return created
}

export async function updateCustomRoadmapTemplate(key: string, payload: CreateRoadmapTemplate) {
  const current = await readCustomRoadmapTemplates()
  const index = current.findIndex(t => t.key === key)
  if (index < 0) return null
  const updated: RoadmapTemplate = { ...payload, key }
  current[index] = updated
  await writeCustomRoadmapTemplates(current)
  return updated
}

export async function deleteCustomRoadmapTemplate(key: string) {
  const current = await readCustomRoadmapTemplates()
  const next = current.filter(t => t.key !== key)
  const changed = next.length !== current.length
  if (changed) await writeCustomRoadmapTemplates(next)
  return changed
}
