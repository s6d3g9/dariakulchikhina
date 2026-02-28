<template>
  <div class="dp-wrap">
    <div class="dp-trigger">
      <input
        ref="inputEl"
        :value="modelValue"
        :placeholder="placeholder"
        :class="inputClass"
        class="dp-input"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        @input="onInput"
        @focus="openCal"
        @keydown.esc="close"
        @keydown.tab="close"
      />
      <button type="button" class="dp-icon-btn" tabindex="-1" @mousedown.prevent="toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        class="dp-popup"
        :style="popupStyle"
        @mousedown.prevent
      >
        <div class="dp-head">
          <button type="button" class="dp-nav" @click="prevMonth">&#8249;</button>
          <div class="dp-month-label">{{ MONTHS[viewMonth] }} {{ viewYear }}</div>
          <button type="button" class="dp-nav" @click="nextMonth">&#8250;</button>
        </div>
        <div class="dp-weekdays">
          <span v-for="d in WEEKDAYS" :key="d">{{ d }}</span>
        </div>
        <div class="dp-days">
          <button
            v-for="(cell, i) in calCells"
            :key="i"
            type="button"
            class="dp-day"
            :class="{
              'dp-day--today': cell?.isToday,
              'dp-day--sel': cell?.isSelected,
              'dp-day--other': cell?.isOtherMonth,
            }"
            :disabled="!cell"
            @click="cell && selectDay(cell.year, cell.month, cell.day)"
          >
            <span v-if="cell">{{ cell.day }}</span>
          </button>
        </div>
        <div class="dp-footer">
          <button type="button" class="dp-clear" @click="clear">Очистить</button>
          <button type="button" class="dp-today" @click="goToday">Сегодня</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  inputClass?: string
}>(), {
  placeholder: 'дд.мм.гггг',
  inputClass: ''
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const inputEl = ref<HTMLInputElement>()
const popupStyle = ref<Record<string, string>>({})

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function parseDMY(s: string): Date | null {
  const m = s?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  const d = new Date(+m[3], +m[2] - 1, +m[1])
  return isNaN(d.getTime()) ? null : d
}
function fmt(d: Date): string {
  return [String(d.getDate()).padStart(2,'0'), String(d.getMonth()+1).padStart(2,'0'), d.getFullYear()].join('.')
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}

interface Cell { day: number; month: number; year: number; isToday: boolean; isSelected: boolean; isOtherMonth: boolean }

const calCells = computed<(Cell | null)[]>(() => {
  const sel = parseDMY(props.modelValue)
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const daysInPrev = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const cells: (Cell | null)[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    const day = daysInPrev - i
    const month = viewMonth.value === 0 ? 11 : viewMonth.value - 1
    const year = viewMonth.value === 0 ? viewYear.value - 1 : viewYear.value
    const d = new Date(year, month, day)
    cells.push({ day, month, year, isToday: isSameDay(d, today), isSelected: sel ? isSameDay(d, sel) : false, isOtherMonth: true })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear.value, viewMonth.value, day)
    cells.push({ day, month: viewMonth.value, year: viewYear.value, isToday: isSameDay(d, today), isSelected: sel ? isSameDay(d, sel) : false, isOtherMonth: false })
  }
  const remaining = (7 - cells.length % 7) % 7
  for (let day = 1; day <= remaining; day++) {
    const month = viewMonth.value === 11 ? 0 : viewMonth.value + 1
    const year = viewMonth.value === 11 ? viewYear.value + 1 : viewYear.value
    const d = new Date(year, month, day)
    cells.push({ day, month, year, isToday: isSameDay(d, today), isSelected: sel ? isSameDay(d, sel) : false, isOtherMonth: true })
  }
  return cells
})

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- } else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ } else viewMonth.value++
}

function calcPosition() {
  if (!inputEl.value) return
  const rect = inputEl.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  if (spaceBelow >= 290 || spaceBelow >= rect.top) {
    popupStyle.value = { top: rect.bottom + window.scrollY + 4 + 'px', left: rect.left + window.scrollX + 'px' }
  } else {
    popupStyle.value = { top: rect.top + window.scrollY - 294 + 'px', left: rect.left + window.scrollX + 'px' }
  }
}

function openCal() {
  const sel = parseDMY(props.modelValue)
  if (sel) { viewYear.value = sel.getFullYear(); viewMonth.value = sel.getMonth() }
  else { viewYear.value = today.getFullYear(); viewMonth.value = today.getMonth() }
  open.value = true
  nextTick(calcPosition)
}
function close() { open.value = false }
function toggle() { if (open.value) close(); else { inputEl.value?.focus(); openCal() } }

function selectDay(year: number, month: number, day: number) {
  emit('update:modelValue', fmt(new Date(year, month, day)))
  close()
}
function clear() { emit('update:modelValue', ''); close() }
function goToday() { selectDay(today.getFullYear(), today.getMonth(), today.getDate()) }

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  let digits = raw.replace(/\D/g, '')
  let out = ''
  if (digits.length <= 2) out = digits
  else if (digits.length <= 4) out = digits.slice(0,2) + '.' + digits.slice(2)
  else out = digits.slice(0,2) + '.' + digits.slice(2,4) + '.' + digits.slice(4,8)
  emit('update:modelValue', out)
  nextTick(() => { if (inputEl.value) inputEl.value.value = out })
}

function onOutside(e: MouseEvent) { if (open.value) close() }
onMounted(() => {
  document.addEventListener('mousedown', onOutside)
  window.addEventListener('scroll', calcPosition, true)
  window.addEventListener('resize', calcPosition)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutside)
  window.removeEventListener('scroll', calcPosition, true)
  window.removeEventListener('resize', calcPosition)
})
</script>

<style scoped>
.dp-wrap { position: relative; width: 100%; }
.dp-trigger { position: relative; display: flex; align-items: center; width: 100%; }
.dp-input { flex: 1; padding-right: 28px !important; min-width: 0; }
.dp-icon-btn {
  position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
  background: none; border: none; padding: 2px; cursor: pointer;
  color: #888; opacity: .55; transition: opacity .15s; line-height: 0;
}
.dp-icon-btn:hover { opacity: 1; }

/* popup */
.dp-popup {
  position: absolute;
  z-index: 9999;
  width: 252px;
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,.55);
  padding: 10px;
  user-select: none;
}
.dp-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.dp-nav {
  background: none; border: none; cursor: pointer;
  color: #bbb; font-size: 1.3rem; line-height: 1;
  padding: 2px 7px; border-radius: 5px; transition: background .15s;
}
.dp-nav:hover { background: rgba(255,255,255,.1); color: #fff; }
.dp-month-label { font-size: .8rem; font-weight: 500; color: #ddd; }
.dp-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  margin-bottom: 3px;
}
.dp-weekdays span {
  text-align: center; font-size: .65rem; color: #555; padding: 2px 0;
}
.dp-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
.dp-day {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  font-size: .78rem; color: #bbb; border-radius: 5px;
  transition: background .12s, color .12s;
}
.dp-day:hover:not(:disabled):not(.dp-day--sel) { background: rgba(255,255,255,.09); color: #fff; }
.dp-day:disabled { cursor: default; }
.dp-day--other { color: #3a3a5a; }
.dp-day--other:hover:not(:disabled) { background: rgba(255,255,255,.04); }
.dp-day--today { color: #7eb8f7; font-weight: 600; }
.dp-day--sel { background: #3b82f6 !important; color: #fff !important; font-weight: 600; border-radius: 5px; }
.dp-footer {
  display: flex; justify-content: space-between; margin-top: 8px;
  border-top: 1px solid rgba(255,255,255,.07); padding-top: 7px;
}
.dp-clear, .dp-today {
  background: none; border: none; cursor: pointer;
  font-size: .72rem; color: #666; padding: 3px 8px;
  border-radius: 5px; transition: color .15s, background .15s;
}
.dp-clear:hover { color: #e06c6c; background: rgba(224,108,108,.1); }
.dp-today:hover { color: #7eb8f7; background: rgba(126,184,247,.1); }
</style>
