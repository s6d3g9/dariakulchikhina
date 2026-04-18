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

<style scoped src="./ClientPageContent.scoped.css"></style>
