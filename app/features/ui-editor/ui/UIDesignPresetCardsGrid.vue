<template>
  <div :class="variant === 'concept' ? 'dp-concepts-grid' : 'dp-presets-grid'">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      :class="variant === 'concept'
        ? ['dp-concept-card', { 'dp-concept-card--active': activeId === item.id }]
        : ['dp-preset-card', { 'dp-preset-card--active': activeId === item.id }]"
      @click="$emit('pick', item)"
    >
      <template v-if="variant === 'concept'">
        <span class="dp-concept-icon">{{ item.icon }}</span>
        <div class="dp-concept-body">
          <span class="dp-concept-name">{{ item.name }}</span>
          <span class="dp-concept-desc">{{ item.description }}</span>
        </div>
      </template>
      <template v-else>
        <span class="dp-preset-icon">{{ item.icon }}</span>
        <span class="dp-preset-name">{{ item.name }}</span>
        <span class="dp-preset-desc">{{ item.description }}</span>
      </template>
    </button>
  </div>
</template>

<script setup lang="ts">
interface DesignPresetCard {
  id: string
  icon: string
  name: string
  description: string
}

defineProps<{
  items: readonly DesignPresetCard[]
  activeId: string | null | undefined
  variant: 'preset' | 'concept'
}>()

defineEmits<{
  pick: [item: DesignPresetCard]
}>()
</script>
