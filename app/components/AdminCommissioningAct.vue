<template>
  <div class="aca2-wrap">
    <div v-if="pending" class="aca2-loading">Загрузка...</div>
    <template v-else>

      <div class="aca2-status-row">
        <span class="aca2-dot" :class="`aca2-dot--${statusColor}`"></span>
        <select v-model="form.cma_status" class="aca2-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="preparing">готовим акт</option>
          <option value="signing">ожидание подписи</option>
          <option value="signed">подписан ✓</option>
        </select>
        <span v-if="savedAt" class="aca2-saved">✓ {{ savedAt }}</span>
      </div>

      <div class="aca2-section">
        <div class="aca2-section-title">реквизиты акта</div>
        <div class="aca2-rows">
          <div class="aca2-row">
            <label class="aca2-lbl">номер акта</label>
            <input v-model="form.cma_act_number" class="aca2-inp" placeholder="АКТ-2026-01" @blur="save">
          </div>
          <div class="aca2-row">
            <label class="aca2-lbl">дата подписания</label>
            <AppDatePicker v-model="form.cma_sign_date" model-type="iso" input-class="aca2-inp" @update:model-value="save" />
          </div>
          <div class="aca2-row">
            <label class="aca2-lbl">место подписания</label>
            <input v-model="form.cma_location" class="aca2-inp" placeholder="город, адрес" @blur="save">
          </div>
          <div class="aca2-row">
            <label class="aca2-lbl">сумма договора</label>
            <input v-model="form.cma_contract_sum" class="aca2-inp" placeholder="₽" @blur="save">
          </div>
          <div class="aca2-row aca2-row--full">
            <label class="aca2-lbl">описание выполненных работ</label>
            <textarea v-model="form.cma_works_description" class="aca2-inp aca2-ta" rows="3" @blur="save" />
          </div>
          <div class="aca2-row aca2-row--full">
            <label class="aca2-lbl">примечания / оговорки</label>
            <textarea v-model="form.cma_notes" class="aca2-inp aca2-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <div class="aca2-section">
        <div class="aca2-section-title">документы</div>
        <div class="aca2-file-row" v-if="form.cma_file">
          <a :href="form.cma_file" target="_blank" class="aca2-file-link">📄 {{ form.cma_filename || 'акт приёмки' }}</a>
          <button class="aca2-file-del" @click="form.cma_file = ''; form.cma_filename = ''; save()">удалить</button>
        </div>
        <label class="aca2-upload-btn">
          {{ form.cma_file ? 'заменить файл' : '📎 загрузить акт (PDF)' }}
          <input type="file" accept=".pdf,.docx" style="display:none" @change="uploadFile">
        </label>
        <span v-if="uploading" class="aca2-uploading">загрузка...</span>
      </div>

      <div class="aca2-section">
        <div class="aca2-section-title">чеклист финальной приёмки</div>
        <div class="aca2-checks">
          <label v-for="item in CHECKLIST" :key="item.key" class="aca2-check-item">
            <input type="checkbox" v-model="form.cma_checks[item.key]" @change="save">
            <span>{{ item.label }}</span>
          </label>
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

const CHECKLIST = [
  { key: 'punch_list_cleared',    label: 'дефектная ведомость закрыта' },
  { key: 'docs_handed_over',      label: 'документация передана заказчику' },
  { key: 'keys_transferred',      label: 'ключи переданы' },
  { key: 'warranty_explained',    label: 'гарантийные обязательства разъяснены' },
  { key: 'final_photos_done',     label: 'финальные фото объекта сделаны' },
  { key: 'invoice_paid',          label: 'финальный счёт оплачен' },
]

const form = reactive<any>({
  cma_status: '',
  cma_act_number: '',
  cma_sign_date: '',
  cma_location: '',
  cma_contract_sum: '',
  cma_works_description: '',
  cma_notes: '',
  cma_file: '',
  cma_filename: '',
  cma_checks: {} as Record<string, boolean>,
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => { if (pf[k] !== undefined) (form as any)[k] = pf[k] })
  if (typeof form.cma_checks !== 'object' || Array.isArray(form.cma_checks)) form.cma_checks = {}
}, { immediate: true })

const statusColor = useStatusColor(form, 'cma_status')

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

async function uploadFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploading.value = true
  const fd = new FormData(); fd.append('file', f)
  const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
  form.cma_file = res.url
  form.cma_filename = f.name
  uploading.value = false
  await save()
}
</script>

<style scoped>
.aca2-wrap { padding: 4px 0 40px; }
.aca2-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }
.aca2-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.aca2-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.aca2-dot--gray   { background: #ccc; }
.aca2-dot--blue   { background: #6b9fd4; }
.aca2-dot--yellow { background: #e8b84b; }
.aca2-dot--green  { background: #5caa7f; }
.aca2-status-sel { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.aca2-saved { font-size: .72rem; color: #5caa7f; margin-left: auto; }
.aca2-section { margin-bottom: 32px; }
.aca2-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }
.aca2-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.aca2-row { display: flex; flex-direction: column; gap: 5px; }
.aca2-row--full { grid-column: 1 / -1; }
.aca2-lbl { font-size: .72rem; color: #999; }
.aca2-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: none; color: inherit; font-family: inherit; outline: none; }
.aca2-inp:focus { border-color: #aaa; }
.aca2-ta { resize: vertical; }
.aca2-file-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.aca2-file-link { font-size: .8rem; color: inherit; text-decoration: none; }
.aca2-file-link:hover { text-decoration: underline; }
.aca2-file-del { background: none; border: none; cursor: pointer; color: #bbb; font-size: .76rem; }
.aca2-file-del:hover { color: #c00; }
.aca2-upload-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.aca2-upload-btn:hover { border-color: #aaa; color: inherit; }
.aca2-uploading { font-size: .76rem; color: #999; margin-left: 10px; }
.aca2-checks { display: flex; flex-direction: column; gap: 10px; }
.aca2-check-item { display: flex; align-items: center; gap: 10px; font-size: .82rem; cursor: pointer; }
.aca2-check-item input { cursor: pointer; width: 14px; height: 14px; flex-shrink: 0; }
</style>
