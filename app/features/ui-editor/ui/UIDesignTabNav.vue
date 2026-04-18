<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Пункты меню</div>
      <div class="dp-field">
        <label class="dp-label">скругление пункта <span class="dp-val">{{ tokens.navItemRadius }}px</span></label>
        <input type="range" min="0" max="24" step="1" :value="tokens.navItemRadius" class="dp-range" @input="onRange('navItemRadius', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">отступ гор. <span class="dp-val">{{ tokens.navItemPaddingH }}px</span></label>
        <input type="range" min="4" max="28" step="1" :value="tokens.navItemPaddingH" class="dp-range" @input="onRange('navItemPaddingH', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">отступ верт. <span class="dp-val">{{ tokens.navItemPaddingV }}px</span></label>
        <input type="range" min="2" max="18" step="1" :value="tokens.navItemPaddingV" class="dp-range" @input="onRange('navItemPaddingV', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">ширина сайдбара <span class="dp-val">{{ tokens.sidebarWidth }}px</span></label>
        <input type="range" min="180" max="380" step="5" :value="tokens.sidebarWidth" class="dp-range" @input="onRange('sidebarWidth', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Эффекты сайдбара</div>
      <div class="dp-field">
        <label class="dp-label">переход между меню</label>
        <div class="dp-arch-chips dp-arch-chips--wrap">
          <button
            v-for="opt in archNavTransitions"
            :key="`nav-fx-${opt.id}`"
            type="button"
            class="dp-arch-chip"
            :class="{ 'dp-arch-chip--active': (tokens.archNavTransition || 'slide') === opt.id }"
            @click="set('archNavTransition', opt.id)"
          >{{ opt.label }}</button>
        </div>
        <div class="dp-field-hint">Отдельное управление drill-down анимацией сайдбара без влияния на переходы страниц.</div>
      </div>
      <div v-if="(tokens.archNavTransition || 'slide') !== 'none'" class="dp-field">
        <label class="dp-label">скорость эффекта <span class="dp-label-val">{{ tokens.navTransitDuration ?? 220 }} мс</span></label>
        <input
          type="range" min="80" max="700" step="10"
          :value="tokens.navTransitDuration ?? 220"
          class="dp-range"
          @input="set('navTransitDuration', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div v-if="(tokens.archNavTransition || 'slide') !== 'none' && (tokens.archNavTransition || 'slide') !== 'fade'" class="dp-field">
        <label class="dp-label">дистанция смещения <span class="dp-label-val">{{ tokens.navTransitDistance ?? 18 }} px</span></label>
        <input
          type="range" min="0" max="56" step="2"
          :value="tokens.navTransitDistance ?? 18"
          class="dp-range"
          @input="set('navTransitDistance', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div v-if="(tokens.archNavTransition || 'slide') !== 'none'" class="dp-field">
        <label class="dp-label">каскад пунктов <span class="dp-label-val">{{ tokens.navItemStagger ?? 12 }} мс</span></label>
        <input
          type="range" min="0" max="60" step="2"
          :value="tokens.navItemStagger ?? 12"
          class="dp-range"
          @input="set('navItemStagger', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-live-preview" style="margin-top:0; flex-direction:column; gap:2px; padding:8px; border-radius:var(--card-radius,14px); background:color-mix(in srgb,var(--glass-bg) 80%,transparent)">
        <div
          v-for="(item, i) in ['Обзор', 'Клиенты', 'Проекты', 'Документы']"
          :key="item"
          :style="{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: tokens.navItemPaddingV + 'px ' + tokens.navItemPaddingH + 'px',
            borderRadius: tokens.navItemRadius + 'px',
            background: i === 0 ? 'color-mix(in srgb, var(--ds-accent-light, var(--glass-text)) 25%, var(--glass-bg) 75%)' : 'transparent',
            fontWeight: i === 0 ? '600' : '400',
            opacity: i === 0 ? '1' : '0.65',
            fontSize: 'var(--ds-text-sm, .8rem)',
            fontFamily: 'inherit',
            color: 'var(--glass-text)',
            cursor: 'pointer'
          }"
        >{{ item }}</div>
      </div>
      <div class="dp-arch-nav-preview" :class="`dp-arch-nav-preview--${tokens.archNavTransition || 'slide'}`" style="margin-top:12px">
        <div
          v-for="(item, index) in menuPreviewItems.slice(0, 4)"
          :key="`nav-preview-${item}`"
          class="dp-arch-nav-preview-item"
          :style="{ animationDelay: `${index * (tokens.navItemStagger ?? 12)}ms` }"
        >
          <span>{{ item }}</span>
          <span v-if="index === 2">›</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, set, onRange } = useDesignTokenControls()

const archNavTransitions = [
  { id: 'none' as const, label: 'нет' },
  { id: 'fade' as const, label: 'плавно' },
  { id: 'slide' as const, label: 'слайд' },
  { id: 'push' as const, label: 'вытеснение' },
  { id: 'stack' as const, label: 'слои' },
  { id: 'blur' as const, label: 'размытие' },
]

const menuPreviewItems = ['обзор', 'планировка', 'материалы', 'подрядчики', 'документы']
</script>
