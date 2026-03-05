<!-- Permanent redirect: /client/login → /project/login -->
<script setup lang="ts">
definePageMeta({
  middleware: [() => navigateTo('/project/login', { redirectCode: 301 })]
})
</script>
<template><div /></template>
