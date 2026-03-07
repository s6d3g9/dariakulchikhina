<template>
  <div class="tl-root">
    <!-- Toolbar -->
    <div class="tl-toolbar">
      <input v-model="search" class="glass-input tl-search" placeholder="Поиск..." />
      <div class="tl-view-toggle">
        <button class="a-btn-sm" :class="{ 'a-btn-active': viewMode === 'board' }" @click="viewMode = 'board'">☰ Доска</button>
        <button class="a-btn-sm" :class="{ 'a-btn-active': viewMode === 'list'  }" @click="viewMode = 'list'">≡ Список</button>
      </div>
      <button class="a-btn-sm a-btn-primary tl-create-btn" @click="openCreate">+ Задание</button>
    </div>

    <!-- ══ KANBAN BOARD VIEW ══ -->
    <div v-if="viewMode === 'board'" class="tl-board">
      <div
        v-for="col in COLUMNS"
        :key="col.value"
        class="tl-col"
        :class="{ 'tl-col--over': dragOverCol === col.value && draggingFromCol !== col.value }"
        @dragover.prevent="dragOverCol = col.value"
        @dragleave.self="dragOverCol = null"
        @drop.prevent="onDrop(col.value)"
      >
        <div class="tl-col-header">
          <span class="tl-col-label">{{ col.label }}</span>
          <span class="tl-col-cnt">{{ byStatus[col.value]?.length ?? 0 }}</span>
        </div>
        <div class="tl-col-body">
          <div
            v-for="task in byStatus[col.value] ?? []"
            :key="task.id"
            class="tl-card glass-surface glass-card"
            :class="{ 'tl-card--dragging': draggingTask?.id === task.id }"
            draggable="true"
            @dragstart="onDragStart($event, task, col.value)"
            @dragend="onDragEnd"
            @click="!wasDragging && openDetail(task)"
          >
            <div class="tl-card-id">#{{ task.id }}</div>
            <div class="tl-card-title">{{ task.title }}</div>
            <div v-if="task.address" class="tl-card-addr">📍 {{ task.address }}</div>
            <div class="tl-card-meta">
              <span v-if="task.dateEnd" class="tl-card-date">{{ task.dateEnd }}</span>
              <span v-if="task.budget" class="tl-card-budget">₽ {{ Number(task.budget).toLocaleString('ru') }}</span>
            </div>
            <div v-if="task.contractorName" class="tl-card-executor">👷 {{ task.contractorName }}</div>
          </div>
          <div v-if="!byStatus[col.value]?.length" class="tl-col-empty">—</div>
        </div>
      </div>
    </div>

    <!-- ══ LIST VIEW ══ -->
    <template v-else>
      <div class="tl-tabs">
        <button
          v-for="s in STATUS_ALL"
          :key="s.value"
          class="tl-tab"
          :class="{ 'tl-tab--active': activeStatus === s.value }"
          @click="activeStatus = s.value"
        >
          {{ s.label }}
          <span class="tl-tab-cnt">{{ countByStatus[s.value] ?? 0 }}</span>
        </button>
      </div>
      <div v-if="filtered.length" class="tl-list">
        <div
          v-for="task in filtered"
          :key="task.id"
          class="tl-row glass-surface glass-card"
          @click="openDetail(task)"
        >
          <div class="tl-row-main">
            <span class="tl-row-id">#{{ task.id }}</span>
            <div class="tl-row-info">
              <span class="tl-row-title">{{ task.title }}</span>
              <span v-if="task.address" class="tl-row-addr">{{ task.address }}</span>
            </div>
          </div>
          <div class="tl-row-meta">
            <span v-if="task.dateStart" class="tl-meta-item">📅 {{ task.dateStart }}</span>
            <span v-if="task.dateEnd" class="tl-meta-item">→ {{ task.dateEnd }}</span>
            <span v-if="task.budget" class="tl-meta-item tl-meta-budget">₽ {{ Number(task.budget).toLocaleString('ru') }}</span>
            <span v-if="task.contractorName" class="tl-meta-executor">{{ task.contractorName }}</span>
            <span v-if="task.projectTitle && !projectId" class="tl-meta-project">{{ task.projectTitle }}</span>
            <span class="tl-status-pill" :class="`tl-status--${task.status}`">{{ STATUS_LABEL[task.status] ?? task.status }}</span>
          </div>
        </div>
      </div>
      <div v-else class="tl-empty">Нет заданий</div>
    </template>

    <!-- Detail/Edit panel -->
    <div v-if="detailTask" class="tl-detail-overlay" @click.self="detailTask = null">
      <div class="tl-detail glass-surface glass-card">
        <div class="tl-detail-header">
          <span class="tl-detail-title">#{{ detailTask.id }} {{ detailTask.title }}</span>
          <div class="tl-detail-actions">
            <button class="a-btn-sm" @click="startEdit(detailTask)">✎ редактировать</button>
            <button class="a-btn-sm a-btn-danger" @click="deleteTask(detailTask.id)">✕</button>
            <button class="a-btn-sm" @click="detailTask = null">закрыть</button>
          </div>
        </div>
        <div class="tl-detail-body">
          <!-- Status selector -->
          <div class="tl-df">
            <span class="tl-dl">Статус</span>
            <select v-model="detailTask.status" class="glass-input tl-dv-sel" @change="patchStatus(detailTask)">
              <option v-for="s in STATUS_LIST" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div v-if="detailTask.description" class="tl-df">
            <span class="tl-dl">Описание</span>
            <p class="tl-dv">{{ detailTask.description }}</p>
          </div>
          <div v-if="detailTask.workType" class="tl-df">
            <span class="tl-dl">Вид работ</span>
            <span class="tl-dv">{{ detailTask.workType }}</span>
          </div>
          <div v-if="detailTask.address" class="tl-df">
            <span class="tl-dl">Адрес</span>
            <span class="tl-dv">{{ detailTask.address }}</span>
          </div>
          <div v-if="detailTask.dateStart || detailTask.dateEnd" class="tl-df">
            <span class="tl-dl">Сроки</span>
            <span class="tl-dv">{{ detailTask.dateStart }} — {{ detailTask.dateEnd }}</span>
          </div>
          <div v-if="detailTask.budget" class="tl-df">
            <span class="tl-dl">Бюджет</span>
            <span class="tl-dv">₽ {{ Number(detailTask.budget).toLocaleString('ru') }}</span>
          </div>
          <div v-if="detailTask.contractorName" class="tl-df">
            <span class="tl-dl">Исполнитель</span>
            <span class="tl-dv">{{ detailTask.contractorName }}</span>
          </div>
          <div v-if="detailTask.projectTitle" class="tl-df">
            <span class="tl-dl">Проект</span>
            <span class="tl-dv">{{ detailTask.projectTitle }}</span>
          </div>
          <div v-if="detailTask.notes" class="tl-df">
            <span class="tl-dl">Примечания</span>
            <p class="tl-dv">{{ detailTask.notes }}</p>
          </div>
          <div v-if="detailTask.requirements?.photoReport || detailTask.requirements?.workAct" class="tl-df">
            <span class="tl-dl">Требования</span>
            <span class="tl-dv">
              <span v-if="detailTask.requirements.photoReport">фотоотчёт</span>
              <span v-if="detailTask.requirements.workAct"> акт работ</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / edit modal -->
    <AdminTaskCreateModal
      v-model="showCreate"
      :project-id="projectId"
      :edit-task="editTask"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId?: number | null
}>()

const COLUMNS = [
  { value: 'new',         label: 'Новый' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'review',      label: 'На рассмотрении' },
  { value: 'approval',    label: 'Согласование' },
  { value: 'done',        label: 'Выполнен' },
  { value: 'cancelled',   label: 'Отменён' },
]
const STATUS_ALL = [{ value: 'all', label: 'Все' }, ...COLUMNS]
const STATUS_LABEL: Record<string, string> = Object.fromEntries(COLUMNS.map(s => [s.value, s.label]))

const viewMode    = ref<'board' | 'list'>('board')
const activeStatus = ref('all')
const search       = ref('')

// Fetch
const fetchQuery = computed(() => {
  const q: Record<string, any> = {}
  if (props.projectId) q.projectId = props.projectId
  return q
})

const { data: rawTasks, refresh } = await useFetch('/api/tasks', {
  query: fetchQuery,
  default: () => [],
})

const tasks = computed(() => (rawTasks.value ?? []) as any[])

// Board grouping (after search filter)
const searchFiltered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return tasks.value
  return tasks.value.filter((t: any) => t.title?.toLowerCase().includes(q) || t.address?.toLowerCase().includes(q))
})

const byStatus = computed(() => {
  const map: Record<string, any[]> = {}
  for (const col of COLUMNS) map[col.value] = []
  for (const t of searchFiltered.value) {
    if (map[t.status]) map[t.status].push(t)
    else map['new'].push(t)
  }
  return map
})

// List view
const countByStatus = computed(() => {
  const counts: Record<string, number> = { all: tasks.value.length }
  for (const t of tasks.value) counts[t.status] = (counts[t.status] ?? 0) + 1
  return counts
})

const filtered = computed(() => {
  let list = searchFiltered.value
  if (activeStatus.value !== 'all') list = list.filter((t: any) => t.status === activeStatus.value)
  return list
})

// Detail
const detailTask = ref<any | null>(null)
function openDetail(task: any) { detailTask.value = { ...task } }

async function patchStatus(task: any) {
  await $fetch(`/api/tasks/${task.id}`, { method: 'PUT', body: { status: task.status } })
  await refresh()
}

async function deleteTask(id: number) {
  if (!confirm('Удалить задание?')) return
  await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  detailTask.value = null
  await refresh()
}

// Create / edit
const showCreate = ref(false)
const editTask   = ref<any | null>(null)

function openCreate() { editTask.value = null; showCreate.value = true }
function startEdit(task: any) {
  editTask.value   = { ...task }
  showCreate.value = true
  detailTask.value = null
}
async function onSaved() {
  await refresh()
  showCreate.value = false
  editTask.value   = null
}
watch(showCreate, (v) => { if (!v) editTask.value = null })

// ── Drag and Drop ─────────────────────────────────────────────────
const draggingTask    = ref<any | null>(null)
const draggingFromCol = ref('')
const dragOverCol     = ref<string | null>(null)
const wasDragging     = ref(false)

function onDragStart(event: DragEvent, task: any, fromCol: string) {
  draggingTask.value    = task
  draggingFromCol.value = fromCol
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(task.id))
  }
}

function onDragEnd() {
  dragOverCol.value     = null
  draggingTask.value    = null
  draggingFromCol.value = ''
  wasDragging.value     = true
  setTimeout(() => { wasDragging.value = false }, 100)
}

async function onDrop(targetStatus: string) {
  dragOverCol.value = null
  const task  = draggingTask.value
  const from  = draggingFromCol.value
  draggingTask.value    = null
  draggingFromCol.value = ''
  if (!task || targetStatus === from) return
  // Optimistic update
  const arr = rawTasks.value as any[]
  const idx = arr.findIndex((t: any) => t.id === task.id)
  if (idx !== -1) arr[idx] = { ...arr[idx], status: targetStatus }
  try {
    await $fetch(`/api/tasks/${task.id}`, { method: 'PUT', body: { status: targetStatus } })
    await refresh()
  } catch { await refresh() }
}
</script>

<style scoped>
.tl-root { display: flex; flex-direction: column; gap: .75rem; }

.tl-toolbar { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
.tl-search { flex: 1; max-width: 260px; }
.tl-view-toggle { display: flex; gap: .25rem; }
.tl-create-btn { margin-left: auto; }
.a-btn-active {
  border-color: var(--color-accent, #4f8cff) !important;
  background: rgba(79,140,255,.15) !important;
}

/* ── Board ─────────────────────────────────────────────── */
.tl-board {
  display: flex; gap: 10px;
  overflow-x: auto; padding-bottom: 8px;
  align-items: flex-start;
}
.tl-board::-webkit-scrollbar { height: 5px; }

.tl-col {
  min-width: 190px; max-width: 210px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 6px;
  padding: 8px; border-radius: 12px;
  background: var(--glass-bg, rgba(255,255,255,.04));
  border: 1.5px solid var(--glass-border);
  transition: border-color .15s, background .15s;
}
.tl-col--over {
  border-color: var(--color-accent, #4f8cff) !important;
  background: rgba(79,140,255,.08) !important;
}

.tl-col-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 2px 4px 6px;
  border-bottom: 1px solid var(--glass-border);
}
.tl-col-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; opacity: .65; }
.tl-col-cnt {
  font-size: .7rem; font-weight: 700;
  background: rgba(255,255,255,.1); border-radius: 999px; padding: 1px 7px;
}
.tl-col-body { display: flex; flex-direction: column; gap: 6px; min-height: 48px; }
.tl-col-empty { text-align: center; padding: 1.5rem 0; opacity: .2; font-size: .78rem; }

.tl-card {
  padding: .55rem .7rem; border-radius: 9px; cursor: grab;
  transition: opacity .15s, box-shadow .15s;
  user-select: none;
}
.tl-card:active { cursor: grabbing; }
.tl-card:hover { box-shadow: 0 3px 14px rgba(0,0,0,.22); }
.tl-card--dragging { opacity: .25; pointer-events: none; }
.tl-card-id { font-size: .67rem; color: var(--text-secondary); font-weight: 600; margin-bottom: 2px; }
.tl-card-title { font-size: .81rem; font-weight: 600; line-height: 1.3; }
.tl-card-addr { font-size: .71rem; color: var(--text-secondary); margin-top: 3px; }
.tl-card-meta { display: flex; gap: .35rem; font-size: .71rem; color: var(--text-secondary); margin-top: 4px; flex-wrap: wrap; }
.tl-card-budget { font-weight: 600; color: var(--text-primary); }
.tl-card-executor { font-size: .71rem; margin-top: 4px; color: var(--color-accent, #4f8cff); }

/* ── List ───────────────────────────────────────────────── */
.tl-tabs { display: flex; gap: .3rem; flex-wrap: wrap; }
.tl-tab {
  padding: .35rem .75rem; border-radius: 999px;
  border: 1.5px solid var(--glass-border);
  background: transparent; color: var(--text-secondary);
  font-size: .82rem; cursor: pointer; transition: all .15s;
  display: flex; align-items: center; gap: .3rem;
}
.tl-tab:hover { border-color: var(--color-accent, #4f8cff); color: var(--text-primary); }
.tl-tab--active {
  border-color: var(--color-accent, #4f8cff);
  background: rgba(79,140,255,.12);
  color: var(--text-primary); font-weight: 600;
}
.tl-tab-cnt {
  background: rgba(255,255,255,.1); border-radius: 999px;
  padding: 0 .4rem; font-size: .74rem;
}

.tl-list { display: flex; flex-direction: column; gap: .45rem; }
.tl-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: .75rem; padding: .65rem 1rem;
  border-radius: 10px; cursor: pointer;
  transition: background .15s; flex-wrap: wrap;
}
.tl-row:hover { background: rgba(255,255,255,.04); }
.tl-row-main { display: flex; align-items: center; gap: .6rem; flex: 1; min-width: 0; }
.tl-row-id { font-size: .78rem; color: var(--text-secondary); white-space: nowrap; }
.tl-row-info { display: flex; flex-direction: column; min-width: 0; }
.tl-row-title { font-weight: 600; font-size: .9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tl-row-addr { font-size: .76rem; color: var(--text-secondary); }
.tl-row-meta { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.tl-meta-item { font-size: .78rem; color: var(--text-secondary); }
.tl-meta-budget { font-weight: 600; color: var(--text-primary); }
.tl-meta-executor {
  font-size: .78rem; padding: .15rem .5rem; border-radius: 20px;
  background: rgba(79,140,255,.15); color: var(--color-accent, #4f8cff);
}
.tl-meta-project { font-size: .76rem; color: var(--text-secondary); }

.tl-status-pill { padding: .2rem .55rem; border-radius: 20px; font-size: .75rem; font-weight: 600; }
.tl-status--new         { background: rgba(99,179,237,.18); color: #63b3ed; }
.tl-status--in_progress { background: rgba(245,158, 11,.18); color: #f59e0b; }
.tl-status--review      { background: rgba(139, 92,246,.18); color: #8b5cf6; }
.tl-status--approval    { background: rgba(249,115, 22,.18); color: #f97316; }
.tl-status--done        { background: rgba( 45,168,112,.18); color: #2da870; }
.tl-status--cancelled   { background: rgba(156,163,175,.18); color: #9ca3af; }

.tl-empty { text-align: center; padding: 2.5rem 0; color: var(--text-secondary); font-size: .9rem; }

/* ── Detail overlay ─────────────────────────────────────── */
.tl-detail-overlay {
  position: fixed; inset: 0; z-index: 900;
  background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.tl-detail { width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; border-radius: 14px; }
.tl-detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .9rem 1.2rem; border-bottom: 1px solid var(--glass-border);
  gap: .5rem; flex-wrap: wrap;
}
.tl-detail-title { font-weight: 700; font-size: .95rem; flex: 1; }
.tl-detail-actions { display: flex; gap: .4rem; flex-wrap: wrap; }
.tl-detail-body { padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: .6rem; }
.tl-df { display: flex; gap: .5rem; align-items: baseline; flex-wrap: wrap; }
.tl-dl { font-size: .78rem; color: var(--text-secondary); font-weight: 500; min-width: 100px; }
.tl-dv { font-size: .88rem; flex: 1; }
.tl-dv-sel { max-width: 220px; }
</style>
