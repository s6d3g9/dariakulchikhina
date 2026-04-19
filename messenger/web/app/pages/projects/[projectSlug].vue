<script setup lang="ts">
const auth = useMessengerAuth()
const route = useRoute()
const router = useRouter()
const ready = ref(false)

const projectSlug = computed(() => {
  const val = route.params.projectSlug
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '')
})

onMounted(async () => {
  await auth.hydrate()
  ready.value = true

  if (!auth.user.value) {
    await navigateTo('/login')
  }
})

async function goBack() {
  await router.push('/projects')
}
</script>

<template>
  <VApp>
    <div v-if="!ready" class="loading-shell">
      <MessengerProgressCircular class="loading-shell__ring" aria-label="Загрузка" indeterminate four-color size="lg" />
    </div>
    <MessengerProjectWorkspace
      v-else-if="auth.user.value && projectSlug"
      :project-slug="projectSlug"
      @back="goBack"
    />
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
