<template>
  <div class="ws-wrap glass-card">
    <h2 class="ws-title">Статусы работ</h2>
    <div v-if="pending" class="ws-empty">Загрузка...</div>
    <div v-else-if="!items?.length" class="ws-empty">Нет задач</div>
    <div v-else class="ws-list">
      <div
        v-for="item in items"
        :key="item.id"
        class="ws-card glass-surface"
      >
        <div class="ws-head">
          <span class="ws-item-title">{{ item.title }}</span>
          <span class="ws-badge" :class="workStatusCssClass(item.status)">
            {{ workStatusLabel(item.status) }}
          </span>
        </div>
        <div v-if="item.dateStart || item.dateEnd" class="ws-meta">
          {{ item.dateStart }} — {{ item.dateEnd }}
        </div>
        <div v-if="item.budget" class="ws-meta">{{ item.budget }}</div>
        <div v-if="item.notes" class="ws-meta ws-notes">{{ item.notes }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { workStatusLabel, workStatusCssClass } from '~~/shared/utils/work-status'

const props = defineProps<{ slug: string }>()
const { data: items, pending } = await useFetch<any[]>(`/api/projects/${props.slug}/work-status`)
</script>

<style scoped>
.ws-wrap { padding: 14px; }

.ws-title {
  margin: 0 0 14px;
  font-size: .78rem;
  letter-spacing: .9px;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .45;
}
.ws-empty { color: var(--glass-text); opacity: .35; font-size: .86rem; }
.ws-list { display: grid; gap: 8px; }

.ws-card {
  border-radius: 10px;
  padding: 12px 14px;
}
.ws-head {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 10px;
}
.ws-item-title { font-size: .88rem; font-weight: 500; color: var(--glass-text); }
.ws-meta { margin-top: 6px; font-size: .78rem; color: var(--glass-text); opacity: .5; }
.ws-notes { font-style: italic; white-space: pre-line; }

/* Badges */
.ws-badge {
  font-size: .65rem; letter-spacing: .4px; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px; white-space: nowrap; flex-shrink: 0;
  border: none;
  background: var(--glass-bg);
  color: var(--glass-text); opacity: .5;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
}
.ws-badge.ws-status--progress {
  color: var(--ws-color-progress); opacity: 1;
  background: var(--ws-bg-progress);
}
.ws-badge.ws-status--done {
  color: var(--ws-color-done); opacity: 1;
  background: var(--ws-bg-done);
}
.ws-badge.ws-status--cancelled {
  color: var(--ws-color-cancelled); opacity: 1;
  background: var(--ws-bg-cancelled);
}
.ws-badge.ws-status--planned {
  color: var(--ws-color-planned); opacity: 1;
  background: var(--ws-bg-planned);
}
.ws-badge.ws-status--paused {
  color: var(--ws-color-paused); opacity: 1;
  background: var(--ws-bg-paused);
}
</style>
