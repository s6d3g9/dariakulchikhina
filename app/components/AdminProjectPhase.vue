<template>
  <div class="phase-wrap" ref="wrapRef">
    <!-- Phase stepper -->
    <div class="phase-track" ref="trackRef">
      <div
        v-for="(phase, idx) in phases"
        :key="phase.key"
        class="phase-step"
        :class="{
          'phase-step--done':    phaseIndex(phase.key) < currentIndex,
          'phase-step--active':  phase.key === current,
          'phase-step--future':  phaseIndex(phase.key) > currentIndex,
          'phase-step--open':    popupKey === phase.key,
        }"
        :ref="el => stepRefs[idx] = el as HTMLElement"
        @click.stop="openPopup(phase.key, idx)"
      >
        <!-- connector line -->
        <div v-if="idx > 0" class="phase-line" :class="{ 'phase-line--done': phaseIndex(phase.key) <= currentIndex }" />

        <div class="phase-dot" :title="phase.description">
          <template v-if="phaseIndex(phase.key) < currentIndex">✓</template>
          <template v-else>{{ phase.short }}</template>
        </div>
        <div class="phase-label">{{ phase.label }}</div>
      </div>

      <!-- ── Popup menu ──────────────────────────────── -->
      <Transition name="phase-popup">
        <div
          v-if="popupPhase"
          class="phase-popup"
          :style="popupStyle"
          @click.stop
          ref="popupRef"
        >
          <!-- Arrow -->
          <div class="phase-popup-arrow" :style="arrowStyle"></div>

          <!-- Header -->
          <div class="phase-popup-header">
            <div class="phase-popup-badge" :class="`phase-popup-badge--${phaseMeta?.color}`">
              {{ phaseMeta?.short }} · {{ phaseMeta?.label }}
            </div>
            <button class="phase-popup-close" @click="closePopup">✕</button>
          </div>
          <p class="phase-popup-goal">{{ popupPhase.goal }}</p>

          <!-- Steps -->
          <div class="phase-popup-steps">
            <div
              v-for="step in popupPhase.steps"
              :key="step.num"
              class="phase-popup-step"
              :class="{ 'phase-popup-step--critical': step.critical }"
            >
              <div class="phase-popup-step-head">
                <span class="phase-popup-step-num">{{ step.num }}</span>
                <span class="phase-popup-step-title">{{ step.title }}</span>
                <span v-if="step.critical" class="phase-popup-critical">⚠ критический</span>
              </div>
              <div class="phase-popup-step-rows">
                <div class="phase-popup-row">
                  <span class="phase-popup-row-icon">🏢</span>
                  <span class="phase-popup-row-text">{{ step.business }}</span>
                </div>
                <div class="phase-popup-row">
                  <span class="phase-popup-row-icon">⚙️</span>
                  <span class="phase-popup-row-text">{{ step.it }}</span>
                </div>
                <div class="phase-popup-row" v-if="step.statusChange">
                  <span class="phase-popup-row-icon">🔄</span>
                  <span class="phase-popup-row-text phase-popup-status">{{ step.statusChange }}</span>
                </div>
              </div>
              <div v-if="step.artifacts?.length" class="phase-popup-artifacts">
                <span v-for="art in step.artifacts" :key="art" class="phase-popup-artifact">📎 {{ art }}</span>
              </div>
            </div>
          </div>

          <!-- Footer actions -->
          <div class="phase-popup-footer" v-if="!readOnly">
            <button
              v-if="popupKey !== current"
              class="phase-popup-btn phase-popup-btn--primary"
              @click="switchToPhase(popupKey!)"
              :disabled="saving"
            >
              {{ saving ? '...' : `Перейти в «${phaseMeta?.label}»` }}
            </button>
            <span v-else class="phase-popup-current-label">✓ текущая фаза</span>
            <button class="phase-popup-btn" @click="closePopup">закрыть</button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Current phase meta bar -->
    <div class="phase-meta">
      <div class="phase-meta-left">
        <span class="phase-badge" :class="`phase-badge--${currentPhase?.color}`">{{ currentPhase?.label }}</span>
        <span class="phase-meta-desc">{{ currentPhase?.description }}</span>
      </div>
      <div class="phase-meta-right" v-if="!readOnly">
        <span v-if="saved" class="phase-saved">✓ сохранено</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROJECT_PHASES, type ProjectStatus } from '~~/shared/types/catalogs'
import { PHASE_STEPS } from '~~/shared/types/phase-steps'

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

// Popup state
const popupKey = ref<string | null>(null)
const popupStyle = ref<Record<string, string>>({})
const arrowStyle = ref<Record<string, string>>({})
const trackRef = ref<HTMLElement | null>(null)
const popupRef = ref<HTMLElement | null>(null)
const stepRefs = ref<(HTMLElement | null)[]>([])

watch(() => props.status, (v) => {
  if (v) draft.value = v as ProjectStatus
})

const currentIndex = computed(() => phases.findIndex(p => p.key === draft.value))
const current = computed(() => draft.value)
const currentPhase = computed(() => phases.find(p => p.key === draft.value))
const popupPhase = computed(() => popupKey.value ? PHASE_STEPS.find(p => p.key === popupKey.value) ?? null : null)
const phaseMeta = computed(() => popupKey.value ? phases.find(p => p.key === popupKey.value) : null)

function phaseIndex(key: string) {
  return phases.findIndex(p => p.key === key)
}

function openPopup(key: string, idx: number) {
  if (popupKey.value === key) {
    closePopup()
    return
  }
  popupKey.value = key

  // Calculate position relative to phase-track (position: relative)
  nextTick(() => {
    const track = trackRef.value
    const dot = stepRefs.value[idx]
    const popup = popupRef.value
    if (!track || !dot || !popup) return

    const trackRect = track.getBoundingClientRect()
    const dotRect = dot.getBoundingClientRect()

    const dotCenter = dotRect.left - trackRect.left + dotRect.width / 2
    const popupWidth = 380
    const minLeft = 8
    const maxLeft = trackRect.width - popupWidth - 8
    const left = Math.max(minLeft, Math.min(maxLeft, dotCenter - popupWidth / 2))

    popupStyle.value = {
      left: left + 'px',
      top: (dotRect.bottom - trackRect.top + 10) + 'px',
      width: popupWidth + 'px',
    }

    // Arrow offset relative to popup left
    const arrowX = dotCenter - left - 8
    arrowStyle.value = { left: Math.max(8, arrowX) + 'px' }
  })
}

function closePopup() {
  popupKey.value = null
}

async function switchToPhase(key: string) {
  if (props.readOnly) return
  draft.value = key as ProjectStatus
  await save()
  closePopup()
}

async function save() {
  if (props.readOnly) return
  saving.value = true
  saved.value = false
  try {
    await $fetch(`/api/projects/${props.slug}`, {
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

// Close popup on outside click
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})
onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
function handleOutsideClick(e: MouseEvent) {
  const wrap = trackRef.value
  if (wrap && !wrap.contains(e.target as Node)) {
    closePopup()
  }
}
</script>

<style scoped>
.phase-wrap {
  margin-bottom: 18px;
}

/* ── Track ── */
.phase-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
  margin-bottom: 10px;
  overflow-x: auto;
  padding-bottom: 56px; /* room for popup */
  position: relative;   /* popup is absolute inside this */
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
.dark .phase-dot { border-color: #333; background: #151517; color: #666; }
.phase-step--done .phase-dot { background: #22c55e; border-color: #22c55e; color: #fff; }
.phase-step--active .phase-dot {
  border-color: #6366f1; background: #6366f1; color: #fff;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.22);
}
.phase-step--open .phase-dot {
  box-shadow: 0 0 0 5px rgba(99,102,241,0.3);
  border-color: #6366f1;
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

/* ── Popup ── */
.phase-popup {
  position: absolute;
  z-index: 100;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
  padding: 16px;
  max-height: 420px;
  overflow-y: auto;
}
.dark .phase-popup {
  background: #1e1e20;
  border-color: #2a2a2e;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

/* arrow (caret pointing up) */
.phase-popup-arrow {
  position: absolute;
  top: -8px;
  width: 16px;
  height: 8px;
  overflow: hidden;
  transform: translateX(-50%);
}
.phase-popup-arrow::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  border-left: 1px solid #e5e7eb;
  transform: rotate(45deg);
  transform-origin: top left;
}
.dark .phase-popup-arrow::before {
  background: #1e1e20;
  border-color: #2a2a2e;
}

/* Popup header */
.phase-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.phase-popup-close {
  background: none;
  border: none;
  font-size: .85rem;
  color: #aaa;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background .15s;
}
.phase-popup-close:hover { background: #f3f4f6; color: #333; }
.dark .phase-popup-close:hover { background: #2a2a2e; color: #ccc; }

.phase-popup-badge {
  font-size: .72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
}
.phase-popup-badge--gray   { background: #f3f4f6; color: #6b7280; }
.phase-popup-badge--violet { background: #ede9fe; color: #7c3aed; }
.phase-popup-badge--blue   { background: #dbeafe; color: #1d4ed8; }
.phase-popup-badge--amber  { background: #fef3c7; color: #b45309; }
.phase-popup-badge--orange { background: #ffedd5; color: #c2410c; }
.phase-popup-badge--green  { background: #dcfce7; color: #15803d; }
.phase-popup-badge--teal   { background: #ccfbf1; color: #0f766e; }
.dark .phase-popup-badge--gray   { background: #27272a; color: #9ca3af; }
.dark .phase-popup-badge--violet { background: #2e1065; color: #c4b5fd; }
.dark .phase-popup-badge--blue   { background: #1e3a5f; color: #93c5fd; }
.dark .phase-popup-badge--amber  { background: #3d2700; color: #fcd34d; }
.dark .phase-popup-badge--orange { background: #3d1500; color: #fdba74; }
.dark .phase-popup-badge--green  { background: #052e16; color: #86efac; }
.dark .phase-popup-badge--teal   { background: #042f2e; color: #5eead4; }

.phase-popup-goal {
  font-size: .78rem;
  color: #666;
  margin: 0 0 10px;
  line-height: 1.45;
}
.dark .phase-popup-goal { color: #9ca3af; }

/* Steps */
.phase-popup-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.phase-popup-step {
  background: #f9fafb;
  border-radius: 8px;
  padding: 10px;
  border-left: 3px solid #e5e7eb;
}
.dark .phase-popup-step { background: #252528; border-color: #333; }
.phase-popup-step--critical { border-left-color: #ef4444; }

.phase-popup-step-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.phase-popup-step-num {
  background: #6366f1;
  color: #fff;
  font-size: .65rem;
  font-weight: 700;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.phase-popup-step--critical .phase-popup-step-num { background: #ef4444; }
.phase-popup-step-title {
  font-size: .78rem;
  font-weight: 600;
  color: #374151;
  flex: 1;
}
.dark .phase-popup-step-title { color: #e5e7eb; }
.phase-popup-critical {
  font-size: .66rem;
  color: #ef4444;
  background: #fef2f2;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.dark .phase-popup-critical { background: #3d0000; }

.phase-popup-step-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.phase-popup-row {
  display: flex;
  gap: 5px;
  font-size: .72rem;
  line-height: 1.4;
}
.phase-popup-row-icon { flex-shrink: 0; }
.phase-popup-row-text { color: #555; }
.dark .phase-popup-row-text { color: #9ca3af; }
.phase-popup-status {
  color: #6366f1;
  font-weight: 600;
}
.dark .phase-popup-status { color: #a5b4fc; }

.phase-popup-artifacts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}
.phase-popup-artifact {
  font-size: .66rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 4px;
}
.dark .phase-popup-artifact { background: #2a2a2e; color: #9ca3af; }

/* Footer */
.phase-popup-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
  flex-wrap: wrap;
}
.dark .phase-popup-footer { border-color: #2a2a2e; }

.phase-popup-btn {
  padding: 6px 14px;
  border-radius: 7px;
  font-size: .75rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #ddd;
  background: transparent;
  color: #555;
  transition: background .15s;
  font-family: inherit;
}
.phase-popup-btn:hover { background: #f3f4f6; }
.dark .phase-popup-btn { border-color: #333; color: #9ca3af; }
.dark .phase-popup-btn:hover { background: #2a2a2e; }

.phase-popup-btn--primary {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}
.phase-popup-btn--primary:hover { background: #4f46e5; border-color: #4f46e5; }
.phase-popup-btn--primary:disabled { opacity: .6; cursor: not-allowed; }

.phase-popup-current-label {
  font-size: .75rem;
  color: #22c55e;
  font-weight: 600;
}

/* Popup animation */
.phase-popup-enter-active,
.phase-popup-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}
.phase-popup-enter-from,
.phase-popup-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Meta bar ── */
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
.phase-meta-left  { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.phase-meta-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.phase-badge {
  font-size: .72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}
.phase-badge--gray   { background: #f3f4f6; color: #6b7280; }
.phase-badge--violet { background: #ede9fe; color: #7c3aed; }
.phase-badge--blue   { background: #dbeafe; color: #1d4ed8; }
.phase-badge--amber  { background: #fef3c7; color: #b45309; }
.phase-badge--orange { background: #ffedd5; color: #c2410c; }
.phase-badge--green  { background: #dcfce7; color: #15803d; }
.phase-badge--teal   { background: #ccfbf1; color: #0f766e; }
.dark .phase-badge--gray   { background: #27272a; color: #9ca3af; }
.dark .phase-badge--violet { background: #2e1065; color: #c4b5fd; }
.dark .phase-badge--blue   { background: #1e3a5f; color: #93c5fd; }
.dark .phase-badge--amber  { background: #3d2700; color: #fcd34d; }
.dark .phase-badge--orange { background: #3d1500; color: #fdba74; }
.dark .phase-badge--green  { background: #052e16; color: #86efac; }
.dark .phase-badge--teal   { background: #042f2e; color: #5eead4; }

.phase-meta-desc { font-size: .75rem; color: #888; }
.phase-saved { font-size: .72rem; color: #22c55e; }
</style>
