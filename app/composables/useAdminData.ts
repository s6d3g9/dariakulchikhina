/**
 * useAdminData — centralised data fetching & entity linking for admin layout.
 *
 * Extracts all useFetch / useAsyncData / $fetch calls that were living
 * inside admin.vue layout into a single composable so the layout stays
 * a thin UI shell.
 */

import { ADMIN_SECTION_ROUTES } from '~~/shared/constants/navigation/admin-navigation'

/* ── Gallery tabs (shared constant) ────────────────────────────── */
export const GALLERY_TABS = [
  { slug: 'interiors', label: 'интерьеры', icon: 'ин' },
  { slug: 'furniture', label: 'мебель', icon: 'мб' },
  { slug: 'materials', label: 'материалы', icon: 'мт' },
  { slug: 'art', label: 'арт-объекты', icon: 'ар' },
  { slug: 'moodboards', label: 'мудборды', icon: 'мд' },
] as const

/* ── Helpers ───────────────────────────────────────────────────── */
function projectInitials(title: string) {
  const s = String(title || '').trim()
  return s ? s.slice(0, 2).toUpperCase() : 'PR'
}

export function nameInitials(name: string) {
  const parts = String(name || '').trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return String(name || '').slice(0, 2).toUpperCase() || '??'
}

/* ── Composable ────────────────────────────────────────────────── */
export function useAdminData() {
  const route = useRoute()

  // ── Active project slug (from route) ─────────────────────────
  const activeProjectSlug = computed(() => {
    const normalize = (value: unknown) => {
      if (typeof value !== 'string') return ''
      const trimmed = value.trim()
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return ''
      return trimmed
    }

    if (route.path.startsWith('/admin/projects/')) {
      return normalize(route.params.slug)
    }
    return normalize(route.query.projectSlug)
  })

  function withCtx(path: string) {
    return activeProjectSlug.value
      ? { path, query: { projectSlug: activeProjectSlug.value } }
      : path
  }

  // ── Route tab indicators ─────────────────────────────────────
  const isProjectsTab = computed(() =>
    route.path === ADMIN_SECTION_ROUTES.projects || route.path.startsWith('/admin/projects'))
  const isContractorsTab = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.contractors))
  const isClientsTab = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.clients))
  const isGalleryTab = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.gallery))
  const isDocumentsTab = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.docs))
  const isDesignersTab = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.designers))
  const isSellersTab = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.sellers))

  const contractorsTabTo = computed(() => withCtx(ADMIN_SECTION_ROUTES.contractors))
  const clientsTabTo = computed(() => withCtx(ADMIN_SECTION_ROUTES.clients))
  const designersTabTo = computed(() => withCtx(ADMIN_SECTION_ROUTES.designers))
  const sellersTabTo = computed(() => withCtx(ADMIN_SECTION_ROUTES.sellers))
  const galleryActiveTabTo = computed(() => {
    const match = GALLERY_TABS.find(g => route.path === `/admin/gallery/${g.slug}`)
    return withCtx(`/admin/gallery/${match?.slug ?? 'interiors'}`)
  })
  const galleryCurrentChip = computed(() => {
    const match = GALLERY_TABS.find(g => route.path === `/admin/gallery/${g.slug}`)
    return match?.icon ?? ''
  })

  // ── Notifications ────────────────────────────────────────────
  const { data: notifData, refresh: refreshNotif } = useFetch<any>('/api/admin/notifications', {
    server: false,
    default: () => ({ total: 0, extra: { count: 0 }, overdue: { count: 0 } }),
  })
  const notifTotal = computed(() => notifData.value?.total || 0)

  // ── Project data ─────────────────────────────────────────────
  const projectDataAsyncKey = computed(() => `admin-layout-project-data:${activeProjectSlug.value || 'none'}`)
  const { data: projectData, refresh: refreshProjectData } = (useAsyncData as any)(
    projectDataAsyncKey,
    () => activeProjectSlug.value ? $fetch(`/api/projects/${activeProjectSlug.value}`) : Promise.resolve(null),
    { watch: [activeProjectSlug], default: () => null, server: false },
  ) as { data: Ref<any>; refresh: () => Promise<void> }

  // ── Quick entity lists ───────────────────────────────────────
  const { data: quickProjectsData } = useFetch<any[]>('/api/projects', { server: false, default: () => [] })
  const quickProjects = computed(() =>
    (quickProjectsData.value || []).map((p: any) => ({ slug: String(p.slug), title: String(p.title || p.slug) })),
  )
  const currentProjectTitle = computed(() =>
    quickProjects.value.find(p => p.slug === activeProjectSlug.value)?.title || activeProjectSlug.value,
  )
  const currentProjectInitials = computed(() => projectInitials(currentProjectTitle.value))

  const { data: contractorsData } = useFetch<any[]>('/api/contractors', { server: false, default: () => [] })
  const quickContractors = computed(() => (contractorsData.value || []).slice(0, 12))

  const { data: clientsData } = useFetch<any[]>('/api/clients', { server: false, default: () => [] })
  const quickClients = computed(() => (clientsData.value || []).slice(0, 12))

  const { data: designersData } = useFetch<any[]>('/api/designers', { server: false, default: () => [] })
  const quickDesigners = computed(() => (designersData.value || []).slice(0, 12))

  const { data: sellersData } = useFetch<any[]>('/api/sellers', { server: false, default: () => [] })
  const quickSellers = computed(() => (sellersData.value || []).slice(0, 12))

  // ── Linked entities for current project ──────────────────────
  const linkedSellersAsyncKey = computed(() => `admin-layout-linked-sellers:${activeProjectSlug.value || 'none'}`)
  const { data: linkedSellersData, refresh: refreshLinkedSellers } = useAsyncData<any[]>(
    linkedSellersAsyncKey,
    () => activeProjectSlug.value ? $fetch<any[]>(`/api/projects/${activeProjectSlug.value}/sellers`) : Promise.resolve<any[]>([]),
    { watch: [activeProjectSlug], server: false, default: () => [] as any[] },
  )

  const linkedDesignersAsyncKey = computed(() => `admin-layout-linked-designers:${activeProjectSlug.value || 'none'}`)
  const { data: linkedDesignersData, refresh: refreshLinkedDesigners } = useAsyncData<any[]>(
    linkedDesignersAsyncKey,
    () => activeProjectSlug.value ? $fetch<any[]>(`/api/projects/${activeProjectSlug.value}/designers`) : Promise.resolve<any[]>([]),
    { watch: [activeProjectSlug], server: false, default: () => [] as any[] },
  )

  const linkedContractorsAsyncKey = computed(() => `admin-layout-linked-contractors:${activeProjectSlug.value || 'none'}`)
  const { data: linkedContractorsData, refresh: refreshLinkedContractors } = useAsyncData<any[]>(
    linkedContractorsAsyncKey,
    () => activeProjectSlug.value ? $fetch<any[]>(`/api/projects/${activeProjectSlug.value}/contractors`) : Promise.resolve<any[]>([]),
    { watch: [activeProjectSlug], server: false, default: () => [] as any[] },
  )

  // ── Linked IDs sets ──────────────────────────────────────────
  const linkedClientIds = computed(() => {
    if (!projectData.value?.profile) return new Set<string>()
    const profile = projectData.value.profile
    const ids = new Set<string>()
    if (Array.isArray(profile.client_ids)) {
      profile.client_ids.forEach((id: any) => { if (id) ids.add(String(id)) })
    }
    if (profile.client_id) ids.add(String(profile.client_id))
    return ids
  })

  const linkedContractorIds = computed(() =>
    new Set((linkedContractorsData.value || []).map((c: any) => String(c.id))),
  )
  const linkedDesignerIds = computed(() =>
    new Set((linkedDesignersData.value || []).map((d: any) => String(d.id))),
  )
  const linkedSellerIds = computed(() =>
    new Set((linkedSellersData.value || []).map((s: any) => String(s.id))),
  )

  function isClientLinked(clientId: string) { return linkedClientIds.value.has(String(clientId)) }
  function isContractorLinked(contractorId: string) { return linkedContractorIds.value.has(String(contractorId)) }
  function isDesignerLinked(designerId: string) { return linkedDesignerIds.value.has(String(designerId)) }
  function isSellerLinked(sellerId: string) { return linkedSellerIds.value.has(String(sellerId)) }

  // ── Entity link toggle actions ───────────────────────────────
  const clientActionLoading = ref(false)
  const clientActionMessage = ref('')

  function clearActionMessage() {
    setTimeout(() => { clientActionMessage.value = '' }, 2000)
  }

  async function toggleClientLink(clientId: string, clientName: string) {
    if (!activeProjectSlug.value) { clientActionMessage.value = 'Нет активного проекта'; return }
    clientActionLoading.value = true
    clientActionMessage.value = ''
    const isLinked = isClientLinked(clientId)
    try {
      if (isLinked) {
        await $fetch(`/api/clients/${clientId}/unlink-project`, { method: 'POST', body: { projectSlug: activeProjectSlug.value } })
        clientActionMessage.value = `Клиент "${clientName}" отвязан от проекта`
      } else {
        await $fetch(`/api/clients/${clientId}/link-project`, { method: 'POST', body: { projectSlug: activeProjectSlug.value } })
        clientActionMessage.value = `Клиент "${clientName}" привязан к проекту`
      }
      await refreshProjectData()
      clearActionMessage()
    } catch (error: any) {
      clientActionMessage.value = error?.data?.message || 'Ошибка при изменении связи клиента'
    } finally {
      clientActionLoading.value = false
    }
  }

  async function toggleContractorLink(contractorId: string, contractorName: string) {
    if (!activeProjectSlug.value) { clientActionMessage.value = 'Нет активного проекта'; return }
    clientActionLoading.value = true
    clientActionMessage.value = ''
    const isLinked = isContractorLinked(contractorId)
    try {
      if (isLinked) {
        await $fetch(`/api/projects/${activeProjectSlug.value}/contractors`, { method: 'DELETE', body: { contractorId: Number(contractorId) } })
        clientActionMessage.value = `Подрядчик "${contractorName}" отвязан от проекта`
      } else {
        await $fetch(`/api/projects/${activeProjectSlug.value}/contractors`, { method: 'POST', body: { contractorId: Number(contractorId) } })
        clientActionMessage.value = `Подрядчик "${contractorName}" привязан к проекту`
      }
      await refreshLinkedContractors()
      await refreshProjectData()
      clearActionMessage()
    } catch (error: any) {
      clientActionMessage.value = error?.data?.message || 'Ошибка при изменении связи подрядчика'
    } finally {
      clientActionLoading.value = false
    }
  }

  async function toggleDesignerLink(designerId: string, designerName: string) {
    if (!activeProjectSlug.value) { clientActionMessage.value = 'Нет активного проекта'; return }
    clientActionLoading.value = true
    clientActionMessage.value = ''
    const isLinked = isDesignerLinked(designerId)
    try {
      if (isLinked) {
        await $fetch(`/api/projects/${activeProjectSlug.value}/designers`, { method: 'DELETE', body: { designerId: Number(designerId) } })
        clientActionMessage.value = `Дизайнер "${designerName}" отвязан от проекта`
      } else {
        await $fetch(`/api/projects/${activeProjectSlug.value}/designers`, { method: 'POST', body: { designerId: Number(designerId) } })
        clientActionMessage.value = `Дизайнер "${designerName}" привязан к проекту`
      }
      await refreshLinkedDesigners()
      clearActionMessage()
    } catch (error: any) {
      clientActionMessage.value = error?.data?.message || 'Ошибка при изменении связи дизайнера'
    } finally {
      clientActionLoading.value = false
    }
  }

  async function toggleSellerLink(sellerId: string, sellerName: string) {
    if (!activeProjectSlug.value) { clientActionMessage.value = 'Нет активного проекта'; return }
    clientActionLoading.value = true
    clientActionMessage.value = ''
    const isLinked = isSellerLinked(sellerId)
    try {
      if (isLinked) {
        await $fetch(`/api/projects/${activeProjectSlug.value}/sellers`, { method: 'DELETE', body: { sellerId: Number(sellerId) } })
        clientActionMessage.value = `Поставщик "${sellerName}" отвязан от проекта`
      } else {
        await $fetch(`/api/projects/${activeProjectSlug.value}/sellers`, { method: 'POST', body: { sellerId: Number(sellerId) } })
        clientActionMessage.value = `Поставщик "${sellerName}" привязан к проекту`
      }
      await refreshLinkedSellers()
      clearActionMessage()
    } catch (error: any) {
      clientActionMessage.value = error?.data?.message || 'Ошибка при изменении связи поставщика'
    } finally {
      clientActionLoading.value = false
    }
  }

  // ── Auth ─────────────────────────────────────────────────────
  const router = useRouter()
  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login?role=admin')
  }

  return {
    // Route
    activeProjectSlug,
    withCtx,

    // Tab indicators
    isProjectsTab,
    isContractorsTab,
    isClientsTab,
    isGalleryTab,
    isDocumentsTab,
    isDesignersTab,
    isSellersTab,

    // Tab destinations
    contractorsTabTo,
    clientsTabTo,
    designersTabTo,
    sellersTabTo,
    galleryActiveTabTo,
    galleryCurrentChip,

    // Notifications
    notifData,
    notifTotal,
    refreshNotif,

    // Project
    projectData,
    refreshProjectData,
    quickProjects,
    currentProjectTitle,
    currentProjectInitials,

    // Entity lists
    quickContractors,
    quickClients,
    quickDesigners,
    quickSellers,

    // Linked entities
    linkedSellersData,
    linkedDesignersData,
    linkedContractorsData,

    // Linked check
    isClientLinked,
    isContractorLinked,
    isDesignerLinked,
    isSellerLinked,

    // Link toggle actions
    clientActionLoading,
    clientActionMessage,
    toggleClientLink,
    toggleContractorLink,
    toggleDesignerLink,
    toggleSellerLink,

    // Auth
    logout,
  }
}
