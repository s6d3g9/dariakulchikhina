<template>
  <div class="default-root glass-page">
    <header class="default-header glass-surface">
      <div class="default-header-inner">
        <span class="default-title">Daria Kulchikhina</span>
        <button
          type="button"
          class="theme-dot"
          :aria-label="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
          @click="toggleTheme"
        ></button>
      </div>
    </header>
    <slot />
  </div>
</template>

<script setup lang="ts">
const { isDark, toggleTheme } = useThemeToggle()
</script>

<style scoped>
.default-root {
  --bg: var(--glass-page-bg, #f8f8f8);
  --header-bg: var(--glass-bg, #ffffff);
  --border: var(--glass-border, #e6e6e6);
  --title: color-mix(in srgb, var(--glass-text, #888) 55%, transparent);

  min-height: 100vh;
  background: var(--bg);
}


.default-header {
  border-bottom: none;
  background: var(--header-bg);
}

.default-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.default-title {
  font-size: .7rem;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--title);
}

.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: none;
  background: color-mix(in srgb, var(--header-bg) 72%, var(--bg) 28%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
  cursor: pointer;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .default-header-inner {
    padding: 8px 12px;
  }
  .default-title {
    font-size: .6rem;
    letter-spacing: 1px;
  }
}

</style>