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
  const pending = useState<boolean>('messenger-plugins-pending', () => false)

  async function refresh() {
    if (!projectId.value) return
    pending.value = true
    try {
      const res = await api.listInstalledPlugins()
      installedPlugins.value = res.plugins
    }
    finally {
      pending.value = false
    }
  }

  return { installedPlugins, pending, refresh }
}
