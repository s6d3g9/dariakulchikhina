<script setup lang="ts">
import type { Ref } from 'vue'
import type { MessengerCliSession } from '../../../entities/sessions/model/useMessengerCliSessions'
import { useMonitorTopology, type MonitorMode } from '../model/useMonitorTopology'

const props = defineProps<{
  sessions: MessengerCliSession[]
  activeSlug?: string | null
}>()

const emit = defineEmits<{
  'open-session': [slug: string]
  'mode-change': [mode: MonitorMode]
}>()

const sessionsRef = computed(() => props.sessions) as Ref<MessengerCliSession[]>
const mode = ref<MonitorMode>('live')

const { flatSorted, counters } = useMonitorTopology(sessionsRef, mode)

watch(mode, (m) => emit('mode-change', m))
</script>

<template>
  <div class="monitor-tree">
    <div class="monitor-tree__toolbar">
      <v-btn-toggle
        v-model="mode"
        density="compact"
        mandatory
        rounded="xl"
        color="primary"
        variant="outlined"
      >
        <v-btn value="live" size="small">
          <v-icon icon="mdi-lightning-bolt" size="14" class="me-1" />
          Live
        </v-btn>
        <v-btn value="today" size="small">
          <v-icon icon="mdi-calendar-today" size="14" class="me-1" />
          За сегодня
        </v-btn>
      </v-btn-toggle>

      <span class="monitor-tree__counters">
        <span class="monitor-tree__counter">
          <v-icon icon="mdi-brain" size="12" color="primary" />
          {{ counters.composers }}
        </span>
        <span class="monitor-tree__counter">
          <v-icon icon="mdi-sitemap-outline" size="12" color="secondary" />
          {{ counters.orchestrators }}
        </span>
        <span class="monitor-tree__counter">
          <v-icon icon="mdi-cog-outline" size="12" color="info" />
          {{ counters.workers }}
        </span>
        <span class="monitor-tree__counter monitor-tree__counter--active" :class="{ 'is-zero': counters.active === 0 }">
          <span class="monitor-tree__pulse" />
          активных {{ counters.active }}
        </span>
      </span>
    </div>

    <v-virtual-scroll
      v-if="flatSorted.length"
      :items="flatSorted"
      :item-height="32"
      class="monitor-tree__scroller"
    >
      <template #default="{ item }">
        <MonitorSessionRow
          :row="item"
          :active="activeSlug === item.session.slug"
          @open-session="(slug) => emit('open-session', slug)"
        />
      </template>
    </v-virtual-scroll>

    <div v-else class="monitor-tree__empty">
      <v-icon icon="mdi-monitor-off" size="32" class="mb-2" />
      <div>{{ mode === 'live' ? 'Нет активных сессий' : 'Сегодня сессий ещё не было' }}</div>
    </div>
  </div>
</template>

<style scoped>
.monitor-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.monitor-tree__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid color-mix(in srgb, rgb(var(--v-theme-outline)) 18%, transparent);
  background: rgb(var(--v-theme-surface));
  flex-wrap: wrap;
}

.monitor-tree__counters {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-left: auto;
}

.monitor-tree__counter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.monitor-tree__counter--active {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.monitor-tree__counter--active.is-zero {
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 400;
}

.monitor-tree__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 50%, transparent);
  animation: monitor-tree-pulse 1.6s ease-in-out infinite;
}

.monitor-tree__counter--active.is-zero .monitor-tree__pulse {
  background: rgb(var(--v-theme-outline));
  animation: none;
}

@keyframes monitor-tree-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 50%, transparent); }
  70%  { box-shadow: 0 0 0 5px color-mix(in srgb, rgb(var(--v-theme-primary)) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 0%, transparent); }
}

.monitor-tree__scroller {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.monitor-tree__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
  padding: 32px 16px;
}
</style>
