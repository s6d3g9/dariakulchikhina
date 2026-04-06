<template>
  <GlassSurface  class="content-wrap ">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else-if="normalizedContent">
      <p class="content-hint">Выбранные пункты сохраняются на сервере и доступны с разных устройств</p>

      <!-- materials / profile: с вкладками -->
      <div v-if="normalizedContent.tabs">
        <div class="content-tabs glass-surface">
          <button
            v-for="tab in normalizedContent.tabs"
            :key="tab.id"
            class="content-tab-btn glass-chip"
            :class="activeTab === tab.id
              ? 'content-tab-btn--active'
              : 'content-tab-btn--idle'"
            @click="activeTab = tab.id"
          >
            {{ tab.title }}
          </button>
        </div>
        <template v-for="tab in normalizedContent.tabs" :key="tab.id">
          <div v-if="activeTab === tab.id" class="tab-pane">
            <h3 v-if="tab.heading" class="pane-heading">{{ tab.heading }}</h3>
            <div v-if="tab.image" class="pane-image-wrap">
              <img class="pane-image" :src="resolveImageSrc(tab.image)" :alt="tab.title || tab.id">
            </div>
            <div v-for="group in tab.groups" :key="group.label" class="group-block">
              <h4 class="group-label">{{ group.label }}</h4>
              <ul class="group-list">
                <li v-for="(item, idx) in group.items" :key="idx">
                  <button
                    type="button"
                    class="group-choice glass-chip"
                    :class="{ 'group-choice--active': isGroupOptionSelected(tab.id, group.label, idx) }"
                    @click="selectGroupOption(tab.id, group.label, idx)"
                  >
                    {{ item.text || item.label || item }}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </template>
      </div>

      <!-- tz: с секциями -->
      <div v-else-if="normalizedContent.sections" class="section-stack">
        <div
          v-for="(section, si) in normalizedContent.sections"
          :key="getSectionKey(section, si)"
          class="section-block"
          :class="{ 'section-block--expanded': isSectionExpanded(getSectionKey(section, si)) }"
        >
          <button
            type="button"
            class="section-toggle"
            :aria-expanded="isSectionExpanded(getSectionKey(section, si)) ? 'true' : 'false'"
            @click="toggleSection(getSectionKey(section, si))"
          >
            <span class="section-title-wrap">
              <span class="section-title">{{ section.num }}. {{ section.title }}</span>
              <span class="section-meta">{{ getAnsweredQuestionsCount(section, si) }}/{{ section.questions.length }}</span>
            </span>
            <span class="section-chevron" :class="{ 'section-chevron--expanded': isSectionExpanded(getSectionKey(section, si)) }">⌄</span>
          </button>

          <div v-show="isSectionExpanded(getSectionKey(section, si))" class="section-panel">
            <ul class="section-list">
              <li
                v-for="(q, qi) in section.questions"
                :key="qi"
                class="section-item"
              >
                <button
                  type="button"
                  class="section-choice glass-chip"
                  :class="{ 'section-choice--active': isSectionChoiceSelected(getSectionKey(section, si), qi) }"
                  @click="toggleSectionChoice(getSectionKey(section, si), qi)"
                >
                  {{ q.label }}
                </button>

                <div class="section-details">
                  <div v-if="isQuantitativeQuestion(q)" class="qty-wrap">
                    <button
                      type="button"
                      class="qty-btn glass-chip"
                      @click="decreaseQuestionCount(getSectionKey(section, si), qi)"
                    >
                      −
                    </button>
                    <GlassInput
                      class="qty-input "
                      type="number"
                      min="0"
                      step="1"
                      :value="getQuestionCount(getSectionKey(section, si), qi)"
                      @input="setQuestionCount(getSectionKey(section, si), qi, ($event.target as HTMLInputElement).value)"
                     />
                    <button
                      type="button"
                      class="qty-btn glass-chip"
                      @click="increaseQuestionCount(getSectionKey(section, si), qi)"
                    >
                      +
                    </button>
                  </div>
                  <textarea
                    class="section-note glass-input"
                    rows="3"
                    placeholder="Добавьте комментарий по пункту"
                    :value="getQuestionNote(getSectionKey(section, si), qi)"
                    @input="setQuestionNote(getSectionKey(section, si), qi, ($event.target as HTMLTextAreaElement).value)"
                  ></textarea>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- fallback: raw JSON -->
      <div v-else class="content-empty">Контент раздела пока не настроен</div>
    </template>
  </GlassSurface>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string; page: string }>()

const reqHeaders = useRequestHeaders(['cookie'])
const { data: payload, pending, refresh } = await useFetch<any>(
  () => `/api/projects/${props.slug}/page-content?page=${props.page}`,
  { headers: reqHeaders }
)

const normalizedContent = computed(() => payload.value?.content ?? payload.value ?? null)
const selections = ref<Record<string, boolean | number>>({})
const textAnswers = ref<Record<string, string>>({})
const numberAnswers = ref<Record<string, number>>({})
const expandedSectionId = ref('')
const suppressSave = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

function resolveImageSrc(image: string) {
  if (!image) return ''
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) {
    return image
  }
  return `/uploads/${image}`
}

function groupSelectionKey(tabId: string, groupLabel: string) {
  return `g:${tabId}:${groupLabel}`
}

function sectionSelectionKey(sectionId: string, questionIndex: number) {
  return `s:${sectionId}:${questionIndex}`
}

function sectionTextKey(sectionId: string, questionIndex: number) {
  return `t:${sectionId}:${questionIndex}`
}

function sectionNumberKey(sectionId: string, questionIndex: number) {
  return `n:${sectionId}:${questionIndex}`
}

function getSectionKey(section: any, sectionIndex: number) {
  return String(section?.id || `section-${sectionIndex + 1}`)
}

function isSectionExpanded(sectionId: string) {
  return expandedSectionId.value === sectionId
}

function toggleSection(sectionId: string) {
  expandedSectionId.value = expandedSectionId.value === sectionId ? '' : sectionId
}

function selectGroupOption(tabId: string, groupLabel: string, optionIndex: number) {
  selections.value[groupSelectionKey(tabId, groupLabel)] = optionIndex
}

function isGroupOptionSelected(tabId: string, groupLabel: string, optionIndex: number) {
  return selections.value[groupSelectionKey(tabId, groupLabel)] === optionIndex
}

function toggleSectionChoice(sectionId: string, questionIndex: number) {
  const key = sectionSelectionKey(sectionId, questionIndex)
  selections.value[key] = !selections.value[key]
}

function isSectionChoiceSelected(sectionId: string, questionIndex: number) {
  return Boolean(selections.value[sectionSelectionKey(sectionId, questionIndex)])
}

function getQuestionNote(sectionId: string, questionIndex: number) {
  return textAnswers.value[sectionTextKey(sectionId, questionIndex)] || ''
}

function setQuestionNote(sectionId: string, questionIndex: number, value: string) {
  textAnswers.value[sectionTextKey(sectionId, questionIndex)] = value
}

function getQuestionCount(sectionId: string, questionIndex: number) {
  const key = sectionNumberKey(sectionId, questionIndex)
  return Number.isFinite(numberAnswers.value[key]) ? numberAnswers.value[key] : 0
}

function setQuestionCount(sectionId: string, questionIndex: number, value: string | number) {
  const numeric = Math.max(0, Number(value) || 0)
  numberAnswers.value[sectionNumberKey(sectionId, questionIndex)] = numeric
}

function increaseQuestionCount(sectionId: string, questionIndex: number) {
  setQuestionCount(sectionId, questionIndex, getQuestionCount(sectionId, questionIndex) + 1)
}

function decreaseQuestionCount(sectionId: string, questionIndex: number) {
  setQuestionCount(sectionId, questionIndex, Math.max(0, getQuestionCount(sectionId, questionIndex) - 1))
}

function isQuantitativeQuestion(question: any) {
  if (question?.type === 'number') return true
  const label = String(question?.label || '').toLowerCase()
  return /(колич|кол-во|колво|штук|шт\b|м2|м²|метр|размер|площад|высот|длин|ширин|бюджет|срок|сумм|объ[её]м|литр|кг|тонн|процент|%)/i.test(label)
}

function hasQuestionAnswer(sectionId: string, questionIndex: number) {
  return isSectionChoiceSelected(sectionId, questionIndex)
    || getQuestionCount(sectionId, questionIndex) > 0
    || getQuestionNote(sectionId, questionIndex).trim().length > 0
}

function getAnsweredQuestionsCount(section: any, sectionIndex: number) {
  const sectionId = getSectionKey(section, sectionIndex)
  return Array.isArray(section?.questions)
    ? section.questions.filter((_question: any, questionIndex: number) => hasQuestionAnswer(sectionId, questionIndex)).length
    : 0
}

async function loadSelections() {
  try {
    const data = await $fetch<{
      selections?: Record<string, boolean | number>
      textAnswers?: Record<string, string>
      numberAnswers?: Record<string, number>
    }>(`/api/projects/${props.slug}/page-answers?page=${props.page}`)

    suppressSave.value = true
    selections.value = data?.selections || {}
    textAnswers.value = data?.textAnswers || {}
    numberAnswers.value = data?.numberAnswers || {}
    await nextTick()
    suppressSave.value = false
  } catch {
    suppressSave.value = true
    selections.value = {}
    textAnswers.value = {}
    numberAnswers.value = {}
    await nextTick()
    suppressSave.value = false
  }
}

async function saveSelectionsNow() {
  if (suppressSave.value) return
  try {
    await $fetch(`/api/projects/${props.slug}/page-answers`, {
      method: 'PUT',
      body: {
        pageSlug: props.page,
        selections: selections.value,
        textAnswers: textAnswers.value,
        numberAnswers: numberAnswers.value,
      },
    })
  } catch {}
}

function scheduleSave() {
  if (suppressSave.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void saveSelectionsNow()
  }, 450)
}

watch(() => props.page, async () => {
  refresh()
  await loadSelections()
})

const activeTab = ref('')
watch(normalizedContent, (v) => {
  if (v?.tabs?.length) activeTab.value = v.tabs[0].id
}, { immediate: true })

watch(() => normalizedContent.value?.sections, (sections) => {
  if (!Array.isArray(sections) || !sections.length) {
    expandedSectionId.value = ''
    return
  }

  const keys = sections.map((section: any, sectionIndex: number) => getSectionKey(section, sectionIndex))
  if (!expandedSectionId.value || !keys.includes(expandedSectionId.value)) {
    expandedSectionId.value = keys[0] || ''
  }
}, { immediate: true })

onMounted(() => {
  void loadSelections()
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

watch(selections, scheduleSave, { deep: true, flush: 'post' })
watch(textAnswers, scheduleSave, { deep: true, flush: 'post' })
watch(numberAnswers, scheduleSave, { deep: true, flush: 'post' })
</script>

<style scoped>
.content-wrap {
  --c-muted: #9a9a9a;
  --c-border: #e7e7e7;
  --c-border-strong: #d8d8d8;
  --c-text: #1a1a1a;
  --c-text-soft: #8f8f8f;
  --c-text-body: #444;
  --c-bg-soft: #f5f5f5;
  --c-input-bg: #fff;
  padding: 14px;
  border-radius: 14px;
}


.content-hint {
  margin: 0 0 10px;
  color: var(--c-muted);
  font-size: .74rem;
}

.content-empty {
  color: var(--c-muted);
  font-size: .86rem;
  padding: 10px 0;
}

.content-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-bottom: 1px solid var(--c-border);
  margin-bottom: 14px;
  border-radius: 12px;
  padding: 6px;
}

.content-tab-btn {
  border: 1px solid transparent;
  background: transparent;
  padding: 8px 10px;
  font-size: .76rem;
  letter-spacing: .6px;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  flex: 0 0 auto;
  white-space: nowrap;
}

.content-tab-btn--idle {
  color: var(--c-text-soft);
}

.content-tab-btn--idle:hover {
  color: var(--c-text);
}

.content-tab-btn--active {
  color: var(--c-text);
  border-color: var(--c-border-strong);
  background: var(--c-input-bg);
}

.tab-pane {
  padding-top: 2px;
}

.pane-heading {
  margin: 0 0 10px;
  font-size: .9rem;
  font-weight: 500;
  color: var(--c-text);
}

.pane-image-wrap {
  margin-bottom: 12px;
}

.pane-image {
  width: 100%;
  max-width: 520px;
  border: 1px solid var(--c-border);
  display: block;
}

.group-block {
  margin-bottom: 12px;
}

.group-label {
  margin: 0 0 6px;
  font-size: .7rem;
  letter-spacing: .9px;
  text-transform: uppercase;
  color: var(--c-text-soft);
}

.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.group-choice {
  width: 100%;
  text-align: left;
  border: 1px solid var(--c-border);
  background: transparent;
  padding: 9px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  color: var(--c-text-body);
  font-size: .84rem;
  line-height: 1.42;
  cursor: pointer;
  font-family: inherit;
}

.group-choice:hover {
  border-color: var(--c-border-strong);
}

.group-choice--active {
  border-color: var(--c-text);
  background: var(--c-bg-soft);
  color: var(--c-text);
}

.section-stack {
  display: grid;
  gap: 12px;
}

.section-block {
  border: 1px solid var(--c-border);
  border-radius: 14px;
  background: var(--c-input-bg);
  overflow: hidden;
}

.section-block--expanded {
  border-color: var(--c-border-strong);
}

.section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.section-toggle:hover {
  background: color-mix(in srgb, var(--c-bg-soft) 72%, #fff 28%);
}

.section-title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.section-title {
  margin: 0;
  font-size: .78rem;
  letter-spacing: .9px;
  text-transform: uppercase;
  color: var(--c-text-soft);
}

.section-meta {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-bg-soft);
  color: var(--c-text-soft);
  font-size: .68rem;
  letter-spacing: .04em;
  flex-shrink: 0;
}

.section-chevron {
  flex-shrink: 0;
  color: var(--c-text-soft);
  transition: transform .18s ease, color .18s ease;
}

.section-chevron--expanded {
  transform: rotate(180deg);
  color: var(--c-text);
}

.section-panel {
  padding: 0 12px 12px;
}

.section-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.section-item {
  margin-bottom: 8px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--c-bg-soft) 78%, #fff 22%);
  overflow: hidden;
}

.section-choice {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--c-text-body);
  padding: 12px;
  font-size: .84rem;
  line-height: 1.42;
  cursor: pointer;
  font-family: inherit;
}

.section-choice:hover {
  border-color: var(--c-border-strong);
}

.section-choice--active {
  background: var(--c-bg-soft);
  color: var(--c-text);
}

.section-details {
  display: grid;
  gap: 8px;
  padding: 0 12px 12px;
}

.qty-wrap {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--c-border-strong);
  background: var(--c-input-bg);
  color: var(--c-text-body);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  font-family: inherit;
}

.qty-btn:hover {
  border-color: var(--c-text-soft);
}

.qty-input {
  width: 84px;
  height: 28px;
  border: 1px solid var(--c-border-strong);
  padding: 0 8px;
  font-size: .84rem;
  font-family: inherit;
  color: var(--c-text-body);
  background: var(--c-input-bg);
}

.section-note {
  margin-top: 8px;
  width: 100%;
  border: 1px solid var(--c-border-strong);
  background: var(--c-input-bg);
  color: var(--c-text-body);
  padding: 8px 10px;
  font-size: .82rem;
  line-height: 1.38;
  resize: vertical;
  min-height: 70px;
  font-family: inherit;
}

.section-note:focus,
.qty-input:focus {
  outline: none;
  border-color: var(--c-text-soft);
}

@media (max-width: 768px) {
  .content-tabs {
    flex-wrap: nowrap;
    gap: 20px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-bottom: 2px;
  }

  .content-tabs::-webkit-scrollbar {
    display: none;
  }

  .content-tab-btn {
    border: none;
    padding: 4px 0;
    font-size: .74rem;
  }

  .content-tab-btn--active {
    border: none;
    margin-bottom: 0;
    background: transparent;
    color: var(--c-text);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .group-choice,
  .section-choice {
    font-size: .8rem;
    padding: 8px;
  }

  .qty-wrap {
    margin-top: 6px;
  }

  .qty-input {
    width: 72px;
  }
}
</style>