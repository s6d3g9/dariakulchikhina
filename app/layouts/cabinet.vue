<template>
  <div class="cab-root glass-page" :class="{ 'cab-dark': isDark }">

    <!-- Top header -->
    <header class="cab-header glass-surface">
      <div class="cab-header-inner">
        <NuxtLink :to="`/client/${projectSlug}`" class="cab-logo">
          <span class="cab-logo-mark">DK</span>
          <span class="cab-logo-sep"></span>
          <span class="cab-project-name">{{ projectTitle }}</span>
        </NuxtLink>
        <div class="cab-header-actions">
          <NuxtLink to="/admin" class="cab-back-link">← админка</NuxtLink>
          <select v-model="headerProjectSlug" class="cab-project-select" @change="switchProject">
            <option v-for="p in publicProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
          </select>
          <button class="cab-btn-icon" :title="isDark ? 'Светлая тема' : 'Тёмная тема'" @click="toggleTheme">
            <span class="cab-theme-icon">{{ isDark ? '☀' : '◐' }}</span>
          </button>
          <button class="cab-btn-text" @click="logout">выйти</button>
        </div>
      </div>
    </header>

    <!-- Body: sidebar + content -->
    <div class="cab-body">

      <!-- Sidebar (desktop) / Topbar (mobile) -->
      <aside class="cab-sidebar std-sidenav" v-if="availablePages.length">
        <!-- Phase badge -->
        <div class="cab-phase-wrap">
          <span class="cab-phase-badge glass-chip">{{ phaseLabel }}</span>
        </div>
        <!-- Nav links -->
        <nav class="cab-nav std-nav">
          <NuxtLink
            class="cab-nav-item std-nav-item"
            :to="`/client/${projectSlug}`"
            :class="{ 'cab-nav-item--active': isHome, 'std-nav-item--active': isHome }"
          >
            <svg class="cab-nav-ico" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            <span>обзор</span>
          </NuxtLink>
          <NuxtLink
            v-for="item in availablePages"
            :key="item.slug"
            class="cab-nav-item std-nav-item"
            :to="`/client/${projectSlug}/${item.slug}`"
            :class="{ 'cab-nav-item--active': normalizedCurrentPage === item.slug, 'std-nav-item--active': normalizedCurrentPage === item.slug }"
          >
            <span class="cab-nav-ico cab-nav-ico--txt">{{ item.icon }}</span>
            <span>{{ item.title }}</span>
          </NuxtLink>
        </nav>
      </aside>

      <!-- Main content area -->
      <main class="cab-main">
        <div class="cab-inner">
          <slot />
        </div>
      </main>
    </div>

    <footer class="cab-footer">
      <div class="cab-footer-inner">
        <span class="cab-footer-copy">© Daria Kulchikhina Design Studio</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { getClientPages, PHASE_LABELS } from '~~/shared/constants/pages'

const router = useRouter()
const route  = useRoute()
const { isDark, toggleTheme } = useThemeToggle()

const projectSlug = computed(() => route.params.slug as string || '')
const currentPage  = computed(() => route.params.page  as string || '')
const isHome = computed(() => !currentPage.value)

const { data: project } = await useFetch<any>(
  () => projectSlug.value ? `/api/projects/${projectSlug.value}` : null,
  { server: false }
)

type PublicProject = { slug: string; title: string }
const { data: publicProjectsData } = await useFetch<PublicProject[]>('/api/public/projects', {
  default: () => [],
  server: false,
})
const publicProjects = computed(() => publicProjectsData.value || [])

const projectTitle = computed(() => project.value?.title || '')
const headerProjectSlug = ref('')

const CLIENT_PAGES = getClientPages()

const availablePages = computed(() => {
  const pages = new Set<string>(project.value?.pages || [])
  pages.add('self_profile')
  pages.add('client_contacts')
  if (pages.has('brief')) pages.add('self_profile')
  pages.delete('brief')
  return CLIENT_PAGES.filter(p => pages.has(p.slug))
})

const phaseLabel = computed(() => {
  const key = String(project.value?.status || 'lead')
  if (key === 'completed') return 'Фаза 6 · Завершение'
  return PHASE_LABELS[key] || 'Фаза 0 · Инициация'
})

const normalizedCurrentPage = computed(() =>
  currentPage.value === 'brief' ? 'self_profile' : currentPage.value,
)

watch(projectSlug, (slugValue) => {
  headerProjectSlug.value = slugValue || ''
}, { immediate: true })

function switchProject() {
  if (!headerProjectSlug.value) return
  navigateTo(`/client/${encodeURIComponent(headerProjectSlug.value)}`)
}

async function logout() {
  await $fetch('/api/auth/client-logout', { method: 'POST' })
  router.push('/client')
}

watch([availablePages, normalizedCurrentPage], ([pages, pageValue]) => {
  if (!pageValue) return
  if (!pages.some(p => p.slug === pageValue)) {
    navigateTo(`/client/${projectSlug.value}`)
  }
}, { immediate: true })
</script>

<style scoped>
/* ── Root ────────────────────────────────────────────────────── */
.cab-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Header ──────────────────────────────────────────────────── */
.cab-header {
  position: sticky;
  top: 0;
  z-index: 50;
  border-radius: 0 0 16px 16px;
  border-top: none !important;
  border-left: none !important;
  border-right: none !important;
}
.cab-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cab-logo {
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; color: var(--glass-text);
}
.cab-logo-mark { font-size: .72rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
.cab-logo-sep  { width: 1px; height: 14px; background: var(--glass-border); }
.cab-project-name {
  font-size: .74rem; letter-spacing: .8px; color: var(--glass-text); opacity: .5;
  max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cab-header-actions { display: flex; align-items: center; gap: 10px; }
.cab-back-link {
  text-decoration: none;
  color: var(--glass-text);
  opacity: .42;
  font-size: .68rem;
  letter-spacing: .4px;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  white-space: nowrap;
}
.cab-back-link:hover { opacity: .9; }
.cab-project-select {
  min-width: 220px;
  max-width: 320px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--glass-text);
  border-radius: 7px;
  padding: 5px 8px;
  font-size: .72rem;
  letter-spacing: .2px;
  font-family: inherit;
  cursor: pointer;
}
.cab-btn-icon {
  border: none; background: none; cursor: pointer; padding: 6px;
  color: var(--glass-text); opacity: .45; font-size: .9rem; line-height: 1;
  transition: opacity .15s;
}
.cab-btn-icon:hover { opacity: 1; }
.cab-btn-text {
  border: none;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  cursor: pointer; padding: 5px 12px;
  font-size: .72rem; letter-spacing: .6px; text-transform: uppercase;
  color: var(--glass-text); opacity: .65; font-family: inherit;
  border-radius: 7px; transition: opacity .15s;
}
.cab-btn-text:hover { opacity: 1; }

/* ── Body layout ─────────────────────────────────────────────── */
.cab-body {
  flex: 1;
  display: flex;
  align-items: flex-start;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 24px;
  gap: 0;
}

/* ── Sidebar ─────────────────────────────────────────────────── */
.cab-sidebar {
  position: sticky;
  top: 68px;
  width: 200px;
  flex-shrink: 0;
  border-radius: 14px;
  margin-top: 28px;
  padding: 14px 10px;
  align-self: flex-start;
  margin-right: 20px;
}
.cab-phase-wrap {
  padding: 0 6px 12px;
  border-bottom: none;
  margin-bottom: 8px;
}
.cab-phase-badge {
  font-size: .6rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 999px;
  display: inline-block;
}

.cab-nav { display: flex; flex-direction: column; gap: 2px; }
.cab-nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; border-radius: 9px;
  text-decoration: none; font-size: .78rem; letter-spacing: .3px;
  color: var(--glass-text); opacity: .64;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  transition: opacity .15s, background .15s, border-color .15s;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer;
}
.cab-nav-item:hover { opacity: .92; background: color-mix(in srgb, var(--glass-bg) 82%, transparent); }
.cab-nav-item--active { opacity: 1; background: color-mix(in srgb, var(--glass-bg) 92%, transparent); font-weight: 600; border: none; }
.cab-nav-ico { flex-shrink: 0; display: flex; align-items: center; }
.cab-nav-ico--txt { font-size: .7rem; opacity: .6; }

/* ── Main ────────────────────────────────────────────────────── */
.cab-main { flex: 1; min-width: 0; }
.cab-inner { padding: 28px 0 48px; }

/* ── Footer ──────────────────────────────────────────────────── */
.cab-footer { border-top: 1px solid var(--glass-border); }
.cab-footer-inner {
  max-width: 1200px; margin: 0 auto; padding: 14px 24px;
}
.cab-footer-copy {
  font-size: .68rem; letter-spacing: .5px;
  color: var(--glass-text); opacity: .4; text-transform: uppercase;
}

/* ── Mobile ──────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .cab-body { flex-direction: column; padding: 0; gap: 0; }

  .cab-sidebar {
    position: static;
    width: 100%;
    margin: 0;
    border-radius: 0;
    padding: 8px 0 0;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
  .cab-phase-wrap { display: none; }
  .cab-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 6px 16px 10px;
    gap: 5px;
    scrollbar-width: none;
    border-bottom: 1px solid var(--glass-border);
  }
  .cab-nav::-webkit-scrollbar { display: none; }
  .cab-nav-item {
    border: none;
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    border-radius: 999px;
    padding: 5px 12px;
    white-space: nowrap;
    font-size: .72rem;
    opacity: .6;
  }
  .cab-nav-item--active {
    opacity: 1;
    background: var(--glass-text);
    color: var(--glass-page-bg);
    border-color: transparent;
  }
  .cab-nav-ico { display: none; }
  .cab-inner { padding: 20px 16px 36px; }
  .cab-header-inner { padding: 0 16px; }
  .cab-project-name { max-width: 130px; }
  .cab-project-select { min-width: 120px; max-width: 160px; }
  .cab-footer-inner { padding: 14px 16px; }
}
</style>
