export type MessengerSubscriptionProvider =
  | 'claude-code-cli'
  | 'openai'
  | 'google'
  | 'alibaba'
  | 'github-copilot'
  | 'custom'

export interface MessengerSubscription {
  id: string
  provider: MessengerSubscriptionProvider
  label: string
  account: string
  apiKey?: string
  isDefault: boolean
  createdAt: string
}

export interface MessengerSubscriptionModel {
  id: string
  label: string
  tier: 'fast' | 'balanced' | 'powerful'
  contextK: number
  supportsEffort: boolean
}

export interface MessengerSubscriptionProviderMeta {
  key: MessengerSubscriptionProvider
  title: string
  icon: string
  color: string
  accountLabel: string
  accountPlaceholder: string
  hasApiKey: boolean
  apiKeyLabel?: string
  models: MessengerSubscriptionModel[]
  supportsEffort: boolean
  customModel: boolean
}

export const SUBSCRIPTION_PROVIDERS: MessengerSubscriptionProviderMeta[] = [
  {
    key: 'claude-code-cli',
    title: 'Anthropic Claude Code CLI',
    icon: 'mdi-alpha-a-circle-outline',
    color: '#d97706',
    accountLabel: 'Email аккаунта Anthropic',
    accountPlaceholder: 'example@gmail.com',
    hasApiKey: false,
    supportsEffort: true,
    customModel: false,
    models: [
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — быстрый', tier: 'fast', contextK: 200, supportsEffort: true },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — баланс', tier: 'balanced', contextK: 200, supportsEffort: true },
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 — максимум', tier: 'powerful', contextK: 200, supportsEffort: true },
      { id: 'claude-opus-4-7-1m', label: 'Claude Opus 4.7 — 1M контекст', tier: 'powerful', contextK: 1000, supportsEffort: true },
    ],
  },
  {
    key: 'github-copilot',
    title: 'GitHub Copilot Pro+',
    icon: 'mdi-github',
    color: '#24292e',
    accountLabel: 'GitHub логин',
    accountPlaceholder: 'username',
    hasApiKey: false,
    supportsEffort: true,
    customModel: false,
    models: [
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini — быстрый', tier: 'fast', contextK: 128, supportsEffort: false },
      { id: 'gpt-5-mini', label: 'GPT-5 mini — быстрый', tier: 'fast', contextK: 128, supportsEffort: false },
      { id: 'gpt-4.1', label: 'GPT-4.1 — баланс', tier: 'balanced', contextK: 128, supportsEffort: false },
      { id: 'gpt-5.2', label: 'GPT-5.2 — баланс', tier: 'balanced', contextK: 200, supportsEffort: true },
      { id: 'gpt-5.2-codex', label: 'GPT-5.2-Codex — код', tier: 'balanced', contextK: 200, supportsEffort: true },
      { id: 'gpt-5.3-codex', label: 'GPT-5.3-Codex — код+', tier: 'powerful', contextK: 200, supportsEffort: true },
      { id: 'gpt-5.4', label: 'GPT-5.4 — максимум', tier: 'powerful', contextK: 200, supportsEffort: true },
      { id: 'claude-haiku-4.5', label: 'Claude Haiku 4.5 (via Copilot)', tier: 'fast', contextK: 200, supportsEffort: true },
      { id: 'claude-sonnet-4.6', label: 'Claude Sonnet 4.6 (via Copilot)', tier: 'balanced', contextK: 200, supportsEffort: true },
      { id: 'claude-opus-4.7', label: 'Claude Opus 4.7 (via Copilot)', tier: 'powerful', contextK: 200, supportsEffort: true },
      { id: 'claude-opus-4.7-1m', label: 'Claude Opus 4.7 1M (via Copilot)', tier: 'powerful', contextK: 1000, supportsEffort: true },
    ],
  },
  {
    key: 'openai',
    title: 'OpenAI / ChatGPT',
    icon: 'mdi-brain',
    color: '#10a37f',
    accountLabel: 'Email аккаунта OpenAI',
    accountPlaceholder: 'example@gmail.com',
    hasApiKey: true,
    apiKeyLabel: 'API Key (sk-...)',
    supportsEffort: true,
    customModel: false,
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini — быстрый', tier: 'fast', contextK: 128, supportsEffort: false },
      { id: 'gpt-4o', label: 'GPT-4o — баланс', tier: 'balanced', contextK: 128, supportsEffort: false },
      { id: 'gpt-4.1', label: 'GPT-4.1 — баланс', tier: 'balanced', contextK: 128, supportsEffort: false },
      { id: 'o1-mini', label: 'o1-mini — reasoning быстрый', tier: 'balanced', contextK: 128, supportsEffort: true },
      { id: 'o1', label: 'o1 — reasoning', tier: 'powerful', contextK: 200, supportsEffort: true },
      { id: 'o3', label: 'o3 — максимальный reasoning', tier: 'powerful', contextK: 200, supportsEffort: true },
    ],
  },
  {
    key: 'google',
    title: 'Google AI (Gemini)',
    icon: 'mdi-google',
    color: '#4285f4',
    accountLabel: 'Email Google-аккаунта',
    accountPlaceholder: 'example@gmail.com',
    hasApiKey: true,
    apiKeyLabel: 'API Key (AIza...)',
    supportsEffort: false,
    customModel: false,
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — быстрый', tier: 'fast', contextK: 1000, supportsEffort: false },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash — быстрый', tier: 'fast', contextK: 1000, supportsEffort: false },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — баланс', tier: 'balanced', contextK: 1000, supportsEffort: false },
      { id: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro — максимум', tier: 'powerful', contextK: 1000, supportsEffort: false },
    ],
  },
  {
    key: 'alibaba',
    title: 'Alibaba Cloud AI (Qwen)',
    icon: 'mdi-cloud-outline',
    color: '#ff6a00',
    accountLabel: 'Account ID / email',
    accountPlaceholder: 'account@alibaba.com',
    hasApiKey: true,
    apiKeyLabel: 'API Key',
    supportsEffort: false,
    customModel: false,
    models: [
      { id: 'qwen-turbo', label: 'Qwen Turbo — быстрый', tier: 'fast', contextK: 128, supportsEffort: false },
      { id: 'qwen-plus', label: 'Qwen Plus — баланс', tier: 'balanced', contextK: 128, supportsEffort: false },
      { id: 'qwen-long', label: 'Qwen Long — длинный контекст', tier: 'balanced', contextK: 1000, supportsEffort: false },
      { id: 'qwen-max', label: 'Qwen Max — максимум', tier: 'powerful', contextK: 128, supportsEffort: false },
    ],
  },
  {
    key: 'custom',
    title: 'Свой провайдер (Custom)',
    icon: 'mdi-code-braces',
    color: '#8b5cf6',
    accountLabel: 'Название / URL эндпоинта',
    accountPlaceholder: 'https://api.example.com',
    hasApiKey: true,
    apiKeyLabel: 'API Key',
    supportsEffort: false,
    customModel: true,
    models: [],
  },
]

export interface MessengerSubscriptionUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  requestCount: number
  periodStart: string
}

const STORAGE_KEY = 'daria-messenger-subscriptions'
const USAGE_STORAGE_KEY = 'daria-messenger-subscription-usage'

function genId() {
  return `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function currentPeriodStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function readUsageStored(): Record<string, MessengerSubscriptionUsage> {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function writeUsageStored(usage: Record<string, MessengerSubscriptionUsage>) {
  if (!import.meta.client) return
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage))
}

export function daysUntilNextPeriod(): number {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

function readStored(): MessengerSubscription[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(subs: MessengerSubscription[]) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs))
}

function ensureDefaultExists(subs: MessengerSubscription[]): MessengerSubscription[] {
  if (subs.length === 0 || subs.some(s => s.isDefault)) return subs
  return subs.map((s, i) => ({ ...s, isDefault: i === 0 }))
}

export function useMessengerSubscriptions() {
  const subscriptions = useState<MessengerSubscription[]>('messenger-subscriptions', () => [])
  const ready = useState<boolean>('messenger-subscriptions-ready', () => false)
  const usageMap = useState<Record<string, MessengerSubscriptionUsage>>('messenger-sub-usage', () => ({}))

  function hydrateUsage() {
    usageMap.value = readUsageStored()
  }

  function getUsage(subId: string): MessengerSubscriptionUsage {
    const stored = usageMap.value[subId]
    const period = currentPeriodStart()
    if (!stored || stored.periodStart !== period) {
      return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, requestCount: 0, periodStart: period }
    }
    return stored
  }

  function recordUsage(subId: string, delta: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number }) {
    const current = getUsage(subId)
    const next: MessengerSubscriptionUsage = {
      ...current,
      inputTokens: current.inputTokens + (delta.inputTokens ?? 0),
      outputTokens: current.outputTokens + (delta.outputTokens ?? 0),
      cacheReadTokens: current.cacheReadTokens + (delta.cacheReadTokens ?? 0),
      requestCount: current.requestCount + 1,
    }
    usageMap.value = { ...usageMap.value, [subId]: next }
    writeUsageStored(usageMap.value)
  }

  function hydrate() {
    if (ready.value) return
    let stored = readStored()
    hydrateUsage()

    const BUILTIN_CLAUDE: MessengerSubscription = {
      id: 'builtin-claude-code-cli',
      provider: 'claude-code-cli',
      label: 'Claude Code CLI (Anthropic)',
      account: 's6d3g9@gmail.com',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const BUILTIN_COPILOT: MessengerSubscription = {
      id: 'builtin-github-copilot',
      provider: 'github-copilot',
      label: 'GitHub Copilot Pro+',
      account: 's6d3g9',
      isDefault: false,
      createdAt: '2026-01-01T00:00:01.000Z',
    }

    if (stored.length === 0) {
      stored = [BUILTIN_CLAUDE, BUILTIN_COPILOT]
    } else {
      // Migration: inject built-ins if missing
      if (!stored.find(s => s.id === BUILTIN_CLAUDE.id)) {
        stored = [BUILTIN_CLAUDE, ...stored]
      }
      if (!stored.find(s => s.id === BUILTIN_COPILOT.id)) {
        stored = [...stored, BUILTIN_COPILOT]
      }
    }

    stored = ensureDefaultExists(stored)
    subscriptions.value = stored
    writeStored(stored)
    ready.value = true
  }

  const defaultSubscription = computed(() =>
    subscriptions.value.find(s => s.isDefault) ?? subscriptions.value[0] ?? null,
  )

  const providerOf = (sub: MessengerSubscription) =>
    SUBSCRIPTION_PROVIDERS.find(p => p.key === sub.provider)!

  const modelsOf = (sub: MessengerSubscription): MessengerSubscriptionModel[] =>
    SUBSCRIPTION_PROVIDERS.find(p => p.key === sub.provider)?.models ?? []

  const modelsByProvider = (provider: MessengerSubscriptionProvider): MessengerSubscriptionModel[] =>
    SUBSCRIPTION_PROVIDERS.find(p => p.key === provider)?.models ?? []

  function add(input: Omit<MessengerSubscription, 'id' | 'createdAt' | 'isDefault'>) {
    const isFirst = subscriptions.value.length === 0
    const next: MessengerSubscription = {
      ...input,
      id: genId(),
      isDefault: isFirst,
      createdAt: new Date().toISOString(),
    }
    subscriptions.value = [...subscriptions.value, next]
    writeStored(subscriptions.value)
  }

  function update(id: string, patch: Partial<Pick<MessengerSubscription, 'label' | 'account' | 'apiKey'>>) {
    subscriptions.value = subscriptions.value.map(s =>
      s.id === id ? { ...s, ...patch } : s,
    )
    writeStored(subscriptions.value)
  }

  function remove(id: string) {
    const wasDefault = subscriptions.value.find(s => s.id === id)?.isDefault ?? false
    const remaining = subscriptions.value.filter(s => s.id !== id)
    if (wasDefault && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true }
    }
    subscriptions.value = remaining
    writeStored(remaining)
  }

  function setDefault(id: string) {
    subscriptions.value = subscriptions.value.map(s => ({ ...s, isDefault: s.id === id }))
    writeStored(subscriptions.value)
  }

  return {
    subscriptions,
    defaultSubscription,
    ready,
    usageMap,
    hydrate,
    providerOf,
    modelsOf,
    modelsByProvider,
    getUsage,
    recordUsage,
    add,
    update,
    remove,
    setDefault,
  }
}
