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

const slug = ref('')
const prompt = ref('')
const model = ref<'haiku' | 'sonnet' | 'opus'>('sonnet')
const workroom = ref('')
const projectId = ref<string | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)

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
    // Leave workroom empty by default — backend then uses `main` as base branch.
    // Filling this field requires an existing `claude/workroom-<value>` branch
    // to exist on origin; otherwise queue daemon fails the spawn with
    // `fatal: invalid reference`.
    workroom.value = ''
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

// Status shown under the submit button while the queue daemon picks the
// task up. Synchronous "submit succeeded" only means the .md file landed
// in pending/; the actual workroom spawn is async and can fail later.
const launchStatus = ref<'idle' | 'queued' | 'running' | 'failed'>('idle')

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
  if (workroom.value && !/^[a-z0-9-]{1,40}$/.test(workroom.value)) {
    error.value = 'Workroom: только латиница, цифры и дефисы, до 40 символов'
    return
  }
  if (!projectId.value) {
    error.value = 'Выберите проект, в котором будет работать сессия'
    return
  }
  submitting.value = true
  error.value = null
  launchStatus.value = 'idle'
  try {
    await cliSessions.quickLaunch({
      slug: slug.value,
      prompt: prompt.value,
      model: model.value,
      projectId: projectId.value,
      workroom: workroom.value || undefined,
      sourceMessageId: props.messageId,
    })
    launchStatus.value = 'queued'

    // Poll daemon outcome for ~15s. Daemon sleeps 10s between iterations,
    // so the first useful answer typically arrives in 0–10s. We close on
    // running/done, surface failure inline, and fall back to a
    // close-with-warning if status stays unknown past the budget.
    const deadline = Date.now() + 15_000
    let outcome: 'spawn' | 'failed' | 'timeout' = 'timeout'
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500))
      let res
      try {
        res = await cliSessions.quickLaunchStatus(slug.value)
      } catch {
        continue // transient — keep polling
      }
      if (res.status === 'running' || res.status === 'done') {
        outcome = 'spawn'
        break
      }
      if (res.status === 'failed') {
        outcome = 'failed'
        const reason = 'reason' in res && res.reason ? res.reason : 'демон отбросил задачу без объяснений'
        error.value = `Спавн упал: ${reason}`
        launchStatus.value = 'failed'
        break
      }
    }

    if (outcome === 'spawn') {
      emit('launched', { slug: slug.value })
      dialogOpen.value = false
    } else if (outcome === 'timeout') {
      // Task is still pending after 15s — likely just the daemon polling
      // cadence. Close optimistically and let the existing snackbar/monitor
      // surface the eventual outcome.
      emit('launched', { slug: slug.value })
      dialogOpen.value = false
    }
    // 'failed': stay open with error displayed
  } catch (err: unknown) {
    // Backend reachable, returned 4xx/5xx — surface its message verbatim
    // (BASE_BRANCH_NOT_FOUND carries a hint string the user needs to see).
    const msg = err instanceof Error ? err.message : 'Не удалось поставить задачу в очередь'
    error.value = msg
    launchStatus.value = 'failed'
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

        <VAlert
          v-else-if="launchStatus === 'queued'"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          Файл попал в очередь. Жду подтверждения от демона (до 15с)…
        </VAlert>

        <VSelect
          v-model="projectId"
          :items="projectItems"
          label="Проект"
          density="compact"
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
          density="compact"
          variant="outlined"
          hide-details
          class="mb-3"
          :rules="[v => /^[a-z0-9-]{1,40}$/.test(v) || 'Только a-z 0-9 -']"
        />

        <VTextarea
          v-model="prompt"
          label="Prompt"
          rows="6"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-3"
        />

        <div class="quick-launch__row">
          <VSelect
            v-model="model"
            :items="['haiku', 'sonnet', 'opus']"
            label="Модель"
            density="compact"
            variant="outlined"
            hide-details
          />

          <VTextField
            v-model="workroom"
            label="Workroom (опционально)"
            placeholder="пусто = main"
            persistent-placeholder
            density="compact"
            variant="outlined"
            hint="Оставьте пустым для запуска от main. Иначе укажите имя существующей ветки claude/workroom-<имя>."
            persistent-hint
          />
        </div>
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

.quick-launch__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick-launch__actions {
  padding: 12px 20px 20px;
  gap: 8px;
}
</style>
