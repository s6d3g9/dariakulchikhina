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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  // Emitted on successful drop into the queue. Parent uses this to surface a
  // snackbar with a deep-link to the monitor row.
  launched: [payload: { slug: string }]
}>()

const cliSessions = useMessengerCliSessions()
const balancing = useMessengerBalancing()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const slug = ref('')
const prompt = ref('')
const model = ref<'haiku' | 'sonnet' | 'opus'>('sonnet')
const workroom = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

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
  submitting.value = true
  error.value = null
  try {
    await cliSessions.quickLaunch({
      slug: slug.value,
      prompt: prompt.value,
      model: model.value,
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
            label="Workroom"
            density="compact"
            variant="outlined"
            hide-details
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
