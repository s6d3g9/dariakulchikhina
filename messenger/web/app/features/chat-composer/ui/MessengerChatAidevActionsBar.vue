<script setup lang="ts">
defineProps<{
  visible: boolean
  activeTab: string | null
}>()

const emit = defineEmits<{
  'select-tab': [tab: string | null]
}>()

const actions = [
  { key: 'composer',      icon: 'mdi-chat-processing-outline', title: 'Composer' },
  { key: 'agents',        icon: 'mdi-robot-outline',           title: 'Агенты' },
  { key: 'connectors',    icon: 'mdi-connection',              title: 'Коннекторы' },
  { key: 'skills',        icon: 'mdi-lightning-bolt-outline',  title: 'Навыки' },
  { key: 'plugins',       icon: 'mdi-puzzle-outline',          title: 'Плагины' },
  { key: 'mcp',           icon: 'mdi-api',                     title: 'MCP' },
  { key: 'external-apis', icon: 'mdi-cloud-outline',           title: 'API' },
  { key: 'balancing',     icon: 'mdi-scale-balance',           title: 'Балансировка' },
  { key: 'settings',      icon: 'mdi-cog-outline',             title: 'Настройки' },
] as const

function onClick(key: string, active: boolean) {
  // Re-click на активной вкладке — закрыть панель.
  emit('select-tab', active ? null : key)
}
</script>

<template>
  <Transition name="aidev-bar-reveal">
    <div v-if="visible" class="aidev-bar" role="toolbar" aria-label="AIDev быстрые действия">
      <div class="aidev-bar__scroll">
        <button
          v-for="a in actions"
          :key="a.key"
          type="button"
          class="aidev-chip"
          :class="{ 'aidev-chip--active': activeTab === a.key }"
          :title="a.title"
          :aria-pressed="activeTab === a.key"
          @click="onClick(a.key, activeTab === a.key)"
        >
          <VIcon :size="13" class="aidev-chip__icon">{{ a.icon }}</VIcon>
          <span class="aidev-chip__label">{{ a.title }}</span>
        </button>
      </div>

      <button
        v-if="activeTab"
        type="button"
        class="aidev-bar__close"
        aria-label="Закрыть панель AIDev"
        title="Закрыть"
        @click="emit('select-tab', null)"
      >
        <VIcon :size="14">mdi-close</VIcon>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.aidev-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 4px 6px 6px;
  background: transparent;
  border: 0;
}

.aidev-bar__scroll {
  display: flex;
  gap: 3px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  flex: 1;
  min-width: 0;
  mask-image: linear-gradient(to right,
    transparent 0,
    #000 10px,
    #000 calc(100% - 10px),
    transparent 100%);
}
.aidev-bar__scroll::-webkit-scrollbar { display: none; }

.aidev-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 120ms ease;
}
.aidev-chip:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgb(var(--v-theme-on-surface));
}
.aidev-chip:active { transform: scale(0.97); }
.aidev-chip--active {
  background: rgb(var(--v-theme-secondary-container));
  border-color: transparent;
  color: rgb(var(--v-theme-on-secondary-container));
}
.aidev-chip__icon { opacity: 0.8; flex-shrink: 0; }
.aidev-chip:hover .aidev-chip__icon { opacity: 0.95; }
.aidev-chip--active .aidev-chip__icon { opacity: 1; }
.aidev-chip__label { line-height: 1; }

.aidev-bar__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
  flex-shrink: 0;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}
.aidev-bar__close:hover {
  background: rgba(var(--v-theme-error), 0.12);
  border-color: rgba(var(--v-theme-error), 0.4);
  color: rgb(var(--v-theme-error));
}

.aidev-bar-reveal-enter-active,
.aidev-bar-reveal-leave-active {
  transition: max-height 220ms ease, opacity 180ms ease, transform 200ms ease;
  max-height: 48px;
  transform-origin: center bottom;
}
.aidev-bar-reveal-enter-from,
.aidev-bar-reveal-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(6px);
}
</style>
