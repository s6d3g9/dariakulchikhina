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
        <VIcon start size="20">mdi-folder-plus-outline</VIcon>
        Новый проект
      </VCardTitle>

      <VCardText>
        <section class="aidev-dialog__section">
          <div class="aidev-dialog__eyebrow">Идентификация</div>
          <VTextField
            v-model="dialog.form.value.name"
            label="Название"
            autofocus
            :disabled="dialog.pending.value"
            counter="80"
            maxlength="80"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />
          <VTextarea
            v-model="dialog.form.value.description"
            label="Описание (необязательно)"
            :disabled="dialog.pending.value"
            rows="3"
            variant="outlined"
            density="compact"
            no-resize
            hide-details="auto"
          />
          <div class="aidev-dialog__chips">
            <VChip size="x-small" color="secondary" variant="tonal" label>приватный</VChip>
            <VChip size="x-small" color="info" variant="outlined" label>composer + auto-config</VChip>
          </div>
          <p class="aidev-dialog__when">
            <strong>Подсказка:</strong> slug сгенерируется из названия автоматически. Composer-агент будет добавлен сразу после создания.
          </p>
          <VAlert v-if="dialog.error.value" type="error" :icon="false" density="compact" variant="tonal">
            {{ dialog.error.value }}
          </VAlert>
        </section>
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
