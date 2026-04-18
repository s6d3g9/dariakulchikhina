<template>
  <div class="de-root">
    <!-- ══ Header ══ -->
    <div class="de-head">
      <button
        class="de-back"
        @click="handleBack"
      >
        ← {{ step === 0 ? 'к списку' : 'назад' }}
      </button>
      <div class="de-steps">
        <button
          v-for="(s, i) in STEPS"
          :key="i"
          class="de-step"
          :class="{ 'de-step--active': step === i, 'de-step--done': step > i }"
          @click="goToStep(i)"
        >
          <span class="de-step-num">{{ i + 1 }}</span>
          <span class="de-step-label">{{ s }}</span>
        </button>
      </div>
    </div>

    <!-- ══ Step 1: Choose template ══ -->
    <AdminDocumentEditorStepTemplate
      v-if="step === 0"
      :templates="templates"
      :selected-key="selectedTpl?.key"
      @select="(tpl: any) => { selectTemplate(tpl); goToStep(1) }"
    />

    <!-- ══ Step 2: Pick data sources + fields ══ -->
    <div
      v-if="step === 1"
      class="de-panel"
    >
      <div class="de-section-title">
        {{ selectedTpl?.icon }} {{ selectedTpl?.name }}
        <span class="de-section-subtitle">— заполнение данных</span>
      </div>

      <!-- Sources row + entity previews -->
      <AdminDocumentEditorSourcesPanel
        v-model:picked-project-slug="pickedProjectSlug"
        v-model:picked-designer-id="pickedDesignerId"
        v-model:picked-client-id="pickedClientId"
        v-model:picked-contractor-id="pickedContractorId"
        :projects="projects"
        :designers-list="designersList"
        :ctx="ctx"
        :loading-ctx="loadingCtx"
        :picked-designer="pickedDesigner"
        :picked-client="pickedClient"
        :picked-contractor="pickedContractor"
        :executor-saved="executorSaved"
        @load-context="loadContext"
        @apply-designer="applyDesignerData"
        @apply-client="applyClientData"
        @apply-contractor="applyContractorData"
        @save-executor="saveExecutorToStorage"
      />

      <!-- Fields + vars + actions -->
      <AdminDocumentEditorFieldsPanel
        v-model:vars-open="varsOpen"
        :selected-tpl="selectedTpl"
        :field-values="fieldValues"
        :field-auto-filled="fieldAutoFilled"
        :all-vars="allVars"
        @go-back="step = 0"
        @go-forward="goToStep(2)"
        @go-generate="goGenerateAndEdit"
        @insert-var="insertVar"
      />
    </div>

    <!-- ══ Step 3: Document editor ══ -->
    <div
      v-if="step === 2"
      class="de-panel de-panel--editor"
    >
      <div class="de-section-title">
        {{ selectedTpl?.icon }} {{ selectedTpl?.name }}
        <span class="de-section-subtitle">— редактор</span>
      </div>
      <div class="de-editor-toolbar">
        <div class="de-editor-btns">
          <button
            class="de-tbtn"
            @click="regenerateText"
          >
            ⟲ обновить
          </button>
          <button
            class="de-tbtn"
            @click="printDocument"
          >
            🖨 PDF
          </button>
          <button
            class="de-tbtn"
            @click="downloadTxt"
          >
            ⬇ .txt
          </button>
          <button
            class="de-tbtn"
            @click="copyToClipboard"
          >
            📋 копировать
          </button>
          <button
            class="de-tbtn"
            :class="{ 'de-tbtn--ai-active': varsOpen }"
            title="Переменные шаблона {{...}}"
            @click="varsOpen = !varsOpen"
          >
            &#123;&#123;&thinsp;&#125;&#125;
          </button>
          <span class="de-ai-sep">|</span>
          <button
            class="de-tbtn de-tbtn--ai"
            :disabled="aiLoading"
            :class="{ 'de-tbtn--ai-active': aiAction === 'generate' }"
            @click="onAiGenerate"
          >
            🤖 сгенерировать
          </button>
          <button
            class="de-tbtn de-tbtn--ai"
            :disabled="aiLoading"
            :class="{ 'de-tbtn--ai-active': aiAction === 'improve' }"
            @click="onAiImprove"
          >
            ✨ улучшить
          </button>
          <button
            class="de-tbtn de-tbtn--ai"
            :disabled="aiLoading"
            :class="{ 'de-tbtn--ai-active': aiAction === 'review' }"
            @click="onAiReview"
          >
            📋 проверить
          </button>
          <button
            v-if="aiLoading"
            class="de-tbtn de-tbtn--abort"
            @click="abortAi"
          >
            ✕ стоп
          </button>
          <button
            v-if="!aiLoading && aiTruncated"
            class="de-tbtn de-tbtn--continue"
            title="Модель остановилась по лимиту — догенерировать"
            @click="onContinueGeneration"
          >
            ▶ продолжить
          </button>
          <button
            class="de-tbtn"
            :class="{ 'de-tbtn--ai-active': chatVisible }"
            title="Показать/скрыть чат с ИИ"
            @click="chatVisible = !chatVisible"
          >
            💬 чат
          </button>
          <button
            class="de-tbtn de-tbtn--docx"
            :disabled="!editorContent || docxLoading"
            title="Скачать как Word (.docx)"
            @click="downloadDocx"
          >
            {{ docxLoading ? '⏳...' : '📄 .docx' }}
          </button>
          <span
            v-if="autoSaveStatus"
            class="de-autosave-status"
            :class="'de-autosave-status--' + autoSaveStatus"
          >
            <span v-if="autoSaveStatus === 'saving'">⏳ сохранение...</span>
            <span v-else-if="autoSaveStatus === 'saved'">✓ сохранено</span>
            <span v-else-if="autoSaveStatus === 'error'">⚠️ ошибка автосохранения</span>
          </span>
          <span class="de-ai-sep">|</span>
          <select
            v-model="selectedAiModel"
            class="de-model-sel"
            title="Выбрать AI-модель"
          >
            <optgroup label="Локальные (бесплатно)">
              <option value="">
                🏠 Авто (локальная)
              </option>
              <option value="gemma3:27b">
                🏠 Gemma 3 27B (документы)
              </option>
              <option value="qwen3:4b">
                🏠 Qwen3 4B (чат, быстро)
              </option>
            </optgroup>
            <optgroup label="Anthropic Claude">
              <option value="claude-haiku-4-5-20251001">
                ☁️ Claude Haiku 4.5 (дешевле)
              </option>
              <option value="claude-sonnet-4-5-20250929">
                ☁️ Claude Sonnet 4.5 (рек.)
              </option>
              <option value="claude-sonnet-4-6">
                ☁️ Claude Sonnet 4.6 (новинка)
              </option>
            </optgroup>
          </select>
        </div>
        <div
          v-if="aiProgress"
          class="de-ai-progress"
        >
          <div class="de-ai-progress-row">
            <span
              v-if="aiLoading"
              class="de-ai-dot"
            />
            <span
              v-else
              class="de-ai-done-icon"
            >✓</span>
            <span class="de-ai-text">{{ aiProgress }}</span>
            <template v-if="aiLoading">
              <span class="de-ai-sep">·</span>
              <span class="de-ai-elapsed">⏱ {{ aiElapsed }}с</span>
              <template v-if="aiTokenCount > 0">
                <span class="de-ai-sep">·</span>
                <span class="de-ai-chars">{{ aiTokenCount.toLocaleString('ru') }} симв</span>
              </template>
            </template>
          </div>
          <!-- Фазовый блок: пока нет токенов -->
          <div
            v-if="aiLoading && aiTokenCount === 0"
            class="de-ai-phase"
          >
            <div class="de-ai-phase-track">
              <div
                class="de-ai-phase-fill"
                :style="{ width: aiPrefillPct + '%' }"
              />
              <div class="de-ai-phase-labels">
                <span :class="{ active: aiElapsed >= 0 }">&#x25cf; инит</span>
                <span :class="{ active: aiElapsed >= 5 }">&#x25cf; контекст</span>
                <span :class="{ active: aiElapsed >= 15 }">&#x25cf; обработка</span>
                <span :class="{ active: aiElapsed >= 30 }">&#x25cf; генерация</span>
              </div>
            </div>
            <div
              v-if="aiPhaseHint"
              class="de-ai-phase-hint"
            >
              {{ aiPhaseHint }}
            </div>
          </div>
        </div>
        <div
          v-else-if="copyMsg"
          class="de-copy-msg"
        >
          {{ copyMsg }}
        </div>
      </div>
      <!-- AI: прогресс-бар -->
      <div
        v-if="aiLoading"
        class="de-ai-bar"
      >
        <div class="de-ai-bar-fill" />
      </div>

      <!-- ══ Панель переменных ══ -->
      <Transition name="de-vars-slide">
        <GlassSurface
          v-if="varsOpen"
          class="de-vars-panel "
        >
          <div class="de-vars-panel-head">
            <span class="de-vars-panel-title">&#123;&#123;&thinsp;&#125;&#125; Переменные шаблона</span>
            <span class="de-vars-panel-hint">Кликните — вставить в позицию курсора · или скопировать</span>
            <button
              class="de-tbtn"
              @click="varsOpen = false"
            >
              ✕
            </button>
          </div>
          <div class="de-vars-panel-grid">
            <div
              v-for="v in allVars"
              :key="v.key"
              class="de-var-item"
              :class="{ 'de-var-item--empty': !v.value }"
              @click="insertVar(v.key)"
            >
              <code class="de-var-key">{{ '{' }}{{ '{' }}{{ v.key }}{{ '}' }}{{ '}' }}</code>
              <span class="de-var-val">{{ v.value || '—' }}</span>
            </div>
          </div>
        </GlassSurface>
      </Transition>

      <!-- ══ Двухколоночный layout: редактор + чат ══ -->
      <div
        class="de-editor-body"
        :class="{ 'de-editor-body--with-chat': chatVisible }"
      >
        <div class="de-editor-col">
          <!-- ─ Режим split: слева оригинал, справа стрим ─ -->
          <div
            v-if="diffMode === 'streaming'"
            class="de-diff-split"
          >
            <div class="de-diff-pane de-diff-pane--orig">
              <div class="de-diff-pane-label">
                Оригинал
              </div>
              <GlassSurface class="de-editor-wrap ">
                <div class="de-editor de-editor--readonly">
                  {{ diffOriginal }}
                </div>
              </GlassSurface>
            </div>
            <div class="de-diff-pane de-diff-pane--new">
              <div class="de-diff-pane-label">
                Генерируется<span class="de-diff-cursor">█</span>
              </div>
              <GlassSurface class="de-editor-wrap ">
                <div
                  ref="diffNewEl"
                  class="de-editor de-editor--readonly"
                >
                  {{ diffNew }}
                </div>
              </GlassSurface>
            </div>
          </div>

          <!-- ─ Режим diff-review: inline diff ─ -->
          <div
            v-else-if="diffMode === 'review'"
            class="de-diff-review"
          >
            <GlassSurface class="de-diff-controls ">
              <span class="de-diff-stat">
                <span class="de-diff-stat-add">+{{ diffStats.added }} слов</span>
                <span class="de-diff-stat-del">−{{ diffStats.removed }} слов</span>
              </span>
              <button
                class="de-btn-accept"
                @click="acceptDiff"
              >
                ✓ Принять изменения
              </button>
              <button
                class="de-btn-reject"
                @click="rejectDiff"
              >
                × Отменить
              </button>
            </GlassSurface>
            <GlassSurface class="de-editor-wrap ">
              <div class="de-editor de-editor--readonly de-editor--diff">
                <template
                  v-for="(seg, i) in diffResult"
                  :key="i"
                >
                  <del
                    v-if="seg.type === 'del'"
                    class="de-diff-del"
                  >{{ seg.text }}</del>
                  <ins
                    v-else-if="seg.type === 'ins'"
                    class="de-diff-ins"
                  >{{ seg.text }}</ins>
                  <span v-else>{{ seg.text }}</span>
                </template>
              </div>
            </GlassSurface>
          </div>

          <!-- ─ Обычный режим ─ -->
          <GlassSurface
            v-else
            class="de-editor-wrap "
          >
            <div
              ref="editorEl"
              class="de-editor"
              contenteditable="true"
              spellcheck="true"
              @input="onEditorInput"
            />
          </GlassSurface>
        </div><!-- /de-editor-col -->

        <!-- ══ Чат-панель Gemma ══ -->
        <Transition name="de-chat-slide">
          <div
            v-if="chatVisible"
            class="de-chat-panel glass-surface"
          >
            <div class="de-chat-header">
              <div class="de-chat-header-left">
                <span class="de-chat-avatar">🤖</span>
                <div>
                  <div class="de-chat-title">
                    Gemma 3 · 27B
                  </div>
                  <div class="de-chat-subtitle">
                    {{ selectedAiModel.startsWith('claude-') ? '☁️ Anthropic' : '🏠 локальная' }} · {{ selectedAiModelLabel.replace(/^[🏠☁️]+\s*/,'') }} · {{ aiLoading ? 'печатает...' : 'онлайн' }}
                  </div>
                </div>
              </div>
              <button
                class="de-tbtn"
                title="Очистить историю"
                @click="clearChat"
              >
                🗑
              </button>
            </div>
            <div
              ref="chatEl"
              class="de-chat-messages"
            >
              <div
                v-if="!chatMessages.length"
                class="de-chat-empty"
              >
                <div class="de-chat-empty-icon">
                  🤖
                </div>
                <div class="de-chat-empty-text">
                  Нажми <strong>🤖 сгенерировать</strong>, <strong>✨ улучшить</strong> или <strong>📋 проверить</strong> — или напиши своё пожелание в поле ниже.
                </div>
              </div>
              <div
                v-for="msg in chatMessages"
                :key="msg.id"
                class="de-chat-msg"
                :class="'de-chat-msg--' + msg.role"
              >
                <div
                  v-if="msg.role === 'user'"
                  class="de-chat-bubble de-chat-bubble--user"
                >
                  <span class="de-chat-action-badge">{{ msg.actionLabel }}</span>
                  <span class="de-chat-time">{{ msg.time }}</span>
                </div>
                <div
                  v-else
                  class="de-chat-bubble de-chat-bubble--gemma"
                >
                  <div class="de-chat-bubble-content">
                    <span
                      v-if="msg.streaming && !msg.text && msg.charCount === 0"
                      class="de-chat-typing"
                    >
                      <span /><span /><span />
                    </span>
                    <span
                      v-else-if="msg.streaming && !msg.text && msg.charCount > 0"
                      class="de-chat-editing"
                    >
                      ✏️ редактирую... ({{ msg.charCount }} симв.)
                    </span>
                    <span
                      v-else
                      class="de-chat-text"
                    >{{ msg.text }}</span><span
                      v-if="msg.streaming && msg.text"
                      class="de-chat-cursor"
                    >▌</span>
                  </div>
                  <div class="de-chat-bubble-meta">
                    <span
                      v-if="msg.done"
                      class="de-chat-done"
                    >✓ {{ msg.charCount }} симв.</span>
                    <span
                      v-else-if="msg.streaming"
                      class="de-chat-writing"
                    >{{ msg.charCount > 0 ? msg.charCount + ' симв.' : '' }}</span>
                    <span
                      v-if="msg.elapsed != null"
                      class="de-chat-elapsed"
                    >⏱ {{ msg.elapsed }}с</span>
                    <span class="de-chat-time">{{ msg.time }}</span>
                  </div>
                  <button
                    v-if="false"
                    class="de-chat-apply-btn"
                    @click="applyFromChat(msg._applyText!)"
                  >
                    ✓ Применить в редактор
                  </button>
                </div>
              </div>
            </div>
            <!-- ── Быстрые команды ── -->
            <div class="de-chat-chips">
              <button
                v-for="chip in chatChips"
                :key="chip.label"
                class="de-chip"
                :disabled="aiLoading"
                @click="applyChip(chip.tpl)"
              >
                {{ chip.label }}
              </button>
            </div>
            <!-- ── Поле ввода ── -->
            <div class="de-chat-input-bar">
              <textarea
                ref="chatInputEl"
                v-model="chatInput"
                class="de-chat-input"
                :placeholder="aiLoading ? 'Модель печатает...' : 'замени [старое] на [новое] · или задайте вопрос...'"
                :disabled="aiLoading"
                rows="1"
                @keydown.enter.exact.prevent="onSendChatMessage"
                @input="(e: Event) => { const t = e.target as HTMLTextAreaElement; t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,120)+'px' }"
              />
              <button
                class="de-chat-send"
                :disabled="aiLoading || !chatInput.trim()"
                title="Отправить (Enter)"
                @click="onSendChatMessage"
              >
                ➤
              </button>
            </div>
          </div>
        </Transition>
      </div><!-- /de-editor-body -->

      <!-- AI: панель замечаний (review) -->
      <Transition name="de-slide">
        <GlassSurface
          v-if="aiReviewNotes.length"
          class="de-ai-review "
        >
          <div class="de-ai-review-head">
            <span class="de-ai-review-title">📋 Gemma 27B — анализ документа</span>
            <button
              class="de-tbtn"
              @click="clearReview"
            >
              ✕
            </button>
          </div>
          <div
            v-for="(note, i) in aiReviewNotes"
            :key="i"
            class="de-ai-note"
            :class="'de-ai-note--' + note.type"
          >
            <span class="de-ai-note-icon">{{ note.type === 'error' ? '⚠️' : '💡' }}</span>
            <span class="de-ai-note-text">{{ note.text }}</span>
          </div>
        </GlassSurface>
      </Transition>

      <!-- AI: правовые источники (RAG citations) -->
      <Transition name="de-slide">
        <GlassSurface
          v-if="aiCitations.length"
          class="de-citations "
        >
          <div class="de-citations-head">
            <span class="de-citations-title">⚖️ Правовая база — использованные нормы</span>
            <span class="de-citations-count">{{ aiCitations.length }}</span>
            <button
              class="de-tbtn"
              @click="clearCitations"
            >
              ✕
            </button>
          </div>
          <div
            v-for="(c, i) in aiCitations"
            :key="i"
            class="de-citation-row"
          >
            <div class="de-citation-ref">
              <span class="de-citation-source">{{ c.source_name }}</span>
              <span
                v-if="c.article_num"
                class="de-citation-article"
              >ст.&nbsp;{{ c.article_num }}</span>
              <span
                v-if="c.article_title"
                class="de-citation-title"
              >{{ c.article_title }}</span>
              <span class="de-citation-sim">{{ Math.round(c.similarity * 100) }}% совпадение</span>
            </div>
            <p class="de-citation-text">
              {{ c.text }}
            </p>
          </div>
        </GlassSurface>
      </Transition>

      <!-- AI: ошибка -->
      <Transition name="de-toast">
        <div
          v-if="aiError"
          class="de-toast de-toast--err"
        >
          ✗ {{ aiError }}
        </div>
      </Transition>

      <div class="de-actions">
        <GlassButton
          variant="secondary"
          density="compact"
          @click="step = 1"
        >
          ← поля
        </GlassButton>
        <GlassButton
          variant="secondary"
          density="compact"
          @click="printDocument"
        >
          🖨 PDF
        </GlassButton>
        <GlassButton
          variant="secondary"
          density="compact"
          @click="downloadTxt"
        >
          ⬇ .txt
        </GlassButton>
        <GlassButton
          variant="primary"
          :disabled="saving"
          @click="saveDocument"
        >
          {{ saving ? 'сохраняется...' : '✓ сохранить документ' }}
        </GlassButton>
      </div>
      <Transition name="de-toast">
        <div
          v-if="saveMsg"
          class="de-toast"
          :class="saveMsgType === 'ok' ? 'de-toast--ok' : 'de-toast--err'"
        >
          {{ saveMsg }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDocumentEditorSources, EXECUTOR_DEFAULTS } from '~/composables/useDocumentEditorSources'
import type { DocumentTemplate } from '~/composables/useDocumentEditorSources'
import { useDocumentEditorFields } from '~/composables/useDocumentEditorFields'
import AdminDocumentEditorSourcesPanel from './AdminDocumentEditorSourcesPanel.vue'
import AdminDocumentEditorFieldsPanel from './AdminDocumentEditorFieldsPanel.vue'

const props = defineProps<{
  templates: Array<DocumentTemplate>
  projects: Array<{ slug: string; title: string }>
  /** Если передан — редактор открывается с готовым содержимым существующего документа */
  existingDoc?: { id: number; content: string; templateKey?: string | null; projectSlug?: string | null } | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const STEPS = ['Шаблон', 'Данные', 'Редактор']

// ── Coordinator-owned state ──
const step = ref(0)
const selectedTpl = ref<DocumentTemplate | null>(null)
const fieldValues = ref<Record<string, string>>({})
const fieldAutoFilled = ref<Record<string, boolean>>({})
const editorContent = ref('')
const editorEl      = ref<HTMLDivElement | null>(null)
const diffNewEl     = ref<HTMLDivElement | null>(null)
const saving        = ref(false)
const copyMsg       = ref('')
const saveMsg       = ref('')
const saveMsgType   = ref<'ok' | 'err'>('ok')

// ── Diff-состояние (для «улучшить») ──
const diffMode     = ref<'' | 'streaming' | 'review'>('')
const diffOriginal = ref('')
const diffNew      = ref('')

// ── Step 1: data sources + apply-entity handlers ──
const {
  pickedProjectSlug,
  pickedClientId,
  pickedContractorId,
  pickedDesignerId,
  designersList,
  executorSaved,
  ctx,
  loadingCtx,
  pickedClient,
  pickedContractor,
  pickedDesigner,
  loadContext,
  ensureDesignersLoaded,
  applyClientData,
  applyContractorData,
  applyDesignerData,
  saveExecutorToStorage,
  loadExecutorFromStorage,
} = useDocumentEditorSources({
  selectedTpl,
  fieldValues,
  fieldAutoFilled,
})

// ── Step 2: field values + derived + template vars ──
const {
  varsOpen,
  computedRemaining,
  allVars,
  insertVar,
  generateText,
  computeDerivedFields,
} = useDocumentEditorFields({
  selectedTpl,
  fieldValues,
  fieldAutoFilled,
  ctx,
  editorEl,
  editorContent,
  step,
  copyMsg,
})

type DiffSeg = { type: 'equal' | 'del' | 'ins'; text: string }

function computeWordDiff(oldText: string, newText: string): DiffSeg[] {
  const tok = (s: string) => s.match(/[^\s]+|\s+/g) ?? []
  const a = tok(oldText), b = tok(newText)
  if (a.length * b.length > 150_000) {
    return [{ type: 'del', text: oldText }, { type: 'ins', text: newText }]
  }
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1])
  const segs: DiffSeg[] = []
  let i = 0, j = 0
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) { segs.push({ type: 'equal', text: a[i++] }); j++ }
    else if (j < n && (i >= m || dp[i][j+1] >= (dp[i+1]?.[j] ?? 0))) { segs.push({ type: 'ins', text: b[j++] }) }
    else { segs.push({ type: 'del', text: a[i++] }) }
  }
  return segs.reduce<DiffSeg[]>((acc, s) => {
    const last = acc[acc.length - 1]
    if (last && last.type === s.type) { last.text += s.text; return acc }
    acc.push({ ...s }); return acc
  }, [])
}

const diffResult = computed<DiffSeg[]>(() =>
  diffMode.value === 'review' ? computeWordDiff(diffOriginal.value, diffNew.value) : []
)
const diffStats = computed(() => ({
  added:   diffResult.value.filter(s => s.type === 'ins').reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0),
  removed: diffResult.value.filter(s => s.type === 'del').reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0),
}))

function acceptDiff() {
  editorContent.value = diffNew.value
  if (editorEl.value) editorEl.value.innerText = editorContent.value
  diffMode.value = ''; diffOriginal.value = ''; diffNew.value = ''
}
function rejectDiff() {
  editorContent.value = diffOriginal.value
  if (editorEl.value) editorEl.value.innerText = editorContent.value
  diffMode.value = ''; diffOriginal.value = ''; diffNew.value = ''
}

// ── Утилита: убрать markdown-разметку из текста ──
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')          // # заголовки
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold italic***
    .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold**
    .replace(/\*(.+?)\*/g, '$1')          // *italic*
    .replace(/~~(.+?)~~/g, '$1')          // ~~strike~~
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, '')) // `code`
    .replace(/^[-*_]{3,}\s*$/gm, '──────────────────────────────') // --- → читаемый разделитель
    .replace(/^[ \t]*[>][ \t]?/gm, '')   // > цитаты
    .replace(/^[ \t]*[-*+]\s+/gm, '• ')  // - list → bullet
    .replace(/^\d+\.\s+/gm, (m, o, s) => m) // нумерованные списки оставляем
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url)
    .trim()
}

// ── Navigation ──
function handleBack() {
  if (step.value > 0) { step.value-- }
  else { emit('close') }
}

function selectTemplate(tpl: DocumentTemplate) {
  selectedTpl.value = tpl
  // Сбрасываем ID сохранённого документа — новый шаблон = новый документ
  savedDocId.value = null
  autoSaveStatus.value = ''
  if (_autoSaveTimer) { clearTimeout(_autoSaveTimer); _autoSaveTimer = null }
  const vals: Record<string, string> = {}
  const auto: Record<string, boolean> = {}
  for (const f of tpl.fields) {
    vals[f.key] = fieldValues.value[f.key] || ''
    auto[f.key] = false
  }
  const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  for (const f of tpl.fields) {
    if ((f.key.includes('date') || f.key === 'date') && !vals[f.key]) {
      vals[f.key] = today
      auto[f.key] = true
    }
  }
  fieldValues.value = vals
  fieldAutoFilled.value = auto
  // Авто-заполняем поля исполнителя: сначала localStorage, потом дефолты
  const storedExecutor = loadExecutorFromStorage()
  for (const f of tpl.fields) {
    if (f.key.startsWith('executor_') && !vals[f.key]) {
      const val = storedExecutor[f.key] || EXECUTOR_DEFAULTS[f.key] || ''
      if (val) { vals[f.key] = val; auto[f.key] = true }
    }
  }
}

function goToStep(i: number) {
  if (i === 0) { step.value = 0; return }
  if (i >= 1 && !selectedTpl.value) return
  // Загружаем дизайнеров при переходе на шаг 1 (даже без проекта)
  if (i === 1) { ensureDesignersLoaded() }
  // syncEditorContent вызовет watch(step) ниже — не дублируем
  step.value = i
}

// Перейти в редактор и сразу запустить AI-генерацию (кнопка «🤖 сгенерировать →»)
async function goGenerateAndEdit() {
  goToStep(2)
  await nextTick()
  onAiGenerate()
}

function syncEditorContent() {
  computeDerivedFields()
  editorContent.value = generateText()
  nextTick(() => {
    if (editorEl.value) editorEl.value.innerText = editorContent.value
  })
}

function regenerateText() { syncEditorContent() }

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function buildPaymentTable(vals: Record<string,string>): string {
  const price = vals['price'] || '__________'
  const adv   = vals['advance_amount'] || computedRemaining.value ? (vals['advance_amount'] || '__________') : '__________'
  const rem   = computedRemaining.value || '__________'
  const advPct = vals['advance'] || '50'
  const advPctNum = parseFloat((vals['advance'] || '50').replace('%', '').replace(',', '.'))
  const remPct = isNaN(advPctNum) ? '50' : String(100 - advPctNum)
  return `<table class="pay-table">
<thead><tr><th>№</th><th>Платёж</th><th>Сумма, руб.</th><th>Срок</th></tr></thead>
<tbody>
<tr><td>1</td><td>Аванс (${advPct}%)</td><td>${adv}</td><td>При подписании договора</td></tr>
<tr><td>2</td><td>Доплата (${remPct}%)</td><td>${rem}</td><td>По окончании работ</td></tr>
<tr class="total-row"><td colspan="2"><b>Итого</b></td><td colspan="2"><b>${price}</b></td></tr>
</tbody></table>`
}

function renderLinesToHtml(lines: string[], vals: Record<string,string>): string {
  const out: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) { out.push('<div class="doc-gap"></div>'); continue }

    // All-caps section heading: "1. НАЗВАНИЕ РАЗДЕЛА"
    if (/^\d+(\.\d+)?\.\s+[А-ЯЁA-Z «»"\-–—\/]{4,}$/.test(t)) {
      out.push(`<div class="doc-section">${escHtml(t)}</div>`); continue
    }

    // Sub-point: "2.3. текст"
    if (/^\d+\.\d+\./.test(t)) {
      out.push(`<div class="doc-sub">${escHtml(line)}</div>`); continue
    }

    // Bullet / dash
    if (/^[•–—-]\s/.test(t)) {
      out.push(`<div class="doc-bullet">${escHtml(t)}</div>`); continue
    }

    // Payment schedule marker
    if (/оплат|платёж|стоимость.*работ/i.test(t) && t.includes('{{')) {
      out.push(`<div class="doc-line">${escHtml(t)}</div>`)
      out.push(buildPaymentTable(vals))
      continue
    }

    // Total marker — skip the placeholder line if we inserted the table
    if (t.startsWith('|') || /^\+[-+]+\+$/.test(t)) continue

    out.push(`<div class="doc-line">${escHtml(line)}</div>`)
  }
  return out.join('\n')
}

function printDocument() {
  const rawText = editorContent.value || generateText()
  const title   = selectedTpl.value?.name || 'Документ'
  const lines   = rawText.split('\n')
  const vals    = fieldValues.value

  const bodyHtml = renderLinesToHtml(lines, vals)

  const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>
    @page { size: A4; margin: 20mm 20mm 25mm 30mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }
    .doc-gap    { height: 6pt; }
    .doc-line   { text-align: justify; white-space: pre-wrap; margin-bottom: 2pt; }
    .doc-sub    { text-align: justify; white-space: pre-wrap; margin-bottom: 2pt; padding-left: 18pt; }
    .doc-bullet { padding-left: 18pt; margin-bottom: 2pt; }
    .doc-section {
      font-weight: bold; text-transform: uppercase;
      margin-top: 16pt; margin-bottom: 4pt; text-align: center;
    }
    .pay-table {
      width: 100%; border-collapse: collapse; margin: 10pt 0;
      font-size: 12pt;
    }
    .pay-table th, .pay-table td {
      border: 1px solid #000; padding: 4pt 6pt; text-align: left;
    }
    .pay-table thead th { background: #e8e8e8; font-weight: bold; }
    .pay-table .total-row td { font-weight: bold; background: #f5f5f5; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="doc-body">
${bodyHtml}
</div>
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(htmlContent)
    win.document.close()
  }
}

function onEditorInput() {
  if (editorEl.value) editorContent.value = editorEl.value.innerText
}

watch(step, (v) => { if (v === 2) syncEditorContent() })

// При смене проекта — сбрасываем ID автосохранения, чтобы новый документ
// привязался к правильному проекту
watch(pickedProjectSlug, () => {
  savedDocId.value = null
  autoSaveStatus.value = ''
})

// Если передан existingDoc — сразу открываем редактор с его содержимым
onMounted(() => {
  const doc = props.existingDoc
  if (!doc) return
  savedDocId.value = doc.id
  editorContent.value = doc.content
  if (doc.projectSlug) pickedProjectSlug.value = doc.projectSlug
  // Пробуем найти шаблон по templateKey
  if (doc.templateKey) {
    const tpl = props.templates.find(t => t.key === doc.templateKey)
    if (tpl) {
      selectTemplate(tpl)
    }
  }
  // Переходим сразу в редактор
  step.value = 2
  nextTick(() => {
    if (editorEl.value) editorEl.value.innerText = doc.content
  })
})

// ── Actions ──
function downloadTxt() {
  const text = editorContent.value || generateText()
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${selectedTpl.value?.name || 'document'}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(editorContent.value)
    copyMsg.value = '✓ скопировано'
    setTimeout(() => { copyMsg.value = '' }, 2000)
  } catch {
    copyMsg.value = '✗ ошибка'
    setTimeout(() => { copyMsg.value = '' }, 2000)
  }
}

// ── AI ──────────────────────────────────────────────────────────────────────
const { aiLoading, aiError, aiAction, aiProgress, aiElapsed, aiTokenCount, aiTruncated, aiReviewNotes, aiCitations, streamDocument, reviewDocument, abortAi, clearReview, clearCitations } = useAiDocument()

// Выбранная AI-модель
const AI_MODELS = [
  { value: '',                          label: '🏠 Авто (локальная)',         group: 'Локальные (бесплатно)' },
  { value: 'gemma3:27b',                label: '🏠 Gemma 3 27B (документы)',  group: 'Локальные (бесплатно)' },
  { value: 'qwen3:4b',                  label: '🏠 Qwen3 4B (чат, быстро)',   group: 'Локальные (бесплатно)' },
  { value: 'claude-haiku-4-5-20251001',  label: '☁️ Claude Haiku 4.5 (дешевле)', group: 'Anthropic Claude' },
  { value: 'claude-sonnet-4-5-20250929', label: '☁️ Claude Sonnet 4.5 (рек.)', group: 'Anthropic Claude' },
  { value: 'claude-sonnet-4-6',          label: '☁️ Claude Sonnet 4.6 (новинка)', group: 'Anthropic Claude' },
]
const selectedAiModel = ref('')
const selectedAiModelLabel = computed(() => AI_MODELS.find(m => m.value === selectedAiModel.value)?.label || '🤖 модель')

// Фазовые подсказки пока нет ни одного токена
const aiPhaseHint = computed(() => {
  if (!aiLoading.value || aiTokenCount.value > 0) return ''
  const s = aiElapsed.value
  if (aiAction.value === 'review') {
    if (s < 5)  return 'отправляет документ на анализ...'
    if (s < 20) return 'читает и оценивает содержимое...'
    if (s < 45) return 'проверяет юридические формулировки...'
    if (s < 80) return 'формулирует замечания... обычно 1–2 минуты'
    return 'почти готово — большой документ требует времени'
  }
  if (s < 5)  return 'инициализирует запрос...'
  if (s < 15) return 'загружает контекст в память...'
  if (s < 30) return 'оценивает данные проекта...'
  if (s < 50) return 'формирует структуру документа... обычно 30–60с'
  if (s < 80) return 'работает над деталями... почти готово'
  return 'большой документ — продолжает, не останавливайся'
})

// Прогресс 0–100 до первого токена (базовый эстимейт)
const aiPrefillPct = computed(() => {
  if (aiTokenCount.value > 0 || !aiLoading.value) return 100
  const estimate = aiAction.value === 'review' ? 120 : 90
  return Math.min(95, Math.round((aiElapsed.value / estimate) * 100))
})

// ── Чат-панель ────────────────────────────────────────────────────────────
interface ChatMsg {
  id: number
  role: 'user' | 'gemma'
  actionLabel: string
  text: string
  streaming: boolean
  done: boolean
  time: string
  charCount: number
  elapsed?: number   // секунды на генерацию ответа
  _startedAt?: number
  _applyText?: string
}
const chatVisible = ref(true)
const chatMessages = ref<ChatMsg[]>([])
const chatEl = ref<HTMLElement | null>(null)
const chatInputEl = ref<HTMLTextAreaElement | null>(null)
const chatInput = ref('')
let _chatIdSeq = 0

// ── Быстрые команды-заготовки ─────────────────────────────────────────────
const chatChips = [
  { label: '✏️ замени слово',      tpl: 'замени [старый текст] на [новый текст]' },
  { label: '💰 изменить сумму',    tpl: 'замени [старая сумма] на [новая сумма]' },
  { label: '📅 изменить дату',     tpl: 'замени [старая дата] на [новая дата]' },
  { label: '👤 изменить ФИО',      tpl: 'замени [старое ФИО] на [новое ФИО]' },
  { label: '📍 изменить адрес',    tpl: 'замени [старый адрес] на [новый адрес]' },
  { label: '➕ добавить пункт',    tpl: 'добавь пункт: [текст нового пункта]' },
  { label: '🗑 удалить фрагмент',  tpl: 'удали фрагмент: [точный текст для удаления]' },
  { label: '🔢 изменить номер',    tpl: 'замени [старый номер/срок] на [новый номер/срок]' },
]

function applyChip(tpl: string) {
  chatInput.value = tpl
  nextTick(() => {
    const el = chatInputEl.value
    if (!el) return
    el.focus()
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    // Выделяем первый [плейсхолдер]
    const start = tpl.indexOf('[')
    const end = tpl.indexOf(']') + 1
    if (start !== -1 && end > start) {
      el.setSelectionRange(start, end)
    }
  })
}

function _chatNow() {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function _chatScroll() {
  nextTick(() => { if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight })
}
function _chatPushUser(actionLabel: string) {
  chatMessages.value.push({ id: ++_chatIdSeq, role: 'user', actionLabel, text: '', streaming: false, done: true, time: _chatNow(), charCount: 0 })
  _chatScroll()
}
function _chatPushGemma(): ChatMsg {
  const msg: ChatMsg = { id: ++_chatIdSeq, role: 'gemma', actionLabel: '', text: '', streaming: true, done: false, time: _chatNow(), charCount: 0, _startedAt: Date.now() }
  chatMessages.value.push(msg)
  _chatScroll()
  return msg
}
function _chatToken(msg: ChatMsg, token: string) {
  msg.text += token
  msg.charCount = msg.text.length
  _chatScroll()
}
function _chatDone(msg: ChatMsg) {
  msg.streaming = false
  msg.done = true
  if (msg._startedAt) msg.elapsed = Math.round((Date.now() - msg._startedAt) / 1000)
  _chatScroll()
}
function applyPatches(original: string, response: string): { result: string; count: number; failed: number } {
  const patchRegex = /<<<REPLACE>>>\n?([\s\S]*?)<<<WITH>>>\n?([\s\S]*?)<<<END>>>/g
  let result = original
  let count = 0
  let failed = 0
  let match: RegExpExecArray | null

  // Нормализация пробелов
  function normWs(s: string) {
    return s.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
  }
  // Агрессивная нормализация: убираем пунктуацию и лишние пробелы
  function normAggressive(s: string) {
    return s.replace(/\r\n/g, '\n')
            .replace(/[^\p{L}\p{N}\n]+/gu, ' ')
            .replace(/[ \t]+/g, ' ')
            .trim()
            .toLowerCase()
  }

  function findAndReplace(doc: string, oldText: string, newText: string): { doc: string; found: boolean } {
    // 1. Точное совпадение
    if (doc.includes(oldText)) {
      return { doc: doc.replace(oldText, newText), found: true }
    }
    // 2. Нормализация пробелов (убираем двойные пробелы/переносы)
    const normOld = normWs(oldText)
    if (normOld.length < 3) return { doc, found: false }
    const lines = doc.split('\n')
    const oldLines = normOld.split('\n').filter(Boolean)
    if (oldLines.length === 1) {
      // Одна строка — ищем подстроку в каждой строке документа
      for (let i = 0; i < lines.length; i++) {
        if (normWs(lines[i]).includes(normOld)) {
          lines[i] = lines[i].replace(lines[i].trim(), newText.trim())
          return { doc: lines.join('\n'), found: true }
        }
      }
      // 3. Агрессивный поиск: без пунктуации (для случаев «—» vs «-», «"» vs «"» и т.п.)
      const normOldAgg = normAggressive(oldText)
      for (let i = 0; i < lines.length; i++) {
        if (normAggressive(lines[i]).includes(normOldAgg)) {
          lines[i] = newText.trim()
          return { doc: lines.join('\n'), found: true }
        }
      }
    } else {
      // Несколько строк — ищем по первой строке, затем проверяем блок
      const firstNorm = oldLines[0]
      for (let i = 0; i <= lines.length - oldLines.length; i++) {
        if (normWs(lines[i]).includes(firstNorm)) {
          const chunk = lines.slice(i, i + oldLines.length)
          if (normWs(chunk.join('\n')).includes(normWs(oldLines.join('\n')))) {
            lines.splice(i, oldLines.length, ...newText.split('\n'))
            return { doc: lines.join('\n'), found: true }
          }
        }
      }
      // 3. Агрессивный многострочный: сравниваем блоки без пунктуации
      const normOldAgg = normAggressive(oldLines.join(' '))
      for (let i = 0; i <= lines.length - oldLines.length; i++) {
        const chunk = lines.slice(i, i + oldLines.length)
        if (normAggressive(chunk.join(' ')).includes(normOldAgg)) {
          lines.splice(i, oldLines.length, ...newText.split('\n'))
          return { doc: lines.join('\n'), found: true }
        }
      }
    }
    return { doc, found: false }
  }

  while ((match = patchRegex.exec(response)) !== null) {
    const oldText = match[1].trim()
    const newText = match[2].trim()
    if (!oldText) { failed++; continue }
    const { doc: patched, found } = findAndReplace(result, oldText, newText)
    if (found) { result = patched; count++ }
    else { failed++ }
  }
  return { result, count, failed }
}

// ── Мгновенная замена без вызова AI ───────────────────────────────────────
// Распознаёт паттерны: "замени X на Y", "X → Y", '"X" → "Y"' и т.п.
function tryInstantEdit(instruction: string, doc: string): { applied: boolean; result: string; oldText: string; newText: string } {
  const none = { applied: false, result: doc, oldText: '', newText: '' }
  if (!doc.trim()) return none

  // Паттерны замены с кавычками или без
  const patterns = [
    // замени «X» на «Y» / замени "X" на "Y" / замени 'X' на 'Y'
    /^(?:замени(?:те)?|поменяй(?:те)?|измени(?:те)?|replace)\s+[«"'"](.+?)[»"'"]\s+на\s+[«"'"](.+?)[»"'"]/i,
    // замени X на Y (без кавычек, до конца строки)
    /^(?:замени(?:те)?|поменяй(?:те)?|измени(?:те)?)\s+(.+?)\s+на\s+(.+)$/i,
    // "X" → "Y" или "X" -> "Y"
    /^[«"'"](.+?)[»"'"]\s*[→\->]+\s*[«"'"](.+?)[»"'"]/,
    // X → Y (без кавычек)
    /^(.+?)\s*→\s*(.+)$/,
  ]

  for (const pattern of patterns) {
    const m = instruction.trim().match(pattern)
    if (m) {
      const oldText = m[1].trim()
      const newText = m[2].trim()
      if (!oldText || oldText === newText) continue
      // Ищем в документе (нормализуем пробелы)
      if (doc.includes(oldText)) {
        return { applied: true, result: doc.replace(oldText, newText), oldText, newText }
      }
      // Нечёткий поиск: игнорируем регистр первой буквы
      const lower = oldText[0].toLowerCase() + oldText.slice(1)
      const upper = oldText[0].toUpperCase() + oldText.slice(1)
      for (const variant of [lower, upper]) {
        if (doc.includes(variant)) {
          return { applied: true, result: doc.replace(variant, newText), oldText: variant, newText }
        }
      }
    }
  }
  return none
}

async function onSendChatMessage() {
  const text = chatInput.value.trim()
  if (!text || aiLoading.value) return
  chatInput.value = ''
  await nextTick()
  const ta = document.querySelector('.de-chat-input') as HTMLTextAreaElement | null
  if (ta) { ta.style.height = 'auto' }
  _chatPushUser(text)

  // ── Сначала пробуем мгновенную замену без AI ──────────────────
  const instant = tryInstantEdit(text, editorContent.value)
  if (instant.applied) {
    const clean = stripMarkdown(instant.result)
    editorContent.value = clean
    if (editorEl.value) editorEl.value.innerText = clean
    const msg = _chatPushGemma()
    msg.streaming = false
    msg.done = true
    msg.elapsed = 0
    msg.text = `⚡ Заменено мгновенно: «${instant.oldText.slice(0, 40)}» → «${instant.newText.slice(0, 40)}»`
    msg.charCount = msg.text.length
    _chatScroll()
    return
  }

  // ── Детект «продолжай» — перенаправляем в continue action ──────
  const CONTINUE_RE = /^(продолжай|продолжи|продолжить|continue|дальше|допиши|дописать|продолжение)\W*$/i
  if (CONTINUE_RE.test(text)) {
    const chatMsg2 = _chatPushGemma()
    chatMsg2.text = ''
    let acc2 = ''
    await streamDocument('continue', { ...buildAiPayload(), currentText: editorContent.value }, (token) => {
      editorContent.value += token
      if (editorEl.value) editorEl.value.innerText = editorContent.value
      acc2 += token
      chatMsg2.text = `▶ Дописываю... (${acc2.length} симв.)`
      chatMsg2.charCount = acc2.length
    })
    chatMsg2.text = `✓ Дописано (${acc2.length} символов добавлено)`
    chatMsg2.charCount = acc2.length
    _chatDone(chatMsg2)
    return
  }

  // ── Иначе — вызываем AI ───────────────────────────────────────
  const chatMsg = _chatPushGemma()

  // Показываем "редактирую..." пока нет токенов
  chatMsg.text = ''

  let accumulated = ''
  const payload = { ...buildAiPayload(), currentText: editorContent.value, customInstruction: text }
  const ok = await streamDocument('chat', payload, (token) => {
    accumulated += token
    // Показываем короткий превью в пузыре (до 120 симв.)
    if (accumulated.length <= 120) {
      chatMsg.text = accumulated
      chatMsg.charCount = accumulated.length
    } else {
      // длинный ответ — прячем контент, показываем статус
      chatMsg.text = ''
      chatMsg.charCount = accumulated.length
    }
  })

  const result = accumulated // НЕ трогаем — патчи должны содержать <<< маркеры
  const hasPatch = /<<<REPLACE>>>/.test(result)

  // Guard: модель вернула весь документ вместо патча
  // Признак: ответ длиннее 60% оригинала И нет патч-маркеров
  const docLen = editorContent.value.length
  const isFullDocResponse = !hasPatch && docLen > 200 && result.length > docLen * 0.6

  if (isFullDocResponse) {
    chatMsg.text = `⚠️ Модель написала весь документ целиком вместо точечной правки. Попробуйте:\n• Выбрать Claude в селекторе модели (☁️ Claude Haiku) — он надёжнее\n• Или сформулируй точнее: «замени [точный текст] на [новый текст]»`
    chatMsg.charCount = chatMsg.text.length
    _chatDone(chatMsg)
    return
  }

  if (hasPatch) {
    // Патч-режим: передаём сырой ответ с <<< маркерами в applyPatches
    const { result: patched, count, failed } = applyPatches(editorContent.value, result)
    if (count > 0) {
      const clean = stripMarkdown(patched)
      editorContent.value = clean
      if (editorEl.value) editorEl.value.innerText = clean
      chatMsg.text = `✓ Изменено фрагментов: ${count}${failed ? ` (не найдено: ${failed})` : ''}`
    } else {
      // Патч не сработал — сообщаем, не трогаем документ
      chatMsg.text = `⚠️ Не удалось найти указанный текст в документе (${failed} патч(ей) не совпали). Попробуйте процитировать точнее.`
    }
    chatMsg.charCount = chatMsg.text.length
  } else {
    // Обычный текстовый ответ — показываем в пузыре
    chatMsg.text = stripMarkdown(result) || result
    chatMsg.charCount = chatMsg.text.length
  }
  _chatDone(chatMsg)
}

function applyFromChat(text: string) {
  editorContent.value = text
  if (editorEl.value) editorEl.value.innerText = text
  // убираем кнопку применения с всех сообщений
  chatMessages.value.forEach(m => { m._applyText = undefined })
}

function clearChat() {
  chatMessages.value = []
}

function buildAiPayload() {
  return {
    templateKey:    selectedTpl.value?.key      || '',
    templateName:   selectedTpl.value?.name     || '',
    templateText:   selectedTpl.value?.template || '',
    fields:         { ...fieldValues.value },
    currentText:    editorContent.value         || generateText(),
    projectSlug:    pickedProjectSlug.value     || '',
    clientId:       pickedClientId.value        || 0,
    contractorId:   pickedContractorId.value    || 0,
    aiModel:        selectedAiModel.value       || undefined,
  }
}

// ── Скачивание DOCX ──────────────────────────────────────────────────────────
const docxLoading = ref(false)

// ── Автосохранение ──────────────────────────────────────────────────
const savedDocId   = ref<number | null>(null)
const autoSaveStatus = ref<'' | 'saving' | 'saved' | 'error'>('')
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null

async function autoSave() {
  if (!editorContent.value || !selectedTpl.value) return
  autoSaveStatus.value = 'saving'
  try {
    const title       = selectedTpl.value.name
    const category    = (selectedTpl.value as any).category || 'other'
    const templateKey = selectedTpl.value.key
    const projectSlug = pickedProjectSlug.value || undefined
    const content     = editorContent.value
    if (!savedDocId.value) {
      const doc = await $fetch<any>('/api/documents', {
        method: 'POST',
        body: { title, category, templateKey, projectSlug, content },
      })
      savedDocId.value = doc.id
      // НЕ emit('saved') здесь — автосохранение не должно закрывать редактор
    } else {
      await $fetch(`/api/documents/${savedDocId.value}`, {
        method: 'PUT',
        body: { content, title },
      })
    }
    autoSaveStatus.value = 'saved'
    setTimeout(() => { if (autoSaveStatus.value === 'saved') autoSaveStatus.value = '' }, 3500)
  } catch {
    autoSaveStatus.value = 'error'
  }
}

// Дебоунсед автосохранение при каждом изменении документа
watch(editorContent, (val) => {
  if (!val || !selectedTpl.value) return
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer)
  // НЕ ставим статус 'saving' здесь — это делает сама функция autoSave()
  // чтобы не мигать при каждом нажатии клавиши
  _autoSaveTimer = setTimeout(autoSave, 2000)
})

async function downloadDocx() {
  if (!editorContent.value || docxLoading.value) return
  docxLoading.value = true
  try {
    const title = selectedTpl.value?.name || 'Документ'
    // Читаем CSRF-токен из куки напрямую
    const csrfToken = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('csrf_token='))
      ?.split('=')[1] ?? ''
    const resp = await fetch('/api/documents/export-docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': decodeURIComponent(csrfToken),
      },
      body: JSON.stringify({ text: editorContent.value, title }),
    })
    if (!resp.ok) throw new Error(await resp.text())
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.docx`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (e: any) {
    alert('Ошибка создания DOCX: ' + (e?.message || e))
  } finally {
    docxLoading.value = false
  }
}

async function onContinueGeneration() {
  if (aiLoading.value) return
  clearCitations()
  const existingText = editorContent.value
  _chatPushUser('▶ Продолжить генерацию')
  const chatMsg = _chatPushGemma()
  chatVisible.value = true
  await streamDocument('continue', { ...buildAiPayload(), currentText: existingText }, (token) => {
    // добавляем продолжение прямо в редактор
    editorContent.value += token
    if (editorEl.value) editorEl.value.innerText = editorContent.value
    _chatToken(chatMsg, token)
  })
  _chatDone(chatMsg)
}

async function onAiGenerate() {
  if (!selectedTpl.value) return
  clearReview()
  clearCitations()
  editorContent.value = ''
  if (editorEl.value) editorEl.value.innerText = ''
  chatVisible.value = true
  _chatPushUser('🤖 Сгенерировать документ')
  const chatMsg = _chatPushGemma()
  await streamDocument('generate', buildAiPayload(), (token) => {
    editorContent.value += token
    if (editorEl.value) {
      editorEl.value.innerText = stripMarkdown(editorContent.value)
      editorEl.value.scrollTop = editorEl.value.scrollHeight
    }
    _chatToken(chatMsg, token)
  })
  // Чистим markdown из накопленного текста (сохраняем чистый вариант)
  editorContent.value = stripMarkdown(editorContent.value)
  if (editorEl.value) editorEl.value.innerText = editorContent.value
  _chatDone(chatMsg)
  autoSave() // сразу сохраняем после генерации
}

async function onAiImprove() {
  if (!selectedTpl.value) return
  clearReview()
  clearCitations()
  const originalText = editorContent.value || generateText()
  editorContent.value = ''
  if (editorEl.value) editorEl.value.innerText = ''
  chatVisible.value = true
  _chatPushUser('✨ Улучшить текст')
  const chatMsg = _chatPushGemma()
  const ok = await streamDocument('improve', { ...buildAiPayload(), currentText: originalText }, (token) => {
    editorContent.value += token
    if (editorEl.value) {
      editorEl.value.innerText = stripMarkdown(editorContent.value)
      editorEl.value.scrollTop = editorEl.value.scrollHeight
    }
    _chatToken(chatMsg, token)
  })
  // Чистим markdown
  editorContent.value = stripMarkdown(editorContent.value)
  if (editorEl.value) editorEl.value.innerText = editorContent.value
  _chatDone(chatMsg)
  if (!ok && !editorContent.value) {
    editorContent.value = originalText
    if (editorEl.value) editorEl.value.innerText = originalText
  }
}

async function onAiReview() {
  if (!selectedTpl.value) return
  chatVisible.value = true
  _chatPushUser('📋 Проверить документ')
  const chatMsg = _chatPushGemma()
  // review теперь тоже стримит — токены идут в чат, notes приходят в конце
  const notes = await reviewDocument(buildAiPayload(), (token) => {
    _chatToken(chatMsg, token)
  })
  if (notes?.length) {
    // Заменяем chat-пузырь структурированным списком замечаний
    chatMsg.text = notes.map(n => `${n.type === 'error' ? '⚠️' : '💡'} ${n.text}`).join('\n')
    chatMsg.charCount = chatMsg.text.length
  } else if (!chatMsg.text) {
    chatMsg.text = 'Анализ завершён. Замечаний нет.'
    chatMsg.charCount = chatMsg.text.length
  }
  _chatDone(chatMsg)
}

// ── Сохранение ────────────────────────────────────────────────────────────
async function saveDocument() {
  if (!selectedTpl.value) return
  saving.value = true
  // Отменяем pending автосохранение — сохраним сами
  if (_autoSaveTimer) { clearTimeout(_autoSaveTimer); _autoSaveTimer = null }
  try {
    const content     = editorContent.value || generateText()
    const title       = selectedTpl.value.name
    const category    = (selectedTpl.value as any).category || 'other'
    const templateKey = selectedTpl.value.key
    const projectSlug = pickedProjectSlug.value || undefined

    if (savedDocId.value) {
      // Документ уже создан автосохранением — просто обновляем его
      await $fetch(`/api/documents/${savedDocId.value}`, {
        method: 'PUT',
        body: { content, title },
      })
    } else {
      // Первое сохранение — создаём документ
      const doc = await $fetch<any>('/api/documents', {
        method: 'POST',
        body: { title, category, templateKey, projectSlug, content },
      })
      savedDocId.value = doc.id
    }

    saveMsg.value = '✓ документ сохранён'
    saveMsgType.value = 'ok'
    autoSaveStatus.value = 'saved'
    setTimeout(() => { saveMsg.value = ''; autoSaveStatus.value = '' }, 3000)
  } catch (e: any) {
    console.error('Save failed', e)
    saveMsg.value = '✗ ошибка сохранения'
    saveMsgType.value = 'err'
    setTimeout(() => { saveMsg.value = '' }, 4000)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped src="./AdminDocumentEditor.scoped.css"></style>
