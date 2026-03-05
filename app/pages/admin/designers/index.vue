<template>
  <div>
    <div class="proj-content-area">
      <div class="proj-nav-col">

        <AdminNestedNav
          :node="currentNode"
          :direction="slideDir"
          :can-go-back="depth > 0"
          :back-label="depth > 0 ? nodes[depth - 1].title : ''"
          :active-key="activeKey"
          @back="onBack"
          @drill="onDrill"
          @select="onSelect"
        >
          <!-- Футер: кнопка добавить на слое дизайнеров -->
          <template v-if="depth === 1" #footer>
            <button class="ent-sidebar-add a-btn-sm" @click="showCreate = true">+ добавить</button>
          </template>
        </AdminNestedNav>

      </div><!-- /.proj-nav-col -->

      <div class="proj-main">

        <template v-if="selectedDesignerId">
          <AdminDesignerCabinet
            :key="selectedDesignerId"
            :designer-id="selectedDesignerId"
            v-model="activeSection"
          />
        </template>

        <div v-else-if="showCreate" class="ent-detail-card glass-card" style="margin-bottom:14px">
          <div class="ent-detail-head">
            <div class="ent-detail-name">Новый дизайнер</div>
            <button class="a-btn-sm" @click="showCreate = false">✕</button>
          </div>
          <input v-model="newName" class="glass-input ds-inp" placeholder="Имя / Студия" @keydown.enter="doCreate" />
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

        <AdminProjectStatusBar />
      </div>

    </div><!-- /.proj-content-area -->
  </div>
</template>

<script setup lang="ts">
import type { NavItem, NavNode } from '~/components/AdminNestedNav.vue'

definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

// ── Data ──
const { data: allDesigners, pending, refresh } = useFetch<any[]>('/api/designers', { default: () => [] })

// ── Entity state ──
const selectedDesignerId = ref<number | null>(null)
const activeSection = ref('dashboard')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const route = useRoute()
const router = useRouter()

const selectedDesigner = computed(() => allDesigners.value?.find((d: any) => d.id === selectedDesignerId.value) ?? null)

// ── Nav stack ──
// depth = текущий видимый уровень (0 = разделы, 1 = список, 2 = кабинет)
const depth = ref(1)
const slideDir = ref<'fwd' | 'back'>('fwd')

const ADMIN_ROUTES: Record<string, string> = {
  projects: '/admin',
  clients: '/admin/clients',
  contractors: '/admin/contractors',
  sellers: '/admin/sellers',
}

const DESIGNER_SECTIONS: NavItem[] = [
  { key: 'dashboard',     label: 'Обзор',        icon: '◈' },
  { key: 'services',      label: 'Услуги и цены', icon: '◎' },
  { key: 'packages',      label: 'Пакеты',        icon: '◑' },
  { key: 'subscriptions', label: 'Подписки',      icon: '⟳' },
  { key: 'documents',     label: 'Документы',     icon: '📎' },
  { key: 'projects',      label: 'Проекты',       icon: '◒' },
  { key: 'profile',       label: 'Профиль',       icon: '◓' },
]

// Узлы: каждый уровень — отдельный NavNode
// nodes[0] = разделы, nodes[1] = дизайнеры, nodes[2] = кабинет дизайнера
const nodes = computed((): NavNode[] => {
  const list: NavNode[] = [
    // ── Узел 0: тип раздела (разделы) ──
    {
      key: 'root',
      title: 'разделы',
      items: [
        { key: 'projects',    label: 'проекты',     icon: '◈', isNode: true },
        { key: 'clients',     label: 'клиенты',     icon: '◐', isNode: true },
        { key: 'contractors', label: 'подрядчики',  icon: '◒', isNode: true },
        { key: 'designers',   label: 'дизайнеры',   icon: '◓', isNode: true },
        { key: 'sellers',     label: 'продавцы',    icon: '◑', isNode: true },
      ],
    },
    // ── Узел 1: конкретный дизайнер из списка ──
    {
      key: 'designers',
      title: 'дизайнеры',
      count: allDesigners.value?.length,
      emptyText: 'нет дизайнеров',
      items: (allDesigners.value ?? []).map((d: any) => ({
        key: String(d.id),
        label: d.name,
        sub: d.city,
        isNode: true,
      })),
    },
  ]

  // ── Узел 2: кабинет дизайнера (секции) ──
  if (selectedDesigner.value) {
    list.push({
      key: 'designer-' + selectedDesignerId.value,
      title: selectedDesigner.value.name,
      count: DESIGNER_SECTIONS.length,
      items: DESIGNER_SECTIONS,
    })
  }

  return list
})

const currentNode = computed(() => nodes.value[depth.value] ?? nodes.value[nodes.value.length - 1])

// Активный ключ: на слое 1 = id выбранного дизайнера, на слое 2 = текущая секция
const activeKey = computed(() => {
  if (depth.value === 1) return selectedDesignerId.value ? String(selectedDesignerId.value) : undefined
  if (depth.value === 2) return activeSection.value
  return undefined
})

// ── Nav events ──
function onDrill(item: NavItem) {
  // Слой 0 → навигация по разделам
  if (depth.value === 0) {
    if (item.key === 'designers') {
      // Уже на этой странице — провалиться в список
      slideDir.value = 'fwd'
      depth.value = 1
    } else if (ADMIN_ROUTES[item.key]) {
      router.push(ADMIN_ROUTES[item.key])
    }
    return
  }
  // Слой 1 → выбрать дизайнера и провалиться в его кабинет
  if (depth.value === 1) {
    const d = allDesigners.value?.find((x: any) => String(x.id) === item.key)
    if (d) {
      selectedDesignerId.value = d.id
      activeSection.value = 'dashboard'
      slideDir.value = 'fwd'
      depth.value = 2
    }
  }
}

function onSelect(item: NavItem) {
  // Слой 2 → выбрать секцию в кабинете (лист)
  if (depth.value === 2) {
    activeSection.value = item.key
  }
}

function onBack() {
  slideDir.value = 'back'
  if (depth.value === 2) {
    depth.value = 1
    // Не сбрасываем selectedDesignerId — кабинет остаётся открытым в main
  } else if (depth.value === 1) {
    depth.value = 0
  }
}

// Сигнал «показать всех» от layout
const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)
watch(entityDeselectSignal, () => {
  selectedDesignerId.value = null
  slideDir.value = 'back'
  depth.value = 1
})

// Auto-select from ?designerId= query
function applyQuery() {
  const v = route.query.designerId
  const qid = typeof v === 'string' ? parseInt(v, 10) : null
  if (qid && allDesigners.value?.length) {
    const found = allDesigners.value.find((d: any) => d.id === qid)
    if (found) {
      selectedDesignerId.value = found.id
      slideDir.value = 'fwd'
      depth.value = 2
    }
    router.replace({ query: { ...route.query, designerId: undefined } })
  }
}
watch(() => allDesigners.value, applyQuery, { immediate: true })

// ── Pending list state ──
const isPending = computed(() => pending.value && !allDesigners.value?.length)

// ── Create ──
async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const created = await $fetch<any>('/api/designers', {
      method: 'POST', body: { name: newName.value.trim() }
    })
    await refresh()
    newName.value = ''; showCreate.value = false
    if (created?.id) {
      selectedDesignerId.value = created.id
      activeSection.value = 'dashboard'
      slideDir.value = 'fwd'
      depth.value = 2
    }
  } finally { creating.value = false }
}
</script>

<style scoped>
.ds-inp { width: 100%; margin-bottom: 12px; }
</style>
