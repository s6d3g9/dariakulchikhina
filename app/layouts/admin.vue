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

        <!-- Notifications bell -->
        <div ref="notifWrapRef" class="admin-notif-wrap">
          <button
            type="button"
            class="admin-notif-btn"
            :class="notifOpen ? 'admin-notif-btn--open' : ''"
            :title="notifTotal ? `${notifTotal} уведомлений` : 'Уведомления'"
            @click.stop="notifOpen = !notifOpen"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            <span v-if="notifTotal" class="admin-notif-badge">{{ notifTotal > 99 ? '99+' : notifTotal }}</span>
          </button>
          <div v-if="notifOpen" class="admin-notif-dropdown glass-surface" @click.stop>
            <div class="admin-notif-head">уведомления</div>
            <div v-if="!notifTotal" class="admin-notif-empty">Всё в порядке ✓</div>
            <template v-else>
              <NuxtLink
                v-if="notifData?.extra?.count"
                to="/admin"
                class="admin-notif-item admin-notif-item--warn"
                @click="notifOpen = false"
              >
                <span class="admin-notif-item-count">{{ notifData.extra.count }}</span>
                <span class="admin-notif-item-label">{{ notifData.extra.label }}</span>
              </NuxtLink>
              <div
                v-if="notifData?.overdue?.count"
                class="admin-notif-item admin-notif-item--danger"
              >
                <span class="admin-notif-item-count">{{ notifData.overdue.count }}</span>
                <span class="admin-notif-item-label">{{ notifData.overdue.label }}</span>
              </div>
            </template>
            <div class="admin-notif-foot">
              <button class="admin-notif-refresh" @click="refreshNotif">обновить</button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="admin-theme-btn"
          :aria-label="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
          @click="toggleTheme"
        >{{ isDark ? 'светло' : 'темно' }}</button>
        <NuxtLink to="/" class="admin-link">сайт</NuxtLink>
        <a href="#" class="admin-link" @click.prevent="logout">выйти</a>
      </div>
    </header>

    <div class="admin-container">
      <!-- ── Tab bar ── -->
      <div class="admin-tabs">

        <!-- проекты + chip текущего проекта -->
        <div ref="projectsTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isProjectsTab }">
          <NuxtLink to="/admin" class="admin-tab-label admin-tab" :class="{ 'admin-tab--active': isProjectsTab }">проекты</NuxtLink>
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
          <NuxtLink :to="contractorsTabTo" class="admin-tab-label admin-tab" :class="{ 'admin-tab--active': isContractorsTab }">подрядчики</NuxtLink>
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
          <NuxtLink :to="clientsTabTo" class="admin-tab-label admin-tab" :class="{ 'admin-tab--active': isClientsTab }">клиенты</NuxtLink>
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
          <NuxtLink :to="galleryActiveTabTo" class="admin-tab-label admin-tab" :class="{ 'admin-tab--active': isGalleryTab }">галерея</NuxtLink>
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
          <NuxtLink to="/admin/documents" class="admin-tab-label admin-tab" :class="{ 'admin-tab--active': isDocumentsTab }">документы</NuxtLink>
        </div>

        <!-- дизайнеры -->
        <div ref="designersTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isDesignersTab }">
          <NuxtLink :to="designersTabTo" class="admin-tab-label admin-tab" :class="{ 'admin-tab--active': isDesignersTab }">дизайнеры</NuxtLink>
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
          <NuxtLink :to="sellersTabTo" class="admin-tab-label admin-tab" :class="{ 'admin-tab--active': isSellersTab }">поставщики</NuxtLink>
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

// ── Notifications ─────────────────────────────────────────────
const { data: notifData, refresh: refreshNotif } = useFetch<any>('/api/admin/notifications', {
  server: false,
  default: () => ({ total: 0, extra: { count: 0 }, overdue: { count: 0 } }),
})
const notifTotal = computed(() => notifData.value?.total || 0)
// Обновляем каждые 2 минуты
let _notifInterval: ReturnType<typeof setInterval> | null = null

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
const notifOpen       = ref(false)

const projectsTabRef    = ref<HTMLElement | null>(null)
const contractorsTabRef = ref<HTMLElement | null>(null)
const clientsTabRef     = ref<HTMLElement | null>(null)
const galleryTabRef     = ref<HTMLElement | null>(null)
const designersTabRef   = ref<HTMLElement | null>(null)
const sellersTabRef     = ref<HTMLElement | null>(null)
const notifWrapRef      = ref<HTMLElement | null>(null)

function closeAll() {
  projectsOpen.value = contractorsOpen.value = clientsOpen.value =
    galleryOpen.value = designersOpen.value = sellersOpen.value =
    notifOpen.value = false
}

function onDocClick(e: MouseEvent) {
  const refs = [projectsTabRef.value, contractorsTabRef.value, clientsTabRef.value, galleryTabRef.value, designersTabRef.value, sellersTabRef.value, notifWrapRef.value]
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
  _notifInterval = setInterval(refreshNotif, 2 * 60 * 1000)
  useUITheme().initTheme()
  useDesignSystem().initDesignSystem()
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onSearchKeydown)
  if (_notifInterval) clearInterval(_notifInterval)
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
/* ── Admin layout measurements exposed as CSS vars ── */
:root {
  --admin-header-h: 48px;
  --admin-tabs-h:   67px; /* 38px tab + 28px margin-bottom + 1px border */
  --admin-container-mt: 22px;
  --admin-nav-top: calc(var(--admin-header-h) + var(--admin-container-mt) + var(--admin-tabs-h));
}

.admin-header {
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0;
  border-bottom: 1px solid rgba(var(--glass-text-rgb, 0,0,0), 0.08);
  background: transparent;
}
.admin-brand {
  font-size: .72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .40;
  font-weight: 400;
}
.admin-header-links { display: flex; gap: 20px; align-items: center; }
.admin-link {
  font-size: .75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .45;
  text-decoration: none;
  transition: opacity .15s;
}
.admin-link:hover { opacity: 1; }

/* ── Search button: flat hairline ── */
.admin-search-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 0;
  padding: 4px 12px;
  cursor: pointer;
  color: color-mix(in srgb, var(--glass-text) 45%, transparent);
  font-size: .75rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  transition: border-color .15s, color .15s;
  font-family: inherit;
}
.admin-search-btn svg { display: none; }
.admin-search-btn:hover {
  border-color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  color: var(--glass-text);
}
.admin-search-label {
  font-size: .68rem;
  letter-spacing: 0.10em;
}
.admin-search-kbd {
  font-size: .58rem;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 0;
  padding: 1px 5px;
  font-family: inherit;
  color: color-mix(in srgb, var(--glass-text) 35%, transparent);
  background: transparent;
}

/* ── Theme toggle: flat text link ── */
.admin-theme-btn {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 0;
  padding: 4px 12px;
  cursor: pointer;
  color: var(--glass-text);
  opacity: .45;
  font-size: .68rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  font-family: inherit;
  transition: opacity .15s, border-color .15s;
}
.admin-theme-btn:hover { opacity: 1; border-color: var(--glass-text); }

/* ── Notifications ── */
.admin-notif-wrap        { position: relative; }
.admin-notif-btn         { background: none; border: 1px solid transparent; border-radius: 0; color: var(--glass-text); opacity: .45; padding: 5px 8px; cursor: pointer; display: flex; align-items: center; gap: 4px; position: relative; transition: opacity .15s, border-color .15s; }
.admin-notif-btn:hover   { opacity: 1; border-color: color-mix(in srgb, var(--glass-text) 30%, transparent); }
.admin-notif-btn--open   { opacity: 1; border-color: color-mix(in srgb, var(--glass-text) 30%, transparent); background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.admin-notif-badge       { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; background: var(--ds-error); color: var(--glass-page-bg); border-radius: 8px; font-size: .6rem; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
.admin-notif-dropdown    { position: absolute; top: calc(100% + 8px); right: 0; width: 260px; border-radius: 0; padding: 12px; z-index: 500; box-shadow: 0 8px 32px color-mix(in srgb, var(--glass-text) 15%, transparent); border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent); }
.admin-notif-head        { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--glass-text); opacity: .35; margin-bottom: 8px; }
.admin-notif-empty       { font-size: .8rem; color: var(--ds-success); padding: 8px 0; text-align: center; }
.admin-notif-item        { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 0; margin-bottom: 4px; text-decoration: none; }
.admin-notif-item--warn  { background: color-mix(in srgb, var(--ds-warning) 10%, transparent); border: 1px solid color-mix(in srgb, var(--ds-warning) 20%, transparent); }
.admin-notif-item--danger{ background: color-mix(in srgb, var(--ds-error) 8%, transparent); border: 1px solid color-mix(in srgb, var(--ds-error) 18%, transparent); }
.admin-notif-item-count  { font-size: .85rem; font-weight: 700; color: var(--ds-warning); min-width: 24px; }
.admin-notif-item--danger .admin-notif-item-count { color: var(--ds-error); }
.admin-notif-item-label  { font-size: .75rem; color: var(--glass-text); opacity: .65; }
.admin-notif-foot        { display: flex; justify-content: flex-end; margin-top: 8px; border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); padding-top: 8px; }
.admin-notif-refresh     { background: none; border: none; color: var(--glass-text); opacity: .35; font-size: .7rem; cursor: pointer; font-family: inherit; }
.admin-notif-refresh:hover { opacity: .8; }

/* ── Container / tabs ── */
.admin-container { max-width: var(--ds-container-width, 1140px); margin: 22px auto; padding: 0 24px; transition: max-width var(--ds-transition, 180ms ease); }
.admin-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 28px;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

/* ── Generic tab — flat text, underline active ── */
.admin-tab {
  height: 38px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  text-decoration: none;
  color: var(--glass-text);
  font-family: var(--ds-font-family);
  font-size: .75rem;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: .45;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
  background: transparent;
  border-left: none; border-right: none; border-top: none;
  transition: opacity .15s ease, border-bottom-color .15s ease;
}
.admin-tab:hover  { opacity: .80; }
.admin-tab--active { opacity: 1; border-bottom-color: var(--glass-text); font-weight: 400; }

/* ── Chip-tab wrapper ── */
.admin-chip-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 38px;
  gap: 2px;
}
.admin-tab-label { /* NuxtLink inheriting .admin-tab */ }

/* Small square indicator chip ── */
.admin-mini-chip {
  width: 20px; height: 20px;
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 22%, transparent);
  background: transparent;
  color: var(--glass-text);
  font-size: .52rem;
  font-weight: 400;
  letter-spacing: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  opacity: .55;
  transition: opacity .15s ease;
}
.admin-mini-chip--dim {
  background: transparent;
  opacity: .30;
}
.admin-mini-chip:hover { opacity: 1; background: transparent; }

/* ── Dropdown: flat, no radius ── */
.admin-dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  min-width: 220px;
  max-height: 320px;
  overflow: auto;
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  padding: 4px 0;
  z-index: 80;
  background: var(--glass-page-bg);
  box-shadow: 0 8px 32px rgba(0,0,0,.12);
}
.admin-drop-item {
  width: 100%; border: none; background: transparent;
  color: var(--glass-text); border-radius: 0;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; text-align: left; cursor: pointer;
  font-family: var(--ds-font-family); font-size: .72rem;
  letter-spacing: 0.06em;
  transition: background .12s ease;
}
.admin-drop-item:hover { background: color-mix(in srgb, var(--glass-text) 5%, transparent); }
.admin-drop-item--active { background: color-mix(in srgb, var(--glass-text) 8%, transparent); font-weight: 500; }
.admin-drop-item--flex { flex: 1; }
.admin-drop-item-with-actions {
  display: flex; align-items: center; gap: 4px;
}
.admin-drop-action-btn {
  width: 20px; height: 20px; border-radius: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 500; cursor: pointer;
  transition: all .15s ease;
  background: transparent; color: var(--glass-text);
  border: 1px solid color-mix(in srgb, var(--glass-text) 20%, transparent);
  opacity: .5;
}
.admin-drop-action-btn--add:hover {
  background: transparent; color: var(--glass-text); border-color: var(--glass-text); opacity: 1;
}
.admin-drop-action-btn--remove:hover {
  background: transparent; color: var(--glass-text); border-color: var(--glass-text); opacity: 1;
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
  width: 20px; height: 20px; border-radius: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  background: transparent;
  font-size: .52rem; font-weight: 400; flex-shrink: 0;
  letter-spacing: 0;
  opacity: .7;
}
.admin-drop-lbl { font-size: .72rem; letter-spacing: 0.02em; }
.admin-drop-empty { font-size: .68rem; opacity: .35; padding: 8px 16px; }
.admin-drop-all {
  display: block; padding: 8px 16px;
  font-size: .66rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--glass-text); opacity: .40;
  text-decoration: none;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  margin-top: 4px;
  background: none; border-left: none; border-right: none; border-bottom: none;
  cursor: pointer; width: 100%; text-align: left; font-family: inherit;
}
.admin-drop-all:hover { opacity: .90; }

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
