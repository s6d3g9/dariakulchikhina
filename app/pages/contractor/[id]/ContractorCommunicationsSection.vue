<template>
  <div class="cab-form">
    <div class="u-form-section">
      <h3>Защищённая связь</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>Проект для связи</label>
          <select
            :value="modelValue"
            class="glass-input cab-select"
            @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="projectOption in projects" :key="projectOption.slug" :value="projectOption.slug">
              {{ projectOption.title }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <ProjectCommunicationsPanel
      v-if="modelValue"
      :project-slug="modelValue"
    />
    <div v-else class="cab-empty">
      <div class="cab-empty-icon">◉</div>
      <p>Нет доступных проектов для защищённой связи.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ProjectOption {
  slug: string
  title: string
}

defineProps<{
  modelValue: string
  projects: ProjectOption[]
}>()

defineEmits<{
  'update:modelValue': [slug: string]
}>()
</script>
