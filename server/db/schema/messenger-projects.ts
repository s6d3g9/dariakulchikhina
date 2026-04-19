import { pgTable, uuid, text, integer, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { messengerUsers } from './messenger.ts'

const tstz = (name: string) => timestamp(name, { withTimezone: true })

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
