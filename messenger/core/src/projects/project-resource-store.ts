import { randomUUID } from 'node:crypto'
// eslint-disable-next-line no-restricted-imports
import { eq, and, isNull } from 'drizzle-orm'
import { useIngestDb } from '../agents/ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerProjects } from '../../../../server/db/schema/messenger-projects.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerProjectConnectors } from '../../../../server/db/schema/messenger-project-connectors.ts'
// eslint-disable-next-line no-restricted-imports
import {
  messengerProjectSkills,
  messengerProjectPlugins,
  messengerProjectMcp,
  messengerProjectExternalApis,
} from '../../../../server/db/schema/messenger-project-resources.ts'

export type ConnectorRow = typeof messengerProjectConnectors.$inferSelect
export type SkillRow = typeof messengerProjectSkills.$inferSelect
export type PluginRow = typeof messengerProjectPlugins.$inferSelect
export type McpRow = typeof messengerProjectMcp.$inferSelect
export type ExternalApiRow = typeof messengerProjectExternalApis.$inferSelect

async function assertProjectOwner(projectId: string, ownerUserId: string): Promise<void> {
  const db = useIngestDb()
  const [proj] = await db
    .select({ id: messengerProjects.id })
    .from(messengerProjects)
    .where(
      and(
        eq(messengerProjects.id, projectId),
        eq(messengerProjects.ownerUserId, ownerUserId),
        isNull(messengerProjects.deletedAt),
      ),
    )
    .limit(1)
  if (!proj) throw new ProjectForbiddenError()
}

export class ProjectForbiddenError extends Error {
  readonly code = 'PROJECT_FORBIDDEN'
  constructor() { super('PROJECT_FORBIDDEN') }
}

// --- Connectors ---

export async function listConnectors(projectId: string): Promise<ConnectorRow[]> {
  const db = useIngestDb()
  return db
    .select()
    .from(messengerProjectConnectors)
    .where(
      and(
        eq(messengerProjectConnectors.projectId, projectId),
        isNull(messengerProjectConnectors.deletedAt),
      ),
    )
}

export interface CreateConnectorInput {
  type: string
  label: string
  config?: Record<string, unknown>
  enabled?: boolean
  isDefault?: boolean
}

export async function createConnector(
  projectId: string,
  ownerUserId: string,
  input: CreateConnectorInput,
): Promise<ConnectorRow> {
  await assertProjectOwner(projectId, ownerUserId)
  const db = useIngestDb()
  const [row] = await db
    .insert(messengerProjectConnectors)
    .values({
      id: randomUUID(),
      projectId,
      type: input.type,
      label: input.label,
      config: input.config ?? {},
      enabled: input.enabled ?? true,
      isDefault: input.isDefault ?? false,
    })
    .returning()
  return row!
}

export interface UpdateConnectorPatch {
  type?: string
  label?: string
  config?: Record<string, unknown>
  enabled?: boolean
  isDefault?: boolean
}

export async function updateConnector(
  entryId: string,
  ownerUserId: string,
  patch: UpdateConnectorPatch,
): Promise<ConnectorRow | null> {
  const db = useIngestDb()
  const [existing] = await db
    .select({ id: messengerProjectConnectors.id, projectId: messengerProjectConnectors.projectId, ownerUserId: messengerProjects.ownerUserId })
    .from(messengerProjectConnectors)
    .innerJoin(messengerProjects, eq(messengerProjectConnectors.projectId, messengerProjects.id))
    .where(and(eq(messengerProjectConnectors.id, entryId), isNull(messengerProjectConnectors.deletedAt)))
    .limit(1)
  if (!existing) return null
  if (existing.ownerUserId !== ownerUserId) throw new ProjectForbiddenError()

  const set: Partial<typeof messengerProjectConnectors.$inferInsert> = { updatedAt: new Date() }
  if (patch.type !== undefined) set.type = patch.type
  if (patch.label !== undefined) set.label = patch.label
  if (patch.config !== undefined) set.config = patch.config
  if (patch.enabled !== undefined) set.enabled = patch.enabled
  if (patch.isDefault !== undefined) set.isDefault = patch.isDefault

  const [updated] = await db
    .update(messengerProjectConnectors)
    .set(set)
    .where(eq(messengerProjectConnectors.id, entryId))
    .returning()
  return updated ?? null
}

export async function deleteConnector(entryId: string, ownerUserId: string): Promise<boolean> {
  const db = useIngestDb()
  const [existing] = await db
    .select({ id: messengerProjectConnectors.id, ownerUserId: messengerProjects.ownerUserId })
    .from(messengerProjectConnectors)
    .innerJoin(messengerProjects, eq(messengerProjectConnectors.projectId, messengerProjects.id))
    .where(and(eq(messengerProjectConnectors.id, entryId), isNull(messengerProjectConnectors.deletedAt)))
    .limit(1)
  if (!existing) return false
  if (existing.ownerUserId !== ownerUserId) throw new ProjectForbiddenError()

  await db
    .update(messengerProjectConnectors)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(messengerProjectConnectors.id, entryId))
  return true
}

// --- Skills ---

export async function listSkills(projectId: string): Promise<SkillRow[]> {
  const db = useIngestDb()
  return db
    .select()
    .from(messengerProjectSkills)
    .where(eq(messengerProjectSkills.projectId, projectId))
}

export interface UpsertSkillInput {
  enabled?: boolean
  config?: Record<string, unknown>
}

export async function upsertSkill(
  projectId: string,
  ownerUserId: string,
  skillId: string,
  input: UpsertSkillInput,
): Promise<SkillRow> {
  await assertProjectOwner(projectId, ownerUserId)
  const db = useIngestDb()
  const [row] = await db
    .insert(messengerProjectSkills)
    .values({
      projectId,
      skillId,
      enabled: input.enabled ?? true,
      config: input.config ?? {},
    })
    .onConflictDoUpdate({
      target: [messengerProjectSkills.projectId, messengerProjectSkills.skillId],
      set: {
        enabled: input.enabled ?? true,
        config: input.config ?? {},
        updatedAt: new Date(),
      },
    })
    .returning()
  return row!
}

export async function deleteSkill(projectId: string, ownerUserId: string, skillId: string): Promise<boolean> {
  await assertProjectOwner(projectId, ownerUserId)
  const db = useIngestDb()
  const result = await db
    .delete(messengerProjectSkills)
    .where(
      and(
        eq(messengerProjectSkills.projectId, projectId),
        eq(messengerProjectSkills.skillId, skillId),
      ),
    )
    .returning({ projectId: messengerProjectSkills.projectId })
  return result.length > 0
}

// --- Plugins ---

export async function listPlugins(projectId: string): Promise<PluginRow[]> {
  const db = useIngestDb()
  return db
    .select()
    .from(messengerProjectPlugins)
    .where(eq(messengerProjectPlugins.projectId, projectId))
}

export interface UpsertPluginInput {
  enabled?: boolean
  config?: Record<string, unknown>
}

export async function upsertPlugin(
  projectId: string,
  ownerUserId: string,
  pluginId: string,
  input: UpsertPluginInput,
): Promise<PluginRow> {
  await assertProjectOwner(projectId, ownerUserId)
  const db = useIngestDb()
  const [row] = await db
    .insert(messengerProjectPlugins)
    .values({
      projectId,
      pluginId,
      enabled: input.enabled ?? true,
      config: input.config ?? {},
    })
    .onConflictDoUpdate({
      target: [messengerProjectPlugins.projectId, messengerProjectPlugins.pluginId],
      set: {
        enabled: input.enabled ?? true,
        config: input.config ?? {},
        updatedAt: new Date(),
      },
    })
    .returning()
  return row!
}

export async function deletePlugin(projectId: string, ownerUserId: string, pluginId: string): Promise<boolean> {
  await assertProjectOwner(projectId, ownerUserId)
  const db = useIngestDb()
  const result = await db
    .delete(messengerProjectPlugins)
    .where(
      and(
        eq(messengerProjectPlugins.projectId, projectId),
        eq(messengerProjectPlugins.pluginId, pluginId),
      ),
    )
    .returning({ projectId: messengerProjectPlugins.projectId })
  return result.length > 0
}

// --- MCP ---

export async function listMcp(projectId: string): Promise<McpRow[]> {
  const db = useIngestDb()
  return db
    .select()
    .from(messengerProjectMcp)
    .where(
      and(
        eq(messengerProjectMcp.projectId, projectId),
        isNull(messengerProjectMcp.deletedAt),
      ),
    )
}

export interface CreateMcpInput {
  name: string
  transport: string
  endpoint: string
  config?: Record<string, unknown>
  enabled?: boolean
}

export async function createMcp(
  projectId: string,
  ownerUserId: string,
  input: CreateMcpInput,
): Promise<McpRow> {
  await assertProjectOwner(projectId, ownerUserId)
  const db = useIngestDb()
  const [row] = await db
    .insert(messengerProjectMcp)
    .values({
      id: randomUUID(),
      projectId,
      name: input.name,
      transport: input.transport,
      endpoint: input.endpoint,
      config: input.config ?? {},
      enabled: input.enabled ?? true,
    })
    .returning()
  return row!
}

export interface UpdateMcpPatch {
  name?: string
  transport?: string
  endpoint?: string
  config?: Record<string, unknown>
  enabled?: boolean
}

export async function updateMcp(
  entryId: string,
  ownerUserId: string,
  patch: UpdateMcpPatch,
): Promise<McpRow | null> {
  const db = useIngestDb()
  const [existing] = await db
    .select({ id: messengerProjectMcp.id, ownerUserId: messengerProjects.ownerUserId })
    .from(messengerProjectMcp)
    .innerJoin(messengerProjects, eq(messengerProjectMcp.projectId, messengerProjects.id))
    .where(and(eq(messengerProjectMcp.id, entryId), isNull(messengerProjectMcp.deletedAt)))
    .limit(1)
  if (!existing) return null
  if (existing.ownerUserId !== ownerUserId) throw new ProjectForbiddenError()

  const set: Partial<typeof messengerProjectMcp.$inferInsert> = { updatedAt: new Date() }
  if (patch.name !== undefined) set.name = patch.name
  if (patch.transport !== undefined) set.transport = patch.transport
  if (patch.endpoint !== undefined) set.endpoint = patch.endpoint
  if (patch.config !== undefined) set.config = patch.config
  if (patch.enabled !== undefined) set.enabled = patch.enabled

  const [updated] = await db
    .update(messengerProjectMcp)
    .set(set)
    .where(eq(messengerProjectMcp.id, entryId))
    .returning()
  return updated ?? null
}

export async function deleteMcp(entryId: string, ownerUserId: string): Promise<boolean> {
  const db = useIngestDb()
  const [existing] = await db
    .select({ id: messengerProjectMcp.id, ownerUserId: messengerProjects.ownerUserId })
    .from(messengerProjectMcp)
    .innerJoin(messengerProjects, eq(messengerProjectMcp.projectId, messengerProjects.id))
    .where(and(eq(messengerProjectMcp.id, entryId), isNull(messengerProjectMcp.deletedAt)))
    .limit(1)
  if (!existing) return false
  if (existing.ownerUserId !== ownerUserId) throw new ProjectForbiddenError()

  await db
    .update(messengerProjectMcp)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(messengerProjectMcp.id, entryId))
  return true
}

// --- External APIs ---

export async function listExternalApis(projectId: string): Promise<ExternalApiRow[]> {
  const db = useIngestDb()
  return db
    .select()
    .from(messengerProjectExternalApis)
    .where(
      and(
        eq(messengerProjectExternalApis.projectId, projectId),
        isNull(messengerProjectExternalApis.deletedAt),
      ),
    )
}

export interface CreateExternalApiInput {
  name: string
  baseUrl: string
  openapiRef?: string | null
  authType?: string
  config?: Record<string, unknown>
  enabled?: boolean
}

export async function createExternalApi(
  projectId: string,
  ownerUserId: string,
  input: CreateExternalApiInput,
): Promise<ExternalApiRow> {
  await assertProjectOwner(projectId, ownerUserId)
  const db = useIngestDb()
  const [row] = await db
    .insert(messengerProjectExternalApis)
    .values({
      id: randomUUID(),
      projectId,
      name: input.name,
      baseUrl: input.baseUrl,
      openapiRef: input.openapiRef ?? null,
      authType: input.authType ?? 'none',
      config: input.config ?? {},
      enabled: input.enabled ?? true,
    })
    .returning()
  return row!
}

export interface UpdateExternalApiPatch {
  name?: string
  baseUrl?: string
  openapiRef?: string | null
  authType?: string
  config?: Record<string, unknown>
  enabled?: boolean
}

export async function updateExternalApi(
  entryId: string,
  ownerUserId: string,
  patch: UpdateExternalApiPatch,
): Promise<ExternalApiRow | null> {
  const db = useIngestDb()
  const [existing] = await db
    .select({ id: messengerProjectExternalApis.id, ownerUserId: messengerProjects.ownerUserId })
    .from(messengerProjectExternalApis)
    .innerJoin(messengerProjects, eq(messengerProjectExternalApis.projectId, messengerProjects.id))
    .where(and(eq(messengerProjectExternalApis.id, entryId), isNull(messengerProjectExternalApis.deletedAt)))
    .limit(1)
  if (!existing) return null
  if (existing.ownerUserId !== ownerUserId) throw new ProjectForbiddenError()

  const set: Partial<typeof messengerProjectExternalApis.$inferInsert> = { updatedAt: new Date() }
  if (patch.name !== undefined) set.name = patch.name
  if (patch.baseUrl !== undefined) set.baseUrl = patch.baseUrl
  if ('openapiRef' in patch) set.openapiRef = patch.openapiRef
  if (patch.authType !== undefined) set.authType = patch.authType
  if (patch.config !== undefined) set.config = patch.config
  if (patch.enabled !== undefined) set.enabled = patch.enabled

  const [updated] = await db
    .update(messengerProjectExternalApis)
    .set(set)
    .where(eq(messengerProjectExternalApis.id, entryId))
    .returning()
  return updated ?? null
}

export async function deleteExternalApi(entryId: string, ownerUserId: string): Promise<boolean> {
  const db = useIngestDb()
  const [existing] = await db
    .select({ id: messengerProjectExternalApis.id, ownerUserId: messengerProjects.ownerUserId })
    .from(messengerProjectExternalApis)
    .innerJoin(messengerProjects, eq(messengerProjectExternalApis.projectId, messengerProjects.id))
    .where(and(eq(messengerProjectExternalApis.id, entryId), isNull(messengerProjectExternalApis.deletedAt)))
    .limit(1)
  if (!existing) return false
  if (existing.ownerUserId !== ownerUserId) throw new ProjectForbiddenError()

  await db
    .update(messengerProjectExternalApis)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(messengerProjectExternalApis.id, entryId))
  return true
}
