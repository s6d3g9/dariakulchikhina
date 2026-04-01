<script setup lang="ts">
import { computed } from 'vue'

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
      <div v-show="modelValue" class="u-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" @mousedown.self="handleOverlayClick">
        <Transition :name="transition" appear>
          <div v-show="modelValue" class="u-modal w-full max-w-lg transform-gpu transition-all duration-300 relative flex flex-col shadow-2xl overflow-hidden" @mousedown.stop>

            <!-- Ликвид градиент для бэкпэйна (свет / блики) -->
            <div class="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-3xl"></div>
            <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/5 to-transparent pointer-events-none rounded-b-3xl"></div>

            <header class="flex items-center justify-between p-6 pb-4 border-b border-white/10 z-10 relative">
              <h2 class="text-xl font-semibold tracking-wide brightness-110 drop-shadow-md">
                {{ title }}
              </h2>
              <button class="p-2 -mr-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors backdrop-blur-md relative overflow-hidden" @click="close">
                <UIcon name="heroicons:x-mark-20-solid" class="w-5 h-5 opacity-75" />
              </button>
            </header>

            <main class="p-6 overflow-y-auto max-h-[70vh] z-10 custom-scrollbar relative">
              <slot />
            </main>

            <footer class="p-6 pt-4 border-t border-white/10 z-10 bg-black/5 dark:bg-white/5 backdrop-blur-3xl rounded-b-[var(--modal-radius,32px)]">
              <slot name="footer">
                <div class="flex justify-end gap-3">
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
