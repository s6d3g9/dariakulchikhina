<template>
  <div class="admin-bg glass-page">
    <UIDesignPanel />

    <!-- ── Minimal utility bar ── -->
    <div class="adm-util-bar">
      <button class="adm-util-btn" @click="searchOpen = true" title="Ctrl+K">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
      <button class="adm-util-btn" @click="toggleTheme" :title="isDark ? 'светлая тема' : 'тёмная тема'">{{ isDark ? '○' : '●' }}</button>
      <span v-if="notifTotal" class="adm-util-notif">{{ notifTotal }}</span>
      <button class="adm-util-btn adm-util-btn--exit" @click.prevent="logout">выйти</button>
    </div>

    <div class="admin-container">
      <div class="adm-layout">
        <!-- ── Persistent sidebar panel (single DOM element across all pages) ── -->
        <nav class="ent-sidebar std-sidenav" id="admin-sidebar-host">
          <div id="admin-sidebar-portal"></div>
        </nav>

        <!-- ── Main content  ── -->
        <div class="adm-main">
          <slot />
        </div>
      </div>
    </div>

    <!-- ── Global search palette ── -->
    <AdminSearch :open="searchOpen" @close="searchOpen = false" />
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route  = useRoute()
const { isDark, toggleTheme } = useThemeToggle()

// ── Notifications ─────────────────────────────────────────────
const notifOpen = ref(false)
const { data: notifData, refresh: refreshNotif } = useFetch<any>('/api/admin/notifications', {
  server: false,
  default: () => ({ total: 0, extra: { count: 0 }, overdue: { count: 0 } }),
})
const notifTotal = computed(() => notifData.value?.total || 0)
setInterval(refreshNotif, 2 * 60 * 1000)

// ── Hamburger menu ────────────────────────────────────────────
const menuOpen      = ref(false)
const menuRef       = ref<HTMLElement | null>(null)
const menuPanelRef  = ref<HTMLElement | null>(null)
// Close notif when menu closes
watch(menuOpen, v => { if (!v) notifOpen.value = false })

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
  { slug: 'interiors',  label: 'интерьеры',    icon: 'ин' },
  { slug: 'furniture',  label: 'мебель',        icon: 'мб' },
  { slug: 'materials',  label: 'материалы',     icon: 'мт' },
  { slug: 'art',        label: 'арт-объекты',   icon: 'ар' },
  { slug: 'moodboards', label: 'мудборды',      icon: 'мд' },
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
const isSellersTab     = computed(() => route.path.startsWith('/admin/sellers'))
const isSettingsTab    = computed(() => route.path.startsWith('/admin/settings'))

const contractorsTabTo    = computed(() => withCtx('/admin/contractors'))
const clientsTabTo        = computed(() => withCtx('/admin/clients'))
const designersTabTo      = computed(() => withCtx('/admin/designers'))
const sellersTabTo        = computed(() => withCtx('/admin/sellers'))
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

// ── Sellers data ────────────────────────────────────────────────
const { data: sellersData } = useFetch<any[]>('/api/sellers', { server: false, default: () => [] })
const quickSellers = computed(() => (sellersData.value || []).slice(0, 12))
const { data: linkedSellersData, refresh: refreshLinkedSellers } = await useFetch<any[]>(
  () => activeProjectSlug.value ? `/api/projects/${activeProjectSlug.value}/sellers` : null,
  { watch: [activeProjectSlug], server: false, default: () => [] },
)

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

const linkedSellerIds = computed(() => {
  return new Set((linkedSellersData.value || []).map((s: any) => String(s.id)))
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

function isSellerLinked(sellerId: string): boolean {
  return linkedSellerIds.value.has(String(sellerId))
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

async function toggleSellerLink(sellerId: string, sellerName: string) {
  if (!activeProjectSlug.value) {
    clientActionMessage.value = 'Нет активного проекта'
    return
  }

  clientActionLoading.value = true
  clientActionMessage.value = ''

  const isLinked = isSellerLinked(sellerId)

  try {
    if (isLinked) {
      await $fetch(`/api/projects/${activeProjectSlug.value}/sellers`, {
        method: 'DELETE',
        body: { sellerId: Number(sellerId) },
      })
      clientActionMessage.value = `Поставщик "${sellerName}" отвязан от проекта`
    } else {
      await $fetch(`/api/projects/${activeProjectSlug.value}/sellers`, {
        method: 'POST',
        body: { sellerId: Number(sellerId) },
      })
      clientActionMessage.value = `Поставщик "${sellerName}" привязан к проекту`
    }

    await refreshLinkedSellers()

    setTimeout(() => {
      clientActionMessage.value = ''
    }, 2000)
  } catch (error: any) {
    clientActionMessage.value = error?.data?.message || 'Ошибка при изменении связи поставщика'
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
const projectsOpen  = ref(false)
const subjectsOpen  = ref(false)

const isSubjectsSection = computed(() =>
  isContractorsTab.value || isClientsTab.value || isGalleryTab.value ||
  isDocumentsTab.value   || isDesignersTab.value || isSellersTab.value || isSettingsTab.value
)
// Auto-open субъекты when on a subjects page
watch(isSubjectsSection, (v) => { if (v) subjectsOpen.value = true }, { immediate: true })

function closeAll() {
  projectsOpen.value = subjectsOpen.value = false
}

function onDocClick(e: MouseEvent) {
  // Close hamburger menu if click outside
  const t = e.target as Node
  if (
    menuOpen.value &&
    menuRef.value && !menuRef.value.contains(t) &&
    menuPanelRef.value && !menuPanelRef.value.contains(t)
  ) {
    menuOpen.value = false
  }
}

// ── Global search ─────────────────────────────────────────────
const searchOpen = ref(false)

function onSearchKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchOpen.value = !searchOpen.value
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onSearchKeydown)
  useUITheme().initTheme()
  useDesignSystem().initDesignSystem()
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onSearchKeydown)
})
watch(() => route.fullPath, () => { closeAll(); menuOpen.value = false })

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
function pickSeller(seller: any) {
  closeAll()
  navigateTo(`/admin/sellers?sellerId=${seller.id}`)
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
function goToAllSellers() {
  closeAll()
  if (isSellersTab.value) {
    entityDeselectSignal.value++
  } else {
    navigateTo(sellersTabTo.value)
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
  padding-top: calc(var(--dp-panel-h, 0px));
  transition: padding-top .2s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--ds-font-family);
  font-size: var(--ds-font-size);
  font-weight: var(--ds-font-weight);
  line-height: var(--ds-line-height);
}

/* ── Utility bar (top-right) ── */
.adm-util-bar {
  position: fixed;
  top: 16px;
  right: 20px;
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: 2px;
}
.adm-util-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--glass-text);
  font-family: var(--ds-font-family);
  font-size: .62rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  opacity: .3;
  padding: 5px 8px;
  transition: opacity .15s;
  display: flex;
  align-items: center;
}
.adm-util-btn:hover { opacity: .75; }
.adm-util-btn--exit { opacity: .2; }
.adm-util-btn--exit:hover { opacity: .6; }
.adm-util-notif {
  font-size: .58rem;
  font-weight: 700;
  color: #e57373;
  padding: 2px 5px;
  opacity: .8;
  letter-spacing: 0;
}

/* ── Container ── */
.admin-container { max-width: var(--ds-container-width, 1140px); margin: 0 auto; padding: 56px 24px 0; transition: max-width var(--ds-transition, 180ms ease); }

/* ── Unified layout: persistent sidebar + content ── */
.adm-layout {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}
.adm-main {
  flex: 1;
  min-width: 0;
  animation: adm-main-appear .22s cubic-bezier(.4,0,.2,1) both;
}
@keyframes adm-main-appear {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}

/* Portal: content fills the sidebar panel */
#admin-sidebar-portal {
  display: contents;
}
.admin-drop-add {
  width: 100%; border: none; background: transparent;
  color: var(--glass-text); border-radius: calc(var(--card-radius, 12px) * 0.65);
  display: flex; align-items: center; gap: 8px;
  padding: 8px; text-align: left; cursor: pointer;
  font-family: var(--ds-font-family); font-size: var(--ds-text-sm, .76rem);
  transition: background var(--ds-transition, 150ms ease);
  border: 1px dashed var(--glass-border); margin: 4px 0;
}
.admin-drop-add:hover { background: color-mix(in srgb, var(--glass-bg) 85%, transparent); }
.admin-drop-divider {
  height: 1px; background: var(--glass-border); margin: 6px 0;
}
.admin-drop-message {
  font-size: .72rem; padding: 6px 8px; color: var(--glass-text); 
  opacity: .7; text-align: center; border-radius: 4px;
  background: color-mix(in srgb, var(--glass-bg) 50%, transparent);
}

/* ── Modal ─────────────────────────────────────────────── */
.a-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
}
.a-modal {
  background: var(--glass-bg);
  border: none;
  box-shadow: 0 24px 60px rgba(0,0,0,.18);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
  border-radius: 18px;
  padding: 28px 30px;
  width: 420px;
  max-width: 90vw;
}
.a-btn-sm {
  border: none;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  padding: 5px 12px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 8px;
  color: var(--glass-text);
  opacity: .75;
  text-decoration: none;
  display: inline-block;
  white-space: nowrap;
  transition: opacity .15s, box-shadow .15s;
}
.a-btn-sm:hover {
  opacity: 1;
  box-shadow: 0 3px 10px rgba(0,0,0,.1);
}
.a-btn-sm:disabled {
  opacity: .4; cursor: not-allowed;
}
.a-btn-sm--primary {
  background: var(--glass-text);
  color: var(--glass-page-bg);
  opacity: 1;
  font-weight: 500;
}
.a-btn-sm--primary:hover {
  opacity: .85;
}
.a-btn-sm--primary:disabled {
  opacity: .4;
}
.admin-drop-ini {
  width: 20px; height: 20px; border-radius: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  background: transparent;
  font-size: .52rem; font-weight: 400; flex-shrink: 0;
  letter-spacing: 0;
  opacity: .7;
}

/* ══════════════════════════════════════════════════════════════
   MOBILE RESPONSIVE — admin layout
   ══════════════════════════════════════════════════════════════ */

/* ── Tablet ── */
@media (max-width: 1024px) {
  .admin-container {
    padding: 48px 12px 0;
    margin: 0 auto;
  }
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .admin-bg {
    padding-top: var(--dp-panel-h, 0px);
  }

  .adm-util-bar {
    top: 10px;
    right: 10px;
    gap: 0;
  }
  .adm-util-btn { padding: 4px 6px; font-size: .58rem; }
  .admin-container {
    padding: 44px 10px 0;
    margin: 0 auto;
  }
  .adm-layout {
    flex-direction: column;
  }

  /* Modal — full width on mobile */
  .a-modal {
    width: 100%;
    max-width: calc(100vw - 20px);
    max-height: 85vh;
    padding: 20px 16px;
    border-radius: 16px;
    overflow-y: auto;
  }
}

/* ── Small phones ── */
@media (max-width: 400px) {
  .admin-container {
    padding: 40px 8px 0;
  }
}


</style>
