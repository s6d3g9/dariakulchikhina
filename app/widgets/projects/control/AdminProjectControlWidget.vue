<template>
  <AdminProjectControl :slug="slug" />
</template>

<script setup lang="ts">
import AdminProjectControl from '~/components/AdminProjectControl.vue'

defineProps<{ slug: string }>()
</script>
