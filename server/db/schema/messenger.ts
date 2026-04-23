import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  boolean,
  timestamp,
  index,
  unique,
  foreignKey,
  customType,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { messengerProjects } from './messenger-projects.ts'

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

export const messengerAgents = pgTable(
  'messenger_agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => messengerUsers.id),
    projectId: uuid('project_id').references(() => messengerProjects.id, {
      onDelete: 'set null',
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
  (t) => [index('messenger_cli_sessions_agent_status_idx').on(t.agentId, t.status)],
)

// ---------------------------------------------------------------------------
// Subscription & model-routing tables
// ---------------------------------------------------------------------------

/**
 * User-level AI provider subscriptions.
 * One row per "account" on each provider (Anthropic CLI, GitHub Copilot,
 * OpenAI key, custom endpoint, etc.).  API keys are stored as-is — add
 * server-side encryption before exposing to untrusted clients.
 */
export const messengerSubscriptions = pgTable(
  'messenger_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => messengerUsers.id),
    // 'claude-code-cli' | 'github-copilot' | 'openai' | 'google' | 'alibaba' | 'custom'
    provider: text('provider').notNull(),
    label: text('label').notNull(),
    account: text('account').notNull().default(''),
    // Plaintext for now; encrypt at rest before production multi-tenant deploy
    apiKey: text('api_key'),
    defaultModel: text('default_model').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    // Extra: { baseUrl, effort, temperature, ... }
    config: jsonb('config').notNull().default('{}'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    index('messenger_subscriptions_owner_idx')
      .on(t.ownerUserId)
      .where(sql`deleted_at is null`),
  ],
)

/**
 * Per-agent model routing config.
 * Links an agent to a specific subscription and overrides the model/effort.
 * One row per agent (enforced by unique constraint).
 */
export const messengerAgentModelRouting = pgTable(
  'messenger_agent_model_routing',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => messengerAgents.id, { onDelete: 'cascade' }),
    // Null = use owner's default subscription
    subscriptionId: uuid('subscription_id').references(() => messengerSubscriptions.id, {
      onDelete: 'set null',
    }),
    // Null = use subscription's defaultModel
    model: text('model'),
    // 'low' | 'medium' | 'high' | 'xhigh' | 'max'
    effort: text('effort').default('medium'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    unique('messenger_agent_model_routing_agent_uniq').on(t.agentId),
    index('messenger_agent_model_routing_agent_idx').on(t.agentId),
    index('messenger_agent_model_routing_sub_idx').on(t.subscriptionId),
  ],
)

/**
 * Per-project skill enablement.
 * skillId is a free-form identifier ('code-review', 'summarize', 'translate', …).
 */
export const messengerProjectSkills = pgTable(
  'messenger_project_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    config: jsonb('config').notNull().default('{}'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    unique('messenger_project_skills_project_skill_uniq').on(t.projectId, t.skillId),
    index('messenger_project_skills_project_idx').on(t.projectId),
  ],
)

/**
 * Per-project plugin config.
 * pluginId matches the plugin registry key in useMessengerPlugins.
 */
export const messengerProjectPlugins = pgTable(
  'messenger_project_plugins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => messengerProjects.id, { onDelete: 'cascade' }),
    pluginId: text('plugin_id').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    config: jsonb('config').notNull().default('{}'),
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    unique('messenger_project_plugins_project_plugin_uniq').on(t.projectId, t.pluginId),
    index('messenger_project_plugins_project_idx').on(t.projectId),
  ],
)

export const messengerAgentTaskCompletions = pgTable(
  'messenger_agent_task_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => messengerAgents.id),
    slug: text('slug').notNull(),
    commitSha: text('commit_sha').notNull(),
    branch: text('branch').notNull(),
    commitsAboveBase: integer('commits_above_base').notNull(),
    gates: jsonb('gates').notNull().default('{}'),
    createdAt: tstz('created_at').defaultNow().notNull(),
  },
  (t) => [index('messenger_agent_task_completions_agent_idx').on(t.agentId)],
)
