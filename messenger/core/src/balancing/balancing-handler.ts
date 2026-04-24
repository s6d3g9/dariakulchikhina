import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { readBearerToken, verifyMessengerToken } from '../auth/auth.ts'
import { readMessengerConfig } from '../config.ts'

const presetSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(''),
  model: z.enum(['haiku', 'sonnet', 'opus']),
  agentStyle: z.enum(['subagent', 'tmux-session', 'mixed']),
  useWorktree: z.boolean(),
  maxParallel: z.number().int().min(1).max(8),
  whenToUse: z.string().max(500).default(''),
})

const stateSchema = z.object({
  activePresetId: z.string().nullable(),
  presets: z.array(presetSchema).min(1),
})

export type BalancingPreset = z.infer<typeof presetSchema>
export type BalancingState = z.infer<typeof stateSchema>

const DEFAULT_STATE: BalancingState = {
  activePresetId: null,
  presets: [
    {
      id: 'economy',
      name: 'Экономия токенов',
      description: 'Haiku + subagent, без worktree. Минимум расходов на простые задачи.',
      model: 'haiku',
      agentStyle: 'subagent',
      useWorktree: false,
      maxParallel: 2,
      whenToUse: 'Поиск по коду, мелкие правки, чтение файлов, разовые ответы.',
    },
    {
      id: 'balanced',
      name: 'Сбалансированный',
      description: 'Sonnet, смешанный стиль, worktree по необходимости. Хорошая отдача на среднюю задачу.',
      model: 'sonnet',
      agentStyle: 'mixed',
      useWorktree: true,
      maxParallel: 3,
      whenToUse: 'Обычные фичи, рефакторинг одного-двух модулей, типичная разработка.',
    },
    {
      id: 'deep',
      name: 'Глубокий',
      description: 'Opus + параллельные worktree. Максимальное качество и пропускная способность.',
      model: 'opus',
      agentStyle: 'subagent',
      useWorktree: true,
      maxParallel: 4,
      whenToUse: 'Архитектура, сложные рефакторы, несколько независимых задач разом.',
    },
    {
      id: 'visible',
      name: 'Наблюдаемый',
      description: 'claude-session tmux. Прогресс виден в мессенджере в реальном времени.',
      model: 'sonnet',
      agentStyle: 'tmux-session',
      useWorktree: true,
      maxParallel: 2,
      whenToUse: 'Долгие задачи, когда важно наблюдать за ходом работы в UI.',
    },
  ],
}

function resolveStatePath(): string {
  const { MESSENGER_PROJECT_ROOT } = readMessengerConfig()
  return resolve(MESSENGER_PROJECT_ROOT, '.claude-balancing.json')
}

async function readState(): Promise<BalancingState> {
  const path = resolveStatePath()
  try {
    const raw = await readFile(path, 'utf8')
    return stateSchema.parse(JSON.parse(raw))
  }
  catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return DEFAULT_STATE
    }
    throw err
  }
}

async function writeState(state: BalancingState): Promise<void> {
  const path = resolveStatePath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(state, null, 2) + '\n', 'utf8')
}

function resolveSessionAuth(request: { headers: { authorization?: string } }) {
  const config = readMessengerConfig()
  const token = readBearerToken(request.headers.authorization ?? '')
  if (!token) return null
  return verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
}

export function registerBalancingRoutes(app: FastifyInstance): void {
  app.get('/balancing', async (request, reply) => {
    const session = resolveSessionAuth(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const state = await readState()
    return { state, configPath: resolveStatePath() }
  })

  app.put<{ Body: unknown }>('/balancing', async (request, reply) => {
    const session = resolveSessionAuth(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const parsed = stateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_STATE', details: parsed.error.flatten() })
    }

    const state = parsed.data
    if (state.activePresetId !== null && !state.presets.some(p => p.id === state.activePresetId)) {
      return reply.code(400).send({ error: 'UNKNOWN_ACTIVE_PRESET' })
    }

    await writeState(state)
    return { state, configPath: resolveStatePath() }
  })

  app.post('/balancing/reset', async (request, reply) => {
    const session = resolveSessionAuth(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    await writeState(DEFAULT_STATE)
    return { state: DEFAULT_STATE, configPath: resolveStatePath() }
  })
}
