<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Шрифт</div>
      <div class="dp-font-grid">
        <button
          v-for="f in FONT_OPTIONS"
          :key="f.id"
          type="button"
          class="dp-font-btn"
          :class="{ 'dp-font-btn--active': currentFontId === f.id }"
          :style="{ fontFamily: f.value }"
          @click="pickFont(f.id)"
        >{{ f.label }}</button>
      </div>
    </div>
    <div class="dp-col">
      <!-- Переключатель контекста -->
      <div class="dp-typo-ctx-tabs">
        <button type="button" class="dp-typo-ctx-btn" :class="{ 'dp-typo-ctx-btn--active': typeCtx === 'text' }" @click="typeCtx = 'text'">Текст</button>
        <button type="button" class="dp-typo-ctx-btn" :class="{ 'dp-typo-ctx-btn--active': typeCtx === 'headings' }" @click="typeCtx = 'headings'">Загол.</button>
        <button type="button" class="dp-typo-ctx-btn" :class="{ 'dp-typo-ctx-btn--active': typeCtx === 'buttons' }" @click="typeCtx = 'buttons'">Кнопки</button>
        <button type="button" class="dp-typo-ctx-btn" :class="{ 'dp-typo-ctx-btn--active': typeCtx === 'inputs' }" @click="typeCtx = 'inputs'">Поля</button>
      </div>

      <!-- Контекст: Текст -->
      <template v-if="typeCtx === 'text'">
        <div class="dp-field">
          <label class="dp-label">размер <span class="dp-val">{{ (tokens.fontSize * 100).toFixed(0) }}%</span></label>
          <input type="range" min="0.7" max="1.4" step="0.02" :value="tokens.fontSize" class="dp-range" @input="onFloat('fontSize', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">основной вес <span class="dp-val">{{ tokens.fontWeight }}</span></label>
          <input type="range" min="300" max="700" step="100" :value="tokens.fontWeight" class="dp-range" @input="onRange('fontWeight', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">межбуквенный <span class="dp-val">{{ tokens.letterSpacing.toFixed(2) }}em</span></label>
          <input type="range" min="-0.02" max="0.15" step="0.005" :value="tokens.letterSpacing" class="dp-range" @input="onFloat('letterSpacing', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">межстрочный <span class="dp-val">{{ tokens.lineHeight.toFixed(2) }}</span></label>
          <input type="range" min="1.1" max="2.0" step="0.05" :value="tokens.lineHeight" class="dp-range" @input="onFloat('lineHeight', $event)">
        </div>
        <div class="dp-col-label" style="margin-top:8px">Абзацы</div>
        <div class="dp-field">
          <label class="dp-label">отступ между абз. <span class="dp-val">{{ tokens.paragraphSpacing.toFixed(2) }}rem</span></label>
          <input type="range" min="0" max="2.5" step="0.05" :value="tokens.paragraphSpacing" class="dp-range" @input="onFloat('paragraphSpacing', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">межсловный <span class="dp-val">{{ tokens.wordSpacing === 0 ? 'авто' : tokens.wordSpacing.toFixed(2) + 'em' }}</span></label>
          <input type="range" min="0" max="0.3" step="0.01" :value="tokens.wordSpacing" class="dp-range" @input="onFloat('wordSpacing', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">отступ 1-й строки <span class="dp-val">{{ tokens.textIndent === 0 ? 'нет' : tokens.textIndent.toFixed(1) + 'em' }}</span></label>
          <input type="range" min="0" max="4" step="0.25" :value="tokens.textIndent" class="dp-range" @input="onFloat('textIndent', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">ширина абзаца <span class="dp-val">{{ tokens.paragraphMaxWidth === 0 ? '∞' : tokens.paragraphMaxWidth + 'ch' }}</span></label>
          <input type="range" min="0" max="100" step="2" :value="tokens.paragraphMaxWidth" class="dp-range" @input="onRange('paragraphMaxWidth', $event)">
        </div>
      </template>

      <!-- Контекст: Заголовки -->
      <template v-else-if="typeCtx === 'headings'">
        <div class="dp-field">
          <label class="dp-label">вес заголовков <span class="dp-val">{{ tokens.headingWeight }}</span></label>
          <input type="range" min="300" max="900" step="100" :value="tokens.headingWeight" class="dp-range" @input="onRange('headingWeight', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">межбуквенный <span class="dp-val">{{ tokens.headingLetterSpacing.toFixed(3) }}em</span></label>
          <input type="range" min="-0.06" max="0.15" step="0.005" :value="tokens.headingLetterSpacing" class="dp-range" @input="onFloat('headingLetterSpacing', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">межстрочный <span class="dp-val">{{ tokens.headingLineHeight.toFixed(2) }}</span></label>
          <input type="range" min="0.9" max="2.0" step="0.05" :value="tokens.headingLineHeight" class="dp-range" @input="onFloat('headingLineHeight', $event)">
        </div>
      </template>

      <!-- Контекст: Кнопки -->
      <template v-else-if="typeCtx === 'buttons'">
        <div class="dp-type-ctx-hint">Типографика кнопок (стиль и отступы → таб «Кнопки»)</div>
        <div class="dp-field">
          <label class="dp-label">межбуквенный кнопок <span class="dp-val">{{ tokens.letterSpacing.toFixed(2) }}em</span></label>
          <input type="range" min="-0.02" max="0.15" step="0.005" :value="tokens.letterSpacing" class="dp-range" @input="onFloat('letterSpacing', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.btnWeight }}</span></label>
          <input type="range" min="300" max="800" step="100" :value="tokens.btnWeight" class="dp-range" @input="onRange('btnWeight', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">регистр</label>
          <div class="dp-chip-picker">
            <div class="dp-chip-pool">
              <button
                v-for="s in textTransforms"
                :key="`type-btn-transform-${s.id}`"
                type="button"
                class="dp-chip"
                :class="{ 'dp-chip--active': String(tokens.btnTransform) === String(s.id) }"
                @click="set('btnTransform', s.id)"
              >{{ s.label }}</button>
            </div>
          </div>
        </div>
      </template>

      <!-- Контекст: Поля ввода -->
      <template v-else-if="typeCtx === 'inputs'">
        <div class="dp-type-ctx-hint">Шрифт и отступы полей ввода</div>
        <div class="dp-field">
          <label class="dp-label">размер шрифта <span class="dp-val">{{ tokens.inputFontSize === 0 ? 'авто' : tokens.inputFontSize.toFixed(3) + 'rem' }}</span></label>
          <input type="range" min="0" max="1.2" step="0.025" :value="tokens.inputFontSize" class="dp-range" @input="onFloat('inputFontSize', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">отступ гор. <span class="dp-val">{{ tokens.inputPaddingH }}px</span></label>
          <input type="range" min="4" max="32" step="1" :value="tokens.inputPaddingH" class="dp-range" @input="onRange('inputPaddingH', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">отступ верт. <span class="dp-val">{{ tokens.inputPaddingV }}px</span></label>
          <input type="range" min="2" max="24" step="1" :value="tokens.inputPaddingV" class="dp-range" @input="onRange('inputPaddingV', $event)">
        </div>
      </template>
    </div>

    <div class="dp-col">
      <div class="dp-col-label">Превью</div>

      <!-- Превью: Текст -->
      <template v-if="typeCtx === 'text'">
        <div class="dp-col-label" style="margin-top:0">Выравнивание</div>
        <div class="dp-align-group">
          <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'left' }" title="По левому" @click="set('textAlign', 'left')">&#x2190;</button>
          <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'center' }" title="По центру" @click="set('textAlign', 'center')">&#x2630;</button>
          <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'right' }" title="По правому" @click="set('textAlign', 'right')">&#x2192;</button>
          <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'justify' }" title="По ширине" @click="set('textAlign', 'justify')">&#x2261;</button>
        </div>
        <div class="dp-live-preview" style="margin-top:8px">
          <div class="dp-type-sample" :style="typeSampleStyle">
            <div class="dp-type-h" :style="{ fontWeight: String(tokens.headingWeight), letterSpacing: tokens.headingLetterSpacing + 'em', lineHeight: String(tokens.headingLineHeight) }">Заголовок</div>
            <div class="dp-type-p" :style="{ textIndent: tokens.textIndent > 0 ? tokens.textIndent + 'em' : undefined, wordSpacing: tokens.wordSpacing > 0 ? tokens.wordSpacing + 'em' : undefined, textAlign: tokens.textAlign }">Дизайн-система позволяет управлять каждым визуальным элементом.</div>
          </div>
        </div>
      </template>

      <!-- Превью: Заголовки -->
      <template v-else-if="typeCtx === 'headings'">
        <div class="dp-headings-preview" :style="{ fontFamily: tokens.fontFamily }">
          <div
            v-for="(label, i) in ['Заголовок H1', 'Заголовок H2', 'Заголовок H3', 'Заголовок H4']"
            :key="i"
            class="dp-heading-prev-item"
            :style="{
              fontWeight: String(tokens.headingWeight),
              letterSpacing: tokens.headingLetterSpacing + 'em',
              lineHeight: String(tokens.headingLineHeight),
              fontSize: [2.074, 1.728, 1.44, 1.2][i]! * tokens.fontSize + 'rem'
            }"
          >{{ label }}</div>
        </div>
      </template>

      <!-- Превью: Кнопки -->
      <template v-else-if="typeCtx === 'buttons'">
        <div class="dp-btn-preview" style="flex-direction:column; gap:10px">
          <span :style="previewBtnTypeStyle">Сохранить</span>
          <span :style="previewSmBtnStyle">Отмена</span>
          <span :style="previewGhostBtnStyle">Доп. действия</span>
        </div>
        <div class="dp-type-ctx-hint" style="margin-top:10px">Гор./верт. отступ и стиль — в табе Кнопки</div>
      </template>

      <!-- Превью: Поля -->
      <template v-else-if="typeCtx === 'inputs'">
        <div class="dp-inputs-preview">
          <input type="text" readonly :style="previewInputStyle" placeholder="Имя клиента">
          <input type="text" readonly :style="previewInputStyle" placeholder="Адрес объекта">
          <textarea readonly :style="{ ...previewInputStyle, height: '56px', resize: 'none' }" placeholder="Описание проекта"></textarea>
        </div>
      </template>

      <!-- Шкала шрифта (всегда) -->
      <div class="dp-col-label" style="margin-top:12px">Шкала</div>
      <div class="dp-scale-visual">
        <div
          v-for="s in typeScaleSizes"
          :key="s.name"
          class="dp-scale-row"
          :style="{ fontSize: s.size + 'rem', fontFamily: tokens.fontFamily }"
        >
          <span class="dp-scale-name">{{ s.name }}</span>
          <span class="dp-scale-sample">Аа</span>
          <span class="dp-scale-px">{{ (s.size * 16).toFixed(0) }}px</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BTN_SIZE_MAP, FONT_OPTIONS } from '~/entities/design-system/model/useDesignSystem'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, set, onRange, onFloat } = useDesignTokenControls()

const typeCtx = ref<'text' | 'headings' | 'buttons' | 'inputs'>('text')

const textTransforms = [
  { id: 'none' as const, label: 'обычный' },
  { id: 'uppercase' as const, label: 'ВЕРХНИЙ' },
  { id: 'capitalize' as const, label: 'С Заглавной' },
]

const currentFontId = computed(() =>
  FONT_OPTIONS.find(f => f.value === tokens.value.fontFamily)?.id || 'system',
)

function pickFont(id: string) {
  const f = FONT_OPTIONS.find(o => o.id === id)
  if (f) set('fontFamily', f.value)
}

const typeSampleStyle = computed(() => {
  const t = tokens.value
  return {
    fontFamily: t.fontFamily,
    fontSize: `${t.fontSize}rem`,
    fontWeight: String(t.fontWeight),
    letterSpacing: `${t.letterSpacing}em`,
    lineHeight: String(t.lineHeight),
    wordSpacing: t.wordSpacing > 0 ? `${t.wordSpacing}em` : 'normal',
    textAlign: t.textAlign,
    maxWidth: t.paragraphMaxWidth > 0 ? `${t.paragraphMaxWidth}ch` : 'none',
  }
})

const previewBtnTypeStyle = computed(() => {
  const t = tokens.value
  const sz = BTN_SIZE_MAP[t.btnSize]
  const finalPy = t.btnPaddingV > 0 ? t.btnPaddingV : sz.py
  const finalPx = t.btnPaddingH > 0 ? t.btnPaddingH : sz.px
  const bg = t.btnStyle === 'filled' || t.btnStyle === 'soft' ? 'color-mix(in srgb, var(--glass-text) 7%, transparent)' : 'transparent'
  const border = t.btnStyle === 'ghost' || t.btnStyle === 'soft' ? 'transparent' : 'color-mix(in srgb, var(--glass-text) 14%, transparent)'
  return {
    borderRadius: `${t.btnRadius}px`,
    padding: `${finalPy}px ${finalPx}px`,
    fontSize: `${sz.fontSize}rem`,
    textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`,
    background: bg,
    border: `1px solid ${border}`,
    fontWeight: String(t.btnWeight),
    fontFamily: t.fontFamily,
    display: 'inline-block',
    cursor: 'default',
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

const previewInputStyle = computed(() => {
  const t = tokens.value
  return {
    borderRadius: `${t.inputRadius}px`,
    padding: `${t.inputPaddingV}px ${t.inputPaddingH}px`,
    fontSize: t.inputFontSize > 0 ? `${t.inputFontSize}rem` : 'var(--ds-text-sm, .833rem)',
    fontFamily: t.fontFamily,
    background: 'color-mix(in srgb, var(--glass-text) 6%, transparent)',
    border: `1px solid color-mix(in srgb, var(--glass-text) 15%, transparent)`,
    color: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  }
})

const typeScaleSizes = computed(() => {
  const r = tokens.value.typeScale
  const fs = tokens.value.fontSize
  return [
    { name: '3xl', size: fs * r * r * r * r },
    { name: '2xl', size: fs * r * r * r },
    { name: 'xl', size: fs * r * r },
    { name: 'lg', size: fs * r },
    { name: 'md', size: fs },
    { name: 'sm', size: fs / r },
    { name: 'xs', size: fs / r / r },
  ]
})
</script>
