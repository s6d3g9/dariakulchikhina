<template>
  <AdminDocumentEditor
    :templates="templates"
    :projects="projects"
    :existing-doc="existingDoc"
    @close="$emit('close')"
    @saved="onSaved"
  />
</template>

<script setup lang="ts">
import AdminDocumentEditor from '~/components/AdminDocumentEditor.vue'

defineProps<{
  templates: unknown[]
  projects: unknown[]
  existingDoc?: unknown
}>()

const emit = defineEmits<{
  close: []
  saved: [payload: unknown]
}>()

function onSaved(payload: unknown) {
  emit('saved', payload)
}
</script>
