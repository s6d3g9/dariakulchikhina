import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  index,
  unique,
  uniqueIndex,
  foreignKey,
  primaryKey,
  customType,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

const tstz = (name: string) => timestamp(name, { withTimezone: true })

export const messengerUsers = pgTable('messenger_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  login: text('login').notNull().unique(),
  displayName: text('display_name'),
  publicKey: jsonb('public_key'),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: tstz('deleted_at'),
})

export const messengerContacts = pgTable(
  'messenger_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => messengerUsers.id),
    contactUserId: uuid('contact_user_id')
      .notNull()
      .references(() => messengerUsers.id),
    alias: text('alias'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [unique('messenger_contacts_owner_contact_uniq').on(t.ownerUserId, t.contactUserId)],
)

export const messengerDeviceKeys = pgTable(
  'messenger_device_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => messengerUsers.id),
    deviceId: text('device_id').notNull(),
    publicKey: jsonb('public_key').notNull(),
    createdAt: tstz('created_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [unique('messenger_device_keys_user_device_uniq').on(t.userId, t.deviceId)],
)

export const messengerConversations = pgTable('messenger_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  userAId: uuid('user_a_id').references(() => messengerUsers.id),
  userBId: uuid('user_b_id').references(() => messengerUsers.id),
  policy: jsonb('policy').notNull().default('{}'),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: tstz('deleted_at'),
})

export const messengerMessages = pgTable(
  'messenger_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => messengerConversations.id),
    senderUserId: uuid('sender_user_id').references(() => messengerUsers.id),
    ciphertext: bytea('ciphertext').notNull(),
    keyId: text('key_id'),
    contentType: text('content_type').notNull().default('text'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    index('messenger_messages_conv_cursor_idx').on(
      t.conversationId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
  ],
)

export const messengerProjects = pgTable(
  'messenger_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => messengerUsers.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    icon: text('icon'),
    color: text('color'),
    config: jsonb('config').notNull().default('{}'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    uniqueIndex('messenger_projects_owner_slug_unique')
      .on(t.ownerUserId, t.slug)
      .where(sql`deleted_at is null`),
    index('messenger_projects_owner_idx').on(t.ownerUserId),
  ],
)

export const messengerProjectConnectors = pgTable(
  'messenger_project_connectors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    label: text('label').notNull(),
    config: jsonb('config').notNull().default('{}'),
    enabled: boolean('enabled').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [index('messenger_project_connectors_project_idx').on(t.projectId)],
)

export const messengerProjectSkills = pgTable(
  'messenger_project_skills',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    config: jsonb('config').notNull().default('{}'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.skillId] })],
)

export const messengerProjectPlugins = pgTable(
  'messenger_project_plugins',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'cascade' }),
    pluginId: text('plugin_id').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    config: jsonb('config').notNull().default('{}'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.pluginId] })],
)

export const messengerProjectMcp = pgTable(
  'messenger_project_mcp',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    transport: text('transport').notNull(),
    endpoint: text('endpoint').notNull(),
    config: jsonb('config').notNull().default('{}'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [index('messenger_project_mcp_project_idx').on(t.projectId)],
)

export const messengerProjectExternalApis = pgTable(
  'messenger_project_external_apis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    baseUrl: text('base_url').notNull(),
    openapiRef: text('openapi_ref'),
    authType: text('auth_type').notNull().default('none'),
    config: jsonb('config').notNull().default('{}'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [index('messenger_project_external_apis_project_idx').on(t.projectId)],
)

export const messengerAgents = pgTable(
  'messenger_agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => messengerUsers.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, {
        onDelete: 'restrict',
      }),
    name: text('name').notNull(),
    description: text('description'),
    model: text('model'),
    ingestToken: text('ingest_token').notNull().unique(),
    config: jsonb('config').notNull().default('{}'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    index('messenger_agents_project_idx')
      .on(t.projectId)
      .where(sql`deleted_at is null`),
  ],
)

export const messengerAgentRuns = pgTable(
  'messenger_agent_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => messengerAgents.id),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => messengerConversations.id),
    parentRunId: uuid('parent_run_id'),
    rootRunId: uuid('root_run_id'),
    spawnedByAgentId: uuid('spawned_by_agent_id').references(() => messengerAgents.id),
    status: text('status').notNull().default('pending'),
    prompt: text('prompt'),
    result: text('result'),
    error: text('error'),
    costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).default('0').notNull(),
    tokenInTotal: integer('token_in_total').default(0).notNull(),
    tokenOutTotal: integer('token_out_total').default(0).notNull(),
    attachmentIds: jsonb('attachment_ids').default('[]').notNull(),
    startedAt: tstz('started_at'),
    finishedAt: tstz('finished_at'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    foreignKey({ columns: [t.parentRunId], foreignColumns: [t.id] }).onDelete('set null'),
    foreignKey({ columns: [t.rootRunId], foreignColumns: [t.id] }),
    index('messenger_agent_runs_parent_run_idx').on(t.parentRunId),
    index('messenger_agent_runs_root_run_cursor_idx').on(t.rootRunId, t.createdAt.desc()),
  ],
)

export const messengerAgentRunEvents = pgTable(
  'messenger_agent_run_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => messengerAgentRuns.id, { onDelete: 'cascade' }),
    occurredAt: tstz('occurred_at').defaultNow().notNull(),
    substate: text('substate'),
    tokenIn: integer('token_in'),
    tokenOut: integer('token_out'),
    message: text('message'),
    payload: jsonb('payload'),
  },
  (t) => [index('messenger_agent_run_events_run_cursor_idx').on(t.runId, t.occurredAt.desc())],
)

export const messengerCliSessions = pgTable(
  'messenger_cli_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Denormalized owner+project. Source of truth is the agent, but every
    // entry-point that creates a cli-session must persist these so that
    // monitor queries don't have to JOIN on agents (which makes the "all
    // sessions of user X in project Y" lookup an indexed point query).
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => messengerUsers.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'restrict' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => messengerAgents.id),
    runId: uuid('run_id').references(() => messengerAgentRuns.id),
    slug: text('slug').notNull().unique(),
    workroom: text('workroom'),
    model: text('model'),
    status: text('status').notNull().default('starting'),
    prompt: text('prompt'),
    tmuxWindow: text('tmux_window'),
    startedAt: tstz('started_at'),
    stoppedAt: tstz('stopped_at'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    index('messenger_cli_sessions_agent_status_idx').on(t.agentId, t.status),
    index('messenger_cli_sessions_owner_project_idx')
      .on(t.ownerUserId, t.projectId, t.status)
      .where(sql`deleted_at is null`),
  ],
)
