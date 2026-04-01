<template>
  <div class="asp2-wrap">
    <div v-if="pending" class="ent-content-loading asp2-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <div class="asp2-toolbar">
        <span class="asp2-count">{{ form.sp2_photos.length }} фото</span>
        <label class="asp2-upload-btn" :class="{ 'asp2-upload-btn--loading': uploading }">
          + загрузить фото
          <input type="file" multiple accept="image/*,video/*" style="display:none" @change="onInput" :disabled="uploading">
        </label>
        <div v-if="uploading" class="u-inline-loading asp2-inline-loading" aria-live="polite">
          <span class="u-inline-loading__label">[ ЗАГРУЖАЕМ ФОТО ОБЪЕКТА ]</span>
          <span class="u-inline-loading__line" />
        </div>
        <span v-if="savedAt" class="asp2-saved">✓ {{ savedAt }}</span>
      </div>

      <div class="asp2-filters">
        <button
          v-for="tag in allTags"
          :key="tag"
          class="asp2-tag" :class="{ 'asp2-tag--active': activeTag === tag }"
          @click="activeTag = activeTag === tag ? '' : tag"
        >{{ tag }}</button>
        <GlassInput v-model="newTag"  placeholder="+ тег..." @keydown.enter.prevent="addTagFilter" />
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
            <GlassInput v-model="ph.caption" class="glass-input --inline" placeholder="подпись..." @blur="save" />
            <div class="asp2-tags-row">
              <span v-for="t in ph.tags" :key="t" class="asp2-ph-tag">{{ t }}<button @click="removePhotoTag(ph, t)">×</button></span>
              <GlassInput v-model="ph._newTag" class="glass-input --inline" placeholder="тег..." @keydown.enter.prevent="addPhotoTag(ph)" />
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
.asp2-content-loading::before { content: '[ ЗАГРУЖАЕМ ФОТО ОБЪЕКТА ]'; }
.asp2-loading { padding: 40px 0; font-size: .82rem; color: var(--ds-muted, #aaa); }
.asp2-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.asp2-count { font-size: .74rem; color: var(--ds-muted, #999); }
.asp2-inline-loading { min-width: 220px; }
.asp2-upload-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border, #e0e0e0); padding: 6px 14px; font-size: .78rem; color: inherit; cursor: pointer; user-select: none; margin-left: auto; }
.asp2-upload-btn:hover { border-color: var(--ds-muted, #aaa); }
.asp2-upload-btn--loading { opacity: .6; cursor: wait; }
.asp2-saved { font-size: .72rem; color: var(--ds-success, #5caa7f); }
.asp2-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.asp2-tag { border: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-size: .7rem; padding: 3px 8px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.asp2-tag--active { background: var(--border, #e0e0e0); }

@media (max-width: 768px) {
  .asp2-inline-loading { width: 100%; min-width: 0; }
}
</style>
