import { getMessengerAgentSettings, type MessengerAgentConnectionMode } from './agent-settings-store.ts'
import { callMessengerAgentModel, type MessengerAgentLlmMessage } from './agent-llm.ts'

export interface MessengerAgentRecord {
  id: string
  login: string
  displayName: string
  description: string
  greeting: string
  prompts: string[]
  systemPrompt: string
  modelOptions: string[]
}

interface MessengerAgentReplyHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

interface MessengerAgentTracePayload {
  phase: 'started' | 'context' | 'files' | 'consulting' | 'reasoning' | 'completed' | 'failed'
  status: 'running' | 'completed' | 'failed'
  summary: string
  focus?: string
  activeTargetAgentIds?: string[]
  activeConnections?: Array<{
    targetAgentId: string
    mode: MessengerAgentConnectionMode
    payloadPreview?: string
  }>
  fileNames?: string[]
  artifacts?: Array<{
    kind: 'consultation' | 'file' | 'summary'
    label: string
    content: string
    agentId?: string
  }>
}

interface MessengerAgentRuntimeHooks {
  onTrace?: (payload: MessengerAgentTracePayload) => Promise<void> | void
}

interface MessengerAgentConsultationNote {
  agentId: string
  agentDisplayName: string
  mode: MessengerAgentConnectionMode
  content: string
}

interface MessengerConnectedAgent {
  agent: MessengerAgentRecord
  mode: MessengerAgentConnectionMode
}

const MESSENGER_AGENTS: MessengerAgentRecord[] = [
  {
    id: 'planner',
    login: 'agent.planner',
    displayName: 'Планировщик проекта',
    description: 'Собирает задачи, этапы и следующий шаг по интерьерному проекту.',
    greeting: 'Помогу разложить проект по этапам, приоритетам и ближайшим действиям.',
    prompts: ['Собери план работ на неделю', 'Разбей проект на этапы', 'Что делать дальше по объекту?'],
    systemPrompt: 'Ты проектный AI-координатор интерьерной студии. Отвечай по-русски, коротко и структурно. Твоя задача: декомпозировать проект на этапы, следующие действия, риски, дедлайны и ответственных. Не выдумывай факты. Если данных мало, сначала обозначь 2-4 допущения и затем предложи рабочий план.',
    modelOptions: ['GPT-5.4', 'gpt-4.1'],
  },
  {
    id: 'materials',
    login: 'agent.materials',
    displayName: 'Консультант по материалам',
    description: 'Помогает по отделке, мебели, бюджетным заменам и спецификациям.',
    greeting: 'Подскажу по материалам, аналогам и рискам по закупке.',
    prompts: ['Подбери замену материалу', 'Какие риски у поставки?', 'Собери список закупки'],
    systemPrompt: 'Ты AI-консультант по материалам и комплектации в проектах интерьера. Отвечай по-русски, прикладно и без воды. Сравнивай варианты по наличию, срокам, рискам, бюджету, совместимости и монтажу. Если точных данных нет, явно это отмечай и предлагай, что проверить.',
    modelOptions: ['GPT-5.4', 'gpt-4.1'],
  },
  {
    id: 'supervisor',
    login: 'agent.supervisor',
    displayName: 'Контроль реализации',
    description: 'Формирует чек-листы для стройки, приёмки и контроля подрядчиков.',
    greeting: 'Могу собрать чек-лист контроля работ и подсветить проблемные точки.',
    prompts: ['Сделай чек-лист приёмки', 'Какие вопросы задать подрядчику?', 'Что проверить на объекте?'],
    systemPrompt: 'Ты AI-куратор реализации интерьерного проекта. Отвечай по-русски, структурно и как технадзор для дизайн-студии. Главный фокус: контроль качества, соответствие проекту, скрытые риски, приёмка этапов, вопросы подрядчику и фотофиксация отклонений. Лучше короткий чек-лист, чем длинная теория.',
    modelOptions: ['GPT-5.4', 'gpt-4.1'],
  },
]

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractReferencedFiles(message: string, history: MessengerAgentReplyHistoryItem[]) {
  const filePattern = /([\p{L}\p{N}_\-. ]+\.(pdf|docx|xlsx|xls|png|jpe?g|webp|gif|dwg|txt|zip|rar|csv))/giu
  const source = [message, ...history.map(item => item.content)].join(' ')
  const files = new Set<string>()

  for (const match of source.matchAll(filePattern)) {
    const fileName = match[1]?.trim()
    if (fileName) {
      files.add(fileName)
    }
  }

  return Array.from(files).slice(0, 6)
}

function condenseText(value: string, maxLength = 240) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function summarizeFocus(message: string) {
  const normalized = message.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return 'Уточняет задачу пользователя.'
  }

  return normalized.length > 140
    ? `${normalized.slice(0, 137)}...`
    : normalized
}

function describeConnectionMode(mode: MessengerAgentConnectionMode) {
  switch (mode) {
    case 'review':
      return 'делает критический обзор и ищет слабые места'
    case 'enrich':
      return 'добавляет дополнительные идеи и детали'
    case 'validate':
      return 'проверяет допущения и риски'
    case 'summarize':
      return 'сводит материалы в короткий вывод'
    case 'route':
      return 'подсказывает следующий маршрут обработки'
  }
}

function buildReplyByTopic(agent: MessengerAgentRecord, message: string) {
  const normalized = normalizeText(message)

  if (!normalized) {
    return `${agent.greeting} Напишите цель или проблему, и я отвечу по шагам.`
  }

  if (/смет|бюджет|стоим|цен|дорог/.test(normalized)) {
    return [
      'По бюджету лучше идти в три слоя:',
      '1. Зафиксировать обязательные позиции без замен.',
      '2. Отдельно вынести желательные улучшения.',
      '3. Подготовить 2-3 аналога на самые дорогие позиции.',
      'Если хотите, распишу это под ваш объект сообщением в формате таблицы.',
    ].join(' ')
  }

  if (/материал|отделк|краск|плитк|мебел|постав/.test(normalized)) {
    return [
      'По материалам рекомендую проверить четыре пункта:',
      'наличие на складе, срок поставки, совместимость с текущим проектом и наличие аналога.',
      'Пришлите позицию или задачу, и я подготовлю короткий список решений.',
    ].join(' ')
  }

  if (/план|этап|срок|дедлайн|задач|дальше/.test(normalized)) {
    return [
      'Предлагаю собрать следующий контур работ:',
      'сегодня закрыть блокировки, затем выделить 3 ближайших результата по проекту и назначить ответственных.',
      'Если пришлёте текущий статус, я разверну это в пошаговый план.',
    ].join(' ')
  }

  if (/чек|контрол|приемк|строй|подряд/.test(normalized)) {
    return [
      'Для контроля реализации я бы проверил:',
      'соответствие чертежам, скрытые работы, материалы на объекте и фотофиксацию отклонений.',
      'Могу превратить это в чек-лист под конкретный этап.',
    ].join(' ')
  }

  return `${agent.greeting} Вижу запрос: "${message.trim()}". Могу ответить кратко, списком действий или в формате чек-листа.`
}

export async function listMessengerAgents() {
  return MESSENGER_AGENTS
}

export async function findMessengerAgentById(agentId: string) {
  return MESSENGER_AGENTS.find(agent => agent.id === agentId) ?? null
}

function buildAgentPromptMessages(
  agent: MessengerAgentRecord,
  message: string,
  history: MessengerAgentReplyHistoryItem[],
  connectedAgents: MessengerConnectedAgent[],
  consultationNotes: MessengerAgentConsultationNote[] = [],
): MessengerAgentLlmMessage[] {
  const promptMessages: MessengerAgentLlmMessage[] = [
    {
      role: 'system',
      content: [
        agent.systemPrompt,
        `Имя агента: ${agent.displayName}.`,
        `Роль: ${agent.description}`,
        connectedAgents.length
          ? `Связанные агенты: ${connectedAgents.map(item => `${item.agent.displayName} (${item.agent.description}, режим ${item.mode})`).join('; ')}. Учитывай их экспертизу и при необходимости явно указывай, какой из них помог бы уточнить ответ.`
          : 'Связанные агенты не подключены.',
        consultationNotes.length
          ? `Промежуточные экспертные заметки: ${consultationNotes.map(item => `${item.agentDisplayName}: ${item.content}`).join(' | ')}.`
          : 'Промежуточные экспертные заметки отсутствуют.',
        'Правила ответа: до 6 коротких абзацев или списка, без markdown-таблиц, без приветствий в каждом сообщении, без выдуманных данных.',
        'Если пользователь просит план, чек-лист или сравнение, отдавай ответ именно в этом формате.',
      ].join(' '),
    },
  ]

  for (const item of history) {
    const content = item.content.trim()
    if (!content) {
      continue
    }

    promptMessages.push({
      role: item.role,
      content,
    })
  }

  promptMessages.push({
    role: 'user',
    content: message.trim(),
  })

  return promptMessages
}

async function buildMessengerAgentConsultation(
  agent: MessengerAgentRecord,
  mode: MessengerAgentConnectionMode,
  message: string,
  history: MessengerAgentReplyHistoryItem[],
  referencedFiles: string[],
) {
  const settings = await getMessengerAgentSettings(agent.id)

  const prompt: MessengerAgentLlmMessage[] = [
    {
      role: 'system',
      content: [
        agent.systemPrompt,
        'Ты не отвечаешь пользователю напрямую.',
        `Режим связи: ${mode}. Твоя роль относительно основного агента: ${describeConnectionMode(mode)}.`,
        'Сформируй только короткую экспертную заметку для другого агента: 2-3 предложения, без вступлений, без markdown.',
        referencedFiles.length ? `Упомянутые файлы: ${referencedFiles.join(', ')}.` : 'Файлы в запросе не выделены.',
      ].join(' '),
    },
    ...history.slice(-6).map(item => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: 'user',
      content: message.trim(),
    },
  ]

  if (settings.apiKey.trim()) {
    try {
      return condenseText(await callMessengerAgentModel(prompt, {
        model: settings.model,
        apiKey: settings.apiKey,
      }), 320)
    } catch {
      // fallback below keeps orchestration working without hard failure
    }
  }

  return condenseText(buildReplyByTopic(agent, message), 220)
}

export async function buildMessengerAgentReply(
  agentId: string,
  message: string,
  history: MessengerAgentReplyHistoryItem[] = [],
  runtimeHooks: MessengerAgentRuntimeHooks = {},
) {
  const agent = await findMessengerAgentById(agentId)
  if (!agent) {
    throw new Error('AGENT_NOT_FOUND')
  }
  const settings = await getMessengerAgentSettings(agentId)
  const connectedAgents = settings.connections
    .map((connection) => {
      const connectedAgent = MESSENGER_AGENTS.find(item => item.id === connection.targetAgentId && item.id !== agentId)
      return connectedAgent
        ? {
            agent: connectedAgent,
            mode: connection.mode,
          }
        : null
    })
    .filter((item): item is MessengerConnectedAgent => Boolean(item))
  const referencedFiles = extractReferencedFiles(message, history)
  const focus = summarizeFocus(message)
  const consultationNotes: MessengerAgentConsultationNote[] = []

  const normalizedMessage = message.trim()
  await runtimeHooks.onTrace?.({
    phase: 'started',
    status: 'running',
    summary: `Агент ${agent.displayName} принял задачу.`,
    focus,
    fileNames: referencedFiles,
  })
  await sleep(120)

  await runtimeHooks.onTrace?.({
    phase: 'context',
    status: 'running',
    summary: 'Собирает контекст диалога и недавние сообщения.',
    focus: history.length
      ? `Анализирует ${Math.min(history.length, 8)} последних сообщений.`
      : 'Работает только с текущим запросом.',
    fileNames: referencedFiles,
  })

  if (referencedFiles.length) {
    await sleep(120)
    await runtimeHooks.onTrace?.({
      phase: 'files',
      status: 'running',
      summary: 'Подтягивает задействованные файлы в рабочий контекст.',
      focus: referencedFiles.join(', '),
      fileNames: referencedFiles,
      artifacts: referencedFiles.map(fileName => ({
        kind: 'file' as const,
        label: 'Файл',
        content: fileName,
      })),
    })
  }

  for (const linkedAgent of connectedAgents) {
    await sleep(140)
    const consultation = await buildMessengerAgentConsultation(linkedAgent.agent, linkedAgent.mode, normalizedMessage || message, history, referencedFiles)
    consultationNotes.push({
      agentId: linkedAgent.agent.id,
      agentDisplayName: linkedAgent.agent.displayName,
      mode: linkedAgent.mode,
      content: consultation,
    })

    await runtimeHooks.onTrace?.({
      phase: 'consulting',
      status: 'running',
      summary: `Сверяет ответ с экспертизой агента ${linkedAgent.agent.displayName}.`,
      focus: `${linkedAgent.agent.description}. Режим: ${linkedAgent.mode}.`,
      activeTargetAgentIds: [linkedAgent.agent.id],
      activeConnections: [{
        targetAgentId: linkedAgent.agent.id,
        mode: linkedAgent.mode,
        payloadPreview: consultation,
      }],
      fileNames: referencedFiles,
      artifacts: [{
        kind: 'consultation',
        label: `${linkedAgent.agent.displayName} · ${linkedAgent.mode}`,
        content: consultation,
        agentId: linkedAgent.agent.id,
      }],
    })
  }

  await sleep(120)
  await runtimeHooks.onTrace?.({
    phase: 'reasoning',
    status: 'running',
    summary: 'Формирует итоговый ответ и порядок выдачи.',
    focus: connectedAgents.length
      ? 'Сводит пользовательский запрос, контекст и связанные экспертизы.'
      : 'Опирается на собственную специализацию и контекст диалога.',
    fileNames: referencedFiles,
    artifacts: consultationNotes.map(item => ({
      kind: 'summary',
      label: `${item.agentDisplayName} · ${item.mode}`,
      content: item.content,
      agentId: item.agentId,
    })),
  })

  if (!normalizedMessage || !settings.apiKey.trim()) {
    return buildReplyByTopic(agent, message)
  }

  try {
    return await callMessengerAgentModel(
      buildAgentPromptMessages(agent, normalizedMessage, history.slice(-8), connectedAgents, consultationNotes),
      {
        model: settings.model,
        apiKey: settings.apiKey,
      },
    )
  } catch {
    // Мягкий fallback оставляет агентский чат рабочим, даже если локальная модель недоступна.
  }

  return buildReplyByTopic(agent, message)
}