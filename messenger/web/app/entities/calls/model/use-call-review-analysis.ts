import type { Ref } from 'vue'
import { normalizeMessengerProjectRoot } from '../../../utils/messenger-project-root'
import { buildMessengerUrl } from '../../../utils/messenger-url'

type MessengerTranscriptSpeaker = 'you' | 'peer'

interface MessengerCallTranscriptEntry {
  id: string
  speaker: MessengerTranscriptSpeaker
  text: string
  final: boolean
  createdAt: number
}

type MessengerCallAnalysisToolId = 'psychology' | 'business' | 'intent' | 'objections' | 'speech-risks' | 'next-steps'

interface MessengerCallAnalysisTool {
  id: MessengerCallAnalysisToolId
  title: string
  description: string
}

interface MessengerCallReviewState {
  callId: string
  conversationId: string
  peerDisplayName: string
  cleanedTranscript: string
  summary: string
  sourceLines: number
  generatedAt: number
  autoPosted: boolean
  syncedProjectSlug?: string
  syncedInsightId?: string
  syncedAt?: number
}

interface MessengerActiveCallSnapshot {
  callId: string
  conversationId: string
  peerDisplayName: string
}

const CALL_ANALYSIS_TOOLS: MessengerCallAnalysisTool[] = [
  { id: 'psychology', title: 'Психология клиента', description: 'Эмоции, доверие, скрытые триггеры и тревожность.' },
  { id: 'business', title: 'Деловая практика', description: 'Решения, бюджет, сроки, договорённости и риски.' },
  { id: 'intent', title: 'Карта намерений', description: 'Что клиент хочет получить и какие критерии успеха.' },
  { id: 'objections', title: 'Возражения и сомнения', description: 'Явные и неявные причины сопротивления.' },
  { id: 'speech-risks', title: 'Риски коммуникации', description: 'Где формулировки были расплывчаты или конфликтны.' },
  { id: 'next-steps', title: 'Следующие шаги', description: 'План действий по итогам разговора.' },
]
const TRANSCRIPT_FILLER_WORDS = ['ээ', 'эм', 'мм', 'ну', 'типа', 'короче', 'как бы', 'вот', 'ага', 'угу']
const CALL_ANALYSIS_WORD_LIBRARY = {
  price: ['бюджет', 'стоим', 'цена', 'скидк', 'оплат', 'предоплат'],
  deadline: ['срок', 'дедлайн', 'когда', 'до ', 'этап', 'дата'],
  concern: ['сомнева', 'боюсь', 'сложно', 'не уверен', 'риск', 'дорого', 'неудоб'],
  decision: ['реши', 'подтверд', 'соглас', 'окончательно', 'берем', 'делаем'],
} as const

function matchesAnalysisWordLibrary(text: string, keywords: readonly string[]) {
  return keywords.some(keyword => text.includes(keyword))
}

function normalizeTranscriptText(raw: string) {
  const compact = raw
    .replace(/[\t\n\r]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/([а-яa-z])\1{3,}/gi, '$1$1')
    .trim()

  if (!compact) {
    return ''
  }

  const lower = compact.toLowerCase()
  if (TRANSCRIPT_FILLER_WORDS.includes(lower)) {
    return ''
  }

  return compact
}

function normalizeProjectSyncSlug(value?: string | null) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '')
}

function cleanTranscriptEntries(entries: MessengerCallTranscriptEntry[]) {
  const cleaned: MessengerCallTranscriptEntry[] = []

  for (const entry of entries) {
    const normalizedText = normalizeTranscriptText(entry.text)
    if (!normalizedText) {
      continue
    }

    const previous = cleaned[cleaned.length - 1]
    if (previous && previous.speaker === entry.speaker && previous.text === normalizedText) {
      continue
    }

    cleaned.push({
      ...entry,
      text: normalizedText,
    })
  }

  return cleaned
}

function buildSummaryFromTranscript(entries: MessengerCallTranscriptEntry[]) {
  if (!entries.length) {
    return 'Недостаточно данных для конспекта.'
  }

  const sourceText = entries.map(entry => `${entry.speaker === 'you' ? 'Вы' : 'Клиент'}: ${entry.text}`).join('\n')
  const lines = sourceText.split('\n').filter(Boolean)
  const keyLines = lines.slice(0, 2).concat(lines.slice(Math.max(2, lines.length - 4)))
  const actionPatterns = /нужно|надо|сделать|подготов|соглас|отправ|срок|дедлайн|бюджет|стоим|договор/iu
  const actionItems = lines.filter(line => actionPatterns.test(line)).slice(0, 5)

  const summaryParts = [
    'Краткий конспект:',
    ...keyLines.map(line => `- ${line}`),
  ]

  if (actionItems.length) {
    summaryParts.push('')
    summaryParts.push('Договорённости / задачи:')
    summaryParts.push(...actionItems.map(line => `- ${line}`))
  }

  return summaryParts.join('\n')
}

function buildCleanTranscript(entries: MessengerCallTranscriptEntry[]) {
  return entries
    .map(entry => `${entry.speaker === 'you' ? 'Вы' : 'Собеседник'}: ${entry.text}`)
    .join('\n')
}

function buildAnalysisInterpretation(toolId: MessengerCallAnalysisToolId, review: MessengerCallReviewState) {
  const transcriptLower = review.cleanedTranscript.toLowerCase()
  const hasPriceTalk = matchesAnalysisWordLibrary(transcriptLower, CALL_ANALYSIS_WORD_LIBRARY.price)
  const hasDeadlineTalk = matchesAnalysisWordLibrary(transcriptLower, CALL_ANALYSIS_WORD_LIBRARY.deadline)
  const hasConcernTalk = matchesAnalysisWordLibrary(transcriptLower, CALL_ANALYSIS_WORD_LIBRARY.concern)
  const hasDecisionTalk = matchesAnalysisWordLibrary(transcriptLower, CALL_ANALYSIS_WORD_LIBRARY.decision)

  if (toolId === 'psychology') {
    return [
      'Фокус: эмоциональный фон и доверие.',
      hasConcernTalk ? '- У клиента есть зоны тревоги, стоит усилить эмпатию и переформулировать выгоды.' : '- Явных тревожных сигналов мало, можно держать уверенный темп общения.',
      hasDecisionTalk ? '- Клиент ближе к решению, важно закрепить уверенность через короткое резюме.' : '- Решение пока не финализировано, полезны уточняющие вопросы про критерии выбора.',
      '- Рекомендуемая тактика: 1 вопрос про приоритет, 1 отражение эмоции, 1 конкретный следующий шаг.',
    ].join('\n')
  }

  if (toolId === 'business') {
    return [
      'Фокус: деловые договорённости и управляемость сделки.',
      hasPriceTalk ? '- Обсуждались бюджет/стоимость: зафиксируйте диапазон и условия оплаты письменно.' : '- Бюджет прозвучал неявно: стоит отдельно подтвердить финансовые рамки.',
      hasDeadlineTalk ? '- Затрагивались сроки: переведите их в контрольные точки по этапам.' : '- Сроки недостаточно конкретны: предложите 2-3 даты выбора.',
      '- Минимум для фиксации: цель, бюджет, дедлайн, ответственный, формат апдейтов.',
    ].join('\n')
  }

  if (toolId === 'intent') {
    return [
      'Фокус: карта намерений клиента.',
      '- Что клиент хочет получить: выделите конечный результат одной фразой.',
      '- Почему это важно именно сейчас: привяжите к контексту клиента.',
      '- Критерии успеха: попросите 2-3 измеримых индикатора результата.',
    ].join('\n')
  }

  if (toolId === 'objections') {
    return [
      'Фокус: возражения и скрытые барьеры.',
      hasConcernTalk ? '- В речи есть сомнения: проработайте риски через сценарий «до/после».' : '- Явных возражений мало, но полезно проверить скрытые барьеры вопросом «что может помешать?».',
      hasPriceTalk ? '- Ценовой блок лучше закрывать через ценность и этапность оплаты.' : '- Ценовой блок не раскрыт, это потенциальный источник будущих возражений.',
      '- Подготовьте 3 коротких ответа: по цене, срокам и объёму работ.',
    ].join('\n')
  }

  if (toolId === 'speech-risks') {
    return [
      'Фокус: качество формулировок и риски коммуникации.',
      '- Уберите двусмысленные формулировки и замените их на проверяемые критерии.',
      '- Фиксируйте итоговые договорённости после каждого смыслового блока.',
      '- Избегайте перегрузки терминами: один тезис = один пример = одно подтверждение.',
    ].join('\n')
  }

  return [
    'Фокус: следующие шаги после звонка.',
    '- Отправить клиенту короткое резюме с подтверждением целей и рамок.',
    '- Согласовать план работ по этапам и точкам контроля.',
    '- Назначить следующую коммуникацию с конкретной датой и ожидаемым результатом.',
  ].join('\n')
}

export function useCallReviewAnalysis(deps: {
  transcriptionEntries: Ref<MessengerCallTranscriptEntry[]>
  activeCall: Ref<MessengerActiveCallSnapshot | null>
}) {
  const runtimeConfig = useRuntimeConfig()
  const messengerProjectRoot = computed(() => normalizeMessengerProjectRoot(runtimeConfig.public.messengerProjectRoot || ''))
  const auth = useMessengerAuth()
  const settingsModel = useMessengerSettings()

  const callReview = useState<MessengerCallReviewState | null>('messenger-call-review', () => null)
  const analysisPanelOpen = useState<boolean>('messenger-call-analysis-panel-open', () => false)
  const analysisTools = useState<MessengerCallAnalysisTool[]>('messenger-call-analysis-tools', () => CALL_ANALYSIS_TOOLS)
  const selectedAnalysisToolId = useState<MessengerCallAnalysisToolId>('messenger-call-analysis-tool-id', () => 'psychology')
  const analysisInterpretations = useState<Partial<Record<MessengerCallAnalysisToolId, string>>>('messenger-call-analysis-interpretations', () => ({}))
  const analysisRunning = useState<boolean>('messenger-call-analysis-running', () => false)
  const analysisError = useState<string>('messenger-call-analysis-error', () => '')
  const aiAnalysisInterpretations = useState<Partial<Record<MessengerCallAnalysisToolId, string>>>('messenger-call-ai-analysis-interpretations', () => ({}))
  const aiAnalysisRunning = useState<boolean>('messenger-call-ai-analysis-running', () => false)
  const aiAnalysisError = useState<string>('messenger-call-ai-analysis-error', () => '')
  const projectSyncProjectSlug = useState<string>('messenger-call-project-sync-project-slug', () => '')
  const projectSyncPending = useState<boolean>('messenger-call-project-sync-pending', () => false)
  const projectSyncError = useState<string>('messenger-call-project-sync-error', () => '')
  const projectSyncStatus = useState<string>('messenger-call-project-sync-status', () => '')
  const projectTaskSyncPending = useState<boolean>('messenger-call-project-task-sync-pending', () => false)
  const projectTaskSyncError = useState<string>('messenger-call-project-task-sync-error', () => '')
  const projectTaskSyncStatus = useState<string>('messenger-call-project-task-sync-status', () => '')

  function clearCallReview() {
    callReview.value = null
    analysisInterpretations.value = {}
    analysisError.value = ''
    aiAnalysisInterpretations.value = {}
    aiAnalysisError.value = ''
    projectSyncError.value = ''
    projectSyncStatus.value = ''
    projectSyncPending.value = false
    projectTaskSyncError.value = ''
    projectTaskSyncStatus.value = ''
    projectTaskSyncPending.value = false
    analysisPanelOpen.value = false
  }

  async function syncCallReviewToProject(options: { projectSlug?: string } = {}) {
    if (!callReview.value) {
      projectSyncError.value = 'Нет итогов звонка для синхронизации.'
      projectSyncStatus.value = ''
      return null
    }

    const projectSlug = normalizeProjectSyncSlug(options.projectSlug || projectSyncProjectSlug.value)
    if (!projectSlug) {
      projectSyncError.value = 'Укажите slug проекта перед отправкой.'
      projectSyncStatus.value = ''
      return null
    }

    if (projectSyncPending.value) {
      return null
    }

    const review = { ...callReview.value }
    const syncTitle = review.peerDisplayName ? `Звонок: ${review.peerDisplayName}`.slice(0, 200) : undefined

    projectSyncProjectSlug.value = projectSlug
    projectSyncPending.value = true
    projectSyncError.value = ''
    projectSyncStatus.value = ''

    try {
      const response = await $fetch<{
        insight?: {
          id?: string
        }
        meta?: {
          blockerCountAdded?: number
          checkpointCreated?: boolean
        }
      }>(buildMessengerUrl(messengerProjectRoot.value, `/api/projects/${encodeURIComponent(projectSlug)}/communications/call-insights`), {
        method: 'POST',
        credentials: 'include',
        body: {
          title: syncTitle,
          summary: review.summary.slice(0, 8000),
          transcript: review.cleanedTranscript.slice(0, 32000),
          callId: review.callId,
          conversationId: review.conversationId,
          happenedAt: new Date(review.generatedAt || Date.now()).toISOString(),
          actorName: review.peerDisplayName.slice(0, 120) || undefined,
        },
      })

      const blockerCountAdded = Number(response.meta?.blockerCountAdded || 0)
      const checkpointCreated = Boolean(response.meta?.checkpointCreated)
      const syncDetails = [
        blockerCountAdded ? `блокеров: ${blockerCountAdded}` : '',
        checkpointCreated ? 'создана контрольная точка' : '',
      ].filter(Boolean)

      if (callReview.value && callReview.value.callId === review.callId && callReview.value.generatedAt === review.generatedAt) {
        callReview.value = {
          ...callReview.value,
          autoPosted: true,
          syncedProjectSlug: projectSlug,
          syncedInsightId: typeof response.insight?.id === 'string' ? response.insight.id : '',
          syncedAt: Date.now(),
        }
      }

      projectSyncStatus.value = syncDetails.length
        ? `Звонок добавлен в проект ${projectSlug}: ${syncDetails.join(', ')}.`
        : `Звонок добавлен в проект ${projectSlug}.`
      return response
    } catch (error: any) {
      const rawMessage = error?.data?.statusMessage || error?.message || 'Не удалось добавить звонок в проект.'
      projectSyncError.value = rawMessage === 'Нет доступа к коммуникациям проекта'
        ? 'Нет доступа к проекту. Откройте основной сайт и войдите в проектный или admin-контур.'
        : rawMessage
      return null
    } finally {
      projectSyncPending.value = false
    }
  }

  async function applyCallReviewToProjectSprint(options: { projectSlug?: string } = {}) {
    if (!callReview.value) {
      projectTaskSyncError.value = 'Нет итогов звонка для синхронизации задач.'
      projectTaskSyncStatus.value = ''
      return null
    }

    const projectSlug = normalizeProjectSyncSlug(options.projectSlug || projectSyncProjectSlug.value)
    if (!projectSlug) {
      projectTaskSyncError.value = 'Укажите slug проекта перед синхронизацией задач.'
      projectTaskSyncStatus.value = ''
      return null
    }

    if (projectTaskSyncPending.value) {
      return null
    }

    projectTaskSyncPending.value = true
    projectTaskSyncError.value = ''
    projectTaskSyncStatus.value = ''

    try {
      let insightId = callReview.value.syncedProjectSlug === projectSlug ? callReview.value.syncedInsightId || '' : ''

      if (!insightId) {
        const syncResponse = await syncCallReviewToProject({ projectSlug })
        insightId = typeof syncResponse?.insight?.id === 'string'
          ? syncResponse.insight.id
          : (callReview.value?.syncedProjectSlug === projectSlug ? callReview.value?.syncedInsightId || '' : '')
      }

      if (!insightId) {
        projectTaskSyncError.value = projectSyncError.value || 'Не удалось подготовить инсайт звонка для задач.'
        return null
      }

      const response = await $fetch<{
        meta?: {
          createdTaskCount?: number
          createdSprint?: boolean
        }
      }>(buildMessengerUrl(messengerProjectRoot.value, `/api/projects/${encodeURIComponent(projectSlug)}/communications/call-insights/${encodeURIComponent(insightId)}/apply`), {
        method: 'POST',
        credentials: 'include',
        body: {},
      })

      const createdTaskCount = Number(response.meta?.createdTaskCount || 0)
      const createdSprint = Boolean(response.meta?.createdSprint)

      projectTaskSyncStatus.value = createdTaskCount
        ? `Следующие шаги синхронизированы: задач ${createdTaskCount}${createdSprint ? ', создан follow-up спринт' : ''}.`
        : 'Новых задач не появилось: шаги уже были синхронизированы раньше.'
      return response
    } catch (error: any) {
      const rawMessage = error?.data?.statusMessage || error?.message || 'Не удалось превратить звонок в задачи спринта.'
      projectTaskSyncError.value = rawMessage === 'Нет доступа'
        ? 'Для синхронизации задач нужен admin-доступ на основном сайте.'
        : rawMessage
      return null
    } finally {
      projectTaskSyncPending.value = false
    }
  }

  function openAnalysisPanel() {
    analysisPanelOpen.value = true
  }

  function closeAnalysisPanel() {
    analysisPanelOpen.value = false
  }

  function toggleAnalysisPanel(force?: boolean) {
    const nextState = typeof force === 'boolean' ? force : !analysisPanelOpen.value
    analysisPanelOpen.value = nextState
  }

  async function runAnalysisTool(toolId: MessengerCallAnalysisToolId = selectedAnalysisToolId.value) {
    if (!callReview.value) {
      analysisError.value = 'Нет данных звонка для анализа.'
      return ''
    }

    selectedAnalysisToolId.value = toolId
    analysisRunning.value = true
    analysisError.value = ''

    try {
      const interpretation = buildAnalysisInterpretation(toolId, callReview.value)

      analysisInterpretations.value = {
        ...analysisInterpretations.value,
        [toolId]: interpretation,
      }
      return interpretation
    } catch {
      analysisError.value = 'Не удалось построить интерпретацию.'
      return ''
    } finally {
      analysisRunning.value = false
    }
  }

  async function runAiAnalysisTool(toolId: MessengerCallAnalysisToolId = selectedAnalysisToolId.value) {
    if (!callReview.value) {
      aiAnalysisError.value = 'Нет данных звонка для API-разбора.'
      return ''
    }

    if (settingsModel.runtimeInterpretationProvider.value !== 'api') {
      aiAnalysisError.value = 'Для этого звонка выбран алгоритмический разбор без API.'
      return ''
    }

    selectedAnalysisToolId.value = toolId
    aiAnalysisRunning.value = true
    aiAnalysisError.value = ''

    try {
      const response = await auth.request<{ interpretation?: string }>(`/conversations/${callReview.value.conversationId}/calls/${callReview.value.callId}/analysis`, {
        method: 'POST',
        body: {
          toolId,
          cleanedTranscript: callReview.value.cleanedTranscript,
          summary: callReview.value.summary,
        },
      })

      const interpretation = String(response.interpretation || '').trim()
      aiAnalysisInterpretations.value = {
        ...aiAnalysisInterpretations.value,
        [toolId]: interpretation,
      }
      return interpretation
    } catch {
      aiAnalysisError.value = 'Не удалось построить API-разбор.'
      return ''
    } finally {
      aiAnalysisRunning.value = false
    }
  }

  async function finalizeCallReview(snapshot: MessengerActiveCallSnapshot | null) {
    if (!snapshot) {
      return null
    }

    const cleanedEntries = cleanTranscriptEntries(deps.transcriptionEntries.value)
    const cleanedTranscript = buildCleanTranscript(cleanedEntries)
    const summary = buildSummaryFromTranscript(cleanedEntries)

    projectSyncError.value = ''
    projectSyncStatus.value = ''
    projectSyncPending.value = false
    projectTaskSyncError.value = ''
    projectTaskSyncStatus.value = ''
    projectTaskSyncPending.value = false

    callReview.value = {
      callId: snapshot.callId,
      conversationId: snapshot.conversationId,
      peerDisplayName: snapshot.peerDisplayName,
      cleanedTranscript,
      summary,
      sourceLines: cleanedEntries.length,
      generatedAt: Date.now(),
      autoPosted: false,
    }
    analysisPanelOpen.value = true

    await runAnalysisTool(selectedAnalysisToolId.value)
    return callReview.value
  }

  return {
    callReview,
    analysisPanelOpen,
    analysisTools,
    selectedAnalysisToolId,
    analysisInterpretations,
    analysisRunning,
    analysisError,
    aiAnalysisInterpretations,
    aiAnalysisRunning,
    aiAnalysisError,
    projectSyncProjectSlug,
    projectSyncPending,
    projectSyncError,
    projectSyncStatus,
    projectTaskSyncPending,
    projectTaskSyncError,
    projectTaskSyncStatus,
    clearCallReview,
    syncCallReviewToProject,
    applyCallReviewToProjectSprint,
    openAnalysisPanel,
    closeAnalysisPanel,
    toggleAnalysisPanel,
    runAnalysisTool,
    runAiAnalysisTool,
    finalizeCallReview,
  }
}
