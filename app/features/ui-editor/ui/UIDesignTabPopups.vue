<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Выпадающие панели</div>
      <div class="dp-field">
        <label class="dp-label">размытие дропдауна <span class="dp-val">{{ tokens.dropdownBlur }}px</span></label>
        <input type="range" min="0" max="40" step="1" :value="tokens.dropdownBlur" class="dp-range" @input="onRange('dropdownBlur', $event)">
        <div class="dp-field-hint">Применяется к автодополнению адреса, выпадающим спискам</div>
      </div>
      <div class="dp-col-label" style="margin-top:10px">Модальные окна</div>
      <div class="dp-field">
        <label class="dp-label">затемнение оверлея <span class="dp-val">{{ pct(tokens.modalOverlayOpacity) }}</span></label>
        <input type="range" min="0" max="0.9" step="0.02" :value="tokens.modalOverlayOpacity" class="dp-range" @input="onFloat('modalOverlayOpacity', $event)">
        <div class="dp-field-hint">Прозрачность тёмной подложки под модальным окном</div>
      </div>
      <div class="dp-col-label" style="margin-top:10px">Скругление</div>
      <div class="dp-field">
        <label class="dp-label">радиус модального <span class="dp-val">{{ tokens.modalRadius }}px</span></label>
        <input type="range" min="0" max="28" step="1" :value="tokens.modalRadius" class="dp-range" @input="onRange('modalRadius', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью дропдауна</div>
      <div class="dp-live-preview" style="margin-top:0; padding:0; overflow:hidden; border-radius:var(--card-radius,14px);">
        <div :style="{
          background: 'var(--glass-bg)',
          backdropFilter: `blur(${tokens.dropdownBlur}px) saturate(var(--glass-saturation,145%))`,
          WebkitBackdropFilter: `blur(${tokens.dropdownBlur}px) saturate(var(--glass-saturation,145%))`,
          border: '1px solid color-mix(in srgb, var(--glass-text) 10%, transparent)',
          borderRadius: 'var(--card-radius,14px)',
          padding: '4px',
          boxShadow: 'var(--ds-shadow-lg)'
        }">
          <div
            v-for="opt in ['Первый вариант', 'Второй вариант', 'Третий вариант']"
            :key="opt"
            :style="{
              padding: '7px 12px',
              borderRadius: 'calc(var(--card-radius,14px) - 4px)',
              fontSize: 'var(--ds-text-sm, .8rem)',
              fontFamily: 'inherit',
              color: 'var(--glass-text)',
              cursor: 'pointer'
            }"
          >{{ opt }}</div>
        </div>
      </div>
      <div class="dp-col-label" style="margin-top:12px">Превью оверлея</div>
      <div :style="{
        height: '44px',
        borderRadius: 'var(--card-radius,14px)',
        background: `rgba(0,0,0,${tokens.modalOverlayOpacity})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--ds-text-xs,.7rem)',
        color: 'rgba(255,255,255,.6)',
        fontFamily: 'inherit'
      }">затемнение {{ pct(tokens.modalOverlayOpacity) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onRange, onFloat } = useDesignTokenControls()
</script>
