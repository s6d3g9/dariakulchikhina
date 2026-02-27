<template>
  <div class="cab-root" :class="{ 'cab-dark': isDark }">
    <header class="cab-header">
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
/* ── Base ─────────────────────────────────────────────────────── */
.cab-root {
  --c-bg:       #ffffff;
  --c-bg2:      #f8f8f7;
  --c-text:     #1a1a1a;
  --c-muted:    #888;
  --c-border:   #e8e8e4;
  --c-accent:   #1a1a1a;
  --c-ok:       #2d7a4a;
  --c-warn:     #c87400;
  --c-err:      #ba2626;

  min-height: 100vh;
  background: var(--c-bg);
  color: var(--c-text);
  font-family: inherit;
  display: flex;
  flex-direction: column;
}

/* Dark */
.cab-dark {
  --c-bg:     #0f0f0f;
  --c-bg2:    #1a1a1a;
  --c-text:   #e8e8e4;
  --c-muted:  #666;
  --c-border: #2a2a2a;
  --c-accent: #e8e8e4;
}

/* ── Header ────────────────────────────────────────────────────── */
.cab-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--c-bg);
  border-bottom: 1px solid var(--c-border);
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
  color: var(--c-text);
}
.cab-logo-mark {
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--c-accent);
}
.cab-logo-sep {
  width: 1px;
  height: 14px;
  background: var(--c-border);
}
.cab-project-name {
  font-size: .74rem;
  letter-spacing: .8px;
  color: var(--c-muted);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cab-header-actions { display: flex; align-items: center; gap: 10px; }

.cab-btn-icon {
  border: none; background: none; cursor: pointer; padding: 6px;
  color: var(--c-muted); font-size: .9rem; line-height: 1;
}
.cab-btn-icon:hover { color: var(--c-text); }
.cab-theme-icon { display: block; }

.cab-btn-text {
  border: 1px solid var(--c-border); background: none;
  cursor: pointer; padding: 5px 12px;
  font-size: .72rem; letter-spacing: .6px; text-transform: uppercase;
  color: var(--c-muted); font-family: inherit;
}
.cab-btn-text:hover { border-color: var(--c-text); color: var(--c-text); }

/* ── Main ────────────────────────────────────────────────────── */
.cab-main { flex: 1; }
.cab-inner {
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

/* ── Footer ─────────────────────────────────────────────────── */
.cab-footer {
  border-top: 1px solid var(--c-border);
  background: var(--c-bg);
}
.cab-footer-inner {
  max-width: 1040px;
  margin: 0 auto;
  padding: 14px 24px;
}
.cab-footer-copy {
  font-size: .68rem;
  letter-spacing: .5px;
  color: var(--c-muted);
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .cab-header-inner { padding: 0 16px; }
  .cab-inner { padding: 20px 16px 36px; }
  .cab-project-name { max-width: 120px; }
}
</style>


<style scoped>
.cabinet-root {
  --bg: #ffffff;
  --border: #e6e6e6;
  --text: #1a1a1a;
  --muted: #888888;
  --btn-border: #d8d8d8;
  --btn-text: #555555;

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}


.cabinet-header {
  border-bottom: 1px solid transparent;
  background: var(--bg);
  border-radius: 0 0 16px 16px;
}

.cabinet-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cabinet-title {
  font-size: .74rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
}

.cabinet-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cabinet-logout {
  border: 1px solid var(--btn-border);
  background: color-mix(in srgb, var(--bg) 74%, #ffffff 26%);
  color: var(--btn-text);
  font-size: .74rem;
  letter-spacing: .6px;
  text-transform: uppercase;
  padding: 6px 10px;
  cursor: pointer;
  font-family: inherit;
}

.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid var(--btn-border);
  background: color-mix(in srgb, var(--bg) 72%, #f7f7f7 28%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
}


.cabinet-logout:hover {
  border-color: var(--text);
  color: var(--text);
}

.cabinet-main-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px 32px;
}

@media (max-width: 768px) {
  .cabinet-header-inner {
    padding: 10px 12px;
  }

  .cabinet-title {
    font-size: .68rem;
    letter-spacing: 1.1px;
  }

  .cabinet-actions {
    gap: 8px;
  }

  .cabinet-logout {
    padding: 5px 8px;
    font-size: .7rem;
  }

  .cabinet-main-inner {
    padding: 0 12px 20px;
  }
}

/* ── dark theme: fix logout button ── */
</style>