import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core'
import { projects } from './projects'

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
})

export const galleryItems = pgTable('gallery_items', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  image: text('image'),
  /** Дополнительные изображения (JSON-массив filename) */
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  tags: text('tags').array().default([]).notNull(),
  description: text('description'),
  /** Избранный / Featured */
  featured: boolean('featured').default(false).notNull(),
  /** Ширина основного изображения (px) */
  width: integer('width'),
  /** Высота основного изображения (px) */
  height: integer('height'),
  /** Структурированные свойства материала */
  properties: jsonb('properties').$type<Record<string, unknown>>().default({}).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
