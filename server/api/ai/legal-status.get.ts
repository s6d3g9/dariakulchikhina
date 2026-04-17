import { getLegalStatus } from '~/server/modules/ai/ai.service'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  try {
    return await getLegalStatus()
  } catch (err: any) {
    if (err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
      return { ready: false, totalChunks: 0, sources: [], error: 'Таблица legal_chunks не создана. Запустите migrate-legal-chunks.mjs' }
    }
    throw err
  }
})
