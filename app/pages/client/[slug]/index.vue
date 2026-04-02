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
import { getClientPages } from '~~/shared/constants/pages'

// Client-facing components
import ClientInitiation    from '~/components/ClientInitiation.vue'
import ClientSelfProfile   from '~/components/ClientSelfProfile.vue'
import ClientContactDetails from '~/components/ClientContactDetails.vue'
import ClientPassport      from '~/components/ClientPassport.vue'
import ClientBrief         from '~/components/ClientBrief.vue'
import ClientTZ            from '~/components/ClientTZ.vue'
import ClientContracts     from '~/components/ClientContracts.vue'
import ClientExtraServices  from '~/components/ClientExtraServices.vue'
import ClientWorkProgress  from '~/components/ClientWorkProgress.vue'
import ClientTimeline      from '~/components/ClientTimeline.vue'
import ClientDesignAlbum   from '~/components/ClientDesignAlbum.vue'
import ClientPageContent   from '~/components/ClientPageContent.vue'
import ClientOverview      from '~/components/ClientOverview.vue'
import ClientProjectControl from '~/components/ClientProjectControl.vue'
import ProjectCommunicationsPanel from '~~/app/components/ProjectCommunicationsPanel.vue'

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

<style scoped>
/* ── Root layout ─────────────────────────────────────────────── */
.cc-root {
  min-height: 100vh;
  min-height: 100dvh;
}

.cc-loading {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0.5;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
}

.cc-loading-dot {
  animation: cc-spin 2s linear infinite;
  display: inline-block;
}

@keyframes cc-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.cc-error {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  padding: 40px;
}

/* ── Body grid ───────────────────────────────────────────────── */
.cc-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: 1fr;
  min-height: 100vh;
  min-height: 100dvh;
}

/* ── Mobile shell ───────────────────────────────────────────── */
.cc-mobile-shell {
  grid-column: 1 / -1;
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text, #1a1a1a) 12%, transparent);
  background: color-mix(in srgb, var(--glass-bg, #ffffff) 90%, transparent);
  border-radius: 20px;
}

.cc-mobile-shell__copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.cc-mobile-shell__copy--content {
  justify-items: end;
  text-align: right;
}

.cc-mobile-shell__eyebrow {
  margin: 0;
  font-size: .62rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text, #1a1a1a) 50%, transparent);
}

.cc-mobile-shell__label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .92rem;
  line-height: 1.2;
  color: var(--glass-text, #1a1a1a);
}

.cc-mobile-shell__btn {
  position: relative;
  isolation: isolate;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--glass-text, #1a1a1a) 14%, transparent);
  background: color-mix(in srgb, var(--glass-text, #1a1a1a) 4%, transparent);
  color: var(--glass-text, #1a1a1a);
  border-radius: 999px;
  font: inherit;
  font-size: .72rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  transition: background-color .18s ease, border-color .18s ease, color .18s ease;
}

.cc-mobile-shell__btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: currentColor;
  opacity: 0;
  transition: opacity .18s ease;
}

.cc-mobile-shell__btn > * {
  position: relative;
  z-index: 1;
}

.cc-mobile-shell__btn:hover::before {
  opacity: .06;
}

.cc-mobile-shell__btn:active::before {
  opacity: .1;
}

.cc-mobile-shell__btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--glass-text, #1a1a1a) 36%, transparent);
  outline-offset: 2px;
}

:global(html[data-design-mode="material3"] .cc-mobile-shell) {
  border-color: var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-low);
  border-radius: var(--sys-radius-xl, 24px);
  box-shadow: var(--sys-elevation-level1);
}

:global(html[data-design-mode="material3"] .cc-mobile-shell__eyebrow) {
  letter-spacing: .06em;
  text-transform: none;
  color: var(--sys-color-on-surface-variant);
}

:global(html[data-design-mode="material3"] .cc-mobile-shell__label) {
  color: var(--sys-color-on-surface);
}

:global(html[data-design-mode="material3"] .cc-mobile-shell__btn) {
  border-color: transparent;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
  letter-spacing: .01em;
  text-transform: none;
}

:global(html[data-design-mode="material3"] .cc-mobile-shell__btn:hover::before) {
  opacity: .08;
}

:global(html[data-design-mode="material3"] .cc-mobile-shell__btn:active::before) {
  opacity: .12;
}

:global(html[data-design-mode="material3"] .cc-mobile-shell__btn:focus-visible) {
  outline-color: var(--sys-color-primary);
}

/* ── Sidebar ─────────────────────────────────────────────────── */
.cc-sidebar {
  grid-column: 1;
  grid-row: 1 / -1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 20px 0;
  border-right: 1px solid var(--glass-border, rgba(180,180,220,0.15));
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
}

.cc-sidebar-header {
  padding: 0 18px 16px;
  border-bottom: 1px solid var(--glass-border, rgba(180,180,220,0.12));
  margin-bottom: 12px;
}

.cc-project-title {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
  margin-bottom: 4px;
  line-height: 1.3;
}

.cc-project-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  opacity: 0.45;
}

.cc-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.cc-status--lead         { color: var(--ds-muted, #9e9e9e); }
.cc-status--concept      { color: var(--phase-violet, #7c3aed); }
.cc-status--working_project { color: var(--phase-blue, #2563eb); }
.cc-status--procurement  { color: var(--ds-warning, #d97706); }
.cc-status--construction { color: var(--phase-orange, #ea580c); }
.cc-status--commissioning { color: var(--ds-success, #16a34a); }

.cc-nav {
  flex: 1;
  padding: 4px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cc-nav-item {
  width: 100%;
}

.cc-nav-icon { font-size: 0.95rem; width: 18px; flex-shrink: 0; text-align: center; }
.cc-nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cc-sidebar-footer {
  padding: 12px 18px 0;
  border-top: 1px solid var(--glass-border, rgba(180,180,220,0.12));
  margin-top: auto;
}

.cc-logout {
  font-size: 0.72rem;
  opacity: 0.3;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0;
  transition: opacity 0.15s;
}
.cc-logout:hover { opacity: 0.6; }

/* ── Main content ────────────────────────────────────────────── */
.cc-main {
  grid-column: 2;
  grid-row: 1 / -1;
  min-width: 0;
  overflow: hidden;
}

.cc-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 24px;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 700px) {
  .cc-body {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  .cc-mobile-shell {
    display: flex;
  }

  .cc-sidebar {
    grid-column: 1;
    grid-row: 1;
    position: static;
    min-height: auto;
    height: auto;
    border-right: none;
    padding: 14px 0 0;
  }

  .cc-main {
    grid-column: 1;
    grid-row: 1;
  }

  .cc-sidebar--mobile-hidden,
  .cc-main--mobile-hidden {
    display: none;
  }

  .cc-content {
    padding: 16px 14px;
  }

  .cc-mobile-shell--sidebar,
  .cc-mobile-shell--content {
    margin-bottom: 12px;
  }

  .cc-mobile-shell-fab {
    position: fixed;
    top: calc(var(--dp-panel-h, 0px) + 12px);
    right: 12px;
    z-index: 80;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid color-mix(in srgb, var(--glass-text, #1a1a1a) 14%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--glass-bg, #ffffff) 92%, transparent);
    color: var(--glass-text, #1a1a1a);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    font: inherit;
    font-size: .72rem;
    letter-spacing: .08em;
    text-transform: uppercase;
    transition: transform .18s ease, background-color .18s ease, border-color .18s ease;
  }

  .cc-mobile-shell-fab:hover {
    background: color-mix(in srgb, var(--glass-text, #1a1a1a) 8%, var(--glass-bg, #ffffff) 92%);
    border-color: color-mix(in srgb, var(--glass-text, #1a1a1a) 24%, transparent);
  }

  .cc-mobile-shell-fab:active {
    transform: translateY(1px);
  }

  .cc-mobile-shell-fab:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--glass-text, #1a1a1a) 36%, transparent);
    outline-offset: 2px;
  }

  :global(html[data-design-mode="material3"] .cc-mobile-shell-fab) {
    border-color: transparent;
    border-radius: 16px;
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
    box-shadow: var(--sys-elevation-level2);
    letter-spacing: .01em;
    text-transform: none;
  }

  :global(html[data-design-mode="material3"] .cc-mobile-shell-fab:hover) {
    background: color-mix(in srgb, var(--sys-color-primary-container) 92%, var(--sys-color-on-primary-container) 8%);
  }

  :global(html[data-design-mode="material3"] .cc-mobile-shell-fab:focus-visible) {
    outline-color: var(--sys-color-primary);
  }
}

@supports (padding: env(safe-area-inset-top)) {
  .cc-mobile-shell {
    padding-top: max(12px, env(safe-area-inset-top));
    padding-right: max(14px, env(safe-area-inset-right));
    padding-left: max(14px, env(safe-area-inset-left));
  }

  .cc-mobile-shell-fab {
    top: calc(var(--dp-panel-h, 0px) + env(safe-area-inset-top) + 12px);
    right: max(12px, env(safe-area-inset-right));
  }

  .cc-sidebar {
    padding-bottom: max(20px, env(safe-area-inset-bottom));
  }

  .cc-content {
    padding-right: max(24px, calc(env(safe-area-inset-right) + 14px));
    padding-bottom: max(28px, calc(env(safe-area-inset-bottom) + 16px));
    padding-left: max(24px, calc(env(safe-area-inset-left) + 14px));
  }
}
</style>
