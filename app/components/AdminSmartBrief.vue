<template>
  <div class="asb-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Баннер режима редактирования -->
      <div v-if="editMode" class="asb-edit-banner">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z"/></svg>
        <span class="asb-edit-banner-text">редактирование структуры брифа</span>
        <button type="button" class="asb-reset-btn" @click="resetBriefConfig" title="Сбросить все кастомизации к шаблону по типу объекта">сбросить к шаблону</button>
      </div>

      <div v-for="(section, sIdx) in activeSections" :key="section.key" class="asb-section" :class="{ 'asb-section--edit': editMode }">
        <!-- Заголовок секции -->
        <div class="asb-section-title">
          {{ section.title }}
          <template v-if="section.key === 'requirements'">
            <span v-if="form.objectType" class="asb-type-hint">{{ objectTypeLabel }}</span>
            <span v-else class="asb-type-hint asb-type-hint--warn">⚠ укажите тип объекта в параметрах (0.1) для точных тегов</span>
          </template>
          <template v-if="editMode">
            <div class="asb-section-move">
              <button type="button" class="asb-move-btn" :disabled="sIdx === 0" @click="moveSectionUp(section.key)" title="Переместить вверх">↑</button>
              <button type="button" class="asb-move-btn" :disabled="sIdx === activeSections.length - 1" @click="moveSectionDown(section.key)" title="Переместить вниз">↓</button>
            </div>
            <button class="asb-section-rm" type="button" @click="hideSection(section.key)" title="Скрыть раздел">×</button>
          </template>
        </div>

        <!-- Обычные поля формы -->
        <div v-if="section.type === 'fields'" class="ass-upload-zone">

          <!-- Режим просмотра -->
          <template v-if="!editMode">
            <div v-for="f in getVisibleFields(section)" :key="f.key" class="ass-upload-row">
              <label class="ass-field-label">{{ f.label }}</label>
              <div v-if="f.type === 'options'" class="asb-btngroup">
                <button
                  v-for="option in f.options"
                  :key="`${f.key}-${option}`"
                  type="button"
                  class="asb-btnopt"
                  :class="{ 'asb-btnopt--on': form[f.key] === option }"
                  @click="toggleSingleChoiceAndSave(f.key, option)"
                >{{ option }}</button>
              </div>
              <textarea
                v-else-if="f.type === 'textarea'"
                v-model="form[f.key]"
                class="glass-input"
                :placeholder="f.placeholder || ''"
                rows="2"
                @blur="save"
              />
              <GlassInput
                v-else
                v-model="form[f.key]"
                
                type="text"
                :placeholder="f.placeholder || ''"
                @blur="save"
              />
            </div>
            <!-- Кастомные поля -->
            <div v-for="cf in getCustomFields(section.key)" :key="cf.id" class="ass-upload-row">
              <label class="ass-field-label">{{ cf.label }}</label>
              <textarea v-if="cf.type === 'textarea'" v-model="form[cf.id]" class="glass-input" :placeholder="cf.placeholder || ''" rows="2" @blur="save"/>
              <GlassInput v-else v-model="form[cf.id]"  type="text" :placeholder="cf.placeholder || ''" @blur="save"/>
            </div>
          </template>

          <!-- Режим редактирования -->
          <template v-else>
            <div
              v-for="f in section.fields"
              :key="f.key"
              class="ass-upload-row asb-editable-row"
              :class="{ 'asb-field--off': isFieldHidden(f.key) }"
            >
              <div class="asb-row-ctrl">
                <button v-if="isFieldHidden(f.key)" type="button" class="asb-ctrl-btn asb-ctrl-restore" @click="restoreField(f.key)" title="Показать поле">↩</button>
                <button v-else type="button" class="asb-ctrl-btn asb-ctrl-rm" @click="hideField(f.key)" title="Скрыть поле">×</button>
              </div>
              <label class="ass-field-label">{{ f.label }}</label>
              <div v-if="f.type === 'options'" class="asb-btngroup">
                <button
                  v-for="option in f.options"
                  :key="`${f.key}-${option}`"
                  type="button"
                  class="asb-btnopt"
                  :class="{ 'asb-btnopt--on': form[f.key] === option }"
                  @click="toggleSingleChoiceAndSave(f.key, option)"
                >{{ option }}</button>
              </div>
              <textarea
                v-else-if="f.type === 'textarea'"
                v-model="form[f.key]"
                class="glass-input"
                :placeholder="f.placeholder || ''"
                rows="2"
                @blur="save"
              />
              <GlassInput
                v-else
                v-model="form[f.key]"
                
                type="text"
                :placeholder="f.placeholder || ''"
                @blur="save"
              />
            </div>
            <!-- Кастомные поля (с удалением) -->
            <div v-for="cf in getCustomFields(section.key)" :key="cf.id" class="ass-upload-row asb-editable-row">
              <div class="asb-row-ctrl">
                <button type="button" class="asb-ctrl-btn asb-ctrl-rm" @click="removeCustomField(cf.id)" title="Удалить">×</button>
              </div>
              <label class="ass-field-label">{{ cf.label }} <span class="asb-custom-badge">свой</span></label>
              <textarea v-if="cf.type === 'textarea'" v-model="form[cf.id]" class="glass-input" :placeholder="cf.placeholder || ''" rows="2" @blur="save"/>
              <GlassInput v-else v-model="form[cf.id]"  type="text" :placeholder="cf.placeholder || ''" @blur="save"/>
            </div>
            <!-- Форма добавления вопроса -->
            <div v-if="addFieldOpen === section.key" class="asb-add-field-form">
              <GlassInput
                v-model="addFieldLabel"
                
                type="text"
                placeholder="Название вопроса"
                @keydown.enter.prevent="confirmAddField(section.key)"
                @keydown.escape="addFieldOpen = null"
              />
              <GlassInput
                v-model="addFieldPlaceholder"
                
                type="text"
                placeholder="Подсказка (необязательно)"
                @keydown.escape="addFieldOpen = null"
              />
              <div class="asb-aftype">
                <button type="button" class="asb-aftype-btn" :class="{'asb-aftype-btn--on': addFieldType === 'textarea'}" @click="addFieldType = 'textarea'">Многострочное</button>
                <button type="button" class="asb-aftype-btn" :class="{'asb-aftype-btn--on': addFieldType === 'text'}" @click="addFieldType = 'text'">Однострочное</button>
              </div>
              <div class="asb-af-actions">
                <GlassButton variant="secondary" density="compact" type="button"  @click="confirmAddField(section.key)" :disabled="!addFieldLabel.trim()">Добавить</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button"  style="opacity:.6" @click="addFieldOpen = null">Отмена</GlassButton>
              </div>
            </div>
            <button v-else type="button" class="asb-add-field-btn" @click="openAddField(section.key)">+ добавить вопрос</button>
          </template>
        </div>

        <!-- Сетка тегов-требований -->
        <div v-else-if="section.type === 'requirements'" class="asb-checks-grid">
          <button
            v-for="req in filteredRequirements"
            :key="req.key"
            type="button"
            class="asb-tagopt"
            :class="{ 'asb-tagopt--on': !!form[req.key] }"
            @click="toggle(req.key)"
          >{{ req.label }}</button>
        </div>
      </div>

      <!-- Добавить раздел (редактирование) -->
      <div v-if="editMode && inactiveSections.length > 0" class="asb-add-section-bar">
        <div class="asb-add-section-label">добавить раздел:</div>
        <div class="asb-add-section-list">
          <button
            v-for="s in inactiveSections"
            :key="s.key"
            type="button"
            class="asb-add-section-btn"
            @click="addSection(s.key)"
          >+ {{ s.title }}</button>
        </div>
      </div>

      <!-- Footer -->
      <div class="asb-footer">
        <div class="asb-progress-wrap" :title="`Заполнено ${completionPercent}% вопросов`">
          <div class="asb-progress-track"><div class="asb-progress-bar" :style="{ width: completionPercent + '%' }"/></div>
          <span class="asb-progress-label">{{ completionPercent }}%</span>
        </div>
        <span v-if="savedAt" class="asb-saved">✓ сохранено {{ savedAt }}</span>
        <button class="asb-btn-save" @click="save" :disabled="saving">
          {{ saving ? 'сохранение...' : 'сохранить бриф' }}
        </button>
      </div>

      <!-- FAB редактирования структуры -->
      <div class="asb-fab-wrap">
        <button
          type="button"
          class="asb-fab-edit"
          :class="{ 'asb-fab-edit--on': editMode }"
          @click="editMode = !editMode"
          :title="editMode ? 'Завершить редактирование' : 'Редактировать структуру'"
        >
          <span v-if="editMode" class="asb-fab-icon">✓</span>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z"/></svg>
          <span class="asb-fab-label">{{ editMode ? 'готово' : 'изменить' }}</span>
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { getBriefSections, BRIEF_SECTIONS } from '~~/shared/constants/brief-sections'
import type { BriefSectionDef, BriefSectionKey } from '~~/shared/constants/brief-sections'
import { BRIEF_REQUIREMENTS, OBJECT_TYPE_LABELS } from '~/utils/brief-requirements'

const props = withDefaults(defineProps<{ slug: string; clientMode?: boolean }>(), {
  clientMode: false,
})

// Forward cookies so SSR works both в admin-контексте и в ClientBrief.vue
const reqHeaders = useRequestHeaders(['cookie'])
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`, { headers: reqHeaders })

const form = reactive<Record<string, any>>({})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, p.profile)
  }
}, { immediate: true })

const objectTypeLabel = computed(() => {
  const key = String(form.objectType || '') as keyof typeof OBJECT_TYPE_LABELS
  return OBJECT_TYPE_LABELS[key] || String(form.objectType || '')
})

// ── Редактор структуры брифа ───────────────────────────────────────
interface BriefCustomField {
  id: string
  sectionKey: string
  label: string
  type: 'text' | 'textarea'
  placeholder?: string
}
interface BriefConfig {
  active?: string[]
  hiddenFields?: string[]
  customFields?: BriefCustomField[]
}

const editMode = ref(false)

function getBriefCfg(): BriefConfig {
  const cfg = form.brief_config
  if (cfg && typeof cfg === 'object') return JSON.parse(JSON.stringify(cfg)) as BriefConfig
  return {}
}
function setBriefCfg(cfg: BriefConfig) {
  form.brief_config = cfg
  save()
}

// Секции брифинга по типу объекта (data-driven из brief-sections.ts)
const activeSections = computed((): BriefSectionDef[] => {
  const projectType = project.value?.projectType || 'apartment'
  const cfg = form.brief_config as BriefConfig | undefined
  if (cfg?.active?.length) {
    return (cfg.active as string[])
      .map(k => BRIEF_SECTIONS[k as BriefSectionKey])
      .filter(Boolean) as BriefSectionDef[]
  }
  return getBriefSections(projectType)
})

const inactiveSections = computed((): BriefSectionDef[] => {
  const activeKeys = new Set(activeSections.value.map(s => s.key))
  return (Object.keys(BRIEF_SECTIONS) as BriefSectionKey[])
    .filter(k => !activeKeys.has(k))
    .map(k => BRIEF_SECTIONS[k])
})

function getVisibleFields(section: BriefSectionDef) {
  const cfg = form.brief_config as BriefConfig | undefined
  const hidden = cfg?.hiddenFields || []
  return (section.fields || []).filter(f => !hidden.includes(f.key))
}
function getCustomFields(sectionKey: string): BriefCustomField[] {
  const cfg = form.brief_config as BriefConfig | undefined
  return (cfg?.customFields || []).filter(f => f.sectionKey === sectionKey)
}
function isFieldHidden(fieldKey: string) {
  const cfg = form.brief_config as BriefConfig | undefined
  return (cfg?.hiddenFields || []).includes(fieldKey)
}

function hideSection(sectionKey: string) {
  const cfg = getBriefCfg()
  if (!cfg.active) {
    cfg.active = getBriefSections(project.value?.projectType || 'apartment').map(s => s.key)
  }
  cfg.active = cfg.active.filter(k => k !== sectionKey)
  setBriefCfg(cfg)
}
function addSection(sectionKey: string) {
  const cfg = getBriefCfg()
  if (!cfg.active) {
    cfg.active = getBriefSections(project.value?.projectType || 'apartment').map(s => s.key)
  }
  if (!cfg.active.includes(sectionKey)) cfg.active.push(sectionKey)
  setBriefCfg(cfg)
}
function hideField(fieldKey: string) {
  const cfg = getBriefCfg()
  const hidden = cfg.hiddenFields || []
  if (!hidden.includes(fieldKey)) hidden.push(fieldKey)
  cfg.hiddenFields = hidden
  setBriefCfg(cfg)
}
function restoreField(fieldKey: string) {
  const cfg = getBriefCfg()
  cfg.hiddenFields = (cfg.hiddenFields || []).filter(k => k !== fieldKey)
  setBriefCfg(cfg)
}

const addFieldOpen = ref<string | null>(null)
const addFieldLabel = ref('')
const addFieldType = ref<'text' | 'textarea'>('textarea')
const addFieldPlaceholder = ref('')

function openAddField(sectionKey: string) {
  addFieldOpen.value = sectionKey
  addFieldLabel.value = ''
  addFieldType.value = 'textarea'
  addFieldPlaceholder.value = ''
}
function confirmAddField(sectionKey: string) {
  if (!addFieldLabel.value.trim()) return
  const cfg = getBriefCfg()
  const custom = cfg.customFields || []
  custom.push({
    id: `custom_${Date.now()}`,
    sectionKey,
    label: addFieldLabel.value.trim(),
    type: addFieldType.value,
    placeholder: addFieldPlaceholder.value.trim() || undefined,
  })
  cfg.customFields = custom
  setBriefCfg(cfg)
  addFieldOpen.value = null
}
function removeCustomField(id: string) {
  const cfg = getBriefCfg()
  cfg.customFields = (cfg.customFields || []).filter(f => f.id !== id)
  setBriefCfg(cfg)
}

function moveSectionUp(sectionKey: string) {
  const cfg = getBriefCfg()
  if (!cfg.active) cfg.active = activeSections.value.map(s => s.key)
  const idx = cfg.active.indexOf(sectionKey)
  if (idx > 0) {
    const item = cfg.active.splice(idx, 1)[0]!
    cfg.active.splice(idx - 1, 0, item)
    setBriefCfg(cfg)
  }
}
function moveSectionDown(sectionKey: string) {
  const cfg = getBriefCfg()
  if (!cfg.active) cfg.active = activeSections.value.map(s => s.key)
  const idx = cfg.active.indexOf(sectionKey)
  if (idx !== -1 && idx < cfg.active.length - 1) {
    const item = cfg.active.splice(idx, 1)[0]!
    cfg.active.splice(idx + 1, 0, item)
    setBriefCfg(cfg)
  }
}
function resetBriefConfig() {
  setBriefCfg({})
}

const completionPercent = computed(() => {
  const allKeys = activeSections.value.flatMap(s => {
    if (s.type !== 'fields') return []
    return [
      ...getVisibleFields(s).map(f => f.key),
      ...getCustomFields(s.key).map(c => c.id),
    ]
  })
  if (!allKeys.length) return 0
  const filled = allKeys.filter(k => {
    const v = form[k]
    return typeof v === 'string' ? v.trim().length > 0 : !!v
  }).length
  return Math.round(filled / allKeys.length * 100)
})

// Теги-требования для секции requirements
const filteredRequirements = computed(() => {
  const objType = String(form.objectType || '') as keyof typeof BRIEF_REQUIREMENTS
  const specific = BRIEF_REQUIREMENTS[objType] || BRIEF_REQUIREMENTS.apartment || []
  const common = BRIEF_REQUIREMENTS._common || []
  const seen = new Set(specific.map((r: { key: string }) => r.key))
  return [...specific, ...common.filter((r: { key: string }) => !seen.has(r.key))]
})

function toggle(key: string) {
  form[key] = !form[key]
  save()
}

function toggleSingleChoiceAndSave(key: string, option: string) {
  form[key] = form[key] === option ? '' : option
  save()
}

// ── Save ──────────────────────────────────────────────────────────
const saving = ref(false)
const { savedAt, touch: markSaved } = useTimestamp()

async function save() {
  saving.value = true
  try {
    // Проверяем — достаточно ли полей заполнено чтобы считать бриф завершённым
    const filledCount = Object.entries(form)
      .filter(([k, v]) => k.startsWith('brief_') && typeof v === 'string' && v.trim())
      .length
    const briefCompleted = filledCount >= 4 || (form as any).brief_completed
    if (props.clientMode) {
      await $fetch(`/api/projects/${props.slug}/client-profile`, {
        method: 'PUT',
        body: { ...form, brief_completed: briefCompleted },
      })
      if (project.value?.profile) {
        Object.assign(project.value.profile, { ...form, brief_completed: briefCompleted })
      }
    } else {
      await $fetch(`/api/projects/${props.slug}`, {
        method: 'PUT',
        body: { profile: { ...project.value?.profile, ...form, brief_completed: briefCompleted } }
      })
    }
    markSaved()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.asb-wrap { padding: 4px 0 48px; }
.asb-loading { font-size: .88rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); }

/* Sections */
.asb-section { margin-bottom: 32px; }
.asb-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.asb-type-hint {
  font-size: .7rem; text-transform: none; letter-spacing: 0;
  background: color-mix(in srgb, var(--ds-accent) 12%, transparent); color: var(--ds-accent); padding: 2px 8px; border-radius: 10px; font-weight: 500;
}
.asb-type-hint--warn { background: color-mix(in srgb, var(--ds-warning) 12%, transparent); color: var(--ds-warning); }

/* Requirements tag cloud */
.asb-checks-grid {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.asb-tagopt {
  padding: 6px 14px; font-size: .76rem; cursor: pointer; user-select: none;
  border: 1px solid color-mix(in srgb, var(--glass-text) 15%, transparent);
  border-radius: 999px; font-family: inherit;
  background: color-mix(in srgb, var(--glass-bg, #fff) 80%, transparent);
  color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  transition: background .16s, color .16s, border-color .16s;
}
.asb-tagopt:hover { color: var(--glass-text); border-color: color-mix(in srgb, var(--glass-text) 35%, transparent); }
.asb-tagopt--on {
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: var(--glass-text); border: 1.5px solid var(--glass-text); font-weight: 500;
}

/* Footer */
.asb-footer {
  display: flex; align-items: center; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec); margin-top: 8px;
}
.asb-progress-wrap { display: flex; align-items: center; gap: 8px; margin-right: auto; }
.asb-progress-track {
  width: 72px; height: 3px;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 99px; overflow: hidden;
}
.asb-progress-bar { height: 100%; background: var(--ds-accent); border-radius: 99px; transition: width .4s ease; }
.asb-progress-label { font-size: .7rem; color: color-mix(in srgb, var(--glass-text) 38%, transparent); min-width: 28px; }
.asb-saved { font-size: .76rem; color: var(--ds-success); }
.asb-btn-save {
  border: 1px solid var(--text, #1a1a1a); background: var(--text, #1a1a1a);
  color: var(--bg, #fff); padding: 10px 24px; font-size: .85rem;
  cursor: pointer; font-family: inherit;
}
.asb-btn-save:disabled { opacity: .55; cursor: default; }
.asb-btn-save:hover:not(:disabled) { opacity: .85; }

/* Button group — single choice */
.asb-btngroup {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}
.asb-btnopt {
  padding: 6px 14px; font-size: .76rem; cursor: pointer; user-select: none;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 999px; font-family: inherit;
  background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  transition: background .16s, color .16s, border-color .16s;
}
.asb-btnopt:hover { color: var(--text, #1a1a1a); border-color: var(--text, #1a1a1a); }
.asb-btnopt--on {
  background: transparent;
  color: var(--glass-text, #1a1a1a);
  border: 2px solid var(--glass-text, #1a1a1a);
  font-weight: 600;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .asb-footer { flex-direction: column; align-items: stretch; gap: 10px; }
  .asb-btn-save { width: 100%; text-align: center; }
  .asb-section-title { flex-direction: column; align-items: flex-start; }
}

/* ── Edit mode ── */
.asb-section-rm {
  background: none; border: none; cursor: pointer;
  font-size: 1.05rem; line-height: 1; padding: 0 4px;
  color: color-mix(in srgb, var(--glass-text) 30%, transparent);
  transition: color .15s;
}
.asb-section-rm:hover { color: var(--ds-danger, #e35b5b); }

.asb-editable-row { position: relative; padding-left: 28px !important; }
.asb-row-ctrl {
  position: absolute; left: 0; top: 14px;
  display: flex; align-items: center;
}
.asb-ctrl-btn {
  width: 20px; height: 20px; border-radius: 50%; border: none; cursor: pointer;
  font-size: .72rem; display: flex; align-items: center; justify-content: center;
  font-family: inherit; transition: background .15s;
}
.asb-ctrl-rm {
  background: color-mix(in srgb, var(--ds-danger, #e35b5b) 12%, transparent);
  color: var(--ds-danger, #e35b5b);
}
.asb-ctrl-rm:hover { background: color-mix(in srgb, var(--ds-danger, #e35b5b) 24%, transparent); }
.asb-ctrl-restore {
  background: color-mix(in srgb, var(--ds-accent) 12%, transparent);
  color: var(--ds-accent);
}
.asb-ctrl-restore:hover { background: color-mix(in srgb, var(--ds-accent) 24%, transparent); }

.asb-field--off { opacity: .35; pointer-events: none; }
.asb-field--off .asb-row-ctrl { pointer-events: all; }

.asb-custom-badge {
  font-size: .62rem;
  background: color-mix(in srgb, var(--ds-accent) 15%, transparent);
  color: var(--ds-accent); padding: 1px 6px; border-radius: 8px;
  font-weight: 500; margin-left: 4px;
}

/* Форма добавления вопроса */
.asb-add-field-form {
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 14px; margin: 8px 0;
  border: 1px dashed color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 8px;
}
.asb-aftype { display: flex; gap: 6px; }
.asb-aftype-btn {
  padding: 4px 12px; font-size: .74rem; cursor: pointer; font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 99px; background: none;
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  transition: all .15s;
}
.asb-aftype-btn--on { border-color: var(--glass-text); color: var(--glass-text); font-weight: 600; }
.asb-af-actions { display: flex; gap: 8px; }
.asb-add-field-btn {
  width: 100%; padding: 8px; margin-top: 4px;
  background: none; border: 1px dashed color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 6px; cursor: pointer; font-family: inherit; font-size: .76rem;
  color: color-mix(in srgb, var(--glass-text) 40%, transparent);
  transition: all .15s;
}
.asb-add-field-btn:hover {
  border-color: var(--glass-text); color: var(--glass-text);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}

/* Панель добавления раздела */
.asb-add-section-bar {
  margin-bottom: 24px; padding: 14px 16px;
  border: 1px dashed color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 8px;
}
.asb-add-section-label {
  font-size: .68rem; text-transform: uppercase; letter-spacing: 1px;
  color: color-mix(in srgb, var(--glass-text) 40%, transparent); margin-bottom: 10px;
}
.asb-add-section-list { display: flex; flex-wrap: wrap; gap: 6px; }
.asb-add-section-btn {
  padding: 5px 13px; font-size: .76rem; cursor: pointer; font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 99px; background: none;
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  transition: all .15s;
}
.asb-add-section-btn:hover {
  border-color: var(--ds-accent); color: var(--ds-accent);
  background: color-mix(in srgb, var(--ds-accent) 8%, transparent);
}

/* FAB редактирования структуры — правый нижний угол */
.asb-fab-wrap {
  position: sticky;
  bottom: 20px;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;
  margin-top: 16px;
  z-index: 20;
}
.asb-fab-edit {
  pointer-events: all;
  display: flex; align-items: center; gap: 6px;
  padding: 9px 16px 9px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  background: var(--glass-bg, #fff);
  box-shadow: 0 2px 14px color-mix(in srgb, var(--glass-text) 10%, transparent);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  cursor: pointer; font-family: inherit; font-size: .78rem;
  transition: all .18s;
  backdrop-filter: blur(8px);
}
.asb-fab-edit:hover {
  border-color: var(--glass-text);
  color: var(--glass-text);
  box-shadow: 0 4px 18px color-mix(in srgb, var(--glass-text) 16%, transparent);
}
.asb-fab-edit--on {
  border-color: var(--ds-accent);
  color: var(--ds-accent);
  background: color-mix(in srgb, var(--ds-accent) 8%, transparent);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--ds-accent) 20%, transparent);
}
.asb-fab-icon { font-size: .9rem; line-height: 1; }
.asb-fab-label { font-weight: 500; }

html.dark .asb-fab-edit {
  background: color-mix(in srgb, var(--glass-bg) 80%, transparent);
}

/* ── Баннер режима редактирования ── */
.asb-edit-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; margin-bottom: 20px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ds-accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-accent) 22%, transparent);
  font-size: .78rem; color: var(--ds-accent);
}
.asb-edit-banner-text { flex: 1; font-weight: 500; }
.asb-reset-btn {
  padding: 4px 12px; font-size: .72rem; cursor: pointer; font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--ds-accent) 35%, transparent);
  border-radius: 99px; background: none; color: var(--ds-accent);
  transition: all .15s; white-space: nowrap;
}
.asb-reset-btn:hover { background: color-mix(in srgb, var(--ds-accent) 14%, transparent); }

/* Подсветка раздела в режиме редактирования */
.asb-section--edit {
  border-radius: 8px;
  outline: 1.5px dashed color-mix(in srgb, var(--ds-accent) 22%, transparent);
  outline-offset: 8px;
  transition: outline-color .2s;
}

/* Кнопки перемещения раздела */
.asb-section-move { display: flex; gap: 2px; margin-left: auto; }
.asb-move-btn {
  width: 22px; height: 22px; border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: none; cursor: pointer; font-family: inherit; font-size: .8rem;
  color: color-mix(in srgb, var(--glass-text) 40%, transparent);
  display: flex; align-items: center; justify-content: center;
  transition: background .12s, color .12s;
}
.asb-move-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: var(--glass-text);
}
.asb-move-btn:disabled { opacity: .22; cursor: default; }

/* Mobile дополнения */
@media (max-width: 768px) {
  .asb-progress-track { width: 48px; }
  .asb-edit-banner { flex-wrap: wrap; }
}

</style>
