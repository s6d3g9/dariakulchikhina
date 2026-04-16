<template>
  <AdminGalleryWidget category="art" title="галерея арт-объектов" />
</template>
<script setup lang="ts">
import AdminGalleryWidget from '~/widgets/gallery/AdminGalleryWidget.vue'
definePageMeta({ layout: 'admin', middleware: 'admin', pageTransition: false })
</script>
