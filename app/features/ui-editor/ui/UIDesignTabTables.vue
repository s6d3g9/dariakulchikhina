<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Шапка и строки</div>
      <div class="dp-field">
        <label class="dp-label">фон заголовка <span class="dp-val">{{ pct(tokens.tableHeaderOpacity) }}</span></label>
        <input type="range" min="0" max="0.25" step="0.005" :value="tokens.tableHeaderOpacity" class="dp-range" @input="onFloat('tableHeaderOpacity', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">фон при наведении <span class="dp-val">{{ pct(tokens.tableRowHoverOpacity) }}</span></label>
        <input type="range" min="0" max="0.15" step="0.005" :value="tokens.tableRowHoverOpacity" class="dp-range" @input="onFloat('tableRowHoverOpacity', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">обводка ячеек <span class="dp-val">{{ pct(tokens.tableBorderOpacity) }}</span></label>
        <input type="range" min="0" max="0.4" step="0.01" :value="tokens.tableBorderOpacity" class="dp-range" @input="onFloat('tableBorderOpacity', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-live-preview" style="margin-top:0; padding:0; overflow:hidden; border-radius:var(--card-radius,14px);">
        <table style="width:100%; border-collapse:collapse; font-size:.68rem; font-family:inherit;">
          <thead>
            <tr>
              <th
                v-for="h in ['Название', 'Статус', 'Дата']"
                :key="h"
                :style="{
                  padding: '6px 10px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--glass-text)',
                  background: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableHeaderOpacity * 100)}%, transparent)`,
                  borderBottom: `1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableBorderOpacity * 100)}%, transparent)`
                }"
              >{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in [['Проект A', 'В работе', '01.03'], ['Проект B', 'Готово', '15.02'], ['Проект C', 'Ожидание', '...']]"
              :key="i"
              :style="{
                background: i % 2 === 0 ? `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableRowHoverOpacity * 100)}%, transparent)` : 'transparent'
              }"
            >
              <td
                v-for="cell in row"
                :key="cell"
                :style="{
                  padding: '6px 10px',
                  color: 'var(--glass-text)',
                  borderBottom: `1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableBorderOpacity * 100)}%, transparent)`
                }"
              >{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onFloat } = useDesignTokenControls()
</script>
