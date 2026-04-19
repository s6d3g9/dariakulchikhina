import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  unique,
  customType,
} from 'drizzle-orm/pg-core'

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

export const messengerAgents = pgTable('messenger_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => messengerUsers.id),
  name: text('name').notNull(),
  description: text('description'),
  model: text('model'),
  ingestToken: text('ingest_token').notNull().unique(),
  config: jsonb('config').notNull().default('{}'),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: tstz('deleted_at'),
})

export const messengerAgentRuns = pgTable('messenger_agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => messengerAgents.id),
  parentRunId: uuid('parent_run_id'),
  conversationId: uuid('conversation_id')
    .references(() => messengerConversations.id),
  status: text('status').notNull().default('pending'),
  prompt: text('prompt'),
  model: text('model'),
  result: text('result'),
  error: text('error'),
  startedAt: tstz('started_at'),
  finishedAt: tstz('finished_at'),
  createdAt: tstz('created_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: tstz('deleted_at'),
})

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

export const messengerCliSessions = pgTable('messenger_cli_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => messengerAgents.id),
  runId: uuid('run_id').references(() => messengerAgentRuns.id),
  workroomSlug: text('workroom_slug'),
  model: text('model'),
  tmuxWindow: text('tmux_window'),
  claudeSessionUuid: text('claude_session_uuid'),
  logPath: text('log_path'),
  status: text('status').notNull().default('pending'),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: tstz('deleted_at'),
})
