/**
 * GET /api/ai/legal-status
 * Возвращает статистику правовой базы для отображения в интерфейсе.
 */
import { legalBaseReady } from '~/server/utils/rag'
import { useDb } from '~/server/db/index'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  try {
    const db     = useDb()

    // Статистика по источникам
    const sources = await db.execute(sql`
      SELECT
        source,
        source_name,
        COUNT(*)::int           AS total,
        COUNT(embedding)::int   AS indexed
      FROM legal_chunks
      GROUP BY source, source_name
      ORDER BY source
    `)

    const { ready, count } = await legalBaseReady()

    return {
      ready,
      totalChunks: count,
      sources: sources.rows,
    }
  } catch (err: any) {
    // Таблица ещё не создана
    if (err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
      return { ready: false, totalChunks: 0, sources: [], error: 'Таблица legal_chunks не создана. Запустите migrate-legal-chunks.mjs' }
    }
    throw err
  }
})
