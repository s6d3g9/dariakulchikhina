<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Параметры</div>
      <div class="dp-field">
        <label class="dp-label">длительность <span class="dp-val">{{ tokens.animDuration }}ms</span></label>
        <input type="range" min="0" max="600" step="10" :value="tokens.animDuration" class="dp-range" @input="onRange('animDuration', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">easing</label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="e in EASING_OPTIONS"
              :key="`anim-easing-${e.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': String(tokens.animEasing) === String(e.id) }"
              @click="set('animEasing', e.id)"
            >{{ e.label }}</button>
          </div>
        </div>
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-live-preview" style="margin-top:0">
        <div class="dp-anim-demo">
          <div
            class="dp-anim-ball"
            :style="{
              transitionDuration: tokens.animDuration + 'ms',
              transitionTimingFunction: tokens.animEasing
            }"
            :class="{ 'dp-anim-ball--moved': animPlaying }"
          />
          <button type="button" class="dp-sm-btn" @click="playAnim">▶ запуск</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EASING_OPTIONS } from '~/entities/design-system/model/useDesignSystem'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, set, onRange } = useDesignTokenControls()

const animPlaying = ref(false)

function playAnim() {
  animPlaying.value = false
  requestAnimationFrame(() => { animPlaying.value = true })
  setTimeout(() => { animPlaying.value = false }, tokens.value.animDuration + 400)
}
</script>
