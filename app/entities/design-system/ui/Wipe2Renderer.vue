<template>
  <!-- Overlay: когда fixedMode=true — телепортируем в body чтобы backdrop-filter предков не ломал position:fixed -->
  <Teleport to="body" :disabled="!fixedMode">
  <div
    ref="overlayEl"
    class="w2-overlay"
    :class="{
      'w2-overlay--fixed': fixedMode,
      'w2-overlay--inline': layout === 'inline',
    }"
    tabindex="-1"
    @keydown="onKey"
    @wheel.prevent="onWheel"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    @click="refocus"
  >
    <!-- ── КАРТОЧКА ── -->
    <div v-if="cards.length > 0" class="w2-card">
      <!-- Шапка карточки -->
      <div class="w2-header">
        <div class="w2-header-left">
          <div class="w2-title">{{ card.title }}</div>
          <div v-if="card.subtitle" class="w2-subtitle">{{ card.subtitle }}</div>
        </div>
        <div class="w2-header-right">
          <span v-if="card.isContinuation" class="w2-badge w2-badge--cont">продолжение</span>
          <span
            v-if="card.status"
            class="w2-badge"
            :class="`w2-badge--${card.statusColor || 'muted'}`"
          >{{ card.status }}</span>
          <div v-if="canSwitchDisplayMode" class="w2-view-switch" @click.stop>
            <button
              v-for="mode in DISPLAY_MODES"
              :key="mode.value"
              type="button"
              class="w2-view-switch__btn"
              :class="{ 'w2-view-switch__btn--active': displayMode === mode.value }"
              @click="setDisplayMode(mode.value)"
            >{{ mode.label }}</button>
          </div>
          <button type="button" class="w2-edit-btn" @click.stop="$emit('edit')" title="Редактировать (E)">✎ редактировать</button>
        </div>
      </div>

      <!-- Поле-сетка 2×8 -->
      <div class="w2-body" :class="{ 'w2-body--display': canSwitchDisplayMode }">
        <template v-if="canSwitchDisplayMode && displayMode === 'list'">
          <div class="w2-list-table">
            <div class="w2-list-head">
              <span>позиция</span>
              <span>значение</span>
              <span>метка</span>
            </div>
            <template v-for="(item, index) in cardItems" :key="item.id">
              <div v-if="shouldRenderListSection(index, item)" class="w2-list-section">
                <span class="w2-list-section__title">{{ item.sectionTitle || item.field.eyebrow || 'раздел' }}</span>
              </div>
              <article
                class="w2-list-row"
                :class="[miniCardToneClass(item.field), { 'w2-list-row--actionable': isActionable(item.field) }]"
                :role="isActionable(item.field) ? 'button' : undefined"
                :tabindex="isActionable(item.field) ? 0 : undefined"
                @click.stop="openItem(item)"
                @keyup.enter.prevent="openItem(item)"
                @keyup.space.prevent="openItem(item)"
              >
                <div class="w2-list-row__main">
                  <div class="w2-list-row__topline">
                    <span v-if="item.field.eyebrow" class="w2-mini-card__eyebrow">{{ item.field.eyebrow }}</span>
                    <span v-if="item.field.badge" class="w2-mini-card__badge">{{ item.field.badge }}</span>
                  </div>
                  <h4 class="w2-list-row__title">{{ item.field.label }}</h4>
                  <p v-if="item.field.description" class="w2-list-row__desc">{{ item.field.description }}</p>
                </div>
                <div class="w2-list-row__value-wrap">
                  <strong class="w2-list-row__value" :class="valueClass(item.field)">{{ displayValue(item.field) }}</strong>
                </div>
                <div class="w2-list-row__meta">
                  <span v-if="item.field.caption" class="w2-mini-card__caption">{{ item.field.caption }}</span>
                  <span v-else class="w2-mini-card__caption">{{ index + 1 }}/{{ cardItems.length }}</span>
                </div>
              </article>
            </template>
          </div>
        </template>

        <template v-else-if="canSwitchDisplayMode && displayMode === 'grid'">
          <div class="w2-mini-grid">
            <article
              v-for="item in cardItems"
              :key="item.id"
              class="w2-mini-card w2-mini-card--grid"
              :class="[miniCardToneClass(item.field), { 'w2-mini-card--actionable': isActionable(item.field) }]"
              :role="isActionable(item.field) ? 'button' : undefined"
              :tabindex="isActionable(item.field) ? 0 : undefined"
              @click.stop="openItem(item)"
              @keyup.enter.prevent="openItem(item)"
              @keyup.space.prevent="openItem(item)"
            >
              <div class="w2-mini-card__head">
                <span v-if="item.field.badge" class="w2-mini-card__badge">{{ item.field.badge }}</span>
                <span v-else-if="item.field.caption" class="w2-mini-card__caption">{{ item.field.caption }}</span>
              </div>
              <div class="w2-mini-card__value-row">
                <strong class="w2-mini-card__value" :class="valueClass(item.field)">{{ displayValue(item.field) }}</strong>
              </div>
              <h4 class="w2-mini-card__title">{{ item.field.label }}</h4>
              <p v-if="item.field.description" class="w2-mini-card__desc">{{ item.field.description }}</p>
            </article>
          </div>
        </template>

        <template v-else-if="canSwitchDisplayMode && displayMode === 'focus' && activeDetailItem">
          <div
            class="w2-focus-card"
            :class="[miniCardToneClass(activeDetailItem.field), { 'w2-focus-card--actionable': isActionable(activeDetailItem.field) }]"
            :role="isActionable(activeDetailItem.field) ? 'button' : undefined"
            :tabindex="isActionable(activeDetailItem.field) ? 0 : undefined"
            @click.stop="openItem(activeDetailItem)"
            @keyup.enter.prevent="openItem(activeDetailItem)"
            @keyup.space.prevent="openItem(activeDetailItem)"
          >
            <div class="w2-focus-card__hero">
              <div class="w2-focus-card__eyebrow">{{ activeDetailItem.field.eyebrow || activeDetailItem.sectionTitle || 'детальная карточка' }}</div>
              <div class="w2-focus-card__topline">
                <h3 class="w2-focus-card__title">{{ activeDetailItem.field.label }}</h3>
                <span v-if="activeDetailItem.field.badge" class="w2-mini-card__badge">{{ activeDetailItem.field.badge }}</span>
              </div>
              <div class="w2-focus-card__value" :class="valueClass(activeDetailItem.field)">{{ displayValue(activeDetailItem.field) }}</div>
              <div v-if="activeDetailItem.field.caption" class="w2-focus-card__caption">{{ activeDetailItem.field.caption }}</div>
              <p v-if="activeDetailItem.field.description" class="w2-focus-card__desc">{{ activeDetailItem.field.description }}</p>
            </div>

            <div class="w2-focus-card__stats">
              <div class="w2-focus-stat">
                <span class="w2-focus-stat__label">позиция</span>
                <strong class="w2-focus-stat__value">{{ detailIndex + 1 }}</strong>
              </div>
              <div class="w2-focus-stat">
                <span class="w2-focus-stat__label">в карточке</span>
                <strong class="w2-focus-stat__value">{{ cardItems.length }}</strong>
              </div>
              <div class="w2-focus-stat">
                <span class="w2-focus-stat__label">раздел</span>
                <strong class="w2-focus-stat__value">{{ activeDetailItem.sectionTitle || 'данные' }}</strong>
              </div>
            </div>

            <div class="w2-focus-card__nav">
              <button type="button" class="w2-nav-btn" :disabled="detailIndex <= 0" @click="prevDetail">← позиция</button>
              <span class="w2-pager">{{ detailIndex + 1 }} / {{ cardItems.length }}</span>
              <button v-if="isActionable(activeDetailItem.field)" type="button" class="w2-nav-btn" @click.stop="openItem(activeDetailItem)">редактор</button>
              <button type="button" class="w2-nav-btn" :disabled="detailIndex >= cardItems.length - 1" @click="nextDetail">позиция →</button>
            </div>
          </div>
        </template>

        <template v-else>
        <template v-for="(row, ri) in card.rows" :key="ri">

          <!-- Заголовок секции (на всю ширину) -->
          <div v-if="row.type === 'section'" class="w2-section-row">
            <span class="w2-section-row__title">{{ row.title }}</span>
            <span v-if="row.subtitle" class="w2-section-row__sub">{{ row.subtitle }}</span>
          </div>

          <!-- Пара полей или одно поле (pair) -->
          <template v-else-if="row.type === 'fields'">
            <div class="w2-field">
              <div class="w2-field__label">{{ row.left.label }}</div>
              <div class="w2-field__value" :class="valueClass(row.left)">
                <template v-if="row.left.type === 'boolean'">
                  <span :class="row.left.value ? 'w2-bool--yes' : 'w2-bool--no'">
                    {{ row.left.value ? '✓' : '—' }}
                  </span>
                </template>
                <template v-else>{{ displayValue(row.left) }}</template>
              </div>
            </div>
            <!-- правая часть или пустой спейсер -->
            <div v-if="row.right" class="w2-field">
              <div class="w2-field__label">{{ row.right.label }}</div>
              <div class="w2-field__value" :class="valueClass(row.right)">
                <template v-if="row.right.type === 'boolean'">
                  <span :class="row.right.value ? 'w2-bool--yes' : 'w2-bool--no'">
                    {{ row.right.value ? '✓' : '—' }}
                  </span>
                </template>
                <template v-else>{{ displayValue(row.right) }}</template>
              </div>
            </div>
            <div v-else class="w2-field w2-field--phantom" />
          </template>

          <!-- Полноширокое поле -->
          <div v-else-if="row.type === 'full'" class="w2-field w2-field--full">
            <div class="w2-field__label">{{ row.field.label }}</div>
            <div class="w2-field__value" :class="valueClass(row.field)">
              {{ displayValue(row.field) }}
            </div>
          </div>

        </template>
        </template>
      </div>

      <!-- Навигация внизу -->
      <div class="w2-footer">
        <button
          type="button"
          class="w2-nav-btn"
          :disabled="currentIndex <= 0 && !allowBoundaryNavigation"
          @click="prev"
          aria-label="предыдущая карточка"
        >←</button>
        <span class="w2-pager">{{ card.index }} / {{ card.total }}</span>
        <span class="w2-edit-hint" @click.stop="$emit('edit')">✎ редактировать</span>
        <button
          type="button"
          class="w2-nav-btn"
          :disabled="currentIndex >= cards.length - 1 && !allowBoundaryNavigation"
          @click="next"
          aria-label="следующая карточка"
        >→</button>
      </div>
    </div>

    <!-- Пустое состояние -->
    <div v-else class="w2-empty">
      <div class="w2-empty__icon">⊟</div>
      <div class="w2-empty__title">Этот раздел не поддерживает карточный режим</div>
      <div class="w2-empty__sub">переключите вид в настройках дизайна</div>
      <button type="button" class="w2-edit-btn w2-edit-btn--empty" @click.stop="$emit('edit')">✎ открыть форму</button>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { buildWipe2Cards, type Wipe2Field } from '~/entities/design-system/model/useWipe2'
import type { Wipe2EntityData } from '~/shared/types/wipe2'

const props = defineProps<{
  entity?: Wipe2EntityData | null
  fixedMode?: boolean
  layout?: 'overlay' | 'inline'
  allowBoundaryNavigation?: boolean
}>()

const emit = defineEmits<{
  edit: []
  'open-item': [payload: { itemType: NonNullable<Wipe2Field['itemType']>; itemKey: string }]
  'navigate-boundary': [direction: 'next' | 'prev']
}>()

type Wipe2DisplayMode = 'list' | 'grid' | 'focus'

interface Wipe2DisplayItem {
  id: string
  field: Wipe2Field
  sectionTitle?: string
  sectionSubtitle?: string
}

const DISPLAY_MODES: Array<{ value: Wipe2DisplayMode; label: string }> = [
  { value: 'list', label: 'список' },
  { value: 'grid', label: 'сетка' },
  { value: 'focus', label: 'по одной' },
]
const DISPLAY_MODE_STORAGE_KEY = 'wipe2-display-mode'

const cards = computed(() => props.entity ? buildWipe2Cards(props.entity) : [])

const currentIndex = ref(0)
const overlayEl = ref<HTMLElement | null>(null)
const displayMode = ref<Wipe2DisplayMode>('list')
const detailIndex = ref(0)

// Сброс индекса при смене данных
watch(cards, () => { currentIndex.value = 0 })

const card = computed(() => cards.value[currentIndex.value])
const allowBoundaryNavigation = computed(() => Boolean(props.allowBoundaryNavigation))
const cardItems = computed<Wipe2DisplayItem[]>(() => {
  const currentCard = card.value
  if (!currentCard) return []

  const items: Wipe2DisplayItem[] = []
  let activeSectionTitle = ''
  let activeSectionSubtitle = ''

  currentCard.rows.forEach((row, index) => {
    if (row.type === 'section') {
      activeSectionTitle = row.title.replace(/\s*\(продолжение\)$/, '')
      activeSectionSubtitle = row.subtitle || ''
      return
    }

    if (row.type === 'full') {
      items.push({
        id: `${currentCard.index}-full-${index}`,
        field: row.field,
        sectionTitle: activeSectionTitle,
        sectionSubtitle: activeSectionSubtitle,
      })
      return
    }

    items.push({
      id: `${currentCard.index}-left-${index}`,
      field: row.left,
      sectionTitle: activeSectionTitle,
      sectionSubtitle: activeSectionSubtitle,
    })
    if (row.right) {
      items.push({
        id: `${currentCard.index}-right-${index}`,
        field: row.right,
        sectionTitle: activeSectionTitle,
        sectionSubtitle: activeSectionSubtitle,
      })
    }
  })

  return items.filter(item => item.field.label || item.field.value || item.field.description)
})
const cardSectionTitles = computed(() => {
  const currentCard = card.value
  if (!currentCard) return []
  return currentCard.rows
    .filter((row): row is Extract<typeof row, { type: 'section' }> => row.type === 'section')
    .map(row => row.title.replace(/\s*\(продолжение\)$/, ''))
})
const canSwitchDisplayMode = computed(() => {
  if (!cardItems.value.length) return false
  if (cardSectionTitles.value.length === 1) return true
  return cardItems.value.every(item => isActionable(item.field))
})
const activeDetailItem = computed(() => cardItems.value[detailIndex.value] || null)

watch([currentIndex, cardItems, canSwitchDisplayMode], () => {
  detailIndex.value = 0
  if (!canSwitchDisplayMode.value && displayMode.value === 'focus') displayMode.value = 'list'
})

function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    return
  }

  if (allowBoundaryNavigation.value) {
    emit('navigate-boundary', 'prev')
  }
}
function next() {
  if (currentIndex.value < cards.value.length - 1) {
    currentIndex.value++
    return
  }

  if (allowBoundaryNavigation.value) {
    emit('navigate-boundary', 'next')
  }
}

function prevDetail() {
  if (detailIndex.value > 0) detailIndex.value--
}
function nextDetail() {
  if (detailIndex.value < cardItems.value.length - 1) detailIndex.value++
}
function setDisplayMode(mode: Wipe2DisplayMode) {
  displayMode.value = mode
  detailIndex.value = 0
}

function isActionable(field: Wipe2Field | null | undefined): field is Wipe2Field & { itemType: NonNullable<Wipe2Field['itemType']>; itemKey: string } {
  return Boolean(field?.itemType && field?.itemKey)
}

function openItem(item: Wipe2DisplayItem | null) {
  if (!item || !isActionable(item.field)) return
  emit('open-item', { itemType: item.field.itemType, itemKey: item.field.itemKey })
}

function shouldRenderListSection(index: number, item: Wipe2DisplayItem) {
  if (index === 0) return true
  const prev = cardItems.value[index - 1]
  return (prev?.sectionTitle || '') !== (item.sectionTitle || '')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next() }
  if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { e.preventDefault(); prev() }
  if (e.key === 'e' || e.key === 'E')                  { e.preventDefault(); emit('edit') }
}

// ── Wheel (mouse scroll) ─────────────────────────────────────
let wheelCooldown = false
function onWheel(e: WheelEvent) {
  if (wheelCooldown) return
  if (Math.abs(e.deltaY) < 10) return
  if (e.deltaY > 0) next()
  else              prev()
  wheelCooldown = true
  setTimeout(() => { wheelCooldown = false }, 320)
}

// ── Touch (swipe) ────────────────────────────────────────────
let touchStartY = 0
let touchStartX = 0

function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0].clientY
  touchStartX = e.touches[0].clientX
}
function onTouchEnd(e: TouchEvent) {
  const deltaY = touchStartY - e.changedTouches[0].clientY
  const deltaX = Math.abs(touchStartX - e.changedTouches[0].clientX)
  if (Math.abs(deltaY) < 35 || deltaX > Math.abs(deltaY) * 0.9) return
  if (deltaY > 0) next(); else prev()
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, button, a, label, [contenteditable="true"], [data-w2-interactive="true"]'))
}

function refocus(event?: MouseEvent) {
  if (event && isInteractiveTarget(event.target)) return
  overlayEl.value?.focus({ preventScroll: true })
}

onMounted(() => {
  overlayEl.value?.focus({ preventScroll: true })
  if (import.meta.client) {
    const savedMode = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY)
    if (savedMode === 'list' || savedMode === 'grid' || savedMode === 'focus') {
      displayMode.value = savedMode
    }
  }
})

watch(displayMode, (value) => {
  if (!import.meta.client) return
  localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, value)
})

// ── Форматирование значений ───────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  '':              '—',
  in_work:         'в работе',
  in_progress:     'в работе',
  sent_to_client:  'отправлен клиенту',
  sent:            'отправлен',
  revision:        'на доработке',
  approved:        'согласован ✓',
  draft:           'черновик',
  done:            'выполнено',
  completed:       'выполнено',
  cancelled:       'отменено',
  rejected:        'отклонено',
  new:             'новый',
  pending:         'ожидание',
  paid:            'оплачено',
  signed:          'подписано',
}

function displayValue(f: Wipe2Field): string {
  const val = f.value
  if (val === null || val === undefined || val === '') return f.empty ?? '—'
  if (typeof val === 'boolean') return val ? 'да' : 'нет'

  const s = String(val)

  if (f.type === 'status') return STATUS_LABELS[s] ?? s
  if (f.type === 'date') return formatDate(s)
  if (f.type === 'currency') return formatCurrency(s)
  if (f.type === 'number') return String(Number(val).toLocaleString('ru'))
  return s
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}

function formatCurrency(s: string): string {
  const n = parseFloat(s)
  if (isNaN(n)) return s
  return new Intl.NumberFormat('ru', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
}

function valueClass(f: Wipe2Field): string {
  if (!f.value && f.value !== 0 && f.value !== false) return 'w2-field__value--empty'
  if (f.type === 'multiline') return 'w2-field__value--multi'
  if (f.type === 'status') return 'w2-field__value--status'
  return ''
}

function miniCardToneClass(f: Wipe2Field): string {
  if (f.tone === 'accent') return 'w2-mini-card--accent'
  if (f.tone === 'success') return 'w2-mini-card--success'
  if (f.tone === 'muted') return 'w2-mini-card--muted'
  return ''
}
</script>

<style scoped src="./Wipe2Renderer.scoped.css"></style>
