<script setup lang="ts">
definePageMeta({ path: '/projects/by-id/:projectId' })

const auth = useMessengerAuth()
const route = useRoute()
const projectId = computed(() => route.params.projectId as string)

const api = useProjectsApi()
const project = ref(null)
const pending = ref(true)

onMounted(async () => {
  await auth.hydrate()
  if (!auth.user.value) {
    await navigateTo('/login', { replace: true })
    return
  }
  try {
    const res = await api.getProject(projectId.value)
    project.value = res.project
  } catch {
    await navigateTo('/projects', { replace: true })
    return
  } finally {
    pending.value = false
  }
})
</script>

<template>
  <VApp>
    <div v-if="pending" class="loading-shell">
      <MessengerProgressCircular indeterminate four-color size="lg" />
    </div>
    <MessengerProjectWorkspace
      v-else-if="project"
      :project-slug="(project as any).slug"
      @back="navigateTo('/projects')"
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
