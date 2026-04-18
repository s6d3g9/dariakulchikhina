<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Пин-бары и статус-метки</div>
      <div class="dp-field">
        <label class="dp-label">насыщенность фона <span class="dp-val">{{ pct(tokens.statusBgOpacity) }}</span></label>
        <input type="range" min="0" max="0.5" step="0.005" :value="tokens.statusBgOpacity" class="dp-range" @input="onFloat('statusBgOpacity', $event)">
        <div class="dp-field-hint">Управляет яркостью фона всех статусных меток (выполнено, в работе, ожидание, отмена)</div>
      </div>
      <div class="dp-field">
        <label class="dp-label">форма <span class="dp-val">{{ tokens.statusPillRadius === 999 ? '∞ (пилюля)' : tokens.statusPillRadius + 'px' }}</span></label>
        <input type="range" min="0" max="999" step="1" :value="tokens.statusPillRadius" class="dp-range" @input="onRange('statusPillRadius', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью статусов</div>
      <div class="dp-live-preview" style="margin-top:0; flex-wrap:wrap; gap:6px; align-content:flex-start">
        <span
          v-for="s in statusPreviews"
          :key="s.label"
          :style="{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: (tokens.statusPillRadius > 99 ? 999 : tokens.statusPillRadius) + 'px',
            background: s.bg,
            padding: `${tokens.chipPaddingV}px ${tokens.chipPaddingH}px`,
            fontSize: 'var(--ds-text-xs, .68rem)',
            fontWeight: '500',
            color: s.color,
            fontFamily: 'inherit'
          }"
        >{{ s.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onRange, onFloat } = useDesignTokenControls()

const statusPreviews = [
  { label: 'ожидание', color: 'var(--glass-text)', bg: 'var(--rm-bg-pending)' },
  { label: 'в работе', color: 'var(--ds-warning)', bg: 'var(--rm-bg-progress)' },
  { label: 'выполнено', color: 'var(--ds-success)', bg: 'var(--rm-bg-done)' },
  { label: 'пропущено', color: 'var(--glass-text)', bg: 'var(--rm-bg-skipped)' },
  { label: 'запланировано', color: 'var(--ds-accent)', bg: 'var(--ws-bg-planned)' },
  { label: 'на паузе', color: 'var(--ds-accent)', bg: 'var(--ws-bg-paused)' },
  { label: 'отмена', color: 'var(--ds-error)', bg: 'var(--ws-bg-cancelled)' },
] as const
</script>
