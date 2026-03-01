<template>
  <div class="asp2-wrap">
    <div v-if="pending" class="asp2-loading">Загрузка...</div>
    <template v-else>

      <div class="asp2-toolbar">
        <span class="asp2-count">{{ form.sp2_photos.length }} фото</span>
        <label class="asp2-upload-btn" :class="{ 'asp2-upload-btn--loading': uploading }">
          {{ uploading ? 'загрузка...' : '+ загрузить фото' }}
          <input type="file" multiple accept="image/*,video/*" style="display:none" @change="onInput" :disabled="uploading">
        </label>
        <span v-if="savedAt" class="asp2-saved">✓ {{ savedAt }}</span>
      </div>

      <div class="asp2-filters">
        <button
          v-for="tag in allTags"
          :key="tag"
          class="asp2-tag" :class="{ 'asp2-tag--active': activeTag === tag }"
          @click="activeTag = activeTag === tag ? '' : tag"
        >{{ tag }}</button>
        <input v-model="newTag" class="asp2-new-tag" placeholder="+ тег..." @keydown.enter.prevent="addTagFilter">
      </div>

      <div v-if="filteredPhotos.length" class="asp2-grid">
        <div v-for="(ph, i) in filteredPhotos" :key="ph.url" class="asp2-card">
          <div class="asp2-img-wrap">
            <img :src="ph.url" :alt="ph.caption" class="asp2-img" loading="lazy">
            <div class="asp2-overlay">
              <a :href="ph.url" target="_blank" class="asp2-open">↗</a>
              <button class="asp2-del" @click="removePhoto(ph.url)">×</button>
            </div>
          </div>
          <div class="asp2-meta">
            <input v-model="ph.caption" class="asp2-caption" placeholder="подпись..." @blur="save">
            <div class="asp2-tags-row">
              <span v-for="t in ph.tags" :key="t" class="asp2-ph-tag">{{ t }}<button @click="removePhotoTag(ph, t)">×</button></span>
              <input v-model="ph._newTag" class="asp2-tag-inp" placeholder="тег..." @keydown.enter.prevent="addPhotoTag(ph)">
            </div>
          </div>
        </div>
      </div>
      <div v-else class="asp2-empty">Фотографии объекта не загружены</div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref(false)
const activeTag = ref('')
const newTag = ref('')

const form = reactive<any>({ sp2_photos: [] as any[] })

watch(project, (p) => {
  if (!p?.profile) return
  const arr = p.profile.sp2_photos
  form.sp2_photos = Array.isArray(arr) ? arr : []
  form.sp2_photos.forEach((ph: any) => { if (!Array.isArray(ph.tags)) ph.tags = [] })
}, { immediate: true })

const allTags = computed(() => {
  const s = new Set<string>()
  form.sp2_photos.forEach((ph: any) => ph.tags?.forEach((t: string) => s.add(t)))
  return Array.from(s)
})

const filteredPhotos = computed(() =>
  activeTag.value
    ? form.sp2_photos.filter((ph: any) => ph.tags?.includes(activeTag.value))
    : form.sp2_photos,
)

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), sp2_photos: form.sp2_photos } },
  })
  markSaved()
}

async function onInput(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  for (const f of Array.from(files)) {
    const fd = new FormData(); fd.append('file', f)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    form.sp2_photos.push({ url: res.url, caption: '', tags: [], _newTag: '' })
  }
  uploading.value = false
  await save();
  (e.target as HTMLInputElement).value = ''
}

function removePhoto(url: string) {
  form.sp2_photos = form.sp2_photos.filter((ph: any) => ph.url !== url)
  save()
}

function addTagFilter() {
  if (newTag.value.trim()) { activeTag.value = newTag.value.trim(); newTag.value = '' }
}

function addPhotoTag(ph: any) {
  const t = (ph._newTag || '').trim()
  if (t && !ph.tags.includes(t)) ph.tags.push(t)
  ph._newTag = ''
  save()
}
function removePhotoTag(ph: any, t: string) {
  ph.tags = ph.tags.filter((x: string) => x !== t)
  save()
}
</script>

<style scoped>
.asp2-wrap { padding: 4px 0 40px; }
.asp2-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }
.asp2-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.asp2-count { font-size: .74rem; color: #999; }
.asp2-upload-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border, #e0e0e0); padding: 6px 14px; font-size: .78rem; color: inherit; cursor: pointer; user-select: none; margin-left: auto; }
.asp2-upload-btn:hover { border-color: #aaa; }
.asp2-upload-btn--loading { opacity: .6; cursor: wait; }
.asp2-saved { font-size: .72rem; color: #5caa7f; }
.asp2-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.asp2-tag { border: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-size: .7rem; padding: 3px 8px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.asp2-tag--active { background: var(--border, #e0e0e0); }
.asp2-new-tag { border: 1px dashed var(--border, #e0e0e0); background: none; color: inherit; font-size: .7rem; padding: 3px 8px; outline: none; font-family: inherit; width: 100px; }
.asp2-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.asp2-card { display: flex; flex-direction: column; border: 1px solid var(--border, #ececec); }
.asp2-img-wrap { position: relative; aspect-ratio: 4/3; overflow: hidden; background: #f0f0f0; }
.asp2-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.asp2-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; gap: 10px; opacity: 0; transition: opacity .15s; }
.asp2-card:hover .asp2-overlay { opacity: 1; }
.asp2-open { color: #fff; font-size: .9rem; text-decoration: none; }
.asp2-del { background: none; border: none; cursor: pointer; color: #fff; font-size: 1.2rem; line-height: 1; }
.asp2-meta { padding: 8px; }
.asp2-caption { width: 100%; border: none; border-bottom: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-size: .75rem; padding: 3px 0; outline: none; font-family: inherit; }
.asp2-tags-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; align-items: center; }
.asp2-ph-tag { font-size: .62rem; padding: 2px 5px; border: 1px solid var(--border, #e0e0e0); border-radius: 3px; display: flex; align-items: center; gap: 3px; }
.asp2-ph-tag button { background: none; border: none; cursor: pointer; color: #aaa; padding: 0; font-size: .7rem; line-height: 1; }
.asp2-tag-inp { border: none; border-bottom: 1px dashed var(--border, #ccc); background: none; color: inherit; font-size: .65rem; width: 60px; outline: none; font-family: inherit; }
.asp2-empty { font-size: .8rem; color: #bbb; padding: 60px 0; text-align: center; border: 1px dashed var(--border, #ececec); }
</style>
