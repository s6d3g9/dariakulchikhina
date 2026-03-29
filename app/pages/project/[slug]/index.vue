<template>
  <div />
</template>

<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

if (!slug.value) {
  await navigateTo('/login?role=client', { replace: true, redirectCode: 301 })
} else {
  await navigateTo(`/client/${encodeURIComponent(slug.value)}`, { replace: true, redirectCode: 301 })
}
</script>