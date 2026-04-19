<script setup lang="ts">
const emit = defineEmits<{
  open: [slug: string]
}>()

const projects = useMessengerProjects()
const createDialog = useProjectCreate()
const bootstrapOnFirstProject = useState('messenger-bootstrap-on-arrival', () => false)

onMounted(() => {
  void projects.refresh()
})

async function handleCreated(slug: string) {
  if (projects.projects.value.length === 1) {
    bootstrapOnFirstProject.value = true
  }
  emit('open', slug)
}
</script>

<template>
  <div class="projects-shell">
    <header class="projects-shell__header">
      <div class="projects-shell__header-content">
        <h1 class="projects-shell__title">Проекты</h1>
        <VBtn
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-plus"
          @click="createDialog.show()"
        >
          Новый проект
        </VBtn>
      </div>
    </header>

    <div class="projects-shell__body">
      <!-- Loading -->
      <div v-if="projects.pending.value && !projects.projects.value.length" class="projects-shell__loading">
        <MessengerProgressCircular indeterminate four-color size="lg" aria-label="Загрузка проектов" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!projects.pending.value && !projects.projects.value.length"
        class="projects-shell__empty"
      >
        <VIcon size="64" class="mb-4" color="secondary">mdi-folder-open-outline</VIcon>
        <p class="projects-shell__empty-title">Проектов пока нет</p>
        <p class="projects-shell__empty-hint">
          Создайте первый проект, чтобы организовать агентов и инструменты.
        </p>
        <VBtn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          class="mt-4"
          @click="createDialog.show()"
        >
          Создать проект
        </VBtn>
      </div>

      <!-- Project grid -->
      <div v-else class="projects-shell__grid">
        <MessengerProjectCard
          v-for="project in projects.projects.value"
          :key="project.id"
          :project="project"
          @click="emit('open', project.slug)"
        />
      </div>

      <!-- Load more -->
      <div v-if="projects.hasMore.value" class="projects-shell__load-more">
        <VBtn
          variant="tonal"
          :loading="projects.pending.value"
          @click="projects.loadMore()"
        >
          Загрузить ещё
        </VBtn>
      </div>
    </div>

    <ProjectCreateDialog @created="handleCreated" />
  </div>
</template>

<style scoped>
.projects-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.projects-shell__header {
  flex-shrink: 0;
  padding: 16px 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
}

.projects-shell__header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.projects-shell__title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.projects-shell__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.projects-shell__loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.projects-shell__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 16px;
}

.projects-shell__empty-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.projects-shell__empty-hint {
  font-size: 0.875rem;
  opacity: 0.6;
  margin: 8px 0 0;
  max-width: 320px;
}

.projects-shell__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.projects-shell__load-more {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
</style>
