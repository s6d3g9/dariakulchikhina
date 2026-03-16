import { APP_BLUEPRINTS } from '~~/shared/constants/app-catalog'
import {
  createDefaultAppBlueprintCatalogConfig,
  normalizeAppBlueprintCatalogConfig,
  type AppBlueprintCatalogConfig,
  type AppBlueprintDef,
} from '~~/shared/types/app-catalog'

export const APP_BLUEPRINTS_STORAGE_KEY = 'app-blueprints-config'
const APP_BLUEPRINTS_API = '/api/admin/app-blueprints'

let persistTimer: ReturnType<typeof setTimeout> | null = null

function mergeCustomBlueprints(primary: AppBlueprintDef[], secondary: AppBlueprintDef[]) {
  const byId = new Map<string, AppBlueprintDef>()
  for (const blueprint of secondary) {
    byId.set(blueprint.id, blueprint)
  }
  for (const blueprint of primary) {
    byId.set(blueprint.id, blueprint)
  }
  return Array.from(byId.values())
}

function resolveActiveBlueprintId(candidateIds: Array<string | null | undefined>, customBlueprints: AppBlueprintDef[]) {
  const knownIds = new Set([
    ...APP_BLUEPRINTS.map(blueprint => blueprint.id),
    ...customBlueprints.map(blueprint => blueprint.id),
  ])

  for (const candidateId of candidateIds) {
    if (candidateId && knownIds.has(candidateId)) {
      return candidateId
    }
  }

  return APP_BLUEPRINTS[0]?.id || 'design-studio'
}

export function useAppBlueprintCatalog() {
  const catalog = useState<AppBlueprintCatalogConfig>('app-blueprints-config', createDefaultAppBlueprintCatalogConfig)
  const previewBlueprint = useState<AppBlueprintDef | null>('app-blueprints-preview', () => null)
  const isHydrated = useState<boolean>('app-blueprints-config-hydrated', () => false)
  const isSyncing = useState<boolean>('app-blueprints-config-syncing', () => false)
  const isLoadedFromServer = useState<boolean>('app-blueprints-config-loaded-from-server', () => false)
  const pendingPersistPayload = useState<string>('app-blueprints-config-pending-persist', () => '')

  const builtinBlueprints = computed(() => APP_BLUEPRINTS)
  const customBlueprints = computed(() => catalog.value.custom)
  const allBlueprints = computed<AppBlueprintDef[]>(() => {
    const byId = new Map<string, AppBlueprintDef>()
    for (const blueprint of builtinBlueprints.value) {
      byId.set(blueprint.id, blueprint)
    }
    for (const blueprint of customBlueprints.value) {
      byId.set(blueprint.id, blueprint)
    }
    return Array.from(byId.values())
  })
  const activeBlueprintId = computed(() => resolveActiveBlueprintId([catalog.value.activeBlueprintId], catalog.value.custom))
  const isPreviewingBlueprint = computed(() => Boolean(previewBlueprint.value))
  const activeBlueprint = computed<AppBlueprintDef | null>(() => {
    if (previewBlueprint.value) {
      return previewBlueprint.value
    }

    return allBlueprints.value.find(blueprint => blueprint.id === activeBlueprintId.value) || allBlueprints.value[0] || null
  })

  function syncLocalCatalog(value: AppBlueprintCatalogConfig) {
    if (!import.meta.client) {
      return
    }

    localStorage.setItem(APP_BLUEPRINTS_STORAGE_KEY, JSON.stringify(value))
  }

  function commitCatalog(next: AppBlueprintCatalogConfig, options: { persist?: boolean } = {}) {
    const normalized = normalizeAppBlueprintCatalogConfig(next)
    const committed = {
      ...normalized,
      activeBlueprintId: resolveActiveBlueprintId([normalized.activeBlueprintId], normalized.custom),
    }
    catalog.value = committed
    syncLocalCatalog(committed)

    if (options.persist !== false) {
      queueServerPersist(committed)
    }

    return committed
  }

  function scheduleServerPersist() {
    if (!import.meta.client || !isHydrated.value || isSyncing.value) {
      return
    }

    if (persistTimer) {
      clearTimeout(persistTimer)
    }

    persistTimer = setTimeout(() => {
      const payload = pendingPersistPayload.value
      pendingPersistPayload.value = ''
      if (!payload) {
        return
      }

      void flushServerCatalog(payload)
    }, 320)
  }

  async function loadServerCatalog() {
    if (!import.meta.client || isSyncing.value) {
      return
    }

    isSyncing.value = true
    try {
      const serverCatalog = await $fetch<unknown>(APP_BLUEPRINTS_API)
      const normalizedServerCatalog = normalizeAppBlueprintCatalogConfig(serverCatalog)
      const mergedCustomBlueprints = mergeCustomBlueprints(catalog.value.custom, normalizedServerCatalog.custom)
      const defaultBlueprintId = createDefaultAppBlueprintCatalogConfig().activeBlueprintId
      const preferLocalActiveBlueprint = catalog.value.custom.length > 0 || catalog.value.activeBlueprintId !== defaultBlueprintId
      commitCatalog({
        activeBlueprintId: resolveActiveBlueprintId([
          preferLocalActiveBlueprint ? catalog.value.activeBlueprintId : normalizedServerCatalog.activeBlueprintId,
          preferLocalActiveBlueprint ? normalizedServerCatalog.activeBlueprintId : catalog.value.activeBlueprintId,
        ], mergedCustomBlueprints),
        custom: mergedCustomBlueprints,
      }, { persist: false })
      isLoadedFromServer.value = true
    } catch {
      isLoadedFromServer.value = false
    } finally {
      isSyncing.value = false
      isHydrated.value = true
      scheduleServerPersist()
    }
  }

  async function flushServerCatalog(payload: string) {
    if (!import.meta.client) {
      return
    }

    isSyncing.value = true
    try {
      const savedCatalog = await $fetch<unknown>(APP_BLUEPRINTS_API, {
        method: 'PUT',
        body: JSON.parse(payload),
      })
      commitCatalog(normalizeAppBlueprintCatalogConfig(savedCatalog), { persist: false })
      isLoadedFromServer.value = true
    } catch {
      pendingPersistPayload.value = payload
    } finally {
      isSyncing.value = false
      scheduleServerPersist()
    }
  }

  function queueServerPersist(value: AppBlueprintCatalogConfig) {
    if (!import.meta.client) {
      return
    }

    pendingPersistPayload.value = JSON.stringify(value)
    scheduleServerPersist()
  }

  if (import.meta.client && !isHydrated.value) {
    try {
      const raw = localStorage.getItem(APP_BLUEPRINTS_STORAGE_KEY)
      if (raw) {
        catalog.value = normalizeAppBlueprintCatalogConfig(JSON.parse(raw))
      }
    } catch {
      catalog.value = createDefaultAppBlueprintCatalogConfig()
    }

    void loadServerCatalog()
  }

  function saveCustomBlueprint(blueprint: AppBlueprintDef) {
    const next = [...catalog.value.custom]
    const index = next.findIndex(item => item.id === blueprint.id)
    if (index >= 0) {
      next[index] = blueprint
    } else {
      next.unshift(blueprint)
    }

    commitCatalog({
      activeBlueprintId: catalog.value.activeBlueprintId,
      custom: next,
    })
    return blueprint
  }

  function removeCustomBlueprint(blueprintId: string) {
    commitCatalog({
      activeBlueprintId: catalog.value.activeBlueprintId,
      custom: catalog.value.custom.filter(item => item.id !== blueprintId),
    })
  }

  function resetCatalog() {
    commitCatalog(createDefaultAppBlueprintCatalogConfig())
  }

  function setActiveBlueprint(blueprintId: string) {
    const nextId = resolveActiveBlueprintId([blueprintId, catalog.value.activeBlueprintId], catalog.value.custom)
    previewBlueprint.value = null
    commitCatalog({
      activeBlueprintId: nextId,
      custom: catalog.value.custom,
    })
    return nextId
  }

  function setPreviewBlueprint(blueprint: AppBlueprintDef) {
    previewBlueprint.value = blueprint
    return blueprint
  }

  function clearPreviewBlueprint() {
    previewBlueprint.value = null
  }

  return {
    catalog,
    builtinBlueprints,
    customBlueprints,
    allBlueprints,
    activeBlueprintId,
    activeBlueprint,
    previewBlueprint,
    isPreviewingBlueprint,
    isLoadedFromServer,
    saveCustomBlueprint,
    removeCustomBlueprint,
    resetCatalog,
    setActiveBlueprint,
    setPreviewBlueprint,
    clearPreviewBlueprint,
  }
}