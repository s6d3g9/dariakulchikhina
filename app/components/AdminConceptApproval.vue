<template>
  <div class="aca-wrap">
    <div v-if="pending" class="aca-loading">Загрузка...</div>
    <template v-else>

      <!-- Phase transition banner -->
      <div v-if="canTransition" class="aca-transition-banner">
        <div class="aca-banner-text">
          <strong>Все рендеры согласованы, геометрия заморожена.</strong>
          Фазу можно переводить в «Рабочий проект».
        </div>
        <button class="aca-btn-transition" @click="moveToPhase2" :disabled="transitioning">
          {{ transitioning ? '...' : 'Перевести в фазу → Рабочий проект' }}
        </button>
      </div>

      <!-- Status -->
      <div class="aca-status-row">
        <span class="aca-dot" :class="`aca-dot--${statusColor}`"></span>
        <select v-model="form.ca_status" class="aca-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="in_work">готовим рендеры</option>
          <option value="sent">отправлено клиенту</option>
          <option value="partial">частично согласовано</option>
          <option value="revision">доработка</option>
          <option value="approved">согласовано ✓</option>
        </select>
        <span v-if="savedAt" class="aca-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: Renders list -->
      <div class="aca-section">
        <div class="aca-section-title">
          рендеры / 3D-визуализации
          <span class="aca-stat-pill aca-stat-pill--ok">✓ {{ approvedCount }} согл.</span>
          <span class="aca-stat-pill aca-stat-pill--rev" v-if="revisionCount">↩ {{ revisionCount }} дораб.</span>
        </div>

        <!-- Renders grid -->
        <div class="aca-renders" v-if="form.ca_renders.length">
          <div v-for="(r, idx) in form.ca_renders" :key="idx" class="aca-render-card">
            <!-- Preview -->
            <div class="aca-render-preview">
              <img v-if="isImage(r)" :src="r.url" :alt="r.room" class="aca-render-img">
              <div v-else class="aca-render-icon">{{ r.type === 'pdf' ? '📄' : '🗂' }}</div>
              <div class="aca-render-overlay">
                <a :href="r.url" target="_blank" class="aca-render-link">открыть ↗</a>
                <button class="aca-render-del" @click="removeRender(idx)">×</button>
              </div>
            </div>

            <!-- Info -->
            <div class="aca-render-info">
              <input v-model="r.room" class="aca-render-room" placeholder="помещение (кухня, спальня...)" @blur="save">
              <div class="aca-render-actions">
                <select v-model="r.approval" class="aca-render-approval" @change="save">
                  <option value="">рассматривается</option>
                  <option value="sent">отправлен</option>
                  <option value="approved">согласован ✓</option>
                  <option value="revision">доработка ↩</option>
                </select>
                <span v-if="r.approval === 'approved'" class="aca-approval-badge aca-approval-badge--ok">✓</span>
                <span v-else-if="r.approval === 'revision'" class="aca-approval-badge aca-approval-badge--rev">↩</span>
              </div>
              <input v-model="r.comment" class="aca-render-comment" placeholder="комментарий..." @blur="save">
            </div>
          </div>
        </div>
        <div v-else class="aca-renders-empty">
          <span>🎨</span>
          <p>Загрузите 3D-рендеры или white-box визуализации</p>
        </div>

        <!-- Upload bar -->
        <label class="aca-upload-btn" :class="{ 'aca-upload-btn--loading': uploading }">
          {{ uploading ? 'загрузка...' : '+ загрузить рендеры' }}
          <input type="file" multiple accept="image/*,.pdf" style="display:none" @change="onRenderInput" :disabled="uploading">
        </label>
      </div>

      <!-- Section: Approval tracking -->
      <div class="aca-section">
        <div class="aca-section-title">акт согласования</div>
        <div class="aca-rows">
          <div class="aca-row">
            <label class="aca-lbl">номер акта</label>
            <input v-model="form.ca_approval_act" class="aca-inp" placeholder="АКТ-2025-01" @blur="save">
          </div>
          <div class="aca-row">
            <label class="aca-lbl">дата подписания</label>
            <input v-model="form.ca_approval_date" type="date" class="aca-inp" @change="save">
          </div>
          <div class="aca-row">
            <label class="aca-lbl">дата отправки клиенту</label>
            <input v-model="form.ca_sent_date" type="date" class="aca-inp" @change="save">
          </div>
          <div class="aca-row">
            <label class="aca-lbl">версия пакета</label>
            <input v-model="form.ca_version" class="aca-inp" placeholder="v1, v2..." @blur="save">
          </div>
          <div class="aca-row aca-row--full">
            <label class="aca-lbl">файл акта / приложения</label>
            <div class="aca-file-row">
              <a v-if="form.ca_act_file" :href="form.ca_act_file" target="_blank" class="aca-file-link">
                📄 {{ form.ca_act_filename || 'открыть файл' }}
              </a>
              <label class="aca-file-upload-btn">
                {{ form.ca_act_file ? 'заменить' : '📎 загрузить PDF' }}
                <input type="file" accept=".pdf,.docx" style="display:none" @change="uploadAct">
              </label>
              <span v-if="uploadingAct" class="aca-uploading">загрузка...</span>
            </div>
          </div>
          <div class="aca-row aca-row--full">
            <label class="aca-lbl">итоговые комментарии</label>
            <textarea v-model="form.ca_notes" class="aca-inp aca-ta" rows="3" @blur="save" />
          </div>
        </div>
      </div>

      <!-- Section: Geometry lock -->
      <div class="aca-section">
        <div class="aca-section-title">заморозка геометрии</div>
        <div class="aca-lock-card" :class="{ 'aca-lock-card--locked': form.ca_geometry_locked }">
          <div class="aca-lock-icon">{{ form.ca_geometry_locked ? '🔒' : '🔓' }}</div>
          <div class="aca-lock-text">
            <strong>{{ form.ca_geometry_locked ? 'Геометрия заморожена' : 'Геометрия не заморожена' }}</strong>
            <p>{{ form.ca_geometry_locked
              ? 'Планировочные решения зафиксированы. Изменения требуют Change Order.'
              : 'Активируйте после согласования всех планировок и рендеров.' }}</p>
          </div>
          <button class="aca-lock-btn" @click="toggleGeometryLock">
            {{ form.ca_geometry_locked ? 'разморозить' : 'заморозить геометрию' }}
          </button>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const savedAt     = ref('')
const uploading   = ref(false)
const uploadingAct = ref(false)
const transitioning = ref(false)

const form = reactive<any>({
  ca_status:         '',
  ca_renders:        [] as any[],
  ca_approval_act:   '',
  ca_approval_date:  '',
  ca_sent_date:      '',
  ca_version:        '',
  ca_act_file:       '',
  ca_act_filename:   '',
  ca_notes:          '',
  ca_geometry_locked: false,
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.ca_renders)) form.ca_renders = []
}, { immediate: true })

const statusColor = computed(() => ({
  '':        'gray',
  in_work:   'blue',
  sent:      'yellow',
  partial:   'yellow',
  revision:  'red',
  approved:  'green',
}[form.ca_status] || 'gray'))

const approvedCount = computed(() =>
  form.ca_renders.filter((r: any) => r.approval === 'approved').length
)
const revisionCount = computed(() =>
  form.ca_renders.filter((r: any) => r.approval === 'revision').length
)

const canTransition = computed(() =>
  form.ca_geometry_locked &&
  form.ca_renders.length > 0 &&
  form.ca_renders.every((r: any) => r.approval === 'approved')
)

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  savedAt.value = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

async function onRenderInput(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  for (const f of Array.from(files)) {
    const fd = new FormData()
    fd.append('file', f)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    form.ca_renders.push({
      url:      res.url,
      filename: f.name,
      room:     '',
      approval: '',
      comment:  '',
      type:     f.type.startsWith('image/') ? 'image' : 'pdf',
    })
  }
  uploading.value = false
  await save();
  (e.target as HTMLInputElement).value = ''
}

function removeRender(idx: number) {
  form.ca_renders.splice(idx, 1)
  save()
}

async function uploadAct(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploadingAct.value = true
  const fd = new FormData()
  fd.append('file', f)
  const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
  form.ca_act_file     = res.url
  form.ca_act_filename = f.name
  uploadingAct.value = false
  await save()
}

function isImage(r: any) {
  return r.type === 'image' || /\.(jpe?g|png|webp|gif|avif)$/i.test(r.url || '')
}

function toggleGeometryLock() {
  form.ca_geometry_locked = !form.ca_geometry_locked
  save()
}

async function moveToPhase2() {
  transitioning.value = true
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { status: 'working_project' },
  })
  await refresh()
  transitioning.value = false
}
</script>

<style scoped>
.aca-wrap { padding: 4px 0 40px; }
.aca-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

/* Transition banner */
.aca-transition-banner {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  background: #f0faf5; border: 1px solid #a8d8bc; padding: 14px 18px; margin-bottom: 28px;
}
.aca-banner-text { font-size: .82rem; color: #2a7a52; }
.aca-banner-text strong { display: block; margin-bottom: 2px; }
.aca-btn-transition {
  background: #2a7a52; color: #fff; border: none; padding: 8px 18px;
  font-size: .78rem; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.aca-btn-transition:hover { background: #1e5c3e; }
.aca-btn-transition:disabled { opacity: .6; cursor: wait; }

/* Status */
.aca-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.aca-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.aca-dot--gray   { background: #ccc; }
.aca-dot--blue   { background: #6b9fd4; }
.aca-dot--yellow { background: #e8b84b; }
.aca-dot--red    { background: #d46b6b; }
.aca-dot--green  { background: #5caa7f; }
.aca-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.aca-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.aca-section { margin-bottom: 32px; }
.aca-section-title {
  font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa;
  margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec);
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.aca-stat-pill { font-size: .68rem; padding: 2px 8px; border-radius: 2px; }
.aca-stat-pill--ok  { background: #e6f7ef; color: #2a7a52; }
.aca-stat-pill--rev { background: #fff0f0; color: #c00; }

/* Renders grid */
.aca-renders {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px; margin-bottom: 14px;
}
.aca-render-card { border: 1px solid var(--border, #e0e0e0); overflow: hidden; }
.aca-render-preview { position: relative; aspect-ratio: 4/3; background: var(--bg2, #f8f8f7); overflow: hidden; }
.aca-render-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aca-render-icon { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
.aca-render-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; gap: 12px;
  opacity: 0; transition: opacity .15s;
}
.aca-render-card:hover .aca-render-overlay { opacity: 1; }
.aca-render-link { color: #fff; font-size: .75rem; text-decoration: none; }
.aca-render-link:hover { text-decoration: underline; }
.aca-render-del { background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.4); color: #fff; cursor: pointer; width: 24px; height: 24px; font-size: 1rem; display: flex; align-items: center; justify-content: center; }

.aca-render-info { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.aca-render-room { border: 1px solid var(--border, #e0e0e0); background: none; padding: 4px 8px; font-size: .75rem; font-family: inherit; color: inherit; outline: none; width: 100%; box-sizing: border-box; }
.aca-render-actions { display: flex; align-items: center; gap: 6px; }
.aca-render-approval { flex: 1; border: 1px solid var(--border, #e0e0e0); background: none; font-size: .72rem; padding: 3px 6px; font-family: inherit; color: inherit; }
.aca-approval-badge { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: .7rem; flex-shrink: 0; border-radius: 50%; }
.aca-approval-badge--ok  { background: #e6f7ef; color: #2a7a52; }
.aca-approval-badge--rev { background: #fff0f0; color: #c00; }
.aca-render-comment { border: 1px solid var(--border, #e0e0e0); background: none; padding: 4px 8px; font-size: .72rem; font-family: inherit; color: inherit; outline: none; width: 100%; box-sizing: border-box; }

.aca-renders-empty { text-align: center; padding: 32px 0; color: #bbb; border: 1px dashed var(--border, #e0e0e0); margin-bottom: 12px; }
.aca-renders-empty span { font-size: 2rem; display: block; margin-bottom: 8px; opacity: .4; }
.aca-renders-empty p { font-size: .78rem; margin: 0; }

.aca-upload-btn { display: inline-flex; align-items: center; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.aca-upload-btn:hover { border-color: #aaa; color: inherit; }
.aca-upload-btn--loading { opacity: .6; cursor: wait; }

/* Form rows */
.aca-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.aca-row { display: flex; flex-direction: column; gap: 5px; }
.aca-row--full { grid-column: 1 / -1; }
.aca-lbl { font-size: .72rem; color: #999; }
.aca-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; }
.aca-ta { resize: vertical; }
.aca-file-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.aca-file-link { font-size: .8rem; color: inherit; text-decoration: none; opacity: .8; }
.aca-file-link:hover { text-decoration: underline; }
.aca-file-upload-btn { border: 1px solid var(--border, #e0e0e0); padding: 5px 12px; font-size: .75rem; cursor: pointer; }
.aca-uploading { font-size: .72rem; color: #aaa; }

/* Geometry lock */
.aca-lock-card {
  display: flex; align-items: flex-start; gap: 16px; padding: 16px 18px;
  border: 1px solid var(--border, #e0e0e0);
}
.aca-lock-card--locked { border-color: #a8d8bc; background: #f0faf5; }
.aca-lock-icon { font-size: 1.8rem; flex-shrink: 0; }
.aca-lock-text { flex: 1; }
.aca-lock-text strong { display: block; font-size: .88rem; margin-bottom: 4px; }
.aca-lock-text p { margin: 0; font-size: .78rem; color: #888; }
.aca-lock-card--locked .aca-lock-text p { color: #2a7a52; }
.aca-lock-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 7px 16px; font-size: .78rem; cursor: pointer; font-family: inherit; color: #666; align-self: center; white-space: nowrap; }
.aca-lock-card--locked .aca-lock-btn { border-color: #a8d8bc; color: #2a7a52; }
.aca-lock-btn:hover { border-color: #aaa; color: inherit; }
</style>
