import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users.ts'

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  status: text('status').default('lead').notNull(),
  projectType: text('project_type').default('apartment').notNull(),
  userId: integer('user_id').references(() => users.id),
  clientLogin: varchar('client_login', { length: 100 }).unique(),
  clientPasswordHash: text('client_password_hash'),
  clientRecoveryPhraseHash: text('client_recovery_phrase_hash'),
  pages: text('pages').array().default([]).notNull(),
  profile: jsonb('profile').$type<Record<string, string>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const pageConfigs = pgTable('page_configs', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  pageTitle: text('page_title'),
  fontSize: integer('font_size').default(16).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const pageContent = pgTable(
  'page_content',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    pageSlug: text('page_slug').notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().default({}).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique('page_content_project_page').on(t.projectId, t.pageSlug)],
)
