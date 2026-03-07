<template>
  <div class="tasks-page">
    <div class="tasks-page-header">
      <h1 class="tasks-page-title">Задания</h1>
    </div>
    <AdminTaskList />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
.tasks-page { padding: 1.25rem 1.5rem; }
.tasks-page-header { margin-bottom: 1rem; }
.tasks-page-title { font-size: 1.3rem; font-weight: 700; margin: 0; }
</style>
