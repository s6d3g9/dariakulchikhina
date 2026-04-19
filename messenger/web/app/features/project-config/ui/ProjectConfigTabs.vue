<script setup lang="ts">
import type { MessengerProject } from '../../../entities/projects/model/useMessengerProjects'

defineProps<{
  project: MessengerProject
}>()

const activeTab = ref('agents')

const tabs = [
  { key: 'agents', label: 'Агенты', icon: 'mdi-robot-outline', live: true },
  { key: 'connectors', label: 'Коннекторы', icon: 'mdi-connection', live: false },
  { key: 'skills', label: 'Навыки', icon: 'mdi-lightning-bolt-outline', live: false },
  { key: 'plugins', label: 'Плагины', icon: 'mdi-puzzle-outline', live: false },
  { key: 'mcp', label: 'MCP', icon: 'mdi-api', live: false },
  { key: 'external-apis', label: 'Внешние API', icon: 'mdi-cloud-outline', live: false },
  { key: 'settings', label: 'Настройки', icon: 'mdi-cog-outline', live: false },
] as const
</script>

<template>
  <div class="project-config-tabs">
    <VTabs
      v-model="activeTab"
      class="project-config-tabs__nav"
      density="compact"
      show-arrows
    >
      <VTab
        v-for="tab in tabs"
        :key="tab.key"
        :value="tab.key"
        class="project-config-tabs__tab"
      >
        <VIcon start size="16">{{ tab.icon }}</VIcon>
        {{ tab.label }}
      </VTab>
    </VTabs>

    <VTabsWindow v-model="activeTab" class="project-config-tabs__panels">
      <!-- Agents tab — live -->
      <VTabsWindowItem value="agents" class="project-config-tabs__panel">
        <div class="project-config-tabs__agents-empty">
          <VIcon size="48" class="mb-3" color="secondary">mdi-robot-outline</VIcon>
          <p class="project-config-tabs__empty-title">Агентов пока нет</p>
          <p class="project-config-tabs__empty-hint">
            Нажмите «+», чтобы добавить агента в проект.
          </p>
          <VBtn color="primary" variant="flat" prepend-icon="mdi-plus" class="mt-4" disabled>
            Добавить агента
          </VBtn>
          <p class="project-config-tabs__coming-label mt-2">Выбор агентов — W6</p>
        </div>
      </VTabsWindowItem>

      <!-- Stub tabs -->
      <VTabsWindowItem
        v-for="tab in tabs.filter(t => !t.live)"
        :key="tab.key"
        :value="tab.key"
        class="project-config-tabs__panel"
      >
        <div class="project-config-tabs__stub">
          <VIcon size="48" class="mb-3" color="secondary">{{ tab.icon }}</VIcon>
          <p class="project-config-tabs__empty-title">{{ tab.label }}</p>
          <VChip color="warning" size="small" class="mt-2">Coming in W4 / W5</VChip>
          <p class="project-config-tabs__empty-hint mt-3">
            Этот раздел будет доступен в следующих волнах.
          </p>
        </div>
      </VTabsWindowItem>
    </VTabsWindow>
  </div>
</template>

<style scoped>
.project-config-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.project-config-tabs__nav {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.project-config-tabs__panels {
  flex: 1;
  overflow-y: auto;
}

.project-config-tabs__panel {
  padding: 24px 16px;
}

.project-config-tabs__agents-empty,
.project-config-tabs__stub {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
  min-height: 240px;
}

.project-config-tabs__empty-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.project-config-tabs__empty-hint {
  font-size: 0.875rem;
  opacity: 0.6;
  margin: 8px 0 0;
  max-width: 320px;
}

.project-config-tabs__coming-label {
  font-size: 0.75rem;
  opacity: 0.45;
}
</style>
