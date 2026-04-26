<script setup lang="ts">
import { extractNumberedOptions, stripReplySuggestions } from '../lib/numberedOptions'

// Inline expandable panel that replaces the old quick-launch modal. Rendered
// inside the message thread underneath the originating bubble so the operator
// stays in context. See AidevBalancingTab.vue for the visual tokens this
// component mirrors (soft 14px cards, density="compact", x-small chips).
//
// Filename kept as MessengerQuickLaunchDialog.vue for a smaller diff against
// existing imports — the component itself is no longer a VDialog.

const props = defineProps<{
  // True when the bubble that owns this panel is the currently expanded one.
  // The parent toggles this via `expandedQuickLaunchMessageId`.
  open: boolean
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
  // Active chat agent id. Forwarded to the queue-write endpoint so the
  // backend can append a persistent system bubble into this conversation.
  defaultAgentId?: string | null
}>()

const emit = defineEmits<{
  // Operator dismissed the panel without submitting (✕ or Cancel).
  close: []
  // Successful queue write. Parent uses this to refresh the sessions list;
  // surface UI is the new persistent system bubble, not a snackbar.
  launched: [payload: { slug: string }]
}>()

const cliSessions = useMessengerCliSessions()
const balancing = useMessengerBalancing()
const projectsModel = useMessengerProjects()

const slug = ref('')
const prompt = ref('')
const model = ref<'haiku' | 'sonnet' | 'opus'>('sonnet')
const workroom = ref('')
const projectId = ref<string | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)

const projectItems = computed(() =>
  projectsModel.projects.value.map(p => ({ title: p.name, value: p.id })),
)

// FNV-1a 32-bit — deterministic, no crypto dependency. 8-char hex keeps the
// slug short while still unique per (conversation, message) pair.
function shortMessageHash(messageId: string): string {
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
  return candidate.slice(0, 40).replace(/-+$/, '') || `ql-${hash}`
}

// --- Smart prompt builder -------------------------------------------------

interface PromptFragment {
  id: string
  // Short label rendered inside the chip.
  label: string
  // Full text inserted into the prompt textarea when the chip is selected.
  text: string
}

const REPLY_SUGGESTIONS_RE = /<reply-suggestions>([^<]*)<\/reply-suggestions>/

function parseReplySuggestionTokens(body: string): string[] {
  const match = body.match(REPLY_SUGGESTIONS_RE)
  if (!match) return []
  return (match[1] ?? '')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 6)
}

const fragments = computed<PromptFragment[]>(() => {
  const stripped = stripReplySuggestions(props.body)
  if (!stripped && !REPLY_SUGGESTIONS_RE.test(props.body)) return []

  const list: PromptFragment[] = []
  if (stripped) {
    list.push({
      id: 'whole',
      label: 'Сообщение целиком',
      text: stripped,
    })
  }

  const numbered = extractNumberedOptions(props.body)?.options ?? []
  for (let i = 0; i < numbered.length; i += 1) {
    const text = numbered[i]!
    list.push({
      id: `num-${i + 1}`,
      label: `${i + 1}. ${text.length > 48 ? `${text.slice(0, 48)}…` : text}`,
      text: `${i + 1}. ${text}`,
    })
  }

  const tokens = parseReplySuggestionTokens(props.body)
  for (let i = 0; i < tokens.length; i += 1) {
    const text = tokens[i]!
    list.push({
      id: `sug-${i}`,
      label: text.length > 36 ? `${text.slice(0, 36)}…` : text,
      text,
    })
  }

  return list
})

const selectedFragmentIds = ref<Set<string>>(new Set())
// Goes true once the operator types into the textarea — auto-rebuild from
// chips is suspended so we don't clobber their edits.
const manualMode = ref(false)

function pickDefaultSelection(): Set<string> {
  const ids = new Set<string>()
  const numbered = extractNumberedOptions(props.body)
  if (numbered && numbered.options.length) {
    for (let i = 0; i < numbered.options.length; i += 1) {
      ids.add(`num-${i + 1}`)
    }
    return ids
  }
  if (parseReplySuggestionTokens(props.body).length > 0) {
    return ids
  }
  if (stripReplySuggestions(props.body)) ids.add('whole')
  return ids
}

function rebuildPromptFromSelection() {
  if (manualMode.value) return
  const parts: string[] = []
  for (const f of fragments.value) {
    if (selectedFragmentIds.value.has(f.id)) parts.push(f.text)
  }
  prompt.value = parts.join('\n\n')
}

function toggleFragment(id: string) {
  // Re-enable auto-rebuild as soon as the operator interacts with chips —
  // their intent is back on chip-driven assembly, even if they typed earlier.
  manualMode.value = false
  const next = new Set(selectedFragmentIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedFragmentIds.value = next
  rebuildPromptFromSelection()
}

function handlePromptInput(value: string) {
  prompt.value = value
  manualMode.value = true
}

const canSubmit = computed(() => {
  if (submitting.value) return false
  if (!projectId.value) return false
  if (!slug.value) return false
  if (!prompt.value.trim()) return false
  return true
})

const promptHint = computed(() => {
  if (manualMode.value) return 'Ручной режим — текст редактируется вручную'
  if (!fragments.value.length) return 'Сообщение пустое — заполните prompt вручную'
  if (!selectedFragmentIds.value.size) return 'Выберите хотя бы один фрагмент или начните печатать вручную'
  return 'Соберите prompt из фрагментов или поправьте текст руками'
})

watch(
  () => [props.open, props.messageId, props.body],
  ([open]) => {
    if (!open) return
    error.value = null
    submitting.value = false
    launchStatus.value = 'idle'
    slug.value = buildSlug(props.messageId, props.conversationSlug ?? null)
    workroom.value = ''
    projectId.value = props.defaultProjectId ?? null
    selectedFragmentIds.value = pickDefaultSelection()
    manualMode.value = false
    rebuildPromptFromSelection()
    void (async () => {
      if (projectsModel.projects.value.length === 0) {
        try { await projectsModel.refresh() } catch { /* keep picker empty */ }
      }
      if (!projectId.value && projectsModel.projects.value.length === 1) {
        projectId.value = projectsModel.projects.value[0]?.id ?? null
      }
    })()
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
      agentId: props.defaultAgentId ?? undefined,
    })
    launchStatus.value = 'queued'

    // Daemon poll — kept from the old dialog. Purpose now is only to surface
    // spawn failures inline; success path no longer needs a snackbar because
    // the backend emits a persistent `system.agent_launched` bubble.
    const deadline = Date.now() + 15_000
    let outcome: 'spawn' | 'failed' | 'timeout' = 'timeout'
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500))
      let res
      try {
        res = await cliSessions.quickLaunchStatus(slug.value)
      } catch {
        continue
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

    if (outcome === 'spawn' || outcome === 'timeout') {
      emit('launched', { slug: slug.value })
      emit('close')
    }
    // 'failed': stay open with error displayed
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Не удалось поставить задачу в очередь'
    error.value = msg
    launchStatus.value = 'failed'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section v-if="open" class="quick-launch-panel" data-message-controls="true" @click.stop>
    <header class="quick-launch-panel__head">
      <div class="quick-launch-panel__title">
        <VIcon :size="18" class="mr-1">mdi-rocket-launch</VIcon>
        <span>Запустить агентом</span>
      </div>
      <VBtn
        size="x-small"
        variant="text"
        icon="mdi-close"
        title="Закрыть"
        :disabled="submitting"
        @click.stop="emit('close')"
      />
    </header>

    <p class="quick-launch-panel__hint">
      Соберите prompt из фрагментов исходного сообщения или отредактируйте текст вручную.
    </p>

    <VAlert v-if="error" type="error" variant="tonal" density="compact" class="quick-launch-panel__alert">
      {{ error }}
    </VAlert>

    <VAlert
      v-else-if="launchStatus === 'queued'"
      type="info"
      variant="tonal"
      density="compact"
      class="quick-launch-panel__alert"
    >
      Файл попал в очередь. Жду подтверждения от демона (до 15с)…
    </VAlert>

    <div class="quick-launch-panel__grid">
      <VSelect
        v-model="projectId"
        :items="projectItems"
        label="Проект"
        density="compact"
        variant="outlined"
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
        :rules="[v => /^[a-z0-9-]{1,40}$/.test(v) || 'Только a-z 0-9 -']"
      />
    </div>

    <div v-if="fragments.length" class="quick-launch-panel__fragments">
      <div class="quick-launch-panel__fragments-head">
        <VIcon :size="14">mdi-format-list-bulleted-square</VIcon>
        <span>Фрагменты сообщения</span>
      </div>
      <div class="quick-launch-panel__chips">
        <VChip
          v-for="f in fragments"
          :key="f.id"
          size="x-small"
          label
          :color="selectedFragmentIds.has(f.id) ? 'secondary' : 'surface-variant'"
          :variant="selectedFragmentIds.has(f.id) ? 'tonal' : 'outlined'"
          :prepend-icon="selectedFragmentIds.has(f.id) ? 'mdi-check' : undefined"
          class="quick-launch-panel__chip"
          @click="toggleFragment(f.id)"
        >
          {{ f.label }}
        </VChip>
      </div>
    </div>

    <VTextarea
      :model-value="prompt"
      label="Prompt"
      rows="6"
      density="compact"
      variant="outlined"
      hide-details
      @update:model-value="handlePromptInput"
    />
    <p class="quick-launch-panel__prompt-hint">{{ promptHint }}</p>

    <div class="quick-launch-panel__grid">
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
        hint="Оставьте пустым для запуска от main."
        persistent-hint
      />
    </div>

    <div class="quick-launch-panel__actions">
      <VBtn variant="text" size="small" :disabled="submitting" @click.stop="emit('close')">Отмена</VBtn>
      <VSpacer />
      <VBtn
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-rocket-launch"
        :loading="submitting"
        :disabled="!canSubmit"
        @click.stop="submit"
      >
        Запустить
      </VBtn>
    </div>
  </section>
</template>

<style scoped>
.quick-launch-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 640px;
  margin-top: 8px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface-variant), 0.18);
}

.quick-launch-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.quick-launch-panel__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.quick-launch-panel__hint {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}

.quick-launch-panel__alert {
  margin: 0;
}

.quick-launch-panel__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick-launch-panel__fragments {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.quick-launch-panel__fragments-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
}

.quick-launch-panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.quick-launch-panel__chip {
  cursor: pointer;
  max-width: 100%;
}

.quick-launch-panel__prompt-hint {
  margin: -4px 0 0;
  font-size: 0.72rem;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.85;
}

.quick-launch-panel__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 540px) {
  .quick-launch-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>
