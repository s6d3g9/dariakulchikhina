<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  preventClose?: boolean
  transition?: 'scale' | 'slide' | 'fade'
}>(), {
  modelValue: false,
  title: '',
  preventClose: false,
  transition: 'scale'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const attrs = useAttrs()

function handleOverlayClick() {
  if (!props.preventClose) {
    emit('update:modelValue', false)
    emit('close')
  }
}

function close() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade" appear>
      <div v-show="modelValue" class="u-modal-overlay glass-modal-overlay" @mousedown.self="handleOverlayClick">
        <Transition :name="transition" appear>
          <div
            v-show="modelValue"
            v-bind="attrs"
            class="u-modal glass-modal"
            role="dialog"
            aria-modal="true"
            @mousedown.stop
          >
            <header class="u-modal__head glass-modal__head">
              <h2 class="u-modal__title glass-modal__title">
                {{ title }}
              </h2>
              <button type="button" class="u-modal__close glass-modal__close" @click="close">
                <UIcon name="heroicons:x-mark-20-solid" class="glass-modal__close-icon" />
              </button>
            </header>

            <main class="u-modal__body glass-modal__body">
              <slot />
            </main>

            <footer class="u-modal__foot glass-modal__foot">
              <slot name="footer">
                <div class="glass-modal__actions">
                  <GlassButton variant="secondary" @click="close">Отмена</GlassButton>
                  <GlassButton variant="primary" @click="$emit('confirm')">Сохранить</GlassButton>
                </div>
              </slot>
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.scale-enter-active, .scale-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.scale-enter-from, .scale-leave-to { opacity: 0; transform: scale(0.95); }

.slide-enter-active, .slide-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(20px); }
</style>
