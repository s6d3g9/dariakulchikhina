<template>
  <Transition name="dp-drawer">
    <div v-if="show" class="dp-export">
      <div class="dp-export-inner">
        <div class="dp-export-tabs">
          <button
            type="button"
            :class="['dp-export-tab', { active: tab === 'json' }]"
            @click="$emit('update:tab', 'json')"
          >JSON</button>
          <button
            type="button"
            :class="['dp-export-tab', { active: tab === 'css' }]"
            @click="$emit('update:tab', 'css')"
          >CSS</button>
        </div>
        <textarea
          class="glass-input u-ta"
          :value="tab === 'json' ? exportJson() : exportCss()"
          spellcheck="false"
          @input="$emit('update:importBuffer', ($event.target as HTMLTextAreaElement).value)"
        />
        <div class="dp-export-actions">
          <button type="button" class="dp-sm-btn" @click="$emit('copy')">{{ copyLabel }}</button>
          <button v-if="tab === 'json'" type="button" class="dp-sm-btn" @click="$emit('import')">импорт JSON</button>
        </div>
        <div v-if="importError && tab === 'json'" class="dp-import-error">{{ importError }}</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  tab: 'json' | 'css'
  copyLabel: string
  importError: string
  exportJson: () => string
  exportCss: () => string
}>()

defineEmits<{
  'update:tab': [value: 'json' | 'css']
  'update:importBuffer': [value: string]
  copy: []
  import: []
}>()
</script>
