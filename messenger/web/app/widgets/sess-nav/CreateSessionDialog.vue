<script setup lang="ts">
import { useMessengerCliSessions } from '../../entities/sessions/model/useMessengerCliSessions'
import { useMessengerProjectEngine } from '../../features/project-engine/model/useMessengerProjectEngine'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'spawned': [result: { slug: string; uuid: string; window: string }]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const cliSessions = useMessengerCliSessions()
const projectEngine = useMessengerProjectEngine()

const SLUG_RE = /^[a-z0-9-]{2,40}$/
const KIND_OPTIONS = [
  { title: 'Frontend UI', value: 'frontend-ui' },
  { title: 'Backend API', value: 'backend-api' },
  { title: 'Backend Module', value: 'backend-module' },
  { title: 'DB Migration', value: 'db-migration' },
  { title: 'Messenger Realtime', value: 'messenger-realtime' },
  { title: 'Tests', value: 'tests' },
  { title: 'Docs', value: 'docs' },
]
const MODEL_OPTIONS = [
  { title: 'Sonnet (default)', value: 'sonnet' },
  { title: 'Opus', value: 'opus' },
  { title: 'Haiku', value: 'haiku' },
]
const EFFORT_OPTIONS = [
  { title: 'Low', value: 'low' as const },
  { title: 'Medium (default)', value: 'medium' as const },
  { title: 'High', value: 'high' as const },
]

const slug = ref('')
const kind = ref<string>('frontend-ui')
const model = ref<string>('sonnet')
const workroom = ref('')
const prompt = ref('')
const effort = ref<'low' | 'medium' | 'high'>('medium')

const pending = ref(false)
const error = ref('')

const slugError = computed(() => {
  if (!slug.value) return 'Slug обязателен'
  if (!SLUG_RE.test(slug.value)) return 'Только строчные буквы, цифры и дефисы (2–40 символов)'
  return ''
})

const promptError = computed(() => {
  if (!prompt.value.trim()) return 'Prompt обязателен'
  return ''
})

const isValid = computed(() => !slugError.value && !promptError.value && !!kind.value)

const activeProjectId = computed(() => projectEngine.activeProject.value?.id ?? null)

function reset() {
  slug.value = ''
  kind.value = 'frontend-ui'
  model.value = 'sonnet'
  workroom.value = ''
  prompt.value = ''
  effort.value = 'medium'
  error.value = ''
  pending.value = false
}

watch(isOpen, (v) => { if (v) reset() })

async function submit() {
  if (!isValid.value || pending.value) return
  pending.value = true
  error.value = ''
  try {
    const result = await cliSessions.spawnSession({
      slug: slug.value,
      kind: kind.value,
      model: model.value || undefined,
      workroom: workroom.value || undefined,
      prompt: prompt.value.trim(),
      effort: effort.value,
      projectId: activeProjectId.value ?? undefined,
    })
    emit('spawned', result)
    isOpen.value = false
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('409') || msg.toLowerCase().includes('duplicate')) {
      error.value = `Сессия с slug «${slug.value}» уже существует.`
    }
    else {
      error.value = `Ошибка запуска: ${msg}`
    }
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <VDialog v-model="isOpen" max-width="520" scrollable>
    <VCard>
      <VCardTitle class="pa-4 pb-2 d-flex align-center gap-2">
        <VIcon color="primary">mdi-console-line</VIcon>
        Новая CLI-сессия
      </VCardTitle>

      <VCardText class="pa-4 pt-2 d-flex flex-column gap-3">
        <VTextField
          v-model="slug"
          label="Slug"
          placeholder="my-feature-ui"
          variant="outlined"
          density="compact"
          :error-messages="slug ? slugError : ''"
          hint="Строчные буквы, цифры, дефисы (2–40 символов)"
          persistent-hint
          autofocus
        />

        <VSelect
          v-model="kind"
          :items="KIND_OPTIONS"
          item-title="title"
          item-value="value"
          label="Kind"
          variant="outlined"
          density="compact"
          hide-details
        />

        <VTextarea
          v-model="prompt"
          label="Prompt"
          placeholder="Опишите задачу для агента…"
          variant="outlined"
          rows="4"
          auto-grow
          :error-messages="prompt ? promptError : ''"
        />

        <VTextField
          v-model="workroom"
          label="Workroom (необязательно)"
          placeholder="w1-feature-x"
          variant="outlined"
          density="compact"
          hide-details
        />

        <div class="d-flex gap-3">
          <VSelect
            v-model="model"
            :items="MODEL_OPTIONS"
            item-title="title"
            item-value="value"
            label="Model"
            variant="outlined"
            density="compact"
            hide-details
            class="flex-1-1"
          />
          <VSelect
            v-model="effort"
            :items="EFFORT_OPTIONS"
            item-title="title"
            item-value="value"
            label="Effort"
            variant="outlined"
            density="compact"
            hide-details
            class="flex-1-1"
          />
        </div>

        <p v-if="activeProjectId" class="text-caption text-on-surface-variant">
          <VIcon size="12" class="mr-1">mdi-folder-outline</VIcon>
          Project: {{ projectEngine.activeProject.value?.slug ?? activeProjectId }}
        </p>

        <VAlert v-if="error" type="error" density="compact" class="mt-1">{{ error }}</VAlert>
      </VCardText>

      <VCardActions class="pa-4 pt-0">
        <VBtn variant="text" @click="isOpen = false">Отмена</VBtn>
        <VSpacer />
        <VBtn
          color="primary"
          variant="flat"
          :loading="pending"
          :disabled="pending || !isValid"
          @click="submit()"
        >
          Запустить
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
