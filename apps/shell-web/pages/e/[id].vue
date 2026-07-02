<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id)
</script>

<template>
  <main>
    <h1>Entity {{ id }}</h1>
  </main>
</template>
