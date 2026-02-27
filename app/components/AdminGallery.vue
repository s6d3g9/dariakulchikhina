<template>
  <div class="agal-wrap">
    <!-- Header -->
    <div class="a-card agal-header">
      <div>
        <span class="agal-title">{{ title }}</span>
        <span class="agal-count" v-if="items.length">{{ items.length }}</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input
          v-model="search"
          class="a-input agal-search"
          placeholder="поиск..."
        >
        <button class="a-btn-save" style="padding:7px 18px;font-size:.82rem;white-space:nowrap" @click="openAdd">
          + добавить
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="!filtered.length" class="agal-empty">
      <span>пока пусто — добавьте первый объект</span>
    </div>
    <div v-else class="agal-grid">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="agal-card"
      >
        <!-- image -->
        <div class="agal-img-wrap">
          <img v-if="item.image" :src="`/uploads/${item.image}`" class="agal-img" :alt="item.title" loading="lazy">
          <div v-else class="agal-img-placeholder">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span>нет фото</span>
          </div>
          <!-- hover overlay -->
          <div class="agal-overlay">
            <button class="agal-ov-btn" @click.stop="openEdit(item)">редактировать</button>
            <button class="agal-ov-btn agal-ov-btn--del" @click.stop="del(item.id)">удалить</button>
          </div>
        </div>
        <!-- info -->
        <div class="agal-info">
          <div class="agal-name">{{ item.title }}</div>
          <div v-if="item.description" class="agal-desc">{{ item.description }}</div>
          <div v-if="item.tags?.length" class="agal-tags">
            <span v-for="t in item.tags" :key="t" class="agal-tag">{{ t }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="a-modal-backdrop" @click.self="closeModal">
      <div class="a-modal" style="width:520px;max-width:94vw">
        <h3 class="agal-modal-title">{{ editingId ? 'редактировать' : 'добавить' }}</h3>
        <form @submit.prevent="save">
          <div class="a-field">
            <label>Название *</label>
            <input v-model="form.title" class="a-input" required autofocus>
          </div>
          <div class="a-field">
            <label>Изображение</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input v-model="form.image" class="a-input" placeholder="имя файла">
              <label class="a-btn-sm" style="cursor:pointer;white-space:nowrap">
                загрузить
                <input type="file" accept="image/*" style="display:none" @change="uploadImage">
              </label>
            </div>
            <img v-if="form.image" :src="`/uploads/${form.image}`" style="margin-top:8px;max-height:160px;border-radius:6px;object-fit:cover">
          </div>
          <div class="a-field">
            <label>Теги (через запятую)</label>
            <input v-model="tagsStr" class="a-input" placeholder="минимализм, дерево, светлый...">
          </div>
          <div class="a-field">
            <label>Описание</label>
            <textarea v-model="form.description" class="a-input" rows="3" style="resize:vertical"></textarea>
          </div>
          <div v-if="error" style="font-size:.8rem;color:#c00;margin-bottom:8px">{{ error }}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
            <button type="button" class="a-btn-sm" @click="closeModal">отмена</button>
            <button type="submit" class="a-btn-save" :disabled="saving">
              {{ saving ? '...' : 'сохранить' }}
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
.agal-wrap { padding: 0 0 64px; }

/* Header */
.agal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; margin-bottom: 20px; gap: 12px; flex-wrap: wrap;
}
.agal-title {
  font-size: .72rem; color: #888;
  text-transform: uppercase; letter-spacing: 1px;
}
.agal-count {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 999px;
  background: var(--text, #1a1a1a); color: var(--bg, #fff);
  font-size: .62rem; margin-left: 8px; vertical-align: middle;
}
.agal-search {
  width: 180px; padding: 6px 12px; border-radius: 6px;
  border: 1px solid var(--border, #ddd); font-size: .82rem;
  background: transparent; color: inherit; outline: none;
}
.agal-search:focus { border-color: var(--text, #1a1a1a); }

/* Empty */
.agal-empty {
  padding: 64px 24px; text-align: center;
  font-size: .82rem; color: #ccc; letter-spacing: .5px;
}

/* Grid */
.agal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

/* Card */
.agal-card {
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e8e8e8);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform .18s ease, box-shadow .18s ease;
}
.agal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(0,0,0,.09);
}

/* Image area */
.agal-img-wrap {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--border, #f2f2f2);
  flex-shrink: 0;
}
.agal-img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform .3s ease;
}
.agal-card:hover .agal-img { transform: scale(1.03); }
.agal-img-placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: #ccc;
}
.agal-img-placeholder span { font-size: .72rem; }

/* Hover overlay */
.agal-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.42);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  opacity: 0; transition: opacity .18s ease;
}
.agal-card:hover .agal-overlay { opacity: 1; }
.agal-ov-btn {
  padding: 7px 16px;
  background: rgba(255,255,255,.92);
  border: none; border-radius: 6px;
  font-size: .76rem; font-family: inherit;
  cursor: pointer; font-weight: 500;
  transition: background .15s;
}
.agal-ov-btn:hover { background: #fff; }
.agal-ov-btn--del {
  background: rgba(220,38,38,.88); color: #fff;
}
.agal-ov-btn--del:hover { background: rgba(220,38,38,1); }

/* Info */
.agal-info {
  padding: 12px 14px 14px;
  flex: 1; display: flex; flex-direction: column; gap: 5px;
}
.agal-name {
  font-size: .88rem; font-weight: 500;
  color: var(--text, #1a1a1a);
  line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.agal-desc {
  font-size: .76rem; color: #999;
  line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.agal-tags {
  display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px;
}
.agal-tag {
  font-size: .66rem; padding: 2px 8px;
  background: var(--border, #f0f0f0);
  border-radius: 4px; color: #888;
  letter-spacing: .2px;
}

/* Modal */
.agal-modal-title {
  font-size: .82rem; font-weight: 400;
  text-transform: uppercase; letter-spacing: 1px;
  color: #888; margin-bottom: 20px;
}
</style>
