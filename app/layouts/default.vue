<template>
  <div class="default-root glass-page">
    <header class="default-header glass-surface">
      <div class="default-header-inner">
        <span class="default-title">Daria Kulchikhina</span>
        <button
          type="button"
          class="default-theme-btn"
          @click="toggleTheme"
        >{{ isDark ? 'светло' : 'темно' }}</button>
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

.default-theme-btn {
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 0;
  color: var(--title);
  cursor: pointer;
  font-size: .62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 3px 8px;
  appearance: none;
  -webkit-appearance: none;
  transition: opacity .15s;
}
.default-theme-btn:hover { opacity: .7; }

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