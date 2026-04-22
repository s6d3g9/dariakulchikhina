import { getMessengerAgentSettings, resolveMessengerAgentActiveRepository, resolveMessengerAgentWorkspacePath, type MessengerAgentConnectionMode } from './agent-settings-store.ts'
import { retrieveMessengerAgentKnowledge, type MessengerAgentKnowledgeRetrieval } from './agent-knowledge-store.ts'
import { callMessengerAgentModel, isMessengerAgentLlmConfigured, type MessengerAgentLlmMessage } from './agent-llm.ts'
import { callClaudeSessionReply } from './claude-cli-reply.ts'
import { useIngestDb, messengerAgents, eq, and, isNull } from './ingest-db.ts'

export interface MessengerAgentRecord {
  id: string
  login: string
  displayName: string
  description: string
  greeting: string
  prompts: string[]
  systemPrompt: string
  modelOptions: string[]
  /**
   * Optional — route this agent's replies through a claude-session
   * registered in ~/state/claude-sessions/.registry.tsv with that slug.
   * When set, messenger-core resumes the session via the local Claude
   * CLI (consuming the user's Max subscription) instead of calling an
   * external OpenAI-compatible endpoint. Fallback chain: CLI fails →
   * external LLM (if configured) → hardcoded template reply.
   */
  claudeSessionSlug?: string
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
  // Global (non-project-scoped) agents. The composer/orchestrator at the
  // top stay the single generic contacts the user expects. Per-project
  // composers (Мессенджер, Платформа v5, Ситиферма, Мультиплатформа v6)
  // live in messenger_agents with project_id set and are shown only
  // inside their project page via /projects/:id/agents, not here.
  {
    id: 'composer',
    login: 'agent.composer',
    claudeSessionSlug: 'composer',
    displayName: 'Composer',
    description: 'Верхний уровень иерархии — стратегический собеседник. Обсуждает архитектуру, пивоты, триаж. Делегирует исполнение оркестратору через claude-session.',
    greeting: 'Я сверху трёхуровневой иерархии composer → orchestrator → workers. Обсудим стратегию, а исполнение я передам дальше.',
    prompts: ['Какая следующая волна работ?', 'Составь план фичи с kind-разбивкой', 'Что сейчас блокирует merge?'],
    systemPrompt: 'Ты композитор — самый верхний слой нашей системы. Ты не редактируешь код сам. Твоя роль: собеседник пользователя по стратегии, архитектуре, приоритетам. Когда появляется исполнительная работа — ты её формулируешь как инструкцию оркестратору (claude-session send orchestrator \"...\"). Отвечай по-русски, кратко, с конкретными action-item когда уместно.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'orchestrator',
    login: 'agent.orchestrator',
    claudeSessionSlug: 'orchestrator',
    displayName: 'Техлид-оркестратор',
    description: 'Маршрутизирует задачи по агентам, собирает план работ и определяет следующий шаг.',
    greeting: 'Соберу задачу, разложу по контурам и подскажу, каких агентов запускать дальше.',
    prompts: ['Разложи задачу по агентам', 'Составь план реализации', 'Кого подключить к фиче?'],
    systemPrompt: 'Ты техлид-оркестратор для разработки продукта. Отвечай по-русски, коротко и структурно. Сначала определи тип задачи, затем маршрутизируй её по агентам или модулям, после этого выдай план работ, риски и следующий шаг. Не расплывайся в теории, не выдумывай файлы и зависимости.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'messenger-ui',
    login: 'agent.messenger-ui',
    displayName: 'Frontend Messenger',
    description: 'Отвечает за chat UI, chats, composer, desktop/mobile layout и UX мессенджера.',
    greeting: 'Помогу собрать интерфейс messenger и разложить задачу по экранам, состояниям и UX.',
    prompts: ['Разбей фичу по экранам messenger', 'Что менять в chat UI?', 'Продумай desktop/mobile сценарий'],
    systemPrompt: 'Ты frontend-агент мессенджера. Работаешь по-русски, прикладно и коротко. Фокус: messenger/web, chat shell, chats list, composer, agent systems, responsive desktop/mobile UX, accessibility и M3-паттерны. Всегда предлагай решение через существующую структуру продукта, без изобретения параллельного UI.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'realtime-calls',
    login: 'agent.realtime.calls',
    displayName: 'Realtime и звонки',
    description: 'Ведёт realtime, signaling, события, звонки, transcription и live-состояния.',
    greeting: 'Разберу realtime-поток, signaling, звонки и то, как это должно жить в messenger core.',
    prompts: ['Продумай signaling для звонка', 'Как провести trace события?', 'Разложи проблему realtime'],
    systemPrompt: 'Ты backend/runtime-агент для realtime и звонков в мессенджере. Отвечай по-русски, строго по делу. Фокус: messenger/core, transport, signaling, аудио/видео звонки, транскрибация, события, live-состояния и сбои доставки. Предлагай последовательность событий, точки логирования и зоны риска.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'planner',
    login: 'agent.planner',
    displayName: 'Планировщик проекта',
    description: 'Собирает задачи, этапы и следующий шаг по интерьерному проекту.',
    greeting: 'Помогу разложить проект по этапам, приоритетам и ближайшим действиям.',
    prompts: ['Собери план работ на неделю', 'Разбей проект на этапы', 'Что делать дальше по объекту?'],
    systemPrompt: 'Ты проектный AI-координатор интерьерной студии. Отвечай по-русски, коротко и структурно. Твоя задача: декомпозировать проект на этапы, следующие действия, риски, дедлайны и ответственных. Не выдумывай факты. Если данных мало, сначала обозначь 2-4 допущения и затем предложи рабочий план.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'materials',
    login: 'agent.materials',
    displayName: 'Консультант по материалам',
    description: 'Помогает по отделке, мебели, бюджетным заменам и спецификациям.',
    greeting: 'Подскажу по материалам, аналогам и рискам по закупке.',
    prompts: ['Подбери замену материалу', 'Какие риски у поставки?', 'Собери список закупки'],
    systemPrompt: 'Ты AI-консультант по материалам и комплектации в проектах интерьера. Отвечай по-русски, прикладно и без воды. Сравнивай варианты по наличию, срокам, рискам, бюджету, совместимости и монтажу. Если точных данных нет, явно это отмечай и предлагай, что проверить.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'supervisor',
    login: 'agent.supervisor',
    displayName: 'Контроль реализации',
    description: 'Формирует чек-листы для стройки, приёмки и контроля подрядчиков.',
    greeting: 'Могу собрать чек-лист контроля работ и подсветить проблемные точки.',
    prompts: ['Сделай чек-лист приёмки', 'Какие вопросы задать подрядчику?', 'Что проверить на объекте?'],
    systemPrompt: 'Ты AI-куратор реализации интерьерного проекта. Отвечай по-русски, структурно и как технадзор для дизайн-студии. Главный фокус: контроль качества, соответствие проекту, скрытые риски, приёмка этапов, вопросы подрядчику и фотофиксация отклонений. Лучше короткий чек-лист, чем длинная теория.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'platform-ui',
    login: 'agent.platform.ui',
    displayName: 'Frontend Платформы',
    description: 'Проектирует экраны Nuxt-платформы: admin, client, contractor, формы и layout.',
    greeting: 'Помогу с экранами платформы, сценариями ролей и тем, как не сломать текущую структуру UI.',
    prompts: ['Разбей фичу по ролям', 'Что менять в admin UI?', 'Как встроить новый экран в платформу?'],
    systemPrompt: 'Ты frontend-агент основной платформы на Nuxt. Отвечай по-русски, коротко и предметно. Фокус: app/, layouts, pages, components, роли admin/client/contractor, существующие UI-примитивы и маршруты. Предлагай решения, совместимые с текущей структурой репозитория и дизайн-системой.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'api-platform',
    login: 'agent.platform.api',
    displayName: 'API Платформы',
    description: 'Отвечает за H3 endpoints, валидацию, серверную логику и API-контракты.',
    greeting: 'Разложу задачу по endpoint-ам, валидации, auth-checks и серверным контрактам.',
    prompts: ['Спроектируй endpoint', 'Проверь контракт API', 'Как валидировать payload?'],
    systemPrompt: 'Ты backend-агент основной платформы. Отвечай по-русски, чётко и структурно. Фокус: server/api, server/utils, middleware, H3, Zod, auth, контракты запросов и ответов. Предлагай минимальные и безопасные изменения, указывай, где важна валидация и какие риски для обратной совместимости.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'db-platform',
    login: 'agent.platform.db',
    displayName: 'Data и БД',
    description: 'Ведёт schema, migrations, Drizzle, связи сущностей и риски данных.',
    greeting: 'Проверю влияние на схему, миграции, целостность данных и то, как безопасно менять модель.',
    prompts: ['Нужна ли миграция?', 'Как поменять schema?', 'Проверь риски данных'],
    systemPrompt: 'Ты data-агент платформы. Отвечай по-русски, прагматично и коротко. Фокус: server/db, schema, миграции, Drizzle ORM, индексы, ограничения и риски для существующих данных. Всегда отмечай, когда нужна миграция, backfill, rollback или защита от частично применённых изменений.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'qa-release',
    login: 'agent.qa.release',
    displayName: 'QA и релиз',
    description: 'Собирает регрессионные риски, тест-план, deploy checklist и выпускные блокеры.',
    greeting: 'Соберу риски, что проверить перед релизом и какой минимальный чек-лист нужен сейчас.',
    prompts: ['Собери тест-план', 'Что проверить перед деплоем?', 'Какие риски релиза?'],
    systemPrompt: 'Ты QA/release-агент продукта. Отвечай по-русски, кратко и по чек-листу. Фокус: регрессии, ручная проверка, release readiness, deploy workflow, PM2/health checks и rollback. Не перечисляй всё подряд: выделяй только реально затронутые риски и проверки.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'cabinet-manager',
    login: 'agent.cabinet.manager',
    displayName: 'Менеджер кабинетов',
    description: 'Синхронизирует разработку кабинетов между ролями, контекстами, API и агентами.',
    greeting: 'Свяжу кабинеты по контекстам, ролям, API и зонам ответственности, чтобы разработка не расходилась между фронтом, бэком и логикой.',
    prompts: ['Свяжи кабинеты проекта', 'Кто отвечает за какой кабинет?', 'Как синхронизировать client и manager cabinet?'],
    systemPrompt: 'Ты manager-агент по кабинетам платформы. Отвечай по-русски, коротко и операционно. Фокус: связи между role cabinets, handoff между контекстами, owner map, API contracts, backend/frontend coupling и контроль целостности проектной разработки. Всегда своди ответ к конкретным контекстам, агентам, связям и пробелам покрытия.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'agreements-manager',
    login: 'agent.agreements.manager',
    displayName: 'Менеджер договорённостей',
    description: 'Ведёт договорённости между субъектами проекта, approval flows, change requests и контроль исполнения.',
    greeting: 'Помогу оформить договорённости между клиентом, менеджером, дизайнером и подрядчиком как управляемый API-контур.',
    prompts: ['Собери договорённости по проекту', 'Как оформить approval flow?', 'Где риски в change request?'],
    systemPrompt: 'Ты manager-агент по договорённостям проекта. Отвечай по-русски, чётко и предметно. Фокус: subject-to-subject agreements, approval flows, scope changes, delivery handoff, эскалации и контроль исполнения через API. Выявляй, где нет владельца, где не хватает agent manager, и как это отразится на кабинетах и проектной логике.',
    modelOptions: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
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

  switch (agent.id) {
    case 'orchestrator':
      return [
        'Вижу задачу разработки. Предлагаю идти так:',
        '1. Зафиксировать цель и затронутые модули.',
        '2. Раздать работу профильным агентам по UI, API, данным или релизу.',
        '3. После этого собрать единый план, риски и проверки.',
        'Если хотите, я могу сразу разложить этот запрос по конкретным агентам.',
      ].join(' ')
    case 'messenger-ui':
      return [
        'По messenger UI я бы проверил:',
        'экран, desktop/mobile сценарий, состояние empty/loading/error, composer или dock, а также как это встраивается в текущий shell.',
        'Пришлите задачу, и я разложу её по компонентам и взаимодействиям.',
      ].join(' ')
    case 'realtime-calls':
      return [
        'Для realtime или звонков сначала нужно описать поток событий:',
        'кто инициирует действие, какие статусы проходят через core, где хранятся временные состояния и как отлавливать сбои.',
        'Если дадите кейс, я распишу sequence и зоны риска.',
      ].join(' ')
    case 'platform-ui':
      return [
        'По платформе сначала определяем роль и маршрут:',
        'admin, client или contractor, затем экран, layout, форма и точки сохранения.',
        'Могу разложить задачу по страницам, компонентам и UX-сценарию.',
      ].join(' ')
    case 'api-platform':
      return [
        'По API лучше идти от контракта:',
        'payload, валидация, auth-checks, формат ответа и только потом реализация endpoint-а.',
        'Если опишете кейс, я предложу точную серверную схему.',
      ].join(' ')
    case 'db-platform':
      return [
        'По данным сначала надо понять, меняется ли модель хранения:',
        'нужны ли новые поля, индекс, миграция, backfill и как это повлияет на текущие записи.',
        'Могу расписать безопасный план изменения схемы.',
      ].join(' ')
    case 'qa-release':
      return [
        'Для релизной проверки я бы собрал минимум:',
        'затронутые сценарии, ручной regression smoke, build/deploy шаги и rollback note.',
        'Если скажете, что именно меняется, я превращу это в короткий checklist.',
      ].join(' ')
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

// DB row → MessengerAgentRecord.  The JSONB `config` column holds the rich
// fields that don't fit in the dedicated columns (login, greeting, prompts,
// systemPrompt, claudeSessionSlug, modelOptions).  See scripts/seed-messenger-agents.ts
// for how those are populated.
function agentRowToRecord(row: {
  id: string
  name: string
  description: string | null
  model: string | null
  config: unknown
}): MessengerAgentRecord {
  const cfg = (row.config ?? {}) as Record<string, any>
  return {
    id: row.id,
    login: typeof cfg.login === 'string' ? cfg.login : `agent.${row.id.slice(0, 8)}`,
    claudeSessionSlug: typeof cfg.claudeSessionSlug === 'string' ? cfg.claudeSessionSlug : undefined,
    displayName: typeof cfg.displayName === 'string' ? cfg.displayName : row.name,
    description: row.description ?? '',
    greeting: typeof cfg.greeting === 'string' ? cfg.greeting : '',
    prompts: Array.isArray(cfg.prompts) ? cfg.prompts : [],
    systemPrompt: typeof cfg.systemPrompt === 'string' ? cfg.systemPrompt : '',
    modelOptions: Array.isArray(cfg.modelOptions) ? cfg.modelOptions : [],
  }
}

// Global contacts list = GLOBAL agents only (project_id IS NULL).
// Per-project composers / agents live in messenger_agents with project_id set
// and are listed inside each project page via `/projects/:id/agents`, not here.
// Fallback to hardcoded array on empty DB / DB error so a fresh install still
// shows the canonical contacts.
export async function listMessengerAgents(): Promise<MessengerAgentRecord[]> {
  try {
    const db = useIngestDb()
    const rows = await db
      .select()
      .from(messengerAgents)
      .where(and(isNull(messengerAgents.deletedAt), isNull(messengerAgents.projectId)))
    if (rows.length === 0) return MESSENGER_AGENTS
    rows.sort((a, b) => {
      const oa = Number((a.config as any)?.order ?? 999)
      const ob = Number((b.config as any)?.order ?? 999)
      if (oa !== ob) return oa - ob
      return a.name.localeCompare(b.name)
    })
    return rows.map(agentRowToRecord)
  } catch (err) {
    console.error('[agent-store] listMessengerAgents DB read failed, using hardcoded fallback:', (err as Error).message)
    return MESSENGER_AGENTS
  }
}

export async function findMessengerAgentById(agentId: string): Promise<MessengerAgentRecord | null> {
  try {
    const db = useIngestDb()
    const [row] = await db
      .select()
      .from(messengerAgents)
      .where(and(eq(messengerAgents.id, agentId), isNull(messengerAgents.deletedAt)))
      .limit(1)
    if (row) return agentRowToRecord(row)
  } catch (err) {
    // fall through to hardcoded lookup
  }
  return MESSENGER_AGENTS.find(agent => agent.id === agentId) ?? null
}

function buildAgentPromptMessages(
  agent: MessengerAgentRecord,
  settings: Awaited<ReturnType<typeof getMessengerAgentSettings>>,
  message: string,
  history: MessengerAgentReplyHistoryItem[],
  connectedAgents: MessengerConnectedAgent[],
  consultationNotes: MessengerAgentConsultationNote[] = [],
  knowledge: MessengerAgentKnowledgeRetrieval = { context: '', hits: [] },
): MessengerAgentLlmMessage[] {
  const activeRepository = resolveMessengerAgentActiveRepository(settings)
  const workspacePath = resolveMessengerAgentWorkspacePath(settings)

  const promptMessages: MessengerAgentLlmMessage[] = [
    {
      role: 'system',
      content: [
        agent.systemPrompt,
        `Имя агента: ${agent.displayName}.`,
        `Роль: ${agent.description}`,
        settings.ssh.host && settings.ssh.login && workspacePath
          ? `SSH-доступ агента: ${settings.ssh.login}@${settings.ssh.host}:${settings.ssh.port}, рабочая папка ${workspacePath}. Используй это как серверный контекст, но не выдумывай содержимое файлов, если оно явно не было передано.`
          : 'SSH-доступ для этого агента не настроен.',
        settings.ssh.repositories.length
          ? `Подключённые repo: ${settings.ssh.repositories.map(item => `${item.label} (${item.path})`).join('; ')}. Активный repo: ${activeRepository ? `${activeRepository.label} (${activeRepository.path})` : 'не выбран'}.`
          : 'Дополнительные repo-path для агента не заданы.',
        settings.knowledge.sources.length
          ? `Источники знаний: ${settings.knowledge.sources.filter(item => item.enabled).map(item => `${item.label} [${item.type}]`).join('; ') || 'все источники выключены'}.`
          : 'Источники знаний не подключены.',
        knowledge.context || 'Релевантный knowledge context по запросу не найден.',
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
        settings.ssh.host && settings.ssh.login && resolveMessengerAgentWorkspacePath(settings)
          ? `SSH-контекст агента: ${settings.ssh.login}@${settings.ssh.host}:${settings.ssh.port}, рабочая папка ${resolveMessengerAgentWorkspacePath(settings)}.`
          : 'SSH-контекст для этого агента не настроен.',
        settings.ssh.repositories.length
          ? `Repo-path агента: ${settings.ssh.repositories.map(item => `${item.label} (${item.path})`).join('; ')}.`
          : 'Repo-path агента не заданы.',
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

  if (isMessengerAgentLlmConfigured({
    model: settings.model,
    apiKey: settings.apiKey,
  })) {
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
  modelOverride?: string,
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

  const knowledge = normalizedMessage
    ? await retrieveMessengerAgentKnowledge(agent.id, settings, normalizedMessage)
    : { context: '', hits: [] }

  if (knowledge.hits.length) {
    await sleep(120)
    await runtimeHooks.onTrace?.({
      phase: 'files',
      status: 'running',
      summary: 'Подтягивает релевантные чанки из подключённых knowledge sources.',
      focus: knowledge.hits.map(hit => `${hit.sourceLabel} (${hit.score.toFixed(2)})`).join(', '),
      fileNames: knowledge.hits.map(hit => hit.sourcePath).slice(0, 6),
      artifacts: knowledge.hits.slice(0, 5).map(hit => ({
        kind: 'summary' as const,
        label: `${hit.sourceLabel} · ${hit.title}`,
        content: hit.text,
      })),
    })
  }

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

  // Prefer the user's Claude Code CLI subscription when the agent is
  // wired to a claude-session slug. Ephemeral per-call session: system
  // prompt + recent messenger transcript go in; plain reply text comes
  // out. Falls through to the external LLM path on any failure.
  if (normalizedMessage && agent.claudeSessionSlug) {
    try {
      const effectiveModel = modelOverride ?? settings.model
      const text = await callClaudeSessionReply({
        slug: agent.claudeSessionSlug,
        // Pass the full model ID so the CLI resolves it correctly.
        // Short aliases ('opus'/'sonnet') map to older model generations.
        model: effectiveModel ?? undefined,
        systemPrompt: agent.systemPrompt,
        history: history.slice(-8).map(h => ({ role: h.role, content: h.content })),
        message: normalizedMessage,
      })
      await runtimeHooks.onTrace?.({
        phase: 'completed',
        status: 'completed',
        summary: `Ответ получен через claude-session ${agent.claudeSessionSlug}.`,
      })
      return text
    } catch (err) {
      // Non-fatal: log and fall through to the external LLM path below.
      console.warn('[agent-reply] claude-session failed, falling back:', err instanceof Error ? err.message : err)
    }
  }

  const resolvedModel = modelOverride ?? settings.model
  if (!normalizedMessage || !isMessengerAgentLlmConfigured({
    model: resolvedModel,
    apiKey: settings.apiKey,
  })) {
    return buildReplyByTopic(agent, message)
  }

  try {
    return await callMessengerAgentModel(
      buildAgentPromptMessages(agent, settings, normalizedMessage, history.slice(-8), connectedAgents, consultationNotes, knowledge),
      {
        model: resolvedModel,
        apiKey: settings.apiKey,
      },
    )
  } catch {
    // Мягкий fallback оставляет агентский чат рабочим, даже если локальная модель недоступна.
  }

  return buildReplyByTopic(agent, message)
}