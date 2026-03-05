<template>
  <div class="awl-wrap">
    <div v-if="pending" class="ent-content-loading">
      <div class="ent-skeleton-line" v-for="i in 4" :key="i"/>
    </div>
    <template v-else>

      <!-- ── Шапка + добавить запись ───────────────────────────── -->
      <div class="awl-header">
        <div class="awl-filter-row">
          <select v-model="filterType" class="u-status-sel awl-filter-sel">
            <option value="">все типы</option>
            <option v-for="t in entryTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <input v-model="filterSearch" class="glass-input awl-search" placeholder="поиск по тексту…">
          <select v-model="filterMonth" class="u-status-sel awl-filter-sel">
            <option value="">все месяцы</option>
            <option v-for="m in availableMonths" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="awl-header-right">
          <span v-if="savedAt" class="awl-saved">✓ {{ savedAt }}</span>
          <button class="awl-add-btn" @click="openAddForm">+ запись</button>
        </div>
      </div>

      <!-- ── Форма добавления ────────────────────────────────── -->
      <div v-if="addFormOpen" class="awl-add-form">
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">тип записи</label>
            <select v-model="newEntry.type" class="u-status-sel">
              <option v-for="t in entryTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div class="u-field">
            <label class="u-field__label">дата</label>
            <AppDatePicker v-model="newEntry.date" model-type="iso" input-class="glass-input" />
          </div>
          <div class="u-field">
            <label class="u-field__label">подрядчик / участник</label>
            <input v-model="newEntry.contractor" class="glass-input" placeholder="ФИО / компания">
          </div>
          <div class="u-field" v-if="newEntry.type === 'delivery'">
            <label class="u-field__label">наименование материала</label>
            <input v-model="newEntry.material" class="glass-input" placeholder="кирпич, плитка, …">
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">описание / текст записи</label>
            <textarea v-model="newEntry.text" class="glass-input u-ta" rows="3" placeholder="Подробности…"/>
          </div>
        </div>
        <!-- Фото для новой записи -->
        <div class="awl-new-photos">
          <label class="awl-upload-btn">
            <input type="file" multiple accept="image/*" @change="e => uploadNewPhotos(e)" class="awl-file-input">
            + прикрепить фото
          </label>
          <div v-if="newEntry.photos.length" class="awl-thumb-row">
            <div v-for="(ph, i) in newEntry.photos" :key="i" class="awl-thumb">
              <img :src="ph" :alt="`фото ${i}`">
              <button @click="newEntry.photos.splice(i,1)">×</button>
            </div>
          </div>
        </div>
        <div class="awl-form-actions">
          <button class="awl-submit-btn" @click="submitNewEntry">сохранить запись</button>
          <button class="awl-cancel-btn" @click="addFormOpen = false">отмена</button>
        </div>
      </div>

      <!-- ── Лента записей ──────────────────────────────────── -->
      <div v-if="filteredEntries.length" class="awl-feed">
        <!-- Группировка по месяцам -->
        <template v-for="group in groupedEntries" :key="group.month">
          <div class="awl-month-divider">{{ group.label }}</div>
          <div
            v-for="entry in group.entries"
            :key="entry.id"
            class="awl-entry"
            :class="`awl-entry--${entry.type}`"
          >
            <div class="awl-entry-left">
              <div class="awl-entry-icon" :class="`awl-icon--${entry.type}`">{{ entryIcon(entry.type) }}</div>
              <div class="awl-entry-line"/>
            </div>
            <div class="awl-entry-content">
              <div class="awl-entry-meta">
                <span class="awl-entry-type-badge" :class="`awl-badge--${entry.type}`">{{ entryTypeLabel(entry.type) }}</span>
                <span class="awl-entry-date">{{ fmtDate(entry.date) }}</span>
                <span v-if="entry.contractor" class="awl-entry-contractor">{{ entry.contractor }}</span>
                <span v-if="entry.material" class="awl-entry-material">📦 {{ entry.material }}</span>
              </div>
              <p class="awl-entry-text">{{ entry.text }}</p>
              <!-- Фото -->
              <div v-if="entry.photos && entry.photos.length" class="awl-photos-grid">
                <img v-for="(ph, pi) in entry.photos" :key="pi" :src="ph" class="awl-photo-thumb" @click="lightbox = ph">
              </div>
              <!-- Редактирование -->
              <div v-if="editingId === entry.id" class="awl-edit-form">
                <textarea v-model="editText" class="glass-input u-ta" rows="3" @blur="saveEdit(entry)"/>
                <input v-model="editContractor" class="glass-input" placeholder="подрядчик" @blur="saveEdit(entry)">
                <button class="awl-save-edit-btn" @click="saveEdit(entry)">сохранить</button>
              </div>
              <div class="awl-entry-footer">
                <button class="awl-entry-edit-btn" @click="startEdit(entry)">✎ ред.</button>
                <button class="awl-entry-del-btn" @click="removeEntry(entry.id)">удалить</button>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div v-else class="awl-empty">
        <template v-if="filterType || filterSearch || filterMonth">Нет записей по фильтру</template>
        <template v-else>Журнал работ пуст. Нажмите «+ запись»</template>
      </div>

      <!-- Lightbox -->
      <div v-if="lightbox" class="awl-lightbox" @click="lightbox = ''">
        <img :src="lightbox" class="awl-lightbox-img" @click.stop>
        <button class="awl-lightbox-close" @click="lightbox = ''">×</button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const addFormOpen = ref(false)
const filterType  = ref('')
const filterSearch= ref('')
const filterMonth = ref('')
const lightbox    = ref('')
const editingId   = ref('')
const editText    = ref('')
const editContractor = ref('')

const entries = ref<any[]>([])

watch(project, (p) => {
  if (!p?.profile?.wl_entries) return
  entries.value = p.profile.wl_entries
}, { immediate: true })

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), wl_entries: entries.value } },
  })
  markSaved()
}

// ── Entry types ───────────────────────────────────────────────
const entryTypes = [
  { value: 'note',        label: '📝 заметка' },
  { value: 'issue',       label: '⚠️ проблема' },
  { value: 'milestone',   label: '🏁 веха' },
  { value: 'visit',       label: '🏗️ визит' },
  { value: 'delivery',    label: '📦 поставка' },
  { value: 'inspection',  label: '🔍 проверка' },
]

function entryTypeLabel(t: string) {
  return entryTypes.find(e => e.value === t)?.label || t
}
function entryIcon(t: string) {
  return ({note:'📝',issue:'⚠️',milestone:'🏁',visit:'🏗️',delivery:'📦',inspection:'🔍'} as any)[t] || '📄'
}

// ── New entry form ────────────────────────────────────────────
const newEntry = reactive({ type: 'note', date: '', text: '', contractor: '', material: '', photos: [] as string[] })

function openAddForm() {
  newEntry.type = 'note'
  newEntry.date = new Date().toISOString().slice(0, 10)
  newEntry.text = ''
  newEntry.contractor = ''
  newEntry.material = ''
  newEntry.photos = []
  addFormOpen.value = true
}

async function uploadNewPhotos(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  for (const file of Array.from(files)) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    newEntry.photos.push(res.url)
  }
}

function submitNewEntry() {
  if (!newEntry.text.trim() && !newEntry.photos.length) return
  entries.value.unshift({
    id: `wl_${Date.now()}`,
    type:       newEntry.type,
    date:       newEntry.date || new Date().toISOString().slice(0, 10),
    text:       newEntry.text,
    contractor: newEntry.contractor,
    material:   newEntry.type === 'delivery' ? newEntry.material : '',
    photos:     [...newEntry.photos],
  })
  addFormOpen.value = false
  save()
}

// ── Edit ──────────────────────────────────────────────────────
function startEdit(entry: any) {
  editingId.value  = entry.id
  editText.value   = entry.text
  editContractor.value = entry.contractor
}
function saveEdit(entry: any) {
  entry.text       = editText.value
  entry.contractor = editContractor.value
  editingId.value  = ''
  save()
}

function removeEntry(id: string) {
  if (!confirm('Удалить запись?')) return
  entries.value = entries.value.filter(e => e.id !== id)
  save()
}

// ── Filters ───────────────────────────────────────────────────
const filteredEntries = computed(() => {
  return entries.value.filter(e => {
    if (filterType.value  && e.type !== filterType.value) return false
    if (filterMonth.value && !e.date?.startsWith(filterMonth.value)) return false
    if (filterSearch.value) {
      const q = filterSearch.value.toLowerCase()
      if (!((e.text || '').toLowerCase().includes(q) ||
            (e.contractor || '').toLowerCase().includes(q) ||
            (e.material || '').toLowerCase().includes(q))) return false
    }
    return true
  })
})

const availableMonths = computed(() => {
  const seen = new Set<string>()
  entries.value.forEach(e => {
    if (e.date) seen.add(e.date.slice(0, 7))
  })
  return Array.from(seen).sort().reverse().map(m => ({
    value: m,
    label: new Date(m + '-01').toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' }),
  }))
})

// ── Grouping by month ─────────────────────────────────────────
const groupedEntries = computed(() => {
  const map = new Map<string, any[]>()
  for (const e of filteredEntries.value) {
    const key = (e.date || '').slice(0, 7) || '—'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries()).map(([month, entries]) => ({
    month,
    label: month !== '—'
      ? new Date(month + '-01').toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
      : 'дата не указана',
    entries,
  }))
})

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}
</script>

<style scoped>
.awl-wrap { padding: 4px 0 40px; }

.awl-header       { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
.awl-filter-row   { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.awl-filter-sel   { max-width:140px; font-size:.75rem; }
.awl-search       { flex:1; min-width:140px; max-width:220px; padding:6px 10px; font-size:.8rem; }
.awl-header-right { display:flex; align-items:center; gap:10px; }
.awl-saved        { font-size:.73rem; color:var(--ds-success); }
.awl-add-btn      { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-accent) 35%, transparent); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); border-radius:6px; padding:5px 14px; font-size:.75rem; cursor:pointer; }
.awl-add-btn:hover { background:color-mix(in srgb, var(--ds-accent) 20%, var(--glass-bg)); }

.awl-add-form     { background:var(--glass-page-bg); border:1px solid color-mix(in srgb, var(--glass-text) 11%, transparent); border-radius:10px; padding:16px; margin-bottom:16px; }
.awl-new-photos   { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:10px 0; }
.awl-upload-btn   { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-accent) 35%, transparent); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); border-radius:5px; padding:5px 12px; font-size:.75rem; cursor:pointer; position:relative; white-space:nowrap; }
.awl-file-input   { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
.awl-thumb-row    { display:flex; gap:6px; flex-wrap:wrap; }
.awl-thumb        { position:relative; width:60px; height:60px; border-radius:4px; overflow:hidden; }
.awl-thumb img    { width:100%; height:100%; object-fit:cover; }
.awl-thumb button { position:absolute; top:1px; right:1px; background:color-mix(in srgb, black 70%, transparent); border:none; color:white; border-radius:50%; width:14px; height:14px; font-size:.6rem; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; }
.awl-form-actions { display:flex; gap:8px; margin-top:10px; }
.awl-submit-btn   { background:#1a3a20; border:1px solid #2a6030; color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); border-radius:6px; padding:6px 16px; font-size:.8rem; cursor:pointer; }
.awl-submit-btn:hover { background:color-mix(in srgb, var(--ds-success) 18%, var(--glass-bg)); }
.awl-cancel-btn   { background:none; border:1px solid color-mix(in srgb, var(--glass-text) 14%, transparent); color:color-mix(in srgb, var(--glass-text) 42%, transparent); border-radius:6px; padding:6px 14px; font-size:.8rem; cursor:pointer; }

.awl-feed { display:flex; flex-direction:column; }

.awl-month-divider { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:color-mix(in srgb, var(--glass-text) 35%, transparent); padding:12px 0 6px; border-bottom:1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); margin-bottom:8px; }

.awl-entry        { display:flex; gap:0; margin-bottom:4px; }
.awl-entry-left   { display:flex; flex-direction:column; align-items:center; width:36px; flex-shrink:0; }
.awl-entry-icon   { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.9rem; flex-shrink:0; margin-top:2px; }
.awl-icon--note        { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); }
.awl-icon--issue       { background:color-mix(in srgb, var(--ds-error) 12%, var(--glass-bg)); }
.awl-icon--milestone   { background:color-mix(in srgb, var(--ds-success) 12%, var(--glass-bg)); }
.awl-icon--visit       { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); }
.awl-icon--delivery    { background:color-mix(in srgb, var(--ds-warning) 10%, var(--glass-bg)); }
.awl-icon--inspection  { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); }
.awl-entry-line   { flex:1; width:1px; background:color-mix(in srgb, var(--glass-text) 10%, transparent); margin:4px 0; }

.awl-entry-content { flex:1; background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius:8px; padding:10px 12px; margin-bottom:8px; }
.awl-entry--issue .awl-entry-content  { border-left:3px solid var(--ds-error); }
.awl-entry--milestone .awl-entry-content { border-left:3px solid var(--ds-success); }
.awl-entry--delivery .awl-entry-content  { border-left:3px solid var(--ds-warning); }
.awl-entry--inspection .awl-entry-content { border-left:3px solid var(--ds-accent); }

.awl-entry-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px; }
.awl-entry-type-badge { font-size:.68rem; padding:1px 6px; border-radius:4px; }
.awl-badge--note       { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); color:color-mix(in srgb, var(--glass-text) 60%, transparent); }
.awl-badge--issue      { background:color-mix(in srgb, var(--ds-error) 12%, var(--glass-bg)); color:var(--ds-error); }
.awl-badge--milestone  { background:color-mix(in srgb, var(--ds-success) 12%, var(--glass-bg)); color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); }
.awl-badge--visit      { background:#1a2040; color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.awl-badge--delivery   { background:color-mix(in srgb, var(--ds-warning) 10%, var(--glass-bg)); color:var(--ds-warning); }
.awl-badge--inspection { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); color:color-mix(in srgb, var(--ds-accent) 55%, white); }
.awl-entry-date       { font-size:.72rem; color:color-mix(in srgb, var(--glass-text) 42%, transparent); }
.awl-entry-contractor { font-size:.72rem; color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.awl-entry-material   { font-size:.72rem; color:var(--ds-warning); }
.awl-entry-text { font-size:.82rem; color:color-mix(in srgb, var(--glass-text) 65%, transparent); margin:0 0 6px; white-space:pre-line; }

.awl-photos-grid   { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
.awl-photo-thumb   { width:60px; height:60px; object-fit:cover; border-radius:4px; cursor:pointer; }

.awl-edit-form { display:flex; flex-direction:column; gap:6px; margin:6px 0; }
.awl-save-edit-btn { align-self:flex-start; background:#1a3a20; border:1px solid #2a6030; color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); border-radius:5px; padding:4px 12px; font-size:.75rem; cursor:pointer; }

.awl-entry-footer  { display:flex; gap:8px; }
.awl-entry-edit-btn { background:none; border:1px solid color-mix(in srgb, var(--glass-text) 14%, transparent); color:color-mix(in srgb, var(--glass-text) 42%, transparent); border-radius:4px; padding:2px 8px; font-size:.68rem; cursor:pointer; }
.awl-entry-edit-btn:hover { color:color-mix(in srgb, var(--glass-text) 65%, transparent); }
.awl-entry-del-btn  { background:none; border:1px solid #2a1a1a; color:var(--ds-error); border-radius:4px; padding:2px 8px; font-size:.68rem; cursor:pointer; }
.awl-entry-del-btn:hover { background:color-mix(in srgb, var(--ds-error) 10%, var(--glass-bg)); }

.awl-empty { text-align:center; padding:40px 20px; color:color-mix(in srgb, var(--glass-text) 30%, transparent); font-size:.84rem; }

.awl-lightbox       { position:fixed; inset:0; background:color-mix(in srgb, var(--glass-page-bg) 90%, transparent); display:flex; align-items:center; justify-content:center; z-index:9999; }
.awl-lightbox-img   { max-width:90vw; max-height:90vh; border-radius:6px; }
.awl-lightbox-close { position:absolute; top:16px; right:20px; background:none; border:none; color:white; font-size:2rem; cursor:pointer; opacity:.7; }
.awl-lightbox-close:hover { opacity:1; }
</style>
