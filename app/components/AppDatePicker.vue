<template>
  <UPopover :content="{ align: 'start' }">
    <div class="date-picker-trigger" @click.stop>
      <input
        ref="inputEl"
        :value="modelValue"
        :placeholder="placeholder"
        :class="inputClass"
        type="text"
        inputmode="numeric"
        @input="onInput"
        @blur="onBlur"
      />
      <button type="button" class="date-picker-icon" tabindex="-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
    </div>
    <template #content>
      <div class="date-picker-calendar">
        <UCalendar v-model="calendarValue" @update:model-value="onCalendarSelect" />
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  inputClass?: string
}>(), {
  placeholder: 'дд.мм.гггг',
  inputClass: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputEl = ref<HTMLInputElement>()

// Parse dd.mm.yyyy → CalendarDate
function parseDMY(s: string): CalendarDate | undefined {
  if (!s) return undefined
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return undefined
  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const year = parseInt(m[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return undefined
  try {
    return new CalendarDate(year, month, day)
  } catch {
    return undefined
  }
}

// CalendarDate → dd.mm.yyyy
function formatDMY(d: CalendarDate): string {
  const dd = String(d.day).padStart(2, '0')
  const mm = String(d.month).padStart(2, '0')
  return `${dd}.${mm}.${d.year}`
}

const calendarValue = computed<CalendarDate | undefined>({
  get() {
    return parseDMY(props.modelValue)
  },
  set() { /* handled by onCalendarSelect */ }
})

function onCalendarSelect(val: any) {
  if (val) {
    const formatted = formatDMY(val as CalendarDate)
    emit('update:modelValue', formatted)
  }
}

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  // Auto-format: insert dots after dd and mm
  let digits = raw.replace(/[^\d]/g, '')
  let formatted = ''
  if (digits.length <= 2) {
    formatted = digits
  } else if (digits.length <= 4) {
    formatted = digits.slice(0, 2) + '.' + digits.slice(2)
  } else {
    formatted = digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4, 8)
  }
  emit('update:modelValue', formatted)
  // Keep cursor position reasonable
  nextTick(() => {
    if (inputEl.value) {
      inputEl.value.value = formatted
    }
  })
}

function onBlur() {
  // no additional processing needed
}
</script>

<style scoped>
.date-picker-trigger {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}
.date-picker-trigger input {
  flex: 1;
  padding-right: 28px;
  min-width: 0;
}
.date-picker-icon {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--glass-text, #888);
  opacity: 0.5;
  transition: opacity 0.15s;
  line-height: 0;
}
.date-picker-icon:hover {
  opacity: 1;
}
.date-picker-calendar {
  padding: 4px;
}
</style>
