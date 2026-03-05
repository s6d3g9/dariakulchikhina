<template>
  <Teleport v-if="sidebarActive" to="#admin-sidebar-portal">
      <!-- ── Layer 1: designer list ── -->
      <template v-if="!selectedDesignerId">
        <AdminSidebarSwitcher title="дизайнеры" :count="allDesigners?.length ?? 0">
          <input v-model="searchQuery" class="ent-search glass-input" placeholder="поиск..." />
          <div class="std-nav">
            <template v-if="pending">
              <div class="ent-nav-skeleton" v-for="i in 3" :key="i" />
            </template>
            <template v-else>
              <button v-for="d in filteredDesigners" :key="d.id" class="ent-nav-item" :class="{ 'ent-nav-item--active': selectedDesignerId === d.id }" @click="selectDesigner(d)">{{ d.name }}</button>
              <div v-if="!filteredDesigners.length && searchQuery" class="ent-nav-empty">ничего не найдено</div>
              <div v-else-if="!allDesigners?.length" class="ent-nav-empty">нет дизайнеров</div>
            </template>
          </div>
        </AdminSidebarSwitcher>
      </template>

      <!-- ── Layer 2: section nav ── -->
      <template v-else>
        <AdminSidebarSwitcher title="дизайнеры">
          <button class="ent-back-btn" @click="selectedDesignerId = null; pageSection = 'dashboard'">← все дизайнеры</button>
          <div class="ent-layer2-name">{{ selectedDesigner?.name }}</div>
          <div class="std-nav">
          <button
            v-for="item in DESIGNER_NAV"
            :key="item.key"
            class="ent-nav-item std-nav-item"
            :class="{ 'ent-nav-item--active': pageSection === item.key }"
            @click="pageSection = item.key"
          >{{ item.label }}</button>
        </div>
        </AdminSidebarSwitcher>
      </template>
  </Teleport>

    <div>
      <Transition name="tab-fade" mode="out-in">
      <AdminDesignerCabinet
        v-if="selectedDesignerId"
        :key="selectedDesignerId"
        :designer-id="selectedDesignerId"
        hide-nav
        :model-section="pageSection"
        @update:section="pageSection = $event"
      />
      <div v-else-if="showCreate" class="ent-detail-card glass-card" style="margin-bottom:14px">
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
      </Transition>
    </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })
const sidebarActive = useSidebarActive()

const { data: allDesigners, pending, refresh } = useFetch<any[]>('/api/designers', { default: () => [] })

const searchQuery = ref('')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const route = useRoute()
const router = useRouter()
const selectedDesignerId = ref<number | null>(null)
const pageSection = ref('dashboard')
function selectDesigner(d: any) { selectedDesignerId.value = d.id; pageSection.value = 'dashboard' }

const DESIGNER_NAV = [
  { key: 'dashboard',     icon: '◈', label: 'Обзор' },
  { key: 'services',      icon: '◎', label: 'Услуги и цены' },
  { key: 'packages',      icon: '◑', label: 'Пакеты' },
  { key: 'subscriptions', icon: '⟳', label: 'Подписки' },
  { key: 'documents',     icon: '◓', label: 'Документы' },
  { key: 'projects',      icon: '◒', label: 'Проекты' },
  { key: 'profile',       icon: '◐', label: 'Профиль' },
]

// Deselect when layout sends "все дизайнеры" signal
const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)
watch(entityDeselectSignal, () => { selectedDesignerId.value = null; pageSection.value = 'dashboard' })

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
