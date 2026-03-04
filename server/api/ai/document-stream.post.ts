/**
 * POST /api/ai/document-stream
 * SSE-стриминг генерации документа через Gemma 3 27B / Qwen 3 14B
 * Отдаёт токены по одному: data: {"token":"..."}\n\n
 * Завершает: data: [DONE]\n\n
 */

import { useDb } from '~/server/db/index'
import { projects, clients, contractors, pageContent } from '~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { retrieveLegalContextWithChunks, type LegalChunkWithScore } from '~/server/utils/rag'
import { GEMMA_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from '~/server/utils/gemma-prompts'

// chat использует qwen3:14b — вдвое меньше, вдвое быстрее для коротких ответов
const MODEL_HEAVY  = process.env.OLLAMA_MODEL_HEAVY  || 'gemma3:27b'
const MODEL_CHAT   = process.env.OLLAMA_MODEL_CHAT   || 'qwen3:14b'
const DEFAULT_GEMMA_URL = 'http://localhost:11434'
const TIMEOUT_MS = 900_000 // 15 минут

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body: any = await readNodeBody(event)
  const {
    action,
    templateName,
    templateText,
    fields,
    currentText,
    customInstruction,
    projectSlug,
    clientId,
    contractorId,
  } = body || {}

  if (!action || !['generate', 'improve', 'review', 'chat', 'continue'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'action должен быть generate, improve, review, chat или continue' })
  }

  // ── Собираем контекст (не нужен для простого чата) ──────────────
  const needsCtx = action !== 'chat'
  const ctx = needsCtx
    ? await buildStreamContext(projectSlug, clientId, contractorId)
    : {}

  // ── Формируем промпты ─────────────────────────────────────────
  let userPrompt = ''
  if (action === 'generate') {
    userPrompt = buildStreamGeneratePrompt({ templateName, templateText, fields, ctx })
  } else if (action === 'improve') {
    userPrompt = buildStreamImprovePrompt({ templateName, currentText, ctx })
  } else if (action === 'chat') {
    userPrompt = buildStreamChatPrompt({ templateName, currentText, customInstruction, ctx })
  } else if (action === 'continue') {
    userPrompt = buildStreamContinuePrompt({ templateName, currentText, ctx })
  } else {
    userPrompt = buildStreamReviewPrompt({ templateName, currentText })
  }

  // ── RAG: правовая база (пропускаем для chat — не нужно) ───────
  const needsRag = action !== 'chat'
  const { context: legalCtx, chunks: legalChunks } = needsRag
    ? await retrieveLegalContextWithChunks(`${templateName} ${userPrompt.slice(0, 400)}`)
    : { context: '', chunks: [] }

  const isChat = action === 'chat'
  // system промпт всегда одинаковый — Ollama кэширует KV
  // chat использует облегчённый промпт без документных правил
  const systemPrompt = isChat ? CHAT_SYSTEM_PROMPT : GEMMA_SYSTEM_PROMPT
  // RAG переносим в user-часть чтобы system не менялся
  const userPromptFinal = legalCtx
    ? `${userPrompt}\n\n[ПРАВОВАЯ БАЗА]\n${legalCtx}`
    : userPrompt

  // ── SSE-заголовки ─────────────────────────────────────────────
  const res = event.node.res
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // отключить nginx буфер
  res.flushHeaders()

  // ── Вызов Ollama native API ───────────────────────────────────
  const gemmaUrl = process.env.GEMMA_URL || DEFAULT_GEMMA_URL
  // chat → qwen3:14b (быстрее), тяжёлые документы → gemma3:27b
  const model = isChat ? MODEL_CHAT : MODEL_HEAVY

  const ollamaRes = await fetch(`${gemmaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptFinal },
      ],
      stream: true,
      keep_alive: -1,
      think: false, // отключить COT у qwen3 (иначе добавляет <think>...</think>)
      options: {
        temperature:  0.3,
        num_predict:  isChat ? 1024 : 4096, // лимит токенов
        num_ctx:      isChat ? 2048 : 8192, // контекстное окно: меньше → быстрее prefill
        num_thread:   12,                   // явно все доступные CPU ядра
      },
    }),
  })

  if (!ollamaRes.ok) {
    const errText = await ollamaRes.text().catch(() => '')
    res.write(`data: ${JSON.stringify({ error: `Gemma error ${ollamaRes.status}: ${errText.slice(0, 200)}` })}\n\n`)
    res.end()
    return null
  }

  // ── Читаем NDJSON-поток от Ollama и пишем SSE ─────────────────
  const reader = ollamaRes.body?.getReader()
  if (!reader) {
    res.write(`data: ${JSON.stringify({ error: 'Нет потока от Ollama' })}\n\n`)
    res.end()
    return null
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = '' // для парсинга notes в review

  // Вспомогательная функция: отправить мета-данные и [DONE]
  function sendDone(truncated = false) {
    // review → парсим замечания из накопленного текста
    if (action === 'review') {
      const notes = parseStreamReviewNotes(fullText)
      res.write(`data: ${JSON.stringify({ notes })}\n\n`)
    }
    // generate/improve/continue → отправляем цитаты из RAG
    if (!['review', 'chat'].includes(action) && legalChunks.length) {
      const citations = legalChunks.map((c: LegalChunkWithScore) => ({
        source_name:   c.source_name,
        article_num:   c.article_num,
        article_title: c.article_title,
        chapter:       c.chapter,
        text:          c.text.slice(0, 300),
        similarity:    Math.round(Number(c.similarity) * 100) / 100,
      }))
      res.write(`data: ${JSON.stringify({ citations })}\n\n`)
    }
    if (truncated) {
      res.write(`data: ${JSON.stringify({ truncated: true })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  }

  // Отправляем ping сразу чтобы браузер не оборвал соединение
  res.write(': ping\n\n')

  // ── Читаем NDJSON-поток от Ollama native API ──────────────────
  // Каждая строка — отдельный JSON: {message:{content:"..."}, done:false}
  // Последняя строка: {done:true, done_reason:"stop"|"length", ...}
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          const data = JSON.parse(trimmed)
          // токены контента (qwen3 с think:false не даёт <think>, но на всякий случай фильтруем)
          const token: string = data?.message?.content ?? ''
          if (token) {
            fullText += token
            res.write(`data: ${JSON.stringify({ token })}\n\n`)
          }
          // финишная строка
          if (data?.done === true) {
            const reason = data?.done_reason ?? 'stop'
            sendDone(reason === 'length')
            return null
          }
        } catch {
          // неполный JSON — пропускаем
        }
      }
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err?.message || 'Ошибка стриминга' })}\n\n`)
  } finally {
    reader.cancel().catch(() => {})
    res.end()
  }

  return null
})

// ── Парсинг замечаний review из стримингового текста ────────────────────────
function parseStreamReviewNotes(text: string): Array<{ type: 'error' | 'info'; text: string }> {
  const notes: Array<{ type: 'error' | 'info'; text: string }> = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (line.startsWith('⚠️') || line.startsWith('❌')) {
      notes.push({ type: 'error', text: line.replace(/^[⚠️❌]\s*/, '') })
    } else if (line.startsWith('💡') || line.startsWith('✅') || line.startsWith('ℹ️')) {
      notes.push({ type: 'info', text: line.replace(/^[💡✅ℹ️]\s*/, '') })
    } else if (line.length > 10 && !line.startsWith('---') && !line.startsWith('ДОКУМЕНТ')) {
      notes.push({ type: 'info', text: line })
    }
  }
  return notes.length ? notes : [{ type: 'info', text: text.slice(0, 500) }]
}

// ── Промпт для review ─────────────────────────────────────────────────────
function buildStreamReviewPrompt(opts: { templateName: string; currentText?: string }): string {
  return `Проверь следующий документ «${opts.templateName}» и составь список замечаний.\n\nДОКУМЕНТ:\n---\n${opts.currentText || '(пустой документ)'}\n---\n\nПроверь и перечисли замечания в формате:\n⚠️ [описание проблемы]\n💡 [предложение по улучшению]\n\nПроверяй:\n- Незаполненные поля (__________)\n- Отсутствующие обязательные разделы\n- Юридические риски и неточности\n- Несоответствия в данных (суммы, даты, ФИО)\n- Отсутствие подписей, реквизитов, печатей\n- Некорректные формулировки по ГК РФ\n\nЕсли документ в порядке, напиши: ✅ Документ составлен корректно.`
}

// ── Системный промпт ──────────────────────────────────────────────────────
// ── Контекст из БД ────────────────────────────────────────────────────────
async function buildStreamContext(projectSlug: string, clientId: number, contractorId: number) {
  const db = useDb()
  const ctx: Record<string, any> = {}

  if (projectSlug) {
    const [proj] = await db.select().from(projects).where(eq(projects.slug, projectSlug)).limit(1)
    if (proj) {
      const profile = (proj.profile || {}) as Record<string, any>
      ctx.project = {
        title: proj.title,
        objectAddress: profile.objectAddress || '',
        objectType: profile.objectType || '',
        objectArea: profile.objectArea || '',
        budget: profile.budget || '',
        deadline: profile.deadline || '',
        style: profile.style || '',
        client_name: profile.client_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        passport_series: profile.passport_series || '',
        passport_number: profile.passport_number || '',
        passport_issued_by: profile.passport_issued_by || '',
        passport_issue_date: profile.passport_issue_date || '',
        passport_registration_address: profile.passport_registration_address || '',
        passport_inn: profile.passport_inn || '',
      }

      const pages = await db.select().from(pageContent).where(eq(pageContent.projectId, proj.id))
      ctx.pages = {}
      for (const pg of pages) {
        if (['first-contact', 'smart-brief', 'client-tz', 'moodboard', 'specifications'].includes(pg.pageSlug || '')) {
          const clean: Record<string, string> = {}
          for (const [k, v] of Object.entries((pg.content || {}) as Record<string, any>)) {
            if (v && (typeof v === 'string' || typeof v === 'number')) clean[k] = String(v)
          }
          if (Object.keys(clean).length) ctx.pages[pg.pageSlug!] = clean
        }
      }
    }
  }

  if (clientId) {
    const [c] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1)
    if (c) ctx.client = c
  }

  if (contractorId) {
    const [c] = await db.select().from(contractors).where(eq(contractors.id, contractorId)).limit(1)
    if (c) ctx.contractor = c
  }

  return ctx
}

// ── Форматирование контекста ──────────────────────────────────────────────
function formatStreamCtx(ctx: Record<string, any>): string {
  const lines: string[] = []
  if (ctx.project) {
    const p = ctx.project
    lines.push('ДАННЫЕ ПРОЕКТА:')
    if (p.objectType || p.objectAddress) lines.push(`  Объект: ${p.objectType} ${p.objectArea ? p.objectArea + ' кв.м' : ''} ${p.objectAddress}`.trim())
    if (p.budget)   lines.push(`  Бюджет: ${p.budget}`)
    if (p.deadline) lines.push(`  Срок: ${p.deadline}`)
    if (p.style)    lines.push(`  Стиль: ${p.style}`)
    if (p.client_name) lines.push(`  ФИО клиента: ${p.client_name}`)
    if (p.phone)    lines.push(`  Тел: ${p.phone}`)
    if (p.passport_series || p.passport_number) lines.push(`  Паспорт: ${p.passport_series} ${p.passport_number}`.trim())
    if (p.passport_issued_by) lines.push(`  Выдан: ${p.passport_issued_by} ${p.passport_issue_date}`.trim())
    if (p.passport_registration_address) lines.push(`  Прописка: ${p.passport_registration_address}`)
  }
  if (ctx.client) {
    const c = ctx.client
    lines.push('\nКЛИЕНТ:')
    if (c.name)    lines.push(`  ФИО: ${c.name}`)
    if (c.phone)   lines.push(`  Тел: ${c.phone}`)
    if (c.address) lines.push(`  Адрес: ${c.address}`)
  }
  if (ctx.contractor) {
    const c = ctx.contractor
    lines.push('\nПОДРЯДЧИК:')
    if (c.companyName || c.name) lines.push(`  Компания: ${c.companyName || c.name}`)
    if (c.inn) lines.push(`  ИНН: ${c.inn}`)
    if (c.legalAddress) lines.push(`  Адрес: ${c.legalAddress}`)
    if (c.bankName)       lines.push(`  Банк: ${c.bankName}`)
    if (c.settlementAccount) lines.push(`  Счёт: ${c.settlementAccount}`)
    if (c.bik) lines.push(`  БИК: ${c.bik}`)
  }
  if (ctx.pages) {
    const LABELS: Record<string, string> = { 'first-contact': 'Первый контакт', 'smart-brief': 'Бриф', 'client-tz': 'ТЗ', moodboard: 'Концепция', specifications: 'Спецификации' }
    for (const [slug, data] of Object.entries(ctx.pages as Record<string, Record<string, string>>)) {
      lines.push(`\n${LABELS[slug] || slug}:`)
      for (const [k, v] of Object.entries(data)) lines.push(`  ${k}: ${v}`)
    }
  }
  return lines.join('\n')
}

function buildStreamGeneratePrompt(opts: { templateName: string; templateText?: string; fields?: Record<string, string>; ctx: Record<string, any> }): string {
  const ctxText = formatStreamCtx(opts.ctx)
  const filled = Object.entries(opts.fields || {}).filter(([, v]) => v?.trim()).map(([k, v]) => `  ${k}: ${v}`).join('\n')
  return `Сгенерируй документ: «${opts.templateName}».

${ctxText ? ctxText + '\n' : ''}${filled ? '\nЗАПОЛНЕННЫЕ ПОЛЯ:\n' + filled + '\n' : ''}
ШАБЛОН (возьми за основу):
---
${opts.templateText || ''}
---

Создай полный, готовый к печати документ.`
}

function buildStreamImprovePrompt(opts: { templateName: string; currentText?: string; ctx: Record<string, any> }): string {
  const ctxText = formatStreamCtx(opts.ctx)
  return `Улучши документ «${opts.templateName}».

${ctxText ? 'КОНТЕКСТ:\n' + ctxText + '\n' : ''}
ТЕКУЩИЙ ДОКУМЕНТ:
---
${opts.currentText || ''}
---

Заполни пропуски, исправь формулировки, добавь недостающие пункты. Верни только готовый документ.`
}

function buildStreamContinuePrompt(opts: { templateName: string; currentText?: string; ctx: Record<string, any> }): string {
  const tail = (opts.currentText || '').slice(-800)
  return `ПРОДОЛЖИ документ «${opts.templateName}» с того места, где он прервался.

НЕ ПОВТОРЯЙ уже написанное — пиши ТОЛЬКО продолжение, начиная буквально со следующего слова после конца.

КОНЕЦ УЖЕ НАПИСАННОГО:
---
${tail}
---

Продолжай:`
}

function buildStreamChatPrompt(opts: { templateName: string; currentText?: string; customInstruction?: string; ctx: Record<string, any> }): string {
  // Передаём только хвост документа чтобы не раздувать контекст
  const docSnippet = opts.currentText ? opts.currentText.slice(-1200) : ''
  return `Ты помогаешь редактировать документ «${opts.templateName}».

${docSnippet ? 'ТЕКУЩИЙ ДОКУМЕНТ (фрагмент):\n---\n' + docSnippet + '\n---\n\n' : ''}ИНСТРУКЦИЯ ПОЛЬЗОВАТЕЛЯ: ${opts.customInstruction || ''}

Выполни инструкцию пользователя. Если нужно изменить документ — верни только полный обновлённый документ. Если пользователь задаёт вопрос — ответь кратко.`
}
