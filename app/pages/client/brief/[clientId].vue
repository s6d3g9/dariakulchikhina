<template>
  <div class="brief-legacy-redirect">
    <p>Перенаправляем на страницу входа…</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

await navigateTo('/client/login', { replace: true })
</script>

<style scoped>
.brief-legacy-redirect {
  min-height: 40vh;
  display: grid;
  place-items: center;
  font-size: 14px;
}
</style>
