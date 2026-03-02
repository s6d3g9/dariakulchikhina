<template>
  <div class="awd-wrap">
    <div v-if="pending" class="awd-loading">Загрузка...</div>
    <template v-else>

      <!-- Status row -->
      <div class="awd-status-row">
        <span class="awd-dot" :class="`awd-dot--${statusColor}`"></span>
        <select v-model="form.wd_status" class="awd-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="in_work">в работе</option>
          <option value="checking">проверка</option>
          <option value="sent_to_client">отправлены клиенту</option>
          <option value="revision">на доработке</option>
          <option value="approved">согласованы ✓</option>
        </select>
        <span v-if="savedAt" class="awd-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: General -->
      <div class="awd-section">
        <div class="awd-section-title">общая информация</div>
        <div class="awd-rows">
          <div class="awd-row">
            <label class="awd-lbl">версия комплекта</label>
            <input v-model="form.wd_version" class="awd-inp" placeholder="v1, v2..." @blur="save">
          </div>
          <div class="awd-row">
            <label class="awd-lbl">дата выдачи</label>
            <AppDatePicker v-model="form.wd_issue_date" model-type="iso" input-class="awd-inp" @update:model-value="save" />
          </div>
          <div class="awd-row">
            <label class="awd-lbl">дата согласования</label>
            <AppDatePicker v-model="form.wd_approved_date" model-type="iso" input-class="awd-inp" @update:model-value="save" />
          </div>
          <div class="awd-row">
            <label class="awd-lbl">масштаб чертежей</label>
            <input v-model="form.wd_scale" class="awd-inp" placeholder="1:50, 1:100..." @blur="save">
          </div>
          <div class="awd-row awd-row--full">
            <label class="awd-lbl">комментарий архитектора</label>
            <textarea v-model="form.wd_notes" class="awd-inp awd-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <!-- Section: Drawing sheets -->
      <div class="awd-section">
        <div class="awd-section-title">листы чертежей</div>

        <div class="awd-sheets" v-if="form.wd_sheets?.length">
          <div v-for="(sheet, idx) in form.wd_sheets" :key="idx" class="awd-sheet-item">
            <div class="awd-sheet-num">{{ Number(idx) + 1 }}</div>
            <div class="awd-sheet-body">
              <input v-model="sheet.name" class="awd-inp awd-sheet-name" placeholder="название листа" @blur="save">
              <div class="awd-sheet-row2">
                <select v-model="sheet.type" class="awd-sheet-type" @change="save">
                  <option value="floor_plan">план этажа</option>
                  <option value="ceiling_plan">план потолка</option>
                  <option value="electrical">электрика</option>
                  <option value="plumbing">сантехника</option>
                  <option value="sections">разрезы</option>
                  <option value="elevations">развёртки</option>
                  <option value="details">узлы / детали</option>
                  <option value="other">прочее</option>
                </select>
                <select v-model="sheet.approval" class="awd-sheet-approval" @change="save">
                  <option value="">на рассмотрении</option>
                  <option value="approved">✓ согласован</option>
                  <option value="revision">↩ доработка</option>
                </select>
              </div>
              <a v-if="sheet.url" :href="sheet.url" target="_blank" class="awd-sheet-link">{{ sheet.filename || 'файл' }}</a>
            </div>
            <button class="awd-sheet-del" @click="removeSheet(Number(idx))" title="удалить">×</button>
          </div>
        </div>
        <div v-else class="awd-empty">Листы ещё не добавлены</div>

        <label class="awd-upload-btn" :class="{ 'awd-upload-btn--loading': uploading }">
          {{ uploading ? 'загрузка...' : '+ добавить лист' }}
          <input type="file" multiple accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp" style="display:none" @change="onFileInput" :disabled="uploading">
        </label>
      </div>

      <!-- Section: Checklist -->
      <div class="awd-section">
        <div class="awd-section-title">контроль</div>
        <div class="awd-checks">
          <label class="awd-check"><input type="checkbox" v-model="form.wd_dimensions_ok" @change="save"> размеры проверены</label>
          <label class="awd-check"><input type="checkbox" v-model="form.wd_regulations_ok" @change="save"> нормы соблюдены</label>
          <label class="awd-check"><input type="checkbox" v-model="form.wd_mep_coordinated" @change="save"> согласовано с инженерией</label>
          <label class="awd-check"><input type="checkbox" v-model="form.wd_locked" @change="save"> чертежи заморожены 🔒</label>
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

const form = reactive<any>({
  wd_status:           '',
  wd_version:          '',
  wd_issue_date:       '',
  wd_approved_date:    '',
  wd_scale:            '',
  wd_notes:            '',
  wd_sheets:           [] as any[],
  wd_dimensions_ok:    false,
  wd_regulations_ok:   false,
  wd_mep_coordinated:  false,
  wd_locked:           false,
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.wd_sheets)) form.wd_sheets = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'wd_status')

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
    form.wd_sheets.push({
      url:      res.url,
      filename: f.name,
      name:     f.name.replace(/\.[^.]+$/, ''),
      type:     'floor_plan',
      approval: '',
    })
  }
  uploading.value = false
  save()
}

function removeSheet(idx: number) {
  form.wd_sheets.splice(idx, 1)
  save()
}
</script>

<style scoped>
.awd-wrap { padding: 4px 0 40px; }
.awd-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.awd-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.awd-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.awd-dot--gray   { background: #ccc; }
.awd-dot--blue   { background: #6b9fd4; }
.awd-dot--yellow { background: #e8b84b; }
.awd-dot--red    { background: #d46b6b; }
.awd-dot--green  { background: #5caa7f; }
.awd-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.awd-saved       { font-size: .72rem; color: var(--ds-success, #5caa7f); margin-left: auto; }

.awd-section { margin-bottom: 32px; }
.awd-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.awd-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.awd-row { display: flex; flex-direction: column; gap: 5px; }
.awd-row--full { grid-column: 1 / -1; }
.awd-lbl { font-size: .72rem; color: #999; }
.awd-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; }
.awd-inp:focus { border-color: #aaa; }
.awd-ta  { resize: vertical; }

.awd-sheets { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.awd-sheet-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid var(--border, #e0e0e0); background: var(--bg2, #f8f8f7); }
.awd-sheet-num { font-size: .68rem; color: #aaa; font-weight: 600; padding-top: 8px; min-width: 20px; }
.awd-sheet-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.awd-sheet-name { border: 1px solid var(--border, #e0e0e0); background: none; padding: 5px 8px; font-size: .8rem; font-family: inherit; color: inherit; outline: none; }
.awd-sheet-row2 { display: flex; gap: 8px; }
.awd-sheet-type, .awd-sheet-approval { border: 1px solid var(--border, #e0e0e0); background: none; font-size: .72rem; padding: 3px 6px; font-family: inherit; color: inherit; }
.awd-sheet-link { font-size: .72rem; color: #6b9fd4; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.awd-sheet-link:hover { text-decoration: underline; }
.awd-sheet-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1.1rem; line-height: 1; padding: 0 2px; }
.awd-sheet-del:hover { color: var(--ds-error, #c00); }
.awd-empty { font-size: .78rem; color: #bbb; margin-bottom: 10px; padding: 20px 0; text-align: center; border: 1px dashed var(--border, #e0e0e0); }

.awd-upload-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.awd-upload-btn:hover { border-color: #aaa; color: inherit; }
.awd-upload-btn--loading { opacity: .6; cursor: wait; }

.awd-checks { display: flex; flex-wrap: wrap; gap: 16px; }
.awd-check { display: flex; align-items: center; gap: 8px; font-size: .82rem; cursor: pointer; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .awd-rows { grid-template-columns: 1fr; }
  .awd-row--full { grid-column: auto; }
  .awd-checks { gap: 10px; }
}
</style>
