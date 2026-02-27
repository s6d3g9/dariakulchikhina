<template>
  <div class="cabinet-root glass-page">
    <header class="cabinet-header glass-surface">
      <div class="cabinet-header-inner">
        <span class="cabinet-title">Личный кабинет</span>
        <div class="cabinet-actions">
          <button
            type="button"
            class="theme-dot glass-chip"
            :aria-label="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
            @click="toggleTheme"
          ></button>
          <button class="cabinet-logout glass-chip" @click="logout">выйти</button>
        </div>
      </div>
    </header>

    <main class="cabinet-main">
      <div class="cabinet-main-inner">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { isDark, toggleTheme } = useThemeToggle()

async function logout() {
  await $fetch('/api/auth/client-logout', { method: 'POST' })
  router.push('/client/login')
}
</script>

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