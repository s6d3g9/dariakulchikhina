<template>
  <div class="ent-empty-detail" :class="{ 'admin-entity-empty--brutalist': brutalist }">
    <span class="ent-empty-icon">{{ icon }}</span>
    <span v-if="hasItems">{{ messageWithItems }}</span>
    <span v-else>{{ messageEmpty }}</span>
    <button v-if="actionLabel" class="a-btn-sm" style="margin-top:6px" @click="$emit('action')">{{ actionLabel }}</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  hasItems: boolean
  messageWithItems: string
  messageEmpty: string
  actionLabel?: string
  brutalist?: boolean
}>()

defineEmits<{
  (e: 'action'): void
}>()
</script>

<style scoped>
.admin-entity-empty--brutalist {
  min-height: 56vh;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 0;
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}
</style>