import type { ServerResponse } from 'node:http'
import type { LegalChunkWithScore } from './rag.service'
import { GEMMA_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from './gemma-prompts'
import { parseStreamReviewNotes } from './ai-stream-prompts'

const MODEL_HEAVY  = process.env.OLLAMA_MODEL_HEAVY  || 'gemma3:27b'
const MODEL_CHAT   = process.env.OLLAMA_MODEL_CHAT   || 'qwen3:4b'
const DEFAULT_GEMMA_URL = 'http://localhost:11434'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const TIMEOUT_MS = 900_000

type AiAction = 'generate' | 'improve' | 'review' | 'chat' | 'continue'

export interface AiDocStreamParams {
  action: AiAction
  aiModel?: string
  userPrompt: string
  legalCtx: string
  legalChunks: LegalChunkWithScore[]
}

export async function streamAiDocument(res: ServerResponse, params: AiDocStreamParams): Promise<void> {
  const { action, aiModel, userPrompt, legalCtx, legalChunks } = params
  const isChat = action === 'chat'
  const isAnthropicModel = typeof aiModel === 'string' && aiModel.startsWith('claude-')
  const chosenModel = isAnthropicModel
    ? aiModel
    : (aiModel || (isChat ? MODEL_CHAT : MODEL_HEAVY))

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const systemPrompt = isChat ? CHAT_SYSTEM_PROMPT : GEMMA_SYSTEM_PROMPT
  const userPromptFinal = legalCtx ? `${userPrompt}\n\n[ПРАВОВАЯ БАЗА]\n${legalCtx}` : userPrompt
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

  if (isAnthropicModel) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      res.write(`data: ${JSON.stringify({ error: 'ANTHROPIC_API_KEY не настроен на сервере' })}\n\n`)
      res.end()
      return
    }
    const isSonnet = typeof chosenModel === 'string' && chosenModel.includes('sonnet')
    const maxTok = action === 'continue'
      ? (isSonnet ? 16000 : 8192)
      : isChat ? (isSonnet ? 8000 : 3000) : (isSonnet ? 12000 : 6000)

    let anthropicRes: Response
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
        body: JSON.stringify({ model: chosenModel, max_tokens: maxTok, system: systemPrompt, messages: [{ role: 'user', content: userPromptFinal }], stream: true }),
      })
    } catch (err: unknown) {
      res.write(`data: ${JSON.stringify({ error: 'Ошибка соединения с Anthropic: ' + (err as Error)?.message })}\n\n`)
      res.end()
      return
    }
    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => '')
      res.write(`data: ${JSON.stringify({ error: `Anthropic ${anthropicRes.status}: ${errText.slice(0, 300)}` })}\n\n`)
      res.end()
      return
    }
    const aReader = anthropicRes.body?.getReader()
    if (!aReader) { res.write('data: {"error":"no stream"}\n\n'); res.end(); return }
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
                if (token) { fullText += token; res.write(`data: ${JSON.stringify({ token })}\n\n`) }
              } else if (currentEvt === 'message_delta') {
                sendDone(d?.delta?.stop_reason === 'max_tokens')
                return
              }
            } catch { /* ignore partial */ }
          }
        }
      }
    } catch (err: unknown) {
      res.write(`data: ${JSON.stringify({ error: (err as Error)?.message || 'Ошибка стриминга Anthropic' })}\n\n`)
    } finally {
      aReader.cancel().catch(() => {})
      res.end()
    }
    return
  }

  // Ollama native API
  const gemmaUrl = process.env.GEMMA_URL || DEFAULT_GEMMA_URL
  const ollamaRes = await fetch(`${gemmaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: chosenModel,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPromptFinal }],
      stream: true,
      keep_alive: -1,
      think: false,
      options: { temperature: 0.3, num_predict: action === 'continue' ? 16384 : isChat ? 4096 : 8192, num_ctx: 16384, num_batch: 512, num_thread: 12 },
    }),
  })
  if (!ollamaRes.ok) {
    const errText = await ollamaRes.text().catch(() => '')
    res.write(`data: ${JSON.stringify({ error: `Ollama error ${ollamaRes.status}: ${errText.slice(0, 200)}` })}\n\n`)
    res.end()
    return
  }
  const reader = ollamaRes.body?.getReader()
  if (!reader) {
    res.write(`data: ${JSON.stringify({ error: 'Нет потока от Ollama' })}\n\n`)
    res.end()
    return
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
          if (token) { fullText += token; res.write(`data: ${JSON.stringify({ token })}\n\n`) }
          if (data?.done === true) { sendDone(data?.done_reason === 'length'); return }
        } catch { /* неполный JSON */ }
      }
    }
  } catch (err: unknown) {
    res.write(`data: ${JSON.stringify({ error: (err as Error)?.message || 'Ошибка стриминга' })}\n\n`)
  } finally {
    reader.cancel().catch(() => {})
    res.end()
  }
}
