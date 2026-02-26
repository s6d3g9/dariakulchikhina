<template>
  <div>
    <div v-if="pending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <template v-else>
      <div v-for="(sec, si) in sections" :key="si" class="atz-card">
        <div class="atz-card-label">раздел: {{ sec.title || '(без названия)' }}</div>

        <div class="atz-row">
          <label class="atz-lbl">id:</label>
          <input v-model="sec.id" class="atz-inp" type="text" @input="markDirty">
        </div>
        <div class="atz-row">
          <label class="atz-lbl">название:</label>
          <input v-model="sec.title" class="atz-inp" type="text" @input="markDirty">
        </div>
        <div class="atz-row">
          <label class="atz-lbl">заголовок:</label>
          <input v-model="sec.heading" class="atz-inp" type="text" @input="markDirty">
        </div>

        <!-- section image -->
        <div class="atz-upload-row">
          <label class="atz-lbl">изображение:</label>
          <input v-model="sec.image" class="atz-inp" type="text" placeholder="имя файла" @input="markDirty">
          <label class="atz-btn-upload">
            загрузить
            <input type="file" accept="image/*" style="display:none" @change="(e) => uploadSecImg(e, si)">
          </label>
          <img v-if="sec.image" :src="`/uploads/${sec.image}`" class="atz-img-prev">
        </div>

        <!-- questions -->
        <div v-for="(q, qi) in sec.questions" :key="qi" class="atz-question">
          <div class="atz-row">
            <input v-model="q.label" class="atz-inp" type="text" placeholder="вопрос" @input="markDirty">
            <select v-model="q.type" class="atz-select" @change="markDirty">
              <option value="text">текст</option>
              <option value="select">выбор</option>
              <option value="number">число</option>
              <option value="yesno">да/нет</option>
            </select>
            <button class="atz-btn-sm danger" @click="delQ(si, qi)">×</button>
          </div>
          <!-- question image -->
          <div class="atz-upload-row" style="margin-top:4px">
            <label class="atz-lbl" style="width:60px;font-size:.72rem">фото:</label>
            <input v-model="q.image" class="atz-inp" type="text" placeholder="имя файла" @input="markDirty">
            <label class="atz-btn-upload">
              загрузить
              <input type="file" accept="image/*" style="display:none" @change="(e) => uploadQImg(e, si, qi)">
            </label>
            <img v-if="q.image" :src="`/uploads/${q.image}`" class="atz-img-prev">
          </div>
        </div>
        <button class="atz-btn-add" @click="addQ(si)">+ вопрос</button>

        <div style="text-align:right;margin-top:8px">
          <button class="atz-btn-sm danger" @click="delSec(si)">удалить раздел</button>
        </div>
      </div>

      <button class="atz-btn-add" style="margin-bottom:12px" @click="addSec">+ новый раздел</button>

      <div class="atz-actions">
        <p v-if="error" style="color:#c00;font-size:.8rem;margin-right:auto">{{ error }}</p>
        <button class="a-btn-save" :disabled="saving" @click="save">{{ saving ? '...' : 'сохранить' }}</button>
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
  background: #fff;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #1a1a1a;
  padding: 20px;
  margin-bottom: 16px;
}
.atz-card-label {
  font-size: .9rem;
  font-weight: 400;
  color: #888;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 12px;
}
.atz-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.atz-lbl {
  font-size: .78rem;
  color: #888;
  width: 80px;
  flex-shrink: 0;
}
.atz-inp {
  flex: 1;
  border: none;
  border-bottom: 1px solid #ddd;
  padding: 6px 0;
  font-size: .88rem;
  outline: none;
  font-family: inherit;
  background: transparent;
}
.atz-inp:focus { border-bottom-color: #1a1a1a; }
.atz-select {
  border: 1px solid #ddd;
  padding: 4px 8px;
  font-size: .82rem;
  font-family: inherit;
  outline: none;
  background: #fff;
}
.atz-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.atz-btn-upload {
  border: 1px solid #1a1a1a;
  background: transparent;
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
  white-space: nowrap;
}
.atz-btn-upload:hover { background: #1a1a1a; color: #fff; }
.atz-img-prev {
  max-width: 120px;
  max-height: 90px;
  object-fit: cover;
  border: 1px solid #ddd;
  border-radius: 2px;
}
.atz-question {
  padding: 10px 10px 6px;
  border-bottom: 1px solid #f0f0f0;
  margin: 6px 0;
  padding-left: 20px;
}
.atz-btn-sm {
  border: 1px solid #ddd;
  background: transparent;
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
}
.atz-btn-sm:hover { border-color: #1a1a1a; }
.atz-btn-sm.danger { color: #c00; border-color: #c00; }
.atz-btn-sm.danger:hover { background: #c00; color: #fff; }
.atz-btn-add {
  border: 1px dashed #ccc;
  background: transparent;
  padding: 8px 16px;
  font-size: .82rem;
  cursor: pointer;
  font-family: inherit;
  color: #888;
  width: 100%;
  margin-top: 8px;
  display: block;
}
.atz-btn-add:hover { border-color: #1a1a1a; color: #1a1a1a; }
.atz-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  margin-top: 20px;
}
</style>
