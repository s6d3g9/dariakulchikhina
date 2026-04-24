<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  positionLabel: string
  hasMatches: boolean
  hasQuery: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  prev: []
  next: []
  close: []
}>()

const inputEl = ref<HTMLInputElement | null>(null)

function focusInput() {
  inputEl.value?.focus({ preventScroll: true })
}

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) emit('prev')
    else emit('next')
  }
}

onMounted(() => {
  nextTick(() => focusInput())
})

defineExpose({ focusInput })
</script>

<template>
  <div class="chat-search-bar" role="search">
    <VIcon class="chat-search-bar__icon" :size="20">mdi-magnify</VIcon>
    <input
      ref="inputEl"
      class="chat-search-bar__input"
      type="search"
      enterkeyhint="search"
      placeholder="Поиск по сообщениям…"
      :value="props.modelValue"
      @input="onInput"
      @keydown="onKeydown"
    >
    <span
      v-if="props.hasQuery"
      class="chat-search-bar__counter label-small"
      :class="{ 'chat-search-bar__counter--empty': !props.hasMatches }"
      aria-live="polite"
    >{{ props.positionLabel }}</span>
    <div class="chat-search-bar__nav">
      <VBtn
        type="button"
        class="chat-search-bar__nav-btn"
        icon
        variant="text"
        size="small"
        aria-label="Предыдущее совпадение"
        :disabled="!props.hasMatches"
        @click="emit('prev')"
      >
        <VIcon :size="20">mdi-chevron-up</VIcon>
      </VBtn>
      <VBtn
        type="button"
        class="chat-search-bar__nav-btn"
        icon
        variant="text"
        size="small"
        aria-label="Следующее совпадение"
        :disabled="!props.hasMatches"
        @click="emit('next')"
      >
        <VIcon :size="20">mdi-chevron-down</VIcon>
      </VBtn>
    </div>
    <VBtn
      type="button"
      class="chat-search-bar__close"
      icon
      variant="text"
      size="small"
      aria-label="Закрыть поиск"
      @click="emit('close')"
    >
      <VIcon :size="20">mdi-close</VIcon>
    </VBtn>
  </div>
</template>
