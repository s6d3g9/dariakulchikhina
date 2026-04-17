<template>
  <span class="cab-autosave-status" :class="statusClass">{{ statusLabel }}</span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  state?: '' | 'saving' | 'saved' | 'error'
  idleLabel?: string
}>(), {
  state: '',
  idleLabel: '[ AUTOSAVE ]',
})

const statusLabel = computed(() => {
  if (props.state === 'saving') return '[ СОХРАНЕНИЕ... ]'
  if (props.state === 'saved') return '[ СОХРАНЕНО ]'
  if (props.state === 'error') return '[ ОШИБКА ]'
  return props.idleLabel
})

const statusClass = computed(() => props.state ? `cab-autosave-status--${props.state}` : 'cab-autosave-status--idle')
</script>

<style scoped>
.cab-autosave-status {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--glass-border, rgba(20, 18, 16, 0.16));
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--glass-muted, #7a766f);
  background: rgba(255, 255, 255, 0.5);
}

.cab-autosave-status--saving {
  color: #9a6700;
  border-color: rgba(154, 103, 0, 0.28);
}

.cab-autosave-status--saved {
  color: #216e39;
  border-color: rgba(33, 110, 57, 0.28);
}

.cab-autosave-status--error {
  color: #b42318;
  border-color: rgba(180, 35, 24, 0.28);
}
</style>