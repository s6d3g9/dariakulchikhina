<template>
  <AdminProjectControl :slug="slug" />
</template>

<script setup lang="ts">
import AdminProjectControl from '~/widgets/projects/control/AdminProjectControl.vue'

defineProps<{ slug: string }>()
</script>
