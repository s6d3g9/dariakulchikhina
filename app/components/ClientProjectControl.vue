<template>
  <div class="cpc-root">
    <div class="cpc-hero">
      <div>
        <p class="cpc-eyebrow">Контроль проекта</p>
        <h2 class="cpc-title">Как проект ведётся и где находится сейчас</h2>
      </div>
      <span class="cpc-pill" :class="`cpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
    </div>

    <div class="cpc-grid">
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
        <h3 class="cpc-card__title">{{ control.nextReviewDate || 'Не назначен' }}</h3>
        <p class="cpc-card__meta">Следующая управленческая синхронизация</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Блокеры</p>
        <h3 class="cpc-card__title">{{ summary.blockerCount }}</h3>
        <p class="cpc-card__meta">Критических блокеров на текущий момент</p>
      </section>
    </div>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div class="cpc-section__title">Фазы проекта</div>
        <div class="cpc-section__meta">Фазовый каркас</div>
      </div>
      <div class="cpc-phase-list">
        <div v-for="phase in control.phases" :key="phase.id" class="cpc-phase-row">
          <div>
            <div class="cpc-phase-row__title">{{ phase.title }}</div>
            <div class="cpc-phase-row__meta">{{ phase.deliverable }}</div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip" :class="`cpc-chip--${phase.status}`">{{ phaseStatusLabels[phase.status] }}</span>
            <span class="cpc-phase-row__pct">{{ phase.percent || 0 }}%</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cpc-section" v-if="control.sprints.length">
      <div class="cpc-section__head">
        <div class="cpc-section__title">Активные циклы исполнения</div>
        <div class="cpc-section__meta">Спринтовый слой</div>
      </div>
      <div class="cpc-sprint-list">
        <div v-for="sprint in control.sprints" :key="sprint.id" class="cpc-sprint-row">
          <div>
            <div class="cpc-phase-row__title">{{ sprint.name }}</div>
            <div class="cpc-phase-row__meta">{{ sprint.goal || 'Цель спринта не заполнена' }}</div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip" :class="`cpc-chip--${sprint.status}`">{{ sprintStatusLabels[sprint.status] }}</span>
            <span class="cpc-phase-row__pct">{{ sprint.tasks.filter(task => task.status === 'done').length }} / {{ sprint.tasks.length }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div class="cpc-section__title">Контрольные точки</div>
        <div class="cpc-section__meta">Состояние проекта</div>
      </div>
      <div class="cpc-checkpoint-list">
        <div v-for="checkpoint in control.checkpoints" :key="checkpoint.id" class="cpc-checkpoint">
          <div>
            <div class="cpc-phase-row__title">{{ checkpoint.title }}</div>
            <div class="cpc-phase-row__meta">{{ checkpoint.note || 'Состояние без комментария' }}</div>
          </div>
          <span class="cpc-chip" :class="`cpc-chip--${checkpoint.status}`">{{ checkpointStatusLabels[checkpoint.status] }}</span>
        </div>
      </div>
    </section>

    <section v-if="control.blockers.length" class="cpc-section">
      <div class="cpc-section__head">
        <div class="cpc-section__title">Текущие блокеры</div>
        <div class="cpc-section__meta">Что мешает движению</div>
      </div>
      <div class="cpc-blocker-list">
        <div v-for="(blocker, index) in control.blockers" :key="`client-blocker-${index}`" class="cpc-blocker">
          {{ blocker }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { buildHybridControlSummary, ensureHybridControl } from '~~/shared/utils/project-control'
import type { HybridControlCheckpoint, HybridControlPhase, HybridControlSprint } from '~~/shared/types/project'

const props = defineProps<{ slug: string }>()

const { data: project } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const control = computed(() => ensureHybridControl(project.value?.profile?.hybridControl, project.value || {}))
const summary = computed(() => buildHybridControlSummary(control.value))

const phaseStatusLabels: Record<HybridControlPhase['status'], string> = {
  planned: 'запланирована',
  active: 'в работе',
  blocked: 'заблокирована',
  done: 'завершена',
}

const sprintStatusLabels: Record<HybridControlSprint['status'], string> = {
  planned: 'запланирован',
  active: 'активен',
  review: 'на ревью',
  done: 'завершён',
}

const checkpointStatusLabels: Record<HybridControlCheckpoint['status'], string> = {
  stable: 'стабильно',
  warning: 'внимание',
  critical: 'критично',
}
</script>

<style scoped>
.cpc-root {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.cpc-hero {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 0 0;
}

.cpc-hero::before,
.cpc-card::before,
.cpc-phase-row::before,
.cpc-sprint-row::before,
.cpc-checkpoint::before,
.cpc-blocker::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ds-accent) 36%, transparent), color-mix(in srgb, var(--glass-text) 8%, transparent) 62%, transparent);
}

.cpc-eyebrow,
.cpc-card__label,
.cpc-section__meta {
  margin: 0 0 6px;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .16em;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.cpc-title,
.cpc-card__title,
.cpc-section__title,
.cpc-phase-row__title {
  margin: 0;
  color: var(--glass-text);
}

.cpc-title {
  font-size: clamp(1.1rem, 1.8vw, 1.4rem);
}

.cpc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}

.cpc-card,
.cpc-phase-row,
.cpc-sprint-row,
.cpc-checkpoint,
.cpc-blocker {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 0 0;
}

.cpc-card__meta,
.cpc-phase-row__meta {
  font-size: .78rem;
  color: color-mix(in srgb, var(--glass-text) 56%, transparent);
}

.cpc-section {
  display: grid;
  gap: 14px;
}

.cpc-section__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.cpc-phase-list,
.cpc-sprint-list,
.cpc-checkpoint-list,
.cpc-blocker-list {
  display: grid;
  gap: 12px;
}

.cpc-phase-row__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cpc-pill,
.cpc-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  text-transform: uppercase;
  letter-spacing: .08em;
  font-size: .68rem;
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.cpc-phase-row__pct {
  font-size: .78rem;
  font-weight: 600;
}

.cpc-pill--stable,
.cpc-chip--done,
.cpc-chip--stable { color: var(--ds-success); }
.cpc-pill--warning,
.cpc-chip--warning,
.cpc-chip--review { color: var(--ds-warning); }
.cpc-pill--critical,
.cpc-chip--critical,
.cpc-chip--blocked { color: var(--ds-error); }
.cpc-chip--active,
.cpc-chip--doing { color: var(--ds-accent); }

@media (max-width: 768px) {
  .cpc-grid {
    grid-template-columns: 1fr;
  }

  .cpc-hero,
  .cpc-card,
  .cpc-phase-row,
  .cpc-sprint-row,
  .cpc-checkpoint,
  .cpc-section__head {
    flex-direction: column;
  }
}
</style>