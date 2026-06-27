<template>
  <div class="cpc-summary-shell">
    <div class="cpc-hero cpc-shell">
      <div>
        <p class="cpc-eyebrow">Контроль проекта</p>
        <h2 class="cpc-title">Как проект ведётся и где находится сейчас</h2>
      </div>
      <div class="cpc-hero__actions">
        <span class="cpc-pill" :class="`cpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
        <GlassButton variant="secondary" density="compact" type="button" @click="openProjectScopeDetails">
          контур проекта
        </GlassButton>
      </div>
    </div>

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
  </div>
</template>

<script setup lang="ts">
type ClientProjectControlSummary = {
  phasePercent: number
  doneTasks: number
  totalTasks: number
  blockerCount: number
  activePhase: { title: string } | null
  activeSprint: { name: string } | null
  health: {
    status: 'stable' | 'warning' | 'critical'
    label: string
  }
}

const props = defineProps<{
  summary: ClientProjectControlSummary
  nextReviewDate?: string
  openProjectScopeDetails: () => void | Promise<void>
}>()

const {
  summary,
  nextReviewDate,
  openProjectScopeDetails,
} = props
</script>

<style scoped>
.cpc-summary-shell {
  display: grid;
  gap: 18px;
}

.cpc-shell,
.cpc-card {
  position: relative;
  overflow: hidden;
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-radius);
  background: var(--cpc-surface);
  color: var(--cpc-text);
  box-shadow: var(--cpc-shadow);
  backdrop-filter: var(--cpc-backdrop);
  -webkit-backdrop-filter: var(--cpc-backdrop);
}

.cpc-hero::before,
.cpc-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ds-accent) 68%, transparent), transparent);
}

.cpc-eyebrow,
.cpc-card__label,
.cpc-card__meta {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cpc-muted);
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-title,
.cpc-card__title {
  margin: 0;
  color: var(--cpc-text);
}

.cpc-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
}

.cpc-hero__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.cpc-title {
  font-size: clamp(1.12rem, 1.8vw, 1.42rem);
  line-height: 1.3;
}

.cpc-grid--summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.cpc-card {
  display: grid;
  gap: 10px;
  min-height: 92px;
  padding: 16px 18px;
}

.cpc-card__title {
  font-size: clamp(1rem, 2vw, 1.2rem);
  line-height: 1.35;
}

.cpc-pill {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-chip-radius);
  background: var(--cpc-surface-strong);
  color: var(--cpc-text);
  font-size: 0.68rem;
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-pill--stable {
  color: var(--ds-success);
}

.cpc-pill--warning {
  color: var(--ds-warning);
}

.cpc-pill--critical {
  color: var(--ds-error);
}

:global(html[data-concept="brutal"] .cpc-shell),
:global(html[data-concept="brutal"] .cpc-card),
:global(html[data-concept="brutal"] .cpc-pill) {
  box-shadow: 4px 4px 0 #000000;
}

@media (max-width: 920px) {
  .cpc-grid--summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .cpc-hero {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .cpc-grid--summary {
    grid-template-columns: 1fr;
  }

  .cpc-hero,
  .cpc-card {
    padding: 16px;
  }
}
</style>