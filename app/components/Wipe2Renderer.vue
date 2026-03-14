<template>
  <!-- Overlay: когда fixedMode=true — телепортируем в body чтобы backdrop-filter предков не ломал position:fixed -->
  <Teleport to="body" :disabled="!fixedMode">
  <div
    ref="overlayEl"
    class="w2-overlay"
    :class="{ 'w2-overlay--fixed': fixedMode }"
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
          <button type="button" class="w2-edit-btn" @click.stop="$emit('edit')" title="Редактировать (E)">✎ редактировать</button>
        </div>
      </div>

      <!-- Поле-сетка 2×8: клик по любому полю = переход в режим редактирования -->
      <div class="w2-body" role="button" tabindex="-1" title="Нажмите для редактирования" @click.stop="$emit('edit')">
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
      </div>

      <!-- Навигация внизу -->
      <div class="w2-footer">
        <button
          type="button"
          class="w2-nav-btn"
          :disabled="currentIndex <= 0"
          @click="prev"
          aria-label="предыдущая карточка"
        >←</button>
        <span class="w2-pager">{{ card.index }} / {{ card.total }}</span>
        <span class="w2-edit-hint" @click.stop="$emit('edit')">✎ редактировать</span>
        <button
          type="button"
          class="w2-nav-btn"
          :disabled="currentIndex >= cards.length - 1"
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
import { buildWipe2Cards, type Wipe2Field } from '~/composables/useWipe2'
import type { Wipe2EntityData } from '~/shared/types/wipe2'

const props = defineProps<{
  entity?: Wipe2EntityData | null
  fixedMode?: boolean
}>()

const emit = defineEmits<{ edit: [] }>()

const cards = computed(() => props.entity ? buildWipe2Cards(props.entity) : [])

const currentIndex = ref(0)
const overlayEl = ref<HTMLElement | null>(null)

// Сброс индекса при смене данных
watch(cards, () => { currentIndex.value = 0 })

const card = computed(() => cards.value[currentIndex.value])

function prev() {
  if (currentIndex.value > 0) currentIndex.value--
}
function next() {
  if (currentIndex.value < cards.value.length - 1) currentIndex.value++
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

function refocus() {
  overlayEl.value?.focus({ preventScroll: true })
}

onMounted(() => overlayEl.value?.focus({ preventScroll: true }))

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
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────── */
.w2-overlay {
  position: absolute;
  top:    var(--cv-sheet-top, 48px);
  bottom: var(--cv-sheet-bottom, 64px);
  left:   var(--wipe-side-margin, 20px);
  right:  var(--wipe-side-margin, 20px);
  z-index: 20;
  display: flex;
  flex-direction: column;
  outline: none;
  touch-action: none;  /* renderer handles its own touch */
}
/* Cabinet fixed mode: anchors to viewport accounting for admin header + sidebar */
.w2-overlay--fixed {
  position: fixed;
  top:    calc(var(--dp-panel-h, 0px) + var(--admin-header-h, 48px) + 12px);
  bottom: 12px;
  left:   calc(var(--adm-sidebar-offset, 0px) + var(--wipe-side-margin, 16px));
  right:  var(--wipe-side-margin, 16px);
  z-index: 200;
}

/* ── Card shell ──────────────────────────────────────────────── */
.w2-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--glass-bg, #fff);
  border-radius: var(--wipe-card-radius, 14px);
  border: var(--wipe-card-border, 1px) solid
    color-mix(in srgb, var(--glass-text, #111) 12%, transparent);
  box-shadow:
    0 2px 8px  color-mix(in srgb, var(--glass-text, #111) 6%, transparent),
    0 8px 32px color-mix(in srgb, var(--glass-text, #111) 8%, transparent);
  padding: var(--wipe-content-padding, 20px);
  gap: 12px;
}

/* ── Header ──────────────────────────────────────────────────── */
.w2-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  flex-shrink: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text, #111) 10%, transparent);
}
.w2-header-left { min-width: 0; }
.w2-header-right { display: flex; gap: 6px; flex-shrink: 0; align-items: center; flex-wrap: wrap; justify-content: flex-end; }

.w2-title {
  font-size: var(--ds-text-sm, .833rem);
  font-weight: 600;
  letter-spacing: var(--ds-heading-letter-spacing, -.01em);
  color: var(--glass-text, #111);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.w2-subtitle {
  font-size: var(--ds-text-xs, .694rem);
  opacity: .55;
  margin-top: 2px;
}

/* ── Badge ───────────────────────────────────────────────────── */
.w2-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  font-size: var(--ds-text-xs, .694rem);
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
}
.w2-badge--cont  { background: color-mix(in srgb, var(--glass-text, #111) 8%, transparent); opacity: .7; }
.w2-badge--green { background: hsl(142, 60%, 90%); color: hsl(142, 60%, 30%); }
.w2-badge--blue  { background: hsl(214, 80%, 92%); color: hsl(214, 80%, 32%); }
.w2-badge--yellow,
.w2-badge--amber { background: hsl(38, 90%, 90%);  color: hsl(38, 90%, 30%); }
.w2-badge--red   { background: hsl(0, 70%, 92%);   color: hsl(0, 70%, 36%); }
.w2-badge--muted,
.w2-badge--gray  { background: color-mix(in srgb, var(--glass-text, #111) 8%, transparent); opacity: .65; }

html.dark .w2-badge--green  { background: hsl(142, 40%, 20%); color: hsl(142, 60%, 75%); }
html.dark .w2-badge--blue   { background: hsl(214, 50%, 20%); color: hsl(214, 80%, 75%); }
html.dark .w2-badge--yellow,
html.dark .w2-badge--amber  { background: hsl(38,  60%, 20%); color: hsl(38,  90%, 75%); }
html.dark .w2-badge--red    { background: hsl(0,   50%, 22%); color: hsl(0,   70%, 75%); }

/* ── Edit button ─────────────────────────────────────────────── */
.w2-edit-btn {
  appearance: none;
  border: 1px solid color-mix(in srgb, var(--glass-text, #111) 14%, transparent);
  background: color-mix(in srgb, var(--glass-text, #111) 5%, transparent);
  color: var(--glass-text, #111);
  border-radius: 7px;
  padding: 3px 10px;
  font-size: .72rem;
  cursor: pointer;
  line-height: 1.6;
  transition: background .15s;
  flex-shrink: 0;
}
.w2-edit-btn:hover {
  background: color-mix(in srgb, var(--glass-text, #111) 12%, transparent);
}
.w2-edit-btn--empty {
  margin-top: 14px;
  padding: 6px 18px;
  font-size: .8rem;
}
html.dark .w2-edit-btn {
  border-color: color-mix(in srgb, #fff 18%, transparent);
  background: color-mix(in srgb, #fff 6%, transparent);
  color: #fff;
}
html.dark .w2-edit-btn:hover {
  background: color-mix(in srgb, #fff 14%, transparent);
}

/* ── Body grid ───────────────────────────────────────────────── */
.w2-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
  row-gap: 10px;
  overflow: hidden;
  align-content: start;
  cursor: pointer;
}
.w2-body:hover .w2-field__value {
  opacity: .75;
}
.w2-body:hover .w2-field {
  outline: 1px dashed color-mix(in srgb, var(--glass-text) 18%, transparent);
  outline-offset: 3px;
  border-radius: 3px;
}

/* ── Section separator ───────────────────────────────────────── */
.w2-section-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 0 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text, #111) 10%, transparent);
}
.w2-section-row__title {
  font-size: .68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--glass-text, #111);
  opacity: .45;
}
.w2-section-row__sub {
  font-size: .65rem;
  opacity: .35;
}

/* ── Field cell ──────────────────────────────────────────────── */
.w2-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.w2-field--full { grid-column: 1 / -1; }
.w2-field--phantom { visibility: hidden; }

.w2-field__label {
  font-size: .65rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  opacity: .42;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.w2-field__value {
  font-size: var(--ds-text-sm, .833rem);
  color: var(--glass-text, #111);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.w2-field--full .w2-field__value {
  white-space: normal;
}
.w2-field__value--empty { opacity: .35; font-style: italic; }
.w2-field__value--multi { white-space: pre-line; overflow: visible; }
.w2-field__value--status { font-weight: 500; }
.w2-field__value--muted  { opacity: .55; }

.w2-bool--yes { color: var(--ds-success, hsl(142,71%,40%)); font-weight: 600; }
.w2-bool--no  { opacity: .35; }

/* ── Footer nav ──────────────────────────────────────────────── */
.w2-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text, #111) 8%, transparent);
}
.w2-pager {
  font-size: var(--ds-text-xs, .694rem);
  opacity: .5;
  letter-spacing: .03em;
}
.w2-edit-hint {
  font-size: var(--ds-text-xs, .694rem);
  opacity: .45;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 5px;
  transition: opacity .15s;
  flex: 1;
  text-align: center;
}
.w2-edit-hint:hover { opacity: 1; }
.w2-nav-btn {
  font-size: var(--ds-text-xs, .694rem);
  padding: 3px 10px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--glass-text, #111) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text, #111) 12%, transparent);
  color: var(--glass-text, #111);
  cursor: pointer;
  transition: opacity 120ms;
}
.w2-nav-btn:disabled { opacity: .25; cursor: default; }
.w2-nav-btn:not(:disabled):hover { background: color-mix(in srgb, var(--glass-text, #111) 13%, transparent); }

/* ── Empty state ─────────────────────────────────────────────── */
.w2-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--glass-bg, #fff);
  border-radius: var(--wipe-card-radius, 14px);
  border: 1px dashed color-mix(in srgb, var(--glass-text, #111) 15%, transparent);
  text-align: center;
  padding: 24px;
}
.w2-empty__icon  { font-size: 1.8rem; opacity: .25; }
.w2-empty__title { font-size: var(--ds-text-sm, .833rem); font-weight: 600; opacity: .45; }
.w2-empty__sub   { font-size: var(--ds-text-xs, .694rem); opacity: .3; }
</style>
