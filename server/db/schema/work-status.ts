import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { contractors } from './contractors'

export const workStatusItems = pgTable('work_status_items', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  contractorId: integer('contractor_id').references(() => contractors.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  workType: text('work_type'),
  status: text('status').default('pending').notNull(),
  dateStart: text('date_start'),
  dateEnd: text('date_end'),
  budget: text('budget'),
  notes: text('notes'),
  messenger: text('messenger'),
  messengerNick: text('messenger_nick'),
  website: text('website'),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const workStatusItemPhotos = pgTable('work_status_item_photos', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .notNull()
    .references(() => workStatusItems.id, { onDelete: 'cascade' }),
  contractorId: integer('contractor_id'),
  url: text('url').notNull(),
  caption: text('caption'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const workStatusItemComments = pgTable('work_status_item_comments', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .notNull()
    .references(() => workStatusItems.id, { onDelete: 'cascade' }),
  authorType: text('author_type').notNull(), // 'contractor' | 'admin'
  authorName: text('author_name').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
