<template>
  <section class="hpc-summary">
    <div class="hpc-summary__head">
      <div>
        <p class="hpc-eyebrow">Контур контроля</p>
        <h2 class="hpc-title">Фазовый каркас и спринтовый ритм исполнения</h2>
      </div>
      <div class="hpc-summary__meta">
        <span class="hpc-pill" :class="`hpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
        <GlassButton variant="secondary" density="compact" type="button" @click="emit('open-project-scope-details')">контур проекта</GlassButton>
        <span v-if="saveMetaText" class="hpc-saved" :class="{ 'hpc-saved--error': saveState === 'error' }">{{ saveMetaText }}</span>
      </div>
    </div>

    <div class="hpc-metrics">
      <div class="hpc-metric">
        <span class="hpc-metric__label">Фазовый прогресс</span>
        <strong class="hpc-metric__value">{{ summary.phasePercent }}%</strong>
      </div>
      <div class="hpc-metric">
        <span class="hpc-metric__label">Спринтовое исполнение</span>
        <strong class="hpc-metric__value">{{ summary.doneTasks }} / {{ summary.totalTasks }}</strong>
      </div>
      <div class="hpc-metric">
        <span class="hpc-metric__label">Блокеры</span>
        <strong class="hpc-metric__value">{{ summary.blockerCount }}</strong>
      </div>
      <div class="hpc-metric">
        <span class="hpc-metric__label">Следующий обзор</span>
        <strong class="hpc-metric__value">{{ control.nextReviewDate || 'не задан' }}</strong>
      </div>
    </div>
  </section>

  <section class="hpc-section">
    <div class="hpc-section__head">
      <div>
        <p class="hpc-section__label">Контур</p>
        <h3 class="hpc-section__title">Управление ритмом проекта</h3>
      </div>
    </div>
    <div class="hpc-grid hpc-grid--top">
      <div class="u-field">
        <label class="u-field__label">Ответственный за контроль</label>
        <GlassInput v-model="control.manager" placeholder="Менеджер" @blur="emit('save')" />
      </div>
      <div class="u-field">
        <label class="u-field__label">Интервал обзора, дней</label>
        <GlassInput v-model.number="control.cadenceDays" type="number" min="1" max="90" @blur="emit('save')" />
      </div>
      <div class="u-field">
        <label class="u-field__label">Следующий контрольный обзор</label>
        <AppDatePicker v-model="control.nextReviewDate" model-type="iso" input-class="glass-input" @update:model-value="emit('save')" />
      </div>
      <div class="u-field">
        <label class="u-field__label">Последняя синхронизация</label>
        <AppDatePicker v-model="control.lastSyncAt" model-type="iso" input-class="glass-input" @update:model-value="emit('save')" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { buildHybridControlSummary } from '~~/shared/utils/project-control'
import type { HybridControl } from '~~/shared/types/project'

defineProps<{
  control: HybridControl
  summary: ReturnType<typeof buildHybridControlSummary>
  saveMetaText: string
  saveState: 'idle' | 'saving' | 'error'
}>()

const emit = defineEmits<{
  save: []
  'open-project-scope-details': []
}>()
</script>
