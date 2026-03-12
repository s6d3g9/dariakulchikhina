<template>
  <div>
    <template v-if="activeCategory">
        <AdminGallery
          :key="activeCategory"
          :category="activeCategory"
          :title="GALLERY_ITEMS.find((g: any) => g.key === activeCategory)?.title ?? activeCategory"
        />
      </template>
      <div v-else class="ent-empty-detail">
        <span class="ent-empty-icon">🖼</span>
        <span>Выберите раздел галереи</span>
      </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin', pageTransition: false })

const GALLERY_ITEMS: { key: string; icon: string; title: string }[] = [
  { key: 'interiors',  icon: '◈', title: 'галерея интерьеров' },
  { key: 'furniture',  icon: '◐', title: 'галерея мебели' },
  { key: 'moodboards', icon: '◒', title: 'мудборды' },
  { key: 'materials',  icon: '◓', title: 'материалы' },
  { key: 'art',        icon: '◑', title: 'арт и декор' },
]

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('gallery'))
onActivated(() => adminNav.ensureSection('gallery'))

const activeCategory = computed(() => adminNav.contentSpec.value.galleryCategory || 'interiors')
</script>
