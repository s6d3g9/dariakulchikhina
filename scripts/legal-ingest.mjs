/**
 * Индексация российских правовых текстов для RAG.
 * Скачивает кодексы, нарезает по статьям, эмбеддит через nomic-embed-text,
 * сохраняет в PostgreSQL (legal_chunks).
 *
 * Запуск:
 *   node scripts/legal-ingest.mjs [source_key]
 *
 * Пример:
 *   node scripts/legal-ingest.mjs gk_rf       # один источник
 *   node scripts/legal-ingest.mjs              # все источники
 */
import postgres from 'postgres'
import 'dotenv/config'

const DATABASE_URL = process.env.DATABASE_URL
const OLLAMA_BASE  = process.env.GEMMA_URL || 'http://localhost:11434'
const EMBED_MODEL  = 'nomic-embed-text'
const BATCH_SIZE   = 10   // одновременных запросов к Ollama
const MAX_CHUNK    = 1200 // символов в чанке
const MIN_CHUNK    = 80   // короче — пропускаем

if (!DATABASE_URL) {
  console.error('DATABASE_URL не задан')
  process.exit(1)
}

// ─── Источники ──────────────────────────────────────────────────────────────
// consultant.ru /document/ — отдаёт полный статический HTML с текстами статей
const BASE = 'https://www.consultant.ru/document'
const SOURCES = [
  {
    key:  'gk_rf_1',
    name: 'Гражданский кодекс РФ (ч.1)',
    urls: [`${BASE}/cons_doc_LAW_5142/`],
  },
  {
    key:  'gk_rf_2',
    name: 'Гражданский кодекс РФ (ч.2)',
    urls: [`${BASE}/cons_doc_LAW_9027/`],
  },
  {
    key:  'gk_rf_3',
    name: 'Гражданский кодекс РФ (ч.3)',
    urls: [`${BASE}/cons_doc_LAW_34154/`],
  },
  {
    key:  'gk_rf_4',
    name: 'Гражданский кодекс РФ (ч.4)',
    urls: [`${BASE}/cons_doc_LAW_64629/`],
  },
  {
    key:  'gradko',
    name: 'Градостроительный кодекс РФ',
    urls: [`${BASE}/cons_doc_LAW_51040/`],
  },
  {
    key:  'zpz',
    name: 'Закон РФ «О защите прав потребителей»',
    urls: [`${BASE}/cons_doc_LAW_305/`],
  },
  {
    key:  'uk_rf',
    name: 'Уголовный кодекс РФ',
    urls: [`${BASE}/cons_doc_LAW_10699/`],
  },
  {
    key:  'nk_rf_1',
    name: 'Налоговый кодекс РФ (ч.1)',
    urls: [`${BASE}/cons_doc_LAW_19671/`],
  },
  {
    key:  'nk_rf_2',
    name: 'Налоговый кодекс РФ (ч.2)',
    urls: [`${BASE}/cons_doc_LAW_28165/`],
  },
]

// ─── HTML → текст ────────────────────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?(p|br|div|li|tr|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Скачать HTML ─────────────────────────────────────────────────────────────
async function fetchHtml(url) {
  console.log(`  ↓ ${url}`)
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept':     'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
    signal: AbortSignal.timeout(60_000),
    redirect: 'follow',
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status} для ${url}`)
  return resp.text()
}

// ─── Нарезать по статьям ──────────────────────────────────────────────────────
function splitIntoChunks(text) {
  // Паттерн начала статьи: "Статья 123." или "Статья 123.1."
  const ARTICLE_RE = /(?=\bСтатья\s+\d+[\d.]*\.?\s)/g
  const parts = text.split(ARTICLE_RE).filter(p => p.trim().length > MIN_CHUNK)

  const chunks = []
  for (const part of parts) {
    const cleaned   = part.replace(/\s+/g, ' ').trim()

    // Определяем номер статьи
    const numMatch  = cleaned.match(/^Статья\s+(\d+[\d.]*)/i)
    const articleNum  = numMatch ? numMatch[1] : null

    // Первая строка — заголовок
    const lines       = cleaned.split('\n')
    const firstLine   = lines[0].trim()
    const isTitle     = firstLine.length < 200 && !firstLine.endsWith('.')
    const articleTitle = isTitle ? firstLine : null

    if (cleaned.length <= MAX_CHUNK) {
      chunks.push({ articleNum, articleTitle, text: cleaned, chapter: null })
    } else {
      // Длинную статью нарезаем по абзацам
      const paras = cleaned.split(/\n\n+/)
      let buf = ''
      let idx = 0
      for (const para of paras) {
        if (buf.length + para.length > MAX_CHUNK && buf) {
          chunks.push({
            articleNum: articleNum ? `${articleNum}/${++idx}` : null,
            articleTitle,
            text: buf.trim(),
            chapter: null,
          })
          buf = para
        } else {
          buf += (buf ? '\n\n' : '') + para
        }
      }
      if (buf.trim().length > MIN_CHUNK) {
        chunks.push({
          articleNum: articleNum ? `${articleNum}/${++idx}` : null,
          articleTitle,
          text: buf.trim(),
          chapter: null,
        })
      }
    }
  }
  return chunks
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

async function ingestSource(source) {
  console.log(`\n📚 ${source.name} (${source.key})`)

  // Удаляем старые данные
  const deleted = await db`DELETE FROM legal_chunks WHERE source = ${source.key}`
  console.log(`  🗑️  Удалено ${deleted.count} старых чанков`)

  let allChunks = []

  for (const url of source.urls) {
    try {
      const html   = await fetchHtml(url)
      const text   = stripHtml(html)
      const chunks = splitIntoChunks(text)
      allChunks    = allChunks.concat(chunks)
      console.log(`  ✂️  Нарезано ${chunks.length} чанков из ${url}`)
    } catch (err) {
      console.error(`  ⚠️  Ошибка: ${err.message}`)
    }
  }

  if (!allChunks.length) {
    console.error(`  ❌ Не удалось получить данные для ${source.key}`)
    return 0
  }

  console.log(`  🔢 Всего чанков: ${allChunks.length}`)
  console.log(`  🧠 Эмбеддируем через ${EMBED_MODEL}...`)

  let saved = 0
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE)

    await Promise.all(batch.map(async (chunk) => {
      try {
        const embedding = await embed(chunk.text)
        const embStr    = `[${embedding.join(',')}]`

        await db`
          INSERT INTO legal_chunks
            (source, source_name, article_num, article_title, chapter, text, tokens_est, embedding)
          VALUES (
            ${source.key},
            ${source.name},
            ${chunk.articleNum},
            ${chunk.articleTitle},
            ${chunk.chapter},
            ${chunk.text},
            ${Math.ceil(chunk.text.length / 4)},
            ${embStr}::vector
          )
        `
        saved++
      } catch (err) {
        console.warn(`    ⚠️  Пропуск чанка: ${err.message}`)
      }
    }))

    process.stdout.write(`\r  💾 ${saved}/${allChunks.length} сохранено...`)
  }

  console.log(`\n  ✅ ${source.key}: ${saved} чанков сохранено`)
  return saved
}

// ─── Точка входа ──────────────────────────────────────────────────────────────
const filterKey = process.argv[2]?.trim()
const toIngest  = filterKey
  ? SOURCES.filter(s => s.key === filterKey)
  : SOURCES

if (!toIngest.length) {
  console.error(`Источник не найден: ${filterKey}`)
  console.log('Доступные:', SOURCES.map(s => s.key).join(', '))
  process.exit(1)
}

console.log(`\n🚀 Начинаем индексацию: ${toIngest.map(s => s.key).join(', ')}`)
console.log(`   Ollama: ${OLLAMA_BASE}, модель: ${EMBED_MODEL}`)

let total = 0
for (const source of toIngest) {
  total += await ingestSource(source)
}

console.log(`\n🎉 Готово! Всего индексировано чанков: ${total}`)
await db.end()
