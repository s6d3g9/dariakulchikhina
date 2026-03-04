/**
 * Индексация российских правовых текстов для RAG.
 * Источник 1: scripts/legal-data/seed-articles.json (базовые статьи кодексов)
 * Источник 2: scripts/legal-data/seed-design-extra.json (расширенные: ИС, авторство, ФЗ)
 * Источник 3: scripts/legal-data/seed-design-glossary.json (глоссарий дизайна и архитектуры)
 *
 * Запуск:
 *   node scripts/legal-ingest.mjs            # индексирует все файлы
 *   node scripts/legal-ingest.mjs gk_rf      # только ГК РФ
 *   node scripts/legal-ingest.mjs design_glossary  # только глоссарий
 */
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const DATABASE_URL = process.env.DATABASE_URL
const OLLAMA_BASE  = process.env.GEMMA_URL || 'http://localhost:11434'
const EMBED_MODEL  = 'nomic-embed-text'
const BATCH_SIZE   = 10

if (!DATABASE_URL) {
  console.error('DATABASE_URL не задан')
  process.exit(1)
}

// ─── Embed через Ollama ───────────────────────────────────────────────────────
async function embed(text) {
  const resp = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 2000) }),
    signal:  AbortSignal.timeout(30_000),
  })
  if (!resp.ok) throw new Error(`Embed HTTP ${resp.status}`)
  const data = await resp.json()
  return data.embeddings[0]
}

// ─── Основной цикл ────────────────────────────────────────────────────────────
const db = postgres(DATABASE_URL)

async function ingestFromSeed(filterSource = null) {
  const seedPath     = resolve(__dirname, 'legal-data/seed-articles.json')
  const extraPath    = resolve(__dirname, 'legal-data/seed-design-extra.json')
  const glossaryPath = resolve(__dirname, 'legal-data/seed-design-glossary.json')
  const articles  = [
    ...JSON.parse(readFileSync(seedPath,     'utf8')),
    ...JSON.parse(readFileSync(extraPath,    'utf8')),
    ...JSON.parse(readFileSync(glossaryPath, 'utf8')),
  ]

  const filtered = filterSource
    ? articles.filter(a => a.source === filterSource || a.source.startsWith(filterSource + '_'))
    : articles

  if (!filtered.length) {
    console.error(`Нет статей для фильтра: ${filterSource}`)
    console.log('Доступные источники:', [...new Set(articles.map(a => a.source))].join(', '))
    return 0
  }

  // Группируем по source для красивого вывода
  const sources = [...new Set(filtered.map(a => a.source))]
  console.log(`\n📚 Источники: ${sources.join(', ')} (${filtered.length} статей)`)

  // Очищаем старые данные для этих источников
  for (const src of sources) {
    const del = await db`DELETE FROM legal_chunks WHERE source = ${src}`
    if (del.count > 0) console.log(`  🗑️  Удалено ${del.count} старых записей [${src}]`)
  }

  console.log(`  🧠 Эмбеддируем через ${EMBED_MODEL}...`)

  let saved = 0
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE)

    await Promise.all(batch.map(async (art) => {
      try {
        const embedding = await embed(art.text)
        const embStr    = `[${embedding.join(',')}]`

        await db`
          INSERT INTO legal_chunks
            (source, source_name, article_num, article_title, chapter, text, tokens_est, embedding)
          VALUES (
            ${art.source},
            ${art.source_name},
            ${art.article_num ?? null},
            ${art.article_title ?? null},
            ${art.chapter ?? null},
            ${art.text},
            ${Math.ceil(art.text.length / 4)},
            ${embStr}::vector
          )
        `
        saved++
      } catch (err) {
        console.warn(`    ⚠️  Пропуск [${art.source} ст.${art.article_num}]: ${err.message}`)
      }
    }))

    process.stdout.write(`\r  💾 ${saved}/${filtered.length} сохранено...`)
  }

  console.log(`\n  ✅ Готово: ${saved} статей проиндексировано`)
  return saved
}

// ─── Точка входа ──────────────────────────────────────────────────────────────
const filterKey = process.argv[2]?.trim()

console.log(`\n🚀 Индексация правовой базы`)
console.log(`   Ollama: ${OLLAMA_BASE}, модель: ${EMBED_MODEL}`)

const total = await ingestFromSeed(filterKey || null)
console.log(`\n🎉 Всего проиндексировано: ${total} статей`)
await db.end()
