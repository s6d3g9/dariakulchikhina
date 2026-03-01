<template>
  <div class="amep-wrap">
    <div v-if="pending" class="amep-loading">Загрузка...</div>
    <template v-else>

      <!-- Status row -->
      <div class="amep-status-row">
        <span class="amep-dot" :class="`amep-dot--${statusColor}`"></span>
        <select v-model="form.mep_status" class="amep-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="collecting">сбор данных</option>
          <option value="in_work">проектирование</option>
          <option value="coordination">согласование инженеров</option>
          <option value="review">проверка</option>
          <option value="approved">согласовано ✓</option>
        </select>
        <span v-if="savedAt" class="amep-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: Engineering disciplines -->
      <div class="amep-section">
        <div class="amep-section-title">инженерные системы</div>

        <div class="amep-disciplines">
          <div v-for="d in disciplines" :key="d.key" class="amep-disc-card">
            <div class="amep-disc-header">
              <span class="amep-disc-icon">{{ d.icon }}</span>
              <span class="amep-disc-name">{{ d.label }}</span>
              <select v-model="form[`mep_${d.key}_status`]" class="amep-disc-status" @change="save">
                <option value="">—</option>
                <option value="not_needed">не требуется</option>
                <option value="pending">ожидание</option>
                <option value="in_work">в работе</option>
                <option value="done">готово ✓</option>
              </select>
            </div>
            <div class="amep-disc-body">
              <input v-model="form[`mep_${d.key}_contractor`]" class="amep-inp" placeholder="подрядчик / инженер" @blur="save">
              <textarea v-model="form[`mep_${d.key}_notes`]" class="amep-inp amep-ta" rows="1" placeholder="заметки..." @blur="save" />
            </div>
          </div>
        </div>
      </div>

      <!-- Section: General notes -->
      <div class="amep-section">
        <div class="amep-section-title">общие заметки</div>
        <textarea v-model="form.mep_general_notes" class="amep-inp amep-ta" rows="3" @blur="save" placeholder="координация, столкновения, особые требования..." />
      </div>

      <!-- Section: Files -->
      <div class="amep-section">
        <div class="amep-section-title">файлы</div>
        <div class="amep-files" v-if="form.mep_files?.length">
          <div v-for="(f, idx) in form.mep_files" :key="idx" class="amep-file">
            <a :href="f.url" target="_blank" class="amep-file-name">📄 {{ f.filename }}</a>
            <span class="amep-file-type">{{ f.discipline || '' }}</span>
            <button class="amep-del" @click="removeFile(Number(idx))">×</button>
          </div>
        </div>
        <label class="amep-upload-btn" :class="{ 'amep-upload-btn--loading': uploading }">
          {{ uploading ? 'загрузка...' : '+ добавить файл' }}
          <input type="file" multiple accept=".pdf,.dwg,.dxf,.rvt,.ifc" style="display:none" @change="onFileInput" :disabled="uploading">
        </label>
      </div>

      <!-- Checks -->
      <div class="amep-section">
        <div class="amep-section-title">контроль</div>
        <div class="amep-checks">
          <label class="amep-check"><input type="checkbox" v-model="form.mep_clash_checked" @change="save"> коллизии проверены</label>
          <label class="amep-check"><input type="checkbox" v-model="form.mep_loads_calculated" @change="save"> нагрузки рассчитаны</label>
          <label class="amep-check"><input type="checkbox" v-model="form.mep_permits_ok" @change="save"> разрешения получены</label>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref(false)

const disciplines = [
  { key: 'electrical',  label: 'Электрика',    icon: '⚡' },
  { key: 'plumbing',    label: 'Сантехника',   icon: '🚿' },
  { key: 'hvac',        label: 'Вентиляция',   icon: '🌬' },
  { key: 'heating',     label: 'Отопление',    icon: '🔥' },
  { key: 'weak_current',label: 'Слаботочка',   icon: '📡' },
  { key: 'fire_safety', label: 'Пожарная безопасность', icon: '🧯' },
]

const form = reactive<any>({
  mep_status:           '',
  mep_general_notes:    '',
  mep_files:            [] as any[],
  mep_clash_checked:    false,
  mep_loads_calculated: false,
  mep_permits_ok:       false,
  // Per-discipline fields will be accessed dynamically:
  // mep_electrical_status, mep_electrical_contractor, mep_electrical_notes, etc.
})

// Initialize per-discipline keys
for (const d of disciplines) {
  form[`mep_${d.key}_status`] = ''
  form[`mep_${d.key}_contractor`] = ''
  form[`mep_${d.key}_notes`] = ''
}

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.mep_files)) form.mep_files = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'mep_status')

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

async function onFileInput(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  for (const f of Array.from(files)) {
    const fd = new FormData()
    fd.append('file', f)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    form.mep_files.push({ url: res.url, filename: f.name, discipline: '' })
  }
  uploading.value = false
  save()
}

function removeFile(idx: number) {
  form.mep_files.splice(idx, 1)
  save()
}
</script>

<style scoped>
.amep-wrap { padding: 4px 0 40px; }
.amep-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.amep-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.amep-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.amep-dot--gray   { background: #ccc; }
.amep-dot--blue   { background: #6b9fd4; }
.amep-dot--yellow { background: #e8b84b; }
.amep-dot--red    { background: #d46b6b; }
.amep-dot--green  { background: #5caa7f; }
.amep-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.amep-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.amep-section { margin-bottom: 32px; }
.amep-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.amep-inp { width: 100%; border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; box-sizing: border-box; }
.amep-inp:focus { border-color: #aaa; }
.amep-ta  { resize: vertical; }

/* Disciplines grid */
.amep-disciplines { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.amep-disc-card { border: 1px solid var(--border, #e0e0e0); padding: 12px; }
.amep-disc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.amep-disc-icon { font-size: 1.1rem; }
.amep-disc-name { font-size: .8rem; font-weight: 500; flex: 1; }
.amep-disc-status { border: 1px solid var(--border, #e0e0e0); background: none; font-size: .72rem; padding: 2px 6px; font-family: inherit; color: inherit; }
.amep-disc-body { display: flex; flex-direction: column; gap: 6px; }

/* Files */
.amep-files { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.amep-file { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid var(--border, #e0e0e0); }
.amep-file-name { font-size: .78rem; color: inherit; text-decoration: none; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.amep-file-name:hover { text-decoration: underline; }
.amep-file-type { font-size: .68rem; color: #aaa; }
.amep-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1rem; }
.amep-del:hover { color: #c00; }
.amep-upload-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.amep-upload-btn:hover { border-color: #aaa; color: inherit; }
.amep-upload-btn--loading { opacity: .6; cursor: wait; }

.amep-checks { display: flex; flex-wrap: wrap; gap: 16px; }
.amep-check { display: flex; align-items: center; gap: 8px; font-size: .82rem; cursor: pointer; }

@media (max-width: 640px) {
  .amep-disciplines { grid-template-columns: 1fr; }
}
</style>
