<template>
  <AdminSmartBrief :slug="slug" :client-mode="true" />
</template>

<script setup lang="ts">
defineProps<{ slug: string }>()
</script>
