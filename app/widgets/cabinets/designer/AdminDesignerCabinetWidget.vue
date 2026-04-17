<template>
  <AdminDesignerCabinet
    :designer-id="designerId"
    :focus-target="focusTarget"
    :model-value="modelValue"
    @update:model-value="onUpdateModelValue"
  />
</template>

<script setup lang="ts">
import AdminDesignerCabinet from '~/widgets/cabinets/designer/AdminDesignerCabinet.vue'

defineProps<{
  designerId: number
  focusTarget?: { kind: 'service' | 'package' | 'subscription'; key: string; requestId: number } | null
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onUpdateModelValue(value: string) {
  emit('update:modelValue', value)
}
</script>
