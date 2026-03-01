<template>
  <div class="contractor-root glass-page">
    <header class="contractor-header glass-surface">
      <span class="contractor-title">Кабинет подрядчика</span>
      <div class="contractor-actions">
        <NuxtLink to="/admin" class="contractor-back-link">← админка</NuxtLink>
        <button
          type="button"
          class="theme-dot glass-chip"
          :aria-label="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
          @click="toggleTheme"
        ></button>
        <UButton class="glass-chip" variant="ghost" size="sm" @click="logout">Выйти</UButton>
      </div>
    </header>
    <main class="contractor-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const { isDark, toggleTheme } = useThemeToggle()
async function logout() {
  await $fetch('/api/auth/contractor-logout', { method: 'POST' })
  router.push('/contractor/login')
}
</script>

<style scoped>
.contractor-root {
  --bg: #ffffff;
  --border: #e6e6e6;
  --title: #888888;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}


.contractor-header {
  border-bottom: 1px solid transparent;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 16px 16px;
}

.contractor-title {
  font-size: .74rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--title);
}

.contractor-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.contractor-back-link {
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
.contractor-back-link:hover { opacity: .9; }

.contractor-main {
  flex: 1;
  padding: 24px;
}

.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: none;
  background: color-mix(in srgb, var(--bg) 72%, #f7f7f7 28%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
}

</style>