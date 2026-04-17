<template>
  <div class="ent-entity-hd">
    <span class="ent-entity-hd-name">{{ title }}</span>
    <div v-if="$slots.actions" class="ent-entity-hd-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>