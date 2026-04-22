import { randomUUID } from 'node:crypto'
// eslint-disable-next-line no-restricted-imports
import { eq, and, isNull, sql, count } from 'drizzle-orm'
import { useIngestDb } from '../agents/ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerProjects } from '../../../../server/db/schema/messenger-projects.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerProjectConnectors } from '../../../../server/db/schema/messenger-project-connectors.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerProjectSkills, messengerProjectPlugins, messengerProjectMcp, messengerProjectExternalApis } from '../../../../server/db/schema/messenger-project-resources.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerAgents } from '../../../../server/db/schema/messenger.ts'

export type ProjectRow = typeof messengerProjects.$inferSelect

export interface CreateProjectInput {
  ownerUserId: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  slug?: string | null
}

export interface UpdateProjectPatch {
  name?: string
  description?: string | null
  icon?: string | null
  color?: string | null
  slug?: string | null
  version: number
}

function toKebabCase(str: string): string {
  return (
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
  ) || 'project'
}

async function ensureUniqueSlug(
  db: ReturnType<typeof useIngestDb>,
  ownerUserId: string,
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let slug = baseSlug
  for (let counter = 0; ; counter++) {
    const existing = await db
      .select({ id: messengerProjects.id })
      .from(messengerProjects)
      .where(
        and(
          eq(messengerProjects.ownerUserId, ownerUserId),
          eq(messengerProjects.slug, slug),
          isNull(messengerProjects.deletedAt),
        ),
      )
      .limit(1)
    const clash = existing.find(r => r.id !== excludeId)
    if (!clash) return slug
    slug = `${baseSlug}-${counter + 1}`
  }
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRow> {
  const db = useIngestDb()
  const baseSlug = input.slug ? toKebabCase(input.slug) : toKebabCase(input.name)
  const slug = await ensureUniqueSlug(db, input.ownerUserId, baseSlug)
  const [row] = await db
    .insert(messengerProjects)
    .values({
      id: randomUUID(),
      ownerUserId: input.ownerUserId,
      name: input.name,
      slug,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
    })
    .returning()
  return row!
}

export async function findProjectById(
  id: string,
  ownerUserId: string,
): Promise<{ project: ProjectRow; ok: true } | { ok: false }> {
  const db = useIngestDb()
  const [row] = await db
    .select()
    .from(messengerProjects)
    .where(
      and(
        eq(messengerProjects.id, id),
        eq(messengerProjects.ownerUserId, ownerUserId),
        isNull(messengerProjects.deletedAt),
      ),
    )
    .limit(1)
  if (!row) return { ok: false }
  return { ok: true, project: row }
}

export async function findProjectBySlug(
  slug: string,
  ownerUserId: string,
): Promise<{ project: ProjectRow; ok: true } | { ok: false }> {
  const db = useIngestDb()
  const [row] = await db
    .select()
    .from(messengerProjects)
    .where(
      and(
        eq(messengerProjects.slug, slug),
        eq(messengerProjects.ownerUserId, ownerUserId),
        isNull(messengerProjects.deletedAt),
      ),
    )
    .limit(1)
  if (!row) return { ok: false }
  return { ok: true, project: row }
}

export async function listProjects(): Promise<ProjectRow[]> {
  const db = useIngestDb()
  return db
    .select()
    .from(messengerProjects)
    .where(isNull(messengerProjects.deletedAt))
    .orderBy(messengerProjects.createdAt)
}

export async function updateProject(
  id: string,
  ownerUserId: string,
  patch: UpdateProjectPatch,
): Promise<{ project: ProjectRow; ok: true } | { ok: false; error: 'NOT_FOUND' | 'VERSION_CONFLICT' }> {
  const db = useIngestDb()
  const { version, ...fields } = patch
  const setFields: Partial<typeof messengerProjects.$inferInsert> = {
    updatedAt: new Date(),
    version: sql`${messengerProjects.version} + 1` as unknown as number,
  }
  if (fields.name !== undefined) setFields.name = fields.name
  if ('description' in fields) setFields.description = fields.description
  if ('icon' in fields) setFields.icon = fields.icon
  if ('color' in fields) setFields.color = fields.color
  if (fields.slug !== undefined) setFields.slug = toKebabCase(fields.slug!)

  const updated = await db
    .update(messengerProjects)
    .set(setFields)
    .where(
      and(
        eq(messengerProjects.id, id),
        eq(messengerProjects.ownerUserId, ownerUserId),
        eq(messengerProjects.version, version),
        isNull(messengerProjects.deletedAt),
      ),
    )
    .returning()

  if (updated.length === 0) {
    const exists = await findProjectById(id, ownerUserId)
    return exists.ok
      ? { ok: false, error: 'VERSION_CONFLICT' }
      : { ok: false, error: 'NOT_FOUND' }
  }
  return { ok: true, project: updated[0]! }
}

export async function getProjectConfig(id: string): Promise<Record<string, unknown> | null> {
  const db = useIngestDb()
  const [row] = await db
    .select({ config: messengerProjects.config })
    .from(messengerProjects)
    .where(and(eq(messengerProjects.id, id), isNull(messengerProjects.deletedAt)))
    .limit(1)
  if (!row) return null
  return (row.config ?? {}) as Record<string, unknown>
}

export async function updateProjectApiKeyConfig(
  id: string,
  apiKeyPayload: { ciphertext: string; iv: string; tag: string; rotatedAt: string } | null,
): Promise<boolean> {
  const db = useIngestDb()
  const [row] = await db
    .select({ config: messengerProjects.config })
    .from(messengerProjects)
    .where(and(eq(messengerProjects.id, id), isNull(messengerProjects.deletedAt)))
    .limit(1)
  if (!row) return false

  const currentConfig = (row.config ?? {}) as Record<string, unknown>
  let newConfig: Record<string, unknown>
  if (apiKeyPayload === null) {
    const { anthropicApiKey: _removed, apiKeyRotatedAt: _removedAt, ...rest } = currentConfig
    newConfig = rest
  } else {
    newConfig = {
      ...currentConfig,
      anthropicApiKey: {
        ciphertext: apiKeyPayload.ciphertext,
        iv: apiKeyPayload.iv,
        tag: apiKeyPayload.tag,
      },
      apiKeyRotatedAt: apiKeyPayload.rotatedAt,
    }
  }

  await db
    .update(messengerProjects)
    .set({ config: newConfig, updatedAt: new Date() })
    .where(eq(messengerProjects.id, id))
  return true
}

export async function softDeleteProject(
  id: string,
  ownerUserId: string,
): Promise<{ ok: true } | { ok: false; error: 'NOT_FOUND' }> {
  const db = useIngestDb()
  const updated = await db
    .update(messengerProjects)
    .set({
      deletedAt: new Date(),
      version: sql`${messengerProjects.version} + 1` as unknown as number,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messengerProjects.id, id),
        eq(messengerProjects.ownerUserId, ownerUserId),
        isNull(messengerProjects.deletedAt),
      ),
    )
    .returning({ id: messengerProjects.id })
  if (updated.length === 0) return { ok: false, error: 'NOT_FOUND' }
  return { ok: true }
}

export interface ProjectWithCounts extends ProjectRow {
  counts: {
    connectors: number
    skills: number
    plugins: number
    mcp: number
    externalApis: number
    agents: number
  }
}

export async function getProjectWithCounts(
  id: string,
  ownerUserId: string,
): Promise<{ project: ProjectWithCounts; ok: true } | { ok: false }> {
  const result = await findProjectById(id, ownerUserId)
  if (!result.ok) return { ok: false }
  const { project } = result
  const db = useIngestDb()

  const [connectors, skills, plugins, mcp, externalApis, agents] = await Promise.all([
    db.select({ n: count() }).from(messengerProjectConnectors)
      .where(and(eq(messengerProjectConnectors.projectId, id), isNull(messengerProjectConnectors.deletedAt))),
    db.select({ n: count() }).from(messengerProjectSkills)
      .where(eq(messengerProjectSkills.projectId, id)),
    db.select({ n: count() }).from(messengerProjectPlugins)
      .where(eq(messengerProjectPlugins.projectId, id)),
    db.select({ n: count() }).from(messengerProjectMcp)
      .where(and(eq(messengerProjectMcp.projectId, id), isNull(messengerProjectMcp.deletedAt))),
    db.select({ n: count() }).from(messengerProjectExternalApis)
      .where(and(eq(messengerProjectExternalApis.projectId, id), isNull(messengerProjectExternalApis.deletedAt))),
    db.select({ n: count() }).from(messengerAgents)
      .where(and(eq(messengerAgents.projectId, id), isNull(messengerAgents.deletedAt))),
  ])

  return {
    ok: true,
    project: {
      ...project,
      counts: {
        connectors: Number(connectors[0]?.n ?? 0),
        skills: Number(skills[0]?.n ?? 0),
        plugins: Number(plugins[0]?.n ?? 0),
        mcp: Number(mcp[0]?.n ?? 0),
        externalApis: Number(externalApis[0]?.n ?? 0),
        agents: Number(agents[0]?.n ?? 0),
      },
    },
  }
}
