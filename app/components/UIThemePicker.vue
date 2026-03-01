<template>
  <div ref="root" class="utp-wrap">
    <!-- trigger: small button with active theme name swatched -->
    <button type="button" class="utp-trigger" @click.stop="open = !open">
      <span class="utp-swatch" :style="{ background: current?.swatch }" />
      <span class="utp-label">{{ current?.label }}</span>
      <span class="utp-arrow" :class="{ 'utp-arrow--open': open }">›</span>
    </button>

    <!-- dropdown -->
    <Teleport to="body">
      <Transition name="utp-drop">
        <div
          v-if="open"
          class="utp-panel glass-surface"
          :style="panelStyle"
          @click.stop
        >
          <div class="utp-heading">оформление</div>
          <div class="utp-list">
            <button
              v-for="t in UI_THEMES"
              :key="t.id"
              type="button"
              class="utp-item"
              :class="{ 'utp-item--active': themeId === t.id }"
              @click="pick(t.id)"
            >
              <span class="utp-item-swatch" :style="{ background: t.swatch }" />
              <span class="utp-item-name">{{ t.label }}</span>
              <span class="utp-item-hint">{{ t.btnPreview }}</span>
              <span v-if="themeId === t.id" class="utp-item-tick">✓</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { themeId, applyTheme, UI_THEMES } = useUITheme()

const open   = ref(false)
const root   = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const current = computed(() => UI_THEMES.find(t => t.id === themeId.value))

watch(open, (v) => {
  if (!v || !root.value) return
  const rect = root.value.getBoundingClientRect()
  panelStyle.value = {
    position: 'fixed',
    top:   `${rect.bottom + 7}px`,
    right: `${window.innerWidth - rect.right}px`,
    zIndex: '9999',
  }
})

function pick(id: string) {
  applyTheme(id)
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
.utp-wrap { position: relative; display: inline-flex; align-items: center; }

/* ── Trigger ── */
.utp-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--btn-sm-border, rgba(0,0,0,0.11));
  background: var(--btn-sm-bg, transparent);
  color: var(--btn-color, inherit);
  border-radius: var(--btn-radius, 3px);
  padding: 4px 10px 4px 7px;
  font-size: .72rem;
  letter-spacing: .03em;
  cursor: pointer;
  font-family: inherit;
  opacity: .68;
  transition: opacity .15s;
}
.utp-trigger:hover { opacity: 1; }

.utp-swatch {
  width: 10px; height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.10);
  flex-shrink: 0;
}

.utp-label { line-height: 1; }

.utp-arrow {
  font-size: .8rem;
  opacity: .5;
  transition: transform .15s;
  display: inline-block;
}
.utp-arrow--open { transform: rotate(90deg); }

/* ── Panel ── */
.utp-panel {
  min-width: 200px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  padding: 9px 7px 7px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.09);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}

.utp-heading {
  font-size: .58rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .38;
  padding: 0 7px 7px;
}

.utp-list { display: flex; flex-direction: column; gap: 2px; }

.utp-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  border: none;
  background: transparent;
  color: var(--glass-text);
  padding: 7px 8px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  transition: background .12s;
  text-align: left;
}
.utp-item:hover { background: color-mix(in srgb, var(--glass-bg) 82%, transparent); }
.utp-item--active { background: color-mix(in srgb, var(--glass-bg) 94%, transparent); }

.utp-item-swatch {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.09);
  flex-shrink: 0;
}

.utp-item-name {
  font-size: .76rem;
  flex: 1;
  opacity: .82;
}
.utp-item--active .utp-item-name { opacity: 1; font-weight: 500; }

.utp-item-hint {
  font-size: .62rem;
  opacity: .38;
  letter-spacing: .04em;
}

.utp-item-tick { font-size: .68rem; opacity: .5; }

/* ── Transition ── */
.utp-drop-enter-active { transition: opacity .14s ease, transform .14s ease; }
.utp-drop-leave-active { transition: opacity .10s ease; }
.utp-drop-enter-from  { opacity: 0; transform: translateY(-5px) scale(.98); }
.utp-drop-leave-to    { opacity: 0; }
</style>
