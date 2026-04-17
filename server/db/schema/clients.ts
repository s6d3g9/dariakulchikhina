import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  messenger: text('messenger'),
  messengerNick: text('messenger_nick'),
  address: text('address'),
  notes: text('notes'),
  brief: jsonb('brief'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
