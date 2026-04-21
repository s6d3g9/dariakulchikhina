#!/usr/bin/env -S node --experimental-strip-types
/**
 * scripts/seed-messenger-agents.ts — single source of truth for messenger
 * projects + agents. Idempotent upsert pipeline that keeps the DB in sync
 * with two upstream inputs:
 *
 *   1. ~/state/claude-sessions/.projects.json  (dashboard's project list)
 *   2. Hardcoded GLOBAL_AGENTS in this file    (orchestrator + specialists)
 *
 * Run before first boot and re-run after dashboard adds/removes a project.
 * Called automatically from POST /api/projects in the dashboard (via runBin)
 * and from messenger-core startup if messenger_agents is empty.
 *
 *   DATABASE_URL=...  node --experimental-strip-types scripts/seed-messenger-agents.ts
 *
 * Owner resolution: the `admin` user in messenger_users (inserted manually
 * during auth setup). Aborts with exit 2 if that user is missing.
 */
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID, randomBytes } from 'node:crypto'

function envFromDotEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (const ln of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/i.exec(ln)
      if (m) out[m[1]] = m[2]
    }
  } catch { /* no .env */ }
  return out
}

const env = { ...envFromDotEnv(), ...process.env }
const url = env.MESSENGER_CORE_DATABASE_URL || env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL / MESSENGER_CORE_DATABASE_URL not set')

const PROJECTS_FILE = join(homedir(), 'state/claude-sessions/.projects.json')

type DashboardProject = { id: string; name: string; kind: 'development' | 'refactor'; color?: string }
type DashboardState = { projects: DashboardProject[]; assignments: Record<string, string>; categories?: Record<string, string> }

function loadDashboardState(): DashboardState {
  try {
    const raw = readFileSync(PROJECTS_FILE, 'utf8')
    const j = JSON.parse(raw)
    return {
      projects: j.projects || [],
      assignments: j.assignments || {},
      categories: j.categories || {},
    }
  } catch {
    return { projects: [], assignments: {}, categories: {} }
  }
}

// ── Global (non-project-scoped) agents that always exist ─────────────────
// One-to-one with messenger/core/src/agents/agent-store.ts MESSENGER_AGENTS
// hardcoded list. Project-scoped composers are created separately (below).
const GLOBAL_AGENTS = [
  {
    name: 'Composer',
    login: 'agent.composer',
    description: 'Верхний уровень иерархии — стратегический собеседник. Обсуждает архитектуру, пивоты, триаж. Делегирует исполнение оркестратору через claude-session.',
    model: 'sonnet',
    config: {
      kind: 'composer', claudeSessionSlug: 'composer', displayName: 'Composer', order: 0,
      greeting: 'Я сверху трёхуровневой иерархии composer → orchestrator → workers. Обсудим стратегию, а исполнение я передам дальше.',
      prompts: ['Какая следующая волна работ?', 'Составь план фичи с kind-разбивкой', 'Что сейчас блокирует merge?'],
      systemPrompt: 'Ты композитор — самый верхний слой нашей системы. Ты не редактируешь код сам. Твоя роль: собеседник пользователя по стратегии, архитектуре, приоритетам. Когда появляется исполнительная работа — ты её формулируешь как инструкцию оркестратору (claude-session send orchestrator \"...\"). Отвечай по-русски, кратко, с конкретными action-item когда уместно.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Техлид-оркестратор',
    login: 'agent.orchestrator',
    description: 'Маршрутизирует задачи по агентам, собирает план работ и определяет следующий шаг.',
    model: 'opus',
    config: {
      kind: 'orchestrator', claudeSessionSlug: 'orchestrator', displayName: 'Техлид-оркестратор', order: 10,
      greeting: 'Соберу задачу, разложу по контурам и подскажу, каких агентов запускать дальше.',
      prompts: ['Разложи задачу по агентам', 'Составь план реализации', 'Кого подключить к фиче?'],
      systemPrompt: 'Ты техлид-оркестратор для разработки продукта. Отвечай по-русски, коротко и структурно. Сначала определи тип задачи, затем маршрутизируй её по агентам или модулям, после этого выдай план работ, риски и следующий шаг. Не расплывайся в теории, не выдумывай файлы и зависимости.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Frontend Messenger', login: 'agent.messenger-ui', model: 'sonnet',
    description: 'Отвечает за chat UI, chats, composer, desktop/mobile layout и UX мессенджера.',
    config: {
      kind: 'frontend-ui', displayName: 'Frontend Messenger', order: 20,
      greeting: 'Помогу собрать интерфейс messenger и разложить задачу по экранам, состояниям и UX.',
      prompts: ['Разбей фичу по экранам messenger', 'Что менять в chat UI?', 'Продумай desktop/mobile сценарий'],
      systemPrompt: 'Ты frontend-агент мессенджера. Работаешь по-русски, прикладно и коротко. Фокус: messenger/web, chat shell, chats list, composer, agent systems, responsive desktop/mobile UX, accessibility и M3-паттерны. Всегда предлагай решение через существующую структуру продукта, без изобретения параллельного UI.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Realtime и звонки', login: 'agent.realtime.calls', model: 'sonnet',
    description: 'Ведёт realtime, signaling, события, звонки, transcription и live-состояния.',
    config: {
      kind: 'messenger-realtime', displayName: 'Realtime и звонки', order: 30,
      greeting: 'Разберу realtime-поток, signaling, звонки и то, как это должно жить в messenger core.',
      prompts: ['Продумай signaling для звонка', 'Как провести trace события?', 'Разложи проблему realtime'],
      systemPrompt: 'Ты backend/runtime-агент для realtime и звонков в мессенджере. Отвечай по-русски, строго по делу. Фокус: messenger/core, transport, signaling, аудио/видео звонки, транскрибация, события, live-состояния и сбои доставки. Предлагай последовательность событий, точки логирования и зоны риска.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Планировщик проекта', login: 'agent.planner', model: 'sonnet',
    description: 'Собирает задачи, этапы и следующий шаг по интерьерному проекту.',
    config: {
      kind: 'planner', displayName: 'Планировщик проекта', order: 40,
      greeting: 'Помогу разложить проект по этапам, приоритетам и ближайшим действиям.',
      prompts: ['Собери план работ на неделю', 'Разбей проект на этапы', 'Что делать дальше по объекту?'],
      systemPrompt: 'Ты проектный AI-координатор интерьерной студии. Отвечай по-русски, коротко и структурно. Твоя задача: декомпозировать проект на этапы, следующие действия, риски, дедлайны и ответственных. Не выдумывай факты. Если данных мало, сначала обозначь 2-4 допущения и затем предложи рабочий план.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Консультант по материалам', login: 'agent.materials', model: 'sonnet',
    description: 'Помогает по отделке, мебели, бюджетным заменам и спецификациям.',
    config: {
      kind: 'materials', displayName: 'Консультант по материалам', order: 50,
      greeting: 'Подскажу по материалам, аналогам и рискам по закупке.',
      prompts: ['Подбери замену материалу', 'Какие риски у поставки?', 'Собери список закупки'],
      systemPrompt: 'Ты AI-консультант по материалам и комплектации в проектах интерьера. Отвечай по-русски, прикладно и без воды. Сравнивай варианты по наличию, срокам, рискам, бюджету, совместимости и монтажу. Если точных данных нет, явно это отмечай и предлагай, что проверить.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Контроль реализации', login: 'agent.supervisor', model: 'sonnet',
    description: 'Формирует чек-листы для стройки, приёмки и контроля подрядчиков.',
    config: {
      kind: 'supervisor', displayName: 'Контроль реализации', order: 60,
      greeting: 'Могу собрать чек-лист контроля работ и подсветить проблемные точки.',
      prompts: ['Сделай чек-лист приёмки', 'Какие вопросы задать подрядчику?', 'Что проверить на объекте?'],
      systemPrompt: 'Ты AI-куратор реализации интерьерного проекта. Отвечай по-русски, структурно и как технадзор для дизайн-студии. Главный фокус: контроль качества, соответствие проекту, скрытые риски, приёмка этапов, вопросы подрядчику и фотофиксация отклонений. Лучше короткий чек-лист, чем длинная теория.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Frontend Платформы', login: 'agent.platform.ui', model: 'sonnet',
    description: 'Проектирует экраны Nuxt-платформы: admin, client, contractor, формы и layout.',
    config: {
      kind: 'platform-ui', displayName: 'Frontend Платформы', order: 70,
      greeting: 'Помогу с экранами платформы, сценариями ролей и тем, как не сломать текущую структуру UI.',
      prompts: ['Разбей фичу по ролям', 'Что менять в admin UI?', 'Как встроить новый экран в платформу?'],
      systemPrompt: 'Ты frontend-агент основной платформы на Nuxt. Отвечай по-русски, коротко и предметно. Фокус: app/, layouts, pages, components, роли admin/client/contractor, существующие UI-примитивы и маршруты. Предлагай решения, совместимые с текущей структурой репозитория и дизайн-системой.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'API Платформы', login: 'agent.platform.api', model: 'sonnet',
    description: 'Отвечает за H3 endpoints, валидацию, серверную логику и API-контракты.',
    config: {
      kind: 'api-platform', displayName: 'API Платформы', order: 80,
      greeting: 'Разложу задачу по endpoint-ам, валидации, auth-checks и серверным контрактам.',
      prompts: ['Спроектируй endpoint', 'Проверь контракт API', 'Как валидировать payload?'],
      systemPrompt: 'Ты backend-агент основной платформы. Отвечай по-русски, чётко и структурно. Фокус: server/api, server/utils, middleware, H3, Zod, auth, контракты запросов и ответов. Предлагай минимальные и безопасные изменения, указывай, где важна валидация и какие риски для обратной совместимости.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Data и БД', login: 'agent.platform.db', model: 'sonnet',
    description: 'Ведёт schema, migrations, Drizzle, связи сущностей и риски данных.',
    config: {
      kind: 'db-platform', displayName: 'Data и БД', order: 90,
      greeting: 'Проверю влияние на схему, миграции, целостность данных и то, как безопасно менять модель.',
      prompts: ['Нужна ли миграция?', 'Как поменять schema?', 'Проверь риски данных'],
      systemPrompt: 'Ты data-агент платформы. Отвечай по-русски, прагматично и коротко. Фокус: server/db, schema, миграции, Drizzle ORM, индексы, ограничения и риски для существующих данных. Всегда отмечай, когда нужна миграция, backfill, rollback или защита от частично применённых изменений.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'QA и релиз', login: 'agent.qa.release', model: 'sonnet',
    description: 'Собирает регрессионные риски, тест-план, deploy checklist и выпускные блокеры.',
    config: {
      kind: 'qa-release', displayName: 'QA и релиз', order: 100,
      greeting: 'Соберу риски, что проверить перед релизом и какой минимальный чек-лист нужен сейчас.',
      prompts: ['Собери тест-план', 'Что проверить перед деплоем?', 'Какие риски релиза?'],
      systemPrompt: 'Ты QA/release-агент продукта. Отвечай по-русски, кратко и по чек-листу. Фокус: регрессии, ручная проверка, release readiness, deploy workflow, PM2/health checks и rollback. Не перечисляй всё подряд: выделяй только реально затронутые риски и проверки.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Менеджер кабинетов', login: 'agent.cabinet.manager', model: 'sonnet',
    description: 'Синхронизирует разработку кабинетов между ролями, контекстами, API и агентами.',
    config: {
      kind: 'cabinet-manager', displayName: 'Менеджер кабинетов', order: 110,
      greeting: 'Свяжу кабинеты по контекстам, ролям, API и зонам ответственности, чтобы разработка не расходилась между фронтом, бэком и логикой.',
      prompts: ['Свяжи кабинеты проекта', 'Кто отвечает за какой кабинет?', 'Как синхронизировать client и manager cabinet?'],
      systemPrompt: 'Ты manager-агент по кабинетам платформы. Отвечай по-русски, коротко и операционно. Фокус: связи между role cabinets, handoff между контекстами, owner map, API contracts, backend/frontend coupling и контроль целостности проектной разработки.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
  {
    name: 'Менеджер договорённостей', login: 'agent.agreements.manager', model: 'sonnet',
    description: 'Ведёт договорённости между субъектами проекта, approval flows, change requests и контроль исполнения.',
    config: {
      kind: 'agreements-manager', displayName: 'Менеджер договорённостей', order: 120,
      greeting: 'Помогу оформить договорённости между клиентом, менеджером, дизайнером и подрядчиком как управляемый API-контур.',
      prompts: ['Собери договорённости по проекту', 'Как оформить approval flow?', 'Где риски в change request?'],
      systemPrompt: 'Ты manager-агент по договорённостям проекта. Отвечай по-русски, чётко и предметно. Фокус: subject-to-subject agreements, approval flows, scope changes, delivery handoff, эскалации и контроль исполнения через API.',
      modelOptions: ['GPT-5.4', 'gpt-4.1'],
    },
  },
]

// ── Translit helper (mirrors dashboard's deriveComposerSlug) ──────────
const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',
  й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',
  у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sh',ъ:'',ы:'y',ь:'',
  э:'e',ю:'yu',я:'ya',
}
function translitName(s: string): string {
  return s.toLowerCase().split('').map(c => TRANSLIT[c] ?? c).join('')
}
function composerSlugFor(projectName: string): string {
  const base = translitName(projectName).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
  return 'composer-' + (base || 'project')
}

function composerSystemPrompt(projectName: string, kind: string): string {
  return [
    `Ты композитор проекта "${projectName}" (${kind === 'refactor' ? 'рефакторинг' : 'разработка'}).`,
    `Ты самый верхний слой иерархии для этого проекта: общаешься с пользователем, декомпозируешь задачи и делегируешь orchestrator-у через \`claude-session send <orchestrator-slug> "..."\`.`,
    `Сам код не правишь. Отвечай по-русски, кратко, с action-item.`,
  ].join(' ')
}

const sql = postgres(url)

type AgentRow = {
  id: string
  owner_user_id: string
  project_id: string | null
  name: string
  description: string | null
  model: string | null
  config: any
}

function projectSlugFor(name: string): string {
  const base = translitName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  return base || 'project-' + Date.now().toString(36)
}

async function upsertProject(ownerUserId: string, dashProj: DashboardProject): Promise<string> {
  const slug = projectSlugFor(dashProj.name)
  const description = 'Dashboard project: ' + dashProj.kind
  const color = dashProj.color || null
  // Idempotency key = (owner_user_id, slug); fall back to name match for legacy rows.
  const [exists] = await sql`
    SELECT id FROM messenger_projects
    WHERE owner_user_id = ${ownerUserId} AND deleted_at IS NULL AND (slug = ${slug} OR name = ${dashProj.name})
    LIMIT 1
  `
  if (exists) {
    await sql`
      UPDATE messenger_projects
      SET slug = ${slug},
          name = ${dashProj.name},
          description = ${description},
          color = ${color},
          updated_at = NOW()
      WHERE id = ${exists.id}
    `
    return exists.id as string
  }
  const id = randomUUID()
  await sql`
    INSERT INTO messenger_projects (id, owner_user_id, slug, name, description, color, config)
    VALUES (${id}, ${ownerUserId}, ${slug}, ${dashProj.name}, ${description}, ${color}, ${sql.json({ kind: dashProj.kind })})
  `
  console.log('seed: + project', dashProj.name, '→', id)
  return id
}

async function upsertAgent(
  ownerUserId: string,
  spec: {
    name: string
    description: string
    model: string
    projectId?: string | null
    config: Record<string, any>
  },
): Promise<string> {
  const [exists] = await sql<AgentRow[]>`
    SELECT id, config FROM messenger_agents
    WHERE name = ${spec.name} AND owner_user_id = ${ownerUserId} AND deleted_at IS NULL
    LIMIT 1
  `
  if (exists) {
    const mergedConfig = { ...(exists as any).config, ...spec.config }
    await sql`
      UPDATE messenger_agents
      SET description = ${spec.description},
          model = ${spec.model},
          project_id = ${spec.projectId ?? null},
          config = ${sql.json(mergedConfig)},
          updated_at = NOW()
      WHERE id = ${exists.id}
    `
    return exists.id as string
  }
  const id = randomUUID()
  const ingestToken = 'mag_' + randomBytes(24).toString('base64url')
  await sql`
    INSERT INTO messenger_agents (id, owner_user_id, project_id, name, description, model, ingest_token, config)
    VALUES (${id}, ${ownerUserId}, ${spec.projectId ?? null}, ${spec.name}, ${spec.description}, ${spec.model}, ${ingestToken}, ${sql.json(spec.config)})
  `
  console.log('seed: + agent', spec.name, '→', id)
  return id
}

async function main() {
  const [{ id: ownerUserId } = { id: '' }] = await sql`
    SELECT id FROM messenger_users WHERE login = 'admin' AND deleted_at IS NULL LIMIT 1
  `
  if (!ownerUserId) {
    console.error('seed: no `admin` user in messenger_users; register one first')
    process.exit(2)
  }
  console.log('seed: owner =', ownerUserId)

  // 1. Global (non-project) agents.
  for (const spec of GLOBAL_AGENTS) {
    await upsertAgent(ownerUserId, {
      name: spec.name,
      description: spec.description,
      model: spec.model,
      projectId: null,
      config: { ...spec.config, login: spec.login },
    })
  }

  // 2. Dashboard projects → messenger_projects + one composer per project.
  const dash = loadDashboardState()
  console.log('seed: dashboard has', dash.projects.length, 'projects')
  for (const dp of dash.projects) {
    const mpId = await upsertProject(ownerUserId, dp)
    const composerSlug = composerSlugFor(dp.name)
    const composerName = `Composer · ${dp.name}`
    await upsertAgent(ownerUserId, {
      name: composerName,
      description: `Composer проекта ${dp.name} (${dp.kind === 'refactor' ? 'рефакторинг' : 'разработка'}). Верхний уровень иерархии.`,
      model: 'sonnet',
      projectId: mpId,
      config: {
        kind: 'composer',
        claudeSessionSlug: composerSlug,
        displayName: composerName,
        login: `agent.composer.${translitName(dp.name).replace(/[^a-z0-9]+/g, '-')}`,
        greeting: `Composer проекта ${dp.name}. Что решаем?`,
        prompts: ['Какая следующая волна работ?', 'Составь план фичи с kind-разбивкой', 'Что сейчас блокирует merge?'],
        systemPrompt: composerSystemPrompt(dp.name, dp.kind),
        modelOptions: ['GPT-5.4', 'gpt-4.1'],
        projectKind: dp.kind,
        order: 0,
        pinned: true,
      },
    })
  }

  await sql.end()
  console.log('seed: done')
}

main().catch(err => {
  console.error('seed: failed:', err.message || err)
  process.exit(1)
})
