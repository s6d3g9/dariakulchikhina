<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

await navigateTo('/login?role=client', { replace: true })
</script>
