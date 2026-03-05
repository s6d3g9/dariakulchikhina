<template>
  <div class="apl-wrap">
    <div v-if="pending" class="ent-content-loading">
      <div class="ent-skeleton-line" v-for="i in 5" :key="i"/>
    </div>
    <template v-else>

      <!-- ── Статистика ─────────────────────────────────────────── -->
      <div class="apl-stats">
        <div v-for="s in statCards" :key="s.key" class="apl-stat-card" :class="`apl-stat-card--${s.color}`">
          <span class="apl-stat-num">{{ s.count }}</span>
          <span class="apl-stat-label">{{ s.label }}</span>
        </div>
        <div class="apl-stat-total">
          <span class="apl-stat-num">{{ items.length }}</span>
          <span class="apl-stat-label">всего</span>
        </div>
        <span v-if="savedAt" class="apl-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- ── Фильтры ────────────────────────────────────────────── -->
      <div class="apl-filters">
        <button
          v-for="f in filterOptions"
          :key="f.value"
          class="apl-filter-btn"
          :class="activeFilter === f.value ? 'apl-filter-btn--active' : ''"
          @click="activeFilter = f.value"
        >{{ f.label }}</button>
        <div style="flex:1"/>
        <select v-model="activeStatus" class="u-status-sel apl-filter-sel">
          <option value="">все статусы</option>
          <option value="open">открыт</option>
          <option value="assigned">назначен</option>
          <option value="fixed">исправлен</option>
          <option value="verified">принят ✓</option>
        </select>
        <button class="apl-add-btn" @click="addItem">+ замечание</button>
      </div>

      <!-- ── Список замечаний ───────────────────────────────────── -->
      <div v-if="filteredItems.length" class="apl-list">
        <div
          v-for="(item, idx) in filteredItems"
          :key="item.id"
          class="apl-item"
          :class="[`apl-item--${item.priority || 'minor'}`, `apl-item--status-${item.status || 'open'}`]"
        >
          <!-- Шапка замечания -->
          <div class="apl-item-head" @click="toggleItem(item.id)">
            <div class="apl-item-head-left">
              <span class="apl-priority-tag" :class="`apl-priority--${item.priority || 'minor'}`">
                {{ priorityLabel(item.priority) }}
              </span>
              <span class="apl-item-num">#{{ realIndex(item) + 1 }}</span>
              <span class="apl-item-room">{{ item.room || 'помещение не указано' }}</span>
              <span class="apl-item-title-preview">{{ item.description ? item.description.slice(0,50) : '—' }}{{ item.description?.length > 50 ? '…' : '' }}</span>
            </div>
            <div class="apl-item-head-right">
              <span class="apl-status-badge" :class="`apl-status--${item.status || 'open'}`">
                {{ statusLabel(item.status) }}
              </span>
              <span class="apl-chevron">{{ expandedItems.has(item.id) ? '▲' : '▼' }}</span>
            </div>
          </div>

          <!-- Тело (expandable) -->
          <div v-show="expandedItems.has(item.id)" class="apl-item-body">
            <div class="u-grid-2" style="margin-bottom:12px">
              <div class="u-field">
                <label class="u-field__label">приоритет</label>
                <select v-model="item.priority" class="u-status-sel" @change="save">
                  <option value="critical">критичный 🔴</option>
                  <option value="major">серьёзный 🟠</option>
                  <option value="minor">незначительный 🟡</option>
                  <option value="cosmetic">косметический ⬜</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">статус</label>
                <select v-model="item.status" class="u-status-sel" @change="save">
                  <option value="open">открыт</option>
                  <option value="assigned">назначен</option>
                  <option value="fixed">исправлен</option>
                  <option value="verified">принят ✓</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">помещение / зона</label>
                <input v-model="item.room" class="glass-input" placeholder="кухня, ванна, коридор…" @blur="save">
              </div>
              <div class="u-field">
                <label class="u-field__label">ответственный подрядчик</label>
                <input v-model="item.contractor" class="glass-input" placeholder="компания / ФИО" @blur="save">
              </div>
              <div class="u-field">
                <label class="u-field__label">срок устранения</label>
                <AppDatePicker v-model="item.dueDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">дата устранения (факт)</label>
                <AppDatePicker v-model="item.resolvedDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">описание замечания</label>
                <textarea v-model="item.description" class="glass-input u-ta" rows="3" @blur="save" placeholder="Подробное описание…"/>
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">комментарий (ход устранения)</label>
                <textarea v-model="item.resolution" class="glass-input u-ta" rows="2" @blur="save" placeholder="Что было сделано…"/>
              </div>
            </div>

            <!-- Фото -->
            <div class="apl-photos-section">
              <div class="apl-photos-header">
                <span class="apl-photos-label">фото замечания</span>
                <label class="apl-upload-btn">
                  <input type="file" multiple accept="image/*" class="apl-file-input" @change="e => uploadPhotos(item, e)">
                  + фото
                </label>
              </div>
              <div v-if="item.photos && item.photos.length" class="apl-photos-grid">
                <div v-for="(ph, pi) in item.photos" :key="pi" class="apl-photo-thumb">
                  <img :src="ph" :alt="`фото ${pi+1}`" @click="lightbox = ph"/>
                  <button class="apl-photo-del" @click.stop="removePhoto(item, pi)">×</button>
                </div>
              </div>
              <div v-else class="apl-photos-empty">Фото не прикреплены</div>
            </div>

            <!-- Действия -->
            <div class="apl-item-actions">
              <!-- Быстрые переходы статуса -->
              <div class="apl-status-flow">
                <button
                  v-for="st in statusFlow"
                  :key="st.value"
                  class="apl-flow-btn"
                  :class="item.status === st.value ? 'apl-flow-btn--active' : ''"
                  @click="setStatus(item, st.value)"
                >{{ st.label }}</button>
              </div>
              <button class="apl-del-btn" @click="removeItem(idx)">удалить замечание</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="apl-empty">
        <template v-if="activeFilter || activeStatus">Нет замечаний по выбранному фильтру</template>
        <template v-else>Замечания пока не добавлены. Нажмите «+ замечание»</template>
      </div>

      <!-- Lightbox -->
      <div v-if="lightbox" class="apl-lightbox" @click="lightbox = ''">
        <img :src="lightbox" class="apl-lightbox-img" @click.stop>
        <button class="apl-lightbox-close" @click="lightbox = ''">×</button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const expandedItems = ref<Set<string>>(new Set())
const activeFilter  = ref('')
const activeStatus  = ref('')
const lightbox      = ref('')

const items = ref<any[]>([])

watch(project, (p) => {
  if (!p?.profile?.pl_items) return
  items.value = p.profile.pl_items
}, { immediate: true })

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), pl_items: items.value } },
  })
  markSaved()
}

// ── Filters ───────────────────────────────────────────────────
const filterOptions = [
  { value: '', label: 'все' },
  { value: 'critical', label: '🔴 критичные' },
  { value: 'major', label: '🟠 серьёзные' },
  { value: 'minor', label: '🟡 незначительные' },
  { value: 'cosmetic', label: '⬜ косметические' },
]

const filteredItems = computed(() => {
  return items.value.filter(i => {
    if (activeFilter.value && i.priority !== activeFilter.value) return false
    if (activeStatus.value && i.status !== activeStatus.value) return false
    return true
  })
})

function realIndex(item: any) {
  return items.value.indexOf(item)
}

// ── Stats ─────────────────────────────────────────────────────
const statCards = computed(() => [
  { key: 'open',     label: 'открыты',    color: 'red',    count: items.value.filter(i => i.status === 'open').length },
  { key: 'assigned', label: 'назначены',  color: 'orange', count: items.value.filter(i => i.status === 'assigned').length },
  { key: 'fixed',    label: 'исправлены', color: 'blue',   count: items.value.filter(i => i.status === 'fixed').length },
  { key: 'verified', label: 'приняты',    color: 'green',  count: items.value.filter(i => i.status === 'verified').length },
])

// ── Status flow ────────────────────────────────────────────────
const statusFlow = [
  { value: 'open',     label: '① открыт' },
  { value: 'assigned', label: '② назначен' },
  { value: 'fixed',    label: '③ исправлен' },
  { value: 'verified', label: '④ принят ✓' },
]

function setStatus(item: any, s: string) {
  item.status = s
  if (s === 'fixed' || s === 'verified') {
    if (!item.resolvedDate) item.resolvedDate = new Date().toISOString().slice(0, 10)
  }
  save()
}

// ── CRUD ──────────────────────────────────────────────────────
function addItem() {
  const id = `pl_${Date.now()}`
  items.value.push({
    id, priority: 'minor', status: 'open',
    room: '', contractor: '', description: '',
    resolution: '', dueDate: '', resolvedDate: '',
    photos: [],
  })
  expandedItems.value.add(id)
  save()
}

function removeItem(idx: number) {
  if (!confirm('Удалить замечание?')) return
  items.value.splice(idx, 1)
  save()
}

function toggleItem(id: string) {
  if (expandedItems.value.has(id)) expandedItems.value.delete(id)
  else expandedItems.value.add(id)
}

// ── Photos ────────────────────────────────────────────────────
async function uploadPhotos(item: any, e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  for (const file of Array.from(files)) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    if (!item.photos) item.photos = []
    item.photos.push(res.url)
  }
  save()
}

function removePhoto(item: any, pi: number) {
  item.photos.splice(pi, 1)
  save()
}

// ── Labels ────────────────────────────────────────────────────
function priorityLabel(p: string) {
  return ({critical:'🔴 критичный',major:'🟠 серьёзный',minor:'🟡 незначительный',cosmetic:'⬜ косметический'} as any)[p] || p
}
function statusLabel(s: string) {
  return ({open:'открыт',assigned:'назначен',fixed:'исправлен',verified:'принят ✓'} as any)[s] || s
}
</script>

<style scoped>
.apl-wrap { padding: 4px 0 40px; }

.apl-stats        { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
.apl-stat-card    { display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 14px; border-radius:8px; min-width:72px; }
.apl-stat-card--red    { background:color-mix(in srgb, var(--ds-error) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-error) 18%, transparent); }
.apl-stat-card--orange { background:color-mix(in srgb, var(--ds-warning) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-warning) 18%, transparent); }
.apl-stat-card--blue   { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-accent) 25%, transparent); }
.apl-stat-card--green  { background:color-mix(in srgb, var(--ds-success) 12%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-success) 20%, transparent); }
.apl-stat-total   { display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 14px; border-radius:8px; background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); min-width:72px; }
.apl-stat-num     { font-size:1.3rem; font-weight:700; color:color-mix(in srgb, var(--glass-text) 80%, transparent); }
.apl-stat-label   { font-size:.65rem; color:color-mix(in srgb, var(--glass-text) 42%, transparent); text-transform:uppercase; letter-spacing:.04em; }
.apl-saved        { font-size:.73rem; color:var(--ds-success); margin-left:auto; }

.apl-filters      { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
.apl-filter-btn   { background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); color:color-mix(in srgb, var(--glass-text) 48%, transparent); border-radius:6px; padding:4px 10px; font-size:.74rem; cursor:pointer; }
.apl-filter-btn:hover { background:color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg)); }
.apl-filter-btn--active { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border-color:color-mix(in srgb, var(--ds-accent) 35%, transparent); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.apl-filter-sel   { max-width:140px; font-size:.75rem; padding:4px 8px; }
.apl-add-btn      { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-accent) 35%, transparent); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); border-radius:6px; padding:4px 12px; font-size:.75rem; cursor:pointer; }
.apl-add-btn:hover { background:color-mix(in srgb, var(--ds-accent) 20%, var(--glass-bg)); }

.apl-list { display:flex; flex-direction:column; gap:8px; }
.apl-item { background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); border-radius:10px; overflow:hidden; }
.apl-item--critical { border-left:3px solid var(--ds-error); }
.apl-item--major    { border-left:3px solid var(--ds-warning); }
.apl-item--minor    { border-left:3px solid var(--ds-warning); }
.apl-item--cosmetic { border-left:3px solid color-mix(in srgb, var(--glass-text) 30%, transparent); }
.apl-item--status-verified { opacity:.65; }

.apl-item-head       { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 14px; cursor:pointer; }
.apl-item-head:hover { background:var(--glass-bg); }
.apl-item-head-left  { display:flex; align-items:center; gap:8px; flex:1; min-width:0; overflow:hidden; }
.apl-item-head-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

.apl-priority-tag { font-size:.68rem; padding:2px 6px; border-radius:4px; white-space:nowrap; }
.apl-priority--critical { background:color-mix(in srgb, var(--ds-error) 8%, var(--glass-bg)); color:var(--ds-error); }
.apl-priority--major    { background:color-mix(in srgb, var(--ds-warning) 8%, var(--glass-bg)); color:var(--ds-warning); }
.apl-priority--minor    { background:color-mix(in srgb, var(--ds-warning) 8%, var(--glass-bg)); color:var(--ds-warning); }
.apl-priority--cosmetic { background:color-mix(in srgb, var(--glass-text) 10%, transparent); color:color-mix(in srgb, var(--glass-text) 60%, transparent); }

.apl-item-num          { font-size:.72rem; color:color-mix(in srgb, var(--glass-text) 35%, transparent); flex-shrink:0; }
.apl-item-room         { font-size:.78rem; color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); flex-shrink:0; }
.apl-item-title-preview { font-size:.8rem; color:color-mix(in srgb, var(--glass-text) 65%, transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.apl-status-badge { font-size:.68rem; padding:2px 7px; border-radius:4px; flex-shrink:0; }
.apl-status--open     { background:color-mix(in srgb, var(--ds-error) 8%, var(--glass-bg)); color:var(--ds-error); }
.apl-status--assigned { background:#1a1200; color:var(--ds-warning); }
.apl-status--fixed    { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.apl-status--verified { background:color-mix(in srgb, var(--ds-success) 12%, var(--glass-bg)); color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); }
.apl-chevron { font-size:.65rem; color:color-mix(in srgb, var(--glass-text) 35%, transparent); }

.apl-item-body { padding:14px 16px 16px; border-top:1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); }

.apl-photos-section { background:color-mix(in srgb, var(--glass-bg) 75%, var(--glass-page-bg)); border:1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius:8px; padding:12px; margin-bottom:12px; }
.apl-photos-header  { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.apl-photos-label   { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:color-mix(in srgb, var(--glass-text) 42%, transparent); }
.apl-upload-btn     { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-accent) 35%, transparent); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); border-radius:5px; padding:3px 10px; font-size:.72rem; cursor:pointer; position:relative; }
.apl-file-input     { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
.apl-photos-grid    { display:flex; flex-wrap:wrap; gap:6px; }
.apl-photo-thumb    { position:relative; width:72px; height:72px; border-radius:4px; overflow:hidden; }
.apl-photo-thumb img { width:100%; height:100%; object-fit:cover; cursor:pointer; }
.apl-photo-del      { position:absolute; top:2px; right:2px; background:color-mix(in srgb, black 70%, transparent); border:none; color:white; border-radius:50%; width:16px; height:16px; font-size:.7rem; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }
.apl-photos-empty   { font-size:.76rem; color:color-mix(in srgb, var(--glass-text) 30%, transparent); text-align:center; padding:6px 0; }

.apl-item-actions  { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; }
.apl-status-flow   { display:flex; gap:4px; }
.apl-flow-btn      { background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 14%, transparent); color:color-mix(in srgb, var(--glass-text) 42%, transparent); border-radius:6px; padding:4px 10px; font-size:.72rem; cursor:pointer; }
.apl-flow-btn:hover { background:color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg)); color:color-mix(in srgb, var(--glass-text) 65%, transparent); }
.apl-flow-btn--active { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border-color:color-mix(in srgb, var(--ds-accent) 35%, transparent); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.apl-del-btn       { background:none; border:1px solid color-mix(in srgb, var(--ds-error) 18%, transparent); color:var(--ds-error); border-radius:6px; padding:4px 12px; font-size:.73rem; cursor:pointer; }
.apl-del-btn:hover { background:color-mix(in srgb, var(--ds-error) 10%, var(--glass-bg)); }

.apl-empty { text-align:center; padding:40px 20px; color:color-mix(in srgb, var(--glass-text) 30%, transparent); font-size:.84rem; }

.apl-lightbox       { position:fixed; inset:0; background:color-mix(in srgb, var(--glass-page-bg) 90%, transparent); display:flex; align-items:center; justify-content:center; z-index:9999; }
.apl-lightbox-img   { max-width:90vw; max-height:90vh; border-radius:6px; }
.apl-lightbox-close { position:absolute; top:16px; right:20px; background:none; border:none; color:white; font-size:2rem; cursor:pointer; opacity:.7; }
.apl-lightbox-close:hover { opacity:1; }
</style>
