/**
 * POST /api/ai/document-stream
 * SSE-стриминг генерации документа через Gemma 3 27B
 * Отдаёт токены по одному: data: {"token":"..."}\n\n
 * Завершает: data: [DONE]\n\n
 */

import { useDb } from '~/server/db/index'
import { projects, clients, contractors, pageContent } from '~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { retrieveLegalContextWithChunks, type LegalChunkWithScore } from '~/server/utils/rag'

const MODEL = 'gemma3:27b'
const DEFAULT_GEMMA_URL = 'http://localhost:11434'
const TIMEOUT_MS = 300_000 // 5 минут для стриминга

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body: any = await readNodeBody(event)
  const {
    action,
    templateName,
    templateText,
    fields,
    currentText,
    projectSlug,
    clientId,
    contractorId,
  } = body || {}

  if (!action || !['generate', 'improve'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'action должен быть generate или improve' })
  }

  // ── Собираем контекст ──────────────────────────────────────────
  const ctx = await buildStreamContext(projectSlug, clientId, contractorId)

  // ── Формируем промпты ─────────────────────────────────────────
  let userPrompt = ''
  if (action === 'generate') {
    userPrompt = buildStreamGeneratePrompt({ templateName, templateText, fields, ctx })
  } else {
    userPrompt = buildStreamImprovePrompt({ templateName, currentText, ctx })
  }

  // ── RAG: правовая база ────────────────────────────────────────
  const { context: legalCtx, chunks: legalChunks } = await retrieveLegalContextWithChunks(`${templateName} ${userPrompt.slice(0, 400)}`)
  const systemPrompt = STREAM_SYSTEM_PROMPT + legalCtx

  // ── SSE-заголовки ─────────────────────────────────────────────
  const res = event.node.res
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // отключить nginx буфер
  res.flushHeaders()

  // ── Вызов Ollama с stream: true ───────────────────────────────
  const gemmaUrl = process.env.GEMMA_URL || DEFAULT_GEMMA_URL
  const controller = new AbortController()
  const ollamaRes = await fetch(`${gemmaUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
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

  // Вспомогательная функция: отправить цитаты (если есть) и [DONE]
  function sendDone() {
    if (legalChunks.length) {
      const citations = legalChunks.map((c: LegalChunkWithScore) => ({
        source_name:   c.source_name,
        article_num:   c.article_num,
        article_title: c.article_title,
        chapter:       c.chapter,
        text:          c.text.slice(0, 300), // краткое превью
        similarity:    Math.round(Number(c.similarity) * 100) / 100,
      }))
      res.write(`data: ${JSON.stringify({ citations })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  }

  // Отправляем ping сразу чтобы браузер не оборвал соединение
  res.write(': ping\n\n')

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const raw = trimmed.slice(6)
        if (raw === '[DONE]') {
          sendDone()
          return null
        }

        try {
          const data = JSON.parse(raw)
          const token = data?.choices?.[0]?.delta?.content ?? ''
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`)
          }
          const finishReason = data?.choices?.[0]?.finish_reason
          if (finishReason === 'stop' || finishReason === 'length') {
            sendDone()
            return null
          }
        } catch {
          // ignore parse errors for incomplete chunks
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

// ── Системный промпт ──────────────────────────────────────────────────────
const STREAM_SYSTEM_PROMPT = `Ты — профессиональный юрист-ассистент и бизнес-редактор, специализирующийся на договорах и документах в сфере дизайна интерьеров.

Ты работаешь для «Студии дизайна Дарии Кульчихиной» (г. Москва).
Исполнитель по всем договорам — Кульчихина Дария Андреевна.

ПРАВИЛА:
1. Используй только российское законодательство (ГК РФ)
2. Язык — русский, официально-деловой стиль
3. Все денежные суммы дублируй: цифрами и прописью
4. Даты в формате ДД.ММ.ГГГГ
5. НЕ придумывай данные — используй только то, что есть в контексте
6. Незаполненные данные оставляй как «__________»
7. Возвращай ТОЛЬКО текст документа без пояснений и markdown-разметки
8. Сохраняй юридически корректную структуру документа
9. Нумеруй разделы (1. НАЗВАНИЕ РАЗДЕЛА, 1.1. Подпункт)`

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
