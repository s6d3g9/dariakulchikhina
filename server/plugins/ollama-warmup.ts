import { GEMMA_SYSTEM_PROMPT } from '~/server/utils/gemma-prompts'

export default defineNitroPlugin(() => {
  const gemmaUrl = process.env.GEMMA_URL || 'http://localhost:11434'
  const model = 'gemma3:27b'

  setTimeout(async () => {
    try {
      console.log('[Ollama warmup] Прогреваем gemma3:27b...')
      const res = await fetch(`${gemmaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(300_000),
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: GEMMA_SYSTEM_PROMPT },
            { role: 'user', content: 'ок' },
          ],
          max_tokens: 5,
          stream: false,
          keep_alive: -1,
        }),
      })
      if (res.ok) {
        console.log('[Ollama warmup] ✓ Модель прогрета, KV системного промпта закэширован')
      } else {
        console.warn('[Ollama warmup] ответ', res.status)
      }
    } catch (e: any) {
      console.warn('[Ollama warmup] не удалось прогреть:', e?.message)
    }
  }, 3000)
})
