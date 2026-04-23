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

const USAGE_STORAGE_KEY = 'daria-messenger-subscription-usage'

// Built-in subscriptions are always available, no API key needed.
const BUILTIN_SUBSCRIPTIONS: MessengerSubscription[] = [
  {
    id: 'builtin-claude-code-cli',
    provider: 'claude-code-cli',
    label: 'Claude Code CLI (Anthropic)',
    account: 's6d3g9@gmail.com',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-github-copilot',
    provider: 'github-copilot',
    label: 'GitHub Copilot Pro+',
    account: 's6d3g9',
    isDefault: false,
    createdAt: '2026-01-01T00:00:01.000Z',
  },
]

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

export function useMessengerSubscriptions() {
  const auth = useMessengerAuth()
  const subscriptions = useState<MessengerSubscription[]>('messenger-subscriptions', () => [])
  const ready = useState<boolean>('messenger-subscriptions-ready', () => false)
  const pending = useState<boolean>('messenger-subscriptions-pending', () => false)
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

  async function hydrate() {
    if (ready.value) return
    hydrateUsage()

    if (!auth.token.value) {
      subscriptions.value = [...BUILTIN_SUBSCRIPTIONS]
      ready.value = true
      return
    }

    pending.value = true
    try {
      const res = await auth.request<{ subscriptions: MessengerSubscription[] }>('/subscriptions', { method: 'GET' })
      const dbSubs = res.subscriptions ?? []
      // Always prepend built-ins; DB subscriptions don't include them
      subscriptions.value = [...BUILTIN_SUBSCRIPTIONS, ...dbSubs]
    } catch {
      subscriptions.value = [...BUILTIN_SUBSCRIPTIONS]
    } finally {
      pending.value = false
      ready.value = true
    }
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

  async function add(input: Omit<MessengerSubscription, 'id' | 'createdAt' | 'isDefault'> & { defaultModel?: string }) {
    const providerMeta = SUBSCRIPTION_PROVIDERS.find(p => p.key === input.provider)
    const defaultModel = input.defaultModel ?? providerMeta?.models[0]?.id ?? ''
    const res = await auth.request<{ id: string }>('/subscriptions', {
      method: 'POST',
      body: {
        provider: input.provider,
        label: input.label,
        account: input.account,
        apiKey: input.apiKey ?? null,
        defaultModel,
        isDefault: false,
      },
    })
    const next: MessengerSubscription = {
      id: res.id,
      provider: input.provider as MessengerSubscriptionProvider,
      label: input.label,
      account: input.account,
      apiKey: input.apiKey,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }
    subscriptions.value = [...subscriptions.value, next]
  }

  async function update(id: string, patch: Partial<Pick<MessengerSubscription, 'label' | 'account' | 'apiKey'>>) {
    const existing = subscriptions.value.find(s => s.id === id)
    if (!existing || id.startsWith('builtin-')) {
      subscriptions.value = subscriptions.value.map(s => s.id === id ? { ...s, ...patch } : s)
      return
    }
    const providerMeta = SUBSCRIPTION_PROVIDERS.find(p => p.key === existing.provider)
    await auth.request(`/subscriptions/${id}`, {
      method: 'PUT',
      body: {
        provider: existing.provider,
        label: patch.label ?? existing.label,
        account: patch.account ?? existing.account,
        apiKey: patch.apiKey !== undefined ? patch.apiKey : existing.apiKey ?? null,
        defaultModel: providerMeta?.models[0]?.id ?? 'claude-sonnet-4-6',
        isDefault: existing.isDefault,
      },
    })
    subscriptions.value = subscriptions.value.map(s => s.id === id ? { ...s, ...patch } : s)
  }

  async function remove(id: string) {
    const wasDefault = subscriptions.value.find(s => s.id === id)?.isDefault ?? false
    if (!id.startsWith('builtin-')) {
      await auth.request(`/subscriptions/${id}`, { method: 'DELETE' })
    }
    const remaining = subscriptions.value.filter(s => s.id !== id)
    if (wasDefault && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true }
    }
    subscriptions.value = remaining
  }

  async function setDefault(id: string) {
    if (!id.startsWith('builtin-')) {
      await auth.request(`/subscriptions/${id}/default`, { method: 'PUT' })
    }
    subscriptions.value = subscriptions.value.map(s => ({ ...s, isDefault: s.id === id }))
  }

  return {
    subscriptions,
    defaultSubscription,
    ready,
    pending,
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
