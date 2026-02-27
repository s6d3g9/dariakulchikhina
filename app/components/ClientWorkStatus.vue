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
          <span class="ws-badge" :class="statusClass(item.status)">
            {{ statusLabel(item.status) }}
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
const props = defineProps<{ slug: string }>()
const { data: items, pending } = await useFetch<any[]>(`/api/projects/${props.slug}/work-status`)

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: 'ожидание', planned: 'запланировано', in_progress: 'в работе',
    done: 'выполнено', paused: 'на паузе', cancelled: 'отменено'
  }
  return map[s] || s
}
function statusClass(s: string) {
  const map: Record<string, string> = {
    pending: 'ws-badge--pending',
    planned: 'ws-badge--planned',
    in_progress: 'ws-badge--progress',
    done: 'ws-badge--done',
    paused: 'ws-badge--paused',
    cancelled: 'ws-badge--cancelled',
  }
  return map[s] || 'ws-badge--pending'
}
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
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--glass-text); opacity: .5;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
}
.ws-badge--progress {
  color: rgba(160,100,0,1); opacity: 1;
  border-color: rgba(220,160,60,.4);
  background: rgba(255,200,80,.1);
}
.ws-badge--done {
  color: rgba(40,130,75,1); opacity: 1;
  border-color: rgba(60,160,100,.4);
  background: rgba(60,160,100,.08);
}
.ws-badge--cancelled {
  color: rgba(180,60,60,1); opacity: 1;
  border-color: rgba(220,80,80,.3);
  background: rgba(220,80,80,.07);
}
.ws-badge--pending,
.ws-badge--planned,
.ws-badge--paused { /* inherits base opacity */ }
</style>
