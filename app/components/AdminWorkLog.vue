<template>
  <div class="awl-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <div class="awl-toolbar">
        <span class="awl-count">{{ form.wl_entries.length }} запис{{ pluralRu(form.wl_entries.length) }}</span>
        <button class="awl-add-btn" @click="addEntry">+ запись</button>
        <span v-if="savedAt" class="awl-saved">✓ {{ savedAt }}</span>
      </div>

      <div v-if="form.wl_entries.length" class="awl-list">
        <div v-for="(e, i) in form.wl_entries" :key="i" class="awl-entry">
          <div class="awl-entry-head">
            <AppDatePicker v-model="e.date" model-type="iso" input-class="awl-date" @update:model-value="save" />
            <select v-model="e.type" class="u-status-sel" @change="save">
              <option value="note">заметка</option>
              <option value="issue">проблема</option>
              <option value="milestone">веха</option>
              <option value="visit">выезд</option>
            </select>
            <span class="awl-type-badge" :class="`awl-tb--${e.type || 'note'}`">{{ typeLabel(e.type) }}</span>
            <button class="awl-del" @click="removeEntry(i)">×</button>
          </div>
          <textarea v-model="e.text" class="glass-input glass-input--inline u-ta" rows="2" placeholder="описание..." @blur="save" />
          <div class="awl-photos-row" v-if="e.photos?.length">
            <a v-for="(ph, pi) in e.photos" :key="pi" :href="ph" target="_blank" class="awl-photo-thumb">
              <img :src="ph" alt="">
            </a>
          </div>
          <label class="awl-photo-btn" :class="{ 'awl-photo-btn--loading': uploading === i }">
            {{ uploading === i ? '...' : '📷 фото' }}
            <input type="file" multiple accept="image/*" style="display:none" @change="(ev) => addPhotos(ev, i)" :disabled="uploading !== null">
          </label>
        </div>
      </div>
      <div v-else class="awl-empty">Журнал работ пуст — добавьте первую запись</div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref<number | null>(null)

const form = reactive<any>({ wl_entries: [] as any[] })

watch(project, (p) => {
  if (!p?.profile) return
  const entries = p.profile.wl_entries
  form.wl_entries = Array.isArray(entries) ? entries : []
}, { immediate: true })

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

function addEntry() {
  form.wl_entries.unshift({ date: new Date().toISOString().slice(0, 10), type: 'note', text: '', photos: [] })
}

function removeEntry(i: number) {
  form.wl_entries.splice(i, 1)
  save()
}

async function addPhotos(e: Event, idx: number) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = idx
  const entry = form.wl_entries[idx]
  if (!Array.isArray(entry.photos)) entry.photos = []
  for (const f of Array.from(files)) {
    const fd = new FormData(); fd.append('file', f)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    entry.photos.push(res.url)
  }
  uploading.value = null
  await save();
  (e.target as HTMLInputElement).value = ''
}

function typeLabel(t: string) {
  const map: Record<string, string> = { note: '📝', issue: '⚠', milestone: '🏁', visit: '🚶' }
  return map[t] || '📝'
}

function pluralRu(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ь'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'и'
  return 'ей'
}
</script>

<style scoped>
.awl-wrap { padding: 4px 0 40px; }
.awl-loading { padding: 40px 0; font-size: .82rem; color: var(--ds-muted, #aaa); }
.awl-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.awl-count { font-size: .74rem; color: var(--ds-muted, #999); }
.awl-add-btn { border: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-size: .76rem; padding: 5px 12px; cursor: pointer; font-family: inherit; margin-left: auto; }
.awl-add-btn:hover { border-color: var(--ds-muted, #aaa); }
.awl-saved { font-size: .72rem; color: var(--ds-success, #5caa7f); }
.awl-list { display: flex; flex-direction: column; gap: 12px; }
.awl-entry { border: 1px solid var(--border, #ececec); padding: 12px 14px; }
.awl-entry-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.awl-date { border: 1px solid var(--border, #e0e0e0); padding: 5px 8px; font-size: .78rem; background: none; color: inherit; font-family: inherit; outline: none; }
</style>
