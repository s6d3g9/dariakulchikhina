import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { projects } from './projects'
import { clients } from './clients'
import { contractors } from './contractors'

export const designers = pgTable('designers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  companyName: text('company_name'),
  phone: text('phone'),
  email: text('email'),
  telegram: text('telegram'),
  website: text('website'),
  city: text('city'),
  experience: text('experience'),
  about: text('about'),
  specializations: text('specializations').array().default([]).notNull(),
  services: jsonb('services').$type<Record<string, unknown>[]>().default([]).notNull(),
  packages: jsonb('packages').$type<Record<string, unknown>[]>().default([]).notNull(),
  subscriptions: jsonb('subscriptions').$type<Record<string, unknown>[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const designerProjects = pgTable(
  'designer_projects',
  {
    id: serial('id').primaryKey(),
    designerId: integer('designer_id')
      .notNull()
      .references(() => designers.id, { onDelete: 'cascade' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    packageKey: text('package_key'),
    pricePerSqm: integer('price_per_sqm'),
    area: integer('area'),
    totalPrice: integer('total_price'),
    status: text('status').default('draft').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique('designer_project_uniq').on(t.designerId, t.projectId)],
)

export const designerProjectClients = pgTable(
  'designer_project_clients',
  {
    id: serial('id').primaryKey(),
    designerProjectId: integer('designer_project_id')
      .notNull()
      .references(() => designerProjects.id, { onDelete: 'cascade' }),
    clientId: integer('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
  },
  (t) => [unique('designer_project_client_uniq').on(t.designerProjectId, t.clientId)],
)

export const designerProjectContractors = pgTable(
  'designer_project_contractors',
  {
    id: serial('id').primaryKey(),
    designerProjectId: integer('designer_project_id')
      .notNull()
      .references(() => designerProjects.id, { onDelete: 'cascade' }),
    contractorId: integer('contractor_id')
      .notNull()
      .references(() => contractors.id, { onDelete: 'cascade' }),
    role: text('role'),
  },
  (t) => [unique('designer_project_contractor_uniq').on(t.designerProjectId, t.contractorId)],
)
