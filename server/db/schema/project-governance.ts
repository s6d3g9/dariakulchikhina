import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  unique,
} from 'drizzle-orm/pg-core'
import { projects } from './projects'

export const projectParticipants = pgTable(
  'project_participants',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceKind: text('source_kind').notNull().default('custom'),
    sourceId: integer('source_id'),
    roleKey: text('role_key').notNull().default('other'),
    displayName: text('display_name').notNull(),
    companyName: text('company_name'),
    phone: text('phone'),
    email: text('email'),
    messengerNick: text('messenger_nick'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    status: text('status').default('active').notNull(),
    notes: text('notes'),
    meta: jsonb('meta').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique('project_participant_source_uniq').on(t.projectId, t.sourceKind, t.sourceId)],
)

export const projectScopeAssignments = pgTable(
  'project_scope_assignments',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    participantId: integer('participant_id')
      .notNull()
      .references(() => projectParticipants.id, { onDelete: 'cascade' }),
    scopeType: text('scope_type').notNull(),
    scopeSource: text('scope_source').notNull(),
    scopeId: text('scope_id').notNull(),
    responsibility: text('responsibility').notNull().default('observer'),
    allocationPercent: integer('allocation_percent'),
    status: text('status').default('active').notNull(),
    dueDate: text('due_date'),
    notes: text('notes'),
    meta: jsonb('meta').$type<Record<string, unknown>>().default({}).notNull(),
    assignedBy: text('assigned_by'),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    unique('project_scope_assignment_uniq').on(
      t.projectId,
      t.participantId,
      t.scopeType,
      t.scopeSource,
      t.scopeId,
      t.responsibility,
    ),
  ],
)

export const projectScopeSettings = pgTable(
  'project_scope_settings',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    scopeType: text('scope_type').notNull(),
    scopeSource: text('scope_source').notNull(),
    scopeId: text('scope_id').notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique('project_scope_settings_uniq').on(t.projectId, t.scopeType, t.scopeSource, t.scopeId)],
)
