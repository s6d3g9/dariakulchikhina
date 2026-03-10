<template>
  <div class="ent-detail-card glass-card admin-entity-create-card" :class="{ 'admin-entity-create-card--brutalist': brutalist }">
    <div class="ent-detail-head">
      <div class="ent-detail-name">{{ title }}</div>
      <button class="a-btn-sm" @click="$emit('close')">✕</button>
    </div>
    <input
      :value="modelValue"
      class="glass-input admin-entity-create-card__input"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.enter="$emit('submit')"
    />
    <div class="ent-detail-foot">
      <button class="a-btn-save" :disabled="disabled" @click="$emit('submit')">{{ submitLabel }}</button>
      <button class="a-btn-sm" @click="$emit('close')">отмена</button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  modelValue: string
  placeholder: string
  submitLabel: string
  disabled?: boolean
  brutalist?: boolean
}>(), {
  disabled: false,
  brutalist: false,
})

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit'): void
  (e: 'close'): void
}>()
</script>

<style scoped>
.admin-entity-create-card {
  margin-bottom: 14px;
}

.admin-entity-create-card--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.admin-entity-create-card__input {
  width: 100%;
  margin-bottom: 12px;
}
</style>