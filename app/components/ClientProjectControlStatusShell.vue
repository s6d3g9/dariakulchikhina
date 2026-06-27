<template>
  <div class="cpc-status-shell">
    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Контрольные точки</div>
          <div class="cpc-section__meta">Состояние проекта</div>
        </div>
      </div>

      <div class="cpc-checkpoint-list">
        <div v-for="checkpoint in checkpoints" :key="checkpoint.id" class="cpc-checkpoint">
          <div>
            <div class="cpc-phase-row__title">{{ checkpoint.title }}</div>
            <div class="cpc-phase-row__meta">{{ checkpoint.note || 'Без комментария' }}</div>
          </div>
          <span class="cpc-chip" :class="`cpc-chip--${checkpoint.status}`">{{ checkpointStatusLabels[checkpoint.status] }}</span>
        </div>
      </div>
    </section>

    <section v-if="blockers.length" class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Текущие блокеры</div>
          <div class="cpc-section__meta">Что мешает движению</div>
        </div>
      </div>

      <div class="cpc-blocker-list">
        <div v-for="(blocker, index) in blockers" :key="`client-blocker-${index}`" class="cpc-blocker">
          {{ blocker }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { HybridControlCheckpoint } from '~~/shared/types/project/project'

const props = defineProps<{
  checkpoints: HybridControlCheckpoint[]
  blockers: string[]
  checkpointStatusLabels: Record<HybridControlCheckpoint['status'], string>
}>()

const {
  checkpoints,
  blockers,
  checkpointStatusLabels,
} = props
</script>

<style scoped>
.cpc-status-shell {
  display: grid;
  gap: 18px;
}

.cpc-section,
.cpc-checkpoint,
.cpc-blocker {
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-radius);
  background: var(--cpc-surface);
  color: var(--cpc-text);
  box-shadow: var(--cpc-shadow);
  backdrop-filter: var(--cpc-backdrop);
  -webkit-backdrop-filter: var(--cpc-backdrop);
}

.cpc-section {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.cpc-section__head,
.cpc-checkpoint,
.cpc-blocker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cpc-section__title,
.cpc-phase-row__title {
  margin: 0;
  color: var(--cpc-text);
}

.cpc-section__meta,
.cpc-phase-row__meta {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cpc-muted);
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-checkpoint-list,
.cpc-blocker-list {
  display: grid;
  gap: 12px;
}

.cpc-checkpoint,
.cpc-blocker {
  padding: 16px 18px;
}

.cpc-chip {
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

.cpc-chip--stable {
  color: var(--ds-success);
}

.cpc-chip--warning {
  color: var(--ds-warning);
}

.cpc-chip--critical {
  color: var(--ds-error);
}

:global(html[data-concept="brutal"] .cpc-section),
:global(html[data-concept="brutal"] .cpc-checkpoint),
:global(html[data-concept="brutal"] .cpc-blocker),
:global(html[data-concept="brutal"] .cpc-chip) {
  box-shadow: 4px 4px 0 #000000;
}

@media (max-width: 760px) {
  .cpc-section__head,
  .cpc-checkpoint,
  .cpc-blocker {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
