<template>
  <div class="acp-wrap">
    <div v-if="pending" class="acp-loading">Загрузка...</div>
    <template v-else>

      <div class="acp-status-row">
        <span class="acp-dot" :class="`acp-dot--${statusColor}`"></span>
        <select v-model="form.cp_status" class="acp-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="planning">планирование</option>
          <option value="in_progress">ведётся строительство</option>
          <option value="on_hold">приостановлено</option>
          <option value="done">завершено ✓</option>
        </select>
        <span v-if="savedAt" class="acp-saved">✓ {{ savedAt }}</span>
      </div>

      <div class="acp-section">
        <div class="acp-section-title">общая информация</div>
        <div class="acp-rows">
          <div class="acp-row">
            <label class="acp-lbl">дата начала работ</label>
            <AppDatePicker v-model="form.cp_start_date" model-type="iso" input-class="acp-inp" @update:model-value="save" />
          </div>
          <div class="acp-row">
            <label class="acp-lbl">плановая дата окончания</label>
            <AppDatePicker v-model="form.cp_end_date" model-type="iso" input-class="acp-inp" @update:model-value="save" />
          </div>
          <div class="acp-row">
            <label class="acp-lbl">генеральный подрядчик</label>
            <input v-model="form.cp_contractor" class="acp-inp" placeholder="название компании" @blur="save">
          </div>
          <div class="acp-row">
            <label class="acp-lbl">авторский надзор</label>
            <input v-model="form.cp_supervisor" class="acp-inp" placeholder="ФИО / компания" @blur="save">
          </div>
          <div class="acp-row acp-row--full">
            <label class="acp-lbl">примечания</label>
            <textarea v-model="form.cp_notes" class="acp-inp acp-ta" rows="3" @blur="save" />
          </div>
        </div>
      </div>

      <div class="acp-section">
        <div class="acp-section-title">
          план работ
          <button class="acp-add-btn" @click="addTask">+ добавить</button>
        </div>
        <div v-if="form.cp_tasks.length" class="acp-tasks">
          <div v-for="(t, i) in form.cp_tasks" :key="i" class="acp-task">
            <select v-model="t.status" class="acp-task-status" @change="save">
              <option value="pending">◯</option>
              <option value="in_progress">◑</option>
              <option value="done">●</option>
            </select>
            <input v-model="t.title" class="acp-task-inp" placeholder="вид работ..." @blur="save">
            <AppDatePicker v-model="t.date" model-type="iso" input-class="acp-task-date" @update:model-value="save" />
            <button class="acp-task-del" @click="removeTask(i)">×</button>
          </div>
        </div>
        <div v-else class="acp-empty">Задачи не добавлены</div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const form = reactive<any>({
  cp_status: '',
  cp_start_date: '',
  cp_end_date: '',
  cp_contractor: '',
  cp_supervisor: '',
  cp_notes: '',
  cp_tasks: [] as any[],
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => { if (pf[k] !== undefined) (form as any)[k] = pf[k] })
  if (!Array.isArray(form.cp_tasks)) form.cp_tasks = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'cp_status')

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

function addTask() {
  form.cp_tasks.push({ title: '', status: 'pending', date: '' })
}
function removeTask(i: number) {
  form.cp_tasks.splice(i, 1)
  save()
}
</script>

<style scoped>
.acp-wrap { padding: 4px 0 40px; }
.acp-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }
.acp-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.acp-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.acp-dot--gray   { background: #ccc; }
.acp-dot--blue   { background: #6b9fd4; }
.acp-dot--yellow { background: #e8b84b; }
.acp-dot--red    { background: #d46b6b; }
.acp-dot--green  { background: #5caa7f; }
.acp-status-sel { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.acp-saved { font-size: .72rem; color: #5caa7f; margin-left: auto; }
.acp-section { margin-bottom: 32px; }
.acp-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); display: flex; align-items: center; gap: 10px; }
.acp-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.acp-row { display: flex; flex-direction: column; gap: 5px; }
.acp-row--full { grid-column: 1 / -1; }
.acp-lbl { font-size: .72rem; color: #999; }
.acp-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; }
.acp-inp:focus { border-color: #aaa; }
.acp-ta { resize: vertical; }
.acp-add-btn { margin-left: auto; border: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-size: .7rem; padding: 3px 8px; cursor: pointer; font-family: inherit; }
.acp-add-btn:hover { border-color: #aaa; }
.acp-tasks { display: flex; flex-direction: column; gap: 6px; }
.acp-task { display: flex; align-items: center; gap: 8px; }
.acp-task-status { border: 1px solid var(--border, #e0e0e0); background: none; color: inherit; padding: 5px 6px; font-size: .78rem; cursor: pointer; width: 48px; flex-shrink: 0; }
.acp-task-inp { flex: 1; border: 1px solid var(--border, #e0e0e0); padding: 6px 10px; font-size: .8rem; background: none; color: inherit; font-family: inherit; outline: none; }
.acp-task-date { width: 130px; border: 1px solid var(--border, #e0e0e0); padding: 6px 10px; font-size: .78rem; background: none; color: inherit; font-family: inherit; outline: none; flex-shrink: 0; }
.acp-task-del { background: none; border: none; cursor: pointer; color: #bbb; font-size: 1.1rem; line-height: 1; padding: 0 3px; flex-shrink: 0; }
.acp-task-del:hover { color: #c00; }
.acp-empty { font-size: .78rem; color: #bbb; padding: 20px 0; text-align: center; border: 1px dashed var(--border, #ececec); }
</style>
