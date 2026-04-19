<script setup lang="ts">
import type { MessengerPlatformSprintOption } from '../../model/useMessengerProjectActions'

defineProps<{
  sprintOverviewItems: MessengerPlatformSprintOption[]
  selectedProjectLabel: string
  catalogPending: boolean
  catalogUnavailableMessage: string
  showPane: boolean
}>()

const emit = defineEmits<{
  openScopeDetail: [target: { scopeType: 'sprint'; scopeId: string }]
}>()

const sprintStatusLabels: Record<MessengerPlatformSprintOption['status'], string> = {
  planned: 'Запланирован',
  active: 'Активен',
  review: 'На ревью',
  done: 'Завершён',
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

function formatRangeLabel(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`
  }

  return startDate || endDate || 'Период не задан'
}

function openScopeDetailLocal(sprintId: string) {
  emit('openScopeDetail', { scopeType: 'sprint', scopeId: sprintId })
}
</script>

<template>
  <section v-if="showPane" class="pa-pane pa-pane--sprints">
    <div class="pa-pane__head">
      <span class="pa-pane__title">Спринты</span>
      <span class="pa-pane__value">{{ selectedProjectLabel }}</span>
    </div>

    <div v-if="!selectedProjectLabel.trim()" class="pa-empty-state">
      Сначала выберите проект.
    </div>

    <div v-else-if="catalogPending" class="pa-empty-state">
      Загружаю спринты проекта…
    </div>

    <div v-else-if="catalogUnavailableMessage" class="pa-state pa-state--error">
      {{ catalogUnavailableMessage }}
    </div>

    <div v-else-if="sprintOverviewItems.length" class="pa-sprint-list">
      <article
        v-for="sprint in sprintOverviewItems"
        :key="sprint.id"
        class="pa-sprint-card"
        :class="`pa-sprint-card--${sprint.status}`"
      >
        <div class="pa-sprint-card__head">
          <span class="pa-sprint-card__title">{{ sprint.name }}</span>
          <span class="pa-sprint-card__status">{{ sprintStatusLabels[sprint.status] }}</span>
        </div>

        <span class="pa-sprint-card__meta">{{ sprint.linkedPhaseTitle || 'Без связанного этапа' }}</span>
        <span class="pa-sprint-card__meta">{{ formatRangeLabel(sprint.startDate, sprint.endDate) }}</span>

        <p v-if="sprint.goal" class="pa-sprint-card__goal">{{ sprint.goal }}</p>

        <div class="pa-sprint-card__foot">
          <span>{{ formatCountLabel(sprint.taskCount, 'задача', 'задачи', 'задач') }}</span>
          <div class="pa-scope-item__actions">
            <span>{{ sprint.secondary }}</span>
            <VBtn color="primary" variant="text" size="small" @click="openScopeDetailLocal(sprint.id)">Контур</VBtn>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="pa-empty-state">
      В проекте пока нет спринтов.
    </div>
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

.pa-pane__value {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-sprint-list {
  display: grid;
  gap: 10px;
}

.pa-sprint-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.pa-sprint-card__head,
.pa-sprint-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-sprint-card__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-sprint-card__status,
.pa-sprint-card__meta,
.pa-sprint-card__foot {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-sprint-card__goal {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
}

.pa-sprint-card--active {
  border-color: rgba(var(--v-theme-primary), 0.26);
  background: rgba(var(--v-theme-primary), 0.08);
}

.pa-sprint-card--review {
  border-color: rgba(var(--v-theme-error), 0.24);
  background: rgba(var(--v-theme-error), 0.06);
}

.pa-sprint-card--done {
  border-color: rgba(var(--v-theme-secondary), 0.24);
  background: rgba(var(--v-theme-secondary), 0.08);
}

.pa-scope-item__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pa-empty-state,
.pa-state {
  font-size: 13px;
  line-height: 1.5;
}

.pa-state--error {
  color: rgb(var(--v-theme-error));
}

.pa-empty-state {
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
