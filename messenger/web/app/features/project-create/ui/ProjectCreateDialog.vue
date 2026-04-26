<script setup lang="ts">
const emit = defineEmits<{
  created: [projectSlug: string]
}>()

const dialog = useProjectCreate()

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    void handleSubmit()
  }
}

async function handleSubmit() {
  const project = await dialog.submit()
  if (project) {
    emit('created', project.slug)
  }
}
</script>

<template>
  <VDialog
    v-model="dialog.open.value"
    max-width="480"
    persistent
    @keydown="handleKeydown"
  >
    <VCard class="aidev-dialog">
      <VCardTitle>
        Новый проект
      </VCardTitle>

      <VCardText>
        <VTextField
          v-model="dialog.form.value.name"
          label="Название"
          autofocus
          :disabled="dialog.pending.value"
          counter="80"
          maxlength="80"
          variant="outlined"
          density="compact"
        />

        <VTextarea
          v-model="dialog.form.value.description"
          label="Описание (необязательно)"
          :disabled="dialog.pending.value"
          rows="3"
          variant="outlined"
          density="compact"
          no-resize
        />

        <VAlert v-if="dialog.error.value" type="error" :icon="false" density="compact">
          {{ dialog.error.value }}
        </VAlert>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn
          variant="text"
          density="compact"
          :disabled="dialog.pending.value"
          @click="dialog.hide()"
        >
          Отмена
        </VBtn>
        <VBtn
          color="primary"
          variant="tonal"
          density="compact"
          :loading="dialog.pending.value"
          :disabled="!dialog.form.value.name.trim() || dialog.pending.value"
          @click="handleSubmit"
        >
          Создать
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
