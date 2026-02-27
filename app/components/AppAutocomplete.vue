<template>
  <div class="autocomplete-wrap" :class="{ open: showDropdown }">
    <input
      ref="inputEl"
      :value="modelValue"
      :placeholder="placeholder"
      :class="inputClass"
      type="text"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.down.prevent="moveDown"
      @keydown.up.prevent="moveUp"
      @keydown.enter.prevent="selectCurrent"
      @keydown.escape="close"
    >
    <Transition name="ac-fade">
      <div v-if="showDropdown && filtered.length" class="ac-dropdown glass-dropdown">
        <div
          v-for="(item, i) in filtered"
          :key="i"
          class="ac-option"
          :class="{ active: i === activeIdx }"
          @mousedown.prevent="pick(item)"
        >
          <span v-html="highlight(item)"></span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  inputClass?: string
  /** Comma-separated categories: materials,fabrics,kitchen etc. Empty = all */
  categories?: string
}>(), {
  placeholder: '',
  inputClass: 'glass-input',
  categories: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change'): void
}>()

const inputEl = ref<HTMLInputElement>()
const query = ref('')
const allItems = ref<string[]>([])
const showDropdown = ref(false)
const activeIdx = ref(-1)

// Load suggestions once
const loaded = ref(false)
async function ensureLoaded() {
  if (loaded.value) return
  loaded.value = true
  try {
    const cats = props.categories ? props.categories.split(',').map(c => c.trim()) : ['']
    const results: string[] = []
    for (const cat of cats) {
      const url = cat ? `/api/suggestions?category=${cat}` : '/api/suggestions'
      const data = await $fetch<string[]>(url)
      results.push(...data)
    }
    allItems.value = [...new Set(results)]
  } catch { /* silently fail */ }
}

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q || q.length < 1) return []
  const res = allItems.value
    .filter(item => item.toLowerCase().includes(q))
    .slice(0, 12)
  return res
})

function highlight(text: string): string {
  const q = query.value.trim()
  if (!q) return text
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<b>$1</b>')
}

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  query.value = val
  emit('update:modelValue', val)
  emit('change')
  activeIdx.value = -1
  showDropdown.value = true
}

async function onFocus() {
  await ensureLoaded()
  if (query.value.trim().length >= 1) {
    showDropdown.value = true
  }
}

function onBlur() {
  setTimeout(() => { showDropdown.value = false }, 150)
}

function close() {
  showDropdown.value = false
}

function pick(item: string) {
  emit('update:modelValue', item)
  emit('change')
  query.value = item
  showDropdown.value = false
}

function moveDown() {
  if (!showDropdown.value) { showDropdown.value = true; return }
  if (activeIdx.value < filtered.value.length - 1) activeIdx.value++
}

function moveUp() {
  if (activeIdx.value > 0) activeIdx.value--
}

function selectCurrent() {
  if (activeIdx.value >= 0 && activeIdx.value < filtered.value.length) {
    pick(filtered.value[activeIdx.value])
  }
}

// Sync external changes
watch(() => props.modelValue, (v) => { query.value = v })
onMounted(() => { query.value = props.modelValue || '' })
</script>

<style scoped>
.autocomplete-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}
.autocomplete-wrap input {
  width: 100%;
}

.ac-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  z-index: 100;
  border-radius: 10px;
  padding: 4px;
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border: 1px solid rgba(255,255,255,.45);
  box-shadow: 0 8px 32px rgba(0,0,0,.10);
}

.ac-option {
  padding: 7px 12px;
  font-size: .82rem;
  border-radius: 7px;
  cursor: pointer;
  color: #1a1a2e;
  transition: background .15s;
}
.ac-option:hover,
.ac-option.active {
  background: rgba(110,90,220,.13);
}
.ac-option :deep(b) {
  color: #6e5adc;
  font-weight: 700;
}

/* transition */
.ac-fade-enter-active, .ac-fade-leave-active {
  transition: opacity .18s, transform .18s;
}
.ac-fade-enter-from, .ac-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
