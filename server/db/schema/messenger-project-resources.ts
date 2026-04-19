import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { messengerProjects } from './messenger-projects.ts'

const tstz = (name: string) => timestamp(name, { withTimezone: true })

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
