<template>
  <div class="amep-wrap">
    <div v-if="pending" class="amep-loading">Загрузка...</div>
    <template v-else>

      <!-- Status row -->
      <div class="amep-status-row">
        <span class="amep-dot" :class="`amep-dot--${statusColor}`"></span>
        <select v-model="form.mep_status" class="u-status-sel" @change="save">
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
              <select v-model="form[`mep_${d.key}_status`]" class="u-status-sel" @change="save">
                <option value="">—</option>
                <option value="not_needed">не требуется</option>
                <option value="pending">ожидание</option>
                <option value="in_work">в работе</option>
                <option value="done">готово ✓</option>
              </select>
            </div>
            <div class="amep-disc-body">
              <input v-model="form[`mep_${d.key}_contractor`]" class="glass-input" placeholder="подрядчик / инженер" @blur="save">
              <textarea v-model="form[`mep_${d.key}_notes`]" class="glass-input u-ta" rows="1" placeholder="заметки..." @blur="save" />
            </div>
          </div>
        </div>
      </div>

      <!-- Section: General notes -->
      <div class="amep-section">
        <div class="amep-section-title">общие заметки</div>
        <textarea v-model="form.mep_general_notes" class="glass-input u-ta" rows="3" @blur="save" placeholder="координация, столкновения, особые требования..." />
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
/* dot colors: → main.css [class*="-dot--*"] */
</style>
