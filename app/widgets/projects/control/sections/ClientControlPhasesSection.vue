<template>
  <section class="cpc-section cpc-section--phases">
    <div class="cpc-section__head">
      <div>
        <div class="cpc-section__title">Фазы проекта</div>
        <div class="cpc-section__meta">Фазовый каркас и контрольные гейты</div>
      </div>
    </div>

    <div class="cpc-phase-overview">
      <article v-for="stat in phaseStats" :key="stat.label" class="cpc-phase-stat">
        <span class="cpc-phase-stat__label">{{ stat.label }}</span>
        <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
      </article>
    </div>

    <div class="cpc-phase-list cpc-phase-list--cards">
      <article v-for="phase in phases" :key="phase.id" class="cpc-phase-card" :data-client-phase-id="phase.id">
        <div class="cpc-phase-card__head">
          <div>
            <p class="cpc-phase-card__kicker">{{ phase.phaseKey }}</p>
            <h3 class="cpc-phase-card__title">{{ phase.title }}</h3>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip" :class="`cpc-chip--${phase.status}`">{{ phaseStatusLabels[phase.status] }}</span>
            <span class="cpc-chip">{{ phase.percent || 0 }}%</span>
          </div>
        </div>

        <div class="cpc-phase-card__grid">
          <div class="cpc-phase-field">
            <span class="cpc-phase-field__label">Результат</span>
            <strong class="cpc-phase-field__value">{{ phase.deliverable || 'Результат пока не зафиксирован' }}</strong>
          </div>
          <div class="cpc-phase-field">
            <span class="cpc-phase-field__label">Ответственный</span>
            <strong class="cpc-phase-field__value">{{ phase.owner || 'Команда проекта' }}</strong>
          </div>
          <div class="cpc-phase-field">
            <span class="cpc-phase-field__label">Период</span>
            <strong class="cpc-phase-field__value">{{ formatHybridTimelineDateRange(phase.startDate, phase.endDate) }}</strong>
          </div>
          <div class="cpc-phase-field">
            <span class="cpc-phase-field__label">Комментарий</span>
            <strong class="cpc-phase-field__value">{{ phase.notes || 'Без дополнительной заметки' }}</strong>
          </div>
        </div>

        <div v-if="phase.gates.length" class="cpc-phase-gates">
          <div class="cpc-phase-gates__head">
            <span class="cpc-phase-field__label">Контрольные гейты</span>
            <span class="cpc-chip">{{ getPhaseGateProgress(phase) }}</span>
          </div>
          <div class="cpc-phase-gate-list">
            <div
              v-for="gate in phase.gates"
              :key="gate.id"
              class="cpc-phase-gate"
              :class="{ 'cpc-phase-gate--done': gate.done }"
            >
              <span class="cpc-phase-gate__state">{{ gate.done ? 'готово' : 'в работе' }}</span>
              <span class="cpc-phase-gate__label">{{ gate.label }}</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatHybridTimelineDateRange } from '~~/shared/utils/project-control-timeline'
import type { HybridControlPhase } from '~~/shared/types/project'
import { phaseStatusLabels } from '../model/control-options'

interface PhaseStat {
  label: string
  value: string
}

defineProps<{
  phases: HybridControlPhase[]
  phaseStats: PhaseStat[]
}>()

function getPhaseGateProgress(phase: HybridControlPhase): string {
  if (!phase.gates.length) return '0'
  return `${phase.gates.filter(gate => gate.done).length}/${phase.gates.length}`
}
</script>
