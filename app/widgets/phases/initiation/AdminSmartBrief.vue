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

      <div
        v-for="(section, sIdx) in activeSections"
        :key="section.key"
        class="asb-section"
        :class="{
          'asb-section--edit': editMode,
          'asb-section--expanded': isSectionExpanded(section.key),
        }"
      >
        <div class="asb-section-head">
          <button
            type="button"
            class="asb-section-toggle"
            :class="{ 'asb-section-toggle--expanded': isSectionExpanded(section.key) }"
            :aria-expanded="isSectionExpanded(section.key) ? 'true' : 'false'"
            @click="toggleSection(section.key)"
          >
            <div class="asb-section-title-wrap">
              <span class="asb-section-title">{{ section.title }}</span>
              <div class="asb-section-meta">
                <span class="asb-section-progress">{{ getSectionFilledCount(section) }}/{{ getSectionQuestionCount(section) }}</span>
                <template v-if="section.key === 'requirements'">
                  <span v-if="form.objectType" class="asb-type-hint">{{ objectTypeLabel }}</span>
                  <span v-else class="asb-type-hint asb-type-hint--warn">⚠ укажите тип объекта в параметрах (0.1) для точных тегов</span>
                </template>
              </div>
            </div>
            <span class="asb-section-chevron" :class="{ 'asb-section-chevron--expanded': isSectionExpanded(section.key) }">⌄</span>
          </button>

          <template v-if="editMode">
            <div class="asb-section-actions">
              <div class="asb-section-move">
                <button type="button" class="asb-move-btn" :disabled="sIdx === 0" @click="moveSectionUp(section.key)" title="Переместить вверх">↑</button>
                <button type="button" class="asb-move-btn" :disabled="sIdx === activeSections.length - 1" @click="moveSectionDown(section.key)" title="Переместить вниз">↓</button>
              </div>
              <button class="asb-section-rm" type="button" @click="hideSection(section.key)" title="Скрыть раздел">×</button>
            </div>
          </template>
        </div>

        <div v-show="isSectionExpanded(section.key)" class="asb-section-panel">
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

const expandedSectionKey = ref<string | null>(null)

watch([activeSections, editMode], ([sections, editing]) => {
  if (editing) return

  const keys = sections.map(section => section.key)
  if (!keys.length) {
    expandedSectionKey.value = null
    return
  }

  if (!expandedSectionKey.value || !keys.includes(expandedSectionKey.value)) {
    expandedSectionKey.value = keys[0]
  }
}, { immediate: true })

function isSectionExpanded(sectionKey: string) {
  return editMode.value || expandedSectionKey.value === sectionKey
}

function toggleSection(sectionKey: string) {
  if (editMode.value) return
  expandedSectionKey.value = expandedSectionKey.value === sectionKey ? null : sectionKey
}

function getVisibleFields(section: BriefSectionDef) {
  const cfg = form.brief_config as BriefConfig | undefined
  const hidden = cfg?.hiddenFields || []
  return (section.fields || []).filter(f => !hidden.includes(f.key))
}
function getCustomFields(sectionKey: string): BriefCustomField[] {
  const cfg = form.brief_config as BriefConfig | undefined
  return (cfg?.customFields || []).filter(f => f.sectionKey === sectionKey)
}

function isAnswerFilled(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : !!value
}

function getSectionStatKeys(section: BriefSectionDef) {
  if (section.type === 'requirements') {
    return filteredRequirements.value.map(req => req.key)
  }

  return [
    ...getVisibleFields(section).map(f => f.key),
    ...getCustomFields(section.key).map(f => f.id),
  ]
}

function getSectionQuestionCount(section: BriefSectionDef) {
  return getSectionStatKeys(section).length
}

function getSectionFilledCount(section: BriefSectionDef) {
  return getSectionStatKeys(section).filter(key => isAnswerFilled(form[key])).length
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

<style scoped src="./AdminSmartBrief.scoped.css"></style>
