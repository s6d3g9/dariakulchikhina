<template>
  <div class="cab-root glass-page" :class="{ 'cab-dark': isDark }">
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

    <main class="cab-main">
      <div class="cab-inner">
        <slot />
      </div>
    </main>

    <footer class="cab-footer">
      <div class="cab-footer-inner">
        <span class="cab-footer-copy">© Daria Kulchikhina Design Studio</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const { isDark, toggleTheme } = useThemeToggle()

const projectSlug = computed(() => route.params.slug as string || '')

// Fetch project name for header
const { data: project } = await useFetch<any>(
  () => projectSlug.value ? `/api/projects/${projectSlug.value}` : null,
  { server: false }
)
const projectTitle = computed(() => project.value?.title || '')

async function logout() {
  await $fetch('/api/auth/client-logout', { method: 'POST' })
  router.push('/client/login')
}
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────── */
.cab-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Header ────────────────────────────────────────────────────── */
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
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 24px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cab-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--glass-text);
}
.cab-logo-mark {
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.cab-logo-sep {
  width: 1px;
  height: 14px;
  background: var(--glass-border);
}
.cab-project-name {
  font-size: .74rem;
  letter-spacing: .8px;
  color: var(--glass-text);
  opacity: .5;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cab-header-actions { display: flex; align-items: center; gap: 10px; }

.cab-btn-icon {
  border: none; background: none; cursor: pointer; padding: 6px;
  color: var(--glass-text); opacity: .45; font-size: .9rem; line-height: 1;
  transition: opacity .15s;
}
.cab-btn-icon:hover { opacity: 1; }
.cab-theme-icon { display: block; }

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

/* ── Main ────────────────────────────────────────────────────── */
.cab-main { flex: 1; }
.cab-inner {
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

/* ── Footer ─────────────────────────────────────────────────── */
.cab-footer {
  border-top: 1px solid var(--glass-border);
}
.cab-footer-inner {
  max-width: 1040px;
  margin: 0 auto;
  padding: 14px 24px;
}
.cab-footer-copy {
  font-size: .68rem;
  letter-spacing: .5px;
  color: var(--glass-text);
  opacity: .4;
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .cab-header-inner { padding: 0 16px; }
  .cab-inner { padding: 20px 16px 36px; }
  .cab-project-name { max-width: 120px; }
}
</style>
