<script setup lang="ts">
import { stripReplySuggestions } from '../lib/numberedOptions'

const props = defineProps<{
  modelValue: boolean
  messageId: string
  body: string
  // Existing CLI session slug if the chat is already bound to one — used to
  // seed the slug field with a recognisable prefix so multiple launches
  // from the same chat don't collide.
  conversationSlug?: string | null
  // Project id of the agent the operator is currently chatting with. Used to
  // pre-select the project picker so the operator can usually one-click
  // "Запустить агентом" in the same project as the chat. Required by the
  // backend (W5 project-centric refactor); the picker still lets the
  // operator override before submit.
  defaultProjectId?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  // Emitted on successful drop into the queue. Parent uses this to surface a
  // snackbar with a deep-link to the monitor row.
  launched: [payload: { slug: string }]
}>()

const cliSessions = useMessengerCliSessions()
const balancing = useMessengerBalancing()
const projectsModel = useMessengerProjects()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

type ModelKey = 'haiku' | 'sonnet' | 'opus'

const slug = ref('')
const prompt = ref('')
const model = ref<ModelKey>('sonnet')
const workroom = ref('')
const projectId = ref<string | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)

// Mode-tile entries for the model picker (§4.4.2 pattern in ui-standards).
// Hints are intentionally short — the tile shows them under the model name
// at smaller font size.
const modelOptions: ReadonlyArray<{ value: ModelKey; title: string; hint: string }> = [
  { value: 'haiku', title: 'Haiku', hint: 'быстрая, для рутины' },
  { value: 'sonnet', title: 'Sonnet', hint: 'баланс — по умолчанию' },
  { value: 'opus', title: 'Opus', hint: 'тяжёлый ресёрч / архитектура' },
]

// Items for the project <VSelect>. Empty until refresh resolves; we kick a
// refresh on dialog open so a freshly-mounted component sees the list.
const projectItems = computed(() =>
  projectsModel.projects.value.map(p => ({ title: p.name, value: p.id })),
)

// 8-char message-id hash — keeps the slug short while still making it unique
// per (conversation, message) pair so the same prompt can be re-launched
// after edits.
function shortMessageHash(messageId: string): string {
  // FNV-1a 32-bit — deterministic, no crypto dependency, works in browsers.
  let h = 0x811c9dc5
  for (let i = 0; i < messageId.length; i += 1) {
    h ^= messageId.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 8)
}

function buildSlug(messageId: string, conversationSlug: string | null | undefined): string {
  const hash = shortMessageHash(messageId)
  const base = (conversationSlug || 'ql')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  const candidate = base ? `${base}-${hash}` : `ql-${hash}`
  // Slug regex on the server is ^[a-z0-9-]{1,40}$ — clamp here too so the
  // user can submit the prefilled value without edits.
  return candidate.slice(0, 40).replace(/-+$/, '') || `ql-${hash}`
}

watch(
  () => [props.modelValue, props.messageId, props.body],
  ([open]) => {
    if (!open) return
    error.value = null
    submitting.value = false
    slug.value = buildSlug(props.messageId, props.conversationSlug ?? null)
    prompt.value = stripReplySuggestions(props.body)
    workroom.value = `wr-${slug.value}`.slice(0, 40)
    // Seed the project picker with the chat's agent project, if any. The
    // operator can still change it before submit. The list is refreshed so
    // freshly-created projects appear without a page reload.
    projectId.value = props.defaultProjectId ?? null
    void (async () => {
      if (projectsModel.projects.value.length === 0) {
        try { await projectsModel.refresh() } catch { /* keep picker empty */ }
      }
      // If the parent didn't pass a default but exactly one project exists,
      // pre-select it — single-project setups shouldn't force a click.
      if (!projectId.value && projectsModel.projects.value.length === 1) {
        projectId.value = projectsModel.projects.value[0]?.id ?? null
      }
    })()
    // Pull active preset model on open. Refresh is idempotent, but if the
    // store is already populated we avoid the round-trip.
    void (async () => {
      if (!balancing.state.value) {
        try { await balancing.refresh() } catch { /* fall through to default */ }
      }
      const preset = balancing.activePreset.value
      if (preset?.model) model.value = preset.model
    })()
  },
  { immediate: true },
)

async function submit() {
  if (submitting.value) return
  if (!slug.value || !prompt.value.trim()) {
    error.value = 'Slug и prompt обязательны'
    return
  }
  if (!/^[a-z0-9-]{1,40}$/.test(slug.value)) {
    error.value = 'Slug: только латиница, цифры и дефисы, до 40 символов'
    return
  }
  if (!projectId.value) {
    error.value = 'Выберите проект, в котором будет работать сессия'
    return
  }
  submitting.value = true
  error.value = null
  try {
    await cliSessions.quickLaunch({
      slug: slug.value,
      prompt: prompt.value,
      model: model.value,
      projectId: projectId.value,
      workroom: workroom.value || undefined,
      sourceMessageId: props.messageId,
    })
    emit('launched', { slug: slug.value })
    dialogOpen.value = false
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Не удалось поставить задачу в очередь'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <VDialog v-model="dialogOpen" max-width="560">
    <VCard>
      <VCardTitle class="quick-launch__title">
        <VIcon start size="20">mdi-rocket-launch</VIcon>
        Запустить агентом
      </VCardTitle>

      <VCardText>
        <VAlert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">
          {{ error }}
        </VAlert>

        <VSelect
          v-model="projectId"
          :items="projectItems"
          label="Проект"
          density="comfortable"
          variant="outlined"
          class="mb-3"
          :error="!projectId && Boolean(error)"
          :error-messages="!projectId && error ? ['Проект обязателен'] : undefined"
          :no-data-text="projectsModel.pending ? 'Загрузка проектов…' : 'Нет доступных проектов'"
          hide-details="auto"
        />

        <VTextField
          v-model="slug"
          label="Slug"
          density="comfortable"
          variant="outlined"
          hide-details
          class="mb-3"
          :rules="[v => /^[a-z0-9-]{1,40}$/.test(v) || 'Только a-z 0-9 -']"
        />

        <VTextarea
          v-model="prompt"
          label="Prompt"
          rows="6"
          density="comfortable"
          variant="outlined"
          hide-details
          class="mb-3"
        />

        <!-- Model picker as mode-tile group (ui-standards §4.4.2). -->
        <div class="quick-launch__field-label">Модель</div>
        <div class="quick-launch__model-tiles">
          <button
            v-for="opt in modelOptions"
            :key="opt.value"
            type="button"
            class="ql-mode-tile"
            :class="{ 'ql-mode-tile--active': model === opt.value }"
            :aria-pressed="model === opt.value"
            @click="model = opt.value"
          >
            <span class="ql-mode-tile__title">{{ opt.title }}</span>
            <span class="ql-mode-tile__hint">{{ opt.hint }}</span>
          </button>
        </div>

        <VTextField
          v-model="workroom"
          label="Workroom"
          density="comfortable"
          variant="outlined"
          hide-details
          class="mt-3"
        />
      </VCardText>

      <VCardActions class="quick-launch__actions">
        <VBtn variant="text" :disabled="submitting" @click="dialogOpen = false">Отмена</VBtn>
        <VSpacer />
        <VBtn
          color="primary"
          variant="flat"
          prepend-icon="mdi-rocket-launch"
          :loading="submitting"
          :disabled="!projectId"
          @click="submit"
        >
          Запустить
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.quick-launch__title {
  padding-top: 20px;
}

.quick-launch__field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0 0 6px 4px;
}

.quick-launch__model-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.ql-mode-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.85rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.ql-mode-tile:hover:not([disabled]) {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.ql-mode-tile--active {
  background: rgb(var(--v-theme-secondary-container));
  border-color: transparent;
  color: rgb(var(--v-theme-on-secondary-container));
}

.ql-mode-tile__title {
  font-size: 0.9rem;
  font-weight: 600;
}

.ql-mode-tile__hint {
  font-size: 0.72rem;
  font-weight: 400;
  opacity: 0.8;
  line-height: 1.3;
}

.quick-launch__actions {
  padding: 12px 20px 20px;
  gap: 8px;
}
</style>
