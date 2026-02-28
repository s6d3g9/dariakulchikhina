<template>
  <div class="ass-wrap">
    <div v-if="pending" class="ass-loading">Загрузка...</div>
    <template v-else>

      <!-- Survey Status Header -->
      <div class="ass-status-row">
        <span class="ass-status-dot" :class="`ass-dot--${surveyStatusColor}`"></span>
        <select v-model="form.survey_status" class="ass-status-select" @change="save">
          <option value="">статус аудита не задан</option>
          <option value="planned">запланирован</option>
          <option value="in_progress">выполняется</option>
          <option value="completed">завершён ✓</option>
          <option value="revision">на доработке</option>
        </select>
        <span v-if="savedAt" class="ass-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: Visit Info -->
      <div class="ass-section">
        <div class="ass-section-title">информация о выезде</div>
        <div class="ass-rows">
          <div class="ass-row">
            <label class="ass-lbl">дата выезда</label>
            <input v-model="form.survey_date" type="date" class="ass-inp" @change="save">
          </div>
          <div class="ass-row">
            <label class="ass-lbl">инженер / замерщик</label>
            <input v-model="form.survey_engineer" type="text" class="ass-inp" placeholder="ФИО" @blur="save">
          </div>
          <div class="ass-row">
            <label class="ass-lbl">адрес объекта</label>
            <AppAddressInput v-model="form.survey_address" input-class="ass-inp" @blur="save" />
          </div>
          <div class="ass-row">
            <label class="ass-lbl">площадь (м²)</label>
            <input v-model="form.survey_area" type="text" class="ass-inp" placeholder="например: 87.4" @blur="save">
          </div>
          <div class="ass-row">
            <label class="ass-lbl">высота потолков</label>
            <input v-model="form.survey_ceiling" type="text" class="ass-inp" placeholder="например: 3.1 м / на разных участках" @blur="save">
          </div>
        </div>
      </div>

      <!-- Section: MEP Audit -->
      <div class="ass-section">
        <div class="ass-section-title">инженерный аудит (MEP)</div>
        <div class="ass-checks-grid">
          <label v-for="item in mepChecks" :key="item.key" class="ass-check-item">
            <input
              type="checkbox"
              :checked="!!(form as any)[item.key]"
              @change="toggleCheck(item.key)"
              class="ass-checkbox"
            >
            <span class="ass-check-label">{{ item.label }}</span>
            <span :class="['ass-check-status', (form as any)[item.key] ? 'ass-check-ok' : '']">
              {{ (form as any)[item.key] ? 'проверено' : '' }}
            </span>
          </label>
        </div>
        <div class="ass-row" style="margin-top:14px">
          <label class="ass-lbl">заметки по инженерии</label>
          <textarea v-model="form.survey_mep_notes" class="ass-inp ass-ta" rows="3" @blur="save" />
        </div>
      </div>

      <!-- Section: File Uploads -->
      <div class="ass-section">
        <div class="ass-section-title">материалы обследования</div>

        <!-- Existing files -->
        <div v-if="surveyFiles.length" class="ass-files-list">
          <div v-for="(file, idx) in surveyFiles" :key="file.url" class="ass-file-item">
            <span class="ass-file-type-badge" :class="`ass-badge--${file.type}`">{{ fileTypeLabel(file.type) }}</span>
            <a :href="file.url" target="_blank" class="ass-file-link">{{ file.label || file.filename }}</a>
            <span class="ass-file-date">{{ file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('ru') : '' }}</span>
            <button class="ass-file-del" @click="removeFile(idx)">×</button>
          </div>
        </div>
        <div v-else class="ass-files-empty">файлы не загружены</div>

        <!-- Upload section -->
        <div class="ass-upload-zone">
          <div class="ass-upload-row">
            <select v-model="newFileType" class="ass-inp ass-select" style="max-width:180px">
              <option value="pointcloud">облако точек (.e57/.rcp)</option>
              <option value="photo">фотофиксация (.zip/.jpg)</option>
              <option value="mep_report">MEP-отчёт (.pdf)</option>
              <option value="survey_report">акт обмеров (.pdf)</option>
              <option value="floor_plan">поэтажный план</option>
              <option value="other">другое</option>
            </select>
            <input v-model="newFileLabel" class="ass-inp" style="flex:1" placeholder="название / описание файла" type="text">
          </div>
          <label class="ass-upload-btn">
            <span>📎 прикрепить файл</span>
            <input type="file" style="display:none" @change="uploadFile" :accept="uploadAccept">
          </label>
          <span v-if="uploading" class="ass-uploading">загрузка...</span>
        </div>
      </div>

      <!-- Section: Notes -->
      <div class="ass-section">
        <div class="ass-section-title">итоги обследования</div>
        <div class="ass-rows">
          <div class="ass-row">
            <label class="ass-lbl">выявленные проблемы</label>
            <textarea v-model="form.survey_issues" class="ass-inp ass-ta" rows="3"
              placeholder="нарушение несущих конструкций, аварийные трубы, демонтаж..." @blur="save"/>
          </div>
          <div class="ass-row">
            <label class="ass-lbl">рекомендации</label>
            <textarea v-model="form.survey_recommendations" class="ass-inp ass-ta" rows="3"
              placeholder="что необходимо сделать до начала проектирования..." @blur="save"/>
          </div>
          <div class="ass-row">
            <label class="ass-lbl">ДопопционизИнформация</label>
            <textarea v-model="form.survey_notes" class="ass-inp ass-ta" rows="2" @blur="save"/>
          </div>
        </div>
      </div>

      <div class="ass-footer">
        <button class="ass-btn-save" @click="save" :disabled="saving">
          {{ saving ? 'сохранение...' : 'сохранить' }}
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive<Record<string, any>>({
  survey_status: '',
  survey_date: '',
  survey_engineer: '',
  survey_address: '',
  survey_area: '',
  survey_ceiling: '',
  survey_mep_notes: '',
  survey_issues: '',
  survey_recommendations: '',
  survey_notes: '',
})

watch(project, (p) => {
  if (p?.profile) {
    Object.entries(p.profile).forEach(([k, v]) => {
      if (k.startsWith('survey_') || k.startsWith('mep_')) {
        form[k] = v
      }
    })
  }
}, { immediate: true })

// Survey files from profile
const surveyFiles = computed<{url: string; filename: string; label: string; type: string; uploadedAt: string}[]>(() => {
  return project.value?.profile?.survey_files || []
})

// MEP checklist items
const mepChecks = [
  { key: 'mep_ventilation', label: 'Вентиляция' },
  { key: 'mep_plumbing',    label: 'Водоснабжение / канализация' },
  { key: 'mep_electrical',  label: 'Электрощит / проводка' },
  { key: 'mep_heating',     label: 'Отопление' },
  { key: 'mep_gas',         label: 'Газ' },
  { key: 'mep_smart',       label: 'Слаботочные / умный дом' },
  { key: 'mep_balcony',     label: 'Балкон / лоджия' },
  { key: 'mep_structural',  label: 'Несущие конструкции' },
]

function toggleCheck(key: string) {
  form[key] = !form[key]
  save()
}

const surveyStatusColor = computed(() => {
  const m: Record<string, string> = { completed: 'green', in_progress: 'yellow', planned: 'blue', revision: 'red' }
  return m[form.survey_status] || 'gray'
})

function fileTypeLabel(type: string) {
  const m: Record<string, string> = {
    pointcloud: '3D-скан',
    photo: 'фото',
    mep_report: 'MEP',
    survey_report: 'акт',
    floor_plan: 'план',
    other: 'файл',
  }
  return m[type] || type
}

// ── Upload ───────────────────────────────────────────────────────
const newFileType = ref('survey_report')
const newFileLabel = ref('')
const uploading = ref(false)

const uploadAccept = computed(() => {
  const m: Record<string, string> = {
    pointcloud: '.e57,.rcp,.las,.xyz',
    photo: '.jpg,.jpeg,.png,.zip,.tar',
    mep_report: '.pdf,.dwg',
    survey_report: '.pdf',
    floor_plan: '.pdf,.dwg,.png,.jpg',
    other: '*',
  }
  return m[newFileType.value] || '*'
})

async function uploadFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res: any = await $fetch('/api/upload', { method: 'POST', body: fd })
    const currentFiles: any[] = JSON.parse(JSON.stringify(project.value?.profile?.survey_files || []))
    currentFiles.push({
      url: res.url,
      filename: file.name,
      label: newFileLabel.value || file.name,
      type: newFileType.value,
      uploadedAt: new Date().toISOString(),
    })
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...project.value?.profile, ...form, survey_files: currentFiles } }
    })
    newFileLabel.value = ''
    refresh()
  } finally {
    uploading.value = false
  }
}

async function removeFile(idx: number) {
  const files = JSON.parse(JSON.stringify(project.value?.profile?.survey_files || []))
  files.splice(idx, 1)
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...project.value?.profile, ...form, survey_files: files } }
  })
  refresh()
}

// ── Save ─────────────────────────────────────────────────────────
const saving = ref(false)
const savedAt = ref('')

async function save() {
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...project.value?.profile, ...form } }
    })
    const now = new Date()
    savedAt.value = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ass-wrap { padding: 4px 0 48px; }
.ass-loading { font-size: .88rem; color: #999; }

/* Status row */
.ass-status-row {
  display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
  padding: 12px 16px; border: 1px solid var(--border, #e0e0e0);
  background: var(--surface, #fafafa);
}
.ass-status-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.ass-dot--green  { background: #4caf50; }
.ass-dot--yellow { background: #ffb300; }
.ass-dot--blue   { background: #2196f3; }
.ass-dot--red    { background: #f44336; }
.ass-dot--gray   { background: #bdbdbd; }

.ass-status-select {
  border: none; background: transparent; font-family: inherit;
  font-size: .88rem; cursor: pointer; outline: none; color: var(--text, inherit);
}
.ass-saved { font-size: .76rem; color: #9d9; margin-left: auto; }

/* Sections */
.ass-section { margin-bottom: 28px; }
.ass-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: #999;
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
}

/* Rows */
.ass-rows { display: flex; flex-direction: column; gap: 0; }
.ass-row {
  display: grid; grid-template-columns: 160px 1fr; align-items: start;
  padding: 8px 0; border-bottom: 1px solid var(--border, #f0f0f0);
}
.ass-row:last-child { border-bottom: none; }
.ass-lbl { font-size: .76rem; color: #888; padding-top: 6px; }
.ass-inp {
  border: none; border-bottom: 1px solid var(--border, #ddd);
  padding: 6px 0; font-size: .88rem; background: transparent; outline: none;
  font-family: inherit; color: var(--text, inherit); width: 100%;
}
.ass-inp:focus { border-bottom-color: var(--text, #1a1a1a); }
.ass-ta { resize: vertical; min-height: 36px; }
.ass-select { appearance: none; cursor: pointer; }

/* MEP Checks */
.ass-checks-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 6px 16px;
}
.ass-check-item {
  display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 0;
}
.ass-checkbox { width: 14px; height: 14px; cursor: pointer; accent-color: var(--text, #1a1a1a); flex-shrink: 0; }
.ass-check-label { font-size: .82rem; color: var(--text, #333); flex: 1; }
.ass-check-status { font-size: .68rem; color: #bbb; }
.ass-check-ok { color: #4caf50; }

/* Files */
.ass-files-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.ass-file-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border: 1px solid var(--border, #e0e0e0); background: var(--surface, #fafafa);
}
.ass-file-type-badge {
  font-size: .68rem; padding: 2px 8px; border-radius: 2px; font-weight: 500;
  flex-shrink: 0; text-transform: uppercase; letter-spacing: .5px;
}
.ass-badge--pointcloud { background: #e3f2fd; color: #1565c0; }
.ass-badge--photo      { background: #f3e5f5; color: #6a1b9a; }
.ass-badge--mep_report { background: #fff3e0; color: #e65100; }
.ass-badge--survey_report { background: #e8f5e9; color: #2e7d32; }
.ass-badge--floor_plan { background: #fafafa; color: #424242; border: 1px solid #ddd; }
.ass-badge--other      { background: #f5f5f5; color: #666; }
.ass-file-link { font-size: .82rem; color: var(--text, #333); text-decoration: none; flex: 1; }
.ass-file-link:hover { text-decoration: underline; }
.ass-file-date { font-size: .72rem; color: #aaa; white-space: nowrap; }
.ass-file-del {
  border: none; background: none; cursor: pointer; color: #ccc; font-size: 1rem; padding: 0 4px;
}
.ass-file-del:hover { color: #f44336; }
.ass-files-empty { font-size: .82rem; color: #aaa; margin-bottom: 16px; }

/* Upload */
.ass-upload-zone { border: 1px dashed var(--border, #ddd); padding: 16px; }
.ass-upload-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.ass-upload-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--border, #ddd); padding: 8px 16px;
  font-size: .82rem; cursor: pointer; color: var(--text, #444);
}
.ass-upload-btn:hover { border-color: var(--text, #1a1a1a); }
.ass-uploading { font-size: .78rem; color: #999; margin-left: 8px; }

/* Footer */
.ass-footer { display: flex; justify-content: flex-end; padding-top: 20px; border-top: 1px solid var(--border, #ececec); }
.ass-btn-save {
  border: 1px solid var(--text, #1a1a1a); background: var(--text, #1a1a1a);
  color: var(--bg, #fff); padding: 10px 24px; font-size: .85rem;
  cursor: pointer; font-family: inherit;
}
.ass-btn-save:disabled { opacity: .55; cursor: default; }
.ass-btn-save:hover:not(:disabled) { opacity: .85; }
</style>
