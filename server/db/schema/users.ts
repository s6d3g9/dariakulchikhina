import { pgTable, serial, text, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core'
import type { DesignModulesConfig } from '~/shared/types/design-modules'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  login: varchar('login', { length: 100 }).unique(),
  passwordHash: text('password_hash').notNull(),
  recoveryPhraseHash: text('recovery_phrase_hash'),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const adminSettings = pgTable('admin_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').$type<DesignModulesConfig | Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
