<script setup lang="ts">
import type { MessengerBalancingPreset } from '../../../entities/balancing/model/useMessengerBalancing'

const balancing = useMessengerBalancing()

const editTarget = ref<MessengerBalancingPreset | null>(null)
const editDraft = reactive({
  name: '',
  description: '',
  model: 'sonnet' as 'haiku' | 'sonnet' | 'opus',
  agentStyle: 'mixed' as 'subagent' | 'tmux-session' | 'mixed',
  useWorktree: true,
  maxParallel: 3,
  whenToUse: '',
})
const dialogOpen = ref(false)

onMounted(async () => {
  await balancing.refresh()
})

function openEdit(preset: MessengerBalancingPreset) {
  editTarget.value = preset
  editDraft.name = preset.name
  editDraft.description = preset.description
  editDraft.model = preset.model
  editDraft.agentStyle = preset.agentStyle
  editDraft.useWorktree = preset.useWorktree
  editDraft.maxParallel = preset.maxParallel
  editDraft.whenToUse = preset.whenToUse
  dialogOpen.value = true
}

async function submitEdit() {
  if (!editTarget.value) return
  await balancing.updatePreset(editTarget.value.id, {
    name: editDraft.name.trim() || editTarget.value.name,
    description: editDraft.description.trim(),
    model: editDraft.model,
    agentStyle: editDraft.agentStyle,
    useWorktree: editDraft.useWorktree,
    maxParallel: editDraft.maxParallel,
    whenToUse: editDraft.whenToUse.trim(),
  })
  dialogOpen.value = false
}

async function selectPreset(presetId: string) {
  await balancing.setActivePreset(presetId)
}

async function switchToAuto() {
  await balancing.setActivePreset(null)
}

async function handleReset() {
  await balancing.reset()
}

function modelColor(m: string) {
  if (m === 'opus') return 'primary'
  if (m === 'sonnet') return 'secondary'
  if (m === 'haiku') return 'info'
  return 'surface-variant'
}

function styleLabel(s: string) {
  if (s === 'subagent') return 'subagent'
  if (s === 'tmux-session') return 'tmux'
  return 'mixed'
}
</script>

<template>
  <div class="balancing-tab">
    <div class="balancing-tab__header">
      <div class="balancing-tab__title">
        <VIcon :size="18" class="mr-1">mdi-scale-balance</VIcon>
        <span>Балансировка нагрузки</span>
      </div>
      <VBtn
        size="small"
        variant="text"
        prepend-icon="mdi-restore"
        :disabled="balancing.saving.value"
        @click="handleReset"
      >
        Сбросить
      </VBtn>
    </div>

    <p class="balancing-tab__hint">
      Перед каждым запуском агента Claude читает этот конфиг.
      В режиме <strong>авто</strong> модель сама выбирает подходящий пресет
      исходя из задачи. В режиме <strong>ручном</strong> всегда используется
      выбранный пресет.
    </p>

    <div v-if="balancing.pending.value && !balancing.state.value" class="balancing-tab__loading">
      <VProgressCircular indeterminate size="28" />
    </div>

    <div v-else-if="balancing.error.value" class="balancing-tab__error">
      <VIcon color="error">mdi-alert-circle-outline</VIcon>
      <span>{{ balancing.error.value }}</span>
    </div>

    <template v-else-if="balancing.state.value">
      <!-- Auto / Manual switch -->
      <div class="balancing-tab__mode">
        <button
          type="button"
          class="balancing-mode-btn"
          :class="{ 'balancing-mode-btn--active': balancing.mode.value === 'auto' }"
          :disabled="balancing.saving.value"
          @click="switchToAuto"
        >
          <VIcon :size="16" class="mr-1">mdi-auto-fix</VIcon>
          <span>Авто</span>
          <span class="balancing-mode-btn__hint">Claude выбирает пресет сам</span>
        </button>
        <div
          class="balancing-mode-btn"
          :class="{ 'balancing-mode-btn--active': balancing.mode.value === 'manual' }"
        >
          <VIcon :size="16" class="mr-1">mdi-hand-pointing-up</VIcon>
          <span>Ручной</span>
          <span class="balancing-mode-btn__hint">
            {{ balancing.activePreset.value
              ? `Активен: ${balancing.activePreset.value.name}`
              : 'Выберите пресет ниже' }}
          </span>
        </div>
      </div>

      <!-- Preset list -->
      <div class="balancing-tab__presets">
        <div
          v-for="preset in balancing.state.value.presets"
          :key="preset.id"
          class="balancing-preset"
          :class="{ 'balancing-preset--active': balancing.state.value.activePresetId === preset.id }"
        >
          <div class="balancing-preset__head">
            <button
              type="button"
              class="balancing-preset__radio"
              :aria-pressed="balancing.state.value.activePresetId === preset.id"
              :disabled="balancing.saving.value"
              :title="balancing.state.value.activePresetId === preset.id ? 'Активен' : 'Выбрать пресет'"
              @click="selectPreset(preset.id)"
            >
              <VIcon :size="20">
                {{ balancing.state.value.activePresetId === preset.id
                  ? 'mdi-radiobox-marked'
                  : 'mdi-radiobox-blank' }}
              </VIcon>
            </button>
            <div class="balancing-preset__title-wrap">
              <div class="balancing-preset__title">{{ preset.name }}</div>
              <div class="balancing-preset__id">#{{ preset.id }}</div>
            </div>
            <VBtn
              size="x-small"
              variant="text"
              icon="mdi-pencil-outline"
              title="Редактировать пресет"
              @click="openEdit(preset)"
            />
          </div>

          <div v-if="preset.description" class="balancing-preset__desc">{{ preset.description }}</div>

          <div class="balancing-preset__chips">
            <VChip size="x-small" :color="modelColor(preset.model)" label>
              {{ preset.model }}
            </VChip>
            <VChip size="x-small" color="surface-variant" variant="outlined" label>
              {{ styleLabel(preset.agentStyle) }}
            </VChip>
            <VChip
              size="x-small"
              :color="preset.useWorktree ? 'secondary' : 'surface-variant'"
              :variant="preset.useWorktree ? 'tonal' : 'outlined'"
              label
            >
              worktree: {{ preset.useWorktree ? 'да' : 'нет' }}
            </VChip>
            <VChip size="x-small" color="info" variant="outlined" label>
              ≤ {{ preset.maxParallel }} параллельно
            </VChip>
          </div>

          <div v-if="preset.whenToUse" class="balancing-preset__when">
            <strong>Когда:</strong> {{ preset.whenToUse }}
          </div>
        </div>
      </div>

      <div v-if="balancing.configPath.value" class="balancing-tab__path">
        <VIcon :size="12">mdi-file-cog-outline</VIcon>
        <code>{{ balancing.configPath.value }}</code>
      </div>
    </template>

    <!-- Edit dialog -->
    <VDialog v-model="dialogOpen" max-width="520">
      <VCard>
        <VCardTitle>Редактировать пресет</VCardTitle>
        <VCardText>
          <VTextField v-model="editDraft.name" label="Название" density="compact" class="mb-3" />
          <VTextarea
            v-model="editDraft.description"
            label="Описание"
            density="compact"
            rows="2"
            auto-grow
            class="mb-3"
          />
          <VSelect
            v-model="editDraft.model"
            :items="balancing.modelOptions"
            label="Модель"
            density="compact"
            class="mb-3"
          />
          <VSelect
            v-model="editDraft.agentStyle"
            :items="balancing.agentStyleOptions"
            label="Стиль агента"
            density="compact"
            class="mb-3"
          />
          <VSwitch
            v-model="editDraft.useWorktree"
            label="Использовать git worktree"
            density="compact"
            color="primary"
            class="mb-2"
          />
          <VSlider
            v-model="editDraft.maxParallel"
            :min="1"
            :max="8"
            :step="1"
            thumb-label
            :label="`Макс. параллельно: ${editDraft.maxParallel}`"
            density="compact"
            class="mb-3"
          />
          <VTextarea
            v-model="editDraft.whenToUse"
            label="Когда применять (подсказка для авто-выбора)"
            density="compact"
            rows="2"
            auto-grow
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="dialogOpen = false">Отмена</VBtn>
          <VBtn color="primary" variant="tonal" :loading="balancing.saving.value" @click="submitEdit">
            Сохранить
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.balancing-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.balancing-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.balancing-tab__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.balancing-tab__hint {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}

.balancing-tab__loading,
.balancing-tab__error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.balancing-tab__mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.balancing-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.85rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.balancing-mode-btn:hover:not([disabled]) {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.balancing-mode-btn--active {
  background: rgb(var(--v-theme-secondary-container));
  border-color: transparent;
  color: rgb(var(--v-theme-on-secondary-container));
}

.balancing-mode-btn__hint {
  font-size: 0.72rem;
  font-weight: 400;
  opacity: 0.8;
}

.balancing-tab__presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.balancing-preset {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface-variant), 0.18);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background 160ms ease, border-color 160ms ease;
}

.balancing-preset--active {
  border-color: rgb(var(--v-theme-secondary));
  background: rgba(var(--v-theme-secondary-container), 0.55);
}

.balancing-preset__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.balancing-preset__radio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.balancing-preset__radio:hover:not([disabled]) {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgb(var(--v-theme-on-surface));
}
.balancing-preset--active .balancing-preset__radio {
  color: rgb(var(--v-theme-secondary));
}

.balancing-preset__title-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.balancing-preset__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}
.balancing-preset__id {
  font-size: 0.68rem;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  font-family: var(--messenger-font-mono, ui-monospace, SFMono-Regular, monospace);
}

.balancing-preset__desc {
  font-size: 0.82rem;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}

.balancing-preset__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.balancing-preset__when {
  font-size: 0.78rem;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.balancing-preset__when strong {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.balancing-tab__path {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}
.balancing-tab__path code {
  font-family: var(--messenger-font-mono, ui-monospace, SFMono-Regular, monospace);
}
</style>
