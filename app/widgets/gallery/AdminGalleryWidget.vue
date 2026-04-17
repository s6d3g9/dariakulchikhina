<template>
  <AdminGallery :category="category" :title="title" />
</template>

<script setup lang="ts">
import AdminGallery from '~/widgets/gallery/AdminGallery.vue'

defineProps<{
  category: string
  title: string
}>()
</script>
