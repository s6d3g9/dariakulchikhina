<template>
  <div class="phase-wrap">
    <div class="phase-track">
      <div
        v-for="(phase, idx) in phases"
        :key="phase.key"
        class="phase-step"
        :class="{
          'phase-step--done':   phaseIndex(phase.key) < currentIndex,
          'phase-step--active': phase.key === current,
          'phase-step--future': phaseIndex(phase.key) > currentIndex,
        }"
        :title="phase.description"
        @click="selectPhase(phase.key)"
      >
        <div v-if="idx > 0" class="phase-line" :class="{ 'phase-line--done': phaseIndex(phase.key) <= currentIndex }" />
        <div class="phase-dot">
          <template v-if="phaseIndex(phase.key) < currentIndex">✓</template>
          <template v-else>{{ phase.short }}</template>
        </div>
        <div class="phase-label">{{ phase.label }}</div>
      </div>
    </div>

    <div class="phase-meta">
      <span class="phase-badge" :class="`phase-badge--${currentPhase?.color}`">{{ currentPhase?.label }}</span>
      <span class="phase-meta-desc">{{ currentPhase?.description }}</span>
      <span v-if="saved" class="phase-saved">✓ сохранено</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROJECT_PHASES, type ProjectStatus } from '~~/shared/types/catalogs'

const props = defineProps<{ slug: string; status: string; readOnly?: boolean }>()
const emit = defineEmits<{ (e: 'update:status', v: string): void }>()

const phases = PROJECT_PHASES
const draft = ref<ProjectStatus>(props.status as ProjectStatus || 'lead')
const saving = ref(false)
const saved = ref(false)

watch(() => props.status, (v) => { if (v) draft.value = v as ProjectStatus })

const currentIndex = computed(() => phases.findIndex(p => p.key === draft.value))
const current = computed(() => draft.value)
const currentPhase = computed(() => phases.find(p => p.key === draft.value))

function phaseIndex(key: string) { return phases.findIndex(p => p.key === key) }

async function selectPhase(key: string) {
  if (props.readOnly || key === draft.value) return
  draft.value = key as ProjectStatus
  saving.value = true
  saved.value = false
  try {
    await $fetch(`/api/projects/${props.slug}`, { method: 'PUT', body: { status: draft.value } })
    emit('update:status', draft.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch (e) { console.error(e) }
  finally { saving.value = false }
}
</script>

<style scoped>
.phase-wrap { margin-bottom: 20px; }

/* ── Track ── */
.phase-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}

.phase-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  min-width: 70px;
  cursor: pointer;
  padding-top: 6px;
}
.phase-step:not(.phase-step--active):not(.phase-step--done) { opacity: .55; }

/* connector line */
.phase-line {
  position: absolute;
  top: 18px;
  right: 50%;
  left: -50%;
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}
.phase-line--done { background: #16a34a; }
.dark .phase-line { background: #2a2a2e; }

/* dot */
.phase-dot {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .72rem; font-weight: 600;
  border: 2px solid #d1d5db;
  background: #fff;
  color: #6b7280;
  position: relative; z-index: 1;
  transition: border-color .15s, background .15s, color .15s;
}
.phase-step--done  .phase-dot { border-color: #16a34a; background: #f0fdf4; color: #16a34a; }
.phase-step--active .phase-dot { border-color: #4f46e5; background: #4f46e5; color: #fff; }
.phase-step:hover:not(.phase-step--active) .phase-dot { border-color: #6366f1; color: #4f46e5; }
.dark .phase-dot { background: #18181b; border-color: #3f3f46; color: #a1a1aa; }
.dark .phase-step--done .phase-dot { border-color: #16a34a; background: #14532d; color: #4ade80; }
.dark .phase-step--active .phase-dot { border-color: #6366f1; background: #4f46e5; color: #fff; }

/* label */
.phase-label {
  margin-top: 5px;
  font-size: .65rem;
  color: #9ca3af;
  text-align: center;
  line-height: 1.2;
  max-width: 68px;
}
.phase-step--active .phase-label { color: #4f46e5; font-weight: 600; }
.phase-step--done   .phase-label { color: #16a34a; }
.dark .phase-label { color: #71717a; }
.dark .phase-step--active .phase-label { color: #a5b4fc; }

/* ── Meta bar ── */
.phase-meta {
  display: flex; align-items: center; gap: 12px;
  margin-top: 10px; font-size: .8rem; color: #6b7280;
}
.phase-badge {
  padding: 2px 8px; border-radius: 4px;
  font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
}
.phase-badge--gray   { background: #f3f4f6; color: #6b7280; }
.phase-badge--violet { background: #ede9fe; color: #7c3aed; }
.phase-badge--blue   { background: #dbeafe; color: #1d4ed8; }
.phase-badge--amber  { background: #fef3c7; color: #d97706; }
.phase-badge--orange { background: #ffedd5; color: #ea580c; }
.phase-badge--green  { background: #dcfce7; color: #16a34a; }
.phase-badge--teal   { background: #ccfbf1; color: #0f766e; }
.dark .phase-badge--gray   { background: #27272a; color: #a1a1aa; }
.dark .phase-badge--violet { background: #2e1065; color: #c4b5fd; }

.phase-meta-desc { color: #9ca3af; font-size: .75rem; }
.phase-saved { color: #16a34a; font-size: .78rem; }
</style>
