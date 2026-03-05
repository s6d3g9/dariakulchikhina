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
        <button v-for="tpl in templates" :key="tpl.key"
          class="de-tpl-card glass-card"
          :class="{ 'de-tpl-card--active': selectedTpl?.key === tpl.key }"
          @click="selectTemplate(tpl); goToStep(1)"
        >
          <span class="de-tpl-icon">{{ tpl.icon }}</span>
          <div class="de-tpl-info">
            <div class="de-tpl-name">{{ tpl.name }}</div>
            <div class="de-tpl-desc">{{ tpl.description }}</div>
          </div>
          <span class="de-tpl-arrow">→</span>
        </button>
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
          <input v-else v-model="fieldValues[field.key]" class="glass-input" :placeholder="field.placeholder || ''" />
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
        <button class="a-btn-sm" @click="step = 0">← шаблоны</button>
        <button class="a-btn-ai" @click="goGenerateAndEdit" title="Перейти в редактор и сразу запустить AI-генерацию">🤖 сгенерировать →</button>
        <button class="a-btn-save" @click="goToStep(2)">редактор →</button>
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
        <div v-if="varsOpen" class="de-vars-panel glass-card">
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
        </div>
      </Transition>

      <!-- ══ Двухколоночный layout: редактор + чат ══ -->
      <div class="de-editor-body" :class="{ 'de-editor-body--with-chat': chatVisible }">
        <div class="de-editor-col">

          <!-- ─ Режим split: слева оригинал, справа стрим ─ -->
          <div v-if="diffMode === 'streaming'" class="de-diff-split">
            <div class="de-diff-pane de-diff-pane--orig">
              <div class="de-diff-pane-label">Оригинал</div>
              <div class="de-editor-wrap glass-card">
                <div class="de-editor de-editor--readonly">{{ diffOriginal }}</div>
              </div>
            </div>
            <div class="de-diff-pane de-diff-pane--new">
              <div class="de-diff-pane-label">Генерируется<span class="de-diff-cursor">█</span></div>
              <div class="de-editor-wrap glass-card">
                <div ref="diffNewEl" class="de-editor de-editor--readonly">{{ diffNew }}</div>
              </div>
            </div>
          </div>

          <!-- ─ Режим diff-review: inline diff ─ -->
          <div v-else-if="diffMode === 'review'" class="de-diff-review">
            <div class="de-diff-controls glass-card">
              <span class="de-diff-stat">
                <span class="de-diff-stat-add">+{{ diffStats.added }} слов</span>
                <span class="de-diff-stat-del">−{{ diffStats.removed }} слов</span>
              </span>
              <button class="de-btn-accept" @click="acceptDiff">✓ Принять изменения</button>
              <button class="de-btn-reject" @click="rejectDiff">× Отменить</button>
            </div>
            <div class="de-editor-wrap glass-card">
              <div class="de-editor de-editor--readonly de-editor--diff">
                <template v-for="(seg, i) in diffResult" :key="i">
                  <del v-if="seg.type === 'del'" class="de-diff-del">{{ seg.text }}</del>
                  <ins v-else-if="seg.type === 'ins'" class="de-diff-ins">{{ seg.text }}</ins>
                  <span v-else>{{ seg.text }}</span>
                </template>
              </div>
            </div>
          </div>

          <!-- ─ Обычный режим ─ -->
          <div v-else class="de-editor-wrap glass-card">
            <div
              ref="editorEl"
              class="de-editor"
              contenteditable="true"
              spellcheck="true"
              @input="onEditorInput"
            ></div>
          </div>

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
        <div v-if="aiReviewNotes.length" class="de-ai-review glass-card">
          <div class="de-ai-review-head">
            <span class="de-ai-review-title">📋 Gemma 27B — анализ документа</span>
            <button class="de-tbtn" @click="clearReview">✕</button>
          </div>
          <div v-for="(note, i) in aiReviewNotes" :key="i" class="de-ai-note" :class="'de-ai-note--' + note.type">
            <span class="de-ai-note-icon">{{ note.type === 'error' ? '⚠️' : '💡' }}</span>
            <span class="de-ai-note-text">{{ note.text }}</span>
          </div>
        </div>
      </Transition>

      <!-- AI: правовые источники (RAG citations) -->
      <Transition name="de-slide">
        <div v-if="aiCitations.length" class="de-citations glass-card">
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
        </div>
      </Transition>

      <!-- AI: ошибка -->
      <Transition name="de-toast">
        <div v-if="aiError" class="de-toast de-toast--err">✗ {{ aiError }}</div>
      </Transition>

      <div class="de-actions">
        <button class="a-btn-sm" @click="step = 1">← поля</button>
        <button class="a-btn-sm" @click="printDocument">🖨 PDF</button>
        <button class="a-btn-sm" @click="downloadTxt">⬇ .txt</button>
        <button class="a-btn-save" :disabled="saving" @click="saveDocument">
          {{ saving ? 'сохраняется...' : '✓ сохранить документ' }}
        </button>
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
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const STEPS = ['Шаблон', 'Данные', 'Редактор']

// ── State ──
const step = ref(0)
const selectedTpl = ref<typeof props.templates[number] | null>(null)
const pickedProjectSlug  = ref('')
const pickedClientId     = ref(0)
const pickedContractorId = ref(0)
const pickedDesignerId   = ref(0)
const designersList      = ref<any[]>([])
const executorSaved      = ref(false)
const fieldValues = ref<Record<string, string>>({})
const fieldAutoFilled = ref<Record<string, boolean>>({})
const editorContent = ref('')
const editorEl      = ref<HTMLDivElement | null>(null)
const diffNewEl     = ref<HTMLDivElement | null>(null)
const saving        = ref(false)
const copyMsg       = ref('')
const saveMsg       = ref('')
const saveMsgType   = ref<'ok' | 'err'>('ok')
const ctx           = ref<any>(null)
const loadingCtx    = ref(false)
// ── Diff-состояние (для «улучшить») ──
const diffMode     = ref<'' | 'streaming' | 'review'>('')
const diffOriginal = ref('')
const diffNew      = ref('')

// ── Панель переменных {{...}} ──
const varsOpen = ref(false)

// Все доступные переменные: поля шаблона + проектные мета-данные
const allVars = computed(() => {
  const result: Array<{ key: string; label: string; value: string; group: string }> = []
  const vals = fieldValues.value

  // 1. Поля текущего шаблона
  if (selectedTpl.value) {
    for (const f of selectedTpl.value.fields) {
      result.push({ key: f.key, label: f.label, value: vals[f.key] || '', group: 'Поля шаблона' })
    }
  }

  // 2. Проектные данные (автозаполнение из проекта/клиента)
  const p = ctx.value?.project
  const projectVars: Array<[string, string, string]> = [
    ['client_name',          'ФИО клиента',              p?.client_name || vals.client_name || ''],
    ['client_phone',         'Телефон клиента',           p?.phone || vals.client_phone || ''],
    ['client_email',         'Email клиента',             p?.email || vals.client_email || ''],
    ['client_passport',      'Паспорт (серия номер)',     vals.client_passport || ''],
    ['client_passport_issued','Паспорт выдан',            vals.client_passport_issued || ''],
    ['client_passport_date', 'Дата выдачи паспорта',      vals.client_passport_date || ''],
    ['client_registration',  'Адрес регистрации',         vals.client_registration || ''],
    ['client_inn',           'ИНН клиента',               vals.client_inn || ''],
    ['client_address',       'Адрес клиента',             vals.client_address || ''],
    ['object_address',       'Адрес объекта',             p?.objectAddress || vals.object_address || ''],
    ['object_type',          'Тип объекта',               p?.objectType || vals.object_type || ''],
    ['area',                 'Площадь (кв.м)',            p?.objectArea || vals.area || ''],
    ['budget',               'Бюджет',                    p?.budget || vals.budget || ''],
    ['deadline',             'Срок выполнения',           p?.deadline || vals.deadline || ''],
    ['style',                'Стиль интерьера',           p?.style || vals.style || ''],
    ['contractor_name',      'Подрядчик',                 vals.contractor_name || ''],
    ['contractor_inn',       'ИНН подрядчика',            vals.contractor_inn || ''],
    ['contractor_address',   'Адрес подрядчика',          vals.contractor_address || ''],
    ['contractor_phone',     'Телефон подрядчика',        vals.contractor_phone || ''],
    ['contractor_account',   'Расчётный счёт',            vals.contractor_account || ''],
    ['contractor_bik',       'БИК',                       vals.contractor_bik || ''],
    ['contractor_bank',      'Банк',                      vals.contractor_bank || ''],
    ['remaining_amount',     'Остаток суммы',             computedRemaining.value || ''],
  ]
  for (const [key, label, value] of projectVars) {
    // Не дублируем поля шаблона
    if (!result.find(r => r.key === key)) {
      result.push({ key, label, value, group: 'Данные проекта' })
    }
  }

  // 3. Реквизиты исполнителя
  const executorVars: Array<[string, string]> = [
    ['executor_name',            'ФИО исполнителя'],
    ['executor_inn',             'ИНН исполнителя'],
    ['executor_passport',        'Паспорт исполнителя'],
    ['executor_passport_issued', 'Паспорт выдан'],
    ['executor_passport_date',   'Дата выдачи'],
    ['executor_registration',    'Прописка исполнителя'],
    ['executor_phone',           'Телефон исполнителя'],
    ['executor_email',           'Email исполнителя'],
    ['executor_bank',            'Банк'],
    ['executor_bik',             'БИК'],
    ['executor_account',         'Расчётный счёт'],
    ['executor_corr_account',    'Корреспондентский счёт'],
  ]
  for (const [key, label] of executorVars) {
    if (!result.find(r => r.key === key)) {
      result.push({ key, label, value: vals[key] || EXECUTOR_DEFAULTS[key] || '', group: 'Исполнитель' })
    }
  }

  return result
})

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

// ── Computed ──
const pickedClient = computed(() =>
  ctx.value?.clients?.find((c: any) => c.id === pickedClientId.value) || null
)
const pickedContractor = computed(() =>
  ctx.value?.contractors?.find((c: any) => c.id === pickedContractorId.value) || null
)
const pickedDesigner = computed(() =>
  designersList.value.find((d: any) => d.id === pickedDesignerId.value) || null
)

// ── Navigation ──
function handleBack() {
  if (step.value > 0) { step.value-- }
  else { emit('close') }
}

// ── Template selection ──
// ── Реквизиты исполнителя (Кульчихина Дария Андреевна) — дефолты
// Заполните один раз — будут подставляться во все шаблоны автоматически
const EXECUTOR_DEFAULTS: Record<string, string> = {
  executor_name:            'Кульчихина Дария Андреевна',
  executor_inn:             '',   // ← заполнить ИНН
  executor_passport:        '',
  executor_passport_issued: '',
  executor_passport_date:   '',
  executor_registration:    '',
  executor_phone:           '',
  executor_email:           'daria@kulchikhina.ru',
  executor_bank:            '',
  executor_bik:             '',
  executor_account:         '',
  executor_corr_account:    '',
}

function selectTemplate(tpl: typeof props.templates[number]) {
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
  if (i === 1 && !designersList.value.length) {
    $fetch<any[]>('/api/designers').then(ds => {
      designersList.value = ds || []
      if (designersList.value.length === 1 && !pickedDesignerId.value) {
        pickedDesignerId.value = designersList.value[0].id
        applyDesignerData()
      }
    }).catch(() => {})
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

// ── Load context from API ──
async function loadContext() {
  loadingCtx.value = true
  // Загружаем список дизайнеров при первом обращении
  if (!designersList.value.length) {
    try {
      const ds = await $fetch<any[]>('/api/designers')
      designersList.value = ds || []
      // Авто-выбор первого дизайнера если только один
      if (designersList.value.length === 1 && !pickedDesignerId.value) {
        pickedDesignerId.value = designersList.value[0].id
        applyDesignerData()
      }
    } catch { /* ignore */ }
  }
  try {
    ctx.value = await $fetch('/api/documents/context', {
      query: { projectSlug: pickedProjectSlug.value || '' },
    })
    if (ctx.value?.project) {
      applyProjectData()
    }
    if (ctx.value?.clients?.length === 1) {
      pickedClientId.value = ctx.value.clients[0].id
      applyClientData()
    }
  } catch (e) {
    console.error('Failed to load context', e)
  } finally {
    loadingCtx.value = false
  }
}

function applyProjectData() {
  if (!ctx.value?.project || !selectedTpl.value) return
  const p = ctx.value.project
  const map: Record<string, string> = {
    object_address: p.objectAddress || '',
    delivery_address: p.objectAddress || '',
    area: p.objectArea || '',
    budget: p.budget || '',
    deadline: p.deadline || '',
    client_name: p.client_name || '',
    client_address: p.objectAddress || '',
    client_phone: p.phone || '',
    client_email: p.email || '',
    object_type: p.objectType || '',
    object: `${p.objectType || ''} ${p.objectArea || ''} кв.м, ${p.objectAddress || ''}`.trim(),
    style: p.style || p._profile?.style || '',
    // Passport data from project profile
    client_passport: [p.passport_series, p.passport_number].filter(Boolean).join(' '),
    client_passport_issued: p.passport_issued_by || '',
    client_passport_date: p.passport_issue_date || '',
    client_registration: p.passport_registration_address || '',
    client_inn: p.passport_inn || '',
    penalty_pct: '0,1%',
  }
  applyMap(map)
}

function applyClientData() {
  const c = pickedClient.value
  if (!c || !selectedTpl.value) return
  applyMap({
    client_name: c.name || '',
    client_address: c.address || '',
    client_phone: c.phone || '',
    client_email: c.email || '',
  })
}

function applyContractorData() {
  const c = pickedContractor.value
  if (!c || !selectedTpl.value) return
  const companyOrName = c.companyName || c.name || ''
  applyMap({
    contractor_name: companyOrName,
    contractor: companyOrName,
    supplier_name: companyOrName,
    contractor_inn: c.inn || '',
    contractor_address: c.legalAddress || c.factAddress || '',
    contractor_phone: c.phone || '',
    contractor_email: c.email || '',
    contractor_bank: c.bankName || '',
    contractor_bik: c.bik || '',
    contractor_account: c.settlementAccount || '',
  })
}

function applyDesignerData() {
  const d = pickedDesigner.value
  if (!selectedTpl.value) return
  // Берём сохранённые реквизиты из localStorage
  const stored = loadExecutorFromStorage()
  const map: Record<string, string> = {
    ...stored,
    executor_name:  d?.name  || stored.executor_name  || EXECUTOR_DEFAULTS.executor_name,
    executor_phone: d?.phone || stored.executor_phone || EXECUTOR_DEFAULTS.executor_phone,
    executor_email: d?.email || stored.executor_email || EXECUTOR_DEFAULTS.executor_email,
  }
  applyMap(map)
}

const EXECUTOR_STORAGE_KEY = 'de_executor_defaults'

function loadExecutorFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(EXECUTOR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveExecutorToStorage() {
  const vals = fieldValues.value
  const data: Record<string, string> = {}
  for (const key of Object.keys(EXECUTOR_DEFAULTS)) {
    if (vals[key]) data[key] = vals[key]
  }
  try {
    localStorage.setItem(EXECUTOR_STORAGE_KEY, JSON.stringify(data))
    executorSaved.value = true
    setTimeout(() => { executorSaved.value = false }, 2500)
  } catch { /* ignore */ }
}

function applyMap(map: Record<string, string>) {
  if (!selectedTpl.value) return
  for (const f of selectedTpl.value.fields) {
    if (map[f.key] && (!fieldValues.value[f.key] || fieldAutoFilled.value[f.key])) {
      fieldValues.value[f.key] = map[f.key]
      fieldAutoFilled.value[f.key] = true
    }
  }
}

// ── Editor ──
function generateText(): string {
  if (!selectedTpl.value) return ''
  // Auto-compute derived fields before rendering
  computeDerivedFields()
  let text = selectedTpl.value.template
  for (const [k, v] of Object.entries(fieldValues.value)) {
    text = text.split(`{{${k}}}`).join(v || '__________')
  }
  // Replace any {{remaining}} shorthand
  const rem = computedRemaining.value
  text = text.split('{{remaining_amount}}').join(rem || '__________')
  return text
}

// ── Number → Russian words ──────────────────────────────────────────────────
const ONES  = ['','один','два','три','четыре','пять','шесть','семь','восемь','девять',
                'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
                'шестнадцать','семнадцать','восемнадцать','девятнадцать']
const TENS  = ['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто']
const HUND  = ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот']
const THOU  = ['','одна','две','три','четыре','пять','шесть','семь','восемь','девять',
                'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
                'шестнадцать','семнадцать','восемнадцать','девятнадцать']
const THOUS_SFX = (n: number) => {
  if (n >= 11 && n <= 14) return 'тысяч'
  const r = n % 10
  if (r === 1) return 'тысяча'
  if (r >= 2 && r <= 4) return 'тысячи'
  return 'тысяч'
}
const MILL_SFX = (n: number) => {
  if (n >= 11 && n <= 14) return 'миллионов'
  const r = n % 10
  if (r === 1) return 'миллион'
  if (r >= 2 && r <= 4) return 'миллиона'
  return 'миллионов'
}

function threeDigitsToWords(n: number, fem = false): string {
  if (n === 0) return ''
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const o = n % 10
  if (h) parts.push(HUND[h])
  if (t === 1) {
    parts.push(fem ? THOU[t * 10 + o] : ONES[t * 10 + o])
  } else {
    if (t) parts.push(TENS[t])
    if (o) parts.push(fem ? THOU[o] : ONES[o])
  }
  return parts.join(' ')
}

function numberToWords(n: number): string {
  if (n === 0) return 'ноль'
  const parts: string[] = []
  const mill = Math.floor(n / 1_000_000)
  const thou = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000

  if (mill) {
    parts.push(threeDigitsToWords(mill, false))
    parts.push(MILL_SFX(mill))
  }
  if (thou) {
    parts.push(threeDigitsToWords(thou, true))
    parts.push(THOUS_SFX(thou))
  }
  if (rest || (!mill && !thou)) {
    parts.push(threeDigitsToWords(rest, false))
  }
  return parts.filter(Boolean).join(' ')
}

// Capitalize first letter
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Parse amount from string like "350 000 руб." or "350000" → number
function parseRuAmount(s: string): number {
  const n = parseInt(s.replace(/\s/g, '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

// Format ISO date YYYY-MM-DD → DD.MM.YYYY
function formatIsoDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}.${m[2]}.${m[1]}`
  return s
}

// Computed: remaining = price - advance_amount
const computedRemaining = computed<string>(() => {
  const priceNum = parseRuAmount(fieldValues.value['price'] || '')
  const advAmt   = parseRuAmount(fieldValues.value['advance_amount'] || '')
  if (!priceNum || !advAmt) return ''
  const rem = priceNum - advAmt
  if (rem <= 0) return ''
  return `${rem.toLocaleString('ru-RU')} руб.`
})

// Auto-derive advance_amount and price_words when price/advance changes
function computeDerivedFields() {
  const vals = fieldValues.value
  const priceNum = parseRuAmount(vals['price'] || '')

  // advance_amount: if price + advance% filled and advance_amount empty
  if (priceNum && vals['advance'] && !vals['advance_amount']) {
    const pct = parseFloat(vals['advance'].replace('%', '').replace(',', '.'))
    if (!isNaN(pct) && pct > 0 && pct <= 100) {
      const amt = Math.round(priceNum * pct / 100)
      fieldValues.value['advance_amount'] = `${amt.toLocaleString('ru-RU')} руб.`
      fieldAutoFilled.value['advance_amount'] = true
    }
  }

  // price_words: if price filled and price_words empty
  if (priceNum && !vals['price_words']) {
    const words = capitalize(numberToWords(priceNum))
    const kopecks = `00 копеек`
    fieldValues.value['price_words'] = `${words} рублей ${kopecks}`
    fieldAutoFilled.value['price_words'] = true
  }

  // Format ISO dates
  for (const key of ['contract_date', 'client_passport_date', 'act_date', 'date', 'delivery_date']) {
    if (vals[key] && /^\d{4}-\d{2}-\d{2}/.test(vals[key])) {
      fieldValues.value[key] = formatIsoDate(vals[key])
      fieldAutoFilled.value[key] = true
    }
  }
}

// Watch price + advance to auto-fill
watch(
  () => [fieldValues.value['price'], fieldValues.value['advance']],
  ([price, advance]) => {
    if (!price) return
    const priceNum = parseRuAmount(price)
    if (!priceNum) return

    const pct = parseFloat((advance || '').replace('%', '').replace(',', '.'))
    if (!isNaN(pct) && pct > 0 && pct <= 100) {
      const amt = Math.round(priceNum * pct / 100)
      fieldValues.value['advance_amount'] = `${amt.toLocaleString('ru-RU')} руб.`
      fieldAutoFilled.value['advance_amount'] = true
    }
    if (!fieldValues.value['price_words']) {
      fieldValues.value['price_words'] = `${capitalize(numberToWords(priceNum))} рублей 00 копеек`
      fieldAutoFilled.value['price_words'] = true
    }
  }
)

function syncEditorContent() {
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
  const remPct = vals['advance'] ? String(100 - parseFloat(vals['advance'].replace('%','').replace(',','.')) || 50) : '50'
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
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 14%, transparent);
  color: var(--ds-accent, #6366f1);
}
.de-step--done { opacity: .55; }
.de-step-num {
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .55rem; font-weight: 600;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.de-step--active .de-step-num { background: var(--ds-accent, #6366f1); color: #fff; }
.de-step--done .de-step-num { background: color-mix(in srgb, var(--ds-success, #22c55e) 20%, transparent); color: var(--ds-success, #16a34a); }

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
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 25%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}
.de-chat-action-badge {
  font-weight: 600;
  font-size: .76rem;
  color: var(--ds-accent, #6366f1);
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
.de-chat-done { font-size: .65rem; color: var(--ds-success, #34d399); }
.de-chat-elapsed { font-size: .65rem; opacity: .45; }
.de-chat-writing { font-size: .65rem; opacity: .5; }
.de-chat-editing { font-size: .8rem; opacity: .7; font-style: italic; }
.de-chat-text { display: inline; }
.de-chat-cursor {
  display: inline-block;
  color: var(--ds-accent, #6366f1);
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
  background: var(--ds-accent, #6366f1);
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
  background: color-mix(in srgb, var(--ds-success, #22c55e) 18%, transparent);
  color: var(--ds-success, #16a34a); transition: background .15s;
}
.de-chat-apply-btn:hover { background: color-mix(in srgb, var(--ds-success, #22c55e) 28%, transparent); }

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
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 6%, transparent);
  color: color-mix(in srgb, var(--ds-accent, #6366f1) 80%, var(--glass-text));
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
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 16%, transparent);
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
.de-chat-input:focus { border-color: var(--ds-accent, #6366f1); }
.de-chat-input:disabled { opacity: .5; cursor: not-allowed; }
.de-chat-send {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; border: none;
  background: var(--ds-accent, #6366f1); color: #fff; font-size: 1rem;
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
  border-color: color-mix(in srgb, var(--ds-accent, #6366f1) 40%, transparent);
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 8%, transparent) !important;
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
  font-size: .5rem; padding: 0 4px; border-radius: 10px; line-height: 1.5;
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 15%, transparent);
  color: var(--ds-accent, #6366f1); opacity: 1;
}
.de-loading-fill {
  height: 100%; width: 30%; border-radius: 2px;
  background: var(--ds-accent, #6366f1);
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
  padding: 3px 10px; border-radius: 10px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}
.de-preview-chip--executor {
  opacity: .8;
  border: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 30%, transparent);
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 6%, transparent);
}
.de-save-executor-btn {
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 30%, transparent);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: .65rem;
  color: color-mix(in srgb, var(--ds-accent, #6366f1) 80%, white);
  transition: background .12s;
}
.de-save-executor-btn:hover { background: color-mix(in srgb, var(--ds-accent, #6366f1) 12%, transparent); }
.de-save-executor-btn--saved { color: #22c55e; border-color: rgba(34,197,94,.3); }

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
.de-field-auto { color: var(--ds-accent, #6366f1); font-size: .65rem; opacity: 1; }
.de-editor-btns { display: flex; gap: 2px; }
.de-tbtn {
  border: none; background: none; cursor: pointer;
  font-size: var(--ds-text-xs, .7rem); font-family: inherit;
  color: var(--glass-text); opacity: .35; padding: 4px 8px;
  border-radius: 6px; transition: all .15s ease;
}
.de-tbtn:hover { opacity: .8; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.de-copy-msg { font-size: var(--ds-text-xs, .7rem); color: var(--ds-accent, #6366f1); }

/* ── AI кнопки ── */
.de-ai-sep {
  color: var(--glass-text); opacity: .15; margin: 0 4px; font-size: .8rem; user-select: none;
}
.de-tbtn--ai {
  color: color-mix(in srgb, var(--ds-accent, #6366f1) 80%, var(--glass-text));
  opacity: .55;
}
.de-tbtn--ai:hover:not(:disabled) { opacity: 1; }
.de-tbtn--ai-active {
  opacity: 1 !important;
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 12%, transparent) !important;
  animation: de-ai-pulse 1.2s ease-in-out infinite;
}
.de-tbtn--ai:disabled { cursor: not-allowed; opacity: .25; }
@keyframes de-ai-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

/* ── AI кнопка стоп ── */
.de-tbtn--abort {
  color: var(--ds-error, #f87171);
  opacity: .85;
  border: 1px solid color-mix(in srgb, var(--ds-error, #f87171) 30%, transparent);
}
.de-tbtn--abort:hover { opacity: 1; background: color-mix(in srgb, var(--ds-error, #f87171) 12%, transparent) !important; }
.de-tbtn--continue {
  color: var(--ds-success, #22c55e) !important;
  border: 1px solid color-mix(in srgb, var(--ds-success, #22c55e) 30%, transparent);
  animation: de-continue-pulse 1.8s ease-in-out infinite;
}
.de-tbtn--continue:hover { background: color-mix(in srgb, var(--ds-success, #22c55e) 10%, transparent) !important; animation: none; }

/* ── Кнопка скачать DOCX ── */
.de-tbtn--docx {
  color: color-mix(in srgb, #3b82f6 80%, var(--glass-text));
  border: 1px solid color-mix(in srgb, #3b82f6 30%, transparent);
  opacity: .7;
}
.de-tbtn--docx:hover:not(:disabled) { opacity: 1; background: color-mix(in srgb, #3b82f6 10%, transparent) !important; }
.de-tbtn--docx:disabled { opacity: .3; cursor: not-allowed; }

/* ── Авто-сохранение ── */
.de-autosave-status {
  font-size: var(--ds-text-xs, .68rem);
  padding: 2px 8px;
  border-radius: 10px;
  transition: opacity .3s;
}
.de-autosave-status--saving { color: var(--glass-text); opacity: .5; }
.de-autosave-status--saved  { color: #22c55e; opacity: .85; }
.de-autosave-status--error  { color: #f87171; opacity: .85; }
@keyframes de-continue-pulse { 0%,100%{opacity:.75} 50%{opacity:1} }

/* ── Панель переменных (шаг 2 — поля шаблона) ── */
.de-vars-section {
  border: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 18%, transparent);
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
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 6%, transparent);
  border: none;
  cursor: pointer;
  font-size: var(--ds-text-xs, .7rem);
  color: var(--glass-text);
  text-align: left;
  transition: background .15s;
}
.de-vars-toggle:hover { background: color-mix(in srgb, var(--ds-accent, #6366f1) 12%, transparent); }
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
.de-var-row:hover { background: color-mix(in srgb, var(--ds-accent, #6366f1) 14%, transparent); }
.de-var-row--empty { opacity: .45; }
.de-var-key {
  font-family: monospace;
  font-size: .68rem;
  color: color-mix(in srgb, var(--ds-accent, #6366f1) 85%, white);
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
  border: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 25%, transparent);
  background: var(--glass-bg, #1a1a2e);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0,0,0,.35);
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
.de-var-item:hover { background: color-mix(in srgb, var(--ds-accent, #6366f1) 14%, transparent); }
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
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 8%, transparent);
  color: color-mix(in srgb, var(--ds-accent, #6366f1) 90%, var(--glass-text));
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
.de-model-sel:focus { opacity: 1; outline: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 40%, transparent); }

/* ── AI строка прогресса ── */
.de-ai-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: .75rem;
  color: color-mix(in srgb, var(--ds-accent, #6366f1) 70%, var(--glass-text));
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
  background: var(--ds-accent, #6366f1);
  animation: de-dot-pulse 1s ease-in-out infinite;
  flex-shrink: 0;
}
.de-ai-done-icon {
  font-size: .7rem;
  color: var(--ds-success, #22c55e);
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
  background: var(--ds-accent, #6366f1);
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
  color: var(--ds-accent, #6366f1);
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
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 15%, transparent);
  overflow: hidden;
  border-radius: 1px;
}
.de-ai-bar-fill {
  height: 100%;
  width: 40%;
  background: var(--ds-accent, #6366f1);
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
  border: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 20%, transparent);
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 4%, transparent) !important;
}
.de-ai-review-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.de-ai-review-title {
  font-size: var(--ds-text-xs, .72rem); font-weight: 600;
  color: var(--ds-accent, #6366f1); text-transform: uppercase; letter-spacing: .05em;
}
.de-ai-note {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 5px 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 5%, transparent);
  font-size: var(--ds-text-xs, .72rem);
}
.de-ai-note--error .de-ai-note-text { color: var(--ds-error, #dc2626); }
.de-ai-note--info  .de-ai-note-text { color: var(--glass-text); opacity: .75; }
.de-ai-note-icon { flex-shrink: 0; }
.de-ai-note-text  { line-height: 1.5; }

/* ── Правовые цитаты (RAG) ── */
.de-citations {
  padding: 12px 14px; margin-top: 8px;
  border: 1px solid color-mix(in srgb, var(--ds-success, #16a34a) 20%, transparent);
  background: color-mix(in srgb, var(--ds-success, #16a34a) 4%, transparent) !important;
}
.de-citations-head {
  display: flex; align-items: center; gap: 8px; justify-content: space-between;
  margin-bottom: 10px;
}
.de-citations-title {
  font-size: var(--ds-text-xs, .72rem); font-weight: 600; color: var(--ds-success, #16a34a);
  text-transform: uppercase; letter-spacing: .05em;
}
.de-citations-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--ds-success, #16a34a) 15%, transparent); color: var(--ds-success, #16a34a);
  font-size: .62rem; font-weight: 700;
  margin-right: auto;
}
html.dark .de-citations { border-color: rgba(134, 239, 172, .15); background: rgba(22, 163, 74, .07) !important; }
html.dark .de-citations-title { color: #86efac; }
html.dark .de-citations-count { background: rgba(134, 239, 172, .15); color: #86efac; }
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
  color: var(--ds-success, #16a34a); background: color-mix(in srgb, var(--ds-success, #16a34a) 10%, transparent);
  padding: 1px 5px; border-radius: 3px;
}
html.dark .de-citation-article { color: #86efac; background: rgba(134, 239, 172, .1); }
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
  background: color-mix(in srgb, var(--ds-success, #22c55e) 10%, transparent); color: var(--ds-success, #16a34a);
  border: 1px solid color-mix(in srgb, var(--ds-success, #22c55e) 20%, transparent);
}
.de-toast--err {
  background: color-mix(in srgb, var(--ds-error, #dc2626) 10%, transparent); color: var(--ds-error, #dc2626);
  border: 1px solid rgba(220, 38, 38, .2);
}
html.dark .de-toast--ok { background: rgba(34, 197, 94, .15); color: #86efac; }
html.dark .de-toast--err { background: rgba(220, 38, 38, .15); color: #fca5a5; }

.de-toast-enter-active, .de-toast-leave-active { transition: all .25s ease; }
.de-toast-enter-from, .de-toast-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
