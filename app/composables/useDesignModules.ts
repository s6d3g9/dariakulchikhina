import {
  createDefaultDesignModules,
  normalizeDesignModulesConfig,
  type DesignModulesConfig,
  type DesignPanelTabId,
} from '~~/shared/types/design-modules'

export type { DesignModulesConfig, DesignPanelTabId } from '~~/shared/types/design-modules'

export const DESIGN_MODULES_STORAGE_KEY = 'design-modules-config'
const DESIGN_MODULES_API = '/api/admin/design-modules'

const ADMIN_LAYOUT_RECOVERY_PATHS = [
  'adminLayout.designPanel',
  'adminLayout.sidebarMenu',
  'adminLayout.nestedNav',
] as const

export interface DesignModuleToggleResult {
  ok: boolean
  reason?: 'recovery-path-required'
}

export const DESIGN_MODULES_FILE = 'app/composables/useDesignModules.ts'

let persistTimer: ReturnType<typeof setTimeout> | null = null

function hasAdminRecoveryPath(config: DesignModulesConfig) {
  return Boolean(
    config.adminLayout.designPanel
    || config.adminLayout.sidebarMenu
    || config.adminLayout.nestedNav,
  )
}

function wouldBreakRecoveryPath(path: string, enabled: boolean, next: DesignModulesConfig) {
  if (enabled || !ADMIN_LAYOUT_RECOVERY_PATHS.includes(path as typeof ADMIN_LAYOUT_RECOVERY_PATHS[number])) {
    return false
  }

  return !hasAdminRecoveryPath(next)
}

export function useDesignModules() {
  const modules = useState<DesignModulesConfig>('design-modules-config', createDefaultDesignModules)
  const isHydrated = useState<boolean>('design-modules-config-hydrated', () => false)
  const isSyncing = useState<boolean>('design-modules-config-syncing', () => false)
  const isLoadedFromServer = useState<boolean>('design-modules-config-loaded-from-server', () => false)
  const pendingPersistPayload = useState<string>('design-modules-config-pending-persist', () => '')

  const adminLayout = computed(() => modules.value.adminLayout)
  const designPanel = computed(() => modules.value.designPanel)

  function syncLocalModules(value: DesignModulesConfig) {
    if (!import.meta.client) {
      return
    }

    localStorage.setItem(DESIGN_MODULES_STORAGE_KEY, JSON.stringify(value))
  }

  function commitModules(next: DesignModulesConfig, options: { persist?: boolean } = {}) {
    const normalized = normalizeDesignModulesConfig(next)
    modules.value = normalized
    syncLocalModules(normalized)

    if (options.persist !== false) {
      queueServerPersist(normalized)
    }

    return normalized
  }

  async function loadServerModules() {
    if (!import.meta.client || isSyncing.value) {
      return
    }

    isSyncing.value = true
    try {
      const serverModules = await $fetch<unknown>(DESIGN_MODULES_API)
      commitModules(normalizeDesignModulesConfig(serverModules), { persist: false })
      isLoadedFromServer.value = true
    } catch {
      isLoadedFromServer.value = false
    } finally {
      isSyncing.value = false
      isHydrated.value = true
    }
  }

  async function flushServerModules(payload: string) {
    if (!import.meta.client) {
      return
    }

    isSyncing.value = true
    try {
      const savedModules = await $fetch<unknown>(DESIGN_MODULES_API, {
        method: 'PUT',
        body: JSON.parse(payload),
      })
      commitModules(normalizeDesignModulesConfig(savedModules), { persist: false })
      isLoadedFromServer.value = true
    } catch {
      pendingPersistPayload.value = payload
    } finally {
      isSyncing.value = false
    }
  }

  function queueServerPersist(value: DesignModulesConfig) {
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

      void flushServerModules(payload)
    }, 320)
  }

  if (import.meta.client && !isHydrated.value) {
    try {
      const raw = localStorage.getItem(DESIGN_MODULES_STORAGE_KEY)
      if (raw) {
        modules.value = normalizeDesignModulesConfig(JSON.parse(raw))
      }
    } catch {
      modules.value = createDefaultDesignModules()
    }

    void loadServerModules()
  }

  function isPanelTabEnabled(tabId: string) {
    return Boolean((designPanel.value.tabs as Record<string, boolean>)[tabId])
  }

  function resetModules() {
    commitModules(createDefaultDesignModules())
  }

  async function restoreModules() {
    const defaults = normalizeDesignModulesConfig(createDefaultDesignModules())
    modules.value = defaults
    syncLocalModules(defaults)
    pendingPersistPayload.value = ''
    isHydrated.value = true

    if (!import.meta.client) {
      return defaults
    }

    await flushServerModules(JSON.stringify(defaults))
    return modules.value
  }

  function setModule(path: string, enabled: boolean): DesignModuleToggleResult {
    const segments = path.split('.').filter(Boolean)
    if (!segments.length) {
      return { ok: false }
    }

    const next = createDefaultDesignModules()
    next.adminLayout = { ...modules.value.adminLayout }
    next.designPanel = {
      ...modules.value.designPanel,
      tabs: { ...modules.value.designPanel.tabs },
    }

    let cursor: Record<string, unknown> = next as unknown as Record<string, unknown>
    for (let index = 0; index < segments.length - 1; index += 1) {
      const key = segments[index]
      const value = cursor[key]
      if (!value || typeof value !== 'object') {
        return { ok: false }
      }
      cursor = value as Record<string, unknown>
    }

    const leafKey = segments[segments.length - 1]
    if (!(leafKey in cursor)) {
      return { ok: false }
    }

    cursor[leafKey] = enabled

    if (wouldBreakRecoveryPath(path, enabled, next)) {
      return { ok: false, reason: 'recovery-path-required' }
    }

    commitModules(next)
    return { ok: true }
  }

  return {
    modules,
    adminLayout,
    designPanel,
    isLoadedFromServer,
    isPanelTabEnabled,
    setModule,
    resetModules,
    restoreModules,
  }
}