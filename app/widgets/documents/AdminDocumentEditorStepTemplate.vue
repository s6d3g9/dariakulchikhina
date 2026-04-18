<template>
  <div class="de-panel">
    <div class="de-section-title">Выберите шаблон документа</div>
    <div class="de-tpl-grid">
      <GlassSurface
        v-for="tpl in templates"
        :key="tpl.key"
        as="button"
        class="de-tpl-card"
        :class="{ 'de-tpl-card--active': selectedKey === tpl.key }"
        @click="$emit('select', tpl)"
      >
        <span class="de-tpl-icon">{{ tpl.icon }}</span>
        <div class="de-tpl-info">
          <div class="de-tpl-name">{{ tpl.name }}</div>
          <div class="de-tpl-desc">{{ tpl.description }}</div>
        </div>
        <span class="de-tpl-arrow">→</span>
      </GlassSurface>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DocTemplate {
  key: string
  icon: string
  name: string
  description: string
}

defineProps<{
  templates: DocTemplate[]
  selectedKey: string | null | undefined
}>()

defineEmits<{
  select: [tpl: DocTemplate]
}>()
</script>
