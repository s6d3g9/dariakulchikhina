<template>
  <AdminGalleryWidget category="materials" title="галерея материалов" />
</template>
<script setup lang="ts">
import AdminGalleryWidget from '~/widgets/gallery/AdminGalleryWidget.vue'
definePageMeta({ layout: 'admin', middleware: 'admin', pageTransition: false })
</script>
