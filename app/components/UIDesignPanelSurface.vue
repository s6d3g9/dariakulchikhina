<template>
  <div>
    <!-- ═══ Поверхности ═══ -->
    <div v-show="activeTab === 'surface'" class="dp-page dp-page--cols">
      <div class="dp-col">
        <div class="dp-col-label">Стекло</div>
        <div class="dp-field">
          <label class="dp-label">размытие <span class="dp-val">{{ tokens.glassBlur }}px</span></label>
          <input type="range" min="0" max="64" step="1" :value="tokens.glassBlur" class="dp-range" @input="onRange('glassBlur', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.glassSaturation }}%</span></label>
          <input type="range" min="0" max="300" step="5" :value="tokens.glassSaturation" class="dp-range" @input="onRange('glassSaturation', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">прозрачность <span class="dp-val">{{ pct(tokens.glassOpacity) }}</span></label>
          <input type="range" min="0" max="1" step="0.02" :value="tokens.glassOpacity" class="dp-range" @input="onFloat('glassOpacity', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">обводка <span class="dp-val">{{ pct(tokens.glassBorderOpacity) }}</span></label>
          <input type="range" min="0" max="0.5" step="0.01" :value="tokens.glassBorderOpacity" class="dp-range" @input="onFloat('glassBorderOpacity', $event)">
        </div>
      </div>
      <div class="dp-col">
        <div class="dp-col-label">Тени</div>
        <div class="dp-field">
          <label class="dp-label">тень Y <span class="dp-val">{{ tokens.shadowOffsetY }}px</span></label>
          <input type="range" min="0" max="24" step="1" :value="tokens.shadowOffsetY" class="dp-range" @input="onRange('shadowOffsetY', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">размытие <span class="dp-val">{{ tokens.shadowBlurRadius }}px</span></label>
          <input type="range" min="0" max="64" step="1" :value="tokens.shadowBlurRadius" class="dp-range" @input="onRange('shadowBlurRadius', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">spread <span class="dp-val">{{ tokens.shadowSpread }}px</span></label>
          <input type="range" min="-8" max="8" step="1" :value="tokens.shadowSpread" class="dp-range" @input="onRange('shadowSpread', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">прозрачность <span class="dp-val">{{ pct(tokens.shadowOpacity) }}</span></label>
          <input type="range" min="0" max="0.4" step="0.01" :value="tokens.shadowOpacity" class="dp-range" @input="onFloat('shadowOpacity', $event)">
        </div>
      </div>
      <div class="dp-col">
        <div class="dp-col-label">Превью</div>
        <div class="dp-surface-demo" style="margin-top:0">
          <div class="dp-surface-card" :style="surfaceStyle">
            <div class="dp-surface-title">Карточка</div>
            <div class="dp-surface-text">Пример поверхности с текущими настройками стекла и теней.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Скругления ═══ -->
    <div v-show="activeTab === 'radii'" class="dp-page dp-page--cols">
      <div class="dp-col">
        <div class="dp-col-label">Радиусы</div>
        <div class="dp-field">
          <label class="dp-label">карточки <span class="dp-val">{{ tokens.cardRadius }}px</span></label>
          <input type="range" min="0" max="32" step="1" :value="tokens.cardRadius" class="dp-range" @input="onRange('cardRadius', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">поля ввода <span class="dp-val">{{ tokens.inputRadius }}px</span></label>
          <input type="range" min="0" max="20" step="1" :value="tokens.inputRadius" class="dp-range" @input="onRange('inputRadius', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">чипы <span class="dp-val">{{ tokens.chipRadius === 999 ? '∞' : tokens.chipRadius + 'px' }}</span></label>
          <input type="range" min="0" max="999" step="1" :value="tokens.chipRadius" class="dp-range" @input="onRange('chipRadius', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">модальные <span class="dp-val">{{ tokens.modalRadius }}px</span></label>
          <input type="range" min="0" max="28" step="1" :value="tokens.modalRadius" class="dp-range" @input="onRange('modalRadius', $event)">
        </div>
      </div>
      <div class="dp-col">
        <div class="dp-col-label">Отступы</div>
        <div class="dp-field">
          <label class="dp-label">базовый юнит <span class="dp-val">{{ tokens.spacingBase }}px</span></label>
          <input type="range" min="2" max="12" step="1" :value="tokens.spacingBase" class="dp-range" @input="onRange('spacingBase', $event)">
        </div>
        <div class="dp-field">
          <label class="dp-label">масштаб <span class="dp-val">{{ pct(tokens.spacingScale) }}</span></label>
          <input type="range" min="0.6" max="1.8" step="0.05" :value="tokens.spacingScale" class="dp-range" @input="onFloat('spacingScale', $event)">
        </div>
      </div>
      <div class="dp-col">
        <div class="dp-col-label">Превью</div>
        <div class="dp-radii-row">
          <div class="dp-radii-box" :style="{ borderRadius: tokens.cardRadius + 'px' }">card</div>
          <div class="dp-radii-box" :style="{ borderRadius: tokens.inputRadius + 'px' }">input</div>
          <div class="dp-radii-box" :style="{ borderRadius: tokens.chipRadius + 'px' }">chip</div>
          <div class="dp-radii-box" :style="{ borderRadius: tokens.modalRadius + 'px' }">modal</div>
        </div>
      </div>
    </div>

    <!-- ═══ Тёмная тема ═══ -->
    <div v-show="activeTab === 'darkMode'" class="dp-page dp-page--cols">
      <div class="dp-col">
        <div class="dp-col-label">Параметры</div>
        <div class="dp-field">
          <label class="dp-label">подъём поверхностей <span class="dp-val">{{ tokens.darkElevation }}</span></label>
          <input type="range" min="0" max="20" step="1" :value="tokens.darkElevation" class="dp-range" @input="onRange('darkElevation', $event)">
          <div class="dp-field-hint">Осветляет фоны карточек в тёмном режиме</div>
        </div>
        <div class="dp-field">
          <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.darkSaturation }}%</span></label>
          <input type="range" min="0" max="100" step="5" :value="tokens.darkSaturation" class="dp-range" @input="onRange('darkSaturation', $event)">
          <div class="dp-field-hint">Убавляет цветовую насыщенность в тёмном режиме</div>
        </div>
      </div>
      <div class="dp-col">
        <div class="dp-col-label">Превью тёмной темы</div>
        <div class="dp-live-preview dp-dark-preview" style="margin-top:0">
          <div class="dp-dark-cards">
            <div class="dp-dark-card"
              :style="{
                background: `hsl(220, ${tokens.darkSaturation}%, ${8 + tokens.darkElevation * 0.5}%)`,
                borderRadius: tokens.cardRadius + 'px',
                border: `${tokens.borderWidth}px ${tokens.borderStyle} hsl(220, ${tokens.darkSaturation * 0.3}%, ${15 + tokens.darkElevation}%)`,
              }">
              <div class="dp-dark-card-title" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.2}%, 88%)` }">Карточка</div>
              <div class="dp-dark-card-text" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.15}%, 62%)` }">Пример текста в тёмной теме с текущими настройками.</div>
            </div>
            <div class="dp-dark-card"
              :style="{
                background: `hsl(220, ${tokens.darkSaturation}%, ${10 + tokens.darkElevation * 0.8}%)`,
                borderRadius: tokens.cardRadius + 'px',
                border: `${tokens.borderWidth}px ${tokens.borderStyle} hsl(220, ${tokens.darkSaturation * 0.3}%, ${15 + tokens.darkElevation}%)`,
              }">
              <div class="dp-dark-card-title" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.2}%, 88%)` }">Элевация +1</div>
              <div class="dp-dark-card-text" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.15}%, 62%)` }">Вложенная поверхность с большей яркостью.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignPanelHelpers } from '~/composables/useDesignPanelHelpers'

defineProps<{ activeTab: string }>()

const { tokens, set, onRange, onFloat, pct } = useDesignPanelHelpers()

const surfaceStyle = computed(() => {
  const t = tokens.value
  return {
    backdropFilter: `blur(${t.glassBlur}px) saturate(${t.glassSaturation}%)`,
    WebkitBackdropFilter: `blur(${t.glassBlur}px) saturate(${t.glassSaturation}%)`,
    background: 'var(--glass-bg)',
    border: `${t.borderWidth}px ${t.borderStyle} var(--glass-border)`,
    boxShadow: `0 ${t.shadowOffsetY}px ${t.shadowBlurRadius}px ${t.shadowSpread}px rgba(0,0,0,${t.shadowOpacity})`,
    borderRadius: `${t.cardRadius}px`,
  }
})
</script>
