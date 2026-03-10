<template>
  <div class="admin-entity-page-shell">
    <slot name="before" />
    <template v-if="hasSelection">
      <slot name="selected" />
    </template>
    <template v-else-if="showCreate">
      <slot name="create" />
    </template>
    <template v-else>
      <slot name="empty" />
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hasSelection: boolean
  showCreate: boolean
}>()
</script>