<template>
  <div ref="root" class="dpp-wrap">
    <!-- Trigger: small swatch circle -->
    <button
      type="button"
      class="dpp-trigger"
      :title="`Тема: ${currentPreset?.name}`"
      :aria-label="'Изменить тему оформления'"
      @click.stop="open = !open"
    >
      <span class="dpp-swatch" :style="{ background: currentPreset?.swatch }" />
    </button>

    <!-- Popover -->
    <Teleport to="body">
      <Transition name="dpp-pop">
        <div
          v-if="open"
          class="dpp-panel glass-surface"
          :style="panelStyle"
          @click.stop
        >
          <div class="dpp-title">оформление</div>
          <div class="dpp-list">
            <button
              v-for="p in DESIGN_PRESETS"
              :key="p.id"
              type="button"
              class="dpp-item"
              :class="{ 'dpp-item--active': presetId === p.id }"
              @click="pick(p.id)"
            >
              <span class="dpp-item-swatch" :style="{ background: p.swatch }" />
              <span class="dpp-item-name">{{ p.name }}</span>
              <span v-if="presetId === p.id" class="dpp-item-check">✓</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { presetId, applyPreset, DESIGN_PRESETS } = useDesignPreset()

const open   = ref(false)
const root   = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const currentPreset = computed(() => DESIGN_PRESETS.find(p => p.id === presetId.value))

watch(open, (v) => {
  if (!v || !root.value) return
  const rect = root.value.getBoundingClientRect()
  panelStyle.value = {
    position: 'fixed',
    top:   `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
    zIndex: '9999',
  }
})

function pick(id: string) {
  applyPreset(id)
  open.value = false
}

function onOutside(e: MouseEvent) {
  if (!open.value) return
  if (root.value?.contains(e.target as Node)) return
  open.value = false
}

onMounted(() => document.addEventListener('click', onOutside, true))
onBeforeUnmount(() => document.removeEventListener('click', onOutside, true))
</script>

<style scoped>
.dpp-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* ── Trigger ── */
.dpp-trigger {
  width: 22px; height: 22px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: transparent;
  cursor: pointer;
  padding: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity .15s, box-shadow .15s;
  opacity: .65;
}
.dpp-trigger:hover { opacity: 1; box-shadow: 0 0 0 2px var(--glass-border); }

.dpp-swatch {
  display: block;
  width: 100%; height: 100%;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.08);
}

/* ── Panel ── */
.dpp-panel {
  min-width: 158px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  padding: 10px 8px 8px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.10);
}

.dpp-title {
  font-size: .6rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .4;
  padding: 0 6px 8px;
}

.dpp-list { display: flex; flex-direction: column; gap: 2px; }

.dpp-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  border: none;
  background: transparent;
  padding: 7px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background .12s;
  color: var(--glass-text);
}
.dpp-item:hover { background: color-mix(in srgb, var(--glass-bg) 85%, transparent); }
.dpp-item--active { background: color-mix(in srgb, var(--glass-bg) 94%, transparent); }

.dpp-item-swatch {
  width: 16px; height: 16px;
  border-radius: 999px;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.08);
}

.dpp-item-name {
  font-size: .76rem;
  flex: 1;
  text-align: left;
  opacity: .80;
}
.dpp-item--active .dpp-item-name { opacity: 1; font-weight: 500; }

.dpp-item-check {
  font-size: .7rem;
  opacity: .6;
  color: var(--glass-text);
}

/* ── Transition ── */
.dpp-pop-enter-active { transition: opacity .14s ease, transform .14s ease; }
.dpp-pop-leave-active { transition: opacity .10s ease, transform .08s ease; }
.dpp-pop-enter-from  { opacity: 0; transform: translateY(-6px) scale(.97); }
.dpp-pop-leave-to    { opacity: 0; transform: translateY(-4px) scale(.98); }
</style>
