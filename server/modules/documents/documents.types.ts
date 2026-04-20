import { z } from 'zod'

export const DocumentCategory = z.enum([
  'contract',
  'contract_supply',
  'contract_work',
  'act',
  'act_defect',
  'invoice',
  'estimate',
  'specification',
  'tz',
  'approval',
  'warranty',
  'photo_report',
  'correspondence',
  'template',
  'other',
])
export type DocumentCategoryInput = z.infer<typeof DocumentCategory>

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(500).transform((s) => s.trim()),
  category: DocumentCategory.default('other'),
  filename: z.string().max(500).nullable().optional(),
  url: z.string().max(1000).nullable().optional(),
  projectSlug: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  content: z.string().nullable().optional(),
  templateKey: z.string().max(100).nullable().optional(),
})
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).transform((s) => s.trim()).optional(),
  category: DocumentCategory.optional(),
  filename: z.string().max(500).nullable().optional(),
  url: z.string().max(1000).nullable().optional(),
  projectSlug: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  content: z.string().nullable().optional(),
  templateKey: z.string().max(100).nullable().optional(),
})
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>

export interface ListDocumentsOptions {
  category?: string
  projectSlug?: string
}

export interface DocumentContext {
  project: Record<string, unknown> | null
  clients: unknown[]
  contractors: unknown[]
  today: string
}
