import { z } from 'zod'

export const CreateGallerySchema = z.object({
  title: z.string().min(1).max(500),
  category: z.string().min(1).max(200),
  image: z.string().max(500).nullable().optional(),
  images: z.array(z.string().max(500)).max(100).default([]),
  tags: z.array(z.string().max(100)).max(50).default([]),
  description: z.string().max(5000).nullable().optional(),
  featured: z.boolean().default(false),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().default(0),
  properties: z.record(z.unknown()).default({}),
})
export type CreateGalleryInput = z.infer<typeof CreateGallerySchema>

export const UpdateGallerySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  category: z.string().min(1).max(200).optional(),
  image: z.string().max(500).nullable().optional(),
  images: z.array(z.string().max(500)).max(100).optional(),
  tags: z.array(z.string().max(100)).max(50).optional(),
  description: z.string().max(5000).nullable().optional(),
  featured: z.boolean().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
  properties: z.record(z.unknown()).optional(),
})
export type UpdateGalleryInput = z.infer<typeof UpdateGallerySchema>

export const ReorderGallerySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number(),
        sortOrder: z.number(),
      }),
    )
    .max(1000),
})
export type ReorderGalleryInput = z.infer<typeof ReorderGallerySchema>

export interface ListGalleryOptions {
  category?: string
  tag?: string
  featured?: string
  search?: string
}
