<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MessengerPlatformProjectSummary } from '../../model/useMessengerProjectActions'

defineProps<{
  projects: MessengerPlatformProjectSummary[]
  selectedSlug: string
  pending: boolean
  error: string
  notice: string
}>()

const emit = defineEmits<{
  select: [slug: string]
}>()

const projectSearch = ref('')

const normalizedProjectSearch = computed(() => projectSearch.value.trim().toLowerCase())

const filteredProjectItems = computed(() => {
  const query = normalizedProjectSearch.value
  const projects = !query
    ? [...props.projects]
    : props.projects.filter(project => projectMatchesSearch(project, query))

  return projects.sort((left, right) => {
    const leftSelected = Number(left.slug === props.selectedSlug)
    const rightSelected = Number(right.slug === props.selectedSlug)
    if (leftSelected !== rightSelected) {
      return rightSelected - leftSelected
    }

    return left.title.localeCompare(right.title, 'ru')
  })
})

function matchesText(value: string | undefined, query: string) {
  if (!query) {
    return true
  }

  return value?.toLowerCase().includes(query) || false
}

function projectMatchesSearch(project: MessengerPlatformProjectSummary, query: string) {
  return [
    project.title,
    project.slug,
    project.status,
    project.projectType,
    project.activePhaseTitle,
    project.activeSprintName,
  ].some(value => matchesText(value, query))
}

function buildProjectPickerMeta(project: MessengerPlatformProjectSummary) {
  return [
    project.slug,
    project.status,
    project.activePhaseTitle,
    project.activeSprintName,
    project.taskTotal ? formatCountLabel(project.taskTotal, 'задача', 'задачи', 'задач') : '',
  ].filter(Boolean).join(' · ')
}

function formatCountLabel(count: number, singular: string, paucal: string, plural: string) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} ${singular}`
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${paucal}`
  }

  return `${count} ${plural}`
}
</script>

<template>
  <section class="pa-pane pa-pane--project">
    <div class="pa-pane__head">
      <span class="pa-pane__title">Проект</span>
    </div>

    <VTextField
      v-model="projectSearch"
      class="pa-search-field"
      variant="solo-filled"
      density="comfortable"
      flat
      clearable
      hide-details
      bg-color="surface-container-highest"
      prepend-inner-icon="mdi-magnify"
      label="Поиск проекта"
      placeholder="Название, slug, фаза, статус"
    />

    <div v-if="!pending && filteredProjectItems.length" class="pa-project-list">
      <button
        v-for="project in filteredProjectItems"
        :key="project.slug"
        type="button"
        class="pa-project-card"
        :class="{ 'pa-project-card--active': project.slug === selectedSlug }"
        @click="emit('select', project.slug)"
      >
        <div class="pa-project-card__head">
          <span class="pa-project-card__title">{{ project.title }}</span>
          <span v-if="project.slug === selectedSlug" class="pa-project-card__badge">выбран</span>
        </div>
        <span class="pa-project-card__meta">{{ buildProjectPickerMeta(project) }}</span>
      </button>
    </div>

    <p v-if="error" class="pa-state pa-state--error">{{ error }}</p>
    <p v-else-if="notice" class="pa-state pa-state--muted">{{ notice }}</p>
    <p v-else-if="pending" class="pa-state pa-state--muted">Загружаю список проектов…</p>
    <p v-else-if="!filteredProjectItems.length" class="pa-empty-state">По этому запросу проекты не найдены.</p>
  </section>
</template>

<style scoped>
.pa-pane {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  background: rgb(var(--v-theme-surface-container-high));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.pa-pane__head {
  display: grid;
  gap: 2px;
}

.pa-pane__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-search-field {
  margin: 0;
}

.pa-project-list {
  display: grid;
  gap: 8px;
}

.pa-project-card {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  text-align: left;
}

.pa-project-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-project-card__title {
  font-size: 13px;
  font-weight: 700;
}

.pa-project-card__meta {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-project-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pa-project-card--active {
  border-color: rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.08);
}

.pa-empty-state,
.pa-state {
  font-size: 13px;
  line-height: 1.5;
}

.pa-state--muted,
.pa-empty-state {
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-state--error {
  color: rgb(var(--v-theme-error));
}
</style>
