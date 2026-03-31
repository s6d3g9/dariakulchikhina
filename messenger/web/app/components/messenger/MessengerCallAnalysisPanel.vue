<script setup lang="ts">
const auth = useMessengerAuth()
const projectEngine = useMessengerProjectEngine()
const props = withDefaults(defineProps<{
  mobile?: boolean
}>(), {
  mobile: false,
})

const calls = useMessengerCalls()
const settingsModel = useMessengerSettings()

const currentInterpretation = computed(() => calls.analysisInterpretations.value[calls.selectedAnalysisToolId.value] || '')
const currentAiInterpretation = computed(() => calls.aiAnalysisInterpretations.value[calls.selectedAnalysisToolId.value] || '')
const apiInterpretationEnabled = computed(() => settingsModel.runtimeInterpretationProvider.value === 'api')
const projectSyncOptions = computed(() => projectEngine.projects.value.map(project => ({
  title: `${project.label} (${project.slug})`,
  value: project.slug,
})))
const activeProjectSyncLabel = computed(() => {
  const project = projectEngine.activeProject.value
  return project ? `${project.label} (${project.slug})` : ''
})

const transcriptScrollRef = ref<HTMLElement | null>(null)
let autoScrollTimeout: ReturnType<typeof setTimeout> | null = null

watch([calls.transcriptionEntries, calls.transcriptionDraft], () => {
  if (!transcriptScrollRef.value) return
  const el = transcriptScrollRef.value
  
  // Если пользователь не отмотал наверх сам, то автоматически скроллим при новом тексте
  const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
  
  if (isNearBottom) {
    if (autoScrollTimeout) clearTimeout(autoScrollTimeout)
    autoScrollTimeout = setTimeout(() => {
      if (transcriptScrollRef.value) {
        transcriptScrollRef.value.scrollTo({
          top: transcriptScrollRef.value.scrollHeight,
          behavior: 'auto'
        })
      }
    }, 100)
  }
}, { deep: true })

onMounted(() => {
  if (auth.token.value && !settingsModel.aiSettingsReady.value) {
    void settingsModel.hydrateAiSettings(auth.request)
  }

  if (auth.token.value && !projectEngine.projects.value.length && !projectEngine.pending.value) {
    void projectEngine.refresh()
  }
})

async function updateAiAnalyticsEnabled(value: boolean) {
  settingsModel.aiSettings.value.interpretationProvider = value ? 'api' : 'algorithm'
  if (auth.token.value) {
    await settingsModel.persistAiSettings(auth.request)
  }
}

function formatTranscriptTime(value: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function formatProjectSyncDate(value?: number) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function setProjectSyncSlug(value: string | null) {
  calls.projectSyncProjectSlug.value = typeof value === 'string' ? value.trim() : ''
}

function useActiveProjectSlug() {
  if (!projectEngine.activeProject.value?.slug) {
    return
  }

  calls.projectSyncProjectSlug.value = projectEngine.activeProject.value.slug
}

async function syncCallReviewToProject() {
  await calls.syncCallReviewToProject({
    projectSlug: calls.projectSyncProjectSlug.value,
  })
}

async function applyCallReviewToProjectSprint() {
  await calls.applyCallReviewToProjectSprint({
    projectSlug: calls.projectSyncProjectSlug.value,
  })
}
</script>

<template>
  <aside
    class="call-transcript-popup"
    :class="{ 'call-transcript-popup--mobile': mobile }"
    aria-label="Транскрибация звонка"
  >
    <div class="call-transcript-popup__head">
      <div>
        <p class="call-transcript-popup__eyebrow">Анализ звонка</p>
        <h4>{{ calls.activeCall.value ? 'Диалог в реальном времени' : 'Итоги завершённого звонка' }}</h4>
        <p class="call-transcript-popup__status">{{ calls.transcriptionError.value || calls.transcriptionHint.value }}</p>
      </div>
      <div class="call-transcript-popup__actions">
        <VBtn
          class="call-transcript-popup__btn"
          size="small"
          variant="tonal"
          :disabled="!calls.transcriptionSupported.value"
          @click="calls.transcriptionActive.value ? calls.stopTranscription() : calls.startTranscription()"
        >
          {{ calls.transcriptionActive.value ? 'Пауза' : 'Старт' }}
        </VBtn>
        <VBtn
          class="call-transcript-popup__btn"
          size="small"
          variant="text"
          :disabled="!calls.transcriptionEntries.value.length && !calls.transcriptionDraft.value"
          @click="calls.clearTranscription()"
        >
          Очистить
        </VBtn>
        <VBtn
          v-if="calls.callReview.value"
          class="call-transcript-popup__btn"
          size="small"
          variant="text"
          @click="calls.clearCallReview()"
        >
          Скрыть
        </VBtn>
        <VBtn
          class="call-transcript-popup__btn"
          size="small"
          variant="text"
          @click="calls.closeAnalysisPanel()"
        >
          Закрыть
        </VBtn>
      </div>
    </div>

    <div class="call-transcript-popup__body">
      <section class="call-transcript-panel">
        <header class="call-transcript-panel__header">
          <h5>1. Чистая транскрипция</h5>
          <span v-if="calls.callReview.value" class="call-transcript-panel__meta">{{ calls.callReview.value.sourceLines }} реплик</span>
        </header>

        <div class="call-transcript-panel__content call-transcript-panel__content--scroll" ref="transcriptScrollRef">
          <p v-if="calls.callReview.value?.cleanedTranscript" class="call-transcript-panel__text">{{ calls.callReview.value.cleanedTranscript }}</p>
          <template v-else>
            <p v-if="!calls.transcriptionEntries.value.length && !calls.transcriptionDraft.value" class="call-transcript-popup__empty">
              Ждём распознавание речи...
            </p>
            <article
              v-for="entry in calls.transcriptionEntries.value"
              :key="entry.id"
              class="call-transcript-line"
              :class="[`call-transcript-line--${entry.speaker}`, { 'call-transcript-line--draft': !entry.final }]"
            >
              <header class="call-transcript-line__meta">
                <span>{{ entry.speaker === 'peer' ? 'Собеседник' : 'Вы' }}</span>
                <time>{{ formatTranscriptTime(entry.createdAt) }}</time>
              </header>
              <p>{{ entry.text }}</p>
            </article>
            <article v-if="calls.transcriptionDraft.value" class="call-transcript-line call-transcript-line--draft">
              <header class="call-transcript-line__meta">
                <span>Распознаём...</span>
              </header>
              <p>{{ calls.transcriptionDraft.value }}</p>
            </article>
          </template>
        </div>
      </section>

      <section class="call-transcript-panel">
        <header class="call-transcript-panel__header">
          <h5>2. Конспект и алгоритмический разбор</h5>
          <VMenu location="bottom end" :close-on-content-click="false">
            <template #activator="{ props: menuProps }">
              <VBtn
                class="call-transcript-popup__btn"
                size="small"
                variant="tonal"
                v-bind="menuProps"
              >
                API
              </VBtn>
            </template>
            <VCard min-width="280" color="surface-container-high">
              <VCardText>
                <div class="setting-toggle setting-toggle--vuetify">
                  <span class="setting-toggle__copy"><span class="setting-field__label">Дополнительный API-разбор</span></span>
                  <VSwitch
                    :model-value="apiInterpretationEnabled"
                    color="primary"
                    hide-details
                    inset
                    :loading="settingsModel.aiSettingsPending.value"
                    @update:model-value="updateAiAnalyticsEnabled(Boolean($event))"
                  />
                </div>
                <p class="call-transcript-popup__empty">
                  {{ settingsModel.aiConfigured.value.analysis ? 'API-разбор доступен.' : 'API-разбор недоступен.' }}
                </p>
                <VBtn
                  block
                  class="mt-3"
                  size="small"
                  variant="flat"
                  color="primary"
                    :disabled="!apiInterpretationEnabled || !calls.callReview.value || calls.aiAnalysisRunning.value"
                  @click="calls.runAiAnalysisTool(calls.selectedAnalysisToolId.value)"
                >
                  Запустить API-разбор
                </VBtn>
              </VCardText>
            </VCard>
          </VMenu>
        </header>

        <div class="call-transcript-panel__content call-transcript-panel__content--scroll">
          <p v-if="calls.callReview.value?.summary" class="call-transcript-panel__summary">{{ calls.callReview.value.summary }}</p>
          <p v-else class="call-transcript-popup__empty">Конспект появится после завершения звонка.</p>

          <div class="call-transcript-popup__tool-rail" role="tablist" aria-label="Интерпретации разговора">
            <VBtn
              v-for="tool in calls.analysisTools.value"
              :key="tool.id"
              class="call-transcript-popup__tool-btn"
              size="small"
              :variant="calls.selectedAnalysisToolId.value === tool.id ? 'flat' : 'tonal'"
              :color="calls.selectedAnalysisToolId.value === tool.id ? 'primary' : undefined"
              @click="calls.runAnalysisTool(tool.id)"
            >
              {{ tool.title }}
            </VBtn>
          </div>

          <p v-if="calls.analysisError.value" class="call-transcript-popup__empty">{{ calls.analysisError.value }}</p>
          <p v-else-if="calls.analysisRunning.value" class="call-transcript-popup__empty">Строим интерпретацию...</p>
          <p v-else-if="currentInterpretation" class="call-transcript-panel__analysis">{{ currentInterpretation }}</p>

          <div class="mt-4">
            <header class="call-transcript-panel__header">
              <h5>3. API-разбор</h5>
            </header>
            <p v-if="!apiInterpretationEnabled" class="call-transcript-popup__empty">API-разбор выключен. Базовый алгоритмический разбор работает без него.</p>
            <p v-else-if="calls.aiAnalysisError.value" class="call-transcript-popup__empty">{{ calls.aiAnalysisError.value }}</p>
            <p v-else-if="calls.aiAnalysisRunning.value" class="call-transcript-popup__empty">Строим API-разбор...</p>
            <p v-else-if="currentAiInterpretation" class="call-transcript-panel__analysis">{{ currentAiInterpretation }}</p>
            <p v-else class="call-transcript-popup__empty">API-разбор запускается отдельно и не заменяет базовый алгоритм.</p>
          </div>

          <div class="mt-4 call-transcript-project-sync">
            <header class="call-transcript-panel__header">
              <h5>4. В проект</h5>
              <VBtn
                v-if="projectEngine.activeProject.value?.slug"
                class="call-transcript-popup__btn"
                size="small"
                variant="text"
                @click="useActiveProjectSlug"
              >
                active project
              </VBtn>
            </header>

            <p class="call-transcript-popup__empty">
              Конспект и транскрипт уйдут в основной проектный API. Если основная сессия проекта не открыта, сервер вернёт ошибку доступа.
            </p>

            <VCombobox
              :model-value="calls.projectSyncProjectSlug.value"
              :items="projectSyncOptions"
              item-title="title"
              item-value="value"
              label="Slug проекта"
              variant="outlined"
              clearable
              hide-details="auto"
              @update:model-value="setProjectSyncSlug"
            />

            <p v-if="activeProjectSyncLabel" class="call-transcript-popup__empty">
              Активный project-engine: {{ activeProjectSyncLabel }}
            </p>

            <div class="call-transcript-project-sync__actions">
              <VBtn
                class="call-transcript-popup__btn"
                size="small"
                variant="tonal"
                :loading="projectEngine.pending.value"
                @click="projectEngine.refresh()"
              >
                обновить список
              </VBtn>
              <VBtn
                class="call-transcript-popup__btn"
                size="small"
                variant="flat"
                color="primary"
                :disabled="!calls.callReview.value || !calls.projectSyncProjectSlug.value.trim() || calls.projectSyncPending.value"
                :loading="calls.projectSyncPending.value"
                @click="syncCallReviewToProject"
              >
                {{ calls.callReview.value?.syncedProjectSlug === calls.projectSyncProjectSlug.value.trim() ? 'обновить в проекте' : 'добавить в проект' }}
              </VBtn>
              <VBtn
                class="call-transcript-popup__btn"
                size="small"
                variant="tonal"
                color="primary"
                :disabled="!calls.callReview.value || !calls.projectSyncProjectSlug.value.trim() || calls.projectTaskSyncPending.value"
                :loading="calls.projectTaskSyncPending.value"
                @click="applyCallReviewToProjectSprint"
              >
                {{ calls.callReview.value?.syncedProjectSlug === calls.projectSyncProjectSlug.value.trim() && calls.callReview.value?.syncedInsightId ? 'в задачи спринта' : 'в проект и задачи' }}
              </VBtn>
            </div>

            <p v-if="calls.projectSyncError.value" class="call-transcript-project-sync__feedback call-transcript-project-sync__feedback--error">
              {{ calls.projectSyncError.value }}
            </p>
            <p v-else-if="calls.projectSyncStatus.value" class="call-transcript-project-sync__feedback call-transcript-project-sync__feedback--success">
              {{ calls.projectSyncStatus.value }}
            </p>

            <p v-if="calls.projectTaskSyncError.value" class="call-transcript-project-sync__feedback call-transcript-project-sync__feedback--error">
              {{ calls.projectTaskSyncError.value }}
            </p>
            <p v-else-if="calls.projectTaskSyncStatus.value" class="call-transcript-project-sync__feedback call-transcript-project-sync__feedback--success">
              {{ calls.projectTaskSyncStatus.value }}
            </p>

            <p v-if="calls.callReview.value?.syncedProjectSlug" class="call-transcript-popup__empty">
              Уже отправлено: {{ calls.callReview.value.syncedProjectSlug }}<span v-if="calls.callReview.value.syncedAt"> · {{ formatProjectSyncDate(calls.callReview.value.syncedAt) }}</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>