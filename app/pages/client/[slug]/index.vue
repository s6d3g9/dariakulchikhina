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
        <button @click="refresh()" class="a-btn-sm">Повторить</button>
        <NuxtLink to="/login?role=client" class="a-btn-sm">Выйти</NuxtLink>
      </template>
    </div>

    <div v-else class="cc-body">

      <!-- Mobile top bar -->
      <div class="cc-mobile-bar glass-surface">
        <div class="cc-mobile-title">{{ project.title }}</div>
        <div class="cc-mobile-nav">
          <button
            class="cc-mobile-btn"
            :class="{ 'cc-mobile-btn--active': activePage === 'overview' }"
            @click="setPage('overview')"
          >
            <span>◈</span>
          </button>
          <button
            v-for="pg in navPages"
            :key="pg.slug"
            class="cc-mobile-btn"
            :class="{ 'cc-mobile-btn--active': activePage === pg.slug }"
            @click="setPage(pg.slug)"
          >
            <span>{{ pg.icon }}</span>
          </button>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="cc-sidebar glass-surface std-sidenav">
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
      <main class="cc-main">
        <div class="cc-content">
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
const activePage = ref('overview')

watch(navPages, (pages) => {
  if (!activePage.value || activePage.value === 'overview') return
  if (!pages.some(p => p.slug === activePage.value) && pages.length) {
    activePage.value = pages[0].slug
  }
}, { immediate: true })

function setPage(slug: string) {
  activePage.value = slug
  // Scroll to top on mobile
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
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
  grid-template-rows: auto 1fr;
  min-height: 100vh;
  min-height: 100dvh;
}

/* ── Mobile top bar ──────────────────────────────────────────── */
.cc-mobile-bar {
  grid-column: 1 / -1;
  display: none;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--glass-border, rgba(180,180,220,0.2));
  position: sticky;
  top: 0;
  z-index: 10;
}

.cc-mobile-title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 0 auto;
  max-width: 120px;
}

.cc-mobile-nav {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
  scrollbar-width: none;
}
.cc-mobile-nav::-webkit-scrollbar { display: none; }

.cc-mobile-btn {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.cc-mobile-btn:hover {
  background: rgba(255,255,255,0.25);
}
.cc-mobile-btn--active {
  background: rgba(255,255,255,0.35);
  border-color: var(--glass-border, rgba(180,180,220,0.3));
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
    grid-template-rows: auto auto 1fr;
  }

  .cc-mobile-bar {
    display: flex;
  }

  .cc-sidebar {
    display: none;
  }

  .cc-main {
    grid-column: 1;
    grid-row: 2;
  }

  .cc-content {
    padding: 16px 14px;
  }
}

@supports (padding: env(safe-area-inset-top)) {
  .cc-mobile-bar {
    padding-top: max(10px, env(safe-area-inset-top));
    padding-right: max(14px, env(safe-area-inset-right));
    padding-left: max(14px, env(safe-area-inset-left));
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
