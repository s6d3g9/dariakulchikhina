<template>
  <div class="asp-wrap">
    <div v-if="pending" class="asp-loading">Загрузка...</div>
    <template v-else>

      <!-- Status row -->
      <div class="asp-status-row">
        <span class="asp-dot" :class="`asp-dot--${statusColor}`"></span>
        <select v-model="form.sp_status" class="asp-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="in_work">в работе</option>
          <option value="sent_to_client">отправлен клиенту</option>
          <option value="revision">на доработке</option>
          <option value="approved">согласован ✓</option>
        </select>
        <span v-if="savedAt" class="asp-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: General info -->
      <div class="asp-section">
        <div class="asp-section-title">общая информация</div>
        <div class="asp-rows">
          <div class="asp-row">
            <label class="asp-lbl">версия комплекта</label>
            <input v-model="form.sp_version" class="asp-inp" placeholder="v1, v2, финальная..." @blur="save">
          </div>
          <div class="asp-row">
            <label class="asp-lbl">дата отправки клиенту</label>
            <AppDatePicker v-model="form.sp_sent_date" model-type="iso" input-class="asp-inp" @update:model-value="save" />
          </div>
          <div class="asp-row">
            <label class="asp-lbl">дата согласования</label>
            <AppDatePicker v-model="form.sp_approved_date" model-type="iso" input-class="asp-inp" @update:model-value="save" />
          </div>
          <div class="asp-row asp-row--full">
            <label class="asp-lbl">комментарий архитектора</label>
            <textarea v-model="form.sp_architect_notes" class="asp-inp asp-ta" rows="2" @blur="save" />
          </div>
          <div class="asp-row asp-row--full">
            <label class="asp-lbl">замечания клиента (revision)</label>
            <textarea v-model="form.sp_client_notes" class="asp-inp asp-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <!-- Section: Layout files -->
      <div class="asp-section">
        <div class="asp-section-title">файлы планировок</div>

        <div class="asp-files-list" v-if="form.sp_files && form.sp_files.length">
          <div v-for="(file, idx) in form.sp_files" :key="idx" class="asp-file-item">
            <div class="asp-file-icon">{{ fileIcon(file) }}</div>
            <div class="asp-file-meta">
              <a :href="file.url" target="_blank" class="asp-file-name">{{ file.label || file.filename }}</a>
              <div class="asp-file-row2">
                <select v-model="file.approval" class="asp-file-approval" @change="save">
                  <option value="">на рассмотрении</option>
                  <option value="sent">отправлен</option>
                  <option value="approved">согласован ✓</option>
                  <option value="revision">доработка ↩</option>
                </select>
                <input v-model="file.comment" class="asp-file-comment" placeholder="комментарий..." @blur="save">
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
      <div class="asp-section">
        <div class="asp-section-title">согласование</div>
        <div class="asp-checks-row">
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

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref(false)

const form = reactive<any>({
  sp_status:           '',
  sp_version:          '',
  sp_sent_date:        '',
  sp_approved_date:    '',
  sp_architect_notes:  '',
  sp_client_notes:     '',
  sp_files:            [],
  sp_dimensions_checked: false,
  sp_zones_approved:   false,
  sp_geometry_locked:  false,
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
}, { immediate: true })

const statusColor = useStatusColor(form, 'sp_status')

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
.asp-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.asp-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.asp-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.asp-dot--gray   { background: #ccc; }
.asp-dot--blue   { background: #6b9fd4; }
.asp-dot--yellow { background: #e8b84b; }
.asp-dot--red    { background: #d46b6b; }
.asp-dot--green  { background: #5caa7f; }
.asp-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.asp-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.asp-section { margin-bottom: 32px; }
.asp-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.asp-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.asp-row { display: flex; flex-direction: column; gap: 5px; }
.asp-row--full { grid-column: 1 / -1; }
.asp-lbl { font-size: .72rem; color: #999; }
.asp-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; }
.asp-inp:focus { border-color: #aaa; }
.asp-ta  { resize: vertical; }

/* Files */
.asp-files-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.asp-file-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid var(--border, #e0e0e0); background: var(--bg2, #f8f8f7); }
.asp-file-icon { font-size: 1.3rem; flex-shrink: 0; padding-top: 2px; }
.asp-file-meta { flex: 1; min-width: 0; }
.asp-file-name { font-size: .8rem; color: inherit; text-decoration: none; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 6px; }
.asp-file-name:hover { text-decoration: underline; }
.asp-file-row2 { display: flex; gap: 8px; }
.asp-file-approval { border: 1px solid var(--border, #e0e0e0); background: none; font-size: .72rem; padding: 3px 6px; font-family: inherit; color: inherit; }
.asp-file-comment  { flex: 1; border: 1px solid var(--border, #e0e0e0); background: none; font-size: .72rem; padding: 3px 8px; font-family: inherit; color: inherit; outline: none; }
.asp-file-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1.1rem; line-height: 1; padding: 0 2px; }
.asp-file-del:hover { color: #c00; }
.asp-files-empty { font-size: .78rem; color: #bbb; margin-bottom: 10px; padding: 20px 0; text-align: center; border: 1px dashed var(--border, #e0e0e0); }

.asp-upload-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.asp-upload-btn:hover { border-color: #aaa; color: inherit; }
.asp-upload-btn--loading { opacity: .6; cursor: wait; }

.asp-checks-row { display: flex; flex-wrap: wrap; gap: 16px; }
.asp-check-item { display: flex; align-items: center; gap: 8px; font-size: .82rem; cursor: pointer; }
</style>
