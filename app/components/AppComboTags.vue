<template>
  <div class="act-wrap" :class="{ 'act-open': isOpen }" @click.stop>
    <!-- Selected tags row -->
    <div class="act-selected" v-if="selected.length">
      <span
        v-for="tag in selected"
        :key="tag"
        class="act-tag"
        @click.stop="removeTag(tag)"
      >{{ tag }}<span class="act-tag-x">×</span></span>
    </div>

    <!-- Input -->
    <input
      ref="inputEl"
      v-model="query"
      class="glass-input act-input"
      :placeholder="selected.length ? 'добавить ещё...' : (placeholder || 'выберите или введите...')"
      autocomplete="off"
      @focus="open"
      @keydown.enter.prevent="addCustom"
      @keydown.comma.prevent="addCustom"
      @keydown.backspace="onBackspace"
      @keydown.escape="close"
    />

    <!-- Dropdown with option chips -->
    <Transition name="act-fade">
      <div v-if="isOpen && visibleOptions.length" class="act-dropdown">
        <button
          v-for="opt in visibleOptions"
          :key="opt"
          type="button"
          class="act-chip"
          :class="{ 'act-chip--on': selected.includes(opt) }"
          @mousedown.prevent="toggleOption(opt)"
        >{{ opt }}</button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  options?: string[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change'): void
}>()

const inputEl = ref<HTMLInputElement>()
const query = ref('')
const isOpen = ref(false)

// Parse modelValue as comma-separated tags
const selected = computed(() => {
  return (props.modelValue || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
})

// Filter options: hide already selected, filter by query
const visibleOptions = computed(() => {
  const q = query.value.toLowerCase().trim()
  const opts = props.options || []
  return opts.filter(opt => {
    if (q && !opt.toLowerCase().includes(q)) return false
    return true
  })
})

function setValue(tags: string[]) {
  const v = tags.join(', ')
  emit('update:modelValue', v)
  emit('change')
}

function toggleOption(opt: string) {
  const cur = [...selected.value]
  const idx = cur.indexOf(opt)
  if (idx >= 0) cur.splice(idx, 1)
  else cur.push(opt)
  setValue(cur)
  query.value = ''
  inputEl.value?.focus()
}

function removeTag(tag: string) {
  setValue(selected.value.filter(t => t !== tag))
}

function addCustom() {
  const v = query.value.trim().replace(/,$/, '')
  if (!v) return
  if (!selected.value.includes(v)) {
    setValue([...selected.value, v])
  }
  query.value = ''
}

function onBackspace() {
  if (query.value === '' && selected.value.length) {
    removeTag(selected.value[selected.value.length - 1])
  }
}

function open() {
  isOpen.value = true
}

function close() {
  setTimeout(() => { isOpen.value = false }, 150)
}

// Close on outside click
onMounted(() => {
  document.addEventListener('click', close)
})
onUnmounted(() => {
  document.removeEventListener('click', close)
})
</script>

<style scoped>
.act-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Selected tags */
.act-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 0;
}

.act-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: .75rem;
  border-radius: 10px;
  background: var(--text, #1a1a1a);
  color: var(--bg, #fff);
  cursor: pointer;
  user-select: none;
  transition: opacity .15s;
}
.act-tag:hover { opacity: .75; }

.act-tag-x {
  font-size: .85rem;
  opacity: .65;
  line-height: 1;
}

/* Input */
.act-input {
  width: 100%;
}

/* Dropdown */
.act-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px;
  background: var(--dropdown-bg, rgba(255,255,255,0.97));
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  border: 1px solid var(--dropdown-border, rgba(0,0,0,0.10));
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
  max-height: 200px;
  overflow-y: auto;
}

.act-chip {
  padding: 4px 12px;
  font-size: .75rem;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(0,0,0,0.12));
  background: transparent;
  color: var(--glass-text);
  cursor: pointer;
  transition: background .13s, color .13s, border-color .13s;
  font-family: inherit;
  white-space: nowrap;
}
.act-chip:hover {
  border-color: var(--text, #1a1a1a);
  color: var(--text, #1a1a1a);
}
.act-chip--on {
  background: var(--text, #1a1a1a);
  color: var(--bg, #fff);
  border-color: var(--text, #1a1a1a);
}

/* Transition */
.act-fade-enter-active, .act-fade-leave-active {
  transition: opacity .15s, transform .15s;
}
.act-fade-enter-from, .act-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
