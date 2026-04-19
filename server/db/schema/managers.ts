import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { projects } from './projects.ts'

export const managers = pgTable('managers', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique(),
  name: text('name').notNull(),
  role: text('role'),
  phone: text('phone'),
  email: text('email'),
  telegram: text('telegram'),
  city: text('city'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const managerProjects = pgTable(
  'manager_projects',
  {
    id: serial('id').primaryKey(),
    managerId: integer('manager_id')
      .notNull()
      .references(() => managers.id, { onDelete: 'cascade' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    role: text('role').default('lead').notNull(),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (t) => [unique('manager_project_uniq').on(t.managerId, t.projectId)],
)
