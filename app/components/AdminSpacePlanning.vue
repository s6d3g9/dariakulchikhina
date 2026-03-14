<template>
  <div class="asp-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Status row -->
      <div class="asp-status-row">
        <span class="asp-dot" :class="`asp-dot--${statusColor}`"></span>
        <select v-model="form.sp_status" class="u-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="in_work">в работе</option>
          <option value="sent_to_client">отправлен клиенту</option>
          <option value="revision">на доработке</option>
          <option value="approved">согласован ✓</option>
        </select>
        <span v-if="savedAt" class="asp-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: General info -->
      <div class="u-form-section" data-cv-unit="section">
        <div class="u-section-title">общая информация</div>
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">версия комплекта</label>
            <input v-model="form.sp_version" class="glass-input" placeholder="v1, v2, финальная..." @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">дата отправки клиенту</label>
            <AppDatePicker v-model="form.sp_sent_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">дата согласования</label>
            <AppDatePicker v-model="form.sp_approved_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">комментарий архитектора</label>
            <textarea v-model="form.sp_architect_notes" class="glass-input u-ta" rows="2" @blur="save" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">замечания клиента (revision)</label>
            <textarea v-model="form.sp_client_notes" class="glass-input u-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <!-- Section: Layout files -->
      <div class="u-form-section" data-cv-unit="section">
        <div class="u-section-title">файлы планировок</div>

        <!-- data-cv-unit="item" — pager treats the whole list as one block, prevents freeze -->
        <div v-if="form.sp_files && form.sp_files.length" class="asp-files-list" data-cv-unit="item">
          <div v-for="(file, idx) in form.sp_files" :key="idx" class="asp-file-item">
            <div class="asp-file-icon">{{ fileIcon(file) }}</div>
            <div class="asp-file-meta">
              <a :href="file.url" target="_blank" class="asp-file-name">{{ file.label || file.filename }}</a>
              <div class="asp-file-row2">
                <select v-model="file.approval" class="u-status-sel" @change="save">
                  <option value="">на рассмотрении</option>
                  <option value="sent">отправлен</option>
                  <option value="approved">согласован ✓</option>
                  <option value="revision">доработка ↩</option>
                </select>
                <input v-model="file.comment" class="glass-input glass-input--inline" placeholder="комментарий..." @blur="save">
              </div>
            </div>
            <button class="asp-file-del" @click="removeFile(Number(idx))" title="удалить">×</button>
          </div>
        </div>
        <div v-else class="asp-files-empty">Файлы ещё не загружены</div>

        <label class="asp-upload-btn" :class="{ 'asp-upload-btn--loading': uploading }">
          {{ uploading ? 'загрузка...' : '+ добавить файл' }}
          <input type="file" multiple accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp" style="display:none" @change="onFileInput" :disabled="uploading">
        </label>
      </div>

      <!-- Section: Approval options -->
      <div class="u-form-section" data-cv-unit="section">
        <div class="u-section-title">согласование</div>
        <div class="asp-checks-row" data-cv-unit="item">
          <label class="asp-check-item">
            <input type="checkbox" v-model="form.sp_dimensions_checked" @change="save"> размеры проверены
          </label>
          <label class="asp-check-item">
            <input type="checkbox" v-model="form.sp_zones_approved" @change="save"> зонирование согласовано
          </label>
          <label class="asp-check-item">
            <input type="checkbox" v-model="form.sp_geometry_locked" @change="save"> геометрия заморожена 🔒
          </label>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref(false)

const form = reactive<any>({
  sp_status:             '',
  sp_version:            '',
  sp_sent_date:          '',
  sp_approved_date:      '',
  sp_architect_notes:    '',
  sp_client_notes:       '',
  sp_files:              [],
  sp_dimensions_checked: false,
  sp_zones_approved:     false,
  sp_geometry_locked:    false,
})

const statusColor = useStatusColor(form, 'sp_status')

// ── Данные проекта ─────────────────────────────────────────────
const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)

// Заполняем форму когда данные загружены
watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
}, { immediate: true })

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
    form.sp_files.push({
      url:      res.url,
      filename: f.name,
      label:    f.name.replace(/\.[^.]+$/, ''),
      approval: '',
      comment:  '',
      type:     fileType(f.name),
    })
  }
  uploading.value = false
  await save();
  (e.target as HTMLInputElement).value = ''
}

function removeFile(idx: number) {
  form.sp_files.splice(idx, 1)
  save()
}

function fileType(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['dwg','dxf'].includes(ext)) return 'cad'
  if (['pdf'].includes(ext))       return 'pdf'
  return 'image'
}

function fileIcon(f: any) {
  const t = f.type || fileType(f.filename || '')
  if (t === 'cad')   return '📐'
  if (t === 'pdf')   return '📄'
  return '🖼'
}
</script>

<style scoped>
.asp-wrap { padding: 4px 0 40px; }

.asp-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.asp-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
/* dot colors: → main.css [class*="-dot--*"] */
.asp-saved { font-size: .75rem; opacity: .5; }

/* ── File list ── */
.asp-files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.asp-file-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--card-radius, 10px);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
}

.asp-file-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
  width: 30px;
  text-align: center;
  line-height: 1;
  padding-top: 2px;
}

.asp-file-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.asp-file-name {
  font-size: .88rem;
  font-weight: 500;
  color: var(--glass-text);
  text-decoration: none;
  word-break: break-all;
  opacity: .85;
}
.asp-file-name:hover { opacity: 1; text-decoration: underline; }

.asp-file-row2 {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.asp-file-del {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--glass-text);
  opacity: .35;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
  transition: opacity .15s;
}
.asp-file-del:hover { opacity: 1; }

.asp-files-empty {
  padding: 12px 0;
  font-size: .82rem;
  opacity: .4;
}

/* ── Upload button ── */
.asp-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 7px 16px;
  border: 1px dashed var(--glass-border);
  border-radius: var(--card-radius, 8px);
  font-size: .8rem;
  cursor: pointer;
  opacity: .6;
  transition: opacity .15s, border-color .15s;
}
.asp-upload-btn:hover { opacity: 1; border-color: var(--glass-text); }
.asp-upload-btn--loading { opacity: .35; cursor: default; pointer-events: none; }

/* ── Checkboxes ── */
.asp-checks-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.asp-check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .85rem;
  cursor: pointer;
}
</style>
