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
      <aside class="cab-sidebar" v-if="availablePages.length">
        <!-- Phase badge -->
        <div class="cab-phase-wrap">
          <span class="cab-phase-badge glass-chip">{{ phaseLabel }}</span>
        </div>
        <!-- Nav links -->
        <nav class="cab-nav">
          <NuxtLink
            :to="`/client/${projectSlug}`"
            class="cab-nav-item"
            :class="{ 'cab-nav-item--active': isHome }"
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
            :to="`/client/${projectSlug}/${item.slug}`"
            class="cab-nav-item"
            :class="{ 'cab-nav-item--active': currentPage === item.slug }"
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
const projectTitle = computed(() => project.value?.title || '')

const ALL_PAGES = [
  { slug: 'phase_init',          title: 'инициация',        icon: '◉' },
  { slug: 'self_profile',        title: 'мои данные',       icon: '◎' },
  { slug: 'design_timeline',     title: 'ход проекта',      icon: '◈' },
  { slug: 'design_album',        title: 'альбом',           icon: '▣' },
  { slug: 'contracts',           title: 'документы',        icon: '◻' },
  { slug: 'materials',           title: 'материалы',        icon: '◫' },
  { slug: 'tz',                  title: 'ТЗ',               icon: '◧' },
  { slug: 'profile_contractors', title: 'подрядчики',       icon: '◑' },
  { slug: 'work_status',         title: 'статусы работ',    icon: '◷' },
  { slug: 'project_roadmap',     title: 'дорожная карта',   icon: '◈' },
]

const availablePages = computed(() => {
  const pages = project.value?.pages || []
  return ALL_PAGES.filter(p => pages.includes(p.slug))
})

const phases = [
  { key: 'lead',            label: 'Инициация'  },
  { key: 'concept',         label: 'Эскиз'      },
  { key: 'working_project', label: 'Проект'     },
  { key: 'procurement',     label: 'Закупки'    },
  { key: 'construction',    label: 'Стройка'    },
  { key: 'commissioning',   label: 'Сдача'      },
  { key: 'completed',       label: 'Готово'     },
]
const phaseLabel = computed(() =>
  phases.find(p => p.key === project.value?.status)?.label || 'Инициация'
)

async function logout() {
  await $fetch('/api/auth/client-logout', { method: 'POST' })
  router.push('/client/login')
}
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
.cab-btn-icon {
  border: none; background: none; cursor: pointer; padding: 6px;
  color: var(--glass-text); opacity: .45; font-size: .9rem; line-height: 1;
  transition: opacity .15s;
}
.cab-btn-icon:hover { opacity: 1; }
.cab-btn-text {
  border: 1px solid var(--glass-border);
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
  border-bottom: 1px solid var(--glass-border);
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

.cab-nav { display: flex; flex-direction: column; gap: 1px; }
.cab-nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 9px;
  text-decoration: none; font-size: .78rem; letter-spacing: .3px;
  color: var(--glass-text); opacity: .5;
  transition: opacity .15s, background .15s;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cab-nav-item:hover { opacity: .85; background: rgba(0,0,0,.04); }
.cab-nav-item--active { opacity: 1; background: var(--glass-bg); font-weight: 500; }
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
    border: 1px solid var(--glass-border);
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
  .cab-footer-inner { padding: 14px 16px; }
}
</style>
