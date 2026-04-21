<script setup lang="ts">
import type { MessengerProject } from '../../entities/projects/model/useMessengerProjects'

const props = defineProps<{
  projectSlug: string
}>()

const emit = defineEmits<{
  back: []
}>()

const projects = useMessengerProjects()
const api = useProjectsApi()

const project = ref<MessengerProject | null>(null)
const pending = ref(false)
const notFound = ref(false)

onMounted(async () => {
  const cached = projects.findBySlug(props.projectSlug)
  if (cached) {
    project.value = cached
    return
  }

  pending.value = true
  try {
    const response = await api.getProject(props.projectSlug)
    project.value = response.project
  }
  catch {
    notFound.value = true
  }
  finally {
    pending.value = false
  }
})
</script>

<template>
  <div class="project-workspace">
    <!-- Header -->
    <header class="project-workspace__header">
      <VBtn
        icon
        variant="text"
        size="small"
        aria-label="Назад к проектам"
        @click="emit('back')"
      >
        <VIcon>mdi-arrow-left</VIcon>
      </VBtn>

      <div v-if="project" class="project-workspace__header-info">
        <VIcon size="18" class="mr-1" color="secondary">mdi-folder-outline</VIcon>
        <span class="project-workspace__header-name">{{ project.name }}</span>
      </div>

      <VSkeleton v-else-if="pending" type="text" width="160" class="ml-2" />
    </header>

    <!-- Loading -->
    <div v-if="pending" class="project-workspace__center">
      <MessengerProgressCircular indeterminate four-color size="lg" aria-label="Загрузка проекта" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="project-workspace__center">
      <VIcon size="48" class="mb-3" color="error">mdi-folder-remove-outline</VIcon>
      <p class="project-workspace__not-found">Проект не найден</p>
      <VBtn variant="tonal" class="mt-4" @click="emit('back')">
        Вернуться к списку
      </VBtn>
    </div>

    <!-- Workspace tabs -->
    <div v-else-if="project" class="project-workspace__content">
      <ProjectConfigTabs :project="project" />
    </div>
  </div>
</template>

<style scoped>
.project-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  min-height: 0;
}

.project-workspace__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.project-workspace__header-info {
  display: flex;
  align-items: center;
  min-width: 0;
}

.project-workspace__header-name {
  font-size: 1rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-workspace__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 32px 16px;
  text-align: center;
}

.project-workspace__not-found {
  font-size: 1rem;
  opacity: 0.7;
  margin: 0;
}

.project-workspace__content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
