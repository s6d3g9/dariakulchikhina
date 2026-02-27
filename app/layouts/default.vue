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
  --bg: #f8f8f8;
  --header-bg: #ffffff;
  --border: #e6e6e6;
  --title: #888888;

  min-height: 100vh;
  background: var(--bg);
}


.default-header {
  border-bottom: 1px solid var(--border);
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
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--header-bg) 72%, #f7f7f7 28%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
  cursor: pointer;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
}

</style>