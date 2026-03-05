<template>
  <div>
    <div class="proj-content-area">

      <!-- ══ Unified 3-layer sidebar ══ -->
      <div class="proj-nav-col">
        <AdminNestedNav
          :depth="navDepth"
          :layer-data="layerData"
          :model-value="currentSearch"
          @update:model-value="onSearch"
          @back="onBack"
        >
          <!-- ─── Layer 0: section type grid ─── -->
          <template #layer0>
            <div class="ann-type-grid">
              <NuxtLink
                v-for="s in ADMIN_SECTIONS"
                :key="s.key"
                :to="s.to"
                class="ann-type-btn"
                :class="{ 'ann-type-btn--active': s.key === 'designers' }"
              >
                <span class="ann-type-icon">{{ s.icon }}</span>
                <span>{{ s.label }}</span>
              </NuxtLink>
            </div>
          </template>

          <!-- ─── Layer 1: designers list ─── -->
          <template #layer1>
            <div class="std-nav">
              <template v-if="pending">
                <div class="ent-nav-skeleton" v-for="i in 3" :key="i" />
              </template>
              <template v-else>
                <button
                  v-for="d in filteredDesigners"
                  :key="d.id"
                  class="ent-nav-item"
                  :class="{ 'ent-nav-item--active': selectedDesignerId === d.id }"
                  @click="selectDesigner(d)"
                >
                  <span class="ent-nav-avatar">{{ d.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                  <span class="ent-nav-name">
                    {{ d.name }}
                    <span v-if="d.city" class="ent-nav-sub">{{ d.city }}</span>
                  </span>
                  <span class="ent-nav-arrow">›</span>
                </button>
                <div v-if="!filteredDesigners.length && search1" class="ent-nav-empty">ничего не найдено</div>
                <div v-else-if="!allDesigners?.length" class="ent-nav-empty">нет дизайнеров</div>
              </template>
            </div>
          </template>
          <template #footer1>
            <button class="ent-sidebar-add a-btn-sm" @click="showCreate = true">+ добавить</button>
          </template>

          <!-- ─── Layer 2: designer cabinet sections ─── -->
          <template #layer2>
            <div class="std-nav">
              <button
                v-for="item in DESIGNER_SECTIONS"
                :key="item.key"
                class="ent-nav-item"
                :class="{ 'ent-nav-item--active': activeSection === item.key }"
                @click="activeSection = item.key"
              >
                <span class="ent-nav-icon-sm">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </template>

        </AdminNestedNav>
      </div>

      <!-- ══ Main content area ══ -->
      <div class="proj-main">

        <!-- Designer cabinet (sections content) -->
        <template v-if="selectedDesignerId">
          <AdminDesignerCabinet
            :key="selectedDesignerId"
            :designer-id="selectedDesignerId"
            v-model="activeSection"
          />
        </template>

        <!-- Create form -->
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

        <!-- Empty state -->
        <div v-else class="ent-empty-detail">
          <span class="ent-empty-icon">🎨</span>
          <span v-if="allDesigners?.length">Выберите дизайнера из списка</span>
          <span v-else>Нет дизайнеров — добавьте первого</span>
          <button v-if="!allDesigners?.length" class="a-btn-sm" style="margin-top:6px" @click="showCreate = true">+ добавить первого</button>
        </div>

        <!-- Status bar -->
        <AdminProjectStatusBar />
      </div>

    </div><!-- /.proj-content-area -->
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

// ── Constants ──
const ADMIN_SECTIONS = [
  { key: 'projects',     icon: '◈', label: 'проекты',     to: '/admin' },
  { key: 'clients',      icon: '◐', label: 'клиенты',     to: '/admin/clients' },
  { key: 'contractors',  icon: '◒', label: 'подрядчики',  to: '/admin/contractors' },
  { key: 'designers',    icon: '◓', label: 'дизайнеры',   to: '/admin/designers' },
  { key: 'sellers',      icon: '◑', label: 'продавцы',    to: '/admin/sellers' },
] as const

const DESIGNER_SECTIONS = [
  { key: 'dashboard',     icon: '◈', label: 'Обзор' },
  { key: 'services',      icon: '◎', label: 'Услуги и цены' },
  { key: 'packages',      icon: '◑', label: 'Пакеты' },
  { key: 'subscriptions', icon: '⟳', label: 'Подписки' },
  { key: 'documents',     icon: '📎', label: 'Документы' },
  { key: 'projects',      icon: '◒', label: 'Проекты' },
  { key: 'profile',       icon: '◓', label: 'Профиль' },
]

// ── Data ──
const { data: allDesigners, pending, refresh } = useFetch<any[]>('/api/designers', { default: () => [] })

// ── Nav state ──
const navDepth = ref<0 | 1 | 2>(1)
const search0 = ref('')
const search1 = ref('')
const search2 = ref('')

const currentSearch = computed(() => [search0.value, search1.value, search2.value][navDepth.value])

function onSearch(v: string) {
  if (navDepth.value === 0) search0.value = v
  else if (navDepth.value === 1) search1.value = v
  else search2.value = v
}

function onBack() {
  if (navDepth.value === 2) {
    navDepth.value = 1
  } else if (navDepth.value === 1) {
    navDepth.value = 0
  }
}

// ── Layer data for AdminNestedNav ──
const layerData = computed(() => [
  { title: 'разделы' },
  { title: 'дизайнеры', count: allDesigners.value?.length ?? 0, backLabel: 'разделы' },
  { title: selectedDesigner.value?.name ?? '\u2026', count: DESIGNER_SECTIONS.length, backLabel: 'дизайнеры' },
])

// ── Entity selection ──
const selectedDesignerId = ref<number | null>(null)
const activeSection = ref('dashboard')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const route = useRoute()
const router = useRouter()

const selectedDesigner = computed(() => allDesigners.value?.find((d: any) => d.id === selectedDesignerId.value) ?? null)

function selectDesigner(d: any) {
  selectedDesignerId.value = d.id
  activeSection.value = 'dashboard'
  navDepth.value = 2
}

// Deselect signal from layout
const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)
watch(entityDeselectSignal, () => {
  selectedDesignerId.value = null
  navDepth.value = 1
})

// Auto-select designer from ?designerId= query
const designerIdFromQuery = computed(() => {
  const v = route.query.designerId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applyDesignerIdQuery() {
  const qid = designerIdFromQuery.value
  if (qid && allDesigners.value?.length) {
    const found = allDesigners.value.find((d: any) => d.id === qid)
    if (found) { selectedDesignerId.value = found.id; navDepth.value = 2 }
    router.replace({ query: { ...route.query, designerId: undefined } })
  }
}
watch(() => allDesigners.value, () => applyDesignerIdQuery(), { immediate: true })
watch(designerIdFromQuery, () => applyDesignerIdQuery())

// ── Search filter ──
const filteredDesigners = computed(() => {
  if (!search1.value) return allDesigners.value
  const q = search1.value.toLowerCase()
  return allDesigners.value.filter((d: any) =>
    d.name?.toLowerCase().includes(q) || d.city?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q)
  )
})

// ── Create ──
async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const created = await $fetch<any>('/api/designers', { method: 'POST', body: { name: newName.value.trim() } })
    await refresh()
    newName.value = ''; showCreate.value = false
    if (created?.id) selectDesigner(created)
  } finally { creating.value = false }
}
</script>

<style scoped>
.ds-create-inp { width: 100%; margin-bottom: 12px; }
</style>
