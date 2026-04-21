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
    <VCard color="surface" variant="flat">
      <VCardTitle class="project-create-dialog__title">
        Новый проект
      </VCardTitle>

      <VCardText class="project-create-dialog__body">
        <VTextField
          v-model="dialog.form.value.name"
          label="Название"
          autofocus
          :disabled="dialog.pending.value"
          counter="80"
          maxlength="80"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        />

        <VTextarea
          v-model="dialog.form.value.description"
          label="Описание (необязательно)"
          :disabled="dialog.pending.value"
          rows="3"
          variant="outlined"
          density="comfortable"
          no-resize
        />

        <VAlert v-if="dialog.error.value" type="error" :icon="false" class="mt-3" density="compact">
          {{ dialog.error.value }}
        </VAlert>
      </VCardText>

      <VCardActions class="project-create-dialog__actions">
        <VSpacer />
        <VBtn
          variant="text"
          :disabled="dialog.pending.value"
          @click="dialog.hide()"
        >
          Отмена
        </VBtn>
        <VBtn
          color="primary"
          variant="flat"
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

<style scoped>
.project-create-dialog__title {
  padding-top: 20px;
}

.project-create-dialog__body {
  padding-top: 8px;
}

.project-create-dialog__actions {
  padding-bottom: 16px;
  padding-right: 16px;
}
</style>
