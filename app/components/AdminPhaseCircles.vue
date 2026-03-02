<template>
  <div class="apc-wrap glass-surface">
    <!-- Vertical timeline -->
    <div class="apc-timeline">
      <div
        v-for="(ph, idx) in PHASES"
        :key="ph.key"
        class="apc-step"
        :class="{
          'apc-step--active': ph.key === currentKey,
          'apc-step--done': phaseOrder(ph.key) < phaseOrder(currentKey),
          'apc-step--future': phaseOrder(ph.key) > phaseOrder(currentKey),
        }"
      >
        <!-- Circle + connector -->
        <div class="apc-node">
          <button
            class="apc-circle"
            :class="{
              'apc-circle--active': ph.key === currentKey,
              'apc-circle--done': phaseOrder(ph.key) < phaseOrder(currentKey),
            }"
            :style="circleStyle(ph)"
            :disabled="savingStatus"
            @click="setPhase(ph.key)"
          >
            <svg v-if="phaseOrder(ph.key) < phaseOrder(currentKey)" class="apc-check" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 8.5l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span v-else class="apc-num">{{ ph.short }}</span>
          </button>
          <!-- Vertical connector line (except last) -->
          <div v-if="idx < PHASES.length - 1" class="apc-connector" :class="{ 'apc-connector--done': phaseOrder(ph.key) < phaseOrder(currentKey) }" />
        </div>

        <!-- Label -->
        <div class="apc-info">
          <span class="apc-label">{{ ph.label }}</span>
          <span class="apc-desc">{{ ph.desc }}</span>
        </div>
      </div>
    </div>

    <!-- Status -->
    <div class="apc-meta">
      <span v-if="savingStatus" class="apc-saving">сохранение...</span>
      <span v-else-if="savedOk" class="apc-saved">✓ сохранено</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string; status: string }>()
const emit = defineEmits<{ (e: 'update:status', v: string): void }>()

const PHASES = [
  { key: 'lead',            short: '0', label: 'Инициация',  desc: 'Бриф, замеры, договор',            color: '#6366f1' },
  { key: 'concept',         short: '1', label: 'Концепция',  desc: 'Планировки, мудборд',              color: '#8b5cf6' },
  { key: 'working_project', short: '2', label: 'Рабочий',    desc: 'Чертежи, спецификации, инженерия', color: '#3b82f6' },
  { key: 'procurement',     short: '3', label: 'Закупки',    desc: 'Смета, поставщики',                color: '#f59e0b' },
  { key: 'construction',    short: '4', label: 'Стройка',    desc: 'Авторский надзор',                 color: '#f97316' },
  { key: 'commissioning',   short: '5', label: 'Сдача',      desc: 'Дефектовка, акт',                  color: '#10b981' },
  { key: 'completed',       short: '✓', label: 'Завершён',   desc: 'Проект закрыт',                    color: '#14b8a6' },
]

const currentKey = ref(props.status || 'lead')
watch(() => props.status, v => { if (v) currentKey.value = v })

const { notifySaved } = useRoadmapBus()

function phaseOrder(key: string) { return PHASES.findIndex(p => p.key === key) }

function circleStyle(ph: typeof PHASES[number]) {
  const order = phaseOrder(ph.key)
  const current = phaseOrder(currentKey.value)
  if (ph.key === currentKey.value) return { borderColor: ph.color, background: ph.color, color: '#fff' }
  if (order < current) return { borderColor: ph.color, background: `${ph.color}18`, color: ph.color }
  return {}
}

const savingStatus = ref(false)
const savedOk = ref(false)

async function setPhase(key: string) {
  if (savingStatus.value || key === currentKey.value) return
  currentKey.value = key
  savingStatus.value = true
  savedOk.value = false
  try {
    await $fetch(`/api/projects/${props.slug}`, { method: 'PUT', body: { status: key } })
    emit('update:status', key)
    notifySaved()
    savedOk.value = true
    setTimeout(() => { savedOk.value = false }, 2500)
  } catch (e) { console.error(e) }
  finally { savingStatus.value = false }
}
</script>

<style scoped>
.apc-wrap {
  border-radius: 14px;
  padding: 16px 20px 12px;
  margin-bottom: 18px;
}

/* ── Timeline ── */
.apc-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Step row ── */
.apc-step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  opacity: 1;
  transition: opacity .15s;
}
.apc-step--future { opacity: .38; }

/* ── Node column (circle + connector) ── */
.apc-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 32px;
}

/* ── Circle ── */
.apc-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--glass-text) 20%, transparent);
  background: var(--glass-bg, #12121a);
  color: var(--glass-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: inherit;
  font-size: .72rem;
  font-weight: 700;
  padding: 0;
  flex-shrink: 0;
  transition: border-color .2s, background .2s, color .2s, transform .15s, box-shadow .2s;
  position: relative;
  z-index: 2;
}
.apc-circle:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.apc-circle:disabled {
  opacity: .5;
  cursor: default;
  transform: none !important;
  box-shadow: none !important;
}

.apc-circle--active {
  box-shadow: 0 2px 14px rgba(99, 102, 241, .3);
}
.apc-circle--done {
  /* styles set via :style binding */
}

.apc-check {
  width: 14px;
  height: 14px;
}

.apc-num {
  line-height: 1;
  user-select: none;
}

/* ── Connector line ── */
.apc-connector {
  width: 2px;
  height: 20px;
  background: color-mix(in srgb, var(--glass-text) 12%, transparent);
  flex-shrink: 0;
  transition: background .2s;
}
.apc-connector--done {
  background: color-mix(in srgb, var(--glass-text) 30%, transparent);
}

/* ── Info column ── */
.apc-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 5px;
  min-height: 52px; /* match circle + connector height */
}
.apc-label {
  font-size: .78rem;
  font-weight: 600;
  color: var(--glass-text);
  line-height: 1.2;
}
.apc-desc {
  font-size: .65rem;
  color: var(--glass-text);
  opacity: .45;
  line-height: 1.2;
}

/* Active step label highlight */
.apc-step--active .apc-label { opacity: 1; }
.apc-step--active .apc-desc { opacity: .6; }
.apc-step--done .apc-label { opacity: .7; }
.apc-step--done .apc-desc { opacity: .35; }

/* ── Meta ── */
.apc-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: .7rem;
  margin-top: 4px;
}
.apc-saving { color: var(--glass-text); opacity: .4; font-style: italic; }
.apc-saved { color: #16a34a; }

/* ── Dark theme tweaks ── */
html.dark .apc-circle--active { box-shadow: 0 2px 16px rgba(99, 102, 241, .35); }
</style>
