<template>
  <div class="acp2-wrap">
    <div v-if="pending" class="ent-content-loading">
      <div class="ent-skeleton-line" v-for="i in 6" :key="i"/>
    </div>
    <template v-else>

      <!-- ── Шапка: статус + ключевые даты ─────────────────────────── -->
      <div class="acp2-header">
        <div class="acp2-header-left">
          <select v-model="form.cp_status" class="u-status-sel" @change="save">
            <option value="">статус не задан</option>
            <option value="planning">подготовка</option>
            <option value="in_progress">в работе</option>
            <option value="on_hold">приостановлено</option>
            <option value="done">завершено ✓</option>
          </select>
          <span v-if="savedAt" class="acp2-saved">✓ {{ savedAt }}</span>
        </div>

        <!-- Общий прогресс -->
        <div class="acp2-total-progress">
          <div class="acp2-progress-label">
            общий прогресс
            <strong>{{ overallProgress }}%</strong>
          </div>
          <div class="acp2-progress-bar">
            <div class="acp2-progress-fill"
              :style="`width:${overallProgress}%`"
              :class="`acp2-progress-fill--${form.cp_status || 'planning'}`"/>
          </div>
        </div>

        <!-- Дней осталось -->
        <div class="acp2-countdown" :class="daysLeft < 0 ? 'acp2-countdown--late' : daysLeft < 14 ? 'acp2-countdown--warn' : ''">
          <template v-if="form.cp_end_date">
            <span class="acp2-countdown-num">{{ Math.abs(daysLeft) }}</span>
            <span class="acp2-countdown-label">{{ daysLeft < 0 ? 'просрочено (дней)' : 'дней осталось' }}</span>
          </template>
          <span v-else class="acp2-countdown-empty">дата не задана</span>
        </div>
      </div>

      <!-- ── Общая информация ───────────────────────────────────────── -->
      <div class="acp2-section">
        <div class="acp2-section-title">
          <span>общая информация</span>
          <button class="acp2-collapse-btn" @click="showInfo = !showInfo">{{ showInfo ? '▲' : '▼' }}</button>
        </div>
        <div v-show="showInfo" class="u-grid-2" style="margin-top:12px">
          <div class="u-field">
            <label class="u-field__label">дата начала работ</label>
            <AppDatePicker v-model="form.cp_start_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">плановая дата сдачи</label>
            <AppDatePicker v-model="form.cp_end_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">генеральный подрядчик</label>
            <input v-model="form.cp_contractor" class="glass-input" placeholder="компания / ФИО" @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">авторский надзор</label>
            <input v-model="form.cp_supervisor" class="glass-input" placeholder="ФИО / компания" @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">общий бюджет ₽</label>
            <input v-model.number="form.cp_budget_total" type="number" min="0" class="glass-input" placeholder="0" @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">освоено (факт) ₽</label>
            <input v-model.number="form.cp_budget_spent" type="number" min="0" class="glass-input" placeholder="0" @blur="save">
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">примечания</label>
            <textarea v-model="form.cp_notes" class="glass-input u-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <!-- ── Бюджетная сводка ──────────────────────────────────────── -->
      <div v-if="form.cp_budget_total" class="acp2-budget-summary">
        <div class="acp2-budget-item">
          <span class="acp2-budget-label">план</span>
          <span class="acp2-budget-val">{{ fmtMoney(form.cp_budget_total) }} ₽</span>
        </div>
        <div class="acp2-budget-item">
          <span class="acp2-budget-label">факт</span>
          <span class="acp2-budget-val acp2-budget-val--spent">{{ fmtMoney(budgetSpentTotal) }} ₽</span>
        </div>
        <div class="acp2-budget-item">
          <span class="acp2-budget-label">остаток</span>
          <span class="acp2-budget-val" :class="budgetRemainder < 0 ? 'acp2-budget-val--over' : 'acp2-budget-val--ok'">
            {{ fmtMoney(Math.abs(budgetRemainder)) }} ₽ {{ budgetRemainder < 0 ? '(превышение)' : '' }}
          </span>
        </div>
        <div class="acp2-budget-bar-wrap">
          <div class="acp2-budget-bar">
            <div class="acp2-budget-bar-fill" :style="`width:${Math.min(budgetPercent, 100)}%`"
              :class="budgetPercent > 100 ? 'acp2-budget-bar-fill--over' : 'acp2-budget-bar-fill--ok'"/>
          </div>
          <span class="acp2-budget-pct">{{ budgetPercent }}%</span>
        </div>
      </div>

      <!-- ── Диаграмма Ганта ───────────────────────────────────────── -->
      <div v-if="ganttReady && form.cp_stages.length" class="acp2-section">
        <div class="acp2-section-title">диаграмма ганта</div>
        <div class="acp2-gantt">
          <div class="acp2-gantt-scale">
            <div v-for="tick in ganttTicks" :key="tick.label" class="acp2-gantt-tick"
              :style="`left:${tick.pct}%`">{{ tick.label }}</div>
          </div>
          <div v-for="stage in form.cp_stages" :key="stage.id" class="acp2-gantt-row">
            <div class="acp2-gantt-row-label">{{ stage.title }}</div>
            <div class="acp2-gantt-row-track">
              <div
                class="acp2-gantt-bar"
                :class="`acp2-gantt-bar--${stage.status || 'pending'}`"
                :style="ganttBarStyle(stage)"
                :title="`${stage.startDate} → ${stage.endDate} · ${stage.progress}%`"
              >
                <div class="acp2-gantt-bar-fill" :style="`width:${stage.progress || 0}%`"/>
                <span class="acp2-gantt-bar-label">{{ stage.progress || 0 }}%</span>
              </div>
            </div>
          </div>
          <div class="acp2-gantt-today" :style="`left:calc(${todayPct}% + 76px)`">
            <div class="acp2-gantt-today-line"/>
            <span class="acp2-gantt-today-label">сегодня</span>
          </div>
        </div>
      </div>

      <!-- ── Этапы строительства ───────────────────────────────────── -->
      <div class="acp2-section">
        <div class="acp2-section-title">
          <span>этапы строительства</span>
          <button class="acp2-add-btn" @click="addStage">+ этап</button>
        </div>

        <div v-if="form.cp_stages.length" class="acp2-stages">
          <div
            v-for="(stage, si) in form.cp_stages"
            :key="stage.id"
            class="acp2-stage"
            :class="`acp2-stage--${stage.status || 'pending'}`"
          >
            <!-- Заголовок этапа -->
            <div class="acp2-stage-head" @click="toggleStage(stage.id)">
              <div class="acp2-stage-head-left">
                <span class="acp2-stage-dot" :class="`acp2-dot--${stageStatusColor(stage.status)}`"/>
                <input
                  v-model="stage.title"
                  class="acp2-stage-name-input"
                  placeholder="название этапа"
                  @click.stop
                  @blur="save"
                />
                <span class="acp2-stage-badge" :class="`acp2-badge--${stage.status || 'pending'}`">
                  {{ stageStatusLabel(stage.status) }}
                </span>
              </div>
              <div class="acp2-stage-head-right">
                <span class="acp2-stage-progress-text">{{ stage.progress || 0 }}%</span>
                <div class="acp2-stage-mini-bar">
                  <div class="acp2-stage-mini-fill" :style="`width:${stage.progress || 0}%`"/>
                </div>
                <span class="acp2-stage-chevron">{{ expandedStages.has(stage.id) ? '▲' : '▼' }}</span>
              </div>
            </div>

            <!-- Тело этапа (expandable) -->
            <div v-show="expandedStages.has(stage.id)" class="acp2-stage-body">
              <div class="u-grid-2" style="margin-bottom:12px">
                <div class="u-field">
                  <label class="u-field__label">статус</label>
                  <select v-model="stage.status" class="u-status-sel" @change="save">
                    <option value="pending">ожидание</option>
                    <option value="in_progress">выполняется</option>
                    <option value="on_hold">приостановлен</option>
                    <option value="done">завершён ✓</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">прогресс %</label>
                  <div class="acp2-progress-input-wrap">
                    <input v-model.number="stage.progress" type="range" min="0" max="100" step="5" class="acp2-range" @change="save">
                    <span class="acp2-range-val">{{ stage.progress || 0 }}%</span>
                  </div>
                </div>
                <div class="u-field">
                  <label class="u-field__label">подрядчик</label>
                  <input v-model="stage.contractor" class="glass-input" placeholder="компания / ФИО" @blur="save">
                </div>
                <div class="u-field">
                  <label class="u-field__label">бюджет этапа ₽</label>
                  <input v-model.number="stage.budget" type="number" min="0" class="glass-input" placeholder="0" @blur="save">
                </div>
                <div class="u-field">
                  <label class="u-field__label">дата начала</label>
                  <AppDatePicker v-model="stage.startDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">дата окончания</label>
                  <AppDatePicker v-model="stage.endDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
                </div>
                <div class="u-field u-field--full">
                  <label class="u-field__label">примечание</label>
                  <textarea v-model="stage.notes" class="glass-input u-ta" rows="2" @blur="save"/>
                </div>
              </div>

              <!-- Задачи этапа -->
              <div class="acp2-tasks-section">
                <div class="acp2-tasks-header">
                  <span class="acp2-tasks-label">задачи</span>
                  <button class="acp2-task-add-btn" @click="addTask(stage)">+ задача</button>
                </div>
                <div v-if="stage.tasks && stage.tasks.length" class="acp2-task-list">
                  <div v-for="(task, ti) in stage.tasks" :key="task.id" class="acp2-task">
                    <div class="acp2-task-row">
                      <button class="acp2-task-status-btn"
                        :class="`acp2-task-status-btn--${task.status}`"
                        @click="cycleTaskStatus(task)"
                        :title="taskStatusLabel(task.status)"
                      >{{ taskStatusIcon(task.status) }}</button>
                      <input v-model="task.title" class="glass-input acp2-task-title" placeholder="задача..." @blur="save">
                      <AppDatePicker v-model="task.dueDate" model-type="iso" input-class="acp2-task-date" @update:model-value="save" />
                      <button class="acp2-task-del" @click="removeTask(stage, ti)">×</button>
                    </div>
                    <input v-model="task.notes" class="glass-input acp2-task-notes" placeholder="заметка..." @blur="save">
                  </div>
                </div>
                <div v-else class="acp2-tasks-empty">Задачи не добавлены</div>
              </div>

              <div style="display:flex;justify-content:flex-end;margin-top:12px">
                <button class="acp2-stage-del-btn" @click="removeStage(si)">удалить этап</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="acp2-empty">Этапы ещё не созданы. Нажмите «+ этап» чтобы начать.</div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const showInfo = ref(true)
const expandedStages = ref<Set<string>>(new Set())

const form = reactive<any>({
  cp_status: '',
  cp_start_date: '',
  cp_end_date: '',
  cp_contractor: '',
  cp_supervisor: '',
  cp_budget_total: null,
  cp_budget_spent: null,
  cp_notes: '',
  cp_stages: [] as any[],
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  ;['cp_status','cp_start_date','cp_end_date','cp_contractor','cp_supervisor','cp_budget_total','cp_budget_spent','cp_notes'].forEach(k => {
    if (pf[k] !== undefined) form[k] = pf[k]
  })
  if (pf.cp_stages && Array.isArray(pf.cp_stages)) {
    form.cp_stages = pf.cp_stages
  }
}, { immediate: true })

async function save() {
  const payload: Record<string, any> = {}
  ;['cp_status','cp_start_date','cp_end_date','cp_contractor','cp_supervisor','cp_budget_total','cp_budget_spent','cp_notes'].forEach(k => {
    payload[k] = form[k]
  })
  payload.cp_stages = form.cp_stages
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...payload } },
  })
  markSaved()
}

const daysLeft = computed(() => {
  if (!form.cp_end_date) return 0
  return Math.ceil((new Date(form.cp_end_date).getTime() - Date.now()) / 86400000)
})

const overallProgress = computed(() => {
  if (!form.cp_stages.length) return 0
  const total = form.cp_stages.reduce((s: number, st: any) => s + (st.progress || 0), 0)
  return Math.round(total / form.cp_stages.length)
})

const budgetSpentTotal = computed(() => {
  if (form.cp_budget_spent) return form.cp_budget_spent
  return form.cp_stages.reduce((s: number, st: any) => st.status === 'done' ? s + (st.budget || 0) : s, 0)
})
const budgetRemainder = computed(() => (form.cp_budget_total || 0) - budgetSpentTotal.value)
const budgetPercent   = computed(() => {
  if (!form.cp_budget_total) return 0
  return Math.round((budgetSpentTotal.value / form.cp_budget_total) * 100)
})

function fmtMoney(n: number) {
  return Math.round(n || 0).toLocaleString('ru-RU')
}

const ganttReady = computed(() => !!form.cp_start_date && !!form.cp_end_date)
const ganttStart = computed(() => new Date(form.cp_start_date || Date.now()).getTime())
const ganttEnd   = computed(() => new Date(form.cp_end_date || Date.now()).getTime())
const ganttSpan  = computed(() => Math.max(ganttEnd.value - ganttStart.value, 1))
const todayPct   = computed(() => {
  const p = ((Date.now() - ganttStart.value) / ganttSpan.value) * 100
  return Math.max(0, Math.min(100, p))
})

const ganttTicks = computed(() => {
  if (!ganttReady.value) return []
  const ticks: {label:string;pct:number}[] = []
  const months = Math.ceil(ganttSpan.value / (30 * 86400000))
  const step   = Math.max(1, Math.ceil(months / 6))
  const cur = new Date(ganttStart.value)
  cur.setDate(1)
  while (cur.getTime() < ganttEnd.value) {
    const pct = ((cur.getTime() - ganttStart.value) / ganttSpan.value) * 100
    if (pct >= 0 && pct <= 100)
      ticks.push({ label: cur.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }), pct })
    cur.setMonth(cur.getMonth() + step)
  }
  return ticks
})

function ganttBarStyle(stage: any) {
  if (!ganttReady.value || !stage.startDate || !stage.endDate) return ''
  const s    = new Date(stage.startDate).getTime()
  const e    = new Date(stage.endDate).getTime()
  const left = ((s - ganttStart.value) / ganttSpan.value) * 100
  const w    = ((e - s) / ganttSpan.value) * 100
  return `left:${Math.max(0, left)}%;width:${Math.max(2, w)}%`
}

function addStage() {
  const id = `s_${Date.now()}`
  form.cp_stages.push({
    id, title: 'Новый этап', status: 'pending', progress: 0,
    startDate: '', endDate: '', contractor: '', budget: null, notes: '',
    tasks: [],
  })
  expandedStages.value.add(id)
  save()
}

function removeStage(i: number) {
  if (!confirm('Удалить этап со всеми задачами?')) return
  form.cp_stages.splice(i, 1)
  save()
}

function toggleStage(id: string) {
  if (expandedStages.value.has(id)) expandedStages.value.delete(id)
  else expandedStages.value.add(id)
}

function addTask(stage: any) {
  if (!stage.tasks) stage.tasks = []
  stage.tasks.push({ id: `t_${Date.now()}`, title: '', status: 'pending', dueDate: '', notes: '' })
  save()
}

function removeTask(stage: any, ti: number) {
  stage.tasks.splice(ti, 1)
  save()
}

function cycleTaskStatus(task: any) {
  const cycle: Record<string,string> = { pending:'in_progress', in_progress:'done', done:'pending' }
  task.status = cycle[task.status] || 'pending'
  save()
}

function stageStatusLabel(s: string) {
  return ({pending:'ожидание',in_progress:'в работе',on_hold:'пауза',done:'готово ✓'} as any)[s] || s
}
function stageStatusColor(s: string) {
  return ({pending:'gray',in_progress:'blue',on_hold:'orange',done:'green'} as any)[s] || 'gray'
}
function taskStatusIcon(s: string)  {
  return ({pending:'○',in_progress:'◑',done:'●'} as any)[s] || '○'
}
function taskStatusLabel(s: string) {
  return ({pending:'ожидание',in_progress:'в работе',done:'выполнено'} as any)[s] || s
}
</script>

<style scoped>
.acp2-wrap { padding: 4px 0 40px; }

.acp2-header          { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:20px; background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 11%, transparent); border-radius:10px; padding:14px 16px; }
.acp2-header-left     { display:flex; align-items:center; gap:10px; }
.acp2-saved           { font-size:.73rem; color:var(--ds-success); }
.acp2-total-progress  { flex:1; min-width:200px; }
.acp2-progress-label  { font-size:.75rem; color:color-mix(in srgb, var(--glass-text) 55%, transparent); margin-bottom:5px; display:flex; justify-content:space-between; }
.acp2-progress-label strong { color:color-mix(in srgb, var(--glass-text) 80%, transparent); }
.acp2-progress-bar    { height:6px; background:color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius:4px; overflow:hidden; }
.acp2-progress-fill   { height:100%; border-radius:4px; transition:width .3s; }
.acp2-progress-fill--in_progress { background:linear-gradient(90deg,var(--ds-accent),var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white))); }
.acp2-progress-fill--planning    { background:color-mix(in srgb, var(--ds-accent) 35%, var(--glass-text)); }
.acp2-progress-fill--done        { background:var(--ds-success); }
.acp2-progress-fill--on_hold     { background:var(--ds-warning); }

.acp2-countdown        { text-align:center; padding:6px 12px; border-radius:8px; background:var(--glass-page-bg); border:1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); min-width:100px; }
.acp2-countdown-num    { display:block; font-size:1.4rem; font-weight:700; color:color-mix(in srgb, var(--glass-text) 80%, transparent); line-height:1; }
.acp2-countdown-label  { font-size:.68rem; color:color-mix(in srgb, var(--glass-text) 42%, transparent); }
.acp2-countdown-empty  { font-size:.75rem; color:color-mix(in srgb, var(--glass-text) 30%, transparent); }
.acp2-countdown--late .acp2-countdown-num { color:var(--ds-error); }
.acp2-countdown--warn .acp2-countdown-num { color:var(--ds-warning); }

.acp2-section       { margin-bottom:20px; }
.acp2-section-title { font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:color-mix(in srgb, var(--glass-text) 55%, transparent); margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; }
.acp2-add-btn       { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-accent) 35%, transparent); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); border-radius:6px; padding:4px 12px; font-size:.75rem; cursor:pointer; }
.acp2-add-btn:hover { background:color-mix(in srgb, var(--ds-accent) 20%, var(--glass-bg)); }
.acp2-collapse-btn  { background:none; border:none; color:color-mix(in srgb, var(--glass-text) 42%, transparent); cursor:pointer; font-size:.75rem; padding:2px 6px; }

.acp2-budget-summary { display:flex; align-items:center; gap:16px; flex-wrap:wrap; background:color-mix(in srgb, var(--ds-accent) 8%, var(--glass-page-bg)); border:1px solid #1a2a40; border-radius:8px; padding:12px 16px; margin-bottom:20px; }
.acp2-budget-item    { display:flex; flex-direction:column; gap:2px; }
.acp2-budget-label   { font-size:.7rem; color:color-mix(in srgb, var(--glass-text) 42%, transparent); text-transform:uppercase; letter-spacing:.04em; }
.acp2-budget-val     { font-size:.88rem; font-weight:600; color:color-mix(in srgb, var(--glass-text) 80%, transparent); }
.acp2-budget-val--spent { color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.acp2-budget-val--ok    { color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); }
.acp2-budget-val--over  { color:var(--ds-error); }
.acp2-budget-bar-wrap { flex:1; min-width:160px; display:flex; align-items:center; gap:8px; }
.acp2-budget-bar      { flex:1; height:6px; background:color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius:4px; overflow:hidden; }
.acp2-budget-bar-fill { height:100%; border-radius:4px; transition:width .3s; }
.acp2-budget-bar-fill--ok   { background:var(--ds-success); }
.acp2-budget-bar-fill--over { background:var(--ds-error); }
.acp2-budget-pct { font-size:.75rem; color:color-mix(in srgb, var(--glass-text) 55%, transparent); min-width:40px; }

.acp2-gantt               { background:color-mix(in srgb, var(--glass-bg) 80%, var(--glass-page-bg)); border:1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius:10px; padding:12px 12px 12px 0; overflow-x:auto; position:relative; min-height:60px; }
.acp2-gantt-scale         { position:relative; height:20px; margin-left:76px; margin-bottom:8px; }
.acp2-gantt-tick          { position:absolute; font-size:.62rem; color:color-mix(in srgb, var(--glass-text) 35%, transparent); transform:translateX(-50%); white-space:nowrap; }
.acp2-gantt-row           { display:flex; align-items:center; min-height:28px; margin-bottom:4px; }
.acp2-gantt-row-label     { width:72px; flex-shrink:0; font-size:.68rem; color:color-mix(in srgb, var(--glass-text) 48%, transparent); text-align:right; padding-right:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.acp2-gantt-row-track     { flex:1; position:relative; height:20px; }
.acp2-gantt-bar           { position:absolute; height:16px; top:2px; border-radius:3px; min-width:3px; overflow:hidden; }
.acp2-gantt-bar--pending    { background:color-mix(in srgb, var(--glass-text) 20%, transparent); }
.acp2-gantt-bar--in_progress{ background:color-mix(in srgb, var(--ds-accent) 15%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-accent) 30%, transparent); }
.acp2-gantt-bar--on_hold    { background:color-mix(in srgb, var(--ds-warning) 12%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-warning) 28%, transparent); }
.acp2-gantt-bar--done       { background:color-mix(in srgb, var(--ds-success) 12%, var(--glass-bg)); border:1px solid var(--ds-success); }
.acp2-gantt-bar-fill        { height:100%; background:color-mix(in srgb, var(--ds-accent) 40%, transparent); }
.acp2-gantt-bar-label       { position:absolute; right:4px; top:50%; transform:translateY(-50%); font-size:.6rem; color:color-mix(in srgb, var(--glass-text) 65%, transparent); }
.acp2-gantt-today           { position:absolute; top:24px; bottom:0; display:flex; flex-direction:column; align-items:center; pointer-events:none; }
.acp2-gantt-today-line      { width:1px; flex:1; background:var(--ds-warning); opacity:.6; }
.acp2-gantt-today-label     { font-size:.58rem; color:var(--ds-warning); white-space:nowrap; background:color-mix(in srgb, var(--glass-bg) 80%, var(--glass-page-bg)); padding:0 2px; }

.acp2-stages   { display:flex; flex-direction:column; gap:10px; }
.acp2-stage    { background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); border-radius:10px; overflow:hidden; }
.acp2-stage--in_progress { border-left:3px solid var(--ds-accent); }
.acp2-stage--done        { border-left:3px solid var(--ds-success); }
.acp2-stage--on_hold     { border-left:3px solid var(--ds-warning); }
.acp2-stage--pending     { border-left:3px solid color-mix(in srgb, var(--glass-text) 30%, transparent); }

.acp2-stage-head       { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 14px; cursor:pointer; user-select:none; }
.acp2-stage-head:hover { background:var(--glass-bg); }
.acp2-stage-head-left  { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
.acp2-stage-head-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

.acp2-stage-dot    { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.acp2-dot--gray    { background:color-mix(in srgb, var(--ds-accent) 35%, var(--glass-text)); }
.acp2-dot--blue    { background:var(--ds-accent); }
.acp2-dot--orange  { background:var(--ds-warning); }
.acp2-dot--green   { background:var(--ds-success); }

.acp2-stage-name-input { background:transparent; border:none; color:color-mix(in srgb, var(--glass-text) 87%, transparent); font-size:.88rem; font-weight:600; outline:none; flex:1; min-width:0; }
.acp2-stage-name-input:focus { background:color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg)); border-bottom:1px solid color-mix(in srgb, var(--glass-text) 30%, transparent); }

.acp2-stage-badge     { font-size:.68rem; padding:2px 7px; border-radius:4px; flex-shrink:0; }
.acp2-badge--pending     { background:color-mix(in srgb, var(--glass-text) 10%, transparent); color:color-mix(in srgb, var(--glass-text) 55%, transparent); }
.acp2-badge--in_progress { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.acp2-badge--on_hold     { background:color-mix(in srgb, var(--ds-warning) 10%, var(--glass-bg)); color:var(--ds-warning); }
.acp2-badge--done        { background:color-mix(in srgb, var(--ds-success) 12%, var(--glass-bg)); color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); }

.acp2-stage-progress-text { font-size:.72rem; color:color-mix(in srgb, var(--glass-text) 55%, transparent); }
.acp2-stage-mini-bar  { width:60px; height:4px; background:color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius:2px; overflow:hidden; }
.acp2-stage-mini-fill { height:100%; background:var(--ds-accent); border-radius:2px; transition:width .3s; }
.acp2-stage-chevron   { font-size:.65rem; color:color-mix(in srgb, var(--glass-text) 35%, transparent); }

.acp2-stage-body { padding:14px 16px 16px; border-top:1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); }

.acp2-tasks-section { background:color-mix(in srgb, var(--glass-bg) 75%, var(--glass-page-bg)); border:1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius:8px; padding:12px; }
.acp2-tasks-header  { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.acp2-tasks-label   { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:color-mix(in srgb, var(--glass-text) 42%, transparent); }
.acp2-task-add-btn  { background:none; border:1px solid color-mix(in srgb, var(--glass-text) 14%, transparent); color:color-mix(in srgb, var(--glass-text) 55%, transparent); border-radius:5px; padding:2px 10px; font-size:.72rem; cursor:pointer; }
.acp2-task-add-btn:hover { background:color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg)); }
.acp2-task-list  { display:flex; flex-direction:column; gap:4px; }
.acp2-task       { display:flex; flex-direction:column; gap:3px; }
.acp2-task-row   { display:flex; align-items:center; gap:6px; }

.acp2-task-status-btn { width:22px; height:22px; flex-shrink:0; background:none; border:none; cursor:pointer; font-size:.95rem; padding:0; display:flex; align-items:center; justify-content:center; }
.acp2-task-status-btn--pending     { color:color-mix(in srgb, var(--glass-text) 35%, transparent); }
.acp2-task-status-btn--in_progress { color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.acp2-task-status-btn--done        { color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); }

.acp2-task-title { flex:1; padding:4px 8px; font-size:.8rem; }
.acp2-task-date  { width:120px; background:var(--glass-page-bg); border:1px solid color-mix(in srgb, var(--glass-text) 11%, transparent); border-radius:5px; color:color-mix(in srgb, var(--glass-text) 48%, transparent); padding:4px 8px; font-size:.75rem; }
.acp2-task-notes { font-size:.76rem; color:color-mix(in srgb, var(--glass-text) 42%, transparent); padding:3px 8px 3px 30px; margin-top:1px; }
.acp2-task-del   { background:none; border:none; color:color-mix(in srgb, var(--glass-text) 30%, transparent); cursor:pointer; font-size:1rem; padding:0 4px; flex-shrink:0; }
.acp2-task-del:hover { color:var(--ds-error); }
.acp2-tasks-empty { font-size:.76rem; color:color-mix(in srgb, var(--glass-text) 30%, transparent); padding:8px 0; text-align:center; }

.acp2-stage-del-btn { background:none; border:1px solid color-mix(in srgb, var(--ds-error) 18%, transparent); color:var(--ds-error); border-radius:6px; padding:4px 12px; font-size:.73rem; cursor:pointer; }
.acp2-stage-del-btn:hover { background:color-mix(in srgb, var(--ds-error) 10%, var(--glass-bg)); }

.acp2-progress-input-wrap { display:flex; align-items:center; gap:8px; }
.acp2-range     { flex:1; accent-color:var(--ds-accent); }
.acp2-range-val { font-size:.78rem; color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); min-width:36px; }

.acp2-empty { text-align:center; padding:40px 20px; color:color-mix(in srgb, var(--glass-text) 30%, transparent); font-size:.84rem; }
</style>
