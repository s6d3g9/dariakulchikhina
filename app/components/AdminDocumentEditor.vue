<template>
  <div class="de-root">

    <!-- ══ Header ══ -->
    <div class="de-head">
      <button class="de-back" @click="handleBack">
        ← {{ step === 0 ? 'к списку' : 'назад' }}
      </button>
      <div class="de-steps">
        <button v-for="(s, i) in STEPS" :key="i"
          class="de-step" :class="{ 'de-step--active': step === i, 'de-step--done': step > i }"
          @click="goToStep(i)"
        >
          <span class="de-step-num">{{ i + 1 }}</span>
          <span class="de-step-label">{{ s }}</span>
        </button>
      </div>
    </div>

    <!-- ══ Step 1: Choose template ══ -->
    <div v-if="step === 0" class="de-panel">
      <div class="de-section-title">Выберите шаблон документа</div>
      <div class="de-tpl-grid">
        <GlassSurface v-for="tpl in templates" :key="tpl.key" as="button"
          class="de-tpl-card"
          :class="{ 'de-tpl-card--active': selectedTpl?.key === tpl.key }"
          @click="selectTemplate(tpl); goToStep(1)"
        >
          <span class="de-tpl-icon">{{ tpl.icon }}</span>
          <div class="de-tpl-info">
            <div class="de-tpl-name">{{ tpl.name }}</div>
            <div class="de-tpl-desc">{{ tpl.description }}</div>
          </div>
          <span class="de-tpl-arrow">→</span>
        </GlassSurface>
      </div>
    </div>

    <!-- ══ Step 2: Pick data sources + fields ══ -->
    <div v-if="step === 1" class="de-panel">
      <div class="de-section-title">
        {{ selectedTpl?.icon }} {{ selectedTpl?.name }}
        <span class="de-section-subtitle">— заполнение данных</span>
      </div>

      <!-- Sources row -->
      <div class="de-sources">
        <div class="de-source">
          <label class="de-source-label">📁 Проект</label>
          <select v-model="pickedProjectSlug" class="u-status-sel" @change="loadContext">
            <option value="">— без проекта —</option>
            <option v-for="p in projects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
          </select>
        </div>
        <div class="de-source">
          <label class="de-source-label">
            🎨 Исполнитель
            <span v-if="designersList.length" class="de-badge">{{ designersList.length }}</span>
          </label>
          <select v-model="pickedDesignerId" class="u-status-sel" @change="applyDesignerData">
            <option :value="0">— не выбран —</option>
            <option v-for="d in designersList" :key="d.id" :value="d.id">
              {{ d.name }}{{ d.companyName ? ` (${d.companyName})` : '' }}
            </option>
          </select>
        </div>
        <div class="de-source">
          <label class="de-source-label">👤 Клиент
            <span v-if="ctx?.clients?.length" class="de-badge">{{ ctx.clients.length }}</span>
          </label>
          <select v-model="pickedClientId" class="u-status-sel" :disabled="loadingCtx" @change="applyClientData">
            <option :value="0">{{ loadingCtx ? 'загрузка...' : '— не выбран —' }}</option>
            <option v-for="c in ctx?.clients || []" :key="c.id" :value="c.id">
              {{ c.name }}{{ c.phone ? ` · ${c.phone}` : '' }}
            </option>
          </select>
        </div>
        <div class="de-source">
          <label class="de-source-label">
            🏗 Подрядчик
            <span v-if="ctx?.contractors?.length" class="de-badge">{{ ctx.contractors.length }}</span>
          </label>
          <select v-model="pickedContractorId" class="u-status-sel" :disabled="loadingCtx" @change="applyContractorData">
            <option :value="0">{{ loadingCtx ? 'загрузка...' : '— не выбран —' }}</option>
            <option v-for="c in ctx?.contractors || []" :key="c.id" :value="c.id">
              {{ c.name }}{{ c.companyName ? ` (${c.companyName})` : '' }}
            </option>
          </select>
        </div>
      </div>
      <div v-if="loadingCtx" class="de-loading-bar">
        <div class="de-loading-fill"></div>
      </div>

      <!-- Entity previews -->
      <div v-if="pickedDesigner || pickedClient || pickedContractor" class="de-preview-row">
        <div v-if="pickedDesigner" class="de-preview-chip de-preview-chip--executor">
          🎨 {{ pickedDesigner.name }}
          <span v-if="pickedDesigner.phone"> · {{ pickedDesigner.phone }}</span>
          <span v-if="pickedDesigner.email"> · {{ pickedDesigner.email }}</span>
          <button class="de-save-executor-btn" :class="{ 'de-save-executor-btn--saved': executorSaved }" @click="saveExecutorToStorage" :title="'Сохранить реквизиты исполнителя для автозаполнения'">
            {{ executorSaved ? '✓ сохранено' : '💾 запомнить реквизиты' }}
          </button>
        </div>
        <div v-if="pickedClient" class="de-preview-chip">
          👤 {{ pickedClient.name }}
          <span v-if="pickedClient.phone"> · {{ pickedClient.phone }}</span>
          <span v-if="pickedClient.email"> · {{ pickedClient.email }}</span>
        </div>
        <div v-if="pickedContractor" class="de-preview-chip">
          🏗 {{ pickedContractor.companyName || pickedContractor.name }}
          <span v-if="pickedContractor.inn"> · ИНН {{ pickedContractor.inn }}</span>
          <span v-if="pickedContractor.phone"> · {{ pickedContractor.phone }}</span>
        </div>
      </div>

      <!-- Fields -->
      <div class="de-fields-divider">
        <span>поля документа</span>
      </div>
      <div class="de-fields-grid">
        <div v-for="field in selectedTpl?.fields || []" :key="field.key" class="de-field">
          <label class="de-field-label">
            {{ field.label }}
            <span v-if="fieldAutoFilled[field.key]" class="de-field-auto" title="заполнено из данных">⚡</span>
          </label>
          <textarea v-if="field.multiline" v-model="fieldValues[field.key]" rows="3" class="glass-input u-ta" :placeholder="field.placeholder || ''"></textarea>
          <GlassInput v-else v-model="fieldValues[field.key]"  :placeholder="field.placeholder || ''" />
        </div>
      </div>

      <!-- Переменные проекта -->
      <div class="de-vars-section">
        <button class="de-vars-toggle" @click="varsOpen = !varsOpen">
          <span class="de-vars-icon">{{ '{' }}{{ '{' }}</span> переменные проекта
          <span class="de-vars-hint">(клик → вставить в шаблон)</span>
          <span class="de-vars-arrow">{{ varsOpen ? '▴' : '▾' }}</span>
        </button>
        <div v-if="varsOpen" class="de-vars-grid">
          <div
            v-for="v in allVars" :key="v.key"
            class="de-var-row"
            :class="{ 'de-var-row--empty': !v.value }"
            :title="'Клик → вставить \u0432 редактор'"
            @click="insertVar(v.key)"
          >
            <code class="de-var-key">{{ '{' }}{{ '{' }}{{ v.key }}{{ '}' }}{{ '}' }}</code>
            <span class="de-var-val">{{ v.value || '— не заполнено' }}</span>
          </div>
        </div>
      </div>

      <div class="de-actions">
        <GlassButton variant="secondary" density="compact"  @click="step = 0">← шаблоны</GlassButton>
        <button class="a-btn-ai" @click="goGenerateAndEdit" title="Перейти в редактор и сразу запустить AI-генерацию">🤖 сгенерировать →</button>
        <GlassButton variant="primary"  @click="goToStep(2)">редактор →</GlassButton>
      </div>
    </div>

    <!-- ══ Step 3: Document editor ══ -->
    <div v-if="step === 2" class="de-panel de-panel--editor">
      <div class="de-section-title">
        {{ selectedTpl?.icon }} {{ selectedTpl?.name }}
        <span class="de-section-subtitle">— редактор</span>
      </div>
      <div class="de-editor-toolbar">
        <div class="de-editor-btns">
          <button class="de-tbtn" @click="regenerateText">⟲ обновить</button>
          <button class="de-tbtn" @click="printDocument">🖨 PDF</button>
          <button class="de-tbtn" @click="downloadTxt">⬇ .txt</button>
          <button class="de-tbtn" @click="copyToClipboard">📋 копировать</button>
          <button class="de-tbtn" :class="{ 'de-tbtn--ai-active': varsOpen }" title="Переменные шаблона {{...}}" @click="varsOpen = !varsOpen">&#123;&#123;&thinsp;&#125;&#125;</button>
          <span class="de-ai-sep">|</span>
          <button class="de-tbtn de-tbtn--ai" :disabled="aiLoading" :class="{ 'de-tbtn--ai-active': aiAction === 'generate' }" @click="onAiGenerate">
            🤖 сгенерировать
          </button>
          <button class="de-tbtn de-tbtn--ai" :disabled="aiLoading" :class="{ 'de-tbtn--ai-active': aiAction === 'improve' }" @click="onAiImprove">
            ✨ улучшить
          </button>
          <button class="de-tbtn de-tbtn--ai" :disabled="aiLoading" :class="{ 'de-tbtn--ai-active': aiAction === 'review' }" @click="onAiReview">
            📋 проверить
          </button>
          <button v-if="aiLoading" class="de-tbtn de-tbtn--abort" @click="abortAi">
            ✕ стоп
          </button>
          <button v-if="!aiLoading && aiTruncated" class="de-tbtn de-tbtn--continue" @click="onContinueGeneration" title="Модель остановилась по лимиту — догенерировать">
            ▶ продолжить
          </button>
          <button class="de-tbtn" :class="{ 'de-tbtn--ai-active': chatVisible }" @click="chatVisible = !chatVisible" title="Показать/скрыть чат с ИИ">
            💬 чат
          </button>
          <button class="de-tbtn de-tbtn--docx" :disabled="!editorContent || docxLoading" @click="downloadDocx" title="Скачать как Word (.docx)">
            {{ docxLoading ? '⏳...' : '📄 .docx' }}
          </button>
          <span v-if="autoSaveStatus" class="de-autosave-status" :class="'de-autosave-status--' + autoSaveStatus">
            <span v-if="autoSaveStatus === 'saving'">⏳ сохранение...</span>
            <span v-else-if="autoSaveStatus === 'saved'">✓ сохранено</span>
            <span v-else-if="autoSaveStatus === 'error'">⚠️ ошибка автосохранения</span>
          </span>
          <span class="de-ai-sep">|</span>
          <select v-model="selectedAiModel" class="de-model-sel" title="Выбрать AI-модель">
            <optgroup label="Локальные (бесплатно)">
              <option value="">🏠 Авто (локальная)</option>
              <option value="gemma3:27b">🏠 Gemma 3 27B (документы)</option>
              <option value="qwen3:4b">🏠 Qwen3 4B (чат, быстро)</option>
            </optgroup>
            <optgroup label="Anthropic Claude">
              <option value="claude-haiku-4-5-20251001">☁️ Claude Haiku 4.5 (дешевле)</option>
              <option value="claude-sonnet-4-5-20250929">☁️ Claude Sonnet 4.5 (рек.)</option>
              <option value="claude-sonnet-4-6">☁️ Claude Sonnet 4.6 (новинка)</option>
            </optgroup>
          </select>
        </div>
        <div v-if="aiProgress" class="de-ai-progress">
          <div class="de-ai-progress-row">
            <span v-if="aiLoading" class="de-ai-dot"></span>
            <span v-else class="de-ai-done-icon">✓</span>
            <span class="de-ai-text">{{ aiProgress }}</span>
            <template v-if="aiLoading">
              <span class="de-ai-sep">·</span>
              <span class="de-ai-elapsed">⏱ {{ aiElapsed }}с</span>
              <template v-if="aiTokenCount > 0">
                <span class="de-ai-sep">·</span>
                <span class="de-ai-chars">{{ aiTokenCount.toLocaleString('ru') }} симв</span>
              </template>
            </template>
          </div>
          <!-- Фазовый блок: пока нет токенов -->
          <div v-if="aiLoading && aiTokenCount === 0" class="de-ai-phase">
            <div class="de-ai-phase-track">
              <div class="de-ai-phase-fill" :style="{ width: aiPrefillPct + '%' }"></div>
              <div class="de-ai-phase-labels">
                <span :class="{ active: aiElapsed >= 0 }">&#x25cf; инит</span>
                <span :class="{ active: aiElapsed >= 5 }">&#x25cf; контекст</span>
                <span :class="{ active: aiElapsed >= 15 }">&#x25cf; обработка</span>
                <span :class="{ active: aiElapsed >= 30 }">&#x25cf; генерация</span>
              </div>
            </div>
            <div v-if="aiPhaseHint" class="de-ai-phase-hint">{{ aiPhaseHint }}</div>
          </div>
        </div>
        <div v-else-if="copyMsg" class="de-copy-msg">{{ copyMsg }}</div>
      </div>
      <!-- AI: прогресс-бар -->
      <div v-if="aiLoading" class="de-ai-bar">
        <div class="de-ai-bar-fill"></div>
      </div>

      <!-- ══ Панель переменных ══ -->
      <Transition name="de-vars-slide">
        <GlassSurface v-if="varsOpen" class="de-vars-panel ">
          <div class="de-vars-panel-head">
            <span class="de-vars-panel-title">&#123;&#123;&thinsp;&#125;&#125; Переменные шаблона</span>
            <span class="de-vars-panel-hint">Кликните — вставить в позицию курсора · или скопировать</span>
            <button class="de-tbtn" @click="varsOpen = false">✕</button>
          </div>
          <div class="de-vars-panel-grid">
            <div
              v-for="v in allVars" :key="v.key"
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
      <div class="de-editor-body" :class="{ 'de-editor-body--with-chat': chatVisible }">
        <div class="de-editor-col">

          <!-- ─ Режим split: слева оригинал, справа стрим ─ -->
          <div v-if="diffMode === 'streaming'" class="de-diff-split">
            <div class="de-diff-pane de-diff-pane--orig">
              <div class="de-diff-pane-label">Оригинал</div>
              <GlassSurface class="de-editor-wrap ">
                <div class="de-editor de-editor--readonly">{{ diffOriginal }}</div>
              </GlassSurface>
            </div>
            <div class="de-diff-pane de-diff-pane--new">
              <div class="de-diff-pane-label">Генерируется<span class="de-diff-cursor">█</span></div>
              <GlassSurface class="de-editor-wrap ">
                <div ref="diffNewEl" class="de-editor de-editor--readonly">{{ diffNew }}</div>
              </GlassSurface>
            </div>
          </div>

          <!-- ─ Режим diff-review: inline diff ─ -->
          <div v-else-if="diffMode === 'review'" class="de-diff-review">
            <GlassSurface class="de-diff-controls ">
              <span class="de-diff-stat">
                <span class="de-diff-stat-add">+{{ diffStats.added }} слов</span>
                <span class="de-diff-stat-del">−{{ diffStats.removed }} слов</span>
              </span>
              <button class="de-btn-accept" @click="acceptDiff">✓ Принять изменения</button>
              <button class="de-btn-reject" @click="rejectDiff">× Отменить</button>
            </GlassSurface>
            <GlassSurface class="de-editor-wrap ">
              <div class="de-editor de-editor--readonly de-editor--diff">
                <template v-for="(seg, i) in diffResult" :key="i">
                  <del v-if="seg.type === 'del'" class="de-diff-del">{{ seg.text }}</del>
                  <ins v-else-if="seg.type === 'ins'" class="de-diff-ins">{{ seg.text }}</ins>
                  <span v-else>{{ seg.text }}</span>
                </template>
              </div>
            </GlassSurface>
          </div>

          <!-- ─ Обычный режим ─ -->
          <GlassSurface v-else class="de-editor-wrap ">
            <div
              ref="editorEl"
              class="de-editor"
              contenteditable="true"
              spellcheck="true"
              @input="onEditorInput"
            ></div>
          </GlassSurface>

        </div><!-- /de-editor-col -->

        <!-- ══ Чат-панель Gemma ══ -->
        <Transition name="de-chat-slide">
          <div v-if="chatVisible" class="de-chat-panel glass-surface">
            <div class="de-chat-header">
              <div class="de-chat-header-left">
                <span class="de-chat-avatar">🤖</span>
                <div>
                  <div class="de-chat-title">Gemma 3 · 27B</div>
                  <div class="de-chat-subtitle">{{ selectedAiModel.startsWith('claude-') ? '☁️ Anthropic' : '🏠 локальная' }} · {{ selectedAiModelLabel.replace(/^[🏠☁️]+\s*/,'') }} · {{ aiLoading ? 'печатает...' : 'онлайн' }}</div>
                </div>
              </div>
              <button class="de-tbtn" @click="clearChat" title="Очистить историю">🗑</button>
            </div>
            <div ref="chatEl" class="de-chat-messages">
              <div v-if="!chatMessages.length" class="de-chat-empty">
                <div class="de-chat-empty-icon">🤖</div>
                <div class="de-chat-empty-text">Нажми <strong>🤖 сгенерировать</strong>, <strong>✨ улучшить</strong> или <strong>📋 проверить</strong> — или напиши своё пожелание в поле ниже.</div>
              </div>
              <div v-for="msg in chatMessages" :key="msg.id" class="de-chat-msg" :class="'de-chat-msg--' + msg.role">
                <div v-if="msg.role === 'user'" class="de-chat-bubble de-chat-bubble--user">
                  <span class="de-chat-action-badge">{{ msg.actionLabel }}</span>
                  <span class="de-chat-time">{{ msg.time }}</span>
                </div>
                <div v-else class="de-chat-bubble de-chat-bubble--gemma">
                  <div class="de-chat-bubble-content">
                    <span v-if="msg.streaming && !msg.text && msg.charCount === 0" class="de-chat-typing">
                      <span></span><span></span><span></span>
                    </span>
                    <span v-else-if="msg.streaming && !msg.text && msg.charCount > 0" class="de-chat-editing">
                      ✏️ редактирую... ({{ msg.charCount }} симв.)
                    </span>
                    <span v-else class="de-chat-text">{{ msg.text }}</span><span v-if="msg.streaming && msg.text" class="de-chat-cursor">▌</span>
                  </div>
                  <div class="de-chat-bubble-meta">
                    <span v-if="msg.done" class="de-chat-done">✓ {{ msg.charCount }} симв.</span>
                    <span v-else-if="msg.streaming" class="de-chat-writing">{{ msg.charCount > 0 ? msg.charCount + ' симв.' : '' }}</span>
                    <span v-if="msg.elapsed != null" class="de-chat-elapsed">⏱ {{ msg.elapsed }}с</span>
                    <span class="de-chat-time">{{ msg.time }}</span>
                  </div>
                  <button v-if="false" class="de-chat-apply-btn" @click="applyFromChat(msg._applyText!)">✓ Применить в редактор</button>
                </div>
              </div>
            </div>
            <!-- ── Быстрые команды ── -->
            <div class="de-chat-chips">
              <button v-for="chip in chatChips" :key="chip.label" class="de-chip" :disabled="aiLoading" @click="applyChip(chip.tpl)">{{ chip.label }}</button>
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
              <button class="de-chat-send" :disabled="aiLoading || !chatInput.trim()" title="Отправить (Enter)" @click="onSendChatMessage">➤</button>
            </div>
          </div>
        </Transition>
      </div><!-- /de-editor-body -->

      <!-- AI: панель замечаний (review) -->
      <Transition name="de-slide">
        <GlassSurface v-if="aiReviewNotes.length" class="de-ai-review ">
          <div class="de-ai-review-head">
            <span class="de-ai-review-title">📋 Gemma 27B — анализ документа</span>
            <button class="de-tbtn" @click="clearReview">✕</button>
          </div>
          <div v-for="(note, i) in aiReviewNotes" :key="i" class="de-ai-note" :class="'de-ai-note--' + note.type">
            <span class="de-ai-note-icon">{{ note.type === 'error' ? '⚠️' : '💡' }}</span>
            <span class="de-ai-note-text">{{ note.text }}</span>
          </div>
        </GlassSurface>
      </Transition>

      <!-- AI: правовые источники (RAG citations) -->
      <Transition name="de-slide">
        <GlassSurface v-if="aiCitations.length" class="de-citations ">
          <div class="de-citations-head">
            <span class="de-citations-title">⚖️ Правовая база — использованные нормы</span>
            <span class="de-citations-count">{{ aiCitations.length }}</span>
            <button class="de-tbtn" @click="clearCitations">✕</button>
          </div>
          <div v-for="(c, i) in aiCitations" :key="i" class="de-citation-row">
            <div class="de-citation-ref">
              <span class="de-citation-source">{{ c.source_name }}</span>
              <span v-if="c.article_num" class="de-citation-article">ст.&nbsp;{{ c.article_num }}</span>
              <span v-if="c.article_title" class="de-citation-title">{{ c.article_title }}</span>
              <span class="de-citation-sim">{{ Math.round(c.similarity * 100) }}% совпадение</span>
            </div>
            <p class="de-citation-text">{{ c.text }}</p>
          </div>
        </GlassSurface>
      </Transition>

      <!-- AI: ошибка -->
      <Transition name="de-toast">
        <div v-if="aiError" class="de-toast de-toast--err">✗ {{ aiError }}</div>
      </Transition>

      <div class="de-actions">
        <GlassButton variant="secondary" density="compact"  @click="step = 1">← поля</GlassButton>
        <GlassButton variant="secondary" density="compact"  @click="printDocument">🖨 PDF</GlassButton>
        <GlassButton variant="secondary" density="compact"  @click="downloadTxt">⬇ .txt</GlassButton>
        <GlassButton variant="primary"  :disabled="saving" @click="saveDocument">
          {{ saving ? 'сохраняется...' : '✓ сохранить документ' }}
        </GlassButton>
      </div>
      <Transition name="de-toast">
        <div v-if="saveMsg" class="de-toast" :class="saveMsgType === 'ok' ? 'de-toast--ok' : 'de-toast--err'">
          {{ saveMsg }}
        </div>
      </Transition>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useAdminDocumentEditorChatState } from '~~/app/composables/useAdminDocumentEditorChatState'
import { useAdminDocumentEditorAiRuntime } from '~~/app/composables/useAdminDocumentEditorAiRuntime'
import { useAdminDocumentEditorDataFill } from '~~/app/composables/useAdminDocumentEditorDataFill'
import { useAdminDocumentEditorOutput } from '~~/app/composables/useAdminDocumentEditorOutput'

const props = defineProps<{
  templates: Array<{
    key: string
    name: string
    icon: string
    description: string
    category: string
    fields: Array<{ key: string; label: string; placeholder?: string; multiline?: boolean }>
    template: string
  }>
  projects: Array<{ slug: string; title: string }>
  /** Если передан — редактор открывается с готовым содержимым существующего документа */
  existingDoc?: { id: number; content: string; templateKey?: string | null; projectSlug?: string | null } | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const STEPS = ['Шаблон', 'Данные', 'Редактор']

// ── State ──
const step = ref(0)
const selectedTpl = ref<typeof props.templates[number] | null>(null)
const fieldValues = ref<Record<string, string>>({})
const fieldAutoFilled = ref<Record<string, boolean>>({})
const editorContent = ref('')
const editorEl      = ref<HTMLDivElement | null>(null)
const diffNewEl     = ref<HTMLDivElement | null>(null)
const saving        = ref(false)
const copyMsg       = ref('')
const saveMsg       = ref('')
const saveMsgType   = ref<'ok' | 'err'>('ok')

// ── Панель переменных {{...}} ──
const varsOpen = ref(false)

function insertVar(key: string) {
  const token = `{{${key}}}`
  if (step.value === 2 && editorEl.value) {
    // Вставляем в позицию курсора редактора
    editorEl.value.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(token))
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
      // Синхронизируем с моделью
      editorContent.value = editorEl.value.innerText
    } else {
      // Нет курсора — добавляем в конец
      editorContent.value += token
      editorEl.value.innerText = editorContent.value
    }
  } else {
    // На шаге 2 или вне редактора — копируем в буфер
    navigator.clipboard.writeText(token).catch(() => {})
    copyMsg.value = `✓ скопировано: ${token}`
    setTimeout(() => { copyMsg.value = '' }, 2000)
  }
}

// ── Navigation ──
function handleBack() {
  if (step.value > 0) { step.value-- }
  else { emit('close') }
}

function goToStep(i: number) {
  if (i === 0) { step.value = 0; return }
  if (i >= 1 && !selectedTpl.value) return
  // Загружаем дизайнеров при переходе на шаг 1 (даже без проекта)
  if (i === 1 && !designersList.value.length) {
    void ensureDesignersLoaded()
  }
  // syncEditorContent вызовет watch(step) ниже — не дублируем
  step.value = i
}

// Перейти в редактор и сразу запустить AI-генерацию (кнопка «🤖 сгенерировать →»)
async function goGenerateAndEdit() {
  goToStep(2)
  await nextTick()
  onAiGenerate()
}

// ── Editor ──
function syncEditorContent() {
  computeDerivedFields()
  editorContent.value = generateText()
  nextTick(() => {
    if (editorEl.value) editorEl.value.innerText = editorContent.value
  })
}

// ── Автосохранение ──────────────────────────────────────────────────
const savedDocId   = ref<number | null>(null)
const autoSaveStatus = ref<'' | 'saving' | 'saved' | 'error'>('')
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null

function clearAutoSaveTimer() {
  if (_autoSaveTimer) {
    clearTimeout(_autoSaveTimer)
    _autoSaveTimer = null
  }
}

const {
  pickedProjectSlug,
  pickedClientId,
  pickedContractorId,
  pickedDesignerId,
  designersList,
  executorSaved,
  ctx,
  loadingCtx,
  allVars,
  pickedClient,
  pickedContractor,
  pickedDesigner,
  computedRemaining,
  selectTemplate,
  ensureDesignersLoaded,
  loadContext,
  applyClientData,
  applyContractorData,
  applyDesignerData,
  saveExecutorToStorage,
  generateText,
  computeDerivedFields,
} = useAdminDocumentEditorDataFill({
  selectedTpl,
  fieldValues,
  fieldAutoFilled,
  savedDocId,
  autoSaveStatus,
  clearAutoSaveTimer,
})

const {
  diffMode,
  diffOriginal,
  diffNew,
  diffResult,
  diffStats,
  docxLoading,
  acceptDiff,
  rejectDiff,
  stripMarkdown,
  printDocument,
  downloadTxt,
  copyToClipboard,
  downloadDocx,
} = useAdminDocumentEditorOutput({
  selectedTpl,
  fieldValues,
  editorContent,
  editorEl,
  computedRemaining,
  generateText,
  copyMsg,
})

const {
  chatVisible,
  chatMessages,
  chatEl,
  chatInputEl,
  chatInput,
  chatChips,
  applyChip,
  chatPushUser: _chatPushUser,
  chatPushGemma: _chatPushGemma,
  chatToken: _chatToken,
  chatDone: _chatDone,
  applyPatches,
  tryInstantEdit,
  applyFromChat,
  clearChat,
} = useAdminDocumentEditorChatState({
  editorContent,
  editorEl,
})

const {
  AI_MODELS,
  aiLoading,
  aiError,
  aiAction,
  aiProgress,
  aiElapsed,
  aiTokenCount,
  aiTruncated,
  aiReviewNotes,
  aiCitations,
  abortAi,
  clearReview,
  clearCitations,
  selectedAiModel,
  selectedAiModelLabel,
  aiPhaseHint,
  aiPrefillPct,
  onSendChatMessage,
  onContinueGeneration,
  onAiGenerate,
  onAiImprove,
  onAiReview,
} = useAdminDocumentEditorAiRuntime({
  selectedTpl,
  fieldValues,
  editorContent,
  editorEl,
  pickedProjectSlug,
  pickedClientId,
  pickedContractorId,
  generateText,
  stripMarkdown,
  chatInput,
  chatInputEl,
  chatVisible,
  applyPatches,
  tryInstantEdit,
  chatPushUser: _chatPushUser,
  chatPushGemma: _chatPushGemma,
  chatToken: _chatToken,
  chatDone: _chatDone,
  autoSave,
})

watch(step, (value) => {
  if (value === 2) syncEditorContent()
})

watch(pickedProjectSlug, () => {
  savedDocId.value = null
  autoSaveStatus.value = ''
})

onMounted(() => {
  const doc = props.existingDoc
  if (!doc) return

  savedDocId.value = doc.id
  editorContent.value = doc.content
  if (doc.projectSlug) pickedProjectSlug.value = doc.projectSlug
  if (doc.templateKey) {
    const tpl = props.templates.find((template) => template.key === doc.templateKey)
    if (tpl) {
      selectTemplate(tpl)
    }
  }

  step.value = 2
  nextTick(() => {
    if (editorEl.value) editorEl.value.innerText = doc.content
  })
})

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

<style scoped>
/* ── Header + Steps ── */
.de-head {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.de-back {
  background: none; border: none; cursor: pointer;
  font-size: var(--ds-text-sm, .8rem); color: var(--glass-text); opacity: .5;
  font-family: inherit; padding: 4px 0; transition: opacity .15s;
}
.de-back:hover { opacity: 1; }
.de-steps {
  display: flex; gap: 4px; margin-left: auto;
}
.de-step {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border: none; cursor: pointer;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  color: var(--glass-text); opacity: .4;
  border-radius: var(--chip-radius, 999px);
  font-family: inherit; font-size: var(--ds-text-xs, .7rem);
  transition: all .15s ease;
}
.de-step:hover { opacity: .65; }
.de-step--active {
  opacity: 1;
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 14%, transparent);
  color: var(--ds-accent, var(--ds-accent));
}
.de-step--done { opacity: .55; }
.de-step-num {
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .55rem; font-weight: 600;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.de-step--active .de-step-num { background: var(--ds-accent, var(--ds-accent)); color: #fff; }
.de-step--done .de-step-num { background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 20%, transparent); color: var(--ds-success, var(--ds-success)); }

/* ── Section title ── */
.de-section-title {
  font-size: var(--ds-text-sm, .88rem); font-weight: var(--ds-heading-weight, 600);
  color: var(--glass-text); margin-bottom: 4px;
}
.de-section-subtitle { font-weight: 400; opacity: .4; font-size: .78rem; }

/* ── Panel ── */
.de-panel { display: flex; flex-direction: column; gap: 12px; }
.de-panel--editor { gap: 8px; }

/* ── Editor body: двухколоночный layout ── */
.de-editor-body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.de-editor-col {
  flex: 1;
  min-width: 0;
}

/* ── Чат-панель ── */
.de-chat-panel {
  width: 320px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  max-height: 520px;
  border: 1px solid var(--glass-border);
  overflow: hidden;
}
.de-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--glass-border);
  gap: 8px;
}
.de-chat-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.de-chat-avatar {
  font-size: 1.4rem;
  line-height: 1;
}
.de-chat-title {
  font-size: .82rem;
  font-weight: 600;
  color: var(--glass-text);
}
.de-chat-subtitle {
  font-size: .7rem;
  opacity: .45;
}
.de-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-width: thin;
}
.de-chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 12px;
  text-align: center;
  opacity: .45;
}
.de-chat-empty-icon { font-size: 2rem; }
.de-chat-empty-text { font-size: .78rem; line-height: 1.5; }
.de-chat-msg { display: flex; flex-direction: column; }
.de-chat-msg--user { align-items: flex-end; }
.de-chat-msg--gemma { align-items: flex-start; }
.de-chat-bubble {
  max-width: 90%;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: .78rem;
  line-height: 1.5;
}
.de-chat-bubble--user {
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 25%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}
.de-chat-action-badge {
  font-weight: 600;
  font-size: .76rem;
  color: var(--ds-accent, var(--ds-accent));
}
.de-chat-bubble--gemma {
  background: color-mix(in srgb, var(--glass-bg) 60%, transparent);
  border: 1px solid var(--glass-border);
  width: 100%;
}
.de-chat-bubble-content {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--glass-text);
  font-size: .76rem;
  line-height: 1.55;
  max-height: 340px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.de-chat-bubble-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px solid var(--glass-border);
  gap: 6px;
}
.de-chat-time { font-size: .65rem; opacity: .35; white-space: nowrap; }
.de-chat-done { font-size: .65rem; color: var(--ds-success, var(--ds-success)); }
.de-chat-elapsed { font-size: .65rem; opacity: .45; }
.de-chat-writing { font-size: .65rem; opacity: .5; }
.de-chat-editing { font-size: .8rem; opacity: .7; font-style: italic; }
.de-chat-text { display: inline; }
.de-chat-cursor {
  display: inline-block;
  color: var(--ds-accent, var(--ds-accent));
  opacity: .8;
  animation: de-blink .7s step-end infinite;
  margin-left: 1px;
}
@keyframes de-blink { 0%,100%{opacity:.8} 50%{opacity:0} }
/* Анимация «печатает» три точки */
.de-chat-typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 2px;
}
.de-chat-typing span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ds-accent, var(--ds-accent));
  opacity: .5;
  animation: de-typing 1.2s ease-in-out infinite;
}
.de-chat-typing span:nth-child(2) { animation-delay: .2s; }
.de-chat-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes de-typing { 0%,80%,100%{transform:scale(1);opacity:.35} 40%{transform:scale(1.3);opacity:1} }

/* ── Chat apply кнопка ── */
.de-chat-apply-btn {
  display: block; margin-top: 8px; width: 100%;
  padding: 6px 12px; border-radius: 7px; border: none; cursor: pointer;
  font-size: .74rem; font-weight: 600;
  background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 18%, transparent);
  color: var(--ds-success, var(--ds-success)); transition: background .15s;
}
.de-chat-apply-btn:hover { background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 28%, transparent); }

/* ── Chat input bar ── */
.de-chat-panel { display: flex; flex-direction: column; }
.de-chat-messages { flex: 1; min-height: 0; }

/* ── Быстрые команды-чипы ── */
.de-chat-chips {
  display: flex; flex-wrap: wrap; gap: 4px;
  padding: 6px 10px 0;
  flex-shrink: 0;
}
.de-chip {
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 6%, transparent);
  color: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 80%, var(--glass-text));
  border-radius: 20px;
  padding: 3px 9px;
  font-size: .68rem;
  font-family: inherit;
  cursor: pointer;
  transition: background .15s, transform .1s, opacity .15s;
  white-space: nowrap;
  opacity: .7;
}
.de-chip:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 16%, transparent);
  opacity: 1;
  transform: translateY(-1px);
}
.de-chip:active:not(:disabled) { transform: scale(.96); }
.de-chip:disabled { opacity: .25; cursor: not-allowed; }
.de-chat-input-bar {
  display: flex; align-items: flex-end; gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.de-chat-input {
  flex: 1; resize: none; overflow: hidden; min-height: 36px; max-height: 120px;
  padding: 8px 10px; border-radius: 10px; border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg, #fff) 60%, transparent);
  color: var(--glass-text); font-family: inherit; font-size: .82rem;
  line-height: 1.45; outline: none; transition: border-color .15s;
}
.de-chat-input:focus { border-color: var(--ds-accent, var(--ds-accent)); }
.de-chat-input:disabled { opacity: .5; cursor: not-allowed; }
.de-chat-send {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; border: none;
  background: var(--ds-accent, var(--ds-accent)); color: #fff; font-size: 1rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: opacity .15s, transform .1s;
}
.de-chat-send:hover:not(:disabled) { opacity: .85; transform: scale(1.08); }
.de-chat-send:disabled { opacity: .35; cursor: not-allowed; }

/* Анимация появления чата */
.de-chat-slide-enter-active, .de-chat-slide-leave-active {
  transition: all .25s ease;
}
.de-chat-slide-enter-from, .de-chat-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
  width: 0;
}

/* ── Template grid ── */
.de-tpl-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
@media (max-width: 700px) { .de-tpl-grid { grid-template-columns: 1fr; } }
.de-tpl-card {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; cursor: pointer; border: 1px solid transparent;
  text-align: left; font-family: inherit; color: var(--glass-text);
  transition: all .15s ease;
}
.de-tpl-card:hover { transform: translateY(-1px); }
.de-tpl-card--active {
  border-color: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 40%, transparent);
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 8%, transparent) !important;
}
.de-tpl-icon { font-size: 1.3rem; flex-shrink: 0; }
.de-tpl-info { flex: 1; min-width: 0; }
.de-tpl-name { font-size: var(--ds-text-sm, .82rem); font-weight: 500; }
.de-tpl-desc { font-size: var(--ds-text-xs, .68rem); opacity: .4; margin-top: 1px; }
.de-tpl-arrow { opacity: .2; font-size: .9rem; flex-shrink: 0; }

/* ── Sources row ── */
.de-sources {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
}
@media (max-width: 700px) { .de-sources { grid-template-columns: 1fr; } }
.de-source { display: flex; flex-direction: column; gap: 4px; }
.de-source-label {
  font-size: .6rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--glass-text); opacity: .45; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}
.de-badge {
  font-size: .5rem; padding: 0 4px; border-radius: 999px; line-height: 1.5;
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 15%, transparent);
  color: var(--ds-accent, var(--ds-accent)); opacity: 1;
}
.de-loading-fill {
  height: 100%; width: 30%; border-radius: 2px;
  background: var(--ds-accent, var(--ds-accent));
  animation: de-load-slide 1.2s ease-in-out infinite;
}
@keyframes de-load-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* Preview chips */
.de-preview-row { display: flex; flex-wrap: wrap; gap: 6px; }
.de-preview-chip {
  font-size: var(--ds-text-xs, .7rem); color: var(--glass-text); opacity: .5;
  padding: 3px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}
.de-preview-chip--executor {
  opacity: .8;
  border: 1px solid color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 30%, transparent);
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 6%, transparent);
}
.de-save-executor-btn {
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 30%, transparent);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: .65rem;
  color: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 80%, white);
  transition: background .12s;
}
.de-save-executor-btn:hover { background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 12%, transparent); }
.de-save-executor-btn--saved { color: var(--ds-success); border-color: color-mix(in srgb, var(--ds-success) 30%, transparent); }

/* ── Fields ── */
.de-fields-divider {
  display: flex; align-items: center; gap: 8px; margin-top: 4px;
}
.de-fields-divider::before,
.de-fields-divider::after {
  content: ''; flex: 1; height: 1px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.de-fields-divider span {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .3; font-weight: 600;
}
.de-fields-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
@media (max-width: 600px) { .de-fields-grid { grid-template-columns: 1fr; } }
.de-field { display: flex; flex-direction: column; gap: 3px; }
.de-field-label {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--glass-text); opacity: .4; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}
.de-field-auto { color: var(--ds-accent, var(--ds-accent)); font-size: .65rem; opacity: 1; }
.de-editor-btns { display: flex; gap: 2px; }
.de-tbtn {
  border: none; background: none; cursor: pointer;
  font-size: var(--ds-text-xs, .7rem); font-family: inherit;
  color: var(--glass-text); opacity: .35; padding: 4px 8px;
  border-radius: 6px; transition: all .15s ease;
}
.de-tbtn:hover { opacity: .8; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.de-copy-msg { font-size: var(--ds-text-xs, .7rem); color: var(--ds-accent, var(--ds-accent)); }

/* ── AI кнопки ── */
.de-ai-sep {
  color: var(--glass-text); opacity: .15; margin: 0 4px; font-size: .8rem; user-select: none;
}
.de-tbtn--ai {
  color: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 80%, var(--glass-text));
  opacity: .55;
}
.de-tbtn--ai:hover:not(:disabled) { opacity: 1; }
.de-tbtn--ai-active {
  opacity: 1 !important;
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 12%, transparent) !important;
  animation: de-ai-pulse 1.2s ease-in-out infinite;
}
.de-tbtn--ai:disabled { cursor: not-allowed; opacity: .25; }
@keyframes de-ai-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

/* ── AI кнопка стоп ── */
.de-tbtn--abort {
  color: var(--ds-error, var(--ds-error));
  opacity: .85;
  border: 1px solid color-mix(in srgb, var(--ds-error, var(--ds-error)) 30%, transparent);
}
.de-tbtn--abort:hover { opacity: 1; background: color-mix(in srgb, var(--ds-error, var(--ds-error)) 12%, transparent) !important; }
.de-tbtn--continue {
  color: var(--ds-success, var(--ds-success)) !important;
  border: 1px solid color-mix(in srgb, var(--ds-success, var(--ds-success)) 30%, transparent);
  animation: de-continue-pulse 1.8s ease-in-out infinite;
}
.de-tbtn--continue:hover { background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 10%, transparent) !important; animation: none; }

/* ── Кнопка скачать DOCX ── */
.de-tbtn--docx {
  color: color-mix(in srgb, var(--ds-accent) 80%, var(--glass-text));
  border: 1px solid color-mix(in srgb, var(--ds-accent) 30%, transparent);
  opacity: .7;
}
.de-tbtn--docx:hover:not(:disabled) { opacity: 1; background: color-mix(in srgb, var(--ds-accent) 10%, transparent) !important; }
.de-tbtn--docx:disabled { opacity: .3; cursor: not-allowed; }

/* ── Авто-сохранение ── */
.de-autosave-status {
  font-size: var(--ds-text-xs, .68rem);
  padding: 2px 8px;
  border-radius: 999px;
  transition: opacity .3s;
}
.de-autosave-status--saving { color: var(--glass-text); opacity: .5; }
.de-autosave-status--saved  { color: var(--ds-success); opacity: .85; }
.de-autosave-status--error  { color: var(--ds-error); opacity: .85; }
@keyframes de-continue-pulse { 0%,100%{opacity:.75} 50%{opacity:1} }

/* ── Панель переменных (шаг 2 — поля шаблона) ── */
.de-vars-section {
  border: 1px solid color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 18%, transparent);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
}
.de-vars-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 6%, transparent);
  border: none;
  cursor: pointer;
  font-size: var(--ds-text-xs, .7rem);
  color: var(--glass-text);
  text-align: left;
  transition: background .15s;
}
.de-vars-toggle:hover { background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 12%, transparent); }
.de-vars-icon { font-family: monospace; opacity: .7; }
.de-vars-hint { opacity: .5; font-size: .65rem; }
.de-vars-arrow { margin-left: auto; opacity: .6; }
.de-vars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 2px;
  padding: 4px 6px 6px;
  max-height: 260px;
  overflow-y: auto;
}
.de-var-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: background .12s;
  font-size: .7rem;
}
.de-var-row:hover { background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 14%, transparent); }
.de-var-row--empty { opacity: .45; }
.de-var-key {
  font-family: monospace;
  font-size: .68rem;
  color: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 85%, white);
  white-space: nowrap;
  flex-shrink: 0;
}
.de-var-val {
  color: var(--glass-text);
  opacity: .75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Панель переменных (шаг 3 — тулбар редактора) ── */
.de-vars-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 200;
  width: min(520px, 92vw);
  padding: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 25%, transparent);
  background: var(--glass-bg, #1a1a2e);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px color-mix(in srgb, black 35%, transparent);
}
.de-vars-panel-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.de-vars-panel-title {
  font-size: .75rem;
  font-weight: 600;
  color: var(--glass-text);
}
.de-vars-panel-hint {
  font-size: .65rem;
  opacity: .5;
  color: var(--glass-text);
}
.de-vars-panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 2px;
  max-height: 280px;
  overflow-y: auto;
}
.de-var-item {
  display: flex;
  flex-direction: column;
  padding: 5px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: background .12s;
}
.de-var-item:hover { background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 14%, transparent); }
.de-var-item--empty { opacity: .4; }
.de-var-item .de-var-key { font-size: .67rem; }
.de-var-item .de-var-lbl { font-size: .64rem; opacity: .55; color: var(--glass-text); margin-top: 1px; }
.de-var-item .de-var-val { font-size: .68rem; opacity: .8; color: var(--glass-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Анимация появления панели переменных ── */
.de-vars-slide-enter-active, .de-vars-slide-leave-active { transition: opacity .18s, transform .18s; }
.de-vars-slide-enter-from, .de-vars-slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Селектор AI-модели ── */
.de-model-sel {
  border: none;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 8%, transparent);
  color: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 90%, var(--glass-text));
  font-size: var(--ds-text-xs, .7rem);
  font-family: inherit;
  padding: 4px 6px;
  cursor: pointer;
  opacity: .75;
  outline: none;
  max-width: 180px;
  transition: opacity .15s;
}
.de-model-sel:hover { opacity: 1; }
.de-model-sel:focus { opacity: 1; outline: 1px solid color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 40%, transparent); }

/* ── AI строка прогресса ── */
.de-ai-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: .75rem;
  color: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 70%, var(--glass-text));
  padding: 3px 4px 2px;
}
.de-ai-progress-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.de-ai-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ds-accent, var(--ds-accent));
  animation: de-dot-pulse 1s ease-in-out infinite;
  flex-shrink: 0;
}
.de-ai-done-icon {
  font-size: .7rem;
  color: var(--ds-success, var(--ds-success));
  font-weight: 700;
  flex-shrink: 0;
}
.de-ai-text { font-weight: 500; }
.de-ai-sep  { opacity: .35; flex-shrink: 0; }
.de-ai-elapsed { font-variant-numeric: tabular-nums; opacity: .75; }
.de-ai-chars   { font-variant-numeric: tabular-nums; opacity: .75; }
/* ── фазовый блок ── */
.de-ai-phase {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.de-ai-phase-track {
  position: relative;
  height: 18px;
}
.de-ai-phase-fill {
  position: absolute;
  top: 6px; left: 0;
  height: 4px;
  border-radius: 2px;
  background: var(--ds-accent, var(--ds-accent));
  transition: width 1s linear;
  opacity: .6;
}
.de-ai-phase-labels {
  position: relative;
  display: flex;
  justify-content: space-between;
  font-size: .63rem;
  opacity: .4;
  pointer-events: none;
  padding-top: 1px;
}
.de-ai-phase-labels span {
  transition: opacity .4s, color .4s;
}
.de-ai-phase-labels span.active {
  opacity: 1;
  color: var(--ds-accent, var(--ds-accent));
}
.de-ai-phase-hint {
  font-size: .7rem;
  font-style: italic;
  opacity: .6;
  padding-left: 12px;
  animation: de-hint-fade 0.5s ease;
}
@keyframes de-hint-fade {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: .6; transform: translateY(0); }
}
@keyframes de-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: .5; }
}

/* ── AI загрузочная полоса ── */
.de-ai-bar {
  height: 2px;
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 15%, transparent);
  overflow: hidden;
  border-radius: 1px;
}
.de-ai-bar-fill {
  height: 100%;
  width: 40%;
  background: var(--ds-accent, var(--ds-accent));
  border-radius: 1px;
  animation: de-bar-slide 1.4s ease-in-out infinite;
}
@keyframes de-bar-slide {
  0% { transform: translateX(-150%); }
  100% { transform: translateX(350%); }
}

/* ── AI панель замечаний ── */
.de-ai-review {
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 20%, transparent);
  background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 4%, transparent) !important;
}
.de-ai-review-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.de-ai-review-title {
  font-size: var(--ds-text-xs, .72rem); font-weight: 600;
  color: var(--ds-accent, var(--ds-accent)); text-transform: uppercase; letter-spacing: .05em;
}
.de-ai-note {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 5px 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 5%, transparent);
  font-size: var(--ds-text-xs, .72rem);
}
.de-ai-note--error .de-ai-note-text { color: var(--ds-error, var(--ds-error)); }
.de-ai-note--info  .de-ai-note-text { color: var(--glass-text); opacity: .75; }
.de-ai-note-icon { flex-shrink: 0; }
.de-ai-note-text  { line-height: 1.5; }

/* ── Правовые цитаты (RAG) ── */
.de-citations {
  padding: 12px 14px; margin-top: 8px;
  border: 1px solid color-mix(in srgb, var(--ds-success, var(--ds-success)) 20%, transparent);
  background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 4%, transparent) !important;
}
.de-citations-head {
  display: flex; align-items: center; gap: 8px; justify-content: space-between;
  margin-bottom: 10px;
}
.de-citations-title {
  font-size: var(--ds-text-xs, .72rem); font-weight: 600; color: var(--ds-success, var(--ds-success));
  text-transform: uppercase; letter-spacing: .05em;
}
.de-citations-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 15%, transparent); color: var(--ds-success, var(--ds-success));
  font-size: .62rem; font-weight: 700;
  margin-right: auto;
}
html.dark .de-citations { border-color: color-mix(in srgb, var(--ds-success) 15%, transparent); background: color-mix(in srgb, var(--ds-success) 7%, transparent) !important; }
html.dark .de-citations-title { color: color-mix(in srgb, var(--ds-success) 60%, white); }
html.dark .de-citations-count { background: color-mix(in srgb, var(--ds-success) 15%, transparent); color: color-mix(in srgb, var(--ds-success) 60%, white); }
.de-citation-row {
  padding: 7px 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 5%, transparent);
}
.de-citation-ref {
  display: flex; flex-wrap: wrap; gap: 5px; align-items: baseline;
  margin-bottom: 3px;
}
.de-citation-source {
  font-size: .65rem; font-weight: 600; color: var(--glass-text); opacity: .7;
}
.de-citation-article {
  font-size: .65rem; font-weight: 700;
  color: var(--ds-success, var(--ds-success)); background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 10%, transparent);
  padding: 1px 5px; border-radius: 3px;
}
html.dark .de-citation-article { color: color-mix(in srgb, var(--ds-success) 60%, white); background: color-mix(in srgb, var(--ds-success) 10%, transparent); }
.de-citation-title {
  font-size: .65rem; color: var(--glass-text); opacity: .6;
}
.de-citation-sim {
  font-size: .58rem; color: var(--glass-text); opacity: .4; margin-left: auto;
}
.de-citation-text {
  font-size: .68rem; line-height: 1.55; color: var(--glass-text); opacity: .7;
  margin: 0;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}

/* transitions */
.de-slide-enter-active, .de-slide-leave-active { transition: all .25s ease; }
.de-slide-enter-from, .de-slide-leave-to { opacity: 0; transform: translateY(-8px); }

.de-editor-wrap {
  padding: 0; overflow: hidden;
  max-height: calc(100vh - 340px); overflow-y: auto;
}
.de-editor {
  padding: 20px 24px; min-height: 250px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: var(--ds-text-xs, .74rem); line-height: 1.75;
  color: var(--glass-text); white-space: pre-wrap; outline: none;
}
.de-editor:focus {
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

/* ── Actions ── */
.de-actions {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}

/* ── Toast ── */
.de-toast {
  margin-top: 8px; padding: 8px 14px;
  border-radius: var(--card-radius, 10px);
  font-size: var(--ds-text-sm, .8rem); font-weight: 500;
  text-align: center;
}
.de-toast--ok {
  background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 10%, transparent); color: var(--ds-success, var(--ds-success));
  border: 1px solid color-mix(in srgb, var(--ds-success, var(--ds-success)) 20%, transparent);
}
.de-toast--err {
  background: color-mix(in srgb, var(--ds-error, var(--ds-error)) 10%, transparent); color: var(--ds-error, var(--ds-error));
  border: 1px solid color-mix(in srgb, var(--ds-error) 20%, transparent);
}
html.dark .de-toast--ok { background: color-mix(in srgb, var(--ds-success) 15%, transparent); color: color-mix(in srgb, var(--ds-success) 60%, white); }
html.dark .de-toast--err { background: color-mix(in srgb, var(--ds-error) 15%, transparent); color: color-mix(in srgb, var(--ds-error) 60%, white); }

.de-toast-enter-active, .de-toast-leave-active { transition: all .25s ease; }
.de-toast-enter-from, .de-toast-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
