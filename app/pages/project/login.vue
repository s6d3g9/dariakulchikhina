<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

await navigateTo('/login?role=client', { replace: true, redirectCode: 301 })
</script>
