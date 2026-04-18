<template>
  <div class="cc-root glass-page">

    <div v-if="pending" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 5" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="error || !project" class="cc-error glass-surface">
      <template v-if="(error as any)?.statusCode === 401 || (error as any)?.status === 401">
        <p>Сессия истекла. Войдите снова.</p>
        <NuxtLink to="/login?role=client" class="a-btn-save">Войти</NuxtLink>
      </template>
      <template v-else>
        <p>Не удалось загрузить данные проекта.</p>
        <GlassButton variant="secondary" density="compact" @click="refresh()" >Повторить</GlassButton>
        <NuxtLink to="/login?role=client" class="a-btn-sm">Выйти</NuxtLink>
      </template>
    </div>

    <div v-else class="cc-body">

      <!-- Sidebar -->
      <aside
        ref="sidebarRef"
        class="cc-sidebar glass-surface std-sidenav"
        :class="{ 'cc-sidebar--mobile-hidden': isMobileShell && mobileShellView === 'content' }"
        aria-label="Разделы проекта клиента"
        :aria-hidden="isMobileShell && mobileShellView === 'content' ? 'true' : 'false'"
        tabindex="-1"
      >
        <div v-if="isMobileShell" class="cc-mobile-shell cc-mobile-shell--sidebar">
          <div class="cc-mobile-shell__copy">
            <p class="cc-mobile-shell__eyebrow">Навигация</p>
            <strong class="cc-mobile-shell__label">Разделы проекта</strong>
          </div>
          <button type="button" class="cc-mobile-shell__btn" @click="openClientContent">к экрану</button>
        </div>
        <div class="cc-sidebar-header">
          <div class="cc-project-title">{{ project.title }}</div>
          <div class="cc-project-status">
            <span class="cc-status-dot" :class="`cc-status--${project.status}`"></span>
            {{ statusLabel(project.status) }}
          </div>
        </div>

        <nav class="cc-nav std-nav">
          <button
            class="cc-nav-item std-nav-item"
            :class="{ active: activePage === 'overview', 'std-nav-item--active': activePage === 'overview' }"
            @click="setPage('overview')"
          >
            <span class="cc-nav-icon">◈</span>
            <span class="cc-nav-label">обзор</span>
          </button>
          <button
            v-for="pg in navPages"
            :key="pg.slug"
            class="cc-nav-item std-nav-item"
            :class="{ active: activePage === pg.slug, 'std-nav-item--active': activePage === pg.slug }"
            @click="setPage(pg.slug)"
          >
            <span class="cc-nav-icon">{{ pg.icon }}</span>
            <span class="cc-nav-label">{{ pg.title }}</span>
          </button>
        </nav>

        <div class="cc-sidebar-footer">
          <button @click="logout" class="cc-logout">выйти</button>
        </div>
      </aside>

      <!-- Main content -->
      <main
        ref="mainRef"
        class="cc-main"
        :class="{ 'cc-main--mobile-hidden': isMobileShell && mobileShellView === 'sidebar' }"
        aria-label="Рабочая область клиента"
        :aria-hidden="isMobileShell && mobileShellView === 'sidebar' ? 'true' : 'false'"
        tabindex="-1"
      >
        <div class="cc-content">
          <div v-if="isMobileShell" ref="mobileContentShellRef" class="cc-mobile-shell cc-mobile-shell--content">
            <button type="button" class="cc-mobile-shell__btn" @click="openClientSidebar">разделы</button>
            <div class="cc-mobile-shell__copy cc-mobile-shell__copy--content">
              <p class="cc-mobile-shell__eyebrow">Активный экран</p>
              <strong class="cc-mobile-shell__label">{{ activePageLabel }}</strong>
            </div>
          </div>
          <ClientOverview
            v-if="activePage === 'overview'"
            :slug="slug"
            :project="project"
            :contractors="linkedContractors || []"
            :rm-map="rmMap"
            @navigate="setPage"
          />
          <component
            v-else
            :is="activeComponent"
            v-bind="activeProps"
            :key="activePage"
          />
        </div>
      </main>

      <button
        v-if="showMobileQuickSwitch"
        type="button"
        class="cc-mobile-shell-fab"
        aria-label="Открыть разделы проекта"
        @click="openClientSidebar"
      >
        разделы
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { getClientPages } from '~~/shared/constants/navigation/pages'

// Client-facing components
import ClientInitiation    from '~/widgets/phases/initiation/ClientInitiation.vue'
import ClientSelfProfile   from '~/widgets/cabinets/client/ClientSelfProfile.vue'
import ClientContactDetails from '~/widgets/cabinets/client/ClientContactDetails.vue'
import ClientPassport      from '~/widgets/projects/ClientPassport.vue'
import ClientBrief         from '~/widgets/projects/ClientBrief.vue'
import ClientTZ            from '~/widgets/phases/concept/ClientTZ.vue'
import ClientContracts     from '~/widgets/projects/ClientContracts.vue'
import ClientExtraServices  from '~/widgets/projects/ClientExtraServices.vue'
import ClientWorkProgress  from '~/widgets/phases/construction/ClientWorkProgress.vue'
import ClientTimeline      from '~/widgets/projects/ClientTimeline.vue'
import ClientDesignAlbum   from '~/widgets/phases/working-project/ClientDesignAlbum.vue'
import ClientPageContent   from '~/features/page-content/ui/ClientPageContent.vue'
import ClientOverview      from '~/widgets/projects/ClientOverview.vue'
import ClientProjectControl from '~/widgets/projects/control/ClientProjectControl.vue'
import ProjectCommunicationsPanel from '~/entities/communications/ui/ProjectCommunicationsPanel.vue'

definePageMeta({ middleware: 'client', layout: 'default' })

const route   = useRoute()
const router  = useRouter()
const slug    = computed(() => route.params.slug as string)
const sidebarRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const mobileContentShellRef = ref<HTMLElement | null>(null)
const isDesktopClientShell = ref(false)
const mobileShellView = ref<'sidebar' | 'content'>('content')
const mobileContentScrollState = reactive({
  route: '',
  y: 0,
})
const showMobileQuickSwitch = ref(false)
let clientShellScrollFrame = 0
let clientShellQuickSwitchFrame = 0

const isMobileShell = computed(() => !isDesktopClientShell.value)

function syncDesktopClientShellState() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  isDesktopClientShell.value = window.innerWidth > 700
}

function cancelClientShellScrollFrame() {
  if (!import.meta.client || typeof window === 'undefined' || !clientShellScrollFrame) {
    return
  }

  window.cancelAnimationFrame(clientShellScrollFrame)
  clientShellScrollFrame = 0
}

function cancelClientShellQuickSwitchFrame() {
  if (!import.meta.client || typeof window === 'undefined' || !clientShellQuickSwitchFrame) {
    return
  }

  window.cancelAnimationFrame(clientShellQuickSwitchFrame)
  clientShellQuickSwitchFrame = 0
}

function rememberClientContentScroll() {
  if (!import.meta.client || typeof window === 'undefined' || isDesktopClientShell.value) {
    return
  }

  if (mobileShellView.value !== 'content') {
    return
  }

  mobileContentScrollState.route = route.fullPath
  mobileContentScrollState.y = window.scrollY
}

function syncClientContentQuickSwitch() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (isDesktopClientShell.value || mobileShellView.value !== 'content') {
    showMobileQuickSwitch.value = false
    return
  }

  const shell = mobileContentShellRef.value
  if (!shell) {
    showMobileQuickSwitch.value = window.scrollY > 120
    return
  }

  showMobileQuickSwitch.value = shell.getBoundingClientRect().bottom < 0
}

function queueClientContentQuickSwitchSync() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  cancelClientShellQuickSwitchFrame()
  clientShellQuickSwitchFrame = window.requestAnimationFrame(() => {
    clientShellQuickSwitchFrame = 0
    syncClientContentQuickSwitch()
  })
}

async function syncClientShellViewport(nextView: 'sidebar' | 'content', behavior: ScrollBehavior) {
  if (!import.meta.client || typeof window === 'undefined' || isDesktopClientShell.value) {
    return
  }

  await nextTick()
  cancelClientShellScrollFrame()

  clientShellScrollFrame = window.requestAnimationFrame(() => {
    clientShellScrollFrame = 0

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

async function setClientShellView(
  nextView: 'sidebar' | 'content',
  options: { behavior?: ScrollBehavior, forceScroll?: boolean } = {},
) {
  if (isDesktopClientShell.value) {
    mobileShellView.value = 'content'
    return
  }

  if (mobileShellView.value === 'content' && nextView !== 'content') {
    rememberClientContentScroll()
  }

  const changed = mobileShellView.value !== nextView
  mobileShellView.value = nextView

  if (!changed && !options.forceScroll) {
    return
  }

  await syncClientShellViewport(nextView, options.behavior || 'smooth')
}

function openClientSidebar() {
  void setClientShellView('sidebar', { behavior: 'smooth', forceScroll: true })
}

function openClientContent() {
  void setClientShellView('content', { behavior: 'smooth', forceScroll: true })
}

// Forward cookies to SSR fetch so requireAdminOrClient can read the session
const reqHeaders = useRequestHeaders(['cookie'])

// ── Fetch project ────────────────────────────────────────────────────────
const { data: project, pending, error, refresh } = await useFetch<any>(
  () => `/api/projects/${slug.value}`,
  {
    watch: [slug],
    headers: reqHeaders,
  }
)

// ── Fetch linked contractors ─────────────────────────────────────────────
const { data: linkedContractors } = await useFetch<any[]>(
  () => `/api/projects/${slug.value}/contractors`,
  { default: () => [], headers: reqHeaders }
)

// ── Page component map ───────────────────────────────────────────────────
const PAGE_COMPONENT_MAP: Record<string, Component> = {
  phase_init:      ClientInitiation,
  self_profile:    ClientSelfProfile,
  brief:           ClientSelfProfile,
  client_contacts: ClientContactDetails,
  client_passport: ClientPassport,
  client_brief:    ClientBrief,
  client_tz:       ClientTZ,
  contracts:       ClientContracts,
  extra_services:  ClientExtraServices,
  work_progress:   ClientWorkProgress,
  project_control: ClientProjectControl,
  design_timeline: ClientTimeline,
  design_album:    ClientDesignAlbum,
  communications:  ProjectCommunicationsPanel,
}

// ── Navigation ───────────────────────────────────────────────────────────
const allClientPages = getClientPages()

const navPages = computed(() => {
  const pages = project.value?.pages || []
  return allClientPages.filter(p => {
    if (p.slug === 'communications') return true
    if (!p.phase) return true
    if (p.slug === 'self_profile' && pages.includes('brief')) return true
    return pages.includes(p.slug)
  })
})

const rmMap = computed<Record<string, string>>(() => ({}))

// ── Active page state ────────────────────────────────────────────────────
const CLIENT_SECTION_QUERY_KEY = 'section'
const CLIENT_PROJECT_CONTROL_ROUTE_QUERY_KEYS = ['controlSprint', 'controlTask'] as const
let syncingFromRoute = false

function parseClientSectionQuery(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  const normalized = raw === 'brief' ? 'self_profile' : raw

  if (normalized === 'overview') {
    return 'overview'
  }

  return typeof normalized === 'string' && allClientPages.some(page => page.slug === normalized)
    ? normalized
    : 'overview'
}

function hasNonEmptyRouteQueryValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(item => hasNonEmptyRouteQueryValue(item))
  }

  return typeof value === 'string' && value.trim().length > 0
}

const hasProjectControlRouteState = computed(() =>
  CLIENT_PROJECT_CONTROL_ROUTE_QUERY_KEYS.some(key => hasNonEmptyRouteQueryValue(route.query[key])),
)

const activePage = ref(
  hasProjectControlRouteState.value
    ? 'project_control'
    : parseClientSectionQuery(route.query[CLIENT_SECTION_QUERY_KEY]),
)

const activePageLabel = computed(() => {
  if (activePage.value === 'overview') {
    return 'Обзор'
  }

  return navPages.value.find(page => page.slug === activePage.value)?.title || project.value?.title || 'Проект'
})

function readClientStateFromRoute() {
  syncingFromRoute = true
  activePage.value = hasProjectControlRouteState.value
    ? 'project_control'
    : parseClientSectionQuery(route.query[CLIENT_SECTION_QUERY_KEY])
  syncingFromRoute = false
}

async function syncClientStateToRoute() {
  if (syncingFromRoute) return

  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>
  const normalizedActivePage = activePage.value === 'brief' ? 'self_profile' : activePage.value

  if (normalizedActivePage !== 'overview') nextQuery[CLIENT_SECTION_QUERY_KEY] = normalizedActivePage
  else delete nextQuery[CLIENT_SECTION_QUERY_KEY]

  if (normalizedActivePage !== 'project_control') {
    CLIENT_PROJECT_CONTROL_ROUTE_QUERY_KEYS.forEach((key) => {
      delete nextQuery[key]
    })
  }

  const currentSection = Array.isArray(route.query[CLIENT_SECTION_QUERY_KEY]) ? route.query[CLIENT_SECTION_QUERY_KEY][0] : route.query[CLIENT_SECTION_QUERY_KEY]
  const nextSection = typeof nextQuery[CLIENT_SECTION_QUERY_KEY] === 'string' ? nextQuery[CLIENT_SECTION_QUERY_KEY] : undefined
  const currentControlState = CLIENT_PROJECT_CONTROL_ROUTE_QUERY_KEYS.map((key) => {
    const value = route.query[key]
    return Array.isArray(value) ? value[0] : value
  })
  const nextControlState = CLIENT_PROJECT_CONTROL_ROUTE_QUERY_KEYS.map((key) => {
    const value = nextQuery[key]
    return typeof value === 'string' ? value : undefined
  })

  if (currentSection === nextSection && currentControlState.every((value, index) => value === nextControlState[index])) {
    return
  }

  await router.replace({ query: nextQuery })
}

watch(() => [route.query[CLIENT_SECTION_QUERY_KEY], route.query.controlSprint, route.query.controlTask], () => {
  readClientStateFromRoute()
}, { immediate: true })

watch(activePage, async () => {
  await syncClientStateToRoute()
}, { immediate: true })

watch(navPages, (pages) => {
  if (hasProjectControlRouteState.value && pages.some(page => page.slug === 'project_control')) {
    activePage.value = 'project_control'
    return
  }

  if (!activePage.value || activePage.value === 'overview') return
  if (!pages.some(p => p.slug === activePage.value) && pages.length) {
    activePage.value = pages[0].slug
  }
}, { immediate: true })

watch([hasProjectControlRouteState, navPages], ([hasControlRouteState, pages]) => {
  if (!hasControlRouteState) return
  if (!pages.some(page => page.slug === 'project_control')) return
  if (activePage.value === 'project_control') return

  activePage.value = 'project_control'
}, { immediate: true })

watch([isDesktopClientShell, () => route.fullPath], async ([desktop]) => {
  if (desktop) {
    mobileShellView.value = 'content'
    showMobileQuickSwitch.value = false
    return
  }

  await setClientShellView('content')
}, { immediate: true })

watch([isDesktopClientShell, mobileShellView, () => route.fullPath, activePage], async () => {
  await nextTick()
  queueClientContentQuickSwitchSync()
}, { immediate: true })

onMounted(() => {
  syncDesktopClientShellState()
  window.addEventListener('resize', syncDesktopClientShellState)
  window.addEventListener('scroll', queueClientContentQuickSwitchSync, { passive: true })
  queueClientContentQuickSwitchSync()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncDesktopClientShellState)
  window.removeEventListener('scroll', queueClientContentQuickSwitchSync)
  cancelClientShellScrollFrame()
  cancelClientShellQuickSwitchFrame()
})

async function setPage(slug: string) {
  activePage.value = slug

  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (isMobileShell.value) {
    mobileContentScrollState.route = route.fullPath
    mobileContentScrollState.y = 0
    await setClientShellView('content', { behavior: 'instant', forceScroll: true })
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const normalizedPage = computed(() =>
  activePage.value === 'brief' ? 'self_profile' : activePage.value
)

const activeComponent = computed<Component>(() =>
  PAGE_COMPONENT_MAP[normalizedPage.value] || ClientPageContent
)

const activeProps = computed(() => {
  const base = { slug: slug.value }
  if (activeComponent.value === ProjectCommunicationsPanel) {
    return { projectSlug: slug.value }
  }
  if (activeComponent.value === ClientPageContent) {
    return { ...base, page: normalizedPage.value }
  }
  return base
})

// ── Utils ────────────────────────────────────────────────────────────────
function statusLabel(s: string) {
  const map: Record<string, string> = {
    lead: 'Инициация',
    concept: 'Концепция',
    working_project: 'Рабочий проект',
    procurement: 'Комплектация',
    construction: 'Строительство',
    commissioning: 'Сдача',
  }
  return map[s] || s
}

async function logout() {
  await $fetch('/api/auth/client-id-logout', { method: 'POST' }).catch(() => {})
  router.push('/login?role=client')
}
</script>

<style scoped src="./ClientIndexPage.scoped.css"></style>
