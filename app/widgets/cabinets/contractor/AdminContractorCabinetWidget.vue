<template>
  <AdminContractorCabinet
    :contractor-id="contractorId"
    :show-sidebar="showSidebar"
    :model-value="modelValue"
    @update:model-value="onUpdateModelValue"
  />
</template>

<script setup lang="ts">
import AdminContractorCabinet from '~/widgets/cabinets/contractor/AdminContractorCabinet.vue'

defineProps<{
  contractorId: number
  showSidebar?: boolean
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onUpdateModelValue(value: string) {
  emit('update:modelValue', value)
}
</script>
