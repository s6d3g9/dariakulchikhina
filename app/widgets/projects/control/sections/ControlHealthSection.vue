<template>
  <section class="hpc-section">
    <div class="hpc-section__head">
      <div>
        <p class="hpc-section__label">Здоровье проекта</p>
        <h3 class="hpc-section__title">Контрольные точки и блокеры</h3>
      </div>
      <GlassButton variant="secondary" density="compact" type="button" @click="addCheckpoint">+ точка</GlassButton>
    </div>

    <div class="hpc-checkpoint-list">
      <div v-for="(checkpoint, checkpointIndex) in control.checkpoints" :key="checkpoint.id" class="hpc-checkpoint-row">
        <GlassInput v-model="checkpoint.title" placeholder="Контрольная точка" @blur="emitSave" />
        <GlassInput v-model="checkpoint.category" placeholder="Категория" @blur="emitSave" />
        <select v-model="checkpoint.status" class="u-status-sel" @change="emitSave">
          <option v-for="option in checkpointStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <GlassInput v-model="checkpoint.note" class="hpc-checkpoint-row__note" placeholder="Комментарий" @blur="emitSave" />
        <GlassButton variant="danger" density="compact" type="button" @click="removeCheckpoint(checkpointIndex)">×</GlassButton>
      </div>
    </div>

    <div class="hpc-task-head hpc-task-head--blockers">
      <span class="hpc-task-head__title">Текущие блокеры</span>
      <GlassButton variant="secondary" density="compact" type="button" @click="addBlocker">+ блокер</GlassButton>
    </div>
    <div class="hpc-blocker-list">
      <div v-for="(_blocker, blockerIndex) in control.blockers" :key="`blocker-${blockerIndex}`" class="hpc-blocker-row">
        <GlassInput v-model="control.blockers[blockerIndex]" class="hpc-blocker-row__input" placeholder="Описание блокера" @blur="emitSave" />
        <GlassButton variant="danger" density="compact" type="button" @click="removeBlocker(blockerIndex)">×</GlassButton>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HybridControl } from '~~/shared/types/project'
import { checkpointStatusOptions } from '../model/control-options'

const props = defineProps<{
  control: HybridControl
}>()

const emit = defineEmits<{
  save: []
}>()

function emitSave() {
  emit('save')
}

function addCheckpoint() {
  props.control.checkpoints.push({
    id: `hybrid-checkpoint-${Date.now()}`,
    title: 'Новая контрольная точка',
    category: 'control',
    status: 'stable',
    note: '',
  })
  emitSave()
}

function removeCheckpoint(index: number) {
  props.control.checkpoints.splice(index, 1)
  emitSave()
}

function addBlocker() {
  props.control.blockers.push('')
  emitSave()
}

function removeBlocker(index: number) {
  props.control.blockers.splice(index, 1)
  emitSave()
}
</script>
