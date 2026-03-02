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
            <button
              class="pd-step-num"
              :class="{ 'pd-step-num--link': stepToSlug[step.num] }"
              @click="stepToSlug[step.num] && $emit('navigate', String(stepToSlug[step.num]))"
              :title="stepToSlug[step.num] ? 'Открыть раздел ' + step.num : step.num"
            >{{ step.num }}</button>
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
defineEmits<{ (e: 'close'): void; (e: 'navigate', page: string): void }>()

const stepToSlug: Record<string, string> = {
  '0.1': 'first_contact',
  '0.2': 'brief',
  '0.3': 'site_survey',
  '0.4': 'tor_contract',
  '1.1': 'space_planning',
  '1.2': 'moodboard',
  '1.3': 'concept_approval',
}

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
  border-radius: var(--card-radius, 12px);
  border: none;
  background: color-mix(in srgb, var(--glass-bg) 85%, transparent);
  backdrop-filter: blur(14px) saturate(var(--glass-saturation, 145%));
  -webkit-backdrop-filter: blur(14px) saturate(var(--glass-saturation, 145%));
  overflow: hidden;
}

/* Header */
.pd-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: none;
  background: color-mix(in srgb, var(--ds-accent) 4%, transparent);
}
.dark .pd-header {
  background: color-mix(in srgb, var(--ds-accent) 7%, transparent);
}
.pd-header-left { flex: 1; }
.pd-goal {
  margin: 6px 0 0;
  font-size: .8rem;
  color: color-mix(in srgb, var(--glass-text) 45%, transparent);
  line-height: 1.45;
}

.pd-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: .9rem;
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
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
.pd-badge--gray   { background: color-mix(in srgb, var(--glass-text) 8%, transparent); color: color-mix(in srgb, var(--glass-text) 55%, transparent); }
.pd-badge--violet { background: color-mix(in srgb, hsl(265, 80%, 55%) 12%, transparent); color: hsl(265, 80%, 55%); }
.pd-badge--blue   { background: color-mix(in srgb, var(--ds-accent) 12%, transparent); color: var(--ds-accent); }
.pd-badge--amber  { background: color-mix(in srgb, var(--ds-warning) 12%, transparent); color: var(--ds-warning); }
.pd-badge--orange { background: color-mix(in srgb, hsl(24, 90%, 50%) 12%, transparent); color: hsl(24, 90%, 50%); }
.pd-badge--green  { background: color-mix(in srgb, var(--ds-success) 12%, transparent); color: var(--ds-success); }
.pd-badge--teal   { background: color-mix(in srgb, hsl(168, 76%, 40%) 12%, transparent); color: hsl(168, 76%, 40%); }

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
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .68rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  flex-shrink: 0;
  font-family: inherit;
  padding: 0;
  cursor: default;
  transition: transform .15s, box-shadow .15s;
}
.pd-step-num--link {
  cursor: pointer;
}
.pd-step-num--link:hover {
  transform: scale(1.12);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ds-accent) 22%, transparent);
  color: var(--ds-accent);
  background: color-mix(in srgb, var(--ds-accent) 10%, transparent);
}
.pd-step--critical .pd-step-num {
  background: color-mix(in srgb, var(--ds-warning) 12%, transparent);
  color: var(--ds-warning);
}

.pd-step-vline {
  width: 2px;
  flex: 1;
  min-height: 16px;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  margin: 4px 0;
}
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
  background: color-mix(in srgb, var(--ds-warning) 12%, transparent);
  color: var(--ds-warning);
  border: none;
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
  color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  margin-bottom: 1px;
}
.pd-row-text {
  font-size: .8rem;
  color: color-mix(in srgb, var(--glass-text) 75%, transparent);
  line-height: 1.45;
}

.pd-status-change {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ds-accent) 8%, transparent);
  border: none;
  color: var(--ds-accent);
  font-size: .77rem;
  font-weight: 500;
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
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  border: none;
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .pd-step {
    gap: 10px;
  }
  .pd-step-num {
    width: 28px;
    height: 28px;
    font-size: .6rem;
  }
  .pd-step-body {
    padding-bottom: 14px;
  }
  .pd-step-head {
    gap: 6px;
  }
  .pd-step-title {
    font-size: .8rem;
  }
  .pd-row {
    gap: 6px;
  }
}
</style>
