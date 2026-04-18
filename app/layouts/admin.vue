<template>
  <div
    class="admin-bg glass-page"
    :class="{ 'admin-bg--brutalist': isBrutalistShell, 'admin-bg--glass': isLiquidGlassShell }"
    :style="sidebarLayoutStyle"
  >
    <UIDesignPanel v-if="adminLayoutModules.designPanel" />
    <header v-if="adminLayoutModules.header && !isBrutalistShell" class="admin-header glass-surface">
      <span class="admin-brand">админ-панель</span>
      <div class="admin-header-links">
        <div ref="utilBarRef" class="adm-util-wrap">
          <button
            type="button"
            class="adm-hamburger"
            :class="{ 'adm-hamburger--open': utilBarOpen }"
            aria-label="Открыть панель"
            @click.stop="utilBarOpen = !utilBarOpen"
          >
            <span /><span /><span />
          </button>
          <div v-if="utilBarOpen" class="adm-util-panel glass-surface" @click.stop>
            <!-- Edit mode -->
            <button type="button" class="adm-edit-btn" :class="{ 'adm-edit-btn--on': editMode }" @click="toggleEditMode">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {{ editMode ? 'редактирование вкл' : 'редактировать' }}
            </button>
            <p v-if="editMode" class="adm-edit-hint">Карточки и блоки доступны для редактирования</p>
            <!-- Search -->
            <button
              v-if="adminLayoutModules.search"
              type="button"
              class="admin-search-btn admin-search-btn--sidebar"
              title="Поиск Ctrl+K / ⌘K"
              aria-label="Поиск"
              @click="searchOpen = true; utilBarOpen = false"
            >
              <span class="admin-search-label">поиск</span>
              <kbd class="admin-search-kbd">Ctrl+K</kbd>
            </button>
            <!-- Notifications -->
            <div v-if="adminLayoutModules.notifications" ref="notifWrapRef" class="admin-notif-wrap admin-notif-wrap--sidebar">
              <button
                type="button"
                class="admin-notif-btn admin-notif-btn--sidebar"
                :class="notifOpen ? 'admin-notif-btn--open' : ''"
                :title="notifTotal ? `${notifTotal} уведомлений` : 'Уведомления'"
                @click.stop="notifOpen = !notifOpen"
              >
                <span>уведомления</span>
                <span v-if="notifTotal" class="admin-notif-inline-count">{{ notifTotal > 99 ? '99+' : notifTotal }}</span>
              </button>
              <div v-if="notifOpen" class="admin-notif-dropdown admin-notif-dropdown--sidebar glass-surface" @click.stop>
                <div class="admin-notif-head">уведомления</div>
                <div v-if="!notifTotal" class="admin-notif-empty">Всё в порядке ✓</div>
                <template v-else>
                  <NuxtLink
                    v-if="notifData?.extra?.count"
                    to="/admin"
                    class="admin-notif-item admin-notif-item--warn"
                    @click="notifOpen = false; utilBarOpen = false"
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
                  <button class="admin-notif-refresh" @click="refreshNotif()">обновить</button>
                </div>
              </div>
            </div>
            <!-- Theme -->
            <button
              v-if="adminLayoutModules.themeSwitch"
              type="button"
              class="admin-theme-btn admin-theme-btn--sidebar"
              :aria-label="themeToggleAriaLabel"
              @click="toggleTheme"
            >{{ themeToggleLabel }}</button>
            <!-- Site / Logout -->
            <div class="admin-sidebar-links">
              <NuxtLink v-if="adminLayoutModules.siteLink" to="/" class="admin-link admin-link--sidebar" @click="utilBarOpen = false">сайт</NuxtLink>
              <a v-if="adminLayoutModules.logoutLink" href="#" class="admin-link admin-link--sidebar" @click.prevent="utilBarOpen = false; logout()">выйти</a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- ── App shell body ── -->
    <div class="adm-body">
      <!-- Global navigation sidebar — persists across all admin routes -->
      <aside
        ref="sidebarRef"
        class="proj-nav-col adm-sidebar"
        :class="{
          'adm-sidebar--collapsed': isSidebarCollapsed,
          'adm-sidebar--mobile-hidden': isMobileShell && mobileShellView === 'content',
        }"
        aria-label="Навигация админки"
        :aria-hidden="isMobileShell && mobileShellView === 'content' ? 'true' : 'false'"
        tabindex="-1"
      >
        <div class="adm-sidebar-inner" :class="{ 'adm-sidebar-inner--collapsed': isSidebarCollapsed }">
          <div v-if="isMobileShell" class="adm-mobile-shell adm-mobile-shell--sidebar">
            <div class="adm-mobile-shell__copy">
              <p class="adm-mobile-shell__eyebrow">Навигация</p>
              <strong class="adm-mobile-shell__label">Меню админки</strong>
            </div>
            <button type="button" class="adm-mobile-shell__btn" @click="openMobileContent">к экрану</button>
          </div>
          <div class="adm-sidebar-toolbar">
            <button
              v-if="canAutoCollapseSidebar"
              type="button"
              class="adm-sidebar-toggle"
              :aria-expanded="!isSidebarCollapsed"
              :aria-label="isSidebarCollapsed ? 'Раскрыть меню' : 'Свернуть меню'"
              @click="toggleSidebarCollapsed"
            >
              <span class="adm-sidebar-toggle-glyph" aria-hidden="true">{{ isSidebarCollapsed ? '›' : '‹' }}</span>
              <span v-if="!isSidebarCollapsed" class="adm-sidebar-toggle-label">
                {{ isSidebarCollapsed ? 'раскрыть' : 'свернуть' }}
              </span>
            </button>
          </div>
          <div
            v-if="adminLayoutModules.sidebarMenu && isBrutalistShell"
            ref="adminMenuRef"
            class="admin-sidebar-menu-wrap"
            :class="{ 'admin-sidebar-menu-wrap--collapsed': isSidebarCollapsed }"
          >
            <button
              type="button"
              class="admin-sidebar-menu-btn"
              :class="{
                'admin-sidebar-menu-btn--open': adminShellMenuOpen,
                'admin-sidebar-menu-btn--collapsed': isSidebarCollapsed,
              }"
              aria-label="Открыть меню админ-панели"
              :aria-expanded="adminShellMenuOpen ? 'true' : 'false'"
              @click.stop="adminShellMenuOpen = !adminShellMenuOpen"
            >
              <span class="admin-shell-menu-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span v-if="!isSidebarCollapsed" class="admin-sidebar-menu-label">меню админки</span>
            </button>

            <div v-if="adminShellMenuOpen && !isSidebarCollapsed" class="admin-sidebar-menu-panel" @click.stop>
              <div class="admin-sidebar-brand">админ-панель</div>
              <button
                v-if="adminLayoutModules.search"
                type="button"
                class="admin-search-btn admin-search-btn--sidebar"
                title="Поиск  Ctrl+K / ⌘K"
                aria-label="Поиск"
                @click="searchOpen = true; adminShellMenuOpen = false"
              >
                <span class="admin-search-label">поиск</span>
                <kbd class="admin-search-kbd">Ctrl+K</kbd>
              </button>

              <div v-if="adminLayoutModules.notifications" ref="notifWrapRef" class="admin-notif-wrap admin-notif-wrap--sidebar">
                <button
                  type="button"
                  class="admin-notif-btn admin-notif-btn--sidebar"
                  :class="notifOpen ? 'admin-notif-btn--open' : ''"
                  :title="notifTotal ? `${notifTotal} уведомлений` : 'Уведомления'"
                  @click.stop="notifOpen = !notifOpen"
                >
                  <span>уведомления</span>
                  <span v-if="notifTotal" class="admin-notif-inline-count">{{ notifTotal > 99 ? '99+' : notifTotal }}</span>
                </button>
                <div v-if="notifOpen" class="admin-notif-dropdown admin-notif-dropdown--sidebar glass-surface" @click.stop>
                  <div class="admin-notif-head">уведомления</div>
                  <div v-if="!notifTotal" class="admin-notif-empty">[ всё в порядке ]</div>
                  <template v-else>
                    <NuxtLink
                      v-if="notifData?.extra?.count"
                      to="/admin"
                      class="admin-notif-item admin-notif-item--warn"
                      @click="notifOpen = false; adminShellMenuOpen = false"
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
                    <button class="admin-notif-refresh" @click="refreshNotif()">обновить</button>
                  </div>
                </div>
              </div>

              <button
                v-if="adminLayoutModules.themeSwitch"
                type="button"
                class="admin-theme-btn admin-theme-btn--sidebar"
                :aria-label="themeToggleAriaLabel"
                @click="toggleTheme"
              >{{ themeToggleLabel }}</button>

              <div class="admin-sidebar-links">
                <NuxtLink v-if="adminLayoutModules.siteLink" to="/" class="admin-link admin-link--sidebar" @click="adminShellMenuOpen = false">сайт</NuxtLink>
                <a v-if="adminLayoutModules.logoutLink" href="#" class="admin-link admin-link--sidebar" @click.prevent="adminShellMenuOpen = false; logout()">выйти</a>
              </div>
            </div>
          </div>

          <ClientOnly>
            <AdminNestedNav
              v-if="adminLayoutModules.nestedNav"
              :node="adminNav.currentNode.value"
              :direction="adminNav.slideDir.value"
              :can-go-back="adminNav.canGoBack.value"
              :active-id="adminNav.activeLeafId.value"
              :collapsed="isSidebarCollapsed"
              @drill="adminNav.drill"
              @back="adminNav.back"
              @select="adminNav.select"
            />
            <template #fallback>
              <div v-if="adminLayoutModules.nestedNav" class="nav-shell" aria-hidden="true" />
            </template>
          </ClientOnly>
        </div>
      </aside>
      <main
        ref="mainRef"
        class="adm-main admin-with-nav"
        :class="{ 'adm-main--mobile-hidden': isMobileShell && mobileShellView === 'sidebar' }"
        aria-label="Рабочая область админки"
        :aria-hidden="isMobileShell && mobileShellView === 'sidebar' ? 'true' : 'false'"
        tabindex="-1"
      >
        <div class="admin-container">
          <div v-if="isMobileShell" ref="mobileContentShellRef" class="adm-mobile-shell adm-mobile-shell--content">
            <button type="button" class="adm-mobile-shell__btn" @click="openMobileSidebar">разделы</button>
            <div class="adm-mobile-shell__copy adm-mobile-shell__copy--content">
              <p class="adm-mobile-shell__eyebrow">Активный экран</p>
              <strong class="adm-mobile-shell__label">{{ mobileContentLabel }}</strong>
            </div>
          </div>
          <slot />
        </div>
      </main>
      <button
        v-if="showMobileContentQuickSwitch"
        type="button"
        class="adm-mobile-shell-fab"
        aria-label="Открыть разделы"
        @click="openMobileSidebar"
      >
        разделы
      </button>
    </div>

    <!-- ── Global search palette ── -->
    <AdminSearch v-if="adminLayoutModules.search" :open="searchOpen" @close="searchOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ADMIN_SECTION_ROUTES } from '~~/shared/constants/admin-navigation'

const router = useRouter()
const route  = useRoute()
const { themeToggleAriaLabel, themeToggleLabel, toggleTheme } = useThemeToggle()
const designSystem = useDesignSystem()
const { adminLayout, restoreModules } = useDesignModules()
const blueprintRuntime = useAppBlueprintRuntime()
useElementVisibility()
const adminLayoutModules = computed(() => adminLayout.value)

const isBrutalistShell = computed(() => designSystem.currentDesignMode.value === 'brutalist')

const isLiquidGlassShell = computed(() => designSystem.currentDesignMode.value === 'liquid-glass')
const sidebarRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const mobileContentShellRef = ref<HTMLElement | null>(null)
const isSidebarCollapsed = ref(false)
const isDesktopSidebar = ref(false)
const mobileShellView = ref<'sidebar' | 'content'>('sidebar')
const mobileContentScrollState = reactive({
  route: '',
  y: 0,
})
let mobileShellScrollFrame = 0
let mobileShellQuickSwitchFrame = 0
const showMobileContentQuickSwitch = ref(false)
const utilBarOpen = ref(false)
const utilBarRef = ref<HTMLElement | null>(null)
const { editMode, toggleEditMode } = useEditMode()

const canAutoCollapseSidebar = computed(() =>
  isDesktopSidebar.value && adminLayoutModules.value.nestedNav)

const sidebarLayoutStyle = computed(() => {
  if (!isDesktopSidebar.value) {
    return {
      '--adm-sidebar-current-width': '100%',
      '--adm-sidebar-offset': '0px',
    }
  }

  return {
    '--adm-sidebar-current-width': isSidebarCollapsed.value ? '78px' : '248px',
    '--adm-sidebar-offset': isSidebarCollapsed.value ? '102px' : '272px',
  }
})

function toggleSidebarCollapsed() {
  if (!canAutoCollapseSidebar.value) return
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
function syncDesktopSidebarState() {
  isDesktopSidebar.value = window.innerWidth > 768
  if (!isDesktopSidebar.value) isSidebarCollapsed.value = false
}


function shouldResetDesignPanelFromQuery(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(item => shouldResetDesignPanelFromQuery(item))
  }

  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'reset'
}

onMounted(() => {
  if (!shouldResetDesignPanelFromQuery(route.query.resetDesignPanel)) {
    return
  }

  void (async () => {
    await restoreModules()

    const nextQuery = { ...route.query }
    delete nextQuery.resetDesignPanel

    await router.replace({ query: nextQuery })
  })()
})

// ── Global nav ──────────────────────────────────────────
const adminNav = useAdminNav()
const isMobileShell = computed(() => !isDesktopSidebar.value)
const hasMobileContentPriority = computed(() => {
  const spec = adminNav.contentSpec.value

  return Boolean(
    route.path.startsWith('/admin/projects/')
    || adminNav.activeLeafId.value
    || spec.projectSection
    || spec.clientId
    || spec.clientSection
    || spec.contractorId
    || spec.contractorSection
    || spec.designerId
    || spec.designerSection
    || spec.sellerId
    || spec.sellerSection
    || spec.managerId
    || spec.managerSection
    || spec.documentCategory
    || spec.galleryCategory
  )
})

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

if (activeProjectSlug.value) {
  adminNav.ensureProject(activeProjectSlug.value, activeProjectSlug.value)
}

// Current project info for linking/unlinking
const projectDataAsyncKey = computed(() => `admin-layout-project-data:${activeProjectSlug.value || 'none'}`)
const { data: projectData, refresh: refreshProjectData } = ((useAsyncData as any)(
  projectDataAsyncKey,
  () => activeProjectSlug.value ? $fetch(`/api/projects/${activeProjectSlug.value}`) : Promise.resolve(null),
  { watch: [activeProjectSlug], default: () => null, server: false },
)) as { data: Ref<any>, refresh: () => Promise<void> }

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

const isProjectsTab    = computed(() => route.path === ADMIN_SECTION_ROUTES.projects || route.path.startsWith('/admin/projects'))
const isContractorsTab = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.contractors))
const isClientsTab     = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.clients))
const isGalleryTab     = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.gallery))
const isDocumentsTab   = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.docs))
const isDesignersTab   = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.designers))
const isSellersTab     = computed(() => route.path.startsWith(ADMIN_SECTION_ROUTES.sellers))

const contractorsTabTo    = computed(() => withCtx(ADMIN_SECTION_ROUTES.contractors))
const clientsTabTo        = computed(() => withCtx(ADMIN_SECTION_ROUTES.clients))
const designersTabTo      = computed(() => withCtx(ADMIN_SECTION_ROUTES.designers))
const sellersTabTo        = computed(() => withCtx(ADMIN_SECTION_ROUTES.sellers))
const galleryActiveTabTo  = computed(() => {
  const match = GALLERY_TABS.find(g => route.path === `/admin/gallery/${g.slug}`)
  return withCtx(`/admin/gallery/${match?.slug ?? 'interiors'}`)
})

const galleryCurrentChip = computed(() => {
  const match = GALLERY_TABS.find(g => route.path === `/admin/gallery/${g.slug}`)
  return match?.icon ?? ''
})

// ── Projects data ───────────────────────────────────────────────
const { data: quickProjectsData } = useFetch<any[]>('/api/projects', { server: false, default: () => [] })
const quickProjects = computed(() =>
  (quickProjectsData.value || []).map((p: any) => ({ slug: String(p.slug), title: String(p.title || p.slug) }))
)
const currentProjectTitle    = computed(() => quickProjects.value.find(p => p.slug === activeProjectSlug.value)?.title || activeProjectSlug.value)
const currentProjectInitials = computed(() => projectInitials(currentProjectTitle.value))

const mobileContentLabel = computed(() => {
  const activeLeafId = adminNav.activeLeafId.value

  if (activeLeafId) {
    const activeLeaf = adminNav.currentNode.value.payload.find(item => item.id === activeLeafId)
    if (activeLeaf?.name) {
      return activeLeaf.name
    }
  }

  if (route.path.startsWith('/admin/projects/')) {
    return currentProjectTitle.value || 'Проект'
  }

  if (route.path === ADMIN_SECTION_ROUTES.projects) {
    return 'Проекты'
  }

  if (route.path.startsWith(ADMIN_SECTION_ROUTES.clients)) {
    return 'Клиенты'
  }

  if (route.path.startsWith(ADMIN_SECTION_ROUTES.contractors)) {
    return 'Подрядчики'
  }

  if (route.path.startsWith(ADMIN_SECTION_ROUTES.designers)) {
    return 'Дизайнеры'
  }

  if (route.path.startsWith(ADMIN_SECTION_ROUTES.sellers)) {
    return 'Поставщики'
  }

  if (route.path.startsWith(ADMIN_SECTION_ROUTES.managers)) {
    return 'Менеджеры'
  }

  if (route.path.startsWith(ADMIN_SECTION_ROUTES.docs)) {
    return 'Документы'
  }

  if (route.path.startsWith(ADMIN_SECTION_ROUTES.gallery)) {
    return 'Галерея'
  }

  const breadcrumbs = adminNav.currentNode.value.context?.breadcrumbs || []
  return breadcrumbs[breadcrumbs.length - 1] || adminNav.currentNode.value.context?.title || 'Рабочий экран'
})

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
const adminShellMenuOpen = ref(false)

const projectsTabRef    = ref<HTMLElement | null>(null)
const contractorsTabRef = ref<HTMLElement | null>(null)
const clientsTabRef     = ref<HTMLElement | null>(null)
const galleryTabRef     = ref<HTMLElement | null>(null)
const designersTabRef   = ref<HTMLElement | null>(null)
const sellersTabRef     = ref<HTMLElement | null>(null)
const notifWrapRef      = ref<HTMLElement | null>(null)
const adminMenuRef      = ref<HTMLElement | null>(null)

function closeAll() {
  projectsOpen.value = contractorsOpen.value = clientsOpen.value =
    galleryOpen.value = designersOpen.value = sellersOpen.value =
    notifOpen.value = adminShellMenuOpen.value = utilBarOpen.value = false
}

function cancelMobileShellScrollFrame() {
  if (!import.meta.client || typeof window === 'undefined' || !mobileShellScrollFrame) {
    return
  }

  window.cancelAnimationFrame(mobileShellScrollFrame)
  mobileShellScrollFrame = 0
}

function cancelMobileShellQuickSwitchFrame() {
  if (!import.meta.client || typeof window === 'undefined' || !mobileShellQuickSwitchFrame) {
    return
  }

  window.cancelAnimationFrame(mobileShellQuickSwitchFrame)
  mobileShellQuickSwitchFrame = 0
}

function syncMobileContentQuickSwitch() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (isDesktopSidebar.value || mobileShellView.value !== 'content') {
    showMobileContentQuickSwitch.value = false
    return
  }

  const shell = mobileContentShellRef.value
  if (!shell) {
    showMobileContentQuickSwitch.value = window.scrollY > 120
    return
  }

  showMobileContentQuickSwitch.value = shell.getBoundingClientRect().bottom < 0
}

function queueMobileContentQuickSwitchSync() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  cancelMobileShellQuickSwitchFrame()
  mobileShellQuickSwitchFrame = window.requestAnimationFrame(() => {
    mobileShellQuickSwitchFrame = 0
    syncMobileContentQuickSwitch()
  })
}

function rememberMobileContentScroll() {
  if (!import.meta.client || typeof window === 'undefined' || isDesktopSidebar.value) {
    return
  }

  if (mobileShellView.value !== 'content') {
    return
  }

  mobileContentScrollState.route = route.fullPath
  mobileContentScrollState.y = window.scrollY
}

async function syncMobileShellViewport(nextView: 'sidebar' | 'content', behavior: ScrollBehavior) {
  if (!import.meta.client || typeof window === 'undefined' || isDesktopSidebar.value) {
    return
  }

  await nextTick()
  cancelMobileShellScrollFrame()

  mobileShellScrollFrame = window.requestAnimationFrame(() => {
    mobileShellScrollFrame = 0

    const target = nextView === 'sidebar' ? sidebarRef.value : mainRef.value
    const shouldRestoreContentScroll = nextView === 'content'
      && mobileContentScrollState.route === route.fullPath
      && mobileContentScrollState.y > 0

    if (shouldRestoreContentScroll) {
      window.scrollTo({ top: mobileContentScrollState.y, behavior })
    } else {
      target?.scrollIntoView({ behavior, block: 'start' })
    }

    target?.focus({ preventScroll: true })
  })
}

async function setMobileShellView(
  nextView: 'sidebar' | 'content',
  options: { behavior?: ScrollBehavior, forceScroll?: boolean } = {},
) {
  if (isDesktopSidebar.value) {
    mobileShellView.value = 'content'
    return
  }

  if (mobileShellView.value === 'content' && nextView !== 'content') {
    rememberMobileContentScroll()
  }

  const changed = mobileShellView.value !== nextView
  mobileShellView.value = nextView
  closeAll()

  if (!changed && !options.forceScroll) {
    return
  }

  await syncMobileShellViewport(nextView, options.behavior || 'smooth')
}

async function switchMobileShellView(nextView: 'sidebar' | 'content') {
  await setMobileShellView(nextView, { behavior: 'smooth', forceScroll: true })
}

function openMobileSidebar() {
  void switchMobileShellView('sidebar')
}

function openMobileContent() {
  void switchMobileShellView('content')
}

function onDocClick(e: MouseEvent) {
  const refs = [projectsTabRef.value, contractorsTabRef.value, clientsTabRef.value, galleryTabRef.value, designersTabRef.value, sellersTabRef.value, notifWrapRef.value, adminMenuRef.value, utilBarRef.value]
  if (refs.every(r => !r || !r.contains(e.target as Node))) closeAll()
}

// ── Global search ─────────────────────────────────────────────
const searchOpen = ref(false)

function onSearchKeydown(e: KeyboardEvent) {
  if (!adminLayoutModules.value.search) {
    return
  }

  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchOpen.value = !searchOpen.value
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onSearchKeydown)
  if (adminLayoutModules.value.notifications) {
    _notifInterval = setInterval(refreshNotif, 2 * 60 * 1000)
  }
  syncDesktopSidebarState()
  window.addEventListener('resize', syncDesktopSidebarState)
  window.addEventListener('scroll', queueMobileContentQuickSwitchSync, { passive: true })
  queueMobileContentQuickSwitchSync()
  // Синхронизируем CSS vars на :root, чтобы Teleport-ed элементы (Wipe2Renderer) могли их читать
  watch(sidebarLayoutStyle, (style) => {
    for (const [key, val] of Object.entries(style)) {
      document.documentElement.style.setProperty(key, String(val))
    }
  }, { immediate: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onSearchKeydown)
  window.removeEventListener('resize', syncDesktopSidebarState)
  window.removeEventListener('scroll', queueMobileContentQuickSwitchSync)
  cancelMobileShellScrollFrame()
  cancelMobileShellQuickSwitchFrame()
  if (_notifInterval) clearInterval(_notifInterval)
})

watch(() => adminLayoutModules.value.notifications, (enabled) => {
  if (_notifInterval) {
    clearInterval(_notifInterval)
    _notifInterval = null
  }

  if (!enabled) {
    notifOpen.value = false
    return
  }

  refreshNotif()
  _notifInterval = setInterval(refreshNotif, 2 * 60 * 1000)
}, { immediate: false })

watch(() => adminLayoutModules.value.search, (enabled) => {
  if (!enabled) {
    searchOpen.value = false
  }
})

watch(() => adminLayoutModules.value.sidebarMenu, (enabled) => {
  if (!enabled) {
    adminShellMenuOpen.value = false
  }
})
watch([isDesktopSidebar, hasMobileContentPriority, () => route.fullPath], async ([desktop, shouldOpenContent]) => {
  const nextView = desktop ? 'content' : (shouldOpenContent ? 'content' : 'sidebar')

  if (desktop) {
    mobileShellView.value = 'content'
    return
  }

  await setMobileShellView(nextView)
}, { immediate: true })
watch([isDesktopSidebar, mobileShellView, () => route.fullPath], async () => {
  await nextTick()
  queueMobileContentQuickSwitchSync()
}, { immediate: true })
watch(isSidebarCollapsed, (collapsed) => {
  if (collapsed) {
    adminShellMenuOpen.value = false
  }
})
watch(() => route.fullPath, () => { closeAll() })

watch([
  () => route.fullPath,
  () => blueprintRuntime.activeBlueprintId.value,
], async () => {
  const fallbackPath = blueprintRuntime.getAdminRouteFallback(route)
  if (!fallbackPath || fallbackPath === route.path) {
    return
  }

  await router.replace(fallbackPath)
}, { immediate: true })

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
  router.push('/login?role=admin')
}
</script>

<style scoped src="./AdminLayout.scoped.css"></style>
