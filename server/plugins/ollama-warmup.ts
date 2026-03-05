import { GEMMA_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from '~/server/utils/gemma-prompts'

const GEMMA_URL = process.env.GEMMA_URL || 'http://localhost:11434'

async function warmModel(model: string, systemPrompt: string, numCtx: number) {
  const res = await fetch(`${GEMMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(300_000),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'ок' },
      ],
      stream: false,
      keep_alive: -1,
      think: false,
      options: { num_predict: 3, num_ctx: numCtx, num_thread: 12, num_batch: 512 },
    }),
  })
  return res.ok
}

export default defineNitroPlugin(() => {
  setTimeout(async () => {
    try {
      console.log('[Ollama warmup] Прогреваем qwen3:4b (chat)...')
      const ok1 = await warmModel('qwen3:4b', CHAT_SYSTEM_PROMPT, 2048)
      console.log(ok1 ? '[Ollama warmup] ✓ qwen3:4b готов' : '[Ollama warmup] ⚠ qwen3:4b не ответил')
    } catch (e: any) {
      console.warn('[Ollama warmup] qwen3:4b:', e?.message)
    }
    try {
      console.log('[Ollama warmup] Прогреваем gemma3:27b (documents)...')
      const ok2 = await warmModel('gemma3:27b', GEMMA_SYSTEM_PROMPT, 8192)
      console.log(ok2 ? '[Ollama warmup] ✓ gemma3:27b готов' : '[Ollama warmup] ⚠ gemma3:27b не ответил')
    } catch (e: any) {
      console.warn('[Ollama warmup] gemma3:27b:', e?.message)
    }
  }, 3000)
})
