/**
 * useAiDocument — composable для интеграции Gemma 3 27B с генератором документов
 * Поддерживает стриминг (SSE) для generate/improve и обычный fetch для review
 */

export interface AiReviewNote {
  type: 'error' | 'info'
  text: string
}

export type AiPayload = {
  templateKey?: string
  templateName: string
  templateText?: string
  fields?: Record<string, string>
  currentText?: string
  projectSlug?: string
  clientId?: number
  contractorId?: number
}

export function useAiDocument() {
  const aiLoading   = ref(false)
  const aiError     = ref('')
  const aiAction    = ref<'generate' | 'improve' | 'review' | ''>('')
  const aiProgress  = ref('')   // текущий статус-текст для пользователя
  const aiReviewNotes = ref<AiReviewNote[]>([])

  let _abortCtrl: AbortController | null = null

  function _setError(msg: string) {
    aiError.value = msg
    setTimeout(() => { aiError.value = '' }, 6000)
  }

  // ── СТРИМИНГ (generate / improve) ─────────────────────────────────────
  async function streamDocument(
    action: 'generate' | 'improve',
    payload: AiPayload,
    onToken: (token: string) => void,
  ): Promise<boolean> {
    aiLoading.value = true
    aiError.value = ''
    aiAction.value = action
    aiProgress.value = action === 'generate' ? 'Gemma генерирует документ...' : 'Gemma улучшает текст...'
    _abortCtrl = new AbortController()

    try {
      const resp = await fetch('/api/ai/document-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: _abortCtrl.signal,
        body: JSON.stringify({ action, ...payload }),
      })

      if (!resp.ok) {
        const err = await resp.text().catch(() => '')
        _setError(`Ошибка ${resp.status}: ${err.slice(0, 200)}`)
        return false
      }

      const reader = resp.body?.getReader()
      if (!reader) { _setError('Нет потока от сервера'); return false }

      const decoder = new TextDecoder()
      let buffer = ''
      let tokenCount = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') {
            aiProgress.value = `✓ Готово (${tokenCount} символов)`
            setTimeout(() => { aiProgress.value = '' }, 2000)
            return true
          }
          try {
            const data = JSON.parse(raw)
            if (data.error) { _setError(data.error); return false }
            if (data.token) {
              onToken(data.token)
              tokenCount += data.token.length
              if (tokenCount % 200 === 0) aiProgress.value = `Gemma пишет... ${tokenCount} символов`
            }
          } catch { /* ignore incomplete JSON */ }
        }
      }
      return true
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        _setError(e?.message || 'Ошибка соединения с Gemma')
      }
      return false
    } finally {
      aiLoading.value = false
      aiAction.value = ''
      _abortCtrl = null
    }
  }

  // ── REVIEW (обычный fetch) ─────────────────────────────────────────────
  async function reviewDocument(
    payload: AiPayload,
  ): Promise<AiReviewNote[] | null> {
    aiLoading.value = true
    aiError.value = ''
    aiAction.value = 'review'
    aiProgress.value = 'Gemma анализирует документ...'
    try {
      const result = await $fetch<{ notes: AiReviewNote[] }>('/api/ai/document', {
        method: 'POST',
        body: { action: 'review', ...payload },
      })
      aiProgress.value = ''
      return result?.notes ?? null
    } catch (e: any) {
      _setError(e?.data?.statusMessage || e?.message || 'Ошибка анализа')
      return null
    } finally {
      aiLoading.value = false
      aiAction.value = ''
    }
  }

  function abortAi() {
    _abortCtrl?.abort()
    aiLoading.value = false
    aiAction.value = ''
    aiProgress.value = ''
  }

  function clearReview() {
    aiReviewNotes.value = []
  }

  return {
    aiLoading,
    aiError,
    aiAction,
    aiProgress,
    aiReviewNotes,
    streamDocument,
    reviewDocument,
    abortAi,
    clearReview,
  }
}
