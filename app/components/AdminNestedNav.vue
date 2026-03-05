<template>
  <div class="ann-shell">
    <Transition :name="slideName">
      <!-- New panel key = depth triggers the slide animation -->
      <div :key="depth" class="ann-panel">

        <!-- ── Header: back + title + count ── -->
        <div class="ann-header">
          <button v-if="depth > 0" class="ann-back" @click="emit('back')">
            <svg class="ann-back-ico" viewBox="0 0 16 16" width="10" height="10">
              <path d="M10 2 L4 8 L10 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
            <span>{{ currentLayer.backLabel ?? '←' }}</span>
          </button>
          <div class="ann-title-row">
            <span class="ann-title">{{ currentLayer.title }}</span>
            <span v-if="currentLayer.count !== undefined" class="ann-count">{{ currentLayer.count }}</span>
          </div>
        </div>

        <!-- ── Search ── -->
        <div class="ann-search">
          <input
            type="search"
            :value="modelValue"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            class="ann-search-input"
            placeholder="поиск…"
            autocomplete="off"
          />
        </div>

        <!-- ── List body (scrollable, provided by parent) ── -->
        <div class="ann-body">
          <slot :name="`layer${depth}`" />
        </div>

        <!-- ── Footer action (optional, per layer) ── -->
        <div v-if="hasFooter" class="ann-footer">
          <slot :name="`footer${depth}`" />
        </div>

      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
export interface AnnLayerData {
  title: string
  count?: number
  backLabel?: string
}

const props = defineProps<{
  depth: 0 | 1 | 2
  layerData: AnnLayerData[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'back': []
}>()

const slots = useSlots()

const slideName = ref('ann-fwd')

watch(() => props.depth, (next, prev) => {
  slideName.value = next > prev ? 'ann-fwd' : 'ann-back'
}, { flush: 'sync' })

const currentLayer = computed<AnnLayerData>(() =>
  props.layerData[props.depth] ?? { title: '', backLabel: '' }
)

const hasFooter = computed(() => !!slots[`footer${props.depth}`])
</script>

<style scoped>
/* ── Shell ──────────────────────────────────────────── */
.ann-shell {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Panel (one layer) ──────────────────────────────── */
.ann-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  /* absolute so slide Transition can stack old + new */
  position: absolute;
  inset: 0;
}

/* ── Header ─────────────────────────────────────────── */
.ann-header {
  flex-shrink: 0;
  padding: 10px 10px 0;
  background: var(--glass-page-bg);
}

.ann-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  font-size: .7rem;
  color: var(--glass-text);
  opacity: .52;
  cursor: pointer;
  padding: 3px 6px 3px 2px;
  border-radius: 7px;
  font-family: inherit;
  transition: opacity .12s, background .12s;
  margin-bottom: 4px;
}
.ann-back:hover { opacity: .88; background: color-mix(in srgb, var(--glass-bg) 60%, transparent); }

.ann-back-ico { flex-shrink: 0; opacity: .8; }

.ann-title-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 2px;
  margin-bottom: 6px;
}
.ann-title {
  font-size: .78rem;
  font-weight: 600;
  color: var(--glass-text);
  letter-spacing: -.01em;
}
.ann-count {
  font-size: .62rem;
  color: var(--glass-text);
  opacity: .38;
  font-variant-numeric: tabular-nums;
}

/* ── Search ─────────────────────────────────────────── */
.ann-search {
  flex-shrink: 0;
  padding: 0 10px 8px;
  background: var(--glass-page-bg);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 7%, transparent);
}
.ann-search-input {
  width: 100%;
  box-sizing: border-box;
  font-size: .74rem;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 15%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 40%, transparent);
  color: var(--glass-text);
  outline: none;
  font-family: inherit;
  transition: border-color .15s;
}
.ann-search-input:focus {
  border-color: color-mix(in srgb, var(--ds-accent, #7c6ef7) 50%, transparent);
}
.ann-search-input::placeholder { opacity: .4; }
.ann-search-input::-webkit-search-cancel-button { display: none; }

/* ── Scrollable body ────────────────────────────────── */
.ann-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 10px 24px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--glass-text) 18%, transparent) transparent;
}
.ann-body::-webkit-scrollbar { width: 3px; }
.ann-body::-webkit-scrollbar-track { background: transparent; }
.ann-body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--glass-text) 20%, transparent);
  border-radius: 2px;
}

/* ── Footer ─────────────────────────────────────────── */
.ann-footer {
  flex-shrink: 0;
  padding: 8px 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}

/* ── Slide transitions ──────────────────────────────── */
/* Forward: new layer slides in from right */
.ann-fwd-enter-active,
.ann-fwd-leave-active,
.ann-back-enter-active,
.ann-back-leave-active {
  transition: transform .22s cubic-bezier(.4,0,.2,1), opacity .18s ease;
  position: absolute;
  inset: 0;
  will-change: transform, opacity;
}

.ann-fwd-enter-from  { transform: translateX(100%); opacity: 0; }
.ann-fwd-enter-to    { transform: translateX(0);    opacity: 1; }
.ann-fwd-leave-from  { transform: translateX(0);    opacity: 1; }
.ann-fwd-leave-to    { transform: translateX(-40%); opacity: 0; }

.ann-back-enter-from { transform: translateX(-40%); opacity: 0; }
.ann-back-enter-to   { transform: translateX(0);    opacity: 1; }
.ann-back-leave-from { transform: translateX(0);    opacity: 1; }
.ann-back-leave-to   { transform: translateX(100%); opacity: 0; }
</style>
