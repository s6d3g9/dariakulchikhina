<template>
  <div class="atz-wrap">
    <div v-if="pending" class="ent-content-loading atz-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>
      <GlassSurface
        v-for="(sec, si) in sections"
        :key="si"
        class="atz-card "
        :class="{ 'atz-card--expanded': isSectionExpanded(getSectionKey(sec, si)) }"
      >
        <div class="atz-card-head">
          <button
            type="button"
            class="atz-card-toggle"
            :aria-expanded="isSectionExpanded(getSectionKey(sec, si)) ? 'true' : 'false'"
            @click="toggleSection(getSectionKey(sec, si))"
          >
            <div class="atz-card-summary">
              <span class="atz-card-label">{{ sec.title || '(без названия)' }}</span>
              <span class="atz-card-meta">{{ sec.questions.length }} {{ formatQuestionCount(sec.questions.length) }}</span>
            </div>
            <span class="atz-card-chevron" :class="{ 'atz-card-chevron--expanded': isSectionExpanded(getSectionKey(sec, si)) }">⌄</span>
          </button>
        </div>

        <div v-show="isSectionExpanded(getSectionKey(sec, si))" class="atz-card-panel">
        <div class="atz-row atz-row--field">
          <label class="atz-lbl">id:</label>
          <GlassInput v-model="sec.id" class="atz-inp " type="text" @input="markDirty" />
        </div>
        <div class="atz-row atz-row--field">
          <label class="atz-lbl">название:</label>
          <GlassInput v-model="sec.title" class="atz-inp " type="text" @input="markDirty" />
        </div>
        <div class="atz-row atz-row--field">
          <label class="atz-lbl">заголовок:</label>
          <GlassInput v-model="sec.heading" class="atz-inp " type="text" @input="markDirty" />
        </div>

        <!-- section image -->
        <div class="atz-upload-row atz-upload-row--field">
          <label class="atz-lbl">изображение:</label>
          <GlassInput v-model="sec.image" class="atz-inp " type="text" placeholder="имя файла" @input="markDirty" />
          <label class="atz-btn-upload glass-chip">
            загрузить
            <input type="file" accept="image/*" style="display:none" @change="(e: Event) => uploadSecImg(e, si)">
          </label>
          <img v-if="sec.image" :src="`/uploads/${sec.image}`" class="atz-img-prev">
        </div>

        <!-- questions -->
        <div v-for="(q, qi) in sec.questions" :key="qi" class="atz-question">
          <div class="atz-question-head">
            <AppAutocomplete
              v-model="q.label"
              input-class="atz-inp glass-input"
              placeholder="вопрос"
              categories="materials,fabrics,furniture_types,kitchen,lighting,sanitary,flooring,rooms,styles,colors"
              @change="markDirty"
            />
            <div class="atz-question-controls">
              <select v-model="q.type" class="atz-select glass-input" @change="markDirty">
                <option value="text">текст</option>
                <option value="select">выбор</option>
                <option value="number">число</option>
                <option value="yesno">да/нет</option>
              </select>
              <button class="atz-btn-sm glass-chip danger" @click="delQ(si, qi)">×</button>
            </div>
          </div>
          <!-- question image -->
          <div class="atz-upload-row atz-upload-row--field atz-upload-row--question">
            <label class="atz-lbl atz-lbl--compact">фото:</label>
            <GlassInput v-model="q.image" class="atz-inp " type="text" placeholder="имя файла" @input="markDirty" />
            <label class="atz-btn-upload glass-chip">
              загрузить
              <input type="file" accept="image/*" style="display:none" @change="(e: Event) => uploadQImg(e, si, qi)">
            </label>
            <img v-if="q.image" :src="`/uploads/${q.image}`" class="atz-img-prev">
          </div>
        </div>
        <button class="atz-btn-add glass-chip" @click="addQ(si)">+ вопрос</button>

        <div class="atz-card-footer">
          <button class="atz-btn-sm glass-chip danger" @click="delSec(si)">удалить раздел</button>
        </div>
        </div>
      </GlassSurface>

      <button class="atz-btn-add glass-chip" style="margin-bottom:12px" @click="addSec">+ новый раздел</button>
      <div class="atz-actions">
        <p v-if="error" style="color:var(--ds-error, #c00);font-size:.8rem;margin-right:auto">{{ error }}</p>
        <div v-if="saving" class="u-inline-loading atz-inline-loading" aria-live="polite">
          <span class="u-inline-loading__label">[ СОХРАНЯЕМ ТЗ ]</span>
          <span class="u-inline-loading__line" />
        </div>
        <GlassButton variant="primary"  :disabled="saving" @click="save">{{ saving ? 'сохраняем...' : 'сохранить' }}</GlassButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string; page: string }>()

interface Question { label: string; type: string; image?: string }
interface Section { id: string; title: string; heading: string; image?: string; questions: Question[] }

const { data: raw, pending, refresh } = await useFetch<any>(
  () => `/api/projects/${props.slug}/page-content?page=${props.page}`, { server: false }
)

const sections = ref<Section[]>([])
const saving = ref(false)
const error = ref('')
const expandedSectionId = ref('')

function markDirty() {}

watch(raw, (v) => {
  const c = v?.content ?? v ?? {}
  if (Array.isArray(c?.sections)) {
    sections.value = JSON.parse(JSON.stringify(c.sections))
  } else {
    sections.value = []
  }
}, { immediate: true })

watch(() => props.page, () => { refresh() })

watch(sections, (list) => {
  const keys = list.map((section, index) => getSectionKey(section, index))
  if (!keys.length) {
    expandedSectionId.value = ''
    return
  }

  if (!expandedSectionId.value || !keys.includes(expandedSectionId.value)) {
    expandedSectionId.value = keys[0] || ''
  }
}, { immediate: true, deep: true })

function getSectionKey(_section: Section, sectionIndex: number) {
  return `section-${sectionIndex + 1}`
}

function isSectionExpanded(sectionId: string) {
  return expandedSectionId.value === sectionId
}

function toggleSection(sectionId: string) {
  expandedSectionId.value = expandedSectionId.value === sectionId ? '' : sectionId
}

function formatQuestionCount(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return 'вопрос'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'вопроса'
  return 'вопросов'
}

function addSec() {
  sections.value.push({ id: `s${sections.value.length + 1}`, title: 'новый раздел', heading: '', image: '', questions: [] })
}
function delSec(si: number) { sections.value.splice(si, 1) }
function addQ(si: number) {
  sections.value[si].questions.push({ label: 'новый вопрос', type: 'text', image: '' })
}
function delQ(si: number, qi: number) { sections.value[si].questions.splice(qi, 1) }

async function uploadSecImg(e: Event, si: number) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await $fetch<{ filename: string }>('/api/upload', { method: 'POST', body: fd })
    sections.value[si].image = res.filename
  } catch { error.value = 'Ошибка загрузки' }
}

async function uploadQImg(e: Event, si: number, qi: number) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await $fetch<{ filename: string }>('/api/upload', { method: 'POST', body: fd })
    sections.value[si].questions[qi].image = res.filename
  } catch { error.value = 'Ошибка загрузки' }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/page-content`, {
      method: 'PUT',
      body: { pageSlug: props.page, content: { sections: sections.value } }
    })
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.atz-card {
  --atz-border: #e0e0e0;
  --atz-text: #1f1f1f;
  --atz-muted: #888;
  border: 1px solid var(--atz-border);
  border-left: 3px solid color-mix(in srgb, var(--glass-text) 60%, #1a1a1a 40%);
  padding: 0;
  margin-bottom: 16px;
  overflow: hidden;
}
.atz-content-loading::before {
  content: '[ ЗАГРУЖАЕМ ТЗ ]';
}
.atz-card-head {
  display: flex;
  align-items: stretch;
}
.atz-card--expanded .atz-card-head {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.atz-card-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.atz-card-toggle:hover {
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.atz-card-summary {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.atz-card-label {
  font-size: .9rem;
  font-weight: 400;
  color: var(--atz-text);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 0;
}
.atz-card-meta {
  font-size: .72rem;
  color: var(--atz-muted);
  text-transform: uppercase;
  letter-spacing: .4px;
}
.atz-card-chevron {
  flex-shrink: 0;
  color: var(--atz-muted);
  transition: transform .18s ease, color .18s ease;
}
.atz-card-chevron--expanded {
  transform: rotate(180deg);
  color: var(--atz-text);
}
.atz-card-panel {
  display: grid;
  gap: 12px;
  padding: 16px 18px 18px;
}
.atz-row {
  display: grid;
  gap: 6px;
  margin-bottom: 0;
}
.atz-row--field,
.atz-upload-row--field {
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.atz-lbl {
  font-size: .78rem;
  color: var(--atz-muted);
  width: auto;
  flex-shrink: 0;
}
.atz-lbl--compact {
  font-size: .72rem;
}
.atz-inp {
  width: 100%;
  border: 1px solid transparent;
  padding: 6px 0;
  font-size: .88rem;
  outline: none;
  font-family: inherit;
  color: var(--atz-text);
  background: transparent;
}
.atz-inp:focus { border-color: color-mix(in srgb, var(--glass-text) 28%, var(--glass-border) 72%); }
.atz-select {
  border: 1px solid transparent;
  padding: 4px 8px;
  font-size: .82rem;
  font-family: inherit;
  outline: none;
  color: var(--atz-text);
  background: transparent;
  width: 100%;
}
.atz-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.atz-upload-row--question {
  margin-top: 4px;
}
.atz-btn-upload {
  border: none;
  background: var(--glass-bg);
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
  white-space: nowrap;
}
.atz-btn-upload:hover { opacity: .9; }
.atz-img-prev {
  max-width: 120px;
  max-height: 90px;
  object-fit: cover;
  border: none;
  border-radius: 2px;
}
.atz-pending {
  font-size: .88rem;
  color: color-mix(in srgb, var(--glass-text) 58%, #9a9a9a 42%);
}
.atz-question {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.atz-question-head {
  display: grid;
  gap: 8px;
}
.atz-question-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.atz-question-controls .atz-select {
  flex: 1 1 180px;
}
.atz-btn-sm {
  border: none;
  background: var(--glass-bg);
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
}
.atz-btn-sm:hover { opacity: .9; }
.atz-btn-sm.danger { color: var(--ds-error, #c00); border-color: var(--ds-error, #c00); }
.atz-btn-sm.danger:hover { background: #c00; color: #fff; }
.atz-btn-add {
  border: none;
  background: var(--glass-bg);
  padding: 8px 16px;
  font-size: .82rem;
  cursor: pointer;
  font-family: inherit;
  color: var(--atz-muted);
  width: 100%;
  margin-top: 8px;
  display: block;
}
.atz-btn-add:hover { color: var(--atz-text); opacity: .9; }
.atz-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
.atz-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  margin-top: 20px;
}
.atz-inline-loading {
  min-width: 220px;
  margin-right: auto;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .atz-card-toggle,
  .atz-card-panel { padding-left: 14px; padding-right: 14px; }
  .atz-row {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
  .atz-question-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .atz-upload-row--field {
    align-items: stretch;
  }
  .atz-actions {
    flex-direction: column;
    gap: 8px;
  }
  .atz-inline-loading {
    width: 100%;
    min-width: 0;
    margin-right: 0;
  }
  .atz-actions .a-btn-save,
  .atz-btn-add { width: 100%; }
}
</style>
