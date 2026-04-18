<template>
  <div>
    <!-- ── Fields ── -->
    <div class="de-fields-divider">
      <span>поля документа</span>
    </div>
    <div class="de-fields-grid">
      <div
        v-for="field in selectedTpl?.fields || []"
        :key="field.key"
        class="de-field"
      >
        <label class="de-field-label">
          {{ field.label }}
          <span
            v-if="fieldAutoFilled[field.key]"
            class="de-field-auto"
            title="заполнено из данных"
          >⚡</span>
        </label>
        <textarea
          v-if="field.multiline"
          v-model="fieldValues[field.key]"
          rows="3"
          class="glass-input u-ta"
          :placeholder="field.placeholder || ''"
        />
        <GlassInput
          v-else
          v-model="fieldValues[field.key]"
          :placeholder="field.placeholder || ''"
        />
      </div>
    </div>

    <!-- ── Переменные проекта ── -->
    <div class="de-vars-section">
      <button
        class="de-vars-toggle"
        @click="emit('update:varsOpen', !varsOpen)"
      >
        <span class="de-vars-icon">{{ '{' }}{{ '{' }}</span> переменные проекта
        <span class="de-vars-hint">(клик → вставить в шаблон)</span>
        <span class="de-vars-arrow">{{ varsOpen ? '▴' : '▾' }}</span>
      </button>
      <div
        v-if="varsOpen"
        class="de-vars-grid"
      >
        <div
          v-for="v in allVars"
          :key="v.key"
          class="de-var-row"
          :class="{ 'de-var-row--empty': !v.value }"
          :title="'Клик → вставить \u0432 редактор'"
          @click="emit('insert-var', v.key)"
        >
          <code class="de-var-key">{{ '{' }}{{ '{' }}{{ v.key }}{{ '}' }}{{ '}' }}</code>
          <span class="de-var-val">{{ v.value || '— не заполнено' }}</span>
        </div>
      </div>
    </div>

    <!-- ── Actions ── -->
    <div class="de-actions">
      <GlassButton
        variant="secondary"
        density="compact"
        @click="emit('go-back')"
      >
        ← шаблоны
      </GlassButton>
      <button
        class="a-btn-ai"
        title="Перейти в редактор и сразу запустить AI-генерацию"
        @click="emit('go-generate')"
      >
        🤖 сгенерировать →
      </button>
      <GlassButton
        variant="primary"
        @click="emit('go-forward')"
      >
        редактор →
      </GlassButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  selectedTpl: any | null
  /** Reactive object — inner fields are mutated in-place via v-model */
  fieldValues: Record<string, string>
  fieldAutoFilled: Record<string, boolean>
  varsOpen: boolean
  allVars: Array<{ key: string; value: string }>
}>()

const emit = defineEmits<{
  'update:varsOpen': [value: boolean]
  'go-back': []
  'go-forward': []
  'go-generate': []
  'insert-var': [key: string]
}>()
// fieldValues / fieldAutoFilled are accessed reactively as props in the template.
// Inner field mutations via v-model are intentional — parent owns the reactive object.
</script>

<style scoped>
/* ── Fields ── */
.de-fields-divider {
  display: flex; align-items: center; gap: 8px; margin-top: 4px;
}
.de-fields-divider::before,
.de-fields-divider::after {
  content: ''; flex: 1; height: 1px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.de-fields-divider span {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .3; font-weight: 600;
}
.de-fields-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
@media (max-width: 600px) { .de-fields-grid { grid-template-columns: 1fr; } }
.de-field { display: flex; flex-direction: column; gap: 3px; }
.de-field-label {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--glass-text); opacity: .4; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}
.de-field-auto { color: var(--ds-accent); font-size: .65rem; opacity: 1; }

/* ── Vars section (step 2 fields panel) ── */
.de-vars-section {
  border: 1px solid color-mix(in srgb, var(--ds-accent) 18%, transparent);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
}
.de-vars-toggle {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--ds-accent) 6%, transparent);
  border: none; cursor: pointer;
  font-size: var(--ds-text-xs, .7rem); color: var(--glass-text);
  text-align: left; transition: background .15s;
}
.de-vars-toggle:hover { background: color-mix(in srgb, var(--ds-accent) 12%, transparent); }
.de-vars-icon { font-family: monospace; opacity: .7; }
.de-vars-hint { opacity: .5; font-size: .65rem; }
.de-vars-arrow { margin-left: auto; opacity: .6; }
.de-vars-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 2px; padding: 4px 6px 6px; max-height: 260px; overflow-y: auto;
}
.de-var-row {
  display: flex; align-items: baseline; gap: 6px;
  padding: 4px 8px; border-radius: 5px;
  cursor: pointer; transition: background .12s; font-size: .7rem;
}
.de-var-row:hover { background: color-mix(in srgb, var(--ds-accent) 14%, transparent); }
.de-var-row--empty { opacity: .45; }
.de-var-key {
  font-family: monospace; font-size: .68rem;
  color: color-mix(in srgb, var(--ds-accent) 85%, white);
  white-space: nowrap; flex-shrink: 0;
}
.de-var-val {
  color: var(--glass-text); opacity: .75;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── Actions ── */
.de-actions {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}
</style>
