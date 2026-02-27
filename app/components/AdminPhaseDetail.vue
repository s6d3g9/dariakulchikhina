<template>
  <Transition name="phase-detail-slide">
    <div v-if="phase" class="pd-wrap">
      <!-- Header -->
      <div class="pd-header">
        <div class="pd-header-left">
          <span class="pd-badge" :class="`pd-badge--${phaseMeta?.color}`">
            {{ phaseMeta?.short }} · {{ phase.label }}
          </span>
          <p class="pd-goal">{{ phase.goal }}</p>
        </div>
        <button class="pd-close" @click="$emit('close')" title="закрыть">✕</button>
      </div>

      <!-- Steps -->
      <div class="pd-steps">
        <div
          v-for="step in phase.steps"
          :key="step.num"
          class="pd-step"
          :class="{ 'pd-step--critical': step.critical }"
        >
          <div class="pd-step-side">
            <div class="pd-step-num">{{ step.num }}</div>
            <div class="pd-step-vline" />
          </div>
          <div class="pd-step-body">
            <div class="pd-step-head">
              <span class="pd-step-title">{{ step.title }}</span>
              <span v-if="step.critical" class="pd-critical-badge">⚠ критический</span>
            </div>

            <div class="pd-row">
              <div class="pd-row-icon">🏢</div>
              <div class="pd-row-content">
                <div class="pd-row-label">Бизнес</div>
                <div class="pd-row-text">{{ step.business }}</div>
              </div>
            </div>

            <div class="pd-row">
              <div class="pd-row-icon">⚙️</div>
              <div class="pd-row-content">
                <div class="pd-row-label">IT-система</div>
                <div class="pd-row-text">{{ step.it }}</div>
              </div>
            </div>

            <div v-if="step.statusChange" class="pd-row">
              <div class="pd-row-icon">🔄</div>
              <div class="pd-row-content">
                <div class="pd-row-label">Смена статуса</div>
                <div class="pd-row-text pd-status-change">{{ step.statusChange }}</div>
              </div>
            </div>

            <div v-if="step.artifacts?.length" class="pd-artifacts">
              <span
                v-for="art in step.artifacts"
                :key="art"
                class="pd-artifact"
              >📎 {{ art }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { PHASE_STEPS } from '~~/shared/types/phase-steps'
import { PROJECT_PHASES } from '~~/shared/types/catalogs'

const props = defineProps<{ phaseKey: string | null }>()
defineEmits<{ (e: 'close'): void }>()

const phase = computed(() =>
  props.phaseKey ? PHASE_STEPS.find(p => p.key === props.phaseKey) ?? null : null
)

const phaseMeta = computed(() =>
  props.phaseKey ? PROJECT_PHASES.find(p => p.key === props.phaseKey) ?? null : null
)
</script>

<style scoped>
/* Transition */
.phase-detail-slide-enter-active,
.phase-detail-slide-leave-active {
  transition: opacity .2s, transform .2s;
}
.phase-detail-slide-enter-from,
.phase-detail-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Wrapper */
.pd-wrap {
  margin-top: 12px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  overflow: hidden;
}
.dark .pd-wrap {
  background: #101014;
  border-color: rgba(255,255,255,0.08);
}

/* Header */
.pd-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: rgba(99,102,241,0.04);
}
.dark .pd-header {
  border-color: rgba(255,255,255,0.06);
  background: rgba(99,102,241,0.07);
}
.pd-header-left { flex: 1; }
.pd-goal {
  margin: 6px 0 0;
  font-size: .8rem;
  color: #666;
  line-height: 1.45;
}
.dark .pd-goal { color: #999; }

.pd-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: .9rem;
  color: #999;
  padding: 2px 6px;
  flex-shrink: 0;
  margin-top: -2px;
}
.pd-close:hover { color: inherit; }

/* Badge */
.pd-badge {
  font-size: .72rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 20px;
  display: inline-block;
}
.pd-badge--gray   { background: #f3f4f6; color: #6b7280; }
.pd-badge--violet { background: #ede9fe; color: #7c3aed; }
.pd-badge--blue   { background: #dbeafe; color: #1d4ed8; }
.pd-badge--amber  { background: #fef3c7; color: #b45309; }
.pd-badge--orange { background: #ffedd5; color: #c2410c; }
.pd-badge--green  { background: #dcfce7; color: #15803d; }
.pd-badge--teal   { background: #ccfbf1; color: #0f766e; }
.dark .pd-badge--gray   { background: #27272a; color: #9ca3af; }
.dark .pd-badge--violet { background: #2e1065; color: #c4b5fd; }
.dark .pd-badge--blue   { background: #1e3a5f; color: #93c5fd; }
.dark .pd-badge--amber  { background: #3d2700; color: #fcd34d; }
.dark .pd-badge--orange { background: #3d1500; color: #fdba74; }
.dark .pd-badge--green  { background: #052e16; color: #86efac; }
.dark .pd-badge--teal   { background: #042f2e; color: #5eead4; }

/* Steps list */
.pd-steps {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pd-step {
  display: flex;
  gap: 16px;
}

/* Side: number + vertical line */
.pd-step-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.pd-step-num {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f3f4f6;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .68rem;
  font-weight: 700;
  color: #6b7280;
  flex-shrink: 0;
}
.dark .pd-step-num {
  background: #1e1e20;
  border-color: #2d2d2d;
  color: #9ca3af;
}
.pd-step--critical .pd-step-num {
  background: #fff7ed;
  border-color: #fb923c;
  color: #ea580c;
}
.dark .pd-step--critical .pd-step-num {
  background: #3d1500;
  border-color: #c2410c;
  color: #fdba74;
}

.pd-step-vline {
  width: 2px;
  flex: 1;
  min-height: 16px;
  background: #e5e7eb;
  margin: 4px 0;
}
.dark .pd-step-vline { background: #2d2d2d; }
.pd-step:last-child .pd-step-vline { display: none; }

/* Step body */
.pd-step-body {
  flex: 1;
  padding-bottom: 20px;
}
.pd-step:last-child .pd-step-body { padding-bottom: 0; }

.pd-step-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  min-height: 34px;
  align-content: center;
}
.pd-step-title {
  font-size: .86rem;
  font-weight: 600;
  color: inherit;
}

.pd-critical-badge {
  font-size: .66rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 20px;
  background: #fff7ed;
  color: #ea580c;
  border: 1px solid #fed7aa;
}
.dark .pd-critical-badge {
  background: #3d1500;
  color: #fdba74;
  border-color: #c2410c;
}

/* Row: icon + content */
.pd-row {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}
.pd-row-icon {
  font-size: .85rem;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
  margin-top: 1px;
}
.pd-row-content { flex: 1; }
.pd-row-label {
  font-size: .65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #aaa;
  margin-bottom: 1px;
}
.pd-row-text {
  font-size: .8rem;
  color: #444;
  line-height: 1.45;
}
.dark .pd-row-text { color: #bbb; }

.pd-status-change {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.18);
  color: #6366f1;
  font-size: .77rem;
  font-weight: 500;
}
.dark .pd-status-change {
  background: rgba(99,102,241,0.12);
  color: #818cf8;
}

/* Artifacts */
.pd-artifacts {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.pd-artifact {
  font-size: .68rem;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
}
.dark .pd-artifact {
  background: #1e1e20;
  border-color: #2d2d2d;
  color: #94a3b8;
}
</style>
