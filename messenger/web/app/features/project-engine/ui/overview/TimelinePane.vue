<script setup lang="ts">
import MessengerProjectMiniTimeline from '../MessengerProjectMiniTimeline.vue'
import type {
  MessengerPlatformActionCatalog,
} from '../model/useMessengerProjectActions'

const props = defineProps<{
  catalog: MessengerPlatformActionCatalog | null
  selectedPhaseKey: string
  pending: boolean
}>()

const emit = defineEmits<{
  selectPhase: [phaseId: string]
}>()
</script>

<template>
  <section class="tp-pane">
    <div class="tp-pane__head">
      <span class="tp-pane__title">Таймлайн</span>
    </div>

    <div v-if="!props.catalog" class="tp-empty-state">
      Сначала выберите проект.
    </div>

    <div v-else-if="pending" class="tp-empty-state">
      Загружаю таймлайн проекта…
    </div>

    <MessengerProjectMiniTimeline
      v-else-if="props.catalog?.phases.length"
      :catalog="props.catalog"
      @select-phase="emit('selectPhase', $event)"
    />

    <div v-else class="tp-empty-state">
      В проекте пока нет фаз для таймлайна.
    </div>
  </section>
</template>

<style scoped>
.tp-pane {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  background: rgb(var(--v-theme-surface-container-high));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.tp-pane__head {
  display: grid;
  gap: 2px;
}

.tp-pane__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.tp-empty-state {
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
