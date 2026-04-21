export interface InstalledPlugin {
  id: string
  name: string
  description: string
}

export interface MessengerProjectPlugin {
  projectId: string
  pluginId: string
  enabled: boolean
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export function useMessengerPlugins(projectId: Ref<string | null>) {
  const api = useProjectsApi()
  const installedPlugins = useState<InstalledPlugin[]>('messenger-installed-plugins', () => [])
  const projectPlugins = useState<MessengerProjectPlugin[]>('messenger-project-plugins', () => [])
  const pending = useState<boolean>('messenger-plugins-pending', () => false)

  const enabledPluginIds = computed(() =>
    new Set(projectPlugins.value.filter(p => p.enabled).map(p => p.pluginId)),
  )

  function isEnabled(pluginId: string) {
    return enabledPluginIds.value.has(pluginId)
  }

  async function refresh() {
    if (!projectId.value) return
    pending.value = true
    try {
      const [installedRes, projectRes] = await Promise.all([
        api.listInstalledPlugins(),
        api.listProjectPlugins(projectId.value),
      ])
      installedPlugins.value = installedRes.plugins
      projectPlugins.value = projectRes.plugins
    }
    finally {
      pending.value = false
    }
  }

  async function toggle(pluginId: string) {
    if (!projectId.value) return
    if (isEnabled(pluginId)) {
      await api.deleteProjectPlugin(projectId.value, pluginId)
      projectPlugins.value = projectPlugins.value.filter(p => p.pluginId !== pluginId)
    }
    else {
      const res = await api.upsertProjectPlugin(projectId.value, pluginId, { enabled: true })
      const existing = projectPlugins.value.find(p => p.pluginId === pluginId)
      if (existing) {
        projectPlugins.value = projectPlugins.value.map(p => p.pluginId === pluginId ? res.plugin : p)
      }
      else {
        projectPlugins.value = [...projectPlugins.value, res.plugin]
      }
    }
  }

  return { installedPlugins, projectPlugins, pending, enabledPluginIds, isEnabled, refresh, toggle }
}
