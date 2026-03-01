<template>
  <div ref="wrapEl" class="aai-wrap">
    <input
      :value="modelValue"
      :class="inputClass"
      :placeholder="placeholder"
      autocomplete="off"
      v-bind="$attrs"
      @input="onInput"
      @focus="onFocus"
      @blur="hideSuggest"
      @keydown.down.prevent="suggestDown"
      @keydown.up.prevent="suggestUp"
      @keydown.enter.prevent="suggestSelect"
    />
    <Teleport to="body">
      <ul
        v-if="suggestions.length"
        class="aai-list"
        :style="dropStyle"
      >
        <li
          v-for="(s, i) in suggestions"
          :key="i"
          class="aai-item"
          :class="{ 'aai-item--active': activeIndex === i }"
          @mousedown.prevent="pick(s)"
        >
          <span class="aai-title">{{ s.title }}</span>
          <span v-if="s.subtitle" class="aai-sub">{{ s.subtitle }}</span>
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  inputClass?: string | Record<string, boolean> | string[]
}>(), {
  placeholder: '',
  inputClass: '',
})

const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

interface Suggestion { title: string; subtitle: string; full: string }

const suggestions = ref<Suggestion[]>([])
const activeIndex = ref(-1)
const wrapEl = ref<HTMLElement | null>(null)
const dropStyle = ref<Record<string, string>>({})
let timer: ReturnType<typeof setTimeout> | null = null

function updatePos() {
  const el = wrapEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  dropStyle.value = {
    position: 'fixed',
    top: r.bottom + 4 + 'px',
    left: r.left + 'px',
    width: r.width + 'px',
    zIndex: '99999',
  }
}

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:modelValue', val)
  updatePos()
  fetchSuggestions(val)
}

function onFocus(e: Event) {
  const val = (e.target as HTMLInputElement).value
  updatePos()
  if (val.length >= 2) fetchSuggestions(val)
}

function fetchSuggestions(q: string) {
  if (timer) clearTimeout(timer)
  if (q.trim().length < 2) { suggestions.value = []; return }
  timer = setTimeout(async () => {
    try {
      const data = await $fetch<{ results: Suggestion[] }>('/api/suggest/address', { query: { q } })
      suggestions.value = data.results || []
      activeIndex.value = -1
    } catch { suggestions.value = [] }
  }, 250)
}

function hideSuggest() {
  setTimeout(() => { suggestions.value = []; activeIndex.value = -1 }, 150)
}

function suggestDown() {
  if (activeIndex.value < suggestions.value.length - 1) activeIndex.value++
}
function suggestUp() {
  if (activeIndex.value > 0) activeIndex.value--
}
function suggestSelect() {
  if (activeIndex.value >= 0) {
    const selected = suggestions.value[activeIndex.value]
    if (selected) pick(selected)
  }
}
function pick(s: Suggestion) {
  emit('update:modelValue', s.full)
  suggestions.value = []
  activeIndex.value = -1
}
</script>

<style scoped>
.aai-wrap {
  position: relative;
  flex: 1;
  width: 100%;
  min-width: 0;
}
input { display: block; width: 100%; box-sizing: border-box; }
</style>

<style>
/* global — список телепортирован в body */
.aai-list {
  background: #fff;
  border: none;
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0,0,0,.16);
  padding: 4px 0;
  margin: 0;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
}
.dark .aai-list { background: #1e1e1e; }

.aai-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background .1s;
}
.aai-item:hover,
.aai-item--active { background: rgba(0,0,0,.05); }
.dark .aai-item:hover,
.dark .aai-item--active { background: rgba(255,255,255,.07); }

.aai-title { font-size: .88rem; color: #1a1a1a; line-height: 1.3; }
.aai-sub   { font-size: .75rem; color: #999; }
</style>
