<template>
  <div class="cws-wrap glass-card">
    <h2 class="cws-title">Статусы работ</h2>
    <div v-if="pending" class="cws-empty">Загрузка...</div>
    <div v-else-if="!items?.length" class="cws-empty">Нет задач</div>
    <div v-else class="cws-list">
      <div
        v-for="item in items"
        :key="item.id"
        class="cws-card glass-surface"
      >
        <div class="cws-head">
          <span class="cws-item-title">{{ item.title }}</span>
          <span class="cws-badge" :class="workStatusCssClass(item.status)">
            {{ workStatusLabel(item.status) }}
          </span>
        </div>
        <div v-if="item.dateStart || item.dateEnd" class="cws-meta">
          {{ item.dateStart }} — {{ item.dateEnd }}
        </div>
        <div v-if="item.budget" class="cws-meta">{{ item.budget }}</div>
        <div v-if="item.notes" class="cws-meta cws-notes">{{ item.notes }}</div>
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
.cws-wrap { padding: 14px; }

.cws-title {
  margin: 0 0 14px;
  font-size: .78rem;
  letter-spacing: .9px;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .45;
}
.cws-empty { color: var(--glass-text); opacity: .35; font-size: .86rem; }
.cws-list { display: grid; gap: 8px; }

.cws-card {
  border-radius: 10px;
  padding: 12px 14px;
}
.cws-head {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 10px;
}
.cws-item-title { font-size: .88rem; font-weight: 500; color: var(--glass-text); }
.cws-meta { margin-top: 6px; font-size: .78rem; color: var(--glass-text); opacity: .5; }
.cws-notes { font-style: italic; white-space: pre-line; }

/* Badges */
.cws-badge {
  font-size: .65rem; letter-spacing: .4px; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px; white-space: nowrap; flex-shrink: 0;
  border: none;
  background: var(--glass-bg);
  color: var(--glass-text); opacity: .5;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
}
.cws-badge.cws-status--progress {
  color: var(--cws-color-progress); opacity: 1;
  background: var(--cws-bg-progress);
}
.cws-badge.cws-status--done {
  color: var(--cws-color-done); opacity: 1;
  background: var(--cws-bg-done);
}
.cws-badge.cws-status--cancelled {
  color: var(--cws-color-cancelled); opacity: 1;
  background: var(--cws-bg-cancelled);
}
.cws-badge.cws-status--planned {
  color: var(--cws-color-planned); opacity: 1;
  background: var(--cws-bg-planned);
}
.cws-badge.cws-status--paused {
  color: var(--cws-color-paused); opacity: 1;
  background: var(--cws-bg-paused);
}
</style>
