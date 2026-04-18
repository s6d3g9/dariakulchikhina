<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Стиль и вид</div>
      <div class="dp-field">
        <label class="dp-label">стиль</label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="s in btnStyles"
              :key="`btn-style-${s.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': String(tokens.btnStyle) === String(s.id) }"
              @click="set('btnStyle', s.id)"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>
      <div class="dp-field">
        <label class="dp-label">размер</label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="s in btnSizes"
              :key="`btn-size-${s.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': String(tokens.btnSize) === String(s.id) }"
              @click="set('btnSize', s.id)"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>
      <div class="dp-field">
        <label class="dp-label">регистр</label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="s in textTransforms"
              :key="`btn-transform-${s.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': String(tokens.btnTransform) === String(s.id) }"
              @click="set('btnTransform', s.id)"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>
      <div class="dp-field" style="margin-top:8px">
        <label class="dp-label">кинетика при наведении</label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="s in btnHoverAnims"
              :key="`btn-hover-${s.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': String(tokens.btnHoverAnim) === String(s.id) }"
              @click="set('btnHoverAnim', s.id)"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>
      <div class="dp-field">
        <label class="dp-label">карточки при наведении</label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="s in cardHoverAnims"
              :key="`card-hover-${s.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': String(tokens.cardHoverAnim) === String(s.id) }"
              @click="set('cardHoverAnim', s.id)"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Размеры</div>
      <div class="dp-field">
        <label class="dp-label">закругление <span class="dp-val">{{ tokens.btnRadius }}px</span></label>
        <input type="range" min="0" max="32" step="1" :value="tokens.btnRadius" class="dp-range" @input="onRange('btnRadius', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.btnWeight }}</span></label>
        <input type="range" min="300" max="800" step="100" :value="tokens.btnWeight" class="dp-range" @input="onRange('btnWeight', $event)">
      </div>
      <div class="dp-col-label" style="margin-top:8px">Отступы</div>
      <div class="dp-type-ctx-hint">0 = авто по размеру кнопки</div>
      <div class="dp-field">
        <label class="dp-label">отступ гор. <span class="dp-val">{{ tokens.btnPaddingH === 0 ? 'авто' : tokens.btnPaddingH + 'px' }}</span></label>
        <input type="range" min="0" max="60" step="1" :value="tokens.btnPaddingH" class="dp-range" @input="onRange('btnPaddingH', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">отступ верт. <span class="dp-val">{{ tokens.btnPaddingV === 0 ? 'авто' : tokens.btnPaddingV + 'px' }}</span></label>
        <input type="range" min="0" max="32" step="1" :value="tokens.btnPaddingV" class="dp-range" @input="onRange('btnPaddingV', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-live-preview" style="margin-top:0">
        <div class="dp-btn-preview">
          <button type="button" class="dp-demo-btn" :style="previewBtnStyle">Сохранить</button>
          <button type="button" class="dp-demo-btn" :style="previewSmBtnStyle">Отмена</button>
          <button type="button" class="dp-demo-btn" :style="previewGhostBtnStyle">Ещё</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BTN_SIZE_MAP } from '~/entities/design-system/model/useDesignSystem'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, set, onRange } = useDesignTokenControls()

const btnStyles = [
  { id: 'filled' as const, label: 'залитый' },
  { id: 'outline' as const, label: 'контур' },
  { id: 'ghost' as const, label: 'призрак' },
  { id: 'soft' as const, label: 'мягкий' },
]
const btnSizes = [
  { id: 'xs' as const, label: 'XS' },
  { id: 'sm' as const, label: 'S' },
  { id: 'md' as const, label: 'M' },
  { id: 'lg' as const, label: 'L' },
]
const textTransforms = [
  { id: 'none' as const, label: 'обычный' },
  { id: 'uppercase' as const, label: 'ВЕРХНИЙ' },
  { id: 'capitalize' as const, label: 'С Заглавной' },
]
const btnHoverAnims = [
  { id: 'none' as const, label: 'нет' },
  { id: 'ripple' as const, label: 'm3 ripple' },
  { id: 'lift' as const, label: 'парение' },
  { id: 'scale' as const, label: 'масштаб' },
  { id: 'glow' as const, label: 'свечение' },
  { id: 'fill' as const, label: 'заливка' },
  { id: 'sheen' as const, label: 'блик' },
  { id: 'pulse' as const, label: 'импульс' },
  { id: 'shutter' as const, label: 'шторки' },
  { id: 'magnet' as const, label: 'магнит' },
  { id: 'scan' as const, label: 'скан' },
]
const cardHoverAnims = [
  { id: 'none' as const, label: 'нет' },
  { id: 'lift' as const, label: 'парение' },
  { id: 'scale' as const, label: 'масштаб' },
  { id: 'dim' as const, label: 'затемнение' },
  { id: 'border' as const, label: 'рамка' },
  { id: 'reveal' as const, label: 'открытие' },
]

const previewBtnStyle = computed(() => {
  const t = tokens.value
  const sz = BTN_SIZE_MAP[t.btnSize]
  const bg = t.btnStyle === 'filled' || t.btnStyle === 'soft' ? 'color-mix(in srgb, var(--glass-text) 7%, transparent)' : 'transparent'
  const border = t.btnStyle === 'ghost' || t.btnStyle === 'soft' ? 'transparent' : 'color-mix(in srgb, var(--glass-text) 14%, transparent)'
  return {
    borderRadius: `${t.btnRadius}px`,
    padding: `${sz.py}px ${sz.px}px`,
    fontSize: `${sz.fontSize}rem`,
    textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`,
    background: bg,
    border: `1px solid ${border}`,
    fontWeight: String(t.btnWeight),
    fontFamily: t.fontFamily,
  }
})

const previewSmBtnStyle = computed(() => {
  const t = tokens.value
  const sz = BTN_SIZE_MAP[t.btnSize === 'xs' ? 'xs' : 'sm']
  return {
    borderRadius: `${t.btnRadius}px`,
    padding: `${sz.py}px ${sz.px}px`,
    fontSize: `${sz.fontSize}rem`,
    textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`,
    background: 'transparent',
    border: `1px solid color-mix(in srgb, var(--glass-text) 12%, transparent)`,
    fontFamily: t.fontFamily,
  }
})

const previewGhostBtnStyle = computed(() => {
  const t = tokens.value
  return {
    borderRadius: `${t.btnRadius}px`,
    padding: `${BTN_SIZE_MAP.sm.py}px ${BTN_SIZE_MAP.sm.px}px`,
    fontSize: `${BTN_SIZE_MAP.sm.fontSize}rem`,
    textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`,
    background: 'transparent',
    border: '1px solid transparent',
    fontFamily: t.fontFamily,
    opacity: '0.6',
  }
})
</script>
