<template>
    <!-- ── Sidebar ── -->
  <Teleport v-if="sidebarActive" to="#admin-sidebar-portal">
      <AdminSidebarSwitcher title="галерея">
        <div class="std-nav">
          <button
            v-for="tab in GALLERY_TABS"
            :key="tab.slug"
            class="ent-nav-item"
            :class="{ 'ent-nav-item--active': activeTab === tab.slug }"
            @click="activeTab = tab.slug"
          >{{ tab.label }}</button>
        </div>
      </AdminSidebarSwitcher>
  </Teleport>

    <!-- ── Content ── -->
    <div>
      <Transition name="tab-fade" mode="out-in">
        <AdminGallery :key="activeTab" :category="activeTab" :title="activeTitle" />
      </Transition>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const sidebarActive = useSidebarActive()

const GALLERY_TABS = [
  { slug: 'interiors',  label: 'интерьеры' },
  { slug: 'furniture',  label: 'мебель' },
  { slug: 'materials',  label: 'материалы' },
  { slug: 'art',        label: 'арт-объекты' },
  { slug: 'moodboards', label: 'мудборды' },
]

const route = useRoute()
const activeTab = ref((route.query.cat as string) || 'interiors')

const activeTitle = computed(
  () => GALLERY_TABS.find(t => t.slug === activeTab.value)?.label ?? 'галерея'
)

// sync with query param when navigated from outside
watch(() => route.query.cat, v => { if (v) activeTab.value = v as string })
</script>
