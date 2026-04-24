<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const isOpen = computed(() => props.modelValue !== null)

function close() {
  emit('update:modelValue', null)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault()
    close()
  }
}

watch(isOpen, (open) => {
  if (!import.meta.client) return
  if (open) {
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="messenger-header-sheet-backdrop">
      <div
        v-if="isOpen"
        class="messenger-header-sheet-backdrop"
        aria-hidden="true"
        @click="close"
      />
    </Transition>
  </Teleport>

  <Transition name="messenger-header-sheet">
    <section
      v-if="isOpen"
      class="messenger-header-sheet"
      role="dialog"
      aria-modal="false"
      :data-kind="modelValue"
    >
      <slot :kind="modelValue" :close="close" />
    </section>
  </Transition>
</template>
