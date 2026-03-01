<template>
  <div class="adaf-wrap">
    <div v-if="pending" class="adaf-loading">Загрузка...</div>
    <template v-else>

      <!-- Status row -->
      <div class="adaf-status-row">
        <span class="adaf-dot" :class="`adaf-dot--${statusColor}`"></span>
        <select v-model="form.daf_status" class="adaf-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="assembly">сборка альбома</option>
          <option value="review">внутренняя проверка</option>
          <option value="sent_to_client">отправлен клиенту</option>
          <option value="revision">на доработке</option>
          <option value="approved">согласован ✓</option>
          <option value="archived">в архиве</option>
        </select>
        <span v-if="savedAt" class="adaf-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: Album info -->
      <div class="adaf-section">
        <div class="adaf-section-title">информация об альбоме</div>
        <div class="adaf-rows">
          <div class="adaf-row">
            <label class="adaf-lbl">версия</label>
            <input v-model="form.daf_version" class="adaf-inp" placeholder="v1, финальная..." @blur="save">
          </div>
          <div class="adaf-row">
            <label class="adaf-lbl">дата выдачи</label>
            <AppDatePicker v-model="form.daf_issue_date" model-type="iso" input-class="adaf-inp" @update:model-value="save" />
          </div>
          <div class="adaf-row">
            <label class="adaf-lbl">кол-во страниц</label>
            <input v-model="form.daf_page_count" type="number" min="0" class="adaf-inp" @blur="save">
          </div>
          <div class="adaf-row">
            <label class="adaf-lbl">формат</label>
            <select v-model="form.daf_format" class="adaf-inp" @change="save">
              <option value="">—</option>
              <option value="A3">A3</option>
              <option value="A4">A4</option>
              <option value="mixed">смешанный</option>
            </select>
          </div>
          <div class="adaf-row adaf-row--full">
            <label class="adaf-lbl">примечания</label>
            <textarea v-model="form.daf_notes" class="adaf-inp adaf-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <!-- Section: Album sections/chapters -->
      <div class="adaf-section">
        <div class="adaf-section-title">разделы альбома</div>

        <div class="adaf-chapters" v-if="form.daf_chapters?.length">
          <div v-for="(ch, idx) in form.daf_chapters" :key="idx" class="adaf-chapter">
            <div class="adaf-ch-num">{{ Number(idx) + 1 }}</div>
            <div class="adaf-ch-body">
              <input v-model="ch.title" class="adaf-inp" placeholder="название раздела" @blur="save">
              <div class="adaf-ch-meta">
                <select v-model="ch.status" class="adaf-ch-status" @change="save">
                  <option value="">—</option>
                  <option value="draft">черновик</option>
                  <option value="ready">готов</option>
                  <option value="revision">доработка</option>
                </select>
                <span class="adaf-ch-pages" v-if="ch.pages">{{ ch.pages }} стр.</span>
              </div>
            </div>
            <button class="adaf-del" @click="removeChapter(Number(idx))">×</button>
          </div>
        </div>
        <div v-else class="adaf-empty">Разделы не добавлены</div>
        <button class="adaf-add-btn" @click="addChapter">+ добавить раздел</button>
      </div>

      <!-- Section: Album file -->
      <div class="adaf-section">
        <div class="adaf-section-title">файл альбома</div>
        <div class="adaf-files" v-if="form.daf_files?.length">
          <div v-for="(f, idx) in form.daf_files" :key="idx" class="adaf-file">
            <a :href="f.url" target="_blank" class="adaf-file-name">📕 {{ f.filename }}</a>
            <span class="adaf-file-ver">{{ f.version || '' }}</span>
            <button class="adaf-del" @click="removeFile(Number(idx))">×</button>
          </div>
        </div>
        <label class="adaf-upload-btn" :class="{ 'adaf-upload-btn--loading': uploading }">
          {{ uploading ? 'загрузка...' : '+ загрузить файл альбома' }}
          <input type="file" multiple accept=".pdf" style="display:none" @change="onFileInput" :disabled="uploading">
        </label>
      </div>

      <!-- Checks -->
      <div class="adaf-section">
        <div class="adaf-section-title">контроль</div>
        <div class="adaf-checks">
          <label class="adaf-check"><input type="checkbox" v-model="form.daf_drawings_included" @change="save"> рабочие чертежи включены</label>
          <label class="adaf-check"><input type="checkbox" v-model="form.daf_specs_included" @change="save"> спецификации включены</label>
          <label class="adaf-check"><input type="checkbox" v-model="form.daf_mep_included" @change="save"> инженерия включена</label>
          <label class="adaf-check"><input type="checkbox" v-model="form.daf_signed" @change="save"> подписан ✍️</label>
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
  daf_status:             '',
  daf_version:            '',
  daf_issue_date:         '',
  daf_page_count:         '',
  daf_format:             '',
  daf_notes:              '',
  daf_chapters:           [] as any[],
  daf_files:              [] as any[],
  daf_drawings_included:  false,
  daf_specs_included:     false,
  daf_mep_included:       false,
  daf_signed:             false,
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.daf_chapters)) form.daf_chapters = []
  if (!Array.isArray(form.daf_files))    form.daf_files = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'daf_status')

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

function addChapter() {
  form.daf_chapters.push({ title: '', status: '', pages: '' })
}

function removeChapter(idx: number) {
  form.daf_chapters.splice(idx, 1)
  save()
}

async function onFileInput(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  for (const f of Array.from(files)) {
    const fd = new FormData()
    fd.append('file', f)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    form.daf_files.push({ url: res.url, filename: f.name, version: form.daf_version || '' })
  }
  uploading.value = false
  save()
}

function removeFile(idx: number) {
  form.daf_files.splice(idx, 1)
  save()
}
</script>

<style scoped>
.adaf-wrap { padding: 4px 0 40px; }
.adaf-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.adaf-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.adaf-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.adaf-dot--gray   { background: #ccc; }
.adaf-dot--blue   { background: #6b9fd4; }
.adaf-dot--yellow { background: #e8b84b; }
.adaf-dot--red    { background: #d46b6b; }
.adaf-dot--green  { background: #5caa7f; }
.adaf-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.adaf-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.adaf-section { margin-bottom: 32px; }
.adaf-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.adaf-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.adaf-row { display: flex; flex-direction: column; gap: 5px; }
.adaf-row--full { grid-column: 1 / -1; }
.adaf-lbl { font-size: .72rem; color: #999; }
.adaf-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; }
.adaf-inp:focus { border-color: #aaa; }
.adaf-ta  { resize: vertical; }

/* Chapters */
.adaf-chapters { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.adaf-chapter { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid var(--border, #e0e0e0); background: var(--bg2, #f8f8f7); }
.adaf-ch-num { font-size: .68rem; color: #aaa; font-weight: 600; padding-top: 8px; min-width: 20px; }
.adaf-ch-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.adaf-ch-meta { display: flex; gap: 10px; align-items: center; }
.adaf-ch-status { border: 1px solid var(--border, #e0e0e0); background: none; font-size: .72rem; padding: 3px 6px; font-family: inherit; color: inherit; }
.adaf-ch-pages { font-size: .72rem; color: #aaa; }
.adaf-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1rem; }
.adaf-del:hover { color: #c00; }
.adaf-empty { font-size: .78rem; color: #bbb; margin-bottom: 10px; padding: 20px 0; text-align: center; border: 1px dashed var(--border, #e0e0e0); }
.adaf-add-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 6px 14px; font-size: .78rem; color: #666; cursor: pointer; font-family: inherit; }
.adaf-add-btn:hover { border-color: #aaa; color: inherit; }

/* Files */
.adaf-files { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.adaf-file { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid var(--border, #e0e0e0); }
.adaf-file-name { font-size: .78rem; color: inherit; text-decoration: none; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.adaf-file-name:hover { text-decoration: underline; }
.adaf-file-ver { font-size: .68rem; color: #aaa; }
.adaf-upload-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.adaf-upload-btn:hover { border-color: #aaa; color: inherit; }
.adaf-upload-btn--loading { opacity: .6; cursor: wait; }

.adaf-checks { display: flex; flex-wrap: wrap; gap: 16px; }
.adaf-check { display: flex; align-items: center; gap: 8px; font-size: .82rem; cursor: pointer; }
</style>
