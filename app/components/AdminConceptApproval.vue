<template>
  <div class="aca-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
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
        <select v-model="form.ca_status" class="u-status-sel" @change="save">
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
                <button class="aca-render-del" @click="removeRender(Number(idx))">×</button>
              </div>
            </div>

            <!-- Info -->
            <div class="aca-render-info">
              <input v-model="r.room" class="glass-input glass-input--inline" placeholder="помещение (кухня, спальня...)" @blur="save">
              <div class="aca-render-actions">
                <select v-model="r.approval" class="u-status-sel" @change="save">
                  <option value="">рассматривается</option>
                  <option value="sent">отправлен</option>
                  <option value="approved">согласован ✓</option>
                  <option value="revision">доработка ↩</option>
                </select>
                <span v-if="r.approval === 'approved'" class="aca-approval-badge aca-approval-badge--ok">✓</span>
                <span v-else-if="r.approval === 'revision'" class="aca-approval-badge aca-approval-badge--rev">↩</span>
              </div>
              <input v-model="r.comment" class="glass-input glass-input--inline" placeholder="комментарий..." @blur="save">
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
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">номер акта</label>
            <input v-model="form.ca_approval_act" class="glass-input" placeholder="АКТ-2025-01" @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">дата подписания</label>
            <AppDatePicker v-model="form.ca_approval_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">дата отправки клиенту</label>
            <AppDatePicker v-model="form.ca_sent_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">версия пакета</label>
            <input v-model="form.ca_version" class="glass-input" placeholder="v1, v2..." @blur="save">
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">файл акта / приложения</label>
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
          <div class="u-field u-field--full">
            <label class="u-field__label">итоговые комментарии</label>
            <textarea v-model="form.ca_notes" class="glass-input u-ta" rows="3" @blur="save" />
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

const { savedAt, touch: markSaved } = useTimestamp()
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

const statusColor = useStatusColor(form, 'ca_status')

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
  markSaved()
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
.aca-loading { padding: 40px 0; font-size: .82rem; color: var(--ds-muted, #aaa); }

/* Transition banner */
.aca-transition-banner {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  background: color-mix(in srgb, var(--ds-success, #5caa7f) 8%, transparent); border: 1px solid color-mix(in srgb, var(--ds-success, #5caa7f) 40%, transparent); padding: 14px 18px; margin-bottom: 28px;
}
.aca-banner-text { font-size: .82rem; color: var(--ds-success, #2a7a52); }
.aca-banner-text strong { display: block; margin-bottom: 2px; }
.aca-btn-transition {
  background: var(--ds-success, #2a7a52); color: #fff; border: none; padding: 8px 18px;
  font-size: .78rem; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.aca-btn-transition:hover { background: color-mix(in srgb, var(--ds-success, #2a7a52) 80%, #000); }
.aca-btn-transition:disabled { opacity: .6; cursor: wait; }

/* Status */
.aca-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.aca-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
/* dot colors: → main.css [class*="-dot--*"] */
.aca-stat-pill { font-size: .68rem; padding: 2px 8px; border-radius: 2px; }
.aca-stat-pill--ok  { background: color-mix(in srgb, var(--ds-success, #5caa7f) 12%, transparent); color: var(--ds-success, #2a7a52); }
.aca-stat-pill--rev { background: color-mix(in srgb, var(--ds-error, #c00) 8%, transparent); color: var(--ds-error, #c00); }

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
</style>
