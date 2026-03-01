<template>
  <div class="dp-wrap">
    <!-- Trigger button -->
    <button type="button" class="dp-trigger" @click.stop="open = !open">
      <span class="dp-trigger-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>
          <rect x="10" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>
          <rect x="1" y="10" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>
          <rect x="10" y="10" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </span>
      <span class="dp-trigger-label">дизайн</span>
    </button>

    <!-- Slide-out panel -->
    <Teleport to="body">
      <Transition name="dp-slide">
        <div v-if="open" class="dp-overlay" @click.self="open = false">
          <div class="dp-panel" @click.stop>
            <!-- Header -->
            <div class="dp-header">
              <span class="dp-title">Дизайн-система</span>
              <div class="dp-header-actions">
                <button type="button" class="dp-reset" @click="resetAll" title="Сбросить">↺</button>
                <button type="button" class="dp-close" @click="open = false">✕</button>
              </div>
            </div>

            <div class="dp-body">
              <!-- ═══ S1: Theme presets ═══ -->
              <section class="dp-section">
                <div class="dp-section-title">палитра</div>
                <div class="dp-preset-grid">
                  <button
                    v-for="t in UI_THEMES"
                    :key="t.id"
                    type="button"
                    class="dp-preset"
                    :class="{ 'dp-preset--active': themeId === t.id }"
                    @click="pickTheme(t.id)"
                  >
                    <span class="dp-preset-swatch" :style="{ background: t.swatch }" />
                    <span class="dp-preset-name">{{ t.label }}</span>
                  </button>
                </div>
              </section>

              <!-- ═══ S2: Buttons ═══ -->
              <section class="dp-section">
                <div class="dp-section-title">кнопки</div>

                <!-- Button style -->
                <div class="dp-field">
                  <label class="dp-label">стиль</label>
                  <div class="dp-chips">
                    <button
                      v-for="s in btnStyles"
                      :key="s.id"
                      type="button"
                      class="dp-chip"
                      :class="{ 'dp-chip--active': tokens.btnStyle === s.id }"
                      @click="set('btnStyle', s.id)"
                    >{{ s.label }}</button>
                  </div>
                </div>

                <!-- Button size -->
                <div class="dp-field">
                  <label class="dp-label">размер</label>
                  <div class="dp-chips">
                    <button
                      v-for="s in btnSizes"
                      :key="s.id"
                      type="button"
                      class="dp-chip"
                      :class="{ 'dp-chip--active': tokens.btnSize === s.id }"
                      @click="set('btnSize', s.id)"
                    >{{ s.label }}</button>
                  </div>
                </div>

                <!-- Button radius -->
                <div class="dp-field">
                  <label class="dp-label">закругление <span class="dp-val">{{ tokens.btnRadius }}px</span></label>
                  <input type="range" min="0" max="32" step="1" :value="tokens.btnRadius" class="dp-range" @input="onRange('btnRadius', $event)">
                </div>

                <!-- Text transform -->
                <div class="dp-field">
                  <label class="dp-label">регистр</label>
                  <div class="dp-chips">
                    <button
                      v-for="s in textTransforms"
                      :key="s.id"
                      type="button"
                      class="dp-chip"
                      :class="{ 'dp-chip--active': tokens.btnTransform === s.id }"
                      @click="set('btnTransform', s.id)"
                    >{{ s.label }}</button>
                  </div>
                </div>

                <!-- Preview -->
                <div class="dp-preview">
                  <button type="button" class="dp-preview-btn" :style="previewBtnStyle">
                    Кнопка
                  </button>
                  <button type="button" class="dp-preview-btn dp-preview-btn--sm" :style="previewSmBtnStyle">
                    Малая
                  </button>
                </div>
              </section>

              <!-- ═══ S3: Typography ═══ -->
              <section class="dp-section">
                <div class="dp-section-title">типографика</div>

                <!-- Font family -->
                <div class="dp-field">
                  <label class="dp-label">шрифт</label>
                  <select class="dp-select" :value="currentFontId" @change="pickFont(($event.target as HTMLSelectElement).value)">
                    <option v-for="f in FONT_OPTIONS" :key="f.id" :value="f.id">{{ f.label }}</option>
                  </select>
                </div>

                <!-- Font size -->
                <div class="dp-field">
                  <label class="dp-label">размер шрифта <span class="dp-val">{{ (tokens.fontSize * 100).toFixed(0) }}%</span></label>
                  <input type="range" min="0.7" max="1.3" step="0.02" :value="tokens.fontSize" class="dp-range" @input="onRangeFloat('fontSize', $event)">
                </div>

                <!-- Font weight -->
                <div class="dp-field">
                  <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.fontWeight }}</span></label>
                  <input type="range" min="300" max="700" step="100" :value="tokens.fontWeight" class="dp-range" @input="onRange('fontWeight', $event)">
                </div>

                <!-- Letter spacing -->
                <div class="dp-field">
                  <label class="dp-label">межбуквенный <span class="dp-val">{{ tokens.letterSpacing.toFixed(2) }}em</span></label>
                  <input type="range" min="0" max="0.15" step="0.005" :value="tokens.letterSpacing" class="dp-range" @input="onRangeFloat('letterSpacing', $event)">
                </div>

                <!-- Line height -->
                <div class="dp-field">
                  <label class="dp-label">межстрочный <span class="dp-val">{{ tokens.lineHeight.toFixed(1) }}</span></label>
                  <input type="range" min="1.2" max="2.0" step="0.05" :value="tokens.lineHeight" class="dp-range" @input="onRangeFloat('lineHeight', $event)">
                </div>

                <!-- Preview text -->
                <div class="dp-type-preview" :style="typePreviewStyle">
                  Дизайн-система позволяет настроить каждый визуальный элемент панели.
                </div>
              </section>

              <!-- ═══ S4: Glass / Surface ═══ -->
              <section class="dp-section">
                <div class="dp-section-title">поверхности</div>

                <div class="dp-field">
                  <label class="dp-label">размытие <span class="dp-val">{{ tokens.glassBlur }}px</span></label>
                  <input type="range" min="0" max="32" step="1" :value="tokens.glassBlur" class="dp-range" @input="onRange('glassBlur', $event)">
                </div>

                <div class="dp-field">
                  <label class="dp-label">прозрачность фона <span class="dp-val">{{ (tokens.glassOpacity * 100).toFixed(0) }}%</span></label>
                  <input type="range" min="0" max="1" step="0.02" :value="tokens.glassOpacity" class="dp-range" @input="onRangeFloat('glassOpacity', $event)">
                </div>

                <div class="dp-field">
                  <label class="dp-label">обводка <span class="dp-val">{{ (tokens.glassBorderOpacity * 100).toFixed(0) }}%</span></label>
                  <input type="range" min="0" max="0.5" step="0.01" :value="tokens.glassBorderOpacity" class="dp-range" @input="onRangeFloat('glassBorderOpacity', $event)">
                </div>

                <div class="dp-field">
                  <label class="dp-label">тень <span class="dp-val">{{ (tokens.glassShadowIntensity * 100).toFixed(0) }}%</span></label>
                  <input type="range" min="0" max="0.3" step="0.01" :value="tokens.glassShadowIntensity" class="dp-range" @input="onRangeFloat('glassShadowIntensity', $event)">
                </div>

                <!-- Surface preview -->
                <div class="dp-surface-preview" :style="surfacePreviewStyle">
                  <div class="dp-surface-box">предпросмотр</div>
                </div>
              </section>

              <!-- ═══ S5: Spacing & Radii ═══ -->
              <section class="dp-section">
                <div class="dp-section-title">отступы и скругления</div>

                <div class="dp-field">
                  <label class="dp-label">масштаб отступов <span class="dp-val">{{ (tokens.spacingScale * 100).toFixed(0) }}%</span></label>
                  <input type="range" min="0.6" max="1.6" step="0.05" :value="tokens.spacingScale" class="dp-range" @input="onRangeFloat('spacingScale', $event)">
                </div>

                <div class="dp-field">
                  <label class="dp-label">карточки <span class="dp-val">{{ tokens.cardRadius }}px</span></label>
                  <input type="range" min="0" max="28" step="1" :value="tokens.cardRadius" class="dp-range" @input="onRange('cardRadius', $event)">
                </div>

                <div class="dp-field">
                  <label class="dp-label">поля ввода <span class="dp-val">{{ tokens.inputRadius }}px</span></label>
                  <input type="range" min="0" max="16" step="1" :value="tokens.inputRadius" class="dp-range" @input="onRange('inputRadius', $event)">
                </div>

                <!-- Radii preview -->
                <div class="dp-radii-preview">
                  <div class="dp-radii-card" :style="{ borderRadius: tokens.cardRadius + 'px' }">
                    карточка
                  </div>
                  <div class="dp-radii-input" :style="{ borderRadius: tokens.inputRadius + 'px' }">
                    поле ввода
                  </div>
                </div>
              </section>
            </div><!-- /.dp-body -->
          </div><!-- /.dp-panel -->
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useDesignSystem, FONT_OPTIONS, BTN_SIZE_MAP, type DesignTokens } from '~/composables/useDesignSystem'

const { tokens, set, reset: dsReset, applyToDOM } = useDesignSystem()
const { themeId, applyTheme, UI_THEMES } = useUITheme()

const open = ref(false)

/* ── Option lists ───────────────────────────────────── */
const btnStyles = [
  { id: 'filled'  as const, label: 'залитый' },
  { id: 'outline' as const, label: 'контур' },
  { id: 'ghost'   as const, label: 'призрак' },
  { id: 'soft'    as const, label: 'мягкий' },
]
const btnSizes = [
  { id: 'xs' as const, label: 'XS' },
  { id: 'sm' as const, label: 'S' },
  { id: 'md' as const, label: 'M' },
  { id: 'lg' as const, label: 'L' },
]
const textTransforms = [
  { id: 'none'       as const, label: 'обычный' },
  { id: 'uppercase'  as const, label: 'ВЕРХНИЙ' },
  { id: 'capitalize' as const, label: 'С Заглавной' },
]

/* ── Helpers ────────────────────────────────────────── */
const currentFontId = computed(() =>
  FONT_OPTIONS.find(f => f.value === tokens.value.fontFamily)?.id || 'system'
)

function pickFont(id: string) {
  const f = FONT_OPTIONS.find(o => o.id === id)
  if (f) set('fontFamily', f.value)
}

function pickTheme(id: string) {
  applyTheme(id)
}

function onRange<K extends keyof DesignTokens>(key: K, e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  set(key, v as DesignTokens[K])
}

function onRangeFloat<K extends keyof DesignTokens>(key: K, e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  set(key, v as DesignTokens[K])
}

function resetAll() {
  dsReset()
}

/* ── Preview styles (computed from tokens) ──────────── */
const previewBtnStyle = computed(() => {
  const t = tokens.value
  const sz = BTN_SIZE_MAP[t.btnSize]
  const bg = t.btnStyle === 'filled' || t.btnStyle === 'soft'
    ? 'rgba(0,0,0,0.07)' : 'transparent'
  const border = t.btnStyle === 'ghost' || t.btnStyle === 'soft'
    ? 'transparent' : 'rgba(0,0,0,0.14)'
  return {
    borderRadius: `${t.btnRadius}px`,
    padding: `${sz.py}px ${sz.px}px`,
    fontSize: `${sz.fontSize}rem`,
    textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`,
    background: bg,
    border: `1px solid ${border}`,
    fontFamily: t.fontFamily,
    fontWeight: String(t.fontWeight),
  }
})

const previewSmBtnStyle = computed(() => {
  const t = tokens.value
  const sz = BTN_SIZE_MAP[t.btnSize === 'xs' ? 'xs' : t.btnSize === 'sm' ? 'xs' : 'sm']
  const border = t.btnStyle === 'ghost' || t.btnStyle === 'soft'
    ? 'transparent' : 'rgba(0,0,0,0.12)'
  return {
    borderRadius: `${t.btnRadius}px`,
    padding: `${sz.py}px ${sz.px}px`,
    fontSize: `${sz.fontSize}rem`,
    textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`,
    background: 'transparent',
    border: `1px solid ${border}`,
    fontFamily: t.fontFamily,
  }
})

const typePreviewStyle = computed(() => {
  const t = tokens.value
  return {
    fontFamily: t.fontFamily,
    fontSize: `${t.fontSize}rem`,
    fontWeight: String(t.fontWeight),
    letterSpacing: `${t.letterSpacing}em`,
    lineHeight: String(t.lineHeight),
  }
})

const surfacePreviewStyle = computed(() => {
  const t = tokens.value
  return {
    backdropFilter: `blur(${t.glassBlur}px)`,
    WebkitBackdropFilter: `blur(${t.glassBlur}px)`,
    background: `rgba(255,255,255,${t.glassOpacity})`,
    border: `1px solid rgba(0,0,0,${t.glassBorderOpacity})`,
    boxShadow: `0 8px 24px rgba(0,0,0,${t.glassShadowIntensity})`,
    borderRadius: `${tokens.value.cardRadius}px`,
  }
})

/* ── Keyboard shortcut: Escape closes panel ─────────── */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) open.value = false
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   UIDesignPanel — professional slide‑out design control panel
   ═══════════════════════════════════════════════════════════ */

/* ── Trigger ── */
.dp-trigger {
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
.dp-trigger:hover { opacity: 1; }
.dp-trigger-icon { display: flex; align-items: center; opacity: .7; }
.dp-trigger-label { line-height: 1; }

/* ── Overlay ── */
.dp-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.18);
  display: flex;
  justify-content: flex-end;
}

/* ── Panel ── */
.dp-panel {
  width: 360px;
  max-width: 92vw;
  height: 100vh;
  background: var(--glass-page-bg, #f4f4f2);
  border-left: 1px solid rgba(0,0,0,0.08);
  box-shadow: -16px 0 48px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

html.dark .dp-panel {
  background: #111113;
  border-left-color: rgba(255,255,255,0.08);
}

/* ── Header ── */
.dp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
}
.dp-title {
  font-size: .82rem;
  font-weight: 600;
  letter-spacing: .04em;
  color: var(--glass-text, #2c2c2a);
}
.dp-header-actions { display: flex; gap: 8px; }
.dp-reset, .dp-close {
  width: 28px; height: 28px;
  border: 1px solid rgba(0,0,0,0.08);
  background: transparent;
  color: var(--glass-text, #2c2c2a);
  border-radius: 6px;
  font-size: .72rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: .5;
  transition: opacity .15s;
}
.dp-reset:hover, .dp-close:hover { opacity: 1; }

/* ── Body (scrollable) ── */
.dp-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0 32px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.1) transparent;
}

/* ── Section ── */
.dp-section {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.dp-section:last-child { border-bottom: none; }
.dp-section-title {
  font-size: .6rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--glass-text, #2c2c2a);
  opacity: .36;
  margin-bottom: 12px;
}

/* ── Field ── */
.dp-field {
  margin-bottom: 12px;
}
.dp-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: .7rem;
  color: var(--glass-text, #2c2c2a);
  opacity: .7;
  margin-bottom: 6px;
  letter-spacing: .02em;
}
.dp-val {
  font-variant-numeric: tabular-nums;
  opacity: .55;
  font-size: .64rem;
  font-weight: 500;
}

/* ── Range ── */
.dp-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(0,0,0,0.08);
  outline: none;
  cursor: pointer;
}
.dp-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--glass-text, #2c2c2a);
  border: 2px solid var(--glass-page-bg, #f4f4f2);
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  cursor: pointer;
  transition: transform .12s;
}
.dp-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
.dp-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--glass-text, #2c2c2a);
  border: 2px solid var(--glass-page-bg, #f4f4f2);
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  cursor: pointer;
}

/* ── Chips (pill selectors) ── */
.dp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.dp-chip {
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.09);
  background: transparent;
  color: var(--glass-text, #2c2c2a);
  font-size: .66rem;
  letter-spacing: .02em;
  cursor: pointer;
  font-family: inherit;
  opacity: .55;
  transition: opacity .12s, background .12s, border-color .12s;
}
.dp-chip:hover { opacity: .85; }
.dp-chip--active {
  opacity: 1;
  background: rgba(0,0,0,0.06);
  border-color: rgba(0,0,0,0.2);
  font-weight: 600;
}

/* ── Select ── */
.dp-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid rgba(0,0,0,0.09);
  border-radius: 6px;
  background: transparent;
  color: var(--glass-text, #2c2c2a);
  font-size: .72rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
}
.dp-select:focus { border-color: rgba(0,0,0,0.22); }

/* ── Preset grid ── */
.dp-preset-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.dp-preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  transition: border-color .15s, background .15s;
}
.dp-preset:hover { background: rgba(0,0,0,0.03); }
.dp-preset--active {
  border-color: rgba(0,0,0,0.18);
  background: rgba(0,0,0,0.04);
}
.dp-preset-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid rgba(0,0,0,0.1);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
}
.dp-preset-name {
  font-size: .56rem;
  letter-spacing: .04em;
  opacity: .52;
  white-space: nowrap;
}
.dp-preset--active .dp-preset-name { opacity: 1; font-weight: 600; }

/* ── Preview area (buttons) ── */
.dp-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0,0,0,0.02);
  margin-top: 4px;
}
.dp-preview-btn {
  color: var(--glass-text, #2c2c2a);
  cursor: default;
  font-family: inherit;
  transition: none;
}

/* ── Type preview ── */
.dp-type-preview {
  padding: 12px;
  border-radius: 8px;
  background: rgba(0,0,0,0.02);
  color: var(--glass-text, #2c2c2a);
  margin-top: 4px;
}

/* ── Surface preview ── */
.dp-surface-preview {
  margin-top: 8px;
  padding: 16px;
  border-radius: 10px;
  background: repeating-conic-gradient(rgba(0,0,0,0.04) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px;
}
.dp-surface-box {
  padding: 20px;
  text-align: center;
  font-size: .72rem;
  color: var(--glass-text, #2c2c2a);
  opacity: .5;
}

/* ── Radii preview ── */
.dp-radii-preview {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.dp-radii-card, .dp-radii-input {
  flex: 1;
  padding: 14px;
  text-align: center;
  font-size: .66rem;
  color: var(--glass-text, #2c2c2a);
  opacity: .6;
  border: 1px solid rgba(0,0,0,0.1);
  background: rgba(0,0,0,0.02);
  transition: border-radius .15s;
}

/* ── Slide transition ── */
.dp-slide-enter-active { transition: opacity .2s ease, transform .2s ease; }
.dp-slide-leave-active { transition: opacity .15s ease, transform .15s ease; }
.dp-slide-enter-from { opacity: 0; }
.dp-slide-enter-from .dp-panel { transform: translateX(100%); }
.dp-slide-leave-to { opacity: 0; }
.dp-slide-leave-to .dp-panel { transform: translateX(100%); }

/* ── Dark mode overrides ── */
html.dark .dp-chip { border-color: rgba(255,255,255,0.1); }
html.dark .dp-chip--active { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.22); }
html.dark .dp-select { border-color: rgba(255,255,255,0.1); }
html.dark .dp-preset:hover { background: rgba(255,255,255,0.04); }
html.dark .dp-preset--active { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }
html.dark .dp-preset-swatch { border-color: rgba(255,255,255,0.14); }
html.dark .dp-range { background: rgba(255,255,255,0.1); }
html.dark .dp-range::-webkit-slider-thumb { background: #e8e8e8; border-color: #111; }
html.dark .dp-range::-moz-range-thumb { background: #e8e8e8; border-color: #111; }
html.dark .dp-header { border-bottom-color: rgba(255,255,255,0.06); }
html.dark .dp-section { border-bottom-color: rgba(255,255,255,0.04); }
html.dark .dp-reset, html.dark .dp-close { border-color: rgba(255,255,255,0.1); }
html.dark .dp-preview, html.dark .dp-type-preview { background: rgba(255,255,255,0.03); }
html.dark .dp-surface-preview { background: repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px; }
html.dark .dp-radii-card, html.dark .dp-radii-input { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); }

/* ── Mobile ── */
@media (max-width: 480px) {
  .dp-panel { width: 100vw; }
  .dp-preset-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
