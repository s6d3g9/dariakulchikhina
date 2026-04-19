<script setup lang="ts">
const auth = useMessengerAuth()
const router = useRouter()
const ready = ref(false)

onMounted(async () => {
  await auth.hydrate()
  ready.value = true

  if (!auth.user.value) {
    await navigateTo('/login')
  }
})

async function openProject(slug: string) {
  await router.push(`/projects/${slug}`)
}
</script>

<template>
  <VApp>
    <div v-if="!ready" class="loading-shell">
      <MessengerProgressCircular class="loading-shell__ring" aria-label="Загрузка" indeterminate four-color size="lg" />
    </div>
    <MessengerProjectsShell v-else-if="auth.user.value" @open="openProject" />
  </VApp>
</template>

<style scoped>
.loading-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>
