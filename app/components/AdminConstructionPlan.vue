<template>
  <div class="acp-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <div class="acp-status-row">
        <span class="acp-dot" :class="`acp-dot--${statusColor}`"></span>
        <select v-model="form.cp_status" class="u-status-sel" @change="save">
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
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">дата начала работ</label>
            <AppDatePicker v-model="form.cp_start_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">плановая дата окончания</label>
            <AppDatePicker v-model="form.cp_end_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">генеральный подрядчик</label>
            <input v-model="form.cp_contractor" class="glass-input" placeholder="название компании" @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">авторский надзор</label>
            <input v-model="form.cp_supervisor" class="glass-input" placeholder="ФИО / компания" @blur="save">
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">примечания</label>
            <textarea v-model="form.cp_notes" class="glass-input u-ta" rows="3" @blur="save" />
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
            <select v-model="t.status" class="u-status-sel" @change="save">
              <option value="pending">◯</option>
              <option value="in_progress">◑</option>
              <option value="done">●</option>
            </select>
            <input v-model="t.title" class="glass-input glass-input--inline" placeholder="вид работ..." @blur="save">
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
.acp-loading { padding: 40px 0; font-size: .82rem; color: var(--ds-muted, #aaa); }
.acp-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.acp-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
/* dot colors: → main.css [class*="-dot--*"] */
</style>
