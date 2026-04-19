import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { useMessengerDb } from '../db/client.ts'
import {
  messengerProjects,
  messengerProjectConnectors,
  messengerProjectSkills,
  messengerProjectPlugins,
  messengerProjectMcp,
  messengerProjectExternalApis,
} from '../db/schema.ts'

// ---------------------------------------------------------------------------
// Domain interfaces — no Drizzle types exported
// ---------------------------------------------------------------------------

export interface ProjectRecord {
  id: string
  ownerUserId: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  config: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  version: number
}

export interface ProjectConnectorRecord {
  id: string
  projectId: string
  type: string
  label: string
  config: Record<string, unknown>
  enabled: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProjectSkillRecord {
  projectId: string
  skillId: string
  enabled: boolean
  config: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ProjectPluginRecord {
  projectId: string
  pluginId: string
  enabled: boolean
  config: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ProjectMcpRecord {
  id: string
  projectId: string
  name: string
  transport: string
  endpoint: string
  config: Record<string, unknown>
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProjectExternalApiRecord {
  id: string
  projectId: string
  name: string
  baseUrl: string
  openapiRef: string | null
  authType: string
  config: Record<string, unknown>
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Zod validators — lenient to extra fields (passthrough), strict on core shape
// ---------------------------------------------------------------------------

export const createProjectSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    description: z.string().max(2000).optional(),
    icon: z.string().max(64).optional(),
    color: z.string().max(32).optional(),
    config: z.record(z.unknown()).optional(),
  })
  .passthrough()

export const patchProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    description: z.string().max(2000).nullable().optional(),
    icon: z.string().max(64).nullable().optional(),
    color: z.string().max(32).nullable().optional(),
    config: z.record(z.unknown()).optional(),
  })
  .passthrough()

export const createConnectorSchema = z
  .object({
    type: z.string().min(1).max(64),
    label: z.string().min(1).max(200),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .passthrough()

export const patchConnectorSchema = z
  .object({
    label: z.string().min(1).max(200).optional(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .passthrough()

export const upsertSkillSchema = z
  .object({
    skillId: z.string().min(1).max(200),
    enabled: z.boolean().optional(),
    config: z.record(z.unknown()).optional(),
  })
  .passthrough()

export const upsertPluginSchema = z
  .object({
    pluginId: z.string().min(1).max(200),
    enabled: z.boolean().optional(),
    config: z.record(z.unknown()).optional(),
  })
  .passthrough()

export const createMcpSchema = z
  .object({
    name: z.string().min(1).max(200),
    transport: z.enum(['http', 'stdio', 'sse']),
    endpoint: z.string().min(1).max(2000),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough()

export const patchMcpSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    transport: z.enum(['http', 'stdio', 'sse']).optional(),
    endpoint: z.string().min(1).max(2000).optional(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough()

export const createExternalApiSchema = z
  .object({
    name: z.string().min(1).max(200),
    baseUrl: z.string().url(),
    openapiRef: z.string().url().nullable().optional(),
    authType: z.enum(['none', 'bearer', 'basic', 'header']).optional(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough()

export const patchExternalApiSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    baseUrl: z.string().url().optional(),
    openapiRef: z.string().url().nullable().optional(),
    authType: z.enum(['none', 'bearer', 'basic', 'header']).optional(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough()

// ---------------------------------------------------------------------------
// Row → domain transforms (internal — Drizzle types never leave this file)
// ---------------------------------------------------------------------------

type ProjectRow = typeof messengerProjects.$inferSelect
type ConnectorRow = typeof messengerProjectConnectors.$inferSelect
type SkillRow = typeof messengerProjectSkills.$inferSelect
type PluginRow = typeof messengerProjectPlugins.$inferSelect
type McpRow = typeof messengerProjectMcp.$inferSelect
type ExternalApiRow = typeof messengerProjectExternalApis.$inferSelect

function rowToProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    icon: row.icon ?? null,
    color: row.color ?? null,
    config: (row.config ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

function rowToConnector(row: ConnectorRow): ProjectConnectorRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    label: row.label,
    config: (row.config ?? {}) as Record<string, unknown>,
    enabled: row.enabled,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function rowToSkill(row: SkillRow): ProjectSkillRecord {
  return {
    projectId: row.projectId,
    skillId: row.skillId,
    enabled: row.enabled,
    config: (row.config ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function rowToPlugin(row: PluginRow): ProjectPluginRecord {
  return {
    projectId: row.projectId,
    pluginId: row.pluginId,
    enabled: row.enabled,
    config: (row.config ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function rowToMcp(row: McpRow): ProjectMcpRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    transport: row.transport,
    endpoint: row.endpoint,
    config: (row.config ?? {}) as Record<string, unknown>,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function rowToExternalApi(row: ExternalApiRow): ProjectExternalApiRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    baseUrl: row.baseUrl,
    openapiRef: row.openapiRef ?? null,
    authType: row.authType,
    config: (row.config ?? {}) as Record<string, unknown>,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Projects CRUD
// ---------------------------------------------------------------------------

export async function createProject(
  ownerUserId: string,
  payload: z.infer<typeof createProjectSchema>,
): Promise<ProjectRecord> {
  const db = useMessengerDb()
  const [row] = await db
    .insert(messengerProjects)
    .values({
      ownerUserId,
      name: payload.name,
      slug: payload.slug,
      description: payload.description ?? null,
      icon: payload.icon ?? null,
      color: payload.color ?? null,
      config: (payload.config ?? {}) as Record<string, unknown>,
    })
    .returning()
  return rowToProject(row)
}

export async function getProjectById(
  id: string,
  ownerUserId?: string,
): Promise<ProjectRecord | null> {
  const db = useMessengerDb()
  const conditions = [eq(messengerProjects.id, id), isNull(messengerProjects.deletedAt)]
  if (ownerUserId) {
    conditions.push(eq(messengerProjects.ownerUserId, ownerUserId))
  }
  const rows = await db
    .select()
    .from(messengerProjects)
    .where(and(...conditions))
    .limit(1)
  return rows[0] ? rowToProject(rows[0]) : null
}

export async function listProjects(ownerUserId: string): Promise<ProjectRecord[]> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerProjects)
    .where(
      and(eq(messengerProjects.ownerUserId, ownerUserId), isNull(messengerProjects.deletedAt)),
    )
  return rows.map(rowToProject)
}

export async function patchProject(
  id: string,
  ownerUserId: string,
  patch: z.infer<typeof patchProjectSchema>,
  expectedVersion: number,
): Promise<ProjectRecord> {
  const db = useMessengerDb()
  const existing = await getProjectById(id, ownerUserId)
  if (!existing) throw 'PROJECT_NOT_FOUND'
  if (existing.version !== expectedVersion) throw 'PROJECT_VERSION_CONFLICT'

  const updates: Partial<ProjectRow> = { updatedAt: new Date(), version: existing.version + 1 }
  if (patch.name !== undefined) updates.name = patch.name
  if (patch.slug !== undefined) updates.slug = patch.slug
  if ('description' in patch) updates.description = patch.description ?? null
  if ('icon' in patch) updates.icon = patch.icon ?? null
  if ('color' in patch) updates.color = patch.color ?? null
  if (patch.config !== undefined) updates.config = patch.config as Record<string, unknown>

  const [row] = await db
    .update(messengerProjects)
    .set(updates)
    .where(
      and(
        eq(messengerProjects.id, id),
        eq(messengerProjects.ownerUserId, ownerUserId),
        isNull(messengerProjects.deletedAt),
      ),
    )
    .returning()
  if (!row) throw 'PROJECT_NOT_FOUND'
  return rowToProject(row)
}

export async function softDeleteProject(id: string, ownerUserId: string): Promise<void> {
  const db = useMessengerDb()
  const existing = await getProjectById(id, ownerUserId)
  if (!existing) throw 'PROJECT_NOT_FOUND'
  await db
    .update(messengerProjects)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(messengerProjects.id, id),
        eq(messengerProjects.ownerUserId, ownerUserId),
        isNull(messengerProjects.deletedAt),
      ),
    )
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export async function listConnectors(projectId: string): Promise<ProjectConnectorRecord[]> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerProjectConnectors)
    .where(
      and(
        eq(messengerProjectConnectors.projectId, projectId),
        isNull(messengerProjectConnectors.deletedAt),
      ),
    )
  return rows.map(rowToConnector)
}

export async function createConnector(
  projectId: string,
  payload: z.infer<typeof createConnectorSchema>,
): Promise<ProjectConnectorRecord> {
  const db = useMessengerDb()
  const [row] = await db
    .insert(messengerProjectConnectors)
    .values({
      projectId,
      type: payload.type,
      label: payload.label,
      config: (payload.config ?? {}) as Record<string, unknown>,
      enabled: payload.enabled ?? true,
      isDefault: payload.isDefault ?? false,
    })
    .returning()
  return rowToConnector(row)
}

export async function patchConnector(
  id: string,
  projectId: string,
  patch: z.infer<typeof patchConnectorSchema>,
): Promise<ProjectConnectorRecord> {
  const db = useMessengerDb()
  const updates: Partial<ConnectorRow> = { updatedAt: new Date() }
  if (patch.label !== undefined) updates.label = patch.label
  if (patch.config !== undefined) updates.config = patch.config as Record<string, unknown>
  if (patch.enabled !== undefined) updates.enabled = patch.enabled
  if (patch.isDefault !== undefined) updates.isDefault = patch.isDefault

  const [row] = await db
    .update(messengerProjectConnectors)
    .set(updates)
    .where(
      and(
        eq(messengerProjectConnectors.id, id),
        eq(messengerProjectConnectors.projectId, projectId),
        isNull(messengerProjectConnectors.deletedAt),
      ),
    )
    .returning()
  if (!row) throw 'CONNECTOR_NOT_FOUND'
  return rowToConnector(row)
}

export async function softDeleteConnector(id: string, projectId: string): Promise<void> {
  const db = useMessengerDb()
  const [row] = await db
    .update(messengerProjectConnectors)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(messengerProjectConnectors.id, id),
        eq(messengerProjectConnectors.projectId, projectId),
        isNull(messengerProjectConnectors.deletedAt),
      ),
    )
    .returning({ id: messengerProjectConnectors.id })
  if (!row) throw 'CONNECTOR_NOT_FOUND'
}

// ---------------------------------------------------------------------------
// Skills (composite PK — upsert semantics)
// ---------------------------------------------------------------------------

export async function listSkills(projectId: string): Promise<ProjectSkillRecord[]> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerProjectSkills)
    .where(eq(messengerProjectSkills.projectId, projectId))
  return rows.map(rowToSkill)
}

export async function upsertSkill(
  projectId: string,
  payload: z.infer<typeof upsertSkillSchema>,
): Promise<ProjectSkillRecord> {
  const db = useMessengerDb()
  const now = new Date()
  const [row] = await db
    .insert(messengerProjectSkills)
    .values({
      projectId,
      skillId: payload.skillId,
      enabled: payload.enabled ?? true,
      config: (payload.config ?? {}) as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [messengerProjectSkills.projectId, messengerProjectSkills.skillId],
      set: {
        enabled: payload.enabled ?? true,
        config: (payload.config ?? {}) as Record<string, unknown>,
        updatedAt: now,
      },
    })
    .returning()
  return rowToSkill(row)
}

export async function deleteSkill(projectId: string, skillId: string): Promise<void> {
  const db = useMessengerDb()
  await db
    .delete(messengerProjectSkills)
    .where(
      and(
        eq(messengerProjectSkills.projectId, projectId),
        eq(messengerProjectSkills.skillId, skillId),
      ),
    )
}

// ---------------------------------------------------------------------------
// Plugins (composite PK — upsert semantics)
// ---------------------------------------------------------------------------

export async function listPlugins(projectId: string): Promise<ProjectPluginRecord[]> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerProjectPlugins)
    .where(eq(messengerProjectPlugins.projectId, projectId))
  return rows.map(rowToPlugin)
}

export async function upsertPlugin(
  projectId: string,
  payload: z.infer<typeof upsertPluginSchema>,
): Promise<ProjectPluginRecord> {
  const db = useMessengerDb()
  const now = new Date()
  const [row] = await db
    .insert(messengerProjectPlugins)
    .values({
      projectId,
      pluginId: payload.pluginId,
      enabled: payload.enabled ?? true,
      config: (payload.config ?? {}) as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [messengerProjectPlugins.projectId, messengerProjectPlugins.pluginId],
      set: {
        enabled: payload.enabled ?? true,
        config: (payload.config ?? {}) as Record<string, unknown>,
        updatedAt: now,
      },
    })
    .returning()
  return rowToPlugin(row)
}

export async function deletePlugin(projectId: string, pluginId: string): Promise<void> {
  const db = useMessengerDb()
  await db
    .delete(messengerProjectPlugins)
    .where(
      and(
        eq(messengerProjectPlugins.projectId, projectId),
        eq(messengerProjectPlugins.pluginId, pluginId),
      ),
    )
}

// ---------------------------------------------------------------------------
// MCP servers
// ---------------------------------------------------------------------------

export async function listMcp(projectId: string): Promise<ProjectMcpRecord[]> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerProjectMcp)
    .where(
      and(eq(messengerProjectMcp.projectId, projectId), isNull(messengerProjectMcp.deletedAt)),
    )
  return rows.map(rowToMcp)
}

export async function createMcp(
  projectId: string,
  payload: z.infer<typeof createMcpSchema>,
): Promise<ProjectMcpRecord> {
  const db = useMessengerDb()
  const [row] = await db
    .insert(messengerProjectMcp)
    .values({
      projectId,
      name: payload.name,
      transport: payload.transport,
      endpoint: payload.endpoint,
      config: (payload.config ?? {}) as Record<string, unknown>,
      enabled: payload.enabled ?? true,
    })
    .returning()
  return rowToMcp(row)
}

export async function patchMcp(
  id: string,
  projectId: string,
  patch: z.infer<typeof patchMcpSchema>,
): Promise<ProjectMcpRecord> {
  const db = useMessengerDb()
  const updates: Partial<McpRow> = { updatedAt: new Date() }
  if (patch.name !== undefined) updates.name = patch.name
  if (patch.transport !== undefined) updates.transport = patch.transport
  if (patch.endpoint !== undefined) updates.endpoint = patch.endpoint
  if (patch.config !== undefined) updates.config = patch.config as Record<string, unknown>
  if (patch.enabled !== undefined) updates.enabled = patch.enabled

  const [row] = await db
    .update(messengerProjectMcp)
    .set(updates)
    .where(
      and(
        eq(messengerProjectMcp.id, id),
        eq(messengerProjectMcp.projectId, projectId),
        isNull(messengerProjectMcp.deletedAt),
      ),
    )
    .returning()
  if (!row) throw 'MCP_NOT_FOUND'
  return rowToMcp(row)
}

export async function softDeleteMcp(id: string, projectId: string): Promise<void> {
  const db = useMessengerDb()
  const [row] = await db
    .update(messengerProjectMcp)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(messengerProjectMcp.id, id),
        eq(messengerProjectMcp.projectId, projectId),
        isNull(messengerProjectMcp.deletedAt),
      ),
    )
    .returning({ id: messengerProjectMcp.id })
  if (!row) throw 'MCP_NOT_FOUND'
}

// ---------------------------------------------------------------------------
// External APIs
// ---------------------------------------------------------------------------

export async function listExternalApis(projectId: string): Promise<ProjectExternalApiRecord[]> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerProjectExternalApis)
    .where(
      and(
        eq(messengerProjectExternalApis.projectId, projectId),
        isNull(messengerProjectExternalApis.deletedAt),
      ),
    )
  return rows.map(rowToExternalApi)
}

export async function createExternalApi(
  projectId: string,
  payload: z.infer<typeof createExternalApiSchema>,
): Promise<ProjectExternalApiRecord> {
  const db = useMessengerDb()
  const [row] = await db
    .insert(messengerProjectExternalApis)
    .values({
      projectId,
      name: payload.name,
      baseUrl: payload.baseUrl,
      openapiRef: payload.openapiRef ?? null,
      authType: payload.authType ?? 'none',
      config: (payload.config ?? {}) as Record<string, unknown>,
      enabled: payload.enabled ?? true,
    })
    .returning()
  return rowToExternalApi(row)
}

export async function patchExternalApi(
  id: string,
  projectId: string,
  patch: z.infer<typeof patchExternalApiSchema>,
): Promise<ProjectExternalApiRecord> {
  const db = useMessengerDb()
  const updates: Partial<ExternalApiRow> = { updatedAt: new Date() }
  if (patch.name !== undefined) updates.name = patch.name
  if (patch.baseUrl !== undefined) updates.baseUrl = patch.baseUrl
  if ('openapiRef' in patch) updates.openapiRef = patch.openapiRef ?? null
  if (patch.authType !== undefined) updates.authType = patch.authType
  if (patch.config !== undefined) updates.config = patch.config as Record<string, unknown>
  if (patch.enabled !== undefined) updates.enabled = patch.enabled

  const [row] = await db
    .update(messengerProjectExternalApis)
    .set(updates)
    .where(
      and(
        eq(messengerProjectExternalApis.id, id),
        eq(messengerProjectExternalApis.projectId, projectId),
        isNull(messengerProjectExternalApis.deletedAt),
      ),
    )
    .returning()
  if (!row) throw 'EXTERNAL_API_NOT_FOUND'
  return rowToExternalApi(row)
}

export async function softDeleteExternalApi(id: string, projectId: string): Promise<void> {
  const db = useMessengerDb()
  const [row] = await db
    .update(messengerProjectExternalApis)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(messengerProjectExternalApis.id, id),
        eq(messengerProjectExternalApis.projectId, projectId),
        isNull(messengerProjectExternalApis.deletedAt),
      ),
    )
    .returning({ id: messengerProjectExternalApis.id })
  if (!row) throw 'EXTERNAL_API_NOT_FOUND'
}
