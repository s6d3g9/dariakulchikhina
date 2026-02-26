<template>
  <div>
    <div v-if="pending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <template v-else>
      <div v-for="(tab, ti) in tabs" :key="ti" class="am-card">
        <div class="am-card-label">вкладка: {{ tab.title || '(без названия)' }}</div>

        <div class="am-row">
          <label class="am-lbl">id:</label>
          <input v-model="tab.id" class="am-inp" type="text" @input="markDirty">
        </div>
        <div class="am-row">
          <label class="am-lbl">название:</label>
          <input v-model="tab.title" class="am-inp" type="text" @input="markDirty">
        </div>
        <div class="am-row">
          <label class="am-lbl">заголовок:</label>
          <input v-model="tab.heading" class="am-inp" type="text" @input="markDirty">
        </div>

        <!-- image upload -->
        <div class="am-upload-row">
          <label class="am-lbl">изображение:</label>
          <input v-model="tab.image" class="am-inp" type="text" placeholder="имя файла" @input="markDirty">
          <label class="am-btn-upload">
            загрузить
            <input type="file" accept="image/*" style="display:none" @change="(e) => uploadTabImg(e, ti)">
          </label>
          <img v-if="tab.image" :src="`/uploads/${tab.image}`" class="am-img-prev">
        </div>

        <!-- groups -->
        <div v-for="(grp, gi) in tab.groups" :key="gi" class="am-group">
          <div class="am-row" style="margin-bottom:6px">
            <label class="am-lbl" style="width:60px">группа:</label>
            <input v-model="grp.label" class="am-inp" type="text" @input="markDirty">
            <button class="am-btn-sm danger" @click="delGroup(ti, gi)">×</button>
          </div>
          <div v-for="(item, ii) in grp.items" :key="ii" class="am-row" style="padding-left:20px">
            <input v-model="item.text" class="am-inp" type="text" @input="markDirty">
            <select v-model="item.type" class="am-select" @change="markDirty">
              <option value="select">выбор</option>
              <option value="number">число</option>
              <option value="yesno">да/нет</option>
              <option value="text">текст</option>
            </select>
            <button class="am-btn-sm danger" @click="delItem(ti, gi, ii)">×</button>
          </div>
          <button class="am-btn-add" @click="addItem(ti, gi)">+ пункт</button>
        </div>

        <button class="am-btn-add" @click="addGroup(ti)">+ группа</button>
        <div style="text-align:right;margin-top:8px">
          <button class="am-btn-sm danger" @click="delTab(ti)">удалить вкладку</button>
        </div>
      </div>

      <button class="am-btn-add" style="margin-bottom:12px" @click="addTab">+ новая вкладка</button>

      <div class="am-actions">
        <p v-if="error" style="color:#c00;font-size:.8rem;margin-right:auto">{{ error }}</p>
        <button class="a-btn-save" :disabled="saving" @click="save">{{ saving ? '...' : 'сохранить' }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string; page: string }>()

interface Item { text: string; type: string }
interface Group { label: string; items: Item[] }
interface Tab { id: string; title: string; heading: string; image: string; groups: Group[] }

const { data: raw, pending, refresh } = await useFetch<any>(
  () => `/api/projects/${props.slug}/page-content?page=${props.page}`, { server: false }
)

const tabs = ref<Tab[]>([])
const saving = ref(false)
const error = ref('')
const dirty = ref(false)

function markDirty() { dirty.value = true }

watch(raw, (v) => {
  const c = v?.content ?? v ?? {}
  if (Array.isArray(c?.tabs)) {
    tabs.value = JSON.parse(JSON.stringify(c.tabs))
  } else {
    tabs.value = []
  }
}, { immediate: true })

watch(() => props.page, () => { refresh() })

function addTab() {
  tabs.value.push({ id: `tab_${Date.now()}`, title: 'новая вкладка', heading: '', image: '', groups: [] })
  markDirty()
}
function delTab(ti: number) {
  tabs.value.splice(ti, 1)
  markDirty()
}
function addGroup(ti: number) {
  tabs.value[ti].groups.push({ label: 'новая группа', items: [] })
  markDirty()
}
function delGroup(ti: number, gi: number) {
  tabs.value[ti].groups.splice(gi, 1)
  markDirty()
}
function addItem(ti: number, gi: number) {
  tabs.value[ti].groups[gi].items.push({ text: 'новый пункт', type: 'select' })
  markDirty()
}
function delItem(ti: number, gi: number, ii: number) {
  tabs.value[ti].groups[gi].items.splice(ii, 1)
  markDirty()
}

async function uploadTabImg(e: Event, ti: number) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await $fetch<{ filename: string }>('/api/upload', { method: 'POST', body: fd })
    tabs.value[ti].image = res.filename
    markDirty()
  } catch { error.value = 'Ошибка загрузки' }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/page-content`, {
      method: 'PUT',
      body: { pageSlug: props.page, content: { tabs: tabs.value } }
    })
    dirty.value = false
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.am-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #1a1a1a;
  padding: 20px;
  margin-bottom: 16px;
}
.am-card-label {
  font-size: .9rem;
  font-weight: 400;
  color: #888;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 12px;
}
.am-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.am-lbl {
  font-size: .78rem;
  color: #888;
  width: 80px;
  flex-shrink: 0;
}
.am-inp {
  flex: 1;
  border: none;
  border-bottom: 1px solid #ddd;
  padding: 6px 0;
  font-size: .88rem;
  outline: none;
  font-family: inherit;
  background: transparent;
}
.am-inp:focus { border-bottom-color: #1a1a1a; }
.am-select {
  border: 1px solid #ddd;
  padding: 4px 8px;
  font-size: .82rem;
  font-family: inherit;
  outline: none;
  background: #fff;
}
.am-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.am-btn-upload {
  border: 1px solid #1a1a1a;
  background: transparent;
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
  white-space: nowrap;
}
.am-btn-upload:hover { background: #1a1a1a; color: #fff; }
.am-img-prev {
  max-width: 120px;
  max-height: 90px;
  object-fit: cover;
  border: 1px solid #ddd;
  border-radius: 2px;
}
.am-group {
  margin: 12px 0 8px;
  padding: 10px;
  border: 1px solid #eee;
}
.am-btn-sm {
  border: 1px solid #ddd;
  background: transparent;
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
}
.am-btn-sm:hover { border-color: #1a1a1a; }
.am-btn-sm.danger { color: #c00; border-color: #c00; }
.am-btn-sm.danger:hover { background: #c00; color: #fff; }
.am-btn-add {
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
.am-btn-add:hover { border-color: #1a1a1a; color: #1a1a1a; }
.am-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  margin-top: 20px;
}
</style>
