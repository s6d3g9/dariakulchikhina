<template>
  <div class="agal-wrap">

    <!-- Header -->
    <div class="agal-header glass-surface glass-card">
      <div class="agal-header-left">
        <span class="agal-title">{{ title }}</span>
        <span v-if="items.length" class="agal-badge">{{ items.length }}</span>
      </div>
      <div class="agal-header-right">
        <input v-model="search" class="agal-search glass-input" placeholder="поиск...">
        <button class="agal-add-btn" @click="openAdd">+ добавить</button>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="!filtered.length" class="agal-empty glass-card glass-surface">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      <span>пока пусто — добавьте первый объект</span>
    </div>

    <!-- Grid -->
    <div v-else class="agal-grid">
      <div v-for="item in filtered" :key="item.id" class="agal-card glass-card">

        <!-- Image zone -->
        <div class="agal-img-zone">
          <img
            v-if="item.image"
            :src="`/uploads/${item.image}`"
            class="agal-img"
            :alt="item.title"
            loading="lazy"
          >
          <div v-else class="agal-no-img">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>

          <!-- Top-right action buttons -->
          <div class="agal-btns">
            <button class="agal-icon-btn" title="Редактировать" @click.stop="openEdit(item)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
            </button>
            <button class="agal-icon-btn agal-icon-btn--del" title="Удалить" @click.stop="del(item.id)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>

        <!-- Info zone -->
        <div class="agal-info">
          <p class="agal-name">{{ item.title }}</p>
          <p v-if="item.description" class="agal-desc">{{ item.description }}</p>
          <div v-if="item.tags?.length" class="agal-tags">
            <span v-for="t in item.tags" :key="t" class="agal-tag">{{ t }}</span>
          </div>
        </div>

      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="showModal" class="agal-backdrop" @click.self="closeModal">
      <div class="agal-modal glass-surface glass-card">
        <div class="agal-modal-head">
          <span>{{ editingId ? 'редактировать' : 'добавить' }}</span>
          <button class="agal-close" @click="closeModal">×</button>
        </div>

        <form @submit.prevent="save" class="agal-form">
          <div class="agal-field">
            <label>Название *</label>
            <input v-model="form.title" class="glass-input agal-finput" required autofocus placeholder="введите название">
          </div>

          <div class="agal-field">
            <label>Изображение</label>
            <div class="agal-upload-row">
              <input v-model="form.image" class="glass-input agal-finput" placeholder="имя файла или загрузите →">
              <label class="agal-upload-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                загрузить
                <input type="file" accept="image/*" style="display:none" @change="uploadImage">
              </label>
            </div>
            <div v-if="form.image" class="agal-preview">
              <img :src="`/uploads/${form.image}`" :alt="form.title || ''">
            </div>
          </div>

          <div class="agal-field">
            <label>Теги <span style="opacity:.5;font-weight:400">через запятую</span></label>
            <input v-model="tagsStr" class="glass-input agal-finput" placeholder="минимализм, дерево, нейтральный...">
          </div>

          <div class="agal-field">
            <label>Описание</label>
            <textarea v-model="form.description" class="glass-input agal-finput agal-fta" rows="3" placeholder="краткое описание..."></textarea>
          </div>

          <p v-if="error" class="agal-error">{{ error }}</p>

          <div class="agal-modal-foot">
            <button type="button" class="agal-cancel-btn" @click="closeModal">отмена</button>
            <button type="submit" class="agal-save-btn" :disabled="saving">
              {{ saving ? 'сохранение...' : 'сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ category: string; title: string }>()

interface GalleryItem {
  id: number
  title: string
  image?: string
  tags?: string[]
  description?: string
  category: string
}

const items = ref<GalleryItem[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const error = ref('')
const editingId = ref<number | null>(null)

const form = reactive<Partial<GalleryItem>>({ title: '', image: '', description: '', tags: [] })
const tagsStr = computed({
  get: () => (form.tags || []).join(', '),
  set: (v: string) => { form.tags = v.split(',').map(s => s.trim()).filter(Boolean) }
})

const filtered = computed(() => {
  if (!search.value) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(i => i.title.toLowerCase().includes(q) || i.tags?.some(t => t.toLowerCase().includes(q)))
})

async function load() {
  try {
    const data = await $fetch<GalleryItem[]>(`/api/gallery?category=${props.category}`)
    items.value = data
  } catch {}
}
await load()

function openAdd() {
  editingId.value = null
  Object.assign(form, { title: '', image: '', description: '', tags: [] })
  error.value = ''
  showModal.value = true
}

function openEdit(item: GalleryItem) {
  editingId.value = item.id
  Object.assign(form, { ...item, tags: [...(item.tags || [])] })
  error.value = ''
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function uploadImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await $fetch<{ filename: string }>('/api/upload', { method: 'POST', body: fd })
    form.image = res.filename
  } catch { error.value = 'ошибка загрузки фото' }
}

async function save() {
  if (!form.title) return
  saving.value = true
  error.value = ''
  try {
    const body = { ...form, category: props.category }
    if (editingId.value) {
      await $fetch(`/api/gallery/${editingId.value}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/gallery', { method: 'POST', body })
    }
    await load()
    closeModal()
  } catch (e: any) {
    error.value = e?.data?.message || 'ошибка сохранения'
  } finally {
    saving.value = false
  }
}

async function del(id: number) {
  if (!confirm('Удалить?')) return
  await $fetch(`/api/gallery/${id}`, { method: 'DELETE' })
  await load()
}
</script>

<style scoped>
/* ─── Wrap ─────────────────────────────────────────────── */
.agal-wrap { padding-bottom: 64px; }

/* ─── Header ───────────────────────────────────────────── */
.agal-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
  padding: 14px 20px; margin-bottom: 20px;
  border-radius: 14px;
}
.agal-header-left { display: flex; align-items: center; gap: 8px; }
.agal-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.agal-title {
  font-size: .72rem; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--glass-text, #1a1a1a); opacity: .55;
}
.agal-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 5px;
  border-radius: 999px; font-size: .62rem;
  background: rgba(0,0,0,.09); color: var(--glass-text, #1a1a1a);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
html.dark .agal-badge { background: rgba(255,255,255,.12); color: #e5e5e5; }

.agal-search {
  width: 180px; padding: 7px 12px;
  border-radius: 8px; font-size: .82rem;
  font-family: inherit;
}
.agal-add-btn {
  padding: 8px 18px;
  font-size: .78rem; letter-spacing: .3px;
  font-family: inherit; cursor: pointer;
  border-radius: 8px; white-space: nowrap;
  border: 1px solid rgba(0,0,0,.16);
  background: rgba(0,0,0,.78); color: #fff;
  transition: opacity .15s;
}
.agal-add-btn:hover { opacity: .82; }
html.dark .agal-add-btn { background: rgba(255,255,255,.9); color: #111; border-color: rgba(255,255,255,.2); }

/* ─── Empty ─────────────────────────────────────────────── */
.agal-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 60px 24px;
  text-align: center; color: var(--glass-text, #1a1a1a); opacity: .3;
  font-size: .82rem; letter-spacing: .4px;
  border-radius: 14px;
}

/* ─── Grid ──────────────────────────────────────────────── */
.agal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}

/* ─── Card ──────────────────────────────────────────────── */
.agal-card {
  /* liquid glass */
  background: var(--glass-bg, rgba(255,255,255,.48));
  border: 1px solid var(--glass-border, rgba(255,255,255,.55));
  box-shadow: var(--glass-shadow, 0 10px 28px rgba(18,18,18,.08));
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  backdrop-filter: blur(18px) saturate(145%);
  border-radius: 14px;
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: transform .18s ease, box-shadow .18s ease;
}
.agal-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(18,18,18,.13);
}
html.dark .agal-card {
  background: linear-gradient(160deg, rgba(22,23,28,.92) 0%, rgba(14,15,18,.96) 100%);
  border-color: rgba(255,255,255,.12);
  box-shadow: 0 12px 40px rgba(0,0,0,.5);
}

/* ─── Image zone ────────────────────────────────────────── */
.agal-img-zone {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: rgba(0,0,0,.05);
  flex-shrink: 0;
}
html.dark .agal-img-zone { background: rgba(255,255,255,.04); }

.agal-img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform .35s ease;
}
.agal-card:hover .agal-img { transform: scale(1.04); }

.agal-no-img {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--glass-text, #1a1a1a); opacity: .18;
}

/* Action buttons — top-right corner, always visible */
.agal-btns {
  position: absolute; top: 8px; right: 8px;
  display: flex; gap: 5px;
  opacity: 0; transform: translateY(-4px);
  transition: opacity .16s ease, transform .16s ease;
}
.agal-card:hover .agal-btns {
  opacity: 1; transform: translateY(0);
}
.agal-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer;
  background: rgba(255,255,255,.82);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0,0,0,.18);
  transition: background .13s, transform .13s;
}
.agal-icon-btn:hover { background: #fff; transform: scale(1.08); }
.agal-icon-btn--del { background: rgba(220,38,38,.8); color: #fff; }
.agal-icon-btn--del:hover { background: rgba(220,38,38,.97); }

/* ─── Info ──────────────────────────────────────────────── */
.agal-info {
  padding: 12px 14px 14px;
  display: flex; flex-direction: column; gap: 6px;
  min-height: 0; /* важно для flex */
}
.agal-name {
  font-size: .88rem; font-weight: 500; line-height: 1.35;
  color: var(--glass-text, #1a1a1a);
  /* не выходит за пределы, но показывает полностью (не обрезаем) */
  word-break: break-word;
  margin: 0;
}
.agal-desc {
  font-size: .75rem; color: var(--glass-text, #1a1a1a); opacity: .5;
  line-height: 1.45; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.agal-tags {
  display: flex; flex-wrap: wrap; gap: 4px;
}
.agal-tag {
  font-size: .65rem; padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0,0,0,.07); color: var(--glass-text, #1a1a1a); opacity: .7;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  letter-spacing: .1px; white-space: nowrap;
}
html.dark .agal-tag { background: rgba(255,255,255,.1); opacity: .8; }

/* ─── Modal backdrop ────────────────────────────────────── */
.agal-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.38);
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.agal-modal {
  width: 100%; max-width: 500px; max-height: 90vh;
  overflow-y: auto; border-radius: 18px;
  padding: 24px 26px;
}
.agal-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 22px;
}
.agal-modal-head span {
  font-size: .72rem; letter-spacing: 1.2px;
  text-transform: uppercase; opacity: .5;
}
.agal-close {
  width: 28px; height: 28px; border-radius: 7px; border: none;
  background: rgba(0,0,0,.08); color: var(--glass-text, #1a1a1a);
  cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center;
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.agal-close:hover { background: rgba(0,0,0,.15); }
html.dark .agal-close { background: rgba(255,255,255,.1); color: #eee; }

/* ─── Form ──────────────────────────────────────────────── */
.agal-form { display: flex; flex-direction: column; gap: 16px; }
.agal-field { display: flex; flex-direction: column; gap: 6px; }
.agal-field label {
  font-size: .72rem; letter-spacing: .4px; text-transform: uppercase;
  opacity: .45; font-weight: 500;
}
.agal-finput {
  padding: 9px 12px; border-radius: 9px;
  font-size: .88rem; font-family: inherit; width: 100%; box-sizing: border-box;
}
.agal-fta { resize: vertical; min-height: 72px; }

.agal-upload-row { display: flex; gap: 8px; align-items: center; }
.agal-upload-row .agal-finput { flex: 1; }
.agal-upload-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 9px 14px; border-radius: 9px; cursor: pointer; white-space: nowrap;
  font-size: .78rem; font-family: inherit;
  border: 1px solid var(--glass-border, rgba(255,255,255,.55));
  background: var(--glass-bg, rgba(255,255,255,.48));
  color: var(--glass-text, #1a1a1a);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  transition: background .13s;
}
.agal-upload-btn:hover { background: rgba(255,255,255,.72); }
html.dark .agal-upload-btn { color: #e5e5e5; }

.agal-preview {
  margin-top: 4px; border-radius: 10px; overflow: hidden;
  max-height: 160px;
  border: 1px solid var(--glass-border, rgba(255,255,255,.4));
}
.agal-preview img {
  width: 100%; max-height: 160px; object-fit: cover; display: block;
}
.agal-error { font-size: .78rem; color: #dc2626; margin: 0; }

.agal-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 4px;
}
.agal-cancel-btn {
  padding: 9px 18px; border-radius: 9px; cursor: pointer;
  font-family: inherit; font-size: .82rem;
  border: 1px solid var(--glass-border, rgba(0,0,0,.12));
  background: transparent; color: var(--glass-text, #1a1a1a);
  transition: background .13s;
}
.agal-cancel-btn:hover { background: rgba(0,0,0,.06); }
.agal-save-btn {
  padding: 9px 22px; border-radius: 9px; cursor: pointer;
  font-family: inherit; font-size: .82rem; letter-spacing: .2px;
  border: none;
  background: rgba(0,0,0,.82); color: #fff;
  transition: opacity .15s;
}
.agal-save-btn:hover:not(:disabled) { opacity: .8; }
.agal-save-btn:disabled { opacity: .45; cursor: default; }
html.dark .agal-save-btn { background: rgba(255,255,255,.88); color: #111; }
</style>
