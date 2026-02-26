<template>
  <div class="admin-bg">
    <header class="admin-header">
      <span class="admin-brand">админ-панель</span>
      <div class="admin-header-links">
        <a href="/" target="_blank" class="admin-link">открыть сайт ↗</a>
        <a href="#" class="admin-link" @click.prevent="logout">выйти</a>
      </div>
    </header>
    <div class="admin-container">
      <div class="admin-tabs">
        <NuxtLink
          to="/admin"
          class="admin-tab"
          :class="{ 'admin-tab--active': isProjectsTab }"
        >проекты</NuxtLink>
        <NuxtLink
          to="/admin/contractors"
          class="admin-tab admin-tab--settings"
          :class="{ 'admin-tab--active': route.path.startsWith('/admin/contractors') }"
        >подрядчики</NuxtLink>
        <NuxtLink
          to="/admin/pages"
          class="admin-tab admin-tab--settings"
          :class="{ 'admin-tab--active': route.path.startsWith('/admin/pages') }"
        >⚙ страницы</NuxtLink>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()

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
  background: #f5f5f5;
  min-height: 100vh;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.admin-header {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.admin-brand {
  font-size: .7rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #888;
}
.admin-header-links { display: flex; gap: 16px; align-items: center; }
.admin-link { font-size: .8rem; color: #888; text-decoration: none; }
.admin-link:hover { color: #1a1a1a; }
.admin-container { max-width: 900px; margin: 24px auto; padding: 0 16px; }
.admin-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.admin-tab {
  padding: 8px 16px;
  border: 1px solid #ddd;
  text-decoration: none;
  color: #666;
  font-size: .82rem;
  border-radius: 2px;
}
.admin-tab:hover { border-color: #1a1a1a; color: #1a1a1a; }
.admin-tab--active { border-color: #1a1a1a; color: #1a1a1a; font-weight: 500; }
.admin-tab--settings { border-style: dashed; font-size: .78rem; }
.admin-tab--settings:first-of-type { margin-left: auto; }
</style>
