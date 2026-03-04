<template>
  <div>
    <div v-if="selectedDesignerId" class="ent-cabinet-wrap">
      <div class="ent-cabinet-topbar">
        <button class="ent-back-btn a-btn-sm" @click="selectedDesignerId = null">← к списку</button>
        <span v-if="selectedDesigner" class="ent-cabinet-title">{{ selectedDesigner.name }}</span>
        <div class="ent-cabinet-actions">
          <button v-if="selectedDesigner" class="a-btn-sm a-btn-danger" @click="deleteDesigner(selectedDesigner.id)">× удалить</button>
        </div>
      </div>
      <AdminDesignerCabinet :designer-id="selectedDesignerId" />
    </div>

    <div v-else class="ent-layout ent-layout--with-stats">
      <nav class="ent-sidebar std-sidenav">
        <div class="ent-sidebar-head">
          <span class="ent-sidebar-title">дизайнеры</span>
          <span class="ent-sidebar-count">{{ allDesigners?.length ?? 0 }}</span>
        </div>
        <input v-model="searchQuery" class="ent-search glass-input" placeholder="поиск..." />
        <div class="std-nav">
          <template v-if="pending">
            <div class="ent-nav-skeleton" v-for="i in 3" :key="i" />
          </template>
          <template v-else>
            <button v-for="d in filteredDesigners" :key="d.id" class="ent-nav-item" :class="{ 'ent-nav-item--active': selectedDesignerId === d.id }" @click="selectedDesignerId = d.id">
              <span class="ent-nav-avatar">{{ d.name?.charAt(0)?.toUpperCase() || '?' }}</span>
              <span class="ent-nav-name">{{ d.name }}<span v-if="d.city" class="ent-nav-sub">{{ d.city }}</span></span>
            </button>
            <div v-if="!filteredDesigners.length && searchQuery" class="ent-nav-empty">ничего не найдено</div>
            <div v-else-if="!allDesigners?.length" class="ent-nav-empty">нет дизайнеров</div>
          </template>
        </div>
        <div class="ent-sidebar-foot"><button class="ent-sidebar-add a-btn-sm" @click="showCreate = true">+ добавить</button></div>
      </nav>

      <div class="ent-main">
        <div v-if="showCreate" class="ent-detail-card glass-card" style="margin-bottom:14px">
          <div class="ent-detail-head">
            <div class="ent-detail-name">Новый дизайнер</div>
            <button class="a-btn-sm" @click="showCreate = false">✕</button>
          </div>
          <input v-model="newName" class="glass-input ds-create-inp" placeholder="Имя / Студия" @keydown.enter="doCreate" />
          <div class="ent-detail-foot">
            <button class="a-btn-save" :disabled="!newName.trim() || creating" @click="doCreate">{{ creating ? '…' : 'создать' }}</button>
            <button class="a-btn-sm" @click="showCreate = false">отмена</button>
          </div>
        </div>

        <div v-else class="ent-empty-detail">
          <span class="ent-empty-icon">🎨</span>
          <span v-if="allDesigners?.length">Выберите дизайнера из списка</span>
          <span v-else>Нет дизайнеров — добавьте первого</span>
          <button v-if="!allDesigners?.length" class="a-btn-sm" style="margin-top:6px" @click="showCreate = true">+ добавить первого</button>
        </div>
      </div>

      <!-- ═══ Status bar ═══ -->
      <AdminProjectStatusBar />
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const { data: allDesigners, pending, refresh } = useFetch<any[]>('/api/designers', { default: () => [] })

const searchQuery = ref('')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const route = useRoute()
const router = useRouter()
const selectedDesignerId = ref<number | null>(null)

// Deselect when layout sends "все дизайнеры" signal
const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)
watch(entityDeselectSignal, () => { selectedDesignerId.value = null })

const selectedDesigner = computed(() => allDesigners.value?.find((d: any) => d.id === selectedDesignerId.value) || null)

// Auto-select designer from ?designerId= query
const designerIdFromQuery = computed(() => {
  const v = route.query.designerId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applyDesignerIdQuery() {
  const qid = designerIdFromQuery.value
  if (qid && allDesigners.value?.length) {
    const found = allDesigners.value.find((d: any) => d.id === qid)
    if (found) selectedDesignerId.value = found.id
    router.replace({ query: { ...route.query, designerId: undefined } })
  }
}
watch(() => allDesigners.value, () => applyDesignerIdQuery(), { immediate: true })
watch(designerIdFromQuery, () => applyDesignerIdQuery())

const filteredDesigners = computed(() => {
  if (!searchQuery.value) return allDesigners.value
  const q = searchQuery.value.toLowerCase()
  return allDesigners.value.filter((d: any) =>
    d.name?.toLowerCase().includes(q) || d.city?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q)
  )
})

async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await $fetch('/api/designers', { method: 'POST', body: { name: newName.value.trim() } })
    await refresh(); newName.value = ''; showCreate.value = false
  } finally { creating.value = false }
}

async function deleteDesigner(id: number) {
  if (!confirm('Удалить дизайнера?')) return
  await $fetch(`/api/designers/${id}`, { method: 'DELETE' })
  if (selectedDesignerId.value === id) selectedDesignerId.value = null
  await refresh()
}
</script>

<style scoped>
.ds-create-inp { width: 100%; margin-bottom: 12px; }
</style>
