<template>
  <div class="admin-bg glass-page">
    <!-- DesignPanel hidden for production; enable locally if needed -->
    <!-- <UIDesignPanel /> -->

    <!-- Slim top-header (mobile only visible; desktop: brand in sidebar) -->
    <header class="admin-header glass-surface">
      <span class="admin-brand">admin</span>
      <div class="admin-header-right">
        <button
          type="button"
          class="admin-search-btn"
          title="Поиск  Ctrl+K / ⌘K"
          @click="searchOpen = true"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span class="admin-search-label">поиск</span>
          <kbd class="admin-search-kbd">Ctrl+K</kbd>
        </button>
        <button type="button" class="theme-toggle" @click="toggleTheme" :aria-label="isDark ? 'Светлая' : 'Тёмная'">
          <svg v-if="!isDark" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button class="admin-mob-burger" @click="sidebarOpen = !sidebarOpen" aria-label="Меню">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </header>

    <div class="admin-container">

      <!-- ── Left Sidebar ── -->
      <aside class="admin-sidebar glass-surface" :class="{ 'admin-sidebar--open': sidebarOpen }">
        <nav class="admin-nav">

          <div class="admin-sidebar-logo">
            <span class="admin-sidebar-brand">admin</span>
          </div>

          <div class="admin-nav-body">

            <!-- проекты -->
            <div class="admin-nav-group">
              <div class="admin-nav-row" :class="{ 'admin-nav-row--active': isProjectsTab }">
                <NuxtLink to="/admin" class="admin-nav-item" @click="sidebarOpen = false">проекты</NuxtLink>
                <button type="button" class="admin-nav-expand" @click.stop="projectsOpen = !projectsOpen">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" :style="{ transform: projectsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              <div v-if="projectsOpen" class="admin-nav-sub">
                <button
                  v-for="p in quickProjects" :key="p.slug"
                  type="button" class="admin-nav-sub-item"
                  :class="{ 'admin-nav-sub-item--active': p.slug === activeProjectSlug }"
                  @click="pickProject(p.slug); sidebarOpen = false"
                >
                  <span class="admin-nav-ini">{{ projectInitials(p.title) }}</span>
                  <span class="admin-nav-sub-label">{{ p.title }}</span>
                </button>
                <div v-if="!quickProjects.length" class="admin-nav-sub-empty">нет проектов</div>
              </div>
            </div>

            <!-- подрядчики -->
            <div class="admin-nav-group">
              <div class="admin-nav-row" :class="{ 'admin-nav-row--active': isContractorsTab }">
                <NuxtLink :to="contractorsTabTo" class="admin-nav-item" @click="sidebarOpen = false">подрядчики</NuxtLink>
                <button type="button" class="admin-nav-expand" @click.stop="contractorsOpen = !contractorsOpen">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" :style="{ transform: contractorsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              <div v-if="contractorsOpen" class="admin-nav-sub">
                <div v-for="ct in quickContractors" :key="ct.id" class="admin-nav-sub-row">
                  <button type="button" class="admin-nav-sub-item admin-nav-sub-item--flex" @click="pickContractor(ct); sidebarOpen = false">
                    <span class="admin-nav-ini">{{ nameInitials(ct.name) }}</span>
                    <span class="admin-nav-sub-label">{{ ct.name }}</span>
                  </button>
                  <button
                    v-if="activeProjectSlug"
                    type="button"
                    class="admin-nav-link-btn"
                    :class="isContractorLinked(ct.id) ? 'admin-nav-link-btn--remove' : 'admin-nav-link-btn--add'"
                    :disabled="clientActionLoading"
                    @click.stop="toggleContractorLink(ct.id, ct.name)"
                  >{{ isContractorLinked(ct.id) ? '−' : '+' }}</button>
                </div>
                <button type="button" class="admin-nav-see-all" @click="goToAllContractors">все →</button>
                <div v-if="clientActionMessage" class="admin-nav-msg">{{ clientActionMessage }}</div>
              </div>
            </div>

            <!-- клиенты -->
            <div class="admin-nav-group">
              <div class="admin-nav-row" :class="{ 'admin-nav-row--active': isClientsTab }">
                <NuxtLink :to="clientsTabTo" class="admin-nav-item" @click="sidebarOpen = false">клиенты</NuxtLink>
                <button type="button" class="admin-nav-expand" @click.stop="clientsOpen = !clientsOpen">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" :style="{ transform: clientsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              <div v-if="clientsOpen" class="admin-nav-sub">
                <div v-for="cl in quickClients" :key="cl.id" class="admin-nav-sub-row">
                  <button type="button" class="admin-nav-sub-item admin-nav-sub-item--flex" @click="pickClient(cl); sidebarOpen = false">
                    <span class="admin-nav-ini">{{ nameInitials(cl.name) }}</span>
                    <span class="admin-nav-sub-label">{{ cl.name }}</span>
                  </button>
                  <button
                    v-if="activeProjectSlug"
                    type="button"
                    class="admin-nav-link-btn"
                    :class="isClientLinked(cl.id) ? 'admin-nav-link-btn--remove' : 'admin-nav-link-btn--add'"
                    :disabled="clientActionLoading"
                    @click.stop="toggleClientLink(cl.id, cl.name)"
                  >{{ isClientLinked(cl.id) ? '−' : '+' }}</button>
                </div>
                <button type="button" class="admin-nav-see-all" @click="goToAllClients">все →</button>
              </div>
            </div>

            <!-- галерея (с вложенностью) -->
            <div class="admin-nav-group">
              <div class="admin-nav-row" :class="{ 'admin-nav-row--active': isGalleryTab }">
                <NuxtLink :to="galleryActiveTabTo" class="admin-nav-item" @click="sidebarOpen = false">галерея</NuxtLink>
                <button type="button" class="admin-nav-expand" @click.stop="galleryOpen = !galleryOpen">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" :style="{ transform: galleryOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              <div v-if="galleryOpen || isGalleryTab" class="admin-nav-sub">
                <NuxtLink
                  v-for="g in GALLERY_TABS" :key="g.slug"
                  :to="withCtx(`/admin/gallery/${g.slug}`)"
                  class="admin-nav-sub-item"
                  :class="{ 'admin-nav-sub-item--active': route.path === `/admin/gallery/${g.slug}` }"
                  @click="sidebarOpen = false"
                >
                  <span class="admin-nav-ini">{{ g.icon }}</span>
                  <span class="admin-nav-sub-label">{{ g.label }}</span>
                </NuxtLink>
              </div>
            </div>

            <!-- документы -->
            <div class="admin-nav-group">
              <div class="admin-nav-row" :class="{ 'admin-nav-row--active': isDocumentsTab }">
                <NuxtLink to="/admin/documents" class="admin-nav-item" @click="sidebarOpen = false">документы</NuxtLink>
              </div>
            </div>

            <!-- дизайнеры -->
            <div class="admin-nav-group">
              <div class="admin-nav-row" :class="{ 'admin-nav-row--active': isDesignersTab }">
                <NuxtLink :to="designersTabTo" class="admin-nav-item" @click="sidebarOpen = false">дизайнеры</NuxtLink>
                <button type="button" class="admin-nav-expand" @click.stop="designersOpen = !designersOpen">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" :style="{ transform: designersOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              <div v-if="designersOpen" class="admin-nav-sub">
                <div v-for="d in quickDesigners" :key="d.id" class="admin-nav-sub-row">
                  <button type="button" class="admin-nav-sub-item admin-nav-sub-item--flex" @click="pickDesigner(d); sidebarOpen = false">
                    <span class="admin-nav-ini">{{ nameInitials(d.name) }}</span>
                    <span class="admin-nav-sub-label">{{ d.name }}</span>
                  </button>
                  <button
                    v-if="activeProjectSlug"
                    type="button"
                    class="admin-nav-link-btn"
                    :class="isDesignerLinked(d.id) ? 'admin-nav-link-btn--remove' : 'admin-nav-link-btn--add'"
                    :disabled="clientActionLoading"
                    @click.stop="toggleDesignerLink(d.id, d.name)"
                  >{{ isDesignerLinked(d.id) ? '−' : '+' }}</button>
                </div>
                <button type="button" class="admin-nav-see-all" @click="goToAllDesigners">все →</button>
              </div>
            </div>

          </div><!-- /admin-nav-body -->

          <!-- Sidebar footer -->
          <div class="admin-nav-footer">
            <NuxtLink to="/" class="admin-nav-footer-link">сайт</NuxtLink>
            <a href="#" class="admin-nav-footer-link" @click.prevent="logout">выйти</a>
          </div>

        </nav>
      </aside>

      <!-- Mobile overlay -->
      <div v-if="sidebarOpen" class="admin-mob-overlay" @click="sidebarOpen = false"></div>

      <!-- ── Main content ── -->
      <main class="admin-content">
        <slot />
      </main>

    </div><!-- /.admin-container -->

    <!-- ── Global search palette ── -->
    <AdminSearch :open="searchOpen" @close="searchOpen = false" />
  </div>
</template>
<script setup lang="ts">
const router = useRouter()
const route  = useRoute()
const { isDark, toggleTheme } = useThemeToggle()

// ── Route helpers (must be before useFetch that references them) ──
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

// Current project info for linking/unlinking
const { data: projectData, refresh: refreshProjectData } = await useFetch(() => 
  activeProjectSlug.value ? `/api/projects/${activeProjectSlug.value}` : null,
  { watch: [activeProjectSlug], default: () => null }
)

// ── Gallery tabs config ─────────────────────────────────────────
const GALLERY_TABS = [
  { slug: 'interiors',  label: 'интерьеры',    icon: '🏠' },
  { slug: 'furniture',  label: 'мебель',        icon: '🪑' },
  { slug: 'materials',  label: 'материалы',     icon: '🪵' },
  { slug: 'art',        label: 'арт-объекты',   icon: '🎨' },
  { slug: 'moodboards', label: 'мудборды',      icon: '🖼' },
]

function withCtx(path: string) {
  return activeProjectSlug.value
    ? { path, query: { projectSlug: activeProjectSlug.value } }
    : path
}

const isProjectsTab    = computed(() => route.path === '/admin' || route.path.startsWith('/admin/projects'))
const isContractorsTab = computed(() => route.path.startsWith('/admin/contractors'))
const isClientsTab     = computed(() => route.path.startsWith('/admin/clients'))
const isGalleryTab     = computed(() => route.path.startsWith('/admin/gallery'))
const isDocumentsTab   = computed(() => route.path.startsWith('/admin/documents'))
const isDesignersTab   = computed(() => route.path.startsWith('/admin/designers'))

const contractorsTabTo    = computed(() => withCtx('/admin/contractors'))
const clientsTabTo        = computed(() => withCtx('/admin/clients'))
const designersTabTo      = computed(() => withCtx('/admin/designers'))
const galleryActiveTabTo  = computed(() => {
  const match = GALLERY_TABS.find(g => route.path === `/admin/gallery/${g.slug}`)
  return withCtx(`/admin/gallery/${match?.slug ?? 'interiors'}`)
})

const galleryCurrentChip = computed(() => {
  const match = GALLERY_TABS.find(g => route.path === `/admin/gallery/${g.slug}`)
  return match?.icon ?? ''
})

// ── Projects data ───────────────────────────────────────────────
const { data: quickProjectsData } = await useFetch<any[]>('/api/projects', { server: false, default: () => [] })
const quickProjects = computed(() =>
  (quickProjectsData.value || []).map((p: any) => ({ slug: String(p.slug), title: String(p.title || p.slug) }))
)
const currentProjectTitle    = computed(() => quickProjects.value.find(p => p.slug === activeProjectSlug.value)?.title || activeProjectSlug.value)
const currentProjectInitials = computed(() => projectInitials(currentProjectTitle.value))

// ── Contractors data ────────────────────────────────────────────
const { data: contractorsData } = useFetch<any[]>('/api/contractors', { server: false, default: () => [] })
const quickContractors = computed(() => (contractorsData.value || []).slice(0, 12))

// ── Clients data ────────────────────────────────────────────────
const { data: clientsData } = useFetch<any[]>('/api/clients', { server: false, default: () => [] })
const quickClients = computed(() => (clientsData.value || []).slice(0, 12))

// ── Designers data ──────────────────────────────────────────────
const { data: designersData } = useFetch<any[]>('/api/designers', { server: false, default: () => [] })
const quickDesigners = computed(() => (designersData.value || []).slice(0, 12))
const { data: linkedDesignersData, refresh: refreshLinkedDesigners } = await useFetch<any[]>(
  () => activeProjectSlug.value ? `/api/projects/${activeProjectSlug.value}/designers` : null,
  { watch: [activeProjectSlug], server: false, default: () => [] },
)
const { data: linkedContractorsData, refresh: refreshLinkedContractors } = await useFetch<any[]>(
  () => activeProjectSlug.value ? `/api/projects/${activeProjectSlug.value}/contractors` : null,
  { watch: [activeProjectSlug], server: false, default: () => [] },
)

const clientActionLoading = ref(false)
const clientActionMessage = ref('')

// Get linked clients and contractors for current project
const linkedClientIds = computed(() => {
  if (!projectData.value?.profile) return new Set()
  const profile = projectData.value.profile
  const ids = new Set<string>()
  if (Array.isArray(profile.client_ids)) {
    profile.client_ids.forEach((id: any) => {
      if (id) ids.add(String(id))
    })
  }
  if (profile.client_id) {
    ids.add(String(profile.client_id))
  }
  return ids
})

// Use existing contractor data fetching
const linkedContractorIds = computed(() => {
  return new Set((linkedContractorsData.value || []).map((c: any) => String(c.id)))
})

const linkedDesignerIds = computed(() => {
  return new Set((linkedDesignersData.value || []).map((d: any) => String(d.id)))
})

// Check if client/contractor is linked to current project
function isClientLinked(clientId: string): boolean {
  return linkedClientIds.value.has(String(clientId))
}

function isContractorLinked(contractorId: string): boolean {
  return linkedContractorIds.value.has(String(contractorId))
}

function isDesignerLinked(designerId: string): boolean {
  return linkedDesignerIds.value.has(String(designerId))
}

// Toggle client link to current project
async function toggleClientLink(clientId: string, clientName: string) {
  if (!activeProjectSlug.value) {
    clientActionMessage.value = 'Нет активного проекта'
    return
  }
  
  clientActionLoading.value = true
  clientActionMessage.value = ''
  
  const isLinked = isClientLinked(clientId)
  
  try {
    if (isLinked) {
      await $fetch(`/api/clients/${clientId}/unlink-project`, {
        method: 'POST',
        body: { projectSlug: activeProjectSlug.value }
      })
      clientActionMessage.value = `Клиент "${clientName}" отвязан от проекта`
    } else {
      await $fetch(`/api/clients/${clientId}/link-project`, {
        method: 'POST',
        body: { projectSlug: activeProjectSlug.value }
      })
      clientActionMessage.value = `Клиент "${clientName}" привязан к проекту`
    }
    
    // Refresh project data
    await refreshProjectData()
    
    setTimeout(() => {
      clientActionMessage.value = ''
    }, 2000)
    
  } catch (error: any) {
    clientActionMessage.value = error?.data?.message || 'Ошибка при изменении связи клиента'
  } finally {
    clientActionLoading.value = false
  }
}

// Toggle contractor link to current project  
async function toggleContractorLink(contractorId: string, contractorName: string) {
  if (!activeProjectSlug.value) {
    clientActionMessage.value = 'Нет активного проекта'
    return
  }
  
  clientActionLoading.value = true
  clientActionMessage.value = ''
  
  const isLinked = isContractorLinked(contractorId)
  
  try {
    if (isLinked) {
      await $fetch(`/api/projects/${activeProjectSlug.value}/contractors`, {
        method: 'DELETE',
        body: { contractorId: Number(contractorId) }
      })
      clientActionMessage.value = `Подрядчик "${contractorName}" отвязан от проекта`
    } else {
      await $fetch(`/api/projects/${activeProjectSlug.value}/contractors`, {
        method: 'POST',
        body: { contractorId: Number(contractorId) }
      })
      clientActionMessage.value = `Подрядчик "${contractorName}" привязан к проекту`
    }
    
    await refreshLinkedContractors()
    await refreshProjectData()
    
    setTimeout(() => {
      clientActionMessage.value = ''
    }, 2000)
    
  } catch (error: any) {
    clientActionMessage.value = error?.data?.message || 'Ошибка при изменении связи подрядчика'
  } finally {
    clientActionLoading.value = false
  }
}

async function toggleDesignerLink(designerId: string, designerName: string) {
  if (!activeProjectSlug.value) {
    clientActionMessage.value = 'Нет активного проекта'
    return
  }

  clientActionLoading.value = true
  clientActionMessage.value = ''

  const isLinked = isDesignerLinked(designerId)

  try {
    if (isLinked) {
      await $fetch(`/api/projects/${activeProjectSlug.value}/designers`, {
        method: 'DELETE',
        body: { designerId: Number(designerId) },
      })
      clientActionMessage.value = `Дизайнер "${designerName}" отвязан от проекта`
    } else {
      await $fetch(`/api/projects/${activeProjectSlug.value}/designers`, {
        method: 'POST',
        body: { designerId: Number(designerId) },
      })
      clientActionMessage.value = `Дизайнер "${designerName}" привязан к проекту`
    }

    await refreshLinkedDesigners()

    setTimeout(() => {
      clientActionMessage.value = ''
    }, 2000)
  } catch (error: any) {
    clientActionMessage.value = error?.data?.message || 'Ошибка при изменении связи дизайнера'
  } finally {
    clientActionLoading.value = false
  }
}

// ── Initials helpers ────────────────────────────────────────────
function projectInitials(title: string) {
  const s = String(title || '').trim()
  return s ? s.slice(0, 2).toUpperCase() : 'PR'
}
function nameInitials(name: string) {
  const parts = String(name || '').trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return String(name || '').slice(0, 2).toUpperCase() || '??'
}

// ── Dropdowns state ─────────────────────────────────────────────
const sidebarOpen     = ref(false)
const projectsOpen    = ref(false)
const contractorsOpen = ref(false)
const clientsOpen     = ref(false)
const galleryOpen     = ref(isGalleryTab.value)
const designersOpen   = ref(false)

// Keep refs for compat (unused in sidebar but harmless)
const projectsTabRef    = ref<HTMLElement | null>(null)
const contractorsTabRef = ref<HTMLElement | null>(null)
const clientsTabRef     = ref<HTMLElement | null>(null)
const galleryTabRef     = ref<HTMLElement | null>(null)
const designersTabRef   = ref<HTMLElement | null>(null)

function closeAll() {
  projectsOpen.value = contractorsOpen.value = clientsOpen.value = galleryOpen.value = designersOpen.value = false
  sidebarOpen.value = false
}

// sidebar sections don't need click-outside logic

// ── Global search ─────────────────────────────────────────────
const searchOpen = ref(false)

function onSearchKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchOpen.value = !searchOpen.value
  }
}

onMounted(() => {
  document.addEventListener('keydown', onSearchKeydown)
  useUITheme().initTheme()
  useDesignSystem().initDesignSystem()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onSearchKeydown)
})
watch(() => route.fullPath, closeAll)

// ── Pickers ─────────────────────────────────────────────────────
function pickProject(slug: string) { closeAll(); navigateTo(`/admin/projects/${slug}`) }
function pickContractor(ct: { id: number; name: string }) {
  const id = ct.id
  closeAll()
  // Если уже в проекте — показываем подрядчика inline внутри страницы проекта
  if (activeProjectSlug.value) {
    navigateTo(`/admin/projects/${activeProjectSlug.value}?view=contractor&cid=${id}`)
    return
  }
  const dest = withCtx('/admin/contractors')
  if (typeof dest === 'string') {
    navigateTo(`${dest}#c-${id}`)
  } else {
    navigateTo({ ...dest, hash: `#c-${id}` })
  }
}
function pickClient(cl: any) {
  closeAll()
  // Всегда открываем кабинет клиента inline в /admin/clients
  navigateTo(`/admin/clients?clientId=${cl.id}`)
}
function pickGallery(slug: string) { closeAll(); navigateTo(withCtx(`/admin/gallery/${slug}`)) }
function pickDesigner(designer: any) {
  closeAll()
  navigateTo(`/admin/designers?designerId=${designer.id}`)
}

// ── "All entities" navigation (works even if already on the page) ──
const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)

function goToAllContractors() {
  closeAll()
  if (isContractorsTab.value) {
    entityDeselectSignal.value++
  } else {
    navigateTo(contractorsTabTo.value)
  }
}
function goToAllClients() {
  closeAll()
  if (isClientsTab.value) {
    entityDeselectSignal.value++
  } else {
    navigateTo(clientsTabTo.value)
  }
}
function goToAllDesigners() {
  closeAll()
  if (isDesignersTab.value) {
    entityDeselectSignal.value++
  } else {
    navigateTo(designersTabTo.value)
  }
}

// ── Auth ─────────────────────────────────────────────────────────
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  router.push('/admin/login')
}
</script>

<style scoped>
/* ── Page ── */
.admin-bg {
  min-height: 100vh;
  font-family: var(--ds-font-family);
  font-size: var(--ds-font-size);
  font-weight: var(--ds-font-weight);
  line-height: var(--ds-line-height);
}

/* ── Header (desktop: thin strip; mobile: visible header) ── */
.admin-header {
  position: fixed;
  top: calc(var(--dp-panel-h, 0px));
  left: 0; right: 0;
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0;
  z-index: 60;
  transition: top .2s cubic-bezier(0.16, 1, 0.3, 1);
}
.admin-header-right { display: flex; align-items: center; gap: 10px; }
.admin-brand {
  font-size: .65rem;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  opacity: .35;
}
.admin-mob-burger {
  display: none;
  background: none; border: none; cursor: pointer;
  color: var(--glass-text); opacity: .6; padding: 4px;
}

/* ── Container ── */
.admin-container {
  display: flex;
  align-items: flex-start;
  min-height: 100vh;
  padding-top: calc(44px + var(--dp-panel-h, 0px));
  max-width: var(--ds-container-width, 1280px);
  margin: 0 auto;
  transition: padding-top .2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ── Sidebar ── */
.admin-sidebar {
  width: 210px;
  flex-shrink: 0;
  min-height: calc(100vh - 44px - var(--dp-panel-h, 0px));
  position: sticky;
  top: calc(44px + var(--dp-panel-h, 0px));
  height: calc(100vh - 44px - var(--dp-panel-h, 0px));
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  border-right: 1px solid var(--glass-border);
  transition: top .2s cubic-bezier(0.16, 1, 0.3, 1), height .2s cubic-bezier(0.16, 1, 0.3, 1);
}
.admin-sidebar::-webkit-scrollbar { width: 3px; }
.admin-sidebar::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }
.admin-sidebar-logo {
  padding: 20px 16px 10px;
  border-bottom: 1px solid var(--glass-border);
}
.admin-sidebar-brand {
  font-size: .62rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  opacity: .3;
}

/* ── Nav ── */
.admin-nav { display: flex; flex-direction: column; flex: 1; }
.admin-nav-body { flex: 1; padding: 10px 0; }

.admin-nav-group {
  margin-bottom: 1px;
}
.admin-nav-row {
  display: flex;
  align-items: center;
  border-radius: 8px;
  margin: 0 6px;
  transition: background .12s;
}
.admin-nav-row:hover {
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
}
.admin-nav-row--active {
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.admin-nav-item {
  flex: 1;
  padding: 8px 10px;
  font-size: .74rem;
  color: var(--glass-text);
  text-decoration: none;
  opacity: .55;
  letter-spacing: .04em;
  font-family: var(--ds-font-family);
  background: none; border: none; cursor: pointer; text-align: left;
  transition: opacity .12s;
}
.admin-nav-row:hover .admin-nav-item,
.admin-nav-row--active .admin-nav-item {
  opacity: 1;
}
.admin-nav-row--active .admin-nav-item {
  font-weight: 600;
  opacity: 1;
}
.admin-nav-expand {
  width: 28px; height: 28px;
  flex-shrink: 0;
  background: none; border: none; cursor: pointer;
  color: var(--glass-text); opacity: .3;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px;
  transition: opacity .12s, background .12s;
  margin-right: 4px;
}
.admin-nav-expand:hover { opacity: .8; background: color-mix(in srgb, var(--glass-text) 8%, transparent); }

/* Sub-items */
.admin-nav-sub {
  padding: 2px 6px 6px 16px;
  display: flex; flex-direction: column; gap: 1px;
}
.admin-nav-sub-row { display: flex; align-items: center; gap: 3px; }
.admin-nav-sub-item {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 8px; border-radius: 7px;
  font-size: .71rem; color: var(--glass-text); opacity: .5;
  text-decoration: none; background: none; border: none; cursor: pointer;
  font-family: var(--ds-font-family); text-align: left;
  transition: opacity .12s, background .12s;
  width: 100%;
}
.admin-nav-sub-item--flex { flex: 1; width: auto; }
.admin-nav-sub-item:hover { opacity: .9; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.admin-nav-sub-item--active { opacity: 1; font-weight: 600; background: color-mix(in srgb, var(--glass-text) 7%, transparent); }
.admin-nav-ini {
  width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border: 1px solid var(--glass-border);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: .56rem; font-weight: 700;
}
.admin-nav-sub-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-nav-sub-empty { font-size: .68rem; opacity: .3; padding: 4px 8px; }
.admin-nav-see-all {
  font-size: .66rem; opacity: .35; text-align: left; padding: 4px 8px;
  background: none; border: none; cursor: pointer; color: var(--glass-text);
  font-family: var(--ds-font-family); border-top: 1px solid var(--glass-border); margin-top: 2px;
}
.admin-nav-see-all:hover { opacity: .8; }
.admin-nav-msg { font-size: .66rem; opacity: .5; padding: 4px 8px; color: var(--glass-text); }

.admin-nav-link-btn {
  width: 22px; height: 22px; flex-shrink: 0;
  border-radius: 5px; border: 1px solid var(--glass-border);
  background: var(--glass-bg); color: var(--glass-text);
  font-size: 12px; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all .12s;
}
.admin-nav-link-btn--add:hover { background: #10b981; color: white; border-color: #10b981; }
.admin-nav-link-btn--remove:hover { background: #ef4444; color: white; border-color: #ef4444; }
.admin-nav-link-btn:disabled { opacity: .35; cursor: not-allowed; }

/* Sidebar footer */
.admin-nav-footer {
  padding: 12px 14px;
  border-top: 1px solid var(--glass-border);
  display: flex; align-items: center; gap: 10px;
}
.admin-nav-footer-link {
  font-size: .7rem; color: var(--glass-text); opacity: .4;
  text-decoration: none; font-family: var(--ds-font-family);
  transition: opacity .12s;
}
.admin-nav-footer-link:hover { opacity: 1; }

/* ── Search button (header) ── */
.admin-search-btn {
  display: flex; align-items: center; gap: 6px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 8px; padding: 4px 10px 4px 8px;
  cursor: pointer; color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  font-size: .72rem; transition: background .14s, border-color .14s, color .14s;
  font-family: inherit;
}
.admin-search-btn:hover {
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-color: color-mix(in srgb, var(--glass-text) 18%, transparent);
  color: var(--glass-text);
}
.admin-search-label { font-size: .7rem; }
.admin-search-kbd {
  font-size: .58rem;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 4px; padding: 1px 5px; font-family: inherit;
  color: color-mix(in srgb, var(--glass-text) 38%, transparent);
}

.theme-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); opacity: .65; cursor: pointer; padding: 0;
  transition: opacity .15s, background .15s, border-color .15s;
}
.theme-toggle:hover { opacity: 1; background: color-mix(in srgb, var(--glass-text) 10%, transparent); }

.admin-link {
  font-size: .78rem; color: var(--glass-text); opacity: .5; text-decoration: none;
}
.admin-link:hover { opacity: 1; }

/* ── Main content ── */
.admin-content {
  flex: 1;
  min-width: 0;
  padding: 20px 20px 40px;
  transition: max-width var(--ds-transition, 180ms ease);
}

/* ── Modal & shared buttons (kept for pages that use them) ── */
.a-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
}
.a-modal {
  background: var(--glass-bg); border: none;
  box-shadow: 0 24px 60px rgba(0,0,0,.18);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
  border-radius: 18px; padding: 28px 30px; width: 420px; max-width: 90vw;
}
.a-btn-sm {
  border: none; background: var(--glass-bg);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  padding: 5px 12px; font-size: .78rem; cursor: pointer;
  font-family: inherit; border-radius: 8px; color: var(--glass-text);
  opacity: .75; text-decoration: none; display: inline-block;
  white-space: nowrap; transition: opacity .15s, box-shadow .15s;
}
.a-btn-sm:hover { opacity: 1; box-shadow: 0 3px 10px rgba(0,0,0,.1); }
.a-btn-sm:disabled { opacity: .4; cursor: not-allowed; }
.a-btn-sm--primary {
  background: var(--glass-text); color: var(--glass-page-bg); opacity: 1; font-weight: 500;
}
.a-btn-sm--primary:hover { opacity: .85; }
.a-btn-save {
  padding: 6px 16px; border-radius: 8px; border: none;
  background: var(--glass-text); color: var(--glass-page-bg);
  font-size: .78rem; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: opacity .15s;
}
.a-btn-save:hover { opacity: .85; }
.a-btn-save:disabled { opacity: .4; cursor: not-allowed; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .admin-mob-burger { display: flex; }
  .admin-search-label, .admin-search-kbd { display: none; }

  .admin-sidebar {
    position: fixed;
    left: -220px;
    top: calc(44px + var(--dp-panel-h, 0px));
    height: calc(100vh - 44px - var(--dp-panel-h, 0px));
    z-index: 100;
    width: 210px;
    border-radius: 0 14px 14px 0;
    box-shadow: 4px 0 24px rgba(0,0,0,.12);
    transition: left .2s cubic-bezier(0.16, 1, 0.3, 1), top .2s, height .2s;
  }
  .admin-sidebar--open { left: 0; }
  .admin-sidebar-logo { display: none; }

  .admin-mob-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.3);
    z-index: 90; backdrop-filter: blur(2px);
  }

  .admin-content { padding: 14px 12px 32px; }
}
</style>
