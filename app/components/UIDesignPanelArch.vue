<template>
  <div class="dp-page dp-page-stack">
    <div class="dp-arch-layout">
      <div class="dp-arch-col">
        <div class="dp-col-label">Пространство</div>

        <div class="dp-arch-setting">
          <label class="dp-label">плотность <span class="dp-val">{{ tokens.archDensity }}</span></label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archDensities" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': tokens.archDensity === opt.id }"
              @click="set('archDensity', opt.id)"
            >{{ opt.label }}</button>
          </div>
          <div class="dp-field-hint">отступы секций и расстояние между блоками</div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">регистр заголовков</label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archHeadingCases" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': tokens.archHeadingCase === opt.id }"
              @click="set('archHeadingCase', opt.id)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">разделители секций</label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archDividers" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': tokens.archDivider === opt.id }"
              @click="set('archDivider', opt.id)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">стиль секций страницы</label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archSectionStyles" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': tokens.archSectionStyle === opt.id }"
              @click="set('archSectionStyle', opt.id)"
            >{{ opt.label }}</button>
          </div>
        </div>
      </div>

      <div class="dp-arch-col">
        <div class="dp-col-label">Каркас</div>

        <div class="dp-arch-setting">
          <label class="dp-label">стиль навигации <span class="dp-val">{{ tokens.archNavStyle || 'full' }}</span></label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archNavStyles" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': (tokens.archNavStyle || 'full') === opt.id }"
              @click="set('archNavStyle', opt.id)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">хром карточек <span class="dp-val">{{ tokens.archCardChrome || 'visible' }}</span></label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archCardChromes" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': (tokens.archCardChrome || 'visible') === opt.id }"
              @click="set('archCardChrome', opt.id)"
            >{{ opt.label }}</button>
          </div>
          <div class="dp-field-hint">видимый, тонкий или призрачный контур карточек</div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">масштаб героя <span class="dp-val">{{ tokens.archHeroScale || 'normal' }}</span></label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archHeroScales" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': (tokens.archHeroScale || 'normal') === opt.id }"
              @click="set('archHeroScale', opt.id)"
            >{{ opt.label }}</button>
          </div>
        </div>
      </div>

      <div class="dp-arch-col">
        <div class="dp-col-label">Эффекты</div>

        <div class="dp-arch-setting">
          <label class="dp-label">появление контента <span class="dp-val">{{ tokens.archContentReveal || 'none' }}</span></label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archContentReveals" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': (tokens.archContentReveal || 'none') === opt.id }"
              @click="set('archContentReveal', opt.id)"
            >{{ opt.label }}</button>
          </div>
          <div class="dp-field-hint">способ появления блоков и секций</div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">появление текста <span class="dp-val">{{ tokens.archTextReveal || 'none' }}</span></label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archTextReveals" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': (tokens.archTextReveal || 'none') === opt.id }"
              @click="set('archTextReveal', opt.id)"
            >{{ opt.label }}</button>
          </div>
          <div class="dp-field-hint">анимация заголовков и текстовых связок</div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">эффект наведения на карточку</label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in cardHoverAnims" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': tokens.cardHoverAnim === opt.id }"
              @click="set('cardHoverAnim', opt.id)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">анимация ссылок</label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archLinkAnims" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': tokens.archLinkAnim === opt.id }"
              @click="set('archLinkAnim', opt.id)"
            >{{ opt.label }}</button>
          </div>
        </div>
      </div>

      <div class="dp-arch-col">
        <div class="dp-col-label">Переходы</div>

        <div class="dp-arch-setting">
          <label class="dp-label">пресеты переходов</label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="preset in archTransitionPresets"
              :key="`arch-transition-${preset.id}`"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': tokens.archPageEnter === preset.tokens.archPageEnter && (tokens.pageTransitDuration ?? 280) === preset.tokens.pageTransitDuration }"
              @click="applyArchitectureTransitionPreset(preset.id)"
            >{{ preset.label }}</button>
          </div>
          <div class="dp-field-hint">готовые пары эффекта входа и длительности</div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">переход между страницами</label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in archPageEnters" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': tokens.archPageEnter === opt.id }"
              @click="set('archPageEnter', opt.id)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="dp-arch-setting">
          <label class="dp-label">режим просмотра страницы <span class="dp-label-val">{{ tokens.contentViewMode || 'scroll' }}</span></label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in contentViewModes" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': (tokens.contentViewMode || 'scroll') === opt.id }"
              @click="set('contentViewMode', opt.id)"
            >{{ opt.label }}</button>
          </div>
          <div class="dp-field-hint">режим движения страницы и способ листания контента</div>
        </div>

        <div v-if="(tokens.contentViewMode || 'scroll') === 'wipe'" class="dp-arch-setting">
          <label class="dp-label">переход между карточками <span class="dp-val">{{ tokens.wipeTransition ?? 'slide' }}</span></label>
          <div class="dp-arch-chips dp-arch-chips--matrix">
            <button
              v-for="opt in wipeTransitions" :key="opt.id"
              type="button"
              class="dp-arch-chip"
              :class="{ 'dp-arch-chip--active': (tokens.wipeTransition || 'slide') === opt.id }"
              @click="set('wipeTransition', opt.id)"
            >{{ opt.label }}</button>
          </div>
          <div class="dp-field-hint">вариант анимации перелистывания карточек внутри wipe</div>
        </div>
      </div>
    </div>

    <div class="dp-arch-detail-grid">
      <div class="dp-arch-detail-card">
        <div class="dp-col-label">Точная настройка</div>

        <div class="dp-field dp-field--mt">
          <label class="dp-label">межбуквенный трекинг заголовков <span class="dp-val">{{ ((tokens.archHeadingTracking ?? -1) * 0.01).toFixed(2) }}em</span></label>
          <input type="range" min="-5" max="30" step="1" :value="tokens.archHeadingTracking ?? -1" class="dp-range" @input="onRange('archHeadingTracking', $event)">
          <div class="dp-field-hint">отрицательный — сжатие, высокий — editorial / архитектурный стиль</div>
        </div>

        <div class="dp-field">
          <label class="dp-label">вертикальный ритм <span class="dp-val">×{{ (tokens.archVerticalRhythm ?? 1).toFixed(1) }}</span></label>
          <input type="range" min="0.3" max="3.0" step="0.1" :value="tokens.archVerticalRhythm ?? 1" class="dp-range" @input="onRange('archVerticalRhythm', $event)">
          <div class="dp-field-hint">0.3 — сжато, 3.0 — кинематографичный ритм секций</div>
        </div>

        <div class="dp-field">
          <label class="dp-label">длительность перехода <span class="dp-label-val">{{ formatTransitionDuration(tokens.pageTransitDuration ?? 280) }}</span></label>
          <input
            type="range" min="0" max="10000" step="50"
            :value="tokens.pageTransitDuration ?? 280"
            @input="set('pageTransitDuration', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>0 сек</span><span>10 сек</span></div>
        </div>
      </div>

      <div v-if="(tokens.contentViewMode || 'scroll') === 'wipe'" class="dp-arch-detail-card">
        <div class="dp-col-label">Геометрия wipe</div>

        <div class="dp-field dp-field--mt">
          <label class="dp-label">отступ сверху <span class="dp-label-val">{{ tokens.wipeTopInset ?? 48 }}px</span></label>
          <input
            type="range" min="12" max="120" step="2"
            :value="tokens.wipeTopInset ?? 48"
            @input="set('wipeTopInset', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>12</span><span>120</span></div>
        </div>

        <div class="dp-field">
          <label class="dp-label">отступ снизу <span class="dp-label-val">{{ tokens.wipeBottomInset ?? 106 }}px</span></label>
          <input
            type="range" min="40" max="200" step="2"
            :value="tokens.wipeBottomInset ?? 106"
            @input="set('wipeBottomInset', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>40</span><span>200</span></div>
        </div>

        <div class="dp-field">
          <label class="dp-label">боковые поля <span class="dp-label-val">{{ tokens.wipeSideMargin ?? 20 }}px</span></label>
          <input
            type="range" min="0" max="80" step="2"
            :value="tokens.wipeSideMargin ?? 20"
            @input="set('wipeSideMargin', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>0</span><span>80</span></div>
        </div>

        <div class="dp-field">
          <label class="dp-label">отступ контента <span class="dp-label-val">{{ tokens.wipeContentPadding ?? 20 }}px</span></label>
          <input
            type="range" min="0" max="48" step="2"
            :value="tokens.wipeContentPadding ?? 20"
            @input="set('wipeContentPadding', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>0</span><span>48</span></div>
        </div>
      </div>

      <div v-if="(tokens.contentViewMode || 'scroll') === 'wipe'" class="dp-arch-detail-card">
        <div class="dp-col-label">Карточка wipe</div>

        <div class="dp-field dp-field--mt">
          <label class="dp-label">радиус карточки <span class="dp-label-val">{{ tokens.wipeCardRadius ?? 14 }}px</span></label>
          <input
            type="range" min="0" max="32" step="1"
            :value="tokens.wipeCardRadius ?? 14"
            @input="set('wipeCardRadius', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>0</span><span>32</span></div>
        </div>

        <div class="dp-field">
          <label class="dp-label">рамка карточки <span class="dp-label-val">{{ tokens.wipeCardBorder ?? 1 }}px</span></label>
          <input
            type="range" min="0" max="4" step="0.5"
            :value="tokens.wipeCardBorder ?? 1"
            @input="set('wipeCardBorder', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>0</span><span>4</span></div>
        </div>

        <div class="dp-field">
          <label class="dp-label">тень карточки <span class="dp-label-val">{{ Math.round((tokens.wipeCardShadow ?? 0.4) * 100) }}%</span></label>
          <input
            type="range" min="0" max="1" step="0.05"
            :value="tokens.wipeCardShadow ?? 0.4"
            @input="set('wipeCardShadow', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>0%</span><span>100%</span></div>
        </div>

        <div class="dp-field">
          <label class="dp-label">заполнение карточки <span class="dp-label-val">{{ Math.round((tokens.wipePageFill ?? 0.85) * 100) }}%</span></label>
          <input
            type="range" min="0.3" max="1" step="0.05"
            :value="tokens.wipePageFill ?? 0.85"
            @input="set('wipePageFill', Number(($event.target as HTMLInputElement).value))"
            class="dp-range"
          />
          <div class="dp-range-hints"><span>30%</span><span>100%</span></div>
          <div class="dp-field-hint">меньше — меньше контента на карточке, больше карточек</div>
        </div>
      </div>

      <div class="dp-arch-detail-card">
        <div class="dp-col-label">Превью трекинга</div>
        <div class="dp-field dp-field--mt">
          <div class="dp-arch-preview-heading" :style="{ letterSpacing: ((tokens.archHeadingTracking ?? -1) * 0.01).toFixed(3) + 'em', textTransform: tokens.archHeadingCase === 'none' ? undefined : tokens.archHeadingCase }">
            Архитектура пространства
          </div>
          <div class="dp-arch-preview-heading dp-arch-preview-heading--sm" :style="{ letterSpacing: ((tokens.archHeadingTracking ?? -1) * 0.01).toFixed(3) + 'em', textTransform: tokens.archHeadingCase === 'none' ? undefined : tokens.archHeadingCase }">
            Design&nbsp;Architecture
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignSystem, type DesignTokens } from '~/composables/useDesignSystem'
import { useDesignPanelHelpers } from '~/composables/useDesignPanelHelpers'
import {
  archDensities, archHeadingCases, archDividers, archPageEnters, archLinkAnims,
  contentViewModes, wipeTransitions, archSectionStyles, archNavStyles,
  archCardChromes, archHeroScales, archContentReveals, archTextReveals,
  cardHoverAnims, archTransitionPresets,
} from '~~/shared/constants/design-panel-options'

const { tokens, set, onRange } = useDesignPanelHelpers()

function applyArchitectureTransitionPreset(presetId: (typeof archTransitionPresets)[number]['id']) {
  const preset = archTransitionPresets.find((item) => item.id === presetId)
  if (!preset) return
  for (const [key, value] of Object.entries(preset.tokens) as Array<[keyof typeof preset.tokens, (typeof preset.tokens)[keyof typeof preset.tokens]]>) {
    set(key as keyof DesignTokens, value as DesignTokens[keyof DesignTokens])
  }
}

function formatTransitionDuration(value: number) {
  if (value <= 0) return '0 сек'
  if (value < 1000) return `${value} мс`
  const seconds = value / 1000
  return `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)} сек`
}
</script>
