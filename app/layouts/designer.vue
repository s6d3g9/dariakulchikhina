<template>
  <div class="designer-root glass-page">
    <header class="designer-header glass-surface">
      <div class="designer-brand">
        <span class="designer-logo">◈</span>
        <div class="designer-brand-text">
          <span class="designer-title">кабинет дизайнера</span>
          <span v-if="designerName" class="designer-user-name">{{ designerName }}</span>
        </div>
      </div>
      <nav class="designer-nav">
        <NuxtLink to="/designer" class="designer-nav-link" active-class="designer-nav-active" exact>
          Проекты
        </NuxtLink>
        <NuxtLink to="/designer/profile" class="designer-nav-link" active-class="designer-nav-active">
          Профиль
        </NuxtLink>
      </nav>
      <div class="designer-actions">
        <button
          type="button"
          class="theme-dot glass-chip"
          :aria-label="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
          @click="toggleTheme"
        ></button>
        <button class="designer-logout-btn glass-chip" @click="logout">Выйти</button>
      </div>
    </header>
    <main class="designer-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { isDark, toggleTheme } = useThemeToggle()

const { data: meData } = await useFetch<any>('/api/auth/me')
const designerName = computed(() => meData.value?.name || '')

async function logout() {
  await $fetch('/api/auth/designer-logout', { method: 'POST' })
  router.push('/designer/login')
}
</script>

<style scoped>
.designer-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--glass-page-bg, #f8f8f8);
}

.designer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--glass-border, #e6e6e6);
  position: sticky;
  top: 0;
  z-index: 100;
}

.designer-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.designer-logo {
  font-size: 1.5rem;
  line-height: 1;
  color: var(--glass-accent, #6366f1);
}

.designer-brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.designer-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--glass-label, #888);
  font-weight: 600;
}

.designer-user-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--glass-text, #222);
}

.designer-nav {
  display: flex;
  gap: 0.25rem;
}

.designer-nav-link {
  padding: 0.35rem 0.9rem;
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--glass-text, #444);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.designer-nav-link:hover {
  background: var(--glass-hover, rgba(0,0,0,0.06));
}

.designer-nav-active {
  background: var(--glass-accent, #6366f1) !important;
  color: #fff !important;
}

.designer-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.designer-logout-btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--glass-border, #ddd);
  background: transparent;
  color: var(--glass-text, #444);
  transition: background 0.15s;
}

.designer-logout-btn:hover {
  background: var(--glass-hover, rgba(0,0,0,0.06));
}

.designer-main {
  flex: 1;
  padding: 1.5rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .designer-header {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }

  .designer-nav {
    order: 3;
    width: 100%;
  }
}
</style>
