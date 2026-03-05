<template>
  <div>
    <div class="proj-content-area">

      <div class="proj-nav-col">
        <AdminNestedNav
          :node="currentNode"
          :direction="slideDir"
          :can-go-back="navDepth > 0"
          :back-label="navDepth > 0 ? 'разделы' : ''"
          :active-key="navDepth === 1 ? activeCategory : undefined"
          @back="onBack"
          @drill="onDrill"
          @select="onSelect"
        />
      </div><!-- /.proj-nav-col -->

      <div class="proj-main">
        <template v-if="activeCategory">
          <AdminGallery
            :key="activeCategory"
            :category="activeCategory"
            :title="GALLERY_ITEMS.find(g => g.key === activeCategory)?.title ?? activeCategory"
          />
        </template>
        <div v-else class="ent-empty-detail">
          <span class="ent-empty-icon">🖼</span>
          <span>Выберите раздел галереи</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { NavItem, NavNode } from '~/components/AdminNestedNav.vue'

definePageMeta({ layout: 'admin', middleware: 'admin', pageTransition: false })

const GALLERY_ITEMS = [
  { key: 'interiors',  icon: '◈', title: 'галерея интерьеров' },
  { key: 'furniture',  icon: '◐', title: 'галерея мебели' },
  { key: 'moodboards', icon: '◒', title: 'мудборды' },
  { key: 'materials',  icon: '◓', title: 'материалы' },
  { key: 'art',        icon: '◑', title: 'арт и декор' },
]

const ADMIN_ROUTES: Record<string, string> = {
  projects: '/admin', clients: '/admin/clients',
  contractors: '/admin/contractors', designers: '/admin/designers',
  sellers: '/admin/sellers', documents: '/admin/documents',
}

const navDepth = ref<0 | 1>(1)
const slideDir = ref<'fwd' | 'back'>('fwd')
const activeCategory = ref('interiors')

const currentNode = computed((): NavNode => navDepth.value === 0
  ? {
      key: 'root', title: 'разделы',
      items: [
        { key: 'projects',    icon: '◈', label: 'проекты',    isNode: true },
        { key: 'clients',     icon: '◐', label: 'клиенты',    isNode: true },
        { key: 'contractors', icon: '◒', label: 'подрядчики', isNode: true },
        { key: 'designers',   icon: '◓', label: 'дизайнеры',  isNode: true },
        { key: 'sellers',     icon: '◑', label: 'продавцы',   isNode: true },
        { key: 'documents',   icon: '○', label: 'документы',  isNode: true },
        { key: 'gallery',     icon: '◉', label: 'галерея',    isNode: true },
      ],
    }
  : {
      key: 'gallery',
      title: 'галерея',
      items: GALLERY_ITEMS.map(g => ({
        key: g.key,
        label: g.title,
        icon: g.icon,
      })),
    }
)

function onDrill(item: NavItem) {
  if (navDepth.value === 0) {
    if (item.key === 'gallery') { slideDir.value = 'fwd'; navDepth.value = 1 }
    else if (ADMIN_ROUTES[item.key]) navigateTo(ADMIN_ROUTES[item.key])
  }
}

function onSelect(item: NavItem) {
  activeCategory.value = item.key
}

function onBack() {
  slideDir.value = 'back'
  if (navDepth.value === 1) navDepth.value = 0
}
</script>
