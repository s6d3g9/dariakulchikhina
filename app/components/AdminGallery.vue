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
        class="agal-card a-card"
      >
        <div class="agal-img-wrap">
          <img v-if="item.image" :src="`/uploads/${item.image}`" class="agal-img" :alt="item.title">
          <div v-else class="agal-img-placeholder">нет фото</div>
        </div>
        <div class="agal-info">
          <div class="agal-name">{{ item.title }}</div>
          <div v-if="item.tags?.length" class="agal-tags">
            <span v-for="t in item.tags" :key="t" class="agal-tag">{{ t }}</span>
          </div>
        </div>
        <div class="agal-actions">
          <button class="a-btn-sm" @click="openEdit(item)">изм.</button>
          <button class="a-btn-sm a-btn-danger" @click="del(item.id)">×</button>
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
.agal-wrap { padding: 0 0 48px; }
.agal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
}
.agal-title { font-size: .78rem; color: #888; text-transform: uppercase; letter-spacing: .5px; }
.agal-count {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 999px;
  background: var(--text, #1a1a1a); color: var(--bg, #fff);
  font-size: .68rem; margin-left: 8px;
}
.agal-search { max-width: 200px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border, #ddd); }
.agal-empty {
  padding: 48px 0; text-align: center;
  font-size: .85rem; color: #bbb; letter-spacing: .5px;
}
.agal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.agal-card {
  padding: 0; overflow: hidden; display: flex; flex-direction: column;
  transition: box-shadow .2s;
}
.agal-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }
.agal-img-wrap { aspect-ratio: 4/3; overflow: hidden; background: var(--border, #f0f0f0); }
.agal-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.agal-img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: .72rem; color: #ccc;
}
.agal-info { padding: 10px 12px 6px; flex: 1; }
.agal-name { font-size: .85rem; font-weight: 500; color: var(--text, #1a1a1a); margin-bottom: 4px; }
.agal-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.agal-tag {
  font-size: .68rem; padding: 2px 7px;
  background: var(--border, #eee); border-radius: 3px; color: #888;
}
.agal-actions {
  padding: 6px 10px 10px;
  display: flex; gap: 6px; justify-content: flex-end;
}
.agal-modal-title {
  font-size: .85rem; font-weight: 400; text-transform: uppercase;
  letter-spacing: 1px; color: #888; margin-bottom: 20px;
}
</style>
