export interface MessengerProject {
  id: string
  slug: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export function useMessengerProjects() {
  const api = useProjectsApi()
  const projects = useState<MessengerProject[]>('messenger-projects-list', () => [])
  const pending = useState<boolean>('messenger-projects-pending', () => false)
  const nextCursor = useState<string | null>('messenger-projects-cursor', () => null)
  const hasMore = computed(() => nextCursor.value !== null)

  async function refresh() {
    pending.value = true
    try {
      const response = await api.listProjects()
      projects.value = response.projects
      nextCursor.value = response.nextCursor
    }
    finally {
      pending.value = false
    }
  }

  async function loadMore() {
    if (!nextCursor.value || pending.value) return
    pending.value = true
    try {
      const response = await api.listProjects(nextCursor.value)
      projects.value = [...projects.value, ...response.projects]
      nextCursor.value = response.nextCursor
    }
    finally {
      pending.value = false
    }
  }

  async function create(payload: { name: string; description?: string }) {
    const response = await api.createProject(payload)
    projects.value = [response.project, ...projects.value]
    return response.project
  }

  function findBySlug(slug: string) {
    return projects.value.find(p => p.slug === slug) ?? null
  }

  return {
    projects,
    pending,
    nextCursor,
    hasMore,
    refresh,
    loadMore,
    create,
    findBySlug,
  }
}
