<template>
  <div class="phase-wrap">
    <!-- Phase stepper -->
    <div class="phase-track">
      <div
        v-for="(phase, idx) in phases"
        :key="phase.key"
        class="phase-step"
        :class="{
          'phase-step--done':    phaseIndex(phase.key) < currentIndex,
          'phase-step--active':  phase.key === current,
          'phase-step--future':  phaseIndex(phase.key) > currentIndex,
          'phase-step--open':    detailKey === phase.key,
        }"
        @click="toggleDetail(phase.key)"
        :title="phase.description"
      >
        <!-- connector line -->
        <div v-if="idx > 0" class="phase-line" :class="{ 'phase-line--done': phaseIndex(phase.key) <= currentIndex }" />

        <div class="phase-dot">
          <template v-if="phaseIndex(phase.key) < currentIndex">✓</template>
          <template v-else>{{ phase.short }}</template>
        </div>
        <div class="phase-label">{{ phase.label }}</div>
      </div>
    </div>

    <!-- Current phase description + change control -->
    <div class="phase-meta">
      <div class="phase-meta-left">
        <span class="phase-badge" :class="`phase-badge--${currentPhase?.color}`">{{ currentPhase?.label }}</span>
        <span class="phase-meta-desc">{{ currentPhase?.description }}</span>
      </div>
      <div class="phase-meta-right" v-if="!readOnly">
        <button class="phase-detail-btn" @click="toggleDetail(current)">{{ detailKey === current ? '▲ скрыть' : '▼ шаги' }}</button>
        <select
          v-model="draft"
          class="phase-select"
          @change="save"
          :disabled="saving"
        >
          <option v-for="p in phases" :key="p.key" :value="p.key">• {{ p.label }}</option>
        </select>
        <span v-if="saved" class="phase-saved">✓ сохранено</span>
      </div>
    </div>

    <!-- Detail panel -->
    <AdminPhaseDetail :phaseKey="detailKey" @close="detailKey = null" />
  </div>
</template>

<script setup lang="ts">
import { PROJECT_PHASES, type ProjectStatus } from '~~/shared/types/catalogs'

const props = defineProps<{
  slug: string
  status: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:status', value: string): void
}>()

const phases = PROJECT_PHASES
const draft = ref<ProjectStatus>(props.status as ProjectStatus || 'lead')
const saving = ref(false)
const saved = ref(false)
const detailKey = ref<string | null>(null)

watch(() => props.status, (v) => {
  if (v) draft.value = v as ProjectStatus
})

const currentIndex = computed(() => phases.findIndex(p => p.key === draft.value))
const current = computed(() => draft.value)
const currentPhase = computed(() => phases.find(p => p.key === draft.value))

function phaseIndex(key: string) {
  return phases.findIndex(p => p.key === key)
}

function toggleDetail(key: string) {
  detailKey.value = detailKey.value === key ? null : key
}

function selectPhase(key: string) {
  if (props.readOnly) return
  draft.value = key as ProjectStatus
  save()
}

async function save() {
  if (props.readOnly) return
  saving.value = true
  saved.value = false
  try {
    await $fetch(`/api/projects/${props.slug}/status`, {
      method: 'PUT',
      body: { status: draft.value },
    })
    emit('update:status', draft.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.phase-wrap {
  margin-bottom: 18px;
}

/* phase open state */
.phase-step--open .phase-dot {
  box-shadow: 0 0 0 4px rgba(99,102,241,0.25);
  border-color: #6366f1;
}
.phase-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
  margin-bottom: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.phase-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 64px;
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: opacity .15s;
}
.phase-step--future { opacity: .45; }
.phase-step:not(.phase-step--future):hover { opacity: .8; }

/* connector */
.phase-line {
  position: absolute;
  top: 14px;
  right: 50%;
  width: 100%;
  height: 2px;
  background: #ddd;
  z-index: 0;
  transition: background .2s;
}
.dark .phase-line { background: #333; }
.phase-line--done { background: #22c55e; }
.dark .phase-line--done { background: #22c55e; }

/* dot */
.phase-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #ddd;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .7rem;
  font-weight: 600;
  color: #aaa;
  position: relative;
  z-index: 1;
  transition: all .2s;
  flex-shrink: 0;
}
.dark .phase-dot {
  border-color: #333;
  background: #151517;
  color: #666;
}
.phase-step--done .phase-dot {
  background: #22c55e;
  border-color: #22c55e;
  color: #fff;
}
.phase-step--active .phase-dot {
  border-color: #6366f1;
  background: #6366f1;
  color: #fff;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.22);
}

/* label */
.phase-label {
  font-size: .65rem;
  color: #aaa;
  margin-top: 4px;
  text-align: center;
  line-height: 1.2;
  max-width: 72px;
  word-break: break-word;
}
.phase-step--active .phase-label { color: #6366f1; font-weight: 600; }
.phase-step--done .phase-label { color: #22c55e; }
.dark .phase-step--active .phase-label { color: #818cf8; }

/* meta bar */
.phase-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(99,102,241,0.05);
  border: 1px solid rgba(99,102,241,0.12);
}
.dark .phase-meta {
  background: rgba(99,102,241,0.08);
  border-color: rgba(99,102,241,0.18);
}
.phase-meta-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.phase-meta-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.phase-detail-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #6366f1;
  background: transparent;
  color: #6366f1;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.phase-detail-btn:hover { background: rgba(99,102,241,0.1); }
.dark .phase-detail-btn { color: #a5b4fc; border-color: #a5b4fc; }
.dark .phase-detail-btn:hover { background: rgba(165,180,252,0.1); }

.phase-badge {
  font-size: .72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}
.phase-badge--gray      { background: #f3f4f6; color: #6b7280; }
.phase-badge--violet    { background: #ede9fe; color: #7c3aed; }
.phase-badge--blue      { background: #dbeafe; color: #1d4ed8; }
.phase-badge--amber     { background: #fef3c7; color: #b45309; }
.phase-badge--orange    { background: #ffedd5; color: #c2410c; }
.phase-badge--green     { background: #dcfce7; color: #15803d; }
.phase-badge--teal      { background: #ccfbf1; color: #0f766e; }
.dark .phase-badge--gray   { background: #27272a; color: #9ca3af; }
.dark .phase-badge--violet { background: #2e1065; color: #c4b5fd; }
.dark .phase-badge--blue   { background: #1e3a5f; color: #93c5fd; }
.dark .phase-badge--amber  { background: #3d2700; color: #fcd34d; }
.dark .phase-badge--orange { background: #3d1500; color: #fdba74; }
.dark .phase-badge--green  { background: #052e16; color: #86efac; }
.dark .phase-badge--teal   { background: #042f2e; color: #5eead4; }

.phase-meta-desc {
  font-size: .75rem;
  color: #888;
}

.phase-select {
  font-size: .75rem;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-family: inherit;
}
.dark .phase-select { border-color: #333; background: #1e1e20; }
.phase-select:disabled { opacity: .5; }

.phase-saved {
  font-size: .72rem;
  color: #22c55e;
}
</style>
