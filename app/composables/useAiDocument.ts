/**
 * useAiDocument — composable для интеграции Gemma 3 27B с генератором документов
 */

export interface AiReviewNote {
  type: 'error' | 'info'
  text: string
}

export function useAiDocument() {
  const aiLoading = ref(false)
  const aiError = ref('')
  const aiReviewNotes = ref<AiReviewNote[]>([])
  const aiAction = ref<'generate' | 'improve' | 'review' | ''>('')

  async function callAiDocument(
    action: 'generate' | 'improve' | 'review',
    payload: {
      templateKey?: string
      templateName: string
      templateText?: string
      fields?: Record<string, string>
      currentText?: string
      projectSlug?: string
      clientId?: number
      contractorId?: number
    },
  ): Promise<{ text?: string, notes?: AiReviewNote[] } | null> {
    aiLoading.value = true
    aiError.value = ''
    aiAction.value = action
    try {
      const result = await $fetch<any>('/api/ai/document', {
        method: 'POST',
        body: { action, ...payload },
      })
      return result
    } catch (e: any) {
      console.error('[useAiDocument] error:', e)
      const msg = e?.data?.statusMessage || e?.message || 'Ошибка Gemma 27B'
      aiError.value = msg
      setTimeout(() => { aiError.value = '' }, 6000)
      return null
    } finally {
      aiLoading.value = false
      aiAction.value = ''
    }
  }

  function clearReview() {
    aiReviewNotes.value = []
  }

  return {
    aiLoading,
    aiError,
    aiAction,
    aiReviewNotes,
    callAiDocument,
    clearReview,
  }
}
