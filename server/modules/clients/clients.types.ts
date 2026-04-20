import { z } from 'zod'

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  phone: z.string().max(50).nullable().optional().transform((v) => v?.trim() || null),
  email: z.string().max(200).nullable().optional().transform((v) => v?.trim() || null),
  messenger: z.string().max(100).nullable().optional().transform((v) => v?.trim() || null),
  messengerNick: z.string().max(100).nullable().optional().transform((v) => v?.trim() || null),
  address: z.string().max(500).nullable().optional().transform((v) => v?.trim() || null),
  notes: z.string().max(5000).nullable().optional().transform((v) => v?.trim() || null),
})
export type CreateClientInput = z.infer<typeof CreateClientSchema>

export const UpdateClientSchema = CreateClientSchema.extend({
  brief: z.record(z.unknown()).nullable().optional(),
})
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>

export const LinkProjectSchema = z.object({
  projectSlug: z.string().min(1).max(200),
})
export type LinkProjectInput = z.infer<typeof LinkProjectSchema>

export interface ListClientsOptions {
  projectSlug?: string
}

export interface UploadClientDocumentInput {
  clientId: number
  fileData: Buffer | Uint8Array
  filename: string | undefined
  mimeType: string | undefined
  title: string
  kind: string
  notes: string | null
}
