<!-- Permanent redirect: /client/[slug] → /project/[slug] -->
<script setup lang="ts">
definePageMeta({
  middleware: [(to) => navigateTo(`/project/${to.params.slug}`, { redirectCode: 301 })]
})
</script>
<template><div /></template>
