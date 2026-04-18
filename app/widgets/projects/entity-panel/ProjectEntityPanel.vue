<template>
  <div class="proj-entity-panel" :class="{ 'proj-entity-panel--brutalist': isBrutalist }">
    <div class="proj-entity-panel-title">{{ title }}</div>

    <div v-if="linkedItems.length" class="proj-entity-section">
      <div class="proj-entity-section-label">{{ linkedLabel }}</div>
      <div class="proj-entity-list">
        <div
          v-for="item in linkedItems"
          :key="item.id"
          class="proj-entity-row proj-entity-row--linked"
        >
          <div class="proj-entity-info">
            <div class="proj-entity-name">{{ item.name }}</div>
            <div class="proj-entity-meta">{{ formatMeta(item) }}</div>
          </div>
          <button
            v-if="canUnlink"
            type="button"
            class="proj-entity-btn proj-entity-btn--remove"
            @click="$emit('unlink', item.id)"
          >−</button>
        </div>
      </div>
    </div>

    <div v-if="!linkedItems.length && emptyText" class="proj-entity-empty">{{ emptyText }}</div>

    <div class="proj-entity-section">
      <div class="proj-entity-section-label">{{ availableLabel }}</div>
      <div v-if="!availableItems.length" class="proj-entity-empty">{{ availableEmptyText }}</div>
      <div class="proj-entity-list">
        <div
          v-for="item in availableItems"
          :key="item.id"
          class="proj-entity-row"
        >
          <div class="proj-entity-info">
            <div class="proj-entity-name">{{ item.name }}</div>
            <div class="proj-entity-meta">{{ formatMeta(item) }}</div>
          </div>
          <button
            v-if="canLink"
            type="button"
            class="proj-entity-btn proj-entity-btn--add"
            @click="$emit('link', item.id)"
          >+</button>
        </div>
      </div>
    </div>

    <p v-if="errorText" style="color:var(--ds-error,#c00);font-size:.8rem;margin:8px 0">{{ errorText }}</p>
    <p v-if="successText" style="color:var(--ds-success,#5caa7f);font-size:.8rem;margin:8px 0">{{ successText }}</p>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string | number; name: string }">
withDefaults(defineProps<{
  title: string
  linkedLabel: string
  availableLabel: string
  linkedItems: T[]
  availableItems: T[]
  formatMeta: (item: T) => string
  isBrutalist: boolean
  availableEmptyText: string
  emptyText?: string
  errorText?: string
  successText?: string
  canLink?: boolean
  canUnlink?: boolean
}>(), {
  canLink: true,
  canUnlink: true,
  emptyText: '',
  errorText: '',
  successText: '',
})

defineEmits<{
  link: [id: T['id']]
  unlink: [id: T['id']]
}>()
</script>
