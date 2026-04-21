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
    // Auto-spawn a composer agent + its claude-session for the new project.
    // Non-fatal: if the backend fails (e.g. claude-session binary missing in
    // dev env) the project still exists and the user can retry via the
    // Composer tab CTA inside project workspace.
    try {
      await api.createProjectAgent(response.project.id, { type: 'composer' })
    }
    catch (err) {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[projects] composer auto-spawn failed; manual create required', err)
      }
    }
    return response.project
  }

  async function update(projectId: string, payload: { name?: string; description?: string }) {
    const response = await api.updateProject(projectId, payload)
    projects.value = projects.value.map(p => p.id === projectId ? response.project : p)
    return response.project
  }

  async function remove(projectId: string) {
    await api.deleteProject(projectId)
    projects.value = projects.value.filter(p => p.id !== projectId)
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
    update,
    remove,
    findBySlug,
  }
}
