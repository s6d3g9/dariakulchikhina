<template>
  <div class="admin-bg glass-page">
    <UIDesignPanel />
    <header class="admin-header glass-surface">
      <span class="admin-brand">админ-панель</span>
      <div class="admin-header-links">
        <!-- Search trigger -->
        <button
          type="button"
          class="admin-search-btn"
          title="Поиск  Ctrl+K / ⌘K"
          aria-label="Поиск"
          @click="searchOpen = true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span class="admin-search-label">поиск</span>
          <kbd class="admin-search-kbd">Ctrl+K</kbd>
        </button>

        <button
          type="button"
          class="theme-dot"
          :aria-label="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
          @click="toggleTheme"
        ></button>
        <NuxtLink to="/" class="admin-link">сайт</NuxtLink>
        <a href="#" class="admin-link" @click.prevent="logout">выйти</a>
      </div>
    </header>

    <div class="admin-container">
      <!-- ── Tab bar ── -->
      <div class="admin-tabs">

        <!-- проекты + chip текущего проекта -->
        <div ref="projectsTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isProjectsTab }">
          <NuxtLink to="/admin" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isProjectsTab }">проекты</NuxtLink>
          <button
            v-if="activeProjectSlug"
            type="button"
            class="admin-mini-chip"
            :title="currentProjectTitle"
            @click.stop="projectsOpen = !projectsOpen"
          >{{ currentProjectInitials }}</button>
          <button
            v-else
            type="button"
            class="admin-mini-chip admin-mini-chip--dim"
            title="Список проектов"
            @click.stop="projectsOpen = !projectsOpen"
          >…</button>
          <div v-if="projectsOpen" class="admin-dropdown glass-surface" @click.stop>
            <button
              v-for="p in quickProjects" :key="p.slug"
              type="button" class="admin-drop-item"
              :class="{ 'admin-drop-item--active': p.slug === activeProjectSlug }"
              @click="pickProject(p.slug)"
            >
              <span class="admin-drop-ini">{{ projectInitials(p.title) }}</span>
              <span class="admin-drop-lbl">{{ p.title }}</span>
            </button>
            <div v-if="!quickProjects.length" class="admin-drop-empty">нет проектов</div>
          </div>
        </div>

        <!-- подрядчики + chip -->
        <div ref="contractorsTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isContractorsTab }">
          <NuxtLink :to="contractorsTabTo" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isContractorsTab }">подрядчики</NuxtLink>
          <button type="button" class="admin-mini-chip admin-mini-chip--dim" @click.stop="contractorsOpen = !contractorsOpen">…</button>
          <div v-if="contractorsOpen" class="admin-dropdown glass-surface" @click.stop>
            <div
              v-for="ct in quickContractors" :key="ct.id"
              class="admin-drop-item-with-actions"
            >
              <button
                type="button" class="admin-drop-item admin-drop-item--flex"
                @click="pickContractor(ct)"
              >
                <span class="admin-drop-ini">{{ nameInitials(ct.name) }}</span>
                <span class="admin-drop-lbl">{{ ct.name }}</span>
              </button>
              <button
                v-if="activeProjectSlug"
                type="button"
                class="admin-drop-action-btn"
                :class="isContractorLinked(ct.id) ? 'admin-drop-action-btn--remove' : 'admin-drop-action-btn--add'"
                :disabled="clientActionLoading"
                @click.stop="toggleContractorLink(ct.id, ct.name)"
                :title="isContractorLinked(ct.id) ? 'Отвязать от проекта' : 'Привязать к проекту'"
              >{{ isContractorLinked(ct.id) ? '-' : '+' }}</button>
            </div>
            <div class="admin-drop-divider"></div>
            <button type="button" class="admin-drop-all" @click="goToAllContractors">все подрядчики →</button>
            <div v-if="clientActionMessage" class="admin-drop-message">{{ clientActionMessage }}</div>
          </div>
        </div>

        <!-- клиенты + chip -->
        <div ref="clientsTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isClientsTab }">
          <NuxtLink :to="clientsTabTo" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isClientsTab }">клиенты</NuxtLink>
          <button type="button" class="admin-mini-chip admin-mini-chip--dim" @click.stop="clientsOpen = !clientsOpen">…</button>
          <div v-if="clientsOpen" class="admin-dropdown glass-surface" @click.stop>
            <div
              v-for="cl in quickClients" :key="cl.id"
              class="admin-drop-item-with-actions"
            >
              <button
                type="button" class="admin-drop-item admin-drop-item--flex"
                @click="pickClient(cl)"
              >
                <span class="admin-drop-ini">{{ nameInitials(cl.name) }}</span>
                <span class="admin-drop-lbl">{{ cl.name }}</span>
              </button>
              <button
                v-if="activeProjectSlug"
                type="button"
                class="admin-drop-action-btn"
                :class="isClientLinked(cl.id) ? 'admin-drop-action-btn--remove' : 'admin-drop-action-btn--add'"
                :disabled="clientActionLoading"
                @click.stop="toggleClientLink(cl.id, cl.name)"
                :title="isClientLinked(cl.id) ? 'Отвязать от проекта' : 'Привязать к проекту'"
              >{{ isClientLinked(cl.id) ? '-' : '+' }}</button>
            </div>
            <div class="admin-drop-divider"></div>
            <button type="button" class="admin-drop-all" @click="goToAllClients">все клиенты →</button>
            <div v-if="clientActionMessage" class="admin-drop-message">{{ clientActionMessage }}</div>
          </div>
        </div>

        <!-- галерея — одна кнопка с дропдауном категорий -->
        <div ref="galleryTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isGalleryTab }">
          <NuxtLink :to="galleryActiveTabTo" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isGalleryTab }">галерея</NuxtLink>
          <button type="button" class="admin-mini-chip" :class="galleryCurrentChip ? 'admin-mini-chip' : 'admin-mini-chip--dim'" @click.stop="galleryOpen = !galleryOpen">
            {{ galleryCurrentChip || '…' }}
          </button>
          <div v-if="galleryOpen" class="admin-dropdown glass-surface" @click.stop>
            <button
              v-for="g in GALLERY_TABS" :key="g.slug"
              type="button" class="admin-drop-item"
              :class="{ 'admin-drop-item--active': route.path === `/admin/gallery/${g.slug}` }"
              @click="pickGallery(g.slug)"
            >
              <span class="admin-drop-ini">{{ g.icon }}</span>
              <span class="admin-drop-lbl">{{ g.label }}</span>
            </button>
          </div>
        </div>

        <!-- документы -->
        <div class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isDocumentsTab }">
          <NuxtLink to="/admin/documents" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isDocumentsTab }">документы</NuxtLink>
        </div>

        <!-- дизайнеры -->
        <div ref="designersTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isDesignersTab }">
          <NuxtLink :to="designersTabTo" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isDesignersTab }">дизайнеры</NuxtLink>
          <button type="button" class="admin-mini-chip admin-mini-chip--dim" @click.stop="designersOpen = !designersOpen">…</button>
          <div v-if="designersOpen" class="admin-dropdown glass-surface" @click.stop>
            <div
              v-for="d in quickDesigners" :key="d.id"
              class="admin-drop-item-with-actions"
            >
              <button
                type="button" class="admin-drop-item admin-drop-item--flex"
                @click="pickDesigner(d)"
              >
                <span class="admin-drop-ini">{{ nameInitials(d.name) }}</span>
                <span class="admin-drop-lbl">{{ d.name }}</span>
              </button>
              <button
                v-if="activeProjectSlug"
                type="button"
                class="admin-drop-action-btn"
                :class="isDesignerLinked(d.id) ? 'admin-drop-action-btn--remove' : 'admin-drop-action-btn--add'"
                :disabled="clientActionLoading"
                @click.stop="toggleDesignerLink(d.id, d.name)"
                :title="isDesignerLinked(d.id) ? 'Отвязать от проекта' : 'Привязать к проекту'"
              >{{ isDesignerLinked(d.id) ? '-' : '+' }}</button>
            </div>
            <div class="admin-drop-divider"></div>
            <button type="button" class="admin-drop-all" @click="goToAllDesigners">все дизайнеры →</button>
            <div v-if="clientActionMessage" class="admin-drop-message">{{ clientActionMessage }}</div>
          </div>
        </div>

        <!-- поставщики -->
        <div ref="sellersTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isSellersTab }">
          <NuxtLink :to="sellersTabTo" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isSellersTab }">поставщики</NuxtLink>
          <button type="button" class="admin-mini-chip admin-mini-chip--dim" @click.stop="sellersOpen = !sellersOpen">…</button>
          <div v-if="sellersOpen" class="admin-dropdown glass-surface" @click.stop>
            <div
              v-for="s in quickSellers" :key="s.id"
              class="admin-drop-item-with-actions"
            >
              <button
                type="button" class="admin-drop-item admin-drop-item--flex"
                @click="pickSeller(s)"
              >
                <span class="admin-drop-ini">{{ nameInitials(s.name) }}</span>
                <span class="admin-drop-lbl">{{ s.name }}</span>
              </button>
              <button
                v-if="activeProjectSlug"
                type="button"
                class="admin-drop-action-btn"
                :class="isSellerLinked(s.id) ? 'admin-drop-action-btn--remove' : 'admin-drop-action-btn--add'"
                :disabled="clientActionLoading"
                @click.stop="toggleSellerLink(s.id, s.name)"
                :title="isSellerLinked(s.id) ? 'Отвязать от проекта' : 'Привязать к проекту'"
              >{{ isSellerLinked(s.id) ? '-' : '+' }}</button>
            </div>
            <div class="admin-drop-divider"></div>
            <button type="button" class="admin-drop-all" @click="goToAllSellers">все поставщики →</button>
            <div v-if="clientActionMessage" class="admin-drop-message">{{ clientActionMessage }}</div>
          </div>
        </div>


      </div><!-- /.admin-tabs -->

      <slot />
    </div>

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
const isSellersTab     = computed(() => route.path.startsWith('/admin/sellers'))

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
const projectsOpen    = ref(false)
const contractorsOpen = ref(false)
const clientsOpen     = ref(false)
const galleryOpen     = ref(false)
const designersOpen   = ref(false)
const sellersOpen     = ref(false)

const projectsTabRef    = ref<HTMLElement | null>(null)
const contractorsTabRef = ref<HTMLElement | null>(null)
const clientsTabRef     = ref<HTMLElement | null>(null)
const galleryTabRef     = ref<HTMLElement | null>(null)
const designersTabRef   = ref<HTMLElement | null>(null)
const sellersTabRef     = ref<HTMLElement | null>(null)

function closeAll() {
  projectsOpen.value = contractorsOpen.value = clientsOpen.value = galleryOpen.value = designersOpen.value = sellersOpen.value = false
}

function onDocClick(e: MouseEvent) {
  const refs = [projectsTabRef.value, contractorsTabRef.value, clientsTabRef.value, galleryTabRef.value, designersTabRef.value, sellersTabRef.value]
  if (refs.every(r => !r || !r.contains(e.target as Node))) closeAll()
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
  padding-top: calc(28px + var(--dp-panel-h, 0px));
  transition: padding-top .2s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--ds-font-family);
  font-size: var(--ds-font-size);
  font-weight: var(--ds-font-weight);
  line-height: var(--ds-line-height);
}

/* ── Header ── */
.admin-header {
  padding: 13px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 var(--card-radius) var(--card-radius);
}
.admin-brand {
  font-size: .68rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .45;
}
.admin-header-links { display: flex; gap: 14px; align-items: center; }
.admin-link {
  font-size: .78rem;
  color: var(--glass-text);
  opacity: .5;
  text-decoration: none;
}
.admin-link:hover { opacity: 1; }

/* ── Search button ── */
.admin-search-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 8px;
  padding: 4px 10px 4px 8px;
  cursor: pointer;
  color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  font-size: .72rem;
  transition: background .14s, border-color .14s, color .14s;
  font-family: inherit;
}
.admin-search-btn:hover {
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-color: color-mix(in srgb, var(--glass-text) 18%, transparent);
  color: var(--glass-text);
}
.admin-search-label {
  font-size: .7rem;
}
.admin-search-kbd {
  font-size: .58rem;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: inherit;
  color: color-mix(in srgb, var(--glass-text) 38%, transparent);
}

.theme-dot {
  width: 18px; height: 18px;
  border-radius: 999px;
  border: none;
  background: color-mix(in srgb, var(--glass-bg) 80%, transparent);
  box-shadow: inset 0 0 0 1px var(--glass-border);
  cursor: pointer;
  padding: 0;
}

/* ── Container / tabs ── */
.admin-container { max-width: var(--ds-container-width, 1140px); margin: 22px auto; padding: 0 16px; transition: max-width var(--ds-transition, 180ms ease); }
.admin-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

/* ── Generic tab pill ── */
.admin-tab {
  height: 32px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  text-decoration: none;
  color: var(--glass-text);
  font-family: var(--ds-font-family);
  font-size: var(--ds-text-sm, .78rem);
  line-height: 1;
  letter-spacing: var(--ds-letter-spacing);
  opacity: .62;
  border-radius: 999px;
  white-space: nowrap;
  transition: opacity var(--ds-transition, 150ms ease), background var(--ds-transition, 150ms ease);
}
.admin-tab:hover  { opacity: .9; }
.admin-tab--active { opacity: 1; font-weight: 600; }

/* ── Chip-tab wrapper (label + mini chip) ── */
.admin-chip-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 32px;
  gap: 4px;
}
.admin-tab-label { /* NuxtLink inheriting .admin-tab */ }

/* Small circle chip — matches tab height */
.admin-mini-chip {
  width: 24px; height: 24px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--glass-text);
  font-size: .6rem;
  font-weight: var(--ds-heading-weight, 700);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: opacity var(--ds-transition, 150ms ease), background var(--ds-transition, 150ms ease);
}
.admin-mini-chip--dim {
  background: transparent;
  opacity: .38;
}
.admin-mini-chip:hover { opacity: 1; background: var(--glass-bg); }

/* ── Dropdown ── */
.admin-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 240px;
  max-height: 320px;
  overflow: auto;
  border-radius: var(--card-radius, 12px);
  border: 1px solid var(--glass-border);
  padding: 6px;
  z-index: 80;
  box-shadow: var(--ds-shadow-lg, 0 8px 32px rgba(0,0,0,.10));
  transition: box-shadow var(--ds-transition, 180ms ease);
}
.admin-drop-item {
  width: 100%; border: none; background: transparent;
  color: var(--glass-text); border-radius: calc(var(--card-radius, 12px) * 0.65);
  display: flex; align-items: center; gap: 8px;
  padding: 8px; text-align: left; cursor: pointer;
  font-family: var(--ds-font-family); font-size: var(--ds-text-sm, .76rem);
  transition: background var(--ds-transition, 150ms ease);
}
.admin-drop-item:hover { background: color-mix(in srgb, var(--glass-bg) 85%, transparent); }
.admin-drop-item--active { background: color-mix(in srgb, var(--glass-bg) 94%, transparent); font-weight: 600; }
.admin-drop-item--flex { flex: 1; }
.admin-drop-item-with-actions {
  display: flex; align-items: center; gap: 4px;
}
.admin-drop-action-btn {
  width: 24px; height: 24px; border: none; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all var(--ds-transition, 150ms ease);
  background: var(--glass-bg); color: var(--glass-text);
  border: 1px solid var(--glass-border);
}
.admin-drop-action-btn--add:hover {
  background: var(--ds-success, #10b981); color: white; border-color: color-mix(in srgb, var(--ds-success, #10b981) 80%, #000);
}
.admin-drop-action-btn--remove:hover {
  background: var(--ds-error, #ef4444); color: white; border-color: color-mix(in srgb, var(--ds-error, #ef4444) 80%, #000);
}
.admin-drop-action-btn:disabled {
  opacity: 0.4; cursor: not-allowed;
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
  width: 22px; height: 22px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-size: .58rem; font-weight: 700; flex-shrink: 0;
}
.admin-drop-lbl { font-size: .76rem; }
.admin-drop-empty { font-size: .74rem; opacity: .4; padding: 8px; }
.admin-drop-all {
  display: block; padding: 8px 10px;
  font-size: .72rem; color: var(--glass-text); opacity: .5;
  text-decoration: none; border-top: 1px solid var(--glass-border); margin-top: 4px;
}
.admin-drop-all:hover { opacity: 1; }

/* ══════════════════════════════════════════════════════════════
   MOBILE RESPONSIVE — admin layout
   ══════════════════════════════════════════════════════════════ */

/* ── Tablet ── */
@media (max-width: 1024px) {
  .admin-container {
    padding: 0 12px;
    margin: 18px auto;
  }
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .admin-bg {
    padding-top: calc(20px + var(--dp-panel-h, 0px));
  }

  .admin-header {
    padding: 10px 12px;
    border-radius: 0;
  }
  .admin-brand {
    font-size: .58rem;
    letter-spacing: 1.2px;
  }
  .admin-header-links {
    gap: 8px;
  }
  .admin-link {
    font-size: .7rem;
  }
  .admin-search-label,
  .admin-search-kbd {
    display: none;
  }
  .admin-search-btn {
    padding: 5px 7px;
    border-radius: 7px;
  }

  .admin-container {
    padding: 0 10px;
    margin: 10px auto;
  }

  /* Tabs — horizontal scroll strip */
  .admin-tabs {
    gap: 4px;
    margin-bottom: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex-wrap: nowrap;
    padding-bottom: 2px;
  }
  .admin-tabs::-webkit-scrollbar { display: none; }

  .admin-tab {
    height: 30px;
    padding: 0 10px;
    font-size: .72rem;
    flex-shrink: 0;
  }

  .admin-chip-tab {
    height: 30px;
    flex-shrink: 0;
  }

  .admin-mini-chip {
    width: 22px;
    height: 22px;
    font-size: .52rem;
  }

  /* Dropdowns — full-width overlay on mobile */
  .admin-dropdown {
    position: fixed;
    top: auto;
    left: 8px;
    right: 8px;
    bottom: 8px;
    min-width: 0;
    max-width: none;
    max-height: 50vh;
    border-radius: 16px;
    box-shadow: 0 -4px 40px rgba(0,0,0,.18);
    z-index: 200;
  }

  .admin-drop-item {
    padding: 10px 10px;
    font-size: .8rem;
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
  .admin-header {
    padding: 8px 10px;
  }
  .admin-container {
    padding: 0 8px;
  }
  .admin-tab {
    height: 28px;
    padding: 0 8px;
    font-size: .68rem;
  }
  .admin-chip-tab {
    height: 28px;
  }
  .admin-mini-chip {
    width: 20px;
    height: 20px;
    font-size: .48rem;
  }
}


</style>
