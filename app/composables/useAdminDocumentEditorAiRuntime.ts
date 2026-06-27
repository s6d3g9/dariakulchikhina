import { computed, ref, type Ref } from 'vue'

type SelectedTemplate = {
  key: string
  name: string
  template: string
} | null

type AiReviewNote = {
  type: string
  text: string
}

type AiChatMessage = {
  text: string
  streaming: boolean
  done: boolean
  charCount: number
  elapsed?: number
}

type UseAdminDocumentEditorAiRuntimeOptions = {
  selectedTpl: Ref<SelectedTemplate>
  fieldValues: Ref<Record<string, string>>
  editorContent: Ref<string>
  editorEl: Ref<HTMLDivElement | null>
  pickedProjectSlug: Ref<string>
  pickedClientId: Ref<number | null>
  pickedContractorId: Ref<number | null>
  generateText: () => string
  stripMarkdown: (text: string) => string
  chatInput: Ref<string>
  chatInputEl: Ref<HTMLTextAreaElement | null>
  chatVisible: Ref<boolean>
  applyPatches: (original: string, response: string) => { result: string; count: number; failed: number }
  tryInstantEdit: (instruction: string, documentText: string) => { applied: boolean; result: string; oldText: string; newText: string }
  chatPushUser: (actionLabel: string) => void
  chatPushGemma: () => AiChatMessage
  chatToken: (message: AiChatMessage, token: string) => void
  chatDone: (message: AiChatMessage) => void
  autoSave: () => Promise<void> | void
}

const AI_MODELS = [
  { value: '', label: '🏠 Авто (локальная)', group: 'Локальные (бесплатно)' },
  { value: 'gemma3:27b', label: '🏠 Gemma 3 27B (документы)', group: 'Локальные (бесплатно)' },
  { value: 'qwen3:4b', label: '🏠 Qwen3 4B (чат, быстро)', group: 'Локальные (бесплатно)' },
  { value: 'claude-haiku-4-5-20251001', label: '☁️ Claude Haiku 4.5 (дешевле)', group: 'Anthropic Claude' },
  { value: 'claude-sonnet-4-5-20250929', label: '☁️ Claude Sonnet 4.5 (рек.)', group: 'Anthropic Claude' },
  { value: 'claude-sonnet-4-6', label: '☁️ Claude Sonnet 4.6 (новинка)', group: 'Anthropic Claude' },
]

export function useAdminDocumentEditorAiRuntime(options: UseAdminDocumentEditorAiRuntimeOptions) {
  const {
    aiLoading,
    aiError,
    aiAction,
    aiProgress,
    aiElapsed,
    aiTokenCount,
    aiTruncated,
    aiReviewNotes,
    aiCitations,
    streamDocument,
    reviewDocument,
    abortAi,
    clearReview,
    clearCitations,
  } = useAiDocument()

  const selectedAiModel = ref('')
  const selectedAiModelLabel = computed(() => AI_MODELS.find((model) => model.value === selectedAiModel.value)?.label || '🤖 модель')

  const aiPhaseHint = computed(() => {
    if (!aiLoading.value || aiTokenCount.value > 0) return ''

    const seconds = aiElapsed.value
    if (aiAction.value === 'review') {
      if (seconds < 5) return 'отправляет документ на анализ...'
      if (seconds < 20) return 'читает и оценивает содержимое...'
      if (seconds < 45) return 'проверяет юридические формулировки...'
      if (seconds < 80) return 'формулирует замечания... обычно 1–2 минуты'
      return 'почти готово — большой документ требует времени'
    }

    if (seconds < 5) return 'инициализирует запрос...'
    if (seconds < 15) return 'загружает контекст в память...'
    if (seconds < 30) return 'оценивает данные проекта...'
    if (seconds < 50) return 'формирует структуру документа... обычно 30–60с'
    if (seconds < 80) return 'работает над деталями... почти готово'
    return 'большой документ — продолжает, не останавливайся'
  })

  const aiPrefillPct = computed(() => {
    if (aiTokenCount.value > 0 || !aiLoading.value) return 100
    const estimate = aiAction.value === 'review' ? 120 : 90
    return Math.min(95, Math.round((aiElapsed.value / estimate) * 100))
  })

  function buildAiPayload() {
    return {
      templateKey: options.selectedTpl.value?.key || '',
      templateName: options.selectedTpl.value?.name || '',
      templateText: options.selectedTpl.value?.template || '',
      fields: { ...options.fieldValues.value },
      currentText: options.editorContent.value || options.generateText(),
      projectSlug: options.pickedProjectSlug.value || '',
      clientId: options.pickedClientId.value || 0,
      contractorId: options.pickedContractorId.value || 0,
      aiModel: selectedAiModel.value || undefined,
    }
  }

  function updateEditorContent(nextContent: string, strip = false, scrollToBottom = false) {
    const value = strip ? options.stripMarkdown(nextContent) : nextContent
    options.editorContent.value = value
    if (!options.editorEl.value) return value

    options.editorEl.value.innerText = value
    if (scrollToBottom) {
      options.editorEl.value.scrollTop = options.editorEl.value.scrollHeight
    }
    return value
  }

  async function onSendChatMessage() {
    const text = options.chatInput.value.trim()
    if (!text || aiLoading.value) return

    options.chatInput.value = ''
    if (options.chatInputEl.value) {
      options.chatInputEl.value.style.height = 'auto'
    }
    options.chatPushUser(text)

    const instant = options.tryInstantEdit(text, options.editorContent.value)
    if (instant.applied) {
      updateEditorContent(instant.result, true)
      const message = options.chatPushGemma()
      message.text = `⚡ Заменено мгновенно: «${instant.oldText.slice(0, 40)}» → «${instant.newText.slice(0, 40)}»`
      message.charCount = message.text.length
      message.elapsed = 0
      options.chatDone(message)
      return
    }

    const continuePattern = /^(продолжай|продолжи|продолжить|continue|дальше|допиши|дописать|продолжение)\W*$/i
    if (continuePattern.test(text)) {
      const message = options.chatPushGemma()
      message.text = ''
      let accumulated = ''
      await streamDocument('continue', { ...buildAiPayload(), currentText: options.editorContent.value }, (token) => {
        updateEditorContent(options.editorContent.value + token)
        accumulated += token
        message.text = `▶ Дописываю... (${accumulated.length} симв.)`
        message.charCount = accumulated.length
      })
      message.text = `✓ Дописано (${accumulated.length} символов добавлено)`
      message.charCount = accumulated.length
      options.chatDone(message)
      return
    }

    const message = options.chatPushGemma()
    message.text = ''

    let accumulated = ''
    const payload = { ...buildAiPayload(), currentText: options.editorContent.value, customInstruction: text }
    await streamDocument('chat', payload, (token) => {
      accumulated += token
      if (accumulated.length <= 120) {
        message.text = accumulated
        message.charCount = accumulated.length
      } else {
        message.text = ''
        message.charCount = accumulated.length
      }
    })

    const result = accumulated
    const hasPatch = /<<<REPLACE>>>/.test(result)
    const documentLength = options.editorContent.value.length
    const isFullDocResponse = !hasPatch && documentLength > 200 && result.length > documentLength * 0.6

    if (isFullDocResponse) {
      message.text = `⚠️ Модель написала весь документ целиком вместо точечной правки. Попробуйте:\n• Выбрать Claude в селекторе модели (☁️ Claude Haiku) — он надёжнее\n• Или сформулируй точнее: «замени [точный текст] на [новый текст]»`
      message.charCount = message.text.length
      options.chatDone(message)
      return
    }

    if (hasPatch) {
      const { result: patched, count, failed } = options.applyPatches(options.editorContent.value, result)
      if (count > 0) {
        updateEditorContent(patched, true)
        message.text = `✓ Изменено фрагментов: ${count}${failed ? ` (не найдено: ${failed})` : ''}`
      } else {
        message.text = `⚠️ Не удалось найти указанный текст в документе (${failed} патч(ей) не совпали). Попробуйте процитировать точнее.`
      }
      message.charCount = message.text.length
    } else {
      message.text = options.stripMarkdown(result) || result
      message.charCount = message.text.length
    }
    options.chatDone(message)
  }

  async function onContinueGeneration() {
    if (aiLoading.value) return
    clearCitations()
    const existingText = options.editorContent.value
    options.chatPushUser('▶ Продолжить генерацию')
    const message = options.chatPushGemma()
    options.chatVisible.value = true
    await streamDocument('continue', { ...buildAiPayload(), currentText: existingText }, (token) => {
      updateEditorContent(options.editorContent.value + token)
      options.chatToken(message, token)
    })
    options.chatDone(message)
  }

  async function onAiGenerate() {
    if (!options.selectedTpl.value) return
    clearReview()
    clearCitations()
    updateEditorContent('')
    options.chatVisible.value = true
    options.chatPushUser('🤖 Сгенерировать документ')
    const message = options.chatPushGemma()
    await streamDocument('generate', buildAiPayload(), (token) => {
      updateEditorContent(options.editorContent.value + token, true, true)
      options.chatToken(message, token)
    })
    updateEditorContent(options.editorContent.value, true)
    options.chatDone(message)
    void options.autoSave()
  }

  async function onAiImprove() {
    if (!options.selectedTpl.value) return
    clearReview()
    clearCitations()
    const originalText = options.editorContent.value || options.generateText()
    updateEditorContent('')
    options.chatVisible.value = true
    options.chatPushUser('✨ Улучшить текст')
    const message = options.chatPushGemma()
    const ok = await streamDocument('improve', { ...buildAiPayload(), currentText: originalText }, (token) => {
      updateEditorContent(options.editorContent.value + token, true, true)
      options.chatToken(message, token)
    })
    updateEditorContent(options.editorContent.value, true)
    options.chatDone(message)
    if (!ok && !options.editorContent.value) {
      updateEditorContent(originalText)
    }
  }

  async function onAiReview() {
    if (!options.selectedTpl.value) return
    options.chatVisible.value = true
    options.chatPushUser('📋 Проверить документ')
    const message = options.chatPushGemma()
    const notes = await reviewDocument(buildAiPayload(), (token) => {
      options.chatToken(message, token)
    })
    if (notes?.length) {
      message.text = notes.map((note: AiReviewNote) => `${note.type === 'error' ? '⚠️' : '💡'} ${note.text}`).join('\n')
      message.charCount = message.text.length
    } else if (!message.text) {
      message.text = 'Анализ завершён. Замечаний нет.'
      message.charCount = message.text.length
    }
    options.chatDone(message)
  }

  return {
    AI_MODELS,
    aiLoading,
    aiError,
    aiAction,
    aiProgress,
    aiElapsed,
    aiTokenCount,
    aiTruncated,
    aiReviewNotes,
    aiCitations,
    abortAi,
    clearReview,
    clearCitations,
    selectedAiModel,
    selectedAiModelLabel,
    aiPhaseHint,
    aiPrefillPct,
    buildAiPayload,
    onSendChatMessage,
    onContinueGeneration,
    onAiGenerate,
    onAiImprove,
    onAiReview,
  }
}