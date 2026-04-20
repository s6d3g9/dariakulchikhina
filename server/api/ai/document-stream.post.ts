import type { ServerResponse } from 'node:http'
import { buildAiStreamContext } from '~/server/modules/ai/ai.service'
import { retrieveLegalContextWithChunks } from '~/server/modules/ai/rag.service'
import { buildUserPrompt } from '~/server/modules/ai/ai-stream-prompts'
import { streamAiDocument } from '~/server/modules/ai/ai-document-stream.service'
import { z } from 'zod'

const BodySchema = z.object({
  action: z.enum(['generate', 'improve', 'review', 'chat', 'continue']),
  templateName: z.string().max(500).optional(),
  templateText: z.string().max(200_000).optional(),
  fields: z.record(z.unknown()).optional(),
  currentText: z.string().max(500_000).optional(),
  customInstruction: z.string().max(10_000).optional(),
  projectSlug: z.string().max(200).optional(),
  clientId: z.union([z.string(), z.number()]).optional(),
  contractorId: z.union([z.string(), z.number()]).optional(),
  aiModel: z.string().max(100).optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, BodySchema)
  const { action, templateName, templateText, fields, currentText, customInstruction, projectSlug, clientId, contractorId, aiModel } = body
  const ctx = action !== 'chat'
    ? await buildAiStreamContext(projectSlug || '', clientId ? Number(clientId) : 0, contractorId ? Number(contractorId) : 0)
    : {}
  const userPrompt = buildUserPrompt(action, { templateName: templateName || '', templateText, fields: fields as Record<string, string>, currentText, customInstruction }, ctx)
  const { context: legalCtx, chunks: legalChunks } = action !== 'chat'
    ? await retrieveLegalContextWithChunks(`${templateName} ${userPrompt.slice(0, 400)}`)
    : { context: '', chunks: [] }
  const res = event.node!.res as ServerResponse
  await streamAiDocument(res, { action, aiModel, userPrompt, legalCtx, legalChunks })
  return null
})
