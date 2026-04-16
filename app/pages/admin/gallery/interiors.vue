<template>
  <AdminGalleryWidget category="interiors" title="галерея интерьеров" />
</template>
<script setup lang="ts">
import AdminGalleryWidget from '~/widgets/gallery/AdminGalleryWidget.vue'
definePageMeta({ layout: 'admin', middleware: 'admin', pageTransition: false })
</script>
