/**
 * POST /api/ai/document-stream
 * SSE-стриминг генерации документа через Gemma 3 27B / Qwen 3 / Claude Haiku
 * provider авто-определяется по имени модели: claude-* → Anthropic, остальные → Ollama
 */

import type { ServerResponse } from 'node:http'
import { buildAiStreamContext } from '~/server/modules/ai/ai.service'
import { retrieveLegalContextWithChunks, type LegalChunkWithScore } from '~/server/utils/rag'
import { GEMMA_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from '~/server/utils/gemma-prompts'
import { z } from 'zod'

// Локальные модели по умолчанию
const MODEL_HEAVY  = process.env.OLLAMA_MODEL_HEAVY  || 'gemma3:27b'
const MODEL_CHAT   = process.env.OLLAMA_MODEL_CHAT   || 'qwen3:4b'
const DEFAULT_GEMMA_URL = 'http://localhost:11434'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const TIMEOUT_MS = 900_000 // 15 минут

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readValidatedNodeBody(event, z.object({
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
  }))
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
    aiModel,
  } = body

  // ── Собираем контекст (не нужен для простого чата) ──────────────
  const needsCtx = action !== 'chat'
  const ctx = needsCtx
    ? await buildAiStreamContext(projectSlug || '', clientId ? Number(clientId) : 0, contractorId ? Number(contractorId) : 0)
    : {}

  // ── Формируем промпты ─────────────────────────────────────────
  let userPrompt = ''
  if (action === 'generate') {
    userPrompt = buildStreamGeneratePrompt({ templateName: templateName || "", templateText, fields: fields as Record<string, string>, ctx })
  } else if (action === 'improve') {
    userPrompt = buildStreamImprovePrompt({ templateName: templateName || "", currentText, ctx })
  } else if (action === 'chat') {
    userPrompt = buildStreamChatPrompt({ templateName: templateName || "", currentText, customInstruction, ctx })
  } else if (action === 'continue') {
    userPrompt = buildStreamContinuePrompt({ templateName: templateName || "", currentText, ctx })
  } else {
    userPrompt = buildStreamReviewPrompt({ templateName: templateName || "", currentText })
  }

  // ── RAG: правовая база (пропускаем для chat — не нужно) ───────
  const needsRag = action !== 'chat'
  const { context: legalCtx, chunks: legalChunks } = needsRag
    ? await retrieveLegalContextWithChunks(`${templateName} ${userPrompt.slice(0, 400)}`)
    : { context: '', chunks: [] }

  // ── SSE-заголовки ─────────────────────────────────────────────
  const res = event.node!.res as ServerResponse
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // отключить nginx буфер
  res.flushHeaders()

  // ── Определяем провайдера по имени модели ─────────────────────
  const isAnthropicModel = typeof aiModel === 'string' && aiModel.startsWith('claude-')
  const isChat = action === 'chat'

  // Итоговая модель:
  // - если выбрана явно → используем её
  // - иначе → авто по типу действия (chat → лёгкая, остальное → тяжёлая)
  const chosenModel = isAnthropicModel
    ? aiModel
    : (aiModel || (isChat ? MODEL_CHAT : MODEL_HEAVY))

  const systemPrompt = isChat ? CHAT_SYSTEM_PROMPT : GEMMA_SYSTEM_PROMPT
  const userPromptFinal = legalCtx
    ? `${userPrompt}\n\n[ПРАВОВАЯ БАЗА]\n${legalCtx}`
    : userPrompt

  const decoder = new TextDecoder()
  let fullText = ''

  function sendDone(truncated = false) {
    if (action === 'review') {
      const notes = parseStreamReviewNotes(fullText)
      res.write(`data: ${JSON.stringify({ notes })}\n\n`)
    }
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
    if (truncated) res.write(`data: ${JSON.stringify({ truncated: true })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }

  res.write(': ping\n\n')

  // ── Маршрутизация: Anthropic vs Ollama ────────────────────────
  if (isAnthropicModel) {
    // ── Anthropic Claude API ──────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      res.write(`data: ${JSON.stringify({ error: 'ANTHROPIC_API_KEY не настроен на сервере' })}\n\n`)
      res.end()
      return null
    }

    let anthropicRes: Response
    // Sonnet поддерживает до 64K через beta-заголовок output-128k-2025-02-19
    const isSonnet = typeof chosenModel === 'string' && chosenModel.includes('sonnet')
    const maxTok = action === 'continue'
      ? (isSonnet ? 16000 : 8192)
      : isChat
      ? (isSonnet ? 8000 : 3000)
      : (isSonnet ? 12000 : 6000)
    try {
      anthropicRes = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          ...(isSonnet ? { 'anthropic-beta': 'output-128k-2025-02-19' } : {}),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          model: chosenModel,
          max_tokens: maxTok,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPromptFinal }],
          stream: true,
        }),
      })
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: 'Ошибка соединения с Anthropic: ' + err?.message })}\n\n`)
      res.end()
      return null
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => '')
      res.write(`data: ${JSON.stringify({ error: `Anthropic ${anthropicRes.status}: ${errText.slice(0, 300)}` })}\n\n`)
      res.end()
      return null
    }

    // Anthropic SSE: event: content_block_delta + data: {delta:{type:"text_delta",text:"..."}}
    //               event: message_delta + data: {delta:{stop_reason:"end_turn"|"max_tokens"}}
    const aReader = anthropicRes.body?.getReader()
    if (!aReader) { res.write('data: {"error":"no stream"}\n\n'); res.end(); return null }

    let aBuf = ''
    let currentEvt = ''
    try {
      while (true) {
        const { done, value } = await aReader.read()
        if (done) break
        aBuf += decoder.decode(value, { stream: true })
        const lines = aBuf.split('\n')
        aBuf = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvt = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6))
              if (currentEvt === 'content_block_delta' && d?.delta?.type === 'text_delta') {
                const token: string = d.delta.text ?? ''
                if (token) {
                  fullText += token
                  res.write(`data: ${JSON.stringify({ token })}\n\n`)
                }
              } else if (currentEvt === 'message_delta') {
                sendDone(d?.delta?.stop_reason === 'max_tokens')
                return null
              }
            } catch { /* ignore partial */ }
          }
        }
      }
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Ошибка стриминга Anthropic' })}\n\n`)
    } finally {
      aReader.cancel().catch(() => {})
      res.end()
    }
    return null
  }

  // ── Ollama native API ─────────────────────────────────────────
  const gemmaUrl = process.env.GEMMA_URL || DEFAULT_GEMMA_URL

  const ollamaRes = await fetch(`${gemmaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: chosenModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptFinal },
      ],
      stream: true,
      keep_alive: -1,
      think: false,
      options: {
        temperature:  0.3,
        num_predict:  action === 'continue' ? 16384 : isChat ? 4096 : 8192,
        num_ctx:      16384,
        num_batch:    512,
        num_thread:   12,
      },
    }),
  })

  if (!ollamaRes.ok) {
    const errText = await ollamaRes.text().catch(() => '')
    res.write(`data: ${JSON.stringify({ error: `Ollama error ${ollamaRes.status}: ${errText.slice(0, 200)}` })}\n\n`)
    res.end()
    return null
  }

  const reader = ollamaRes.body?.getReader()
  if (!reader) {
    res.write(`data: ${JSON.stringify({ error: 'Нет потока от Ollama' })}\n\n`)
    res.end()
    return null
  }

  let buffer = ''

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
          const token: string = data?.message?.content ?? ''
          if (token) {
            fullText += token
            res.write(`data: ${JSON.stringify({ token })}\n\n`)
          }
          if (data?.done === true) {
            const reason = data?.done_reason ?? 'stop'
            sendDone(reason === 'length')
            return null
          }
        } catch { /* неполный JSON */ }
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
  const text = opts.currentText || ''
  // Начало документа для контекста структуры + хвост для точки продолжения
  const head = text.slice(0, 600)
  const tail = text.slice(-1200)
  const hasGap = text.length > 1800
  const contextBlock = hasGap
    ? `${head}\n\n[...середина документа...]\n\n${tail}`
    : text

  return `ПРОДОЛЖИ документ «${opts.templateName}» с того места, где он прервался.

НЕ ПОВТОРЯЙ уже написанное — пиши ТОЛЬКО продолжение, начиная буквально со следующего слова после конца.
Доведи документ до полного завершения, включая все разделы, подписи и реквизиты.

ДОКУМЕНТ (начало + конец):
---
${contextBlock}
---

Продолжай:`
}

function buildStreamChatPrompt(opts: { templateName: string; currentText?: string; customInstruction?: string; ctx: Record<string, any> }): string {
  const doc = opts.currentText || ''
  const hasDoc = doc.length > 0

  if (!hasDoc) {
    return `ВОПРОС: ${opts.customInstruction || ''}`
  }

  let docSnippet = doc
  let truncNote = ''
  if (doc.length > 8000) {
    const half = 3800
    docSnippet = doc.slice(0, half) + '\n\n[...фрагмент скрыт — здесь середина документа...]\n\n' + doc.slice(-half)
    truncNote = '\n(Документ длинный, середина скрыта. Работай только с видимыми фрагментами.)'
  }

  return `Ты помогаешь редактировать документ «${opts.templateName}».${truncNote}

ДОКУМЕНТ (читай внимательно — тебе нужно найти в нём точный текст для замены):
---
${docSnippet}
---

ИНСТРУКЦИЯ ПОЛЬЗОВАТЕЛЯ: ${opts.customInstruction || ''}

ПРАВИЛА ОТВЕТА (строго соблюдай):
1. Найди в документе выше ТОЧНЫЙ текст, который нужно изменить
2. Выдай ТОЛЬКО патч-блок(и) — ничего больше
3. В <<<REPLACE>>> — скопируй текст из документа ДОСЛОВНО (символ в символ, с пробелами и знаками препинания)
4. В <<<WITH>>> — замену
5. ЗАПРЕЩЕНО: переписывать весь документ, добавлять пояснения

ПРИМЕР (когда просят "замени Иванов на Петров"):
<<<REPLACE>>>
Иванов
<<<WITH>>>
Петров
<<<END>>>`
}
