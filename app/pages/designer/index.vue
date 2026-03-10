<template>
  <div class="designer-dashboard">
    <div class="dashboard-header">
      <div class="dashboard-title-group">
        <h1 class="dashboard-title">Мои проекты</h1>
        <span class="dashboard-count" v-if="!pending">{{ projects.length }} проект{{ projectsWord }}</span>
      </div>
      <div class="header-right">
        <div class="view-toggle">
          <button @click="viewMode='list'" class="toggle-btn" :class="{ active: viewMode==='list' }" title="Список">☰</button>
          <button @click="viewMode='board'" class="toggle-btn" :class="{ active: viewMode==='board' }" title="Доска">⊞</button>
        </div>
        <NuxtLink to="/designer/projects/new" class="btn-create">+ Создать проект</NuxtLink>
      </div>
    </div>

    <div v-if="pending" class="dashboard-loading">
      <span class="spinner"></span>
      Загрузка…
    </div>

    <div v-else-if="error" class="dashboard-error glass-surface">
      Не удалось загрузить проекты
    </div>

    <div v-else-if="!projects.length" class="dashboard-empty glass-surface">
      <div class="empty-icon">◈</div>
      <p>Проектов пока нет</p>
      <NuxtLink to="/designer/projects/new" class="btn-create">Создать первый проект</NuxtLink>
    </div>

    <!-- LIST MODE -->
    <template v-else-if="viewMode==='list'">
      <div class="projects-grid">
        <NuxtLink
          v-for="row in projects"
          :key="row.id"
          :to="`/designer/projects/${row.id}`"
          class="project-card glass-surface"
        >
          <div class="project-card-header">
            <div class="project-status-dot" :class="`status-${row.status}`"></div>
            <span class="project-status-label">{{ statusLabel(row.status) }}</span>
          </div>
          <h2 class="project-card-title">{{ row.projectTitle || '—' }}</h2>
          <div class="project-client" v-if="row.clientName">
            <span class="client-icon">👤</span>
            {{ row.clientName }}
            <span v-if="row.clientPhone" class="client-phone">{{ row.clientPhone }}</span>
          </div>
          <div class="project-card-meta">
            <span v-if="row.area">{{ row.area }} м²</span>
            <span v-if="row.totalPrice">{{ formatPrice(row.totalPrice) }}</span>
            <span v-if="row.packageKey" class="project-package">{{ row.packageKey }}</span>
          </div>
          <div class="project-card-footer">
            <span class="project-date">{{ formatDate(row.updatedAt || row.createdAt) }}</span>
            <span class="project-arrow">→</span>
          </div>
        </NuxtLink>
      </div>
    </template>

    <!-- BOARD MODE -->
    <template v-else>
      <div class="kanban-board">
        <div
          v-for="col in kanbanStages"
          :key="col.key"
          class="kanban-col"
          :class="{ 'drag-over': dragOverStage === col.key }"
          @dragover.prevent="dragOverStage = col.key"
          @dragleave="dragOverStage = null"
          @drop.prevent="onDrop(col.key)"
        >
          <div class="kanban-col-header">
            <span class="kanban-stage-num">{{ col.num }}</span>
            <span class="kanban-col-title">{{ col.label }}</span>
            <span class="kanban-col-count">{{ byStage(col.key).length }}</span>
          </div>
          <div class="kanban-cards">
            <div
              v-for="row in byStage(col.key)"
              :key="row.id"
              class="kanban-card glass-surface"
              draggable="true"
              @dragstart="onDragStart(row)"
              @dragend="dragOverStage = null"
              @click="navigateTo(`/designer/projects/${row.id}`)"
            >
              <div class="kc-title">{{ row.projectTitle || '—' }}</div>
              <div class="kc-client" v-if="row.clientName">
                <span>👤</span> {{ row.clientName }}
              </div>
              <div class="kc-meta">
                <span v-if="row.area">{{ row.area }} м²</span>
                <span v-if="row.totalPrice">{{ formatPrice(row.totalPrice) }}</span>
              </div>
              <div class="kc-date">{{ formatDate(row.updatedAt || row.createdAt) }}</div>
            </div>
            <div v-if="!byStage(col.key).length" class="kanban-empty">Нет проектов</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'designer', middleware: 'designer' })

const { data, pending, error, refresh } = await useFetch<any[]>('/api/designer/projects')
const projects = computed(() => data.value ?? [])

const viewMode = ref<'list' | 'board'>('board')

const STAGE_DEFAULT = 'smart_brief'

const kanbanStages = [
  { key: 'smart_brief',  label: 'Смарт-бриф',       num: '01' },
  { key: 'planning',     label: 'Планировка',         num: '02' },
  { key: 'moodboard',    label: 'Мудборд',            num: '03' },
  { key: 'build_plan',   label: 'Стройплан',          num: '04' },
  { key: 'drawings',     label: 'Чертежи',            num: '05' },
  { key: 'engineering',  label: 'Инженерия',          num: '06' },
  { key: 'materials',    label: 'Материалы',          num: '07' },
  { key: 'procurement',  label: 'Закупки',            num: '08' },
  { key: 'construction', label: 'Стройка',            num: '09' },
  { key: 'photoshoot',   label: 'Фотосъёмка',         num: '10' },
  { key: 'remarks',      label: 'Замечания',          num: '11' },
  { key: 'act',          label: 'Акт',                num: '12' },
  { key: 'final_album',  label: 'Финальный альбом',   num: '13' },
  { key: 'extras',       label: 'Допы',               num: '14' },
]

function byStage(key: string) {
  return projects.value.filter(p => (p.stage || STAGE_DEFAULT) === key)
}

// Drag-and-drop
const dragProjectId = ref<number | null>(null)
const dragFromStage = ref<string | null>(null)
const dragOverStage = ref<string | null>(null)

function onDragStart(row: any) {
  dragProjectId.value = row.id
  dragFromStage.value = row.stage || STAGE_DEFAULT
}

async function onDrop(toStage: string) {
  dragOverStage.value = null
  if (!dragProjectId.value || dragFromStage.value === toStage) return
  // Optimistic update
  const proj = data.value?.find(p => p.id === dragProjectId.value)
  if (proj) proj.stage = toStage
  // Persist
  await $fetch('/api/designer/update-project', {
    method: 'PUT',
    body: { designerProjectId: dragProjectId.value, stage: toStage },
  })
  dragProjectId.value = null
  dragFromStage.value = null
}

const projectsWord = computed(() => {
  const n = projects.value.length
  if (n === 1) return ''
  if (n >= 2 && n <= 4) return 'а'
  return 'ов'
})

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Черновик',
    active: 'Активный',
    done: 'Завершён',
    completed: 'Завершён',
    paused: 'Пауза',
    cancelled: 'Отменён',
    archived: 'Архив',
  }
  return map[status] ?? status
}

function formatPrice(val: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val)
}

function formatDate(val: string): string {
  if (!val) return ''
  return new Date(val).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<style scoped>
.designer-dashboard {
  padding: 0;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.dashboard-title-group {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.btn-create {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.1rem;
  background: var(--glass-accent, #6366f1);
  color: #fff;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-create:hover { opacity: 0.88; }

.dashboard-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--glass-text, #111);
}

.dashboard-count {
  font-size: 0.875rem;
  color: var(--glass-label, #888);
}

.dashboard-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--glass-label, #888);
  font-size: 0.9rem;
  padding: 2rem 0;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--glass-border, #ddd);
  border-top-color: var(--glass-accent, #6366f1);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-error,
.dashboard-empty {
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  color: var(--glass-label, #888);
  font-size: 0.9rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: var(--glass-accent, #6366f1);
  opacity: 0.5;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.project-card {
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: box-shadow 0.15s;
}

.project-card {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
.project-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  transform: translateY(-1px);
  transition: box-shadow 0.15s, transform 0.1s;
}

.project-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.project-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-draft { background: #aaa; }
.status-active { background: #22c55e; }
.status-done { background: #6366f1; }
.status-paused { background: #eab308; }
.status-cancelled { background: #ef4444; }

.project-status-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--glass-label, #888);
}

.project-card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--glass-text, #111);
  line-height: 1.4;
}

.project-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--glass-label, #888);
}

.project-package {
  background: color-mix(in srgb, var(--glass-accent, #6366f1) 12%, transparent);
  color: var(--glass-accent, #6366f1);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.project-client {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--glass-label, #666);
}
.client-icon { font-size: 0.75rem; }
.client-phone { color: var(--glass-label, #aaa); font-size: 0.78rem; }

.project-card-footer {
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--glass-border, #eee);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-date { font-size: 0.73rem; color: var(--glass-label, #aaa); }
.project-arrow { font-size: 0.9rem; color: var(--glass-accent, #6366f1); opacity: 0.6; }

/* Header right group */
.header-right { display: flex; align-items: center; gap: 0.75rem; }

/* View toggle */
.view-toggle {
  display: flex;
  border: 1px solid var(--glass-border, #ddd);
  border-radius: 8px;
  overflow: hidden;
}
.toggle-btn {
  padding: 0.4rem 0.7rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--glass-label, #888);
  transition: background 0.1s, color 0.1s;
}
.toggle-btn.active {
  background: var(--glass-accent, #6366f1);
  color: #fff;
}
.toggle-btn:not(.active):hover { background: var(--glass-border, #f0f0f0); }

/* Kanban board - horizontal scroll, 14 columns */
.kanban-board {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  align-items: flex-start;
  min-height: 60vh;
}
.kanban-board::-webkit-scrollbar { height: 6px; }
.kanban-board::-webkit-scrollbar-track { background: transparent; }
.kanban-board::-webkit-scrollbar-thumb { background: var(--glass-border, #ddd); border-radius: 3px; }

.kanban-col {
  flex: 0 0 200px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: background 0.15s;
  border-radius: 10px;
  padding: 0.5rem;
}
.kanban-col.drag-over {
  background: color-mix(in srgb, var(--glass-accent, #6366f1) 8%, transparent);
  outline: 2px dashed var(--glass-accent, #6366f1);
}

.kanban-col-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.2rem 0.5rem;
  border-bottom: 2px solid var(--glass-border, #eee);
  margin-bottom: 0.25rem;
}
.kanban-stage-num {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--glass-accent, #6366f1);
  opacity: 0.7;
  min-width: 18px;
}
.kanban-col-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--glass-label, #888);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kanban-col-count {
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--glass-border, #eee);
  color: var(--glass-label, #888);
  border-radius: 10px;
  padding: 0.1rem 0.45rem;
  flex-shrink: 0;
}

.kanban-cards { display: flex; flex-direction: column; gap: 0.5rem; }

.kanban-card {
  border-radius: 8px;
  padding: 0.75rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: grab;
  transition: box-shadow 0.15s, transform 0.1s, opacity 0.1s;
  user-select: none;
}
.kanban-card:active { cursor: grabbing; opacity: 0.7; transform: rotate(1deg) scale(0.98); }
.kanban-card:hover {
  box-shadow: 0 3px 12px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.kc-title { font-size: 0.82rem; font-weight: 600; color: var(--glass-text, #111); line-height: 1.35; }
.kc-client { font-size: 0.72rem; color: var(--glass-label, #888); display: flex; gap: 0.25rem; align-items: center; }
.kc-meta { display: flex; gap: 0.4rem; font-size: 0.7rem; color: var(--glass-label, #aaa); flex-wrap: wrap; }
.kc-date { font-size: 0.66rem; color: var(--glass-label, #bbb); margin-top: 0.1rem; }

.kanban-empty { font-size: 0.75rem; color: var(--glass-label, #ccc); padding: 0.75rem 0.25rem; text-align: center; border: 1px dashed var(--glass-border, #e5e5e5); border-radius: 8px; }
</style>
