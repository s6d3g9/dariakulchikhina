<template>
  <div class="tl-root">
    <!-- Toolbar -->
    <div class="tl-toolbar">
      <input v-model="search" class="glass-input tl-search" placeholder="Поиск по названию..." />
      <button class="a-btn-sm a-btn-primary tl-create-btn" @click="showCreate = true">+ Задание</button>
    </div>

    <!-- Status tabs -->
    <div class="tl-tabs">
      <button
        v-for="s in STATUS_LIST"
        :key="s.value"
        class="tl-tab"
        :class="{ 'tl-tab--active': activeStatus === s.value }"
        @click="activeStatus = s.value"
      >
        {{ s.label }}
        <span class="tl-tab-cnt">{{ countByStatus[s.value] ?? 0 }}</span>
      </button>
    </div>

    <!-- Task list -->
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

const STATUS_LIST = [
  { value: 'all',        label: 'Все' },
  { value: 'new',        label: 'Новый' },
  { value: 'in_progress',label: 'В работе' },
  { value: 'review',     label: 'На рассмотрении' },
  { value: 'approval',   label: 'Согласование сметы' },
  { value: 'done',       label: 'Выполнен' },
  { value: 'cancelled',  label: 'Отменён' },
]
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_LIST.map(s => [s.value, s.label]))

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

const countByStatus = computed(() => {
  const counts: Record<string, number> = { all: tasks.value.length }
  for (const t of tasks.value) {
    counts[t.status] = (counts[t.status] ?? 0) + 1
  }
  return counts
})

const filtered = computed(() => {
  let list = tasks.value
  if (activeStatus.value !== 'all') list = list.filter(t => t.status === activeStatus.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(t => t.title?.toLowerCase().includes(q) || t.address?.toLowerCase().includes(q))
  }
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

function startEdit(task: any) {
  editTask.value  = { ...task }
  showCreate.value = true
  detailTask.value = null
}

async function onSaved() {
  await refresh()
  showCreate.value = false
  editTask.value   = null
}

watch(showCreate, (v) => { if (!v) editTask.value = null })
</script>

<style scoped>
.tl-root { display: flex; flex-direction: column; gap: .75rem; }

.tl-toolbar {
  display: flex; gap: .5rem; align-items: center;
}
.tl-search { flex: 1; max-width: 320px; }
.tl-create-btn { margin-left: auto; }

.tl-tabs {
  display: flex; gap: .3rem; flex-wrap: wrap;
}
.tl-tab {
  padding: .35rem .75rem;
  border-radius: 999px;
  border: 1.5px solid var(--glass-border);
  background: transparent;
  color: var(--text-secondary);
  font-size: .82rem; cursor: pointer;
  transition: all .15s;
  display: flex; align-items: center; gap: .3rem;
}
.tl-tab:hover { border-color: var(--color-accent, #4f8cff); color: var(--text-primary); }
.tl-tab--active {
  border-color: var(--color-accent, #4f8cff);
  background: rgba(79,140,255,.12);
  color: var(--text-primary); font-weight: 600;
}
.tl-tab-cnt {
  background: rgba(255,255,255,.1);
  border-radius: 999px;
  padding: 0 .4rem;
  font-size: .74rem;
}

.tl-list { display: flex; flex-direction: column; gap: .45rem; }

.tl-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: .75rem; padding: .65rem 1rem;
  border-radius: 10px; cursor: pointer;
  transition: background .15s;
  flex-wrap: wrap;
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
  font-size: .78rem; padding: .15rem .5rem;
  border-radius: 20px;
  background: rgba(79,140,255,.15);
  color: var(--color-accent, #4f8cff);
}
.tl-meta-project {
  font-size: .76rem; color: var(--text-secondary);
}

/* Status pills */
.tl-status-pill {
  padding: .2rem .55rem; border-radius: 20px;
  font-size: .75rem; font-weight: 600;
}
.tl-status--new        { background: rgba(99,179,237,.18); color: #63b3ed; }
.tl-status--in_progress{ background: rgba(245,158, 11,.18); color: #f59e0b; }
.tl-status--review     { background: rgba(139, 92,246,.18); color: #8b5cf6; }
.tl-status--approval   { background: rgba(249,115, 22,.18); color: #f97316; }
.tl-status--done       { background: rgba( 45,168,112,.18); color: #2da870; }
.tl-status--cancelled  { background: rgba(156,163,175,.18); color: #9ca3af; }

.tl-empty { text-align: center; padding: 2.5rem 0; color: var(--text-secondary); font-size: .9rem; }

/* Detail overlay */
.tl-detail-overlay {
  position: fixed; inset: 0; z-index: 900;
  background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.tl-detail {
  width: 100%; max-width: 560px;
  max-height: 88vh; overflow-y: auto;
  border-radius: 14px;
}
.tl-detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .9rem 1.2rem;
  border-bottom: 1px solid var(--glass-border);
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
