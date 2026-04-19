import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { projects } from './projects.ts'

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  category: text('category').notNull().default('other'), // contract | act | invoice | template | other
  title: text('title').notNull(),
  filename: text('filename'),
  url: text('url'),
  notes: text('notes'),
  content: text('content'),
  templateKey: text('template_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Дополнительные услуги по проекту ───────────────────────────
export const projectExtraServices = pgTable('project_extra_services', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  requestedBy: text('requested_by').notNull().default('client'), // 'client' | 'admin'
  serviceKey: text('service_key'),
  title: text('title').notNull(),
  description: text('description'),
  quantity: text('quantity').notNull().default('1'),
  unit: text('unit').notNull().default('услуга'),
  unitPrice: integer('unit_price'),
  totalPrice: integer('total_price'),
  status: text('status').notNull().default('requested'),
  clientNotes: text('client_notes'),
  adminNotes: text('admin_notes'),
  contractDocId: integer('contract_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  invoiceDocId: integer('invoice_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
