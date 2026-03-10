export function useAdminClientsDirectory(projectSlugFilter: Ref<string>) {
  const clientsCacheByProject = useState<Record<string, any[]>>('cache-admin-clients-by-project', () => ({}))
  const clientsCacheKey = computed(() => projectSlugFilter.value || '__all__')

  const { data: clients, pending, refresh } = useFetch<any[]>(
    () => projectSlugFilter.value ? `/api/clients?projectSlug=${encodeURIComponent(projectSlugFilter.value)}` : '/api/clients',
    { server: false, default: () => clientsCacheByProject.value[clientsCacheKey.value] || [] },
  )

  watch(clients, (value) => {
    if (!Array.isArray(value)) {
      return
    }
    clientsCacheByProject.value = {
      ...clientsCacheByProject.value,
      [clientsCacheKey.value]: value,
    }
  }, { deep: true })

  async function saveClient(clientId: number | null, payload: Record<string, unknown>) {
    if (clientId) {
      await $fetch(`/api/clients/${clientId}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/clients', { method: 'POST', body: payload })
    }
    await refresh()
  }

  async function deleteClient(clientId: number) {
    await $fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
    await refresh()
  }

  async function linkClientToProject(clientId: number, projectSlug: string) {
    await $fetch(`/api/clients/${clientId}/link-project`, {
      method: 'POST',
      body: { projectSlug },
    })
    await refresh()
  }

  async function unlinkClientFromProject(clientId: number, projectSlug: string) {
    await $fetch(`/api/clients/${clientId}/unlink-project`, {
      method: 'POST',
      body: { projectSlug },
    })
    await refresh()
  }

  return {
    clients,
    pending,
    refresh,
    saveClient,
    deleteClient,
    linkClientToProject,
    unlinkClientFromProject,
  }
}