<script setup lang="ts">
import type { MessengerProject } from '../model/useMessengerProjects'

defineProps<{
  project: MessengerProject
}>()

defineEmits<{
  click: []
}>()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <VCard
    class="messenger-project-card"
    color="surface-variant"
    variant="tonal"
    hover
    @click="$emit('click')"
  >
    <VCardText class="messenger-project-card__body">
      <div class="messenger-project-card__head">
        <VIcon class="messenger-project-card__icon" size="20">mdi-folder-outline</VIcon>
        <span class="messenger-project-card__name">{{ project.name }}</span>
      </div>
      <p v-if="project.description" class="messenger-project-card__desc">
        {{ project.description }}
      </p>
      <p class="messenger-project-card__meta">
        Создан {{ formatDate(project.createdAt) }}
      </p>
    </VCardText>
  </VCard>
</template>

<style scoped>
.messenger-project-card {
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.messenger-project-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.messenger-project-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.messenger-project-card__icon {
  opacity: 0.7;
  flex-shrink: 0;
}

.messenger-project-card__name {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.messenger-project-card__desc {
  font-size: 0.875rem;
  opacity: 0.75;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.messenger-project-card__meta {
  font-size: 0.75rem;
  opacity: 0.5;
  margin: 0;
}
</style>
