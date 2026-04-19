import { pgTable, uuid, text, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { messengerProjects } from './messenger-projects.ts'

const tstz = (name: string) => timestamp(name, { withTimezone: true })

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
