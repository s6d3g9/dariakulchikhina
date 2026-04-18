<template>
  <div class="cpc-grid cpc-grid--summary">
    <section class="cpc-card">
      <p class="cpc-card__label">Текущая фаза</p>
      <h3 class="cpc-card__title">{{ summary.activePhase?.title || 'Фаза не определена' }}</h3>
      <p class="cpc-card__meta">Прогресс каркаса: {{ summary.phasePercent }}%</p>
    </section>
    <section class="cpc-card">
      <p class="cpc-card__label">Текущий спринт</p>
      <h3 class="cpc-card__title">{{ summary.activeSprint?.name || 'Спринт ещё не запущен' }}</h3>
      <p class="cpc-card__meta">Исполнение: {{ summary.doneTasks }} / {{ summary.totalTasks }} задач</p>
    </section>
    <section class="cpc-card">
      <p class="cpc-card__label">Следующий обзор</p>
      <h3 class="cpc-card__title">{{ nextReviewDate || 'Не назначен' }}</h3>
      <p class="cpc-card__meta">Следующая управленческая синхронизация</p>
    </section>
    <section class="cpc-card">
      <p class="cpc-card__label">Блокеры</p>
      <h3 class="cpc-card__title">{{ summary.blockerCount }}</h3>
      <p class="cpc-card__meta">Критических блокеров на текущий момент</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { buildHybridControlSummary } from '~~/shared/utils/project-control'

defineProps<{
  summary: ReturnType<typeof buildHybridControlSummary>
  nextReviewDate: string | null | undefined
}>()
</script>
