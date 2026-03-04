<template>
  <input
    ref="el"
    type="tel"
    :value="formatted"
    :placeholder="placeholder"
    :class="inputClass"
    v-bind="$attrs"
    @focus="onFocus"
    @input="onInput"
    @keydown="onKeydown"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  inputClass?: string
}>(), {
  modelValue: '',
  placeholder: '+7 (9__) ___-__-__',
  inputClass: 'glass-input',
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'blur'): void
}>()

const el = ref<HTMLInputElement>()
const PREFIX = '+7 (9'

/** Извлекает 10 цифр мобильного номера (без кода страны) */
function extractDigits(v: string): string {
  let d = (v || '').replace(/\D/g, '')
  // убираем ведущую 7 или 8
  if (d.startsWith('7') || d.startsWith('8')) d = d.slice(1)
  return d.slice(0, 10)
}

/** Форматирует 10 цифр (первая всегда 9) в +7 (9XX) XXX-XX-XX */
function buildDisplay(digits: string): string {
  if (!digits) return ''
  // Первая цифра всегда 9
  let d = (digits[0] !== '9' ? '9' + digits.slice(1) : digits).slice(0, 10)
  let r = '+7 ('
  r += d.slice(0, 3)
  if (d.length < 3) return r
  r += ') '
  r += d.slice(3, 6)
  if (d.length < 4) return r
  if (d.length >= 6) r += '-'
  r += d.slice(6, 8)
  if (d.length >= 8) r += '-'
  r += d.slice(8, 10)
  return r
}

const formatted = computed(() => {
  const digits = extractDigits(props.modelValue || '')
  return digits ? buildDisplay(digits) : ''
})

function onFocus() {
  if (!props.modelValue || extractDigits(props.modelValue).length === 0) {
    emit('update:modelValue', PREFIX)
    nextTick(() => {
      if (el.value) {
        el.value.value = PREFIX
        el.value.setSelectionRange(PREFIX.length, PREFIX.length)
      }
    })
  }
}

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const digits = extractDigits(raw)
  const result = digits ? buildDisplay(digits) : ''
  const out = result || PREFIX
  emit('update:modelValue', out)
  nextTick(() => {
    if (el.value) {
      el.value.value = out
      el.value.setSelectionRange(out.length, out.length)
    }
  })
}

function onKeydown(e: KeyboardEvent) {
  const inp = e.target as HTMLInputElement
  const sel = inp.selectionStart ?? 0
  if ((e.key === 'Backspace' || e.key === 'Delete') && sel <= PREFIX.length && inp.selectionStart === inp.selectionEnd) {
    e.preventDefault()
  }
}

function onBlur() {
  // Если введено только +7 (9 — очищаем
  const digits = extractDigits(props.modelValue || '')
  if (digits.length <= 1) {
    emit('update:modelValue', '')
  }
  emit('blur')
}
</script>
