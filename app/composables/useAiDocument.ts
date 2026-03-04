/**
 * useAiDocument — composable для интеграции Gemma 3 27B с генератором документов
 * Поддерживает стриминг (SSE) для generate/improve и обычный fetch для review
 */

export interface AiReviewNote {
  type: 'error' | 'info'
  text: string
}

export interface LegalCitation {
  source_name:   string
  article_num:   string | null
  article_title: string | null
  chapter:       string | null
  text:          string
  similarity:    number
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
  aiModel?: string         // 'gemma3:27b' | 'qwen3:4b' | 'claude-3-5-haiku-20241022' | ...
}

function getCsrfToken(): string {
  return document.cookie
    .split('; ')
    .find(c => c.startsWith('csrf_token='))
    ?.split('=')[1]
    ? decodeURIComponent(document.cookie.split('; ').find(c => c.startsWith('csrf_token='))!.split('=')[1])
    : ''
}

export function useAiDocument() {
  const aiLoading      = ref(false)
  const aiError        = ref('')
  const aiAction       = ref<'generate' | 'improve' | 'review' | ''>('')
  const aiProgress     = ref('')   // текущий статус-текст для пользователя
  const aiElapsed      = ref(0)    // секунды с момента старта
  const aiTokenCount   = ref(0)    // кол-во символов от модели
  const aiTruncated    = ref(false) // true когда модель остановилась по max_tokens
  const aiReviewNotes  = ref<AiReviewNote[]>([])
  const aiCitations    = ref<LegalCitation[]>([])

  let _abortCtrl: AbortController | null = null
  let _timer: ReturnType<typeof setInterval> | null = null

  function _startTimer() {
    aiElapsed.value = 0
    aiTokenCount.value = 0
    _timer = setInterval(() => { aiElapsed.value++ }, 1000)
  }

  function _stopTimer() {
    if (_timer) { clearInterval(_timer); _timer = null }
  }

  function _setError(msg: string) {
    aiError.value = msg
    setTimeout(() => { aiError.value = '' }, 6000)
  }

  // ── СТРИМИНГ (generate / improve) ─────────────────────────────────────
  async function streamDocument(
    action: 'generate' | 'improve' | 'review' | 'chat' | 'continue',
    payload: AiPayload,
    onToken: (token: string) => void,
  ): Promise<boolean> {
    aiLoading.value = true
    aiError.value = ''
    aiTruncated.value = false
    aiAction.value = action
    aiCitations.value = []
    aiProgress.value = action === 'generate'
      ? 'Gemma генерирует документ...'
      : action === 'review'
        ? 'Gemma анализирует документ...'
        : 'Gemma улучшает текст...'
    _startTimer()
    _abortCtrl = new AbortController()

    try {
      const resp = await fetch('/api/ai/document-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
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
            _stopTimer()
            aiProgress.value = `✓ Готово за ${aiElapsed.value}с (${aiTokenCount.value} симв)`
            setTimeout(() => { aiProgress.value = '' }, 4000)
            return true
          }
          try {
            const data = JSON.parse(raw)
            if (data.error) { _setError(data.error); return false }
            if (data.truncated) {
              aiTruncated.value = true
            }
            if (data.citations) {
              aiCitations.value = data.citations
            }
            if (data.notes) {
              aiReviewNotes.value = data.notes
            }
            if (data.token) {
              onToken(data.token)
              aiTokenCount.value += data.token.length
              // обновляем статус каждые 50 симв
              if (aiTokenCount.value % 50 === 0) aiProgress.value = `Gemma пишет...`
            }
          } catch { /* ignore incomplete JSON */ }
        }
      }
      return true
    } catch (e: any) {
      _stopTimer()
      if (e?.name !== 'AbortError') {
        _setError(e?.message || 'Ошибка соединения с Gemma')
      }
      return false
    } finally {
      _stopTimer()
      aiLoading.value = false
      aiAction.value = ''
      _abortCtrl = null
    }
  }

  // ── REVIEW (теперь тоже SSE) ────────────────────────────────────────
  async function reviewDocument(
    payload: AiPayload,
    onToken: (token: string) => void = () => {},
  ): Promise<AiReviewNote[] | null> {
    aiReviewNotes.value = []
    aiProgress.value = 'Gemma анализирует документ...'
    const ok = await streamDocument('review', payload, onToken)
    if (!ok && !aiReviewNotes.value.length) return null
    return aiReviewNotes.value.length ? aiReviewNotes.value : null
  }

  function abortAi() {
    _abortCtrl?.abort()
    _stopTimer()
    aiLoading.value = false
    aiAction.value = ''
    aiProgress.value = ''
  }

  function clearReview() {
    aiReviewNotes.value = []
  }

  function clearCitations() {
    aiCitations.value = []
  }

  return {
    aiLoading,
    aiError,
    aiAction,
    aiProgress,
    aiElapsed,
    aiTokenCount,
    aiReviewNotes,
    aiCitations,
    streamDocument,
    reviewDocument,
    abortAi,
    clearReview,
    clearCitations,
    aiTruncated,
  }
}
