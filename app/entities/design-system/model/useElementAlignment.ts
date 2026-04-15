import {
  createDefaultElementAlignmentConfig,
  normalizeElementAlignmentConfig,
  type ElementAlignmentConfig,
  type ElementAlignmentRule,
  type ElementAlignmentScope,
} from '~~/shared/types/element-alignment'

export type {
  ElementAlignmentConfig,
  ElementAlignmentRule,
  ElementAlignmentScope,
} from '~~/shared/types/element-alignment'

const ELEMENT_ALIGNMENT_STORAGE_KEY = 'element-alignment-config'
const ELEMENT_ALIGNMENT_API = '/api/admin/element-alignment'
const ELEMENT_ALIGNMENT_STYLE_ID = 'ui-element-alignment-style'

let persistTimer: ReturnType<typeof setTimeout> | null = null
let styleSyncStarted = false

function createRuleId() {
  return `alignment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function useElementAlignment() {
  const route = useRoute()
  const config = useState<ElementAlignmentConfig>('element-alignment-config', createDefaultElementAlignmentConfig)
  const isHydrated = useState<boolean>('element-alignment-config-hydrated', () => false)
  const isSyncing = useState<boolean>('element-alignment-config-syncing', () => false)
  const isLoadedFromServer = useState<boolean>('element-alignment-config-loaded-from-server', () => false)
  const pendingPersistPayload = useState<string>('element-alignment-config-pending-persist', () => '')

  const currentPath = computed(() => route.path || '/')
  const rules = computed(() => config.value.rules)
  const activeRules = computed(() => rules.value.filter((rule) => rule.scope === 'global' || rule.path === currentPath.value))
  const styleText = computed(() => activeRules.value
    .map((rule) => {
      const chunks = [`translate: ${rule.x}px ${rule.y}px !important;`]
      if (rule.width !== null && rule.width !== undefined) {
        chunks.push(`width: ${rule.width}px !important;`)
      }
      if (rule.height !== null && rule.height !== undefined) {
        chunks.push(`height: ${rule.height}px !important;`)
      }
      return `${rule.selector} { ${chunks.join(' ')} }`
    })
    .join('\n'))

  function syncLocalConfig(value: ElementAlignmentConfig) {
    if (!import.meta.client) {
      return
    }

    localStorage.setItem(ELEMENT_ALIGNMENT_STORAGE_KEY, JSON.stringify(value))
  }

  function commitConfig(next: ElementAlignmentConfig, options: { persist?: boolean } = {}) {
    const normalized = normalizeElementAlignmentConfig(next)
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
      const serverConfig = await $fetch<unknown>(ELEMENT_ALIGNMENT_API)
      commitConfig(normalizeElementAlignmentConfig(serverConfig), { persist: false })
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
      const savedConfig = await $fetch<unknown>(ELEMENT_ALIGNMENT_API, {
        method: 'PUT',
        body: JSON.parse(payload),
      })
      commitConfig(normalizeElementAlignmentConfig(savedConfig), { persist: false })
      isLoadedFromServer.value = true
    } catch {
      pendingPersistPayload.value = payload
    } finally {
      isSyncing.value = false
    }
  }

  function queueServerPersist(value: ElementAlignmentConfig) {
    if (!import.meta.client || !isHydrated.value || isSyncing.value) {
      return
    }

    pendingPersistPayload.value = JSON.stringify(value)
    if (persistTimer) {
      clearTimeout(persistTimer)
    }

    persistTimer = setTimeout(() => {
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
      let styleEl = document.getElementById(ELEMENT_ALIGNMENT_STYLE_ID) as HTMLStyleElement | null
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = ELEMENT_ALIGNMENT_STYLE_ID
        document.head.appendChild(styleEl)
      }

      styleEl.textContent = css
    }, { immediate: true })
  }

  if (import.meta.client && !isHydrated.value) {
    try {
      const raw = localStorage.getItem(ELEMENT_ALIGNMENT_STORAGE_KEY)
      if (raw) {
        config.value = normalizeElementAlignmentConfig(JSON.parse(raw))
      }
    } catch {
      config.value = createDefaultElementAlignmentConfig()
    }

    void loadServerConfig()
  }

  ensureStyleSync()

  function findRule(selector: string, scope: ElementAlignmentScope, path?: string | null) {
    const normalizedPath = scope === 'page' ? (path || currentPath.value) : null
    return rules.value.find((rule) => rule.scope === scope && rule.selector === selector && (scope === 'global' || rule.path === normalizedPath)) || null
  }

  function setRulePosition(input: {
    selector: string
    scope: ElementAlignmentScope
    path?: string | null
    label?: string
    tag?: string
    classes?: string
    x: number
    y: number
    width?: number | null
    height?: number | null
  }, options: { persist?: boolean } = {}) {
    const selector = input.selector.trim()
    if (!selector) {
      return null
    }

    const normalizedPath = input.scope === 'page' ? (input.path || currentPath.value) : null
    const x = Math.round(input.x)
    const y = Math.round(input.y)
    const width = Number.isFinite(input.width) ? Math.max(24, Math.round(Number(input.width))) : null
    const height = Number.isFinite(input.height) ? Math.max(24, Math.round(Number(input.height))) : null
    const existing = findRule(selector, input.scope, normalizedPath)

    if (x === 0 && y === 0 && width === null && height === null) {
      if (existing) {
        commitConfig({
          rules: rules.value.filter((rule) => rule.id !== existing.id),
        }, options)
      }
      return null
    }

    const nextRule: ElementAlignmentRule = {
      id: existing?.id || createRuleId(),
      selector,
      scope: input.scope,
      path: normalizedPath,
      label: input.label || existing?.label || selector,
      tag: input.tag || existing?.tag || '',
      classes: input.classes || existing?.classes || '',
      x,
      y,
      width,
      height,
      createdAt: existing?.createdAt || new Date().toISOString(),
    }

    commitConfig({
      rules: existing
        ? rules.value.map((rule) => (rule.id === existing.id ? nextRule : rule))
        : [nextRule, ...rules.value],
    }, options)

    return nextRule
  }

  function removeMatchingRule(selector: string, scope: ElementAlignmentScope, path?: string | null, options: { persist?: boolean } = {}) {
    const existing = findRule(selector, scope, path)
    if (!existing) {
      return
    }

    commitConfig({
      rules: rules.value.filter((rule) => rule.id !== existing.id),
    }, options)
  }

  return {
    config,
    rules,
    currentPath,
    activeRules,
    styleText,
    isLoadedFromServer,
    findRule,
    setRulePosition,
    removeMatchingRule,
  }
}