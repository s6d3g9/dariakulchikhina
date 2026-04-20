import type { ServerResponse } from 'node:http'
import { generateDocxBuffer } from '~/server/modules/documents/docx.service'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, z.object({
    text: z.string().max(500_000),
    title: z.string().max(500).optional(),
  }))
  const buffer = await generateDocxBuffer(body.text || '', body.title || 'Документ')
  const res = event.node!.res as ServerResponse
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(body.title || 'Документ')}.docx`)
  res.setHeader('Content-Length', buffer.length)
  res.end(buffer)
  return null
})
