<template>
  <div class="dk-root">
    <!-- ── Topbar ── -->
    <div class="dk-topbar">
      <div class="dk-topbar-left">
        <span class="dk-title">дизайнеры</span>
        <span class="dk-total">{{ kanban?.total ?? 0 }}</span>
      </div>
      <div class="dk-topbar-right">
        <input v-model="search" class="glass-input dk-search" placeholder="поиск по имени..." />
        <button class="a-btn-sm" @click="showCreate = true">+ добавить</button>
        <button class="a-btn-sm" @click="refresh()">↺</button>
      </div>
    </div>

    <!-- ── Kanban board ── -->
    <div class="dk-board" v-if="!selectedDesignerId">
      <div v-for="col in COLUMNS" :key="col.key" class="dk-col">
        <div class="dk-col-head" :style="{ borderTopColor: col.color }">
          <span class="dk-col-title">{{ col.label }}</span>
          <span class="dk-col-count">{{ filteredCards(col.key).length }}</span>
        </div>
        <div class="dk-col-body">
          <div v-if="filteredCards(col.key).length === 0" class="dk-col-empty">—</div>
          <div
            v-for="card in filteredCards(col.key)"
            :key="String(card.dpId ?? card.designerId) + '-' + col.key"
            class="dk-card glass-card"
            :class="{ 'dk-card--alert': card.alerts.length > 0 }"
            @click="openDesigner(card.designerId)"
          >
            <!-- Tags: area, price, project status -->
            <div v-if="card.area || card.totalPrice || card.projectStatus" class="dk-card-tags">
              <span v-if="card.area" class="dk-tag dk-tag--area">{{ card.area }} м²</span>
              <span v-if="card.totalPrice" class="dk-tag dk-tag--price">{{ formatPrice(card.totalPrice) }}</span>
              <span v-if="card.projectStatus" class="dk-tag" :class="projectStatusClass(card.projectStatus)">{{ projectStatusLabel(card.projectStatus) }}</span>
            </div>

            <!-- Designer identity -->
            <div class="dk-card-who">
              <div class="dk-avatar">{{ card.designerInitials }}</div>
              <div class="dk-card-meta">
                <div class="dk-card-name">{{ card.designerName }}</div>
                <div v-if="card.designerCity || card.designerPhone" class="dk-card-sub">
                  {{ card.designerCity }}{{ card.designerCity && card.designerPhone ? ' · ' : '' }}{{ card.designerPhone }}
                </div>
              </div>
            </div>

            <!-- Project -->
            <div v-if="card.projectTitle" class="dk-card-project">
              <span class="dk-card-project-label">проект</span>
              <span class="dk-card-project-name">{{ card.projectTitle }}</span>
            </div>

            <!-- Task stats -->
            <div v-if="card.stats.total > 0" class="dk-card-task">
              <span class="dk-card-task-label">задачи</span>
              <div class="dk-card-task-stats">
                <span class="dk-stat dk-stat--total">{{ card.stats.total }} всего</span>
                <span class="dk-stat dk-stat--active">{{ card.stats.inProgress }} в работе</span>
                <span v-if="card.stats.done" class="dk-stat dk-stat--done">{{ card.stats.done }} готово</span>
                <span v-if="card.stats.overdue" class="dk-stat dk-stat--overdue">{{ card.stats.overdue }} просрочено</span>
                <span v-if="card.stats.cancelled" class="dk-stat dk-stat--cancelled">{{ card.stats.cancelled }} отменено</span>
              </div>
            </div>

            <!-- Progress bar -->
            <div v-if="card.stats.total > 0" class="dk-card-progress">
              <div class="dk-progress-track">
                <div
                  class="dk-progress-fill"
                  :style="{ width: card.progress + '%' }"
                  :class="card.progress === 100 ? 'dk-progress-fill--done' : card.stats.overdue > 0 ? 'dk-progress-fill--warn' : ''"
                ></div>
              </div>
              <span class="dk-progress-pct">{{ card.progress }}%</span>
            </div>

            <!-- Near deadline -->
            <div v-if="card.stats.nearDeadline > 0" class="dk-near-deadline">
              ⏱ {{ card.stats.nearDeadline }} задач — срок на этой неделе
            </div>

            <!-- Alerts -->
            <div v-if="card.alerts.length" class="dk-card-alerts">
              <div v-for="a in card.alerts" :key="a" class="dk-alert">⚠ {{ a }}</div>
            </div>

            <!-- Notes -->
            <div v-if="card.notes" class="dk-card-notes">{{ card.notes }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Detail cabinet overlay ── -->
    <div v-if="selectedDesignerId" class="dk-cabinet">
      <div class="dk-cabinet-bar">
        <button class="a-btn-sm" @click="selectedDesignerId = null">← к списку</button>
        <span v-if="selectedDesigner" class="dk-cabinet-name">{{ selectedDesigner.designerName }}</span>
        <button v-if="selectedDesigner" class="a-btn-sm" style="color:#ef4444" @click="deleteDesigner(selectedDesignerId!)">× удалить</button>
      </div>
      <AdminDesignerCabinet :designer-id="selectedDesignerId" />
    </div>

    <!-- ── Create modal ── -->
    <Teleport to="body">
      <div v-if="showCreate" class="dk-backdrop" @click.self="showCreate = false">
        <div class="dk-modal glass-surface">
          <div class="dk-modal-head">
            <span>Новый дизайнер</span>
            <button class="a-btn-sm" @click="showCreate = false">✕</button>
          </div>
          <input v-model="newName" class="glass-input" placeholder="Имя / Студия" @keydown.enter="doCreate" />
          <div class="dk-modal-foot">
            <button class="a-btn-sm" @click="showCreate = false">отмена</button>
            <button class="a-btn-save" :disabled="!newName.trim() || creating" @click="doCreate">{{ creating ? '…' : 'создать' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const { data: kanban, refresh } = await useFetch<any>('/api/designers/kanban', { server: false })

const search             = ref('')
const showCreate         = ref(false)
const newName            = ref('')
const creating           = ref(false)
const selectedDesignerId = ref<number | null>(null)

const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)
watch(entityDeselectSignal, () => { selectedDesignerId.value = null })

const COLUMNS = [
  { key: 'free',      label: 'Свободны',       color: '#94a3b8' },
  { key: 'draft',     label: 'Новый проект',    color: '#60a5fa' },
  { key: 'active',    label: 'В работе',        color: '#34d399' },
  { key: 'review',    label: 'На согласовании', color: '#f59e0b' },
  { key: 'paused',    label: 'На паузе',        color: '#a78bfa' },
  { key: 'completed', label: 'Завершено',       color: '#6b7280' },
] as const

function filteredCards(colKey: string) {
  const cards: any[] = kanban.value?.columns?.[colKey] ?? []
  if (!search.value) return cards
  const q = search.value.toLowerCase()
  return cards.filter((c: any) =>
    c.designerName?.toLowerCase().includes(q) ||
    c.projectTitle?.toLowerCase().includes(q) ||
    c.designerCity?.toLowerCase().includes(q)
  )
}

const selectedDesigner = computed(() => {
  if (!selectedDesignerId.value) return null
  for (const col of COLUMNS) {
    const found = (kanban.value?.columns?.[col.key] ?? []).find((c: any) => c.designerId === selectedDesignerId.value)
    if (found) return found
  }
  return null
})

function openDesigner(id: number) { selectedDesignerId.value = id }

function formatPrice(v: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v)
}

const PROJECT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  lead:      { label: 'Лид',      cls: 'dk-tag--lead' },
  brief:     { label: 'Бриф',     cls: 'dk-tag--brief' },
  contract:  { label: 'Договор',  cls: 'dk-tag--contract' },
  active:    { label: 'Активен',  cls: 'dk-tag--active-proj' },
  paused:    { label: 'Пауза',    cls: 'dk-tag--paused' },
  completed: { label: 'Завершён', cls: 'dk-tag--completed-proj' },
}
function projectStatusLabel(s: string) { return PROJECT_STATUS_MAP[s]?.label ?? s }
function projectStatusClass(s: string) { return PROJECT_STATUS_MAP[s]?.cls ?? '' }

async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await $fetch('/api/designers', { method: 'POST', body: { name: newName.value.trim() } })
    newName.value = ''; showCreate.value = false; await refresh()
  } finally { creating.value = false }
}

async function deleteDesigner(id: number) {
  if (!confirm('Удалить дизайнера?')) return
  await $fetch(`/api/designers/${id}`, { method: 'DELETE' })
  selectedDesignerId.value = null
  await refresh()
}
</script>

<style scoped>
.dk-root { display: flex; flex-direction: column; gap: 16px; }

.dk-topbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
.dk-topbar-left { display: flex; align-items: center; gap: 10px; }
.dk-title { font-size: .8rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; opacity: .7; }
.dk-total { font-size: .7rem; font-weight: 700; background: color-mix(in srgb, var(--glass-text) 10%, transparent); border: 1px solid var(--glass-border); border-radius: 20px; padding: 1px 8px; }
.dk-topbar-right { display: flex; align-items: center; gap: 8px; }
.dk-search { width: 200px; height: 32px; font-size: .78rem; }

.dk-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; align-items: flex-start; }
.dk-board::-webkit-scrollbar { height: 5px; }
.dk-board::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }

.dk-col { flex: 0 0 224px; min-width: 200px; display: flex; flex-direction: column; gap: 8px; }
.dk-col-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px 6px 12px; border-radius: 10px; border-top: 3px solid #94a3b8;
  background: color-mix(in srgb, var(--glass-bg) 70%, transparent);
  border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border);
}
.dk-col-title { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; opacity: .75; }
.dk-col-count { font-size: .65rem; font-weight: 700; background: color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius: 20px; padding: 0 6px; min-width: 18px; text-align: center; }
.dk-col-body { display: flex; flex-direction: column; gap: 8px; }
.dk-col-empty { font-size: .72rem; opacity: .3; text-align: center; padding: 16px 0; }

.dk-card { padding: 12px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: transform .12s, box-shadow .12s; border: 1px solid var(--glass-border); }
.dk-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.12); }
.dk-card--alert { border-color: rgba(239,68,68,.3); }

.dk-card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.dk-tag { font-size: .62rem; font-weight: 600; padding: 2px 7px; border-radius: 20px; letter-spacing: .03em; background: color-mix(in srgb, var(--glass-text) 8%, transparent); border: 1px solid var(--glass-border); }
.dk-tag--area    { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.25); }
.dk-tag--price   { background: rgba(16,185,129,.1); border-color: rgba(16,185,129,.3); }
.dk-tag--lead    { background: rgba(148,163,184,.12); }
.dk-tag--brief   { background: rgba(96,165,250,.12); border-color: rgba(96,165,250,.3); }
.dk-tag--contract { background: rgba(52,211,153,.12); border-color: rgba(52,211,153,.3); }
.dk-tag--active-proj { background: rgba(16,185,129,.14); border-color: rgba(16,185,129,.35); color: #059669; }
.dk-tag--paused  { background: rgba(167,139,250,.12); border-color: rgba(167,139,250,.3); }
.dk-tag--completed-proj { background: rgba(107,114,128,.12); border-color: rgba(107,114,128,.3); }

.dk-card-who { display: flex; align-items: center; gap: 8px; }
.dk-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: color-mix(in srgb, var(--glass-text) 12%, transparent); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 700; letter-spacing: .04em; }
.dk-card-meta { min-width: 0; }
.dk-card-name { font-size: .8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dk-card-sub  { font-size: .68rem; opacity: .5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dk-card-project { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 8px; background: color-mix(in srgb, var(--glass-text) 4%, transparent); }
.dk-card-project-label { font-size: .6rem; text-transform: uppercase; letter-spacing: .08em; opacity: .4; }
.dk-card-project-name  { font-size: .74rem; font-weight: 500; }

.dk-card-task { display: flex; flex-direction: column; gap: 4px; }
.dk-card-task-label { font-size: .6rem; text-transform: uppercase; letter-spacing: .08em; opacity: .4; }
.dk-card-task-stats { display: flex; flex-wrap: wrap; gap: 4px; }
.dk-stat { font-size: .64rem; padding: 2px 7px; border-radius: 20px; font-weight: 600; border: 1px solid transparent; }
.dk-stat--total    { background: color-mix(in srgb, var(--glass-text) 8%, transparent); border-color: var(--glass-border); }
.dk-stat--active   { background: rgba(59,130,246,.12); border-color: rgba(59,130,246,.3); color: #3b82f6; }
.dk-stat--done     { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.3); color: #059669; }
.dk-stat--overdue  { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.3); color: #dc2626; }
.dk-stat--cancelled{ background: rgba(107,114,128,.1); border-color: rgba(107,114,128,.25); opacity: .75; }

.dk-card-progress { display: flex; align-items: center; gap: 6px; }
.dk-progress-track { flex: 1; height: 5px; border-radius: 10px; background: color-mix(in srgb, var(--glass-text) 10%, transparent); overflow: hidden; }
.dk-progress-fill { height: 100%; border-radius: 10px; background: #3b82f6; transition: width .3s; }
.dk-progress-fill--done { background: #10b981; }
.dk-progress-fill--warn { background: #f59e0b; }
.dk-progress-pct { font-size: .64rem; opacity: .55; min-width: 28px; text-align: right; }

.dk-near-deadline { font-size: .66rem; color: #f59e0b; font-weight: 600; }

.dk-card-alerts { display: flex; flex-direction: column; gap: 3px; border-top: 1px solid rgba(239,68,68,.2); padding-top: 6px; }
.dk-alert { font-size: .65rem; color: #ef4444; font-weight: 500; }

.dk-card-notes { font-size: .68rem; opacity: .5; font-style: italic; border-top: 1px solid var(--glass-border); padding-top: 5px; }

.dk-cabinet { display: flex; flex-direction: column; gap: 0; }
.dk-cabinet-bar { display: flex; align-items: center; gap: 10px; padding: 8px 0 14px; }
.dk-cabinet-name { font-size: .84rem; font-weight: 600; flex: 1; }

.dk-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 200; }
.dk-modal { padding: 24px; width: 340px; max-width: 90vw; border-radius: 16px; display: flex; flex-direction: column; gap: 14px; }
.dk-modal-head { display: flex; align-items: center; justify-content: space-between; font-size: .84rem; font-weight: 600; }
.dk-modal-foot { display: flex; justify-content: flex-end; gap: 8px; }
</style>
