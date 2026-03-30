<script setup lang="ts">
const auth = useMessengerAuth()
const props = withDefaults(defineProps<{
  mobile?: boolean
}>(), {
  mobile: false,
})

const calls = useMessengerCalls()
const settingsModel = useMessengerSettings()

const currentInterpretation = computed(() => calls.analysisInterpretations.value[calls.selectedAnalysisToolId.value] || '')
const currentAiInterpretation = computed(() => calls.aiAnalysisInterpretations.value[calls.selectedAnalysisToolId.value] || '')

onMounted(() => {
  if (auth.token.value && !settingsModel.aiSettingsReady.value) {
    void settingsModel.hydrateAiSettings(auth.request)
  }
})

async function updateAiAnalyticsEnabled(value: boolean) {
  settingsModel.aiSettings.value.analysisEnabled = value
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

        <div class="call-transcript-panel__content call-transcript-panel__content--scroll">
          <p v-if="calls.callReview.value?.cleanedTranscript" class="call-transcript-panel__text">{{ calls.callReview.value.cleanedTranscript }}</p>
          <template v-else>
            <p v-if="!calls.transcriptionEntries.value.length && !calls.transcriptionDraft.value" class="call-transcript-popup__empty">
              Ждём распознавание речи...
            </p>
            <article
              v-for="entry in calls.transcriptionEntries.value"
              :key="entry.id"
              class="call-transcript-line"
              :class="`call-transcript-line--${entry.speaker}`"
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
          <h5>2. Конспект и простой анализ</h5>
          <VMenu location="bottom end" :close-on-content-click="false">
            <template #activator="{ props: menuProps }">
              <VBtn
                class="call-transcript-popup__btn"
                size="small"
                variant="tonal"
                v-bind="menuProps"
              >
                ИИ
              </VBtn>
            </template>
            <VCard min-width="280" color="surface-container-high">
              <VCardText>
                <div class="setting-toggle setting-toggle--vuetify">
                  <span class="setting-toggle__copy"><span class="setting-field__label">Включить ИИ-аналитику</span></span>
                  <VSwitch
                    :model-value="settingsModel.aiSettings.value.analysisEnabled"
                    color="primary"
                    hide-details
                    inset
                    :loading="settingsModel.aiSettingsPending.value"
                    @update:model-value="updateAiAnalyticsEnabled(Boolean($event))"
                  />
                </div>
                <p class="call-transcript-popup__empty">
                  {{ settingsModel.aiConfigured.value.analysis ? 'Серверный ИИ-разбор доступен.' : 'Серверный ИИ-разбор пока не готов.' }}
                </p>
                <VBtn
                  block
                  class="mt-3"
                  size="small"
                  variant="flat"
                  color="primary"
                  :disabled="!settingsModel.aiSettings.value.analysisEnabled || !calls.callReview.value || calls.aiAnalysisRunning.value"
                  @click="calls.runAiAnalysisTool(calls.selectedAnalysisToolId.value)"
                >
                  Запустить ИИ-разбор
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
              <h5>3. ИИ-аналитика</h5>
            </header>
            <p v-if="!settingsModel.aiSettings.value.analysisEnabled" class="call-transcript-popup__empty">ИИ-аналитика выключена. Включите ее через кнопку ИИ.</p>
            <p v-else-if="calls.aiAnalysisError.value" class="call-transcript-popup__empty">{{ calls.aiAnalysisError.value }}</p>
            <p v-else-if="calls.aiAnalysisRunning.value" class="call-transcript-popup__empty">Строим ИИ-разбор...</p>
            <p v-else-if="currentAiInterpretation" class="call-transcript-panel__analysis">{{ currentAiInterpretation }}</p>
            <p v-else class="call-transcript-popup__empty">ИИ-разбор запускается отдельно и не заменяет простой анализ.</p>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>