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
.ws-wrap {
  --w-title: #666;
  --w-muted: #9a9a9a;
  --w-card-bg: #fff;
  --w-card-border: #e4e4e4;
  --w-text: #1f1f1f;
  --w-text-soft: #8a8a8a;
  --w-badge-border: #d8d8d8;
  --b-pending-color: #777;
  --b-pending-border: #d8d8d8;
  --b-pending-bg: #fafafa;
  --b-progress-color: #8a5b00;
  --b-progress-border: #e0c694;
  --b-progress-bg: #fff8ed;
  --b-done-color: #2e6a3f;
  --b-done-border: #b8d8c1;
  --b-done-bg: #f2faf4;
  --b-cancel-color: #a04949;
  --b-cancel-border: #e4c4c4;
  --b-cancel-bg: #fff7f7;
  padding: 14px;
}


.ws-title {
  margin: 0 0 10px;
  font-size: .78rem;
  letter-spacing: .9px;
  text-transform: uppercase;
  color: var(--w-title);
}
.ws-empty { color: var(--w-muted); font-size: .86rem; }
.ws-list { display: grid; gap: 8px; }
.ws-card {
  border: 1px solid var(--w-card-border);
  background: var(--w-card-bg);
  padding: 12px;
}
.ws-head {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 8px;
}
.ws-item-title { font-size: .88rem; font-weight: 500; color: var(--w-text); }
.ws-meta { margin-top: 6px; font-size: .78rem; color: var(--w-text-soft); }
.ws-badge {
  font-size: .68rem; letter-spacing: .5px; text-transform: uppercase;
  border: 1px solid var(--w-badge-border); padding: 2px 6px; white-space: nowrap;
}
.ws-badge--pending,
.ws-badge--planned,
.ws-badge--paused {
  color: var(--b-pending-color);
  border-color: var(--b-pending-border);
  background: var(--b-pending-bg);
}
.ws-badge--progress {
  color: var(--b-progress-color);
  border-color: var(--b-progress-border);
  background: var(--b-progress-bg);
}
.ws-badge--done {
  color: var(--b-done-color);
  border-color: var(--b-done-border);
  background: var(--b-done-bg);
}
.ws-badge--cancelled {
  color: var(--b-cancel-color);
  border-color: var(--b-cancel-border);
  background: var(--b-cancel-bg);
}
</style>
