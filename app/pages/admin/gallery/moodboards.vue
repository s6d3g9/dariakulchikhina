<template>
  <AdminGalleryWidget category="moodboards" title="галерея мудбордов" />
</template>
<script setup lang="ts">
import AdminGalleryWidget from '~/widgets/gallery/AdminGalleryWidget.vue'
definePageMeta({ layout: 'admin', middleware: 'admin', pageTransition: false })
</script>
