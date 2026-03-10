import {
  createDefaultElementVisibilityConfig,
  normalizeElementVisibilityConfig,
  type ElementVisibilityConfig,
  type ElementVisibilityRule,
  type ElementVisibilityScope,
} from '~~/shared/types/element-visibility'

export type {
  ElementVisibilityConfig,
  ElementVisibilityRule,
  ElementVisibilityScope,
} from '~~/shared/types/element-visibility'

const ELEMENT_VISIBILITY_STORAGE_KEY = 'element-visibility-config'
const ELEMENT_VISIBILITY_API = '/api/admin/element-visibility'
const ELEMENT_VISIBILITY_STYLE_ID = 'ui-element-visibility-style'

let persistTimer: ReturnType<typeof setTimeout> | null = null
let styleSyncStarted = false

function createRuleId() {
  return `visibility_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function useElementVisibility() {
  const route = useRoute()
  const config = useState<ElementVisibilityConfig>('element-visibility-config', createDefaultElementVisibilityConfig)
  const isHydrated = useState<boolean>('element-visibility-config-hydrated', () => false)
  const isSyncing = useState<boolean>('element-visibility-config-syncing', () => false)
  const isLoadedFromServer = useState<boolean>('element-visibility-config-loaded-from-server', () => false)
  const pendingPersistPayload = useState<string>('element-visibility-config-pending-persist', () => '')

  const currentPath = computed(() => route.path || '/')
  const rules = computed(() => config.value.rules)
  const activeRules = computed(() => rules.value.filter((rule) => rule.scope === 'global' || rule.path === currentPath.value))
  const styleText = computed(() => activeRules.value
    .map((rule) => `${rule.selector} { display: none !important; }`)
    .join('\n'))

  function syncLocalConfig(value: ElementVisibilityConfig) {
    if (!import.meta.client) {
      return
    }

    localStorage.setItem(ELEMENT_VISIBILITY_STORAGE_KEY, JSON.stringify(value))
  }

  function commitConfig(next: ElementVisibilityConfig, options: { persist?: boolean } = {}) {
    const normalized = normalizeElementVisibilityConfig(next)
    config.value = normalized
    syncLocalConfig(normalized)

    if (options.persist !== false) {
      queueServerPersist(normalized)
    }

    return normalized
  }

  async function loadServerConfig() {
    if (!import.meta.client || isSyncing.value) {
      return
    }

    isSyncing.value = true
    try {
      const serverConfig = await $fetch<unknown>(ELEMENT_VISIBILITY_API)
      commitConfig(normalizeElementVisibilityConfig(serverConfig), { persist: false })
      isLoadedFromServer.value = true
    } catch {
      isLoadedFromServer.value = false
    } finally {
      isSyncing.value = false
      isHydrated.value = true
    }
  }

  async function flushServerConfig(payload: string) {
    if (!import.meta.client) {
      return
    }

    isSyncing.value = true
    try {
      const savedConfig = await $fetch<unknown>(ELEMENT_VISIBILITY_API, {
        method: 'PUT',
        body: JSON.parse(payload),
      })
      commitConfig(normalizeElementVisibilityConfig(savedConfig), { persist: false })
      isLoadedFromServer.value = true
    } catch {
      pendingPersistPayload.value = payload
    } finally {
      isSyncing.value = false
    }
  }

  function queueServerPersist(value: ElementVisibilityConfig) {
    if (!import.meta.client || !isHydrated.value || isSyncing.value) {
      return
    }

    pendingPersistPayload.value = JSON.stringify(value)
    if (persistTimer) {
      clearTimeout(persistTimer)
    }

    persistTimer = window.setTimeout(() => {
      const payload = pendingPersistPayload.value
      pendingPersistPayload.value = ''
      if (!payload) {
        return
      }

      void flushServerConfig(payload)
    }, 320)
  }

  function ensureStyleSync() {
    if (!import.meta.client || styleSyncStarted) {
      return
    }

    styleSyncStarted = true
    watch(styleText, (css) => {
      let styleEl = document.getElementById(ELEMENT_VISIBILITY_STYLE_ID) as HTMLStyleElement | null
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = ELEMENT_VISIBILITY_STYLE_ID
        document.head.appendChild(styleEl)
      }

      styleEl.textContent = css
    }, { immediate: true })
  }

  if (import.meta.client && !isHydrated.value) {
    try {
      const raw = localStorage.getItem(ELEMENT_VISIBILITY_STORAGE_KEY)
      if (raw) {
        config.value = normalizeElementVisibilityConfig(JSON.parse(raw))
      }
    } catch {
      config.value = createDefaultElementVisibilityConfig()
    }

    void loadServerConfig()
  }

  ensureStyleSync()

  function findRule(selector: string, scope: ElementVisibilityScope, path?: string | null) {
    const normalizedPath = scope === 'page' ? (path || currentPath.value) : null
    return rules.value.find((rule) => rule.scope === scope && rule.selector === selector && (scope === 'global' || rule.path === normalizedPath)) || null
  }

  function addRule(input: {
    selector: string
    scope: ElementVisibilityScope
    path?: string | null
    label?: string
    tag?: string
    classes?: string
  }) {
    const selector = input.selector.trim()
    if (!selector) {
      return null
    }

    const normalizedPath = input.scope === 'page' ? (input.path || currentPath.value) : null
    const existing = findRule(selector, input.scope, normalizedPath)
    if (existing) {
      return existing
    }

    const nextRule: ElementVisibilityRule = {
      id: createRuleId(),
      selector,
      scope: input.scope,
      path: normalizedPath,
      label: input.label || selector,
      tag: input.tag || '',
      classes: input.classes || '',
      createdAt: new Date().toISOString(),
    }

    commitConfig({
      rules: [nextRule, ...rules.value],
    })

    return nextRule
  }

  function removeRule(ruleId: string) {
    commitConfig({
      rules: rules.value.filter((rule) => rule.id !== ruleId),
    })
  }

  function removeMatchingRule(selector: string, scope: ElementVisibilityScope, path?: string | null) {
    const existing = findRule(selector, scope, path)
    if (!existing) {
      return
    }

    removeRule(existing.id)
  }

  return {
    config,
    rules,
    currentPath,
    activeRules,
    styleText,
    isLoadedFromServer,
    findRule,
    addRule,
    removeRule,
    removeMatchingRule,
  }
}