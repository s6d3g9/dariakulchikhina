<template>
  <div class="cab-section-head" :class="{ 'cab-section-head--brutalist': brutalist }">
    <div class="cab-section-head__copy">
      <div v-if="eyebrow" class="cab-section-head__eyebrow">{{ eyebrow }}</div>
      <div class="u-section-title" :class="{ 'cab-section-head__title--brutalist': brutalist }">
        <h2>{{ title }}</h2>
      </div>
      <p v-if="note" class="cab-section-head__note">{{ note }}</p>
    </div>
    <div v-if="$slots.actions" class="cab-section-head__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  note?: string
  eyebrow?: string
  brutalist?: boolean
}>()
</script>

<style scoped>
.cab-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.cab-section-head__copy {
  display: grid;
  gap: 6px;
}

.cab-section-head__eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--glass-muted, #7a766f);
}

.cab-section-head :deep(.u-section-title) {
  margin-bottom: 0;
}

.cab-section-head :deep(.u-section-title h2) {
  margin: 0;
  font-size: 1rem;
  line-height: 1.1;
}

.cab-section-head__title--brutalist :deep(h2) {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.cab-section-head__note {
  margin: 0;
  max-width: 62ch;
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--glass-muted, #7a766f);
}

.cab-section-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cab-section-head--brutalist {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--glass-border, rgba(20, 18, 16, 0.16));
}

@media (max-width: 768px) {
  .cab-section-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>