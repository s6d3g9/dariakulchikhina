/**
 * Миграция: создаёт таблицу legal_chunks с pgvector для RAG-поиска по правовым текстам.
 * Запуск: node scripts/migrate-legal-chunks.mjs
 */
import postgres from 'postgres'
import 'dotenv/config'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL не задан')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

try {
  console.log('⚙️  Включаем расширение vector...')
  await sql`CREATE EXTENSION IF NOT EXISTS vector`

  console.log('📋 Создаём таблицу legal_chunks...')
  await sql`
    CREATE TABLE IF NOT EXISTS legal_chunks (
      id          SERIAL PRIMARY KEY,
      source      VARCHAR(50)   NOT NULL,
      source_name VARCHAR(200)  NOT NULL,
      article_num VARCHAR(50),
      article_title TEXT,
      chapter     TEXT,
      text        TEXT          NOT NULL,
      tokens_est  INTEGER,
      embedding   vector(768),
      created_at  TIMESTAMPTZ   DEFAULT NOW()
    )
  `

  console.log('🔍 Создаём HNSW индекс...')
  await sql`
    CREATE INDEX IF NOT EXISTS legal_chunks_embedding_idx
      ON legal_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
  `

  await sql`CREATE INDEX IF NOT EXISTS legal_chunks_source_idx ON legal_chunks (source)`

  console.log('✅ Миграция успешна!')
} catch (err) {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
} finally {
  await sql.end()
}
