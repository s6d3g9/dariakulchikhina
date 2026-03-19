<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

await navigateTo('/login?role=contractor', { replace: true })
</script>
