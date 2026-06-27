import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { readMessengerConfig } from './config.ts'

const execFileAsync = promisify(execFile)

export interface MessengerAgentLlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface MessengerAgentLlmOptions {
  model?: string
  apiKey?: string
  taskClass?: MessengerAgentTaskClass
  riskTier?: MessengerAgentRiskTier
  costTier?: MessengerAgentCostTier
  effort?: MessengerAgentEffort
  subscriptionTier?: MessengerAgentSubscriptionTier
  providerHints?: MessengerAgentProviderHint[]
  budgetCaps?: MessengerAgentBudgetCaps
}

export type MessengerAgentTaskClass =
  | 'agent-reply'
  | 'agent-consultation'
  | 'call-analysis'
  | 'summary'
  | 'quick-check'
  | 'architecture-review'

export type MessengerAgentRiskTier = 'low' | 'medium' | 'high' | 'critical'
export type MessengerAgentCostTier = 'local' | 'cheap' | 'balanced' | 'premium' | 'max'
export type MessengerAgentEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type MessengerAgentSubscriptionTier = 'local' | 'free' | 'plus' | 'pro' | 'team' | 'enterprise'
export type MessengerAgentProviderKind = 'openai-compatible' | 'ollama-native' | 'cli'
export type MessengerAgentProviderHint = MessengerAgentProviderKind | 'local'

export interface MessengerAgentBudgetCaps {
  maxTokens?: number
  timeoutMs?: number
  temperature?: number
}

export interface MessengerAgentLlmRouteMeta {
  taskClass: MessengerAgentTaskClass
  riskTier: MessengerAgentRiskTier
  costTier: MessengerAgentCostTier
  effort: MessengerAgentEffort
  subscriptionTier: MessengerAgentSubscriptionTier
  modelUsed: string
  providerUsed: MessengerAgentProviderKind
  fallbackDepth: number
}

export interface MessengerAgentLlmResult {
  content: string
  route: MessengerAgentLlmRouteMeta
}

export interface MessengerAgentRouteCandidate {
  rank: number
  model: string
  provider: MessengerAgentProviderKind
  cliProvider?: 'claude' | 'codex'
  costTier: MessengerAgentCostTier
  maxRiskTier: MessengerAgentRiskTier
  subscriptionTiers: MessengerAgentSubscriptionTier[]
  maxTokens: number
  taskClasses: MessengerAgentTaskClass[]
  reason: string
}

export interface MessengerAgentRoutePreview {
  taskClass: MessengerAgentTaskClass
  riskTier: MessengerAgentRiskTier
  costTier: MessengerAgentCostTier
  effort: MessengerAgentEffort
  subscriptionTier: MessengerAgentSubscriptionTier
  configured: boolean
  candidates: MessengerAgentRouteCandidate[]
}

interface MessengerAgentRoutePolicy {
  riskTier: MessengerAgentRiskTier
  costTier: MessengerAgentCostTier
  effort: MessengerAgentEffort
  maxTokens: number
}

interface MessengerAgentModelRoute {
  model: string
  aliases?: string[]
  provider: MessengerAgentProviderKind
  cliProvider?: 'claude' | 'codex'
  cliModel?: string
  cliEffort?: MessengerAgentEffort
  costTier: MessengerAgentCostTier
  maxRiskTier: MessengerAgentRiskTier
  subscriptionTiers: MessengerAgentSubscriptionTier[]
  maxTokens: number
  timeoutMs?: number
  temperature?: number
  taskClasses?: MessengerAgentTaskClass[]
}

interface OllamaChatPayload {
  message?: {
    content?: string
  }
}

const COST_RANK: Record<MessengerAgentCostTier, number> = {
  local: 0,
  cheap: 1,
  balanced: 2,
  premium: 3,
  max: 4,
}

const RISK_RANK: Record<MessengerAgentRiskTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

const TASK_POLICIES: Record<MessengerAgentTaskClass, MessengerAgentRoutePolicy> = {
  'agent-reply': {
    riskTier: 'low',
    costTier: 'balanced',
    effort: 'medium',
    maxTokens: 700,
  },
  'agent-consultation': {
    riskTier: 'low',
    costTier: 'cheap',
    effort: 'low',
    maxTokens: 360,
  },
  'call-analysis': {
    riskTier: 'medium',
    costTier: 'premium',
    effort: 'medium',
    maxTokens: 900,
  },
  summary: {
    riskTier: 'low',
    costTier: 'cheap',
    effort: 'low',
    maxTokens: 420,
  },
  'quick-check': {
    riskTier: 'low',
    costTier: 'cheap',
    effort: 'low',
    maxTokens: 350,
  },
  'architecture-review': {
    riskTier: 'high',
    costTier: 'premium',
    effort: 'high',
    maxTokens: 1000,
  },
}

const ALL_SUBSCRIPTION_TIERS: MessengerAgentSubscriptionTier[] = ['local', 'free', 'plus', 'pro', 'team', 'enterprise']
const PAID_SUBSCRIPTION_TIERS: MessengerAgentSubscriptionTier[] = ['plus', 'pro', 'team', 'enterprise']
const PRO_SUBSCRIPTION_TIERS: MessengerAgentSubscriptionTier[] = ['pro', 'team', 'enterprise']

function buildOpenAiCompatibleUrl(baseUrl: string, endpoint: string) {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedEndpoint = endpoint.replace(/^\//, '')

  if (/\/v\d+$/iu.test(normalizedBase) || /\/openai\/v\d+$/iu.test(normalizedBase)) {
    return `${normalizedBase}/${normalizedEndpoint}`
  }

  return `${normalizedBase}/v1/${normalizedEndpoint}`
}

function buildOllamaNativeUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/chat`
}

function shouldTryNativeOllamaFallback(baseUrl: string, apiKey: string) {
  return !apiKey && /(^https?:\/\/[^\s]+:11434(?:\/|$))|ollama|localhost:11434|127\.0\.0\.1:11434/iu.test(baseUrl)
}

function normalizeModelKey(value: string) {
  return value.trim().toLowerCase()
}

function normalizeSubscriptionTier(value: string | undefined): MessengerAgentSubscriptionTier {
  if (value === 'local' || value === 'free' || value === 'plus' || value === 'pro' || value === 'team' || value === 'enterprise') {
    return value
  }

  return 'team'
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value!)))
}

function clampTemperature(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(1.5, Math.max(0, Number(value)))
}

function createRoute(
  model: string,
  provider: MessengerAgentProviderKind,
  costTier: MessengerAgentCostTier,
  maxRiskTier: MessengerAgentRiskTier,
  subscriptionTiers: MessengerAgentSubscriptionTier[],
  maxTokens: number,
  extra: Partial<MessengerAgentModelRoute> = {},
): MessengerAgentModelRoute | null {
  const normalizedModel = model.trim()
  if (!normalizedModel) return null

  return {
    model: normalizedModel,
    provider,
    costTier,
    maxRiskTier,
    subscriptionTiers,
    maxTokens,
    ...extra,
  }
}

function addRoute(
  routes: MessengerAgentModelRoute[],
  seen: Set<string>,
  route: MessengerAgentModelRoute | null,
) {
  if (!route) return

  const keys = [route.model, ...(route.aliases || [])].map(normalizeModelKey)
  if (keys.some(key => seen.has(key))) return

  routes.push(route)
  keys.forEach(key => seen.add(key))
}

function buildMessengerAgentModelCatalog(config: ReturnType<typeof readMessengerConfig>): MessengerAgentModelRoute[] {
  const routes: MessengerAgentModelRoute[] = []
  const seen = new Set<string>()

  addRoute(routes, seen, createRoute(config.MESSENGER_AGENT_LOCAL_MODEL, 'ollama-native', 'local', 'medium', ALL_SUBSCRIPTION_TIERS, 600, {
    taskClasses: ['agent-reply', 'agent-consultation', 'call-analysis', 'summary', 'quick-check'],
  }))
  addRoute(routes, seen, createRoute('qwen3:4b', 'ollama-native', 'local', 'low', ALL_SUBSCRIPTION_TIERS, 420, {
    taskClasses: ['agent-consultation', 'summary', 'quick-check'],
  }))
  addRoute(routes, seen, createRoute(config.MESSENGER_AGENT_FAST_MODEL, 'openai-compatible', 'cheap', 'medium', ALL_SUBSCRIPTION_TIERS, 600, {
    aliases: ['gpt-4.1-mini', 'gpt-4o-mini'],
  }))
  addRoute(routes, seen, createRoute('gpt-4o-mini', 'openai-compatible', 'cheap', 'medium', ALL_SUBSCRIPTION_TIERS, 600))
  addRoute(routes, seen, createRoute(config.MESSENGER_AGENT_BALANCED_MODEL, 'openai-compatible', 'balanced', 'high', PAID_SUBSCRIPTION_TIERS, 760, {
    aliases: ['gpt-4.1'],
  }))
  addRoute(routes, seen, createRoute(config.MESSENGER_AGENT_PREMIUM_MODEL, 'openai-compatible', 'premium', 'critical', PRO_SUBSCRIPTION_TIERS, 1000, {
    aliases: ['gpt-5.4', 'GPT-5.4'],
  }))
  addRoute(routes, seen, createRoute(config.MESSENGER_AGENT_MODEL, 'openai-compatible', 'premium', 'critical', PRO_SUBSCRIPTION_TIERS, 900))

  if (config.MESSENGER_AGENT_CLI_ENABLED) {
    addRoute(routes, seen, createRoute('claude-haiku-cli', 'cli', 'cheap', 'medium', ALL_SUBSCRIPTION_TIERS, 700, {
      cliProvider: 'claude',
      cliModel: 'haiku',
      cliEffort: 'low',
      taskClasses: ['agent-consultation', 'summary', 'quick-check'],
    }))
    addRoute(routes, seen, createRoute('claude-sonnet-cli', 'cli', 'balanced', 'high', PAID_SUBSCRIPTION_TIERS, 900, {
      cliProvider: 'claude',
      cliModel: 'sonnet',
      cliEffort: 'medium',
      taskClasses: ['agent-reply', 'call-analysis', 'architecture-review'],
    }))
    addRoute(routes, seen, createRoute('claude-opus-cli', 'cli', 'premium', 'critical', PRO_SUBSCRIPTION_TIERS, 1100, {
      cliProvider: 'claude',
      cliModel: 'opus',
      cliEffort: 'high',
      taskClasses: ['call-analysis', 'architecture-review'],
    }))
    addRoute(routes, seen, createRoute('codex-cli-default', 'cli', 'balanced', 'high', PAID_SUBSCRIPTION_TIERS, 900, {
      cliProvider: 'codex',
      cliModel: '',
      cliEffort: 'medium',
      taskClasses: ['agent-reply', 'quick-check', 'architecture-review'],
    }))
  }

  return routes
}

function matchesProviderHints(route: MessengerAgentModelRoute, hints: MessengerAgentProviderHint[] | undefined) {
  if (!hints?.length) return true
  if (hints.includes(route.provider)) return true
  return hints.includes('local') && route.provider === 'ollama-native'
}

function isRouteProviderAvailable(route: MessengerAgentModelRoute, baseUrl: string, apiKey: string, allowNoKey: boolean) {
  if (route.provider === 'openai-compatible') {
    if (!apiKey && shouldTryNativeOllamaFallback(baseUrl, apiKey)) {
      return false
    }

    return Boolean(apiKey || allowNoKey)
  }

  if (route.provider === 'ollama-native') {
    return shouldTryNativeOllamaFallback(baseUrl, apiKey)
  }

  return route.provider === 'cli'
}

function isRouteAllowed(
  route: MessengerAgentModelRoute,
  policy: MessengerAgentRoutePolicy,
  taskClass: MessengerAgentTaskClass,
  subscriptionTier: MessengerAgentSubscriptionTier,
  providerHints: MessengerAgentProviderHint[] | undefined,
  baseUrl: string,
  apiKey: string,
  allowNoKey: boolean,
) {
  if (COST_RANK[route.costTier] > COST_RANK[policy.costTier]) return false
  if (RISK_RANK[route.maxRiskTier] < RISK_RANK[policy.riskTier]) return false
  if (!route.subscriptionTiers.includes(subscriptionTier)) return false
  if (route.taskClasses?.length && !route.taskClasses.includes(taskClass)) return false
  if (!matchesProviderHints(route, providerHints)) return false
  return isRouteProviderAvailable(route, baseUrl, apiKey, allowNoKey)
}

function findCatalogRoute(catalog: MessengerAgentModelRoute[], model: string | undefined) {
  const key = normalizeModelKey(model || '')
  if (!key) return null

  return catalog.find(route => (
    normalizeModelKey(route.model) === key
    || (route.aliases || []).some(alias => normalizeModelKey(alias) === key)
  )) || null
}

function orderRoutes(
  routes: MessengerAgentModelRoute[],
  preferredModel: string | undefined,
  defaultModel: string,
) {
  const preferredKey = normalizeModelKey(preferredModel || '')
  const defaultKey = normalizeModelKey(defaultModel)

  return [...routes].sort((left, right) => {
    const leftKey = normalizeModelKey(left.model)
    const rightKey = normalizeModelKey(right.model)
    if (preferredKey && leftKey === preferredKey) return -1
    if (preferredKey && rightKey === preferredKey) return 1
    if (leftKey === defaultKey) return -1
    if (rightKey === defaultKey) return 1
    if (COST_RANK[left.costTier] !== COST_RANK[right.costTier]) {
      return COST_RANK[right.costTier] - COST_RANK[left.costTier]
    }
    return left.model.localeCompare(right.model)
  })
}

function resolveRoutePlan(
  config: ReturnType<typeof readMessengerConfig>,
  options: MessengerAgentLlmOptions,
  apiKey: string,
  baseUrl: string,
) {
  const taskClass = options.taskClass || 'agent-reply'
  const basePolicy = TASK_POLICIES[taskClass]
  const policy: MessengerAgentRoutePolicy = {
    riskTier: options.riskTier || basePolicy.riskTier,
    costTier: options.costTier || basePolicy.costTier,
    effort: options.effort || basePolicy.effort,
    maxTokens: clampNumber(options.budgetCaps?.maxTokens, basePolicy.maxTokens, 128, 2000),
  }
  const subscriptionTier = options.subscriptionTier || normalizeSubscriptionTier(config.MESSENGER_AGENT_ROUTER_SUBSCRIPTION_TIER)
  const catalog = buildMessengerAgentModelCatalog(config)
  const preferredRoute = findCatalogRoute(catalog, options.model)
  const routes = orderRoutes(
    catalog.filter(route => isRouteAllowed(
      route,
      policy,
      taskClass,
      subscriptionTier,
      options.providerHints,
      baseUrl,
      apiKey,
      config.MESSENGER_AGENT_ALLOW_NO_KEY,
    )),
    preferredRoute?.model,
    config.MESSENGER_AGENT_MODEL,
  )

  return {
    taskClass,
    policy,
    subscriptionTier,
    routes,
  }
}

function shouldFallbackAfterLlmError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof Error && /timeout|timed out|fetch failed|network|ENOENT/i.test(error.message)) return true

  const message = error instanceof Error ? error.message : String(error)
  const statusMatch = message.match(/MESSENGER_AGENT_(?:LLM|OLLAMA)_ERROR_(\d+)/u)
  if (!statusMatch) return false

  const status = Number(statusMatch[1])
  return status === 408 || status === 409 || status === 429 || status >= 500
}

function buildCliPrompt(messages: MessengerAgentLlmMessage[], maxChars: number) {
  const prompt = messages
    .map(message => `${message.role.toUpperCase()}:\n${message.content.trim()}`)
    .join('\n\n')
    .trim()

  return prompt.length > maxChars
    ? `${prompt.slice(0, Math.max(0, maxChars - 80)).trim()}\n\n[TRUNCATED_BY_MESSENGER_AGENT_ROUTER]`
    : prompt
}

async function callCliBackend(
  config: ReturnType<typeof readMessengerConfig>,
  route: MessengerAgentModelRoute,
  messages: MessengerAgentLlmMessage[],
  timeoutMs: number,
) {
  const prompt = buildCliPrompt(messages, config.MESSENGER_AGENT_CLI_MAX_PROMPT_CHARS)
  const cliProvider = route.cliProvider || 'claude'

  if (cliProvider === 'codex') {
    const args = ['exec', '-s', 'read-only']
    if (route.cliModel) {
      args.push('-m', route.cliModel)
    }
    args.push(prompt)

    const { stdout } = await execFileAsync(config.MESSENGER_AGENT_CODEX_CLI_COMMAND, args, {
      timeout: Math.min(timeoutMs, config.MESSENGER_AGENT_CLI_TIMEOUT_MS),
      maxBuffer: 1024 * 1024,
      env: process.env,
    })
    const content = String(stdout || '').trim()
    if (!content) throw new Error('MESSENGER_AGENT_CLI_EMPTY_RESPONSE')
    return content
  }

  const args = [
    '--print',
    '--bare',
    '--tools',
    '',
    '--permission-mode',
    'plan',
    '--model',
    route.cliModel || 'sonnet',
    '--effort',
    route.cliEffort || 'medium',
  ]

  if (config.MESSENGER_AGENT_CLI_MAX_BUDGET_USD > 0) {
    args.push('--max-budget-usd', String(config.MESSENGER_AGENT_CLI_MAX_BUDGET_USD))
  }

  args.push(prompt)

  const { stdout } = await execFileAsync(config.MESSENGER_AGENT_CLAUDE_CLI_COMMAND, args, {
    timeout: Math.min(timeoutMs, config.MESSENGER_AGENT_CLI_TIMEOUT_MS),
    maxBuffer: 1024 * 1024,
    env: process.env,
  })
  const content = String(stdout || '').trim()
  if (!content) throw new Error('MESSENGER_AGENT_CLI_EMPTY_RESPONSE')
  return content
}

async function callOpenAiCompatibleBackend(
  baseUrl: string,
  messages: MessengerAgentLlmMessage[],
  options: MessengerAgentLlmOptions,
  apiKey: string,
  timeoutMs: number,
  temperature: number,
  defaultModel: string,
  maxTokens: number,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(buildOpenAiCompatibleUrl(baseUrl, 'chat/completions'), {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: options.model?.trim() || defaultModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`MESSENGER_AGENT_LLM_ERROR_${response.status}:${errText.slice(0, 240)}`)
  }

  const payload = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('MESSENGER_AGENT_EMPTY_RESPONSE')
  }

  return content
}

async function callNativeOllamaBackend(
  baseUrl: string,
  messages: MessengerAgentLlmMessage[],
  options: MessengerAgentLlmOptions,
  timeoutMs: number,
  temperature: number,
  defaultModel: string,
  maxTokens: number,
) {
  const response = await fetch(buildOllamaNativeUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: options.model?.trim() || defaultModel,
      messages,
      stream: false,
      think: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`MESSENGER_AGENT_OLLAMA_ERROR_${response.status}:${errText.slice(0, 240)}`)
  }

  const payload = await response.json() as OllamaChatPayload
  const content = payload.message?.content?.trim()
  if (!content) {
    throw new Error('MESSENGER_AGENT_OLLAMA_EMPTY_RESPONSE')
  }

  return content
}

export function isMessengerAgentLlmConfigured(options: MessengerAgentLlmOptions = {}) {
  const config = readMessengerConfig()
  const apiKey = options.apiKey?.trim() || config.MESSENGER_AGENT_API_KEY?.trim() || ''
  const baseUrl = config.MESSENGER_AGENT_API_BASE_URL
  const plan = resolveRoutePlan(config, options, apiKey, baseUrl)

  return plan.routes.length > 0
}

export function getMessengerAgentRoutableModels(taskClass: MessengerAgentTaskClass = 'agent-reply') {
  return previewMessengerAgentRoutes({ taskClass }).candidates.map(route => route.model)
}

export function previewMessengerAgentRoutes(options: MessengerAgentLlmOptions = {}): MessengerAgentRoutePreview {
  const config = readMessengerConfig()
  const apiKey = options.apiKey?.trim() || config.MESSENGER_AGENT_API_KEY?.trim() || ''
  const plan = resolveRoutePlan(config, options, apiKey, config.MESSENGER_AGENT_API_BASE_URL)

  return {
    taskClass: plan.taskClass,
    riskTier: plan.policy.riskTier,
    costTier: plan.policy.costTier,
    effort: plan.policy.effort,
    subscriptionTier: plan.subscriptionTier,
    configured: plan.routes.length > 0,
    candidates: plan.routes.map((route, index) => ({
      rank: index + 1,
      model: route.model,
      provider: route.provider,
      cliProvider: route.cliProvider,
      costTier: route.costTier,
      maxRiskTier: route.maxRiskTier,
      subscriptionTiers: route.subscriptionTiers,
      maxTokens: Math.min(route.maxTokens, plan.policy.maxTokens),
      taskClasses: route.taskClasses || [plan.taskClass],
      reason: [
        `matches ${plan.taskClass}`,
        `risk ${plan.policy.riskTier} <= ${route.maxRiskTier}`,
        `cost ${route.costTier} <= ${plan.policy.costTier}`,
      ].join('; '),
    })),
  }
}

export async function callMessengerAgentModelWithRoute(
  messages: MessengerAgentLlmMessage[],
  options: MessengerAgentLlmOptions = {},
): Promise<MessengerAgentLlmResult> {
  const config = readMessengerConfig()
  const apiKey = options.apiKey?.trim() || config.MESSENGER_AGENT_API_KEY?.trim() || ''
  const baseUrl = config.MESSENGER_AGENT_API_BASE_URL
  const plan = resolveRoutePlan(config, options, apiKey, baseUrl)

  if (!plan.routes.length) {
    throw new Error('MESSENGER_AGENT_LLM_NOT_CONFIGURED')
  }

  let lastError: unknown = null

  for (const [index, route] of plan.routes.entries()) {
    const timeoutMs = clampNumber(options.budgetCaps?.timeoutMs, route.timeoutMs || config.MESSENGER_AGENT_TIMEOUT_MS, 1000, 120000)
    const temperature = clampTemperature(options.budgetCaps?.temperature, route.temperature ?? config.MESSENGER_AGENT_TEMPERATURE)
    const maxTokens = Math.min(route.maxTokens, plan.policy.maxTokens)
    const routeOptions = {
      ...options,
      model: route.model,
    }

    try {
      const content = route.provider === 'cli'
        ? await callCliBackend(config, route, messages, timeoutMs)
        : route.provider === 'ollama-native'
          ? await callNativeOllamaBackend(
              baseUrl,
              messages,
              routeOptions,
              timeoutMs,
              temperature,
              route.model,
              maxTokens,
            )
          : await callOpenAiCompatibleBackend(
              baseUrl,
              messages,
              routeOptions,
              apiKey,
              timeoutMs,
              temperature,
              route.model,
              maxTokens,
            )

      return {
        content,
        route: {
          taskClass: plan.taskClass,
          riskTier: plan.policy.riskTier,
          costTier: route.costTier,
          effort: plan.policy.effort,
          subscriptionTier: plan.subscriptionTier,
          modelUsed: route.model,
          providerUsed: route.provider,
          fallbackDepth: index,
        },
      }
    } catch (error) {
      lastError = error
      const hasNextRoute = index < plan.routes.length - 1
      if (!hasNextRoute || !shouldFallbackAfterLlmError(error)) {
        throw error
      }
    }
  }

  throw lastError || new Error('MESSENGER_AGENT_LLM_NOT_CONFIGURED')
}

export async function callMessengerAgentModel(
  messages: MessengerAgentLlmMessage[],
  options: MessengerAgentLlmOptions = {},
) {
  const result = await callMessengerAgentModelWithRoute(messages, options)
  return result.content
}
