<template>
  <div class="awd-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Status row -->
      <div class="awd-status-row">
        <span class="awd-dot" :class="`awd-dot--${statusColor}`"></span>
        <select v-model="form.wd_status" class="u-status-sel" @change="save">
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
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">версия комплекта</label>
            <input v-model="form.wd_version" class="glass-input" placeholder="v1, v2..." @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">дата выдачи</label>
            <AppDatePicker v-model="form.wd_issue_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">дата согласования</label>
            <AppDatePicker v-model="form.wd_approved_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">масштаб чертежей</label>
            <input v-model="form.wd_scale" class="glass-input" placeholder="1:50, 1:100..." @blur="save">
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">комментарий архитектора</label>
            <textarea v-model="form.wd_notes" class="glass-input u-ta" rows="2" @blur="save" />
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
              <input v-model="sheet.name" class="glass-input" placeholder="название листа" @blur="save">
              <div class="awd-sheet-row2">
                <select v-model="sheet.type" class="u-status-sel" @change="save">
                  <option value="floor_plan">план этажа</option>
                  <option value="ceiling_plan">план потолка</option>
                  <option value="electrical">электрика</option>
                  <option value="plumbing">сантехника</option>
                  <option value="sections">разрезы</option>
                  <option value="elevations">развёртки</option>
                  <option value="details">узлы / детали</option>
                  <option value="other">прочее</option>
                </select>
                <select v-model="sheet.approval" class="u-status-sel" @change="save">
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
</style>
