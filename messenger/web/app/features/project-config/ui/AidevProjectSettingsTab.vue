<script setup lang="ts">
// Project-level settings inside the AIDev workspace: rename / describe / delete +
// read-only meta (slug, created, updated). Delete cascades to the composer
// agent and its tmux claude-session on the backend side (messenger_agents
// rows will be soft-deleted via FK; tmux sessions stay until operator cleans).

import type { MessengerProject } from '../../../entities/projects/model/useMessengerProjects'

const props = defineProps<{ project: MessengerProject }>()

const projects = useMessengerProjects()
const aidevActive = useState<string | null>('aidev-active-project', () => null)

const form = reactive({
  name: props.project.name,
  description: props.project.description || '',
})
const saving = ref(false)
const saveError = ref('')
const saveToast = ref('')

const deleting = ref(false)
const deleteError = ref('')
const deleteConfirmOpen = ref(false)

// Reset form when switching to a different project (same Vue instance, new prop).
watch(() => props.project.id, () => {
  form.name = props.project.name
  form.description = props.project.description || ''
  saveError.value = ''
  saveToast.value = ''
})

const dirty = computed(() => {
  return form.name.trim() !== props.project.name
    || form.description.trim() !== (props.project.description || '')
})

async function save() {
  if (!form.name.trim() || !dirty.value || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    await projects.update(props.project.id, {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    })
    saveToast.value = 'Сохранено'
    setTimeout(() => { saveToast.value = '' }, 2000)
  }
  catch (e) {
    saveError.value = (e as Error).message || 'Не удалось сохранить'
  }
  finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await projects.remove(props.project.id)
    deleteConfirmOpen.value = false
    // Back to the aidev project list.
    aidevActive.value = null
  }
  catch (e) {
    deleteError.value = (e as Error).message || 'Не удалось удалить проект'
  }
  finally {
    deleting.value = false
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <div class="aidev-project-settings">
    <section class="aidev-project-settings__section">
      <h3 class="aidev-project-settings__heading">Основные</h3>

      <VTextField
        v-model="form.name"
        label="Название"
        density="comfortable"
        variant="outlined"
        :disabled="saving"
        counter="80"
        maxlength="80"
        class="mb-3"
      />
      <VTextarea
        v-model="form.description"
        label="Описание"
        density="comfortable"
        variant="outlined"
        :disabled="saving"
        rows="3"
        no-resize
        class="mb-3"
      />

      <VAlert v-if="saveError" type="error" density="compact" class="mb-2">{{ saveError }}</VAlert>
      <VAlert v-if="saveToast" type="success" density="compact" class="mb-2">{{ saveToast }}</VAlert>

      <div class="aidev-project-settings__row">
        <VBtn
          color="primary"
          variant="flat"
          :disabled="!dirty || !form.name.trim()"
          :loading="saving"
          prepend-icon="mdi-content-save-outline"
          @click="save"
        >
          Сохранить
        </VBtn>
      </div>
    </section>

    <VDivider class="my-4" />

    <section class="aidev-project-settings__section">
      <h3 class="aidev-project-settings__heading">Метаданные</h3>
      <dl class="aidev-project-settings__meta">
        <dt>ID</dt>
        <dd>
          <code class="aidev-project-settings__code">{{ project.id }}</code>
        </dd>
        <dt>Slug</dt>
        <dd>
          <code class="aidev-project-settings__code">@{{ project.slug }}</code>
        </dd>
        <dt>Создан</dt>
        <dd>{{ formatDate(project.createdAt) }}</dd>
        <dt>Обновлён</dt>
        <dd>{{ formatDate(project.updatedAt) }}</dd>
      </dl>
    </section>

    <VDivider class="my-4" />

    <section class="aidev-project-settings__section aidev-project-settings__section--danger">
      <h3 class="aidev-project-settings__heading aidev-project-settings__heading--danger">
        Опасная зона
      </h3>
      <p class="aidev-project-settings__danger-hint">
        Удаление проекта soft-delete-ит записи из БД. Composer-сессия claude-session
        остаётся жить отдельно — её надо снимать через dashboard вручную.
      </p>
      <VBtn
        color="error"
        variant="tonal"
        prepend-icon="mdi-delete-outline"
        @click="deleteConfirmOpen = true"
      >
        Удалить проект
      </VBtn>
    </section>

    <!-- Confirm delete dialog -->
    <VDialog v-model="deleteConfirmOpen" max-width="460" persistent>
      <VCard>
        <VCardTitle>Удалить проект?</VCardTitle>
        <VCardText>
          <p>
            Проект <b>{{ project.name }}</b>
            (@{{ project.slug }}) будет soft-deleted.
          </p>
          <p class="mt-2 aidev-project-settings__danger-hint">
            Composer-агент + его ресурсы (connectors / skills / plugins / MCP / external APIs)
            тоже будут помечены удалёнными и исчезнут из списков.
          </p>
          <VAlert v-if="deleteError" type="error" density="compact" class="mt-3">
            {{ deleteError }}
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            :disabled="deleting"
            @click="deleteConfirmOpen = false"
          >
            Отмена
          </VBtn>
          <VBtn
            color="error"
            variant="flat"
            :loading="deleting"
            prepend-icon="mdi-delete-outline"
            @click="confirmDelete"
          >
            Удалить
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.aidev-project-settings {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 640px;
}

.aidev-project-settings__section {
  padding: 4px 0;
}

.aidev-project-settings__heading {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface-variant));
}
.aidev-project-settings__heading--danger {
  color: rgb(var(--v-theme-error));
}

.aidev-project-settings__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.aidev-project-settings__meta {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 13px;
}
.aidev-project-settings__meta dt {
  color: rgb(var(--v-theme-on-surface-variant));
}
.aidev-project-settings__meta dd {
  margin: 0;
  word-break: break-all;
}
.aidev-project-settings__code {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.aidev-project-settings__section--danger {
  padding-top: 8px;
}
.aidev-project-settings__danger-hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
