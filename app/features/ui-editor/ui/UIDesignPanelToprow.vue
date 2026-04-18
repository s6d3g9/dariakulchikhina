<template>
  <div class="dp-panel-toprow">
    <nav class="dp-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="dp-tab"
        :class="{ 'dp-tab--active': activeTab === tab.id }"
        @click="$emit('update:activeTab', tab.id)"
      >{{ tab.label }}</button>
    </nav>
    <div class="dp-panel-actions">
      <div class="dp-search-wrap">
        <svg class="dp-search-icon" width="12" height="12" viewBox="0 0 13 13" fill="none">
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.2" />
          <path d="M8.5 8.5L12 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        <GlassInput
          :model-value="searchQuery"
          class="glass-input --sm"
          placeholder="поиск…"
          type="text"
          @update:model-value="(v: string | number | null) => $emit('update:searchQuery', String(v ?? ''))"
        />
        <button v-if="searchQuery" type="button" class="dp-search-clear" @click="$emit('update:searchQuery', '')">✕</button>
      </div>
      <button
        v-if="showExportButton"
        type="button"
        class="dp-icon-btn"
        title="Экспорт / Импорт"
        @click="$emit('toggle-export')"
      >
        <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 2v7M4 6l3 3 3-3M3 11h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <button type="button" class="dp-icon-btn dp-icon-btn--danger" title="Сбросить" @click="$emit('reset')">
        <svg width="13" height="13" viewBox="0 0 14 14"><path d="M2.5 4.5h9M5.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4 4.5v7a1 1 0 001 1h4a1 1 0 001-1v-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <button type="button" class="dp-icon-btn" title="Закрыть (Esc)" @click="$emit('close')">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TabEntry {
  id: string
  label: string
}

defineProps<{
  tabs: readonly TabEntry[]
  activeTab: string
  searchQuery: string
  showExportButton: boolean
}>()

defineEmits<{
  'update:activeTab': [id: string]
  'update:searchQuery': [q: string]
  'toggle-export': []
  reset: []
  close: []
}>()
</script>
