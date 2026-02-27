<template>
  <div class="admin-bg glass-page">
    <header class="admin-header glass-surface">
      <span class="admin-brand">админ-панель</span>
      <div class="admin-header-links">
        <button
          type="button"
          class="theme-dot"
          :aria-label="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
          @click="toggleTheme"
        ></button>
        <a href="/" target="_blank" class="admin-link">открыть сайт ↗</a>
        <a href="#" class="admin-link" @click.prevent="logout">выйти</a>
      </div>
    </header>
    <div class="admin-container">
      <div class="admin-tabs">
        <NuxtLink
          to="/admin"
          class="admin-tab glass-chip"
          :class="{ 'admin-tab--active': isProjectsTab }"
        >проекты</NuxtLink>
        <NuxtLink
          to="/admin/contractors"
          class="admin-tab admin-tab--settings glass-chip"
          :class="{ 'admin-tab--active': route.path.startsWith('/admin/contractors') }"
        >подрядчики</NuxtLink>
        <NuxtLink
          to="/admin/pages"
          class="admin-tab admin-tab--settings glass-chip"
          :class="{ 'admin-tab--active': route.path.startsWith('/admin/pages') }"
        >⚙ страницы</NuxtLink>
        <NuxtLink
          to="/admin/roadmap-templates"
          class="admin-tab admin-tab--settings glass-chip"
          :class="{ 'admin-tab--active': route.path.startsWith('/admin/roadmap-templates') }"
        >⚙ шаблоны и сценарии</NuxtLink>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const { isDark, toggleTheme } = useThemeToggle()

const isProjectsTab = computed(() =>
  route.path === '/admin' || route.path.startsWith('/admin/projects')
)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  router.push('/admin/login')
}
</script>

<style scoped>
.admin-bg {
  --bg: #f5f5f5;
  --header-bg: #ffffff;
  --border: #e0e0e0;
  --text: #1a1a1a;
  --muted: #888888;
  --tab-border: #dddddd;
  --tab-text: #666666;

  background: var(--bg);
  min-height: 100vh;
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}


.admin-header {
  background: var(--header-bg);
  border-bottom: 1px solid transparent;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 16px 16px;
}
.admin-brand {
  font-size: .7rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}
.admin-header-links { display: flex; gap: 16px; align-items: center; }
.admin-link { font-size: .8rem; color: var(--muted); text-decoration: none; }
.admin-link:hover { color: var(--text); }
.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid var(--tab-border);
  background: color-mix(in srgb, var(--header-bg) 72%, #f7f7f7 28%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
  cursor: pointer;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
}
.admin-container { max-width: 900px; margin: 24px auto; padding: 0 16px; }
.admin-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.admin-tab {
  padding: 8px 16px;
  text-decoration: none;
  color: var(--tab-text);
  font-size: .82rem;
  border-radius: 999px;
}
.admin-tab:hover { border-color: var(--text); color: var(--text); }
.admin-tab--active { border-color: var(--text); color: var(--text); font-weight: 500; }
.admin-tab--settings { border-style: dashed; font-size: .78rem; }
.admin-tab--settings:first-of-type { margin-left: auto; }
</style>
