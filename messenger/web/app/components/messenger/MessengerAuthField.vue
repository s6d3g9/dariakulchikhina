<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  label: string
  type?: 'text' | 'password'
  autocomplete?: string
  autocapitalize?: string
  spellcheck?: boolean
  inputmode?: HTMLInputElement['inputMode']
  enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  minLength?: number
  maxLength?: number
  required?: boolean
  disabled?: boolean
  hint?: string
  error?: string
}>(), {
  type: 'text',
  autocomplete: undefined,
  autocapitalize: 'sentences',
  spellcheck: false,
  inputmode: undefined,
  enterkeyhint: 'enter',
  minLength: undefined,
  maxLength: undefined,
  required: false,
  disabled: false,
  hint: '',
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  enter: [event: KeyboardEvent]
}>()

const inputElement = ref<HTMLInputElement | null>(null)

const hasValue = computed(() => props.modelValue.length > 0)

function handleInput(event: Event) {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    emit('update:modelValue', target.value)
  }
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

function handleEnter(event: KeyboardEvent) {
  emit('enter', event)
}

function focus() {
  inputElement.value?.focus()
}

defineExpose({
  focus,
})
</script>

<template>
  <div
    class="auth-native-field"
    :class="{
      'auth-native-field--filled': hasValue,
      'auth-native-field--error': Boolean(props.error),
      'auth-native-field--disabled': props.disabled,
    }"
  >
    <label class="auth-native-field__shell">
      <span class="auth-native-field__label">{{ props.label }}</span>
      <input
        ref="inputElement"
        class="auth-native-field__control"
        :value="props.modelValue"
        :type="props.type"
        :autocomplete="props.autocomplete"
        :autocapitalize="props.autocapitalize"
        :spellcheck="props.spellcheck"
        :inputmode="props.inputmode as 'text' | 'numeric' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'decimal' | undefined"
        :enterkeyhint="props.enterkeyhint"
        :minlength="props.minLength"
        :maxlength="props.maxLength"
        :required="props.required"
        :disabled="props.disabled"
        @input="handleInput"
        @blur="handleBlur"
        @keydown.enter.prevent="handleEnter"
      >
    </label>
    <p v-if="props.error" class="auth-native-field__message auth-native-field__message--error">
      {{ props.error }}
    </p>
    <p v-else-if="props.hint" class="auth-native-field__message">
      {{ props.hint }}
    </p>
  </div>
</template>