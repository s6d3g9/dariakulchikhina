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
.phase-wrap { margin-bottom: 12px; }

.phase-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
  margin-bottom: 8px;
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
.phase-step--future { opacity: .4; }
.phase-step:not(.phase-step--future):hover { opacity: .75; }
.phase-step--active { cursor: default; }

.phase-line {
  position: absolute;
  top: 14px; right: 50%;
  width: 100%; height: 2px;
  background: #ddd; z-index: 0;
  transition: background .2s;
}
.dark .phase-line { background: #333; }
.phase-line--done { background: #22c55e; }

.phase-dot {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid #ddd; background: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: .68rem; font-weight: 700; color: #aaa;
  position: relative; z-index: 1; transition: all .2s; flex-shrink: 0;
}
.dark .phase-dot { border-color: #333; background: #151517; color: #666; }
.phase-step--done .phase-dot   { background: #22c55e; border-color: #22c55e; color: #fff; }
.phase-step--active .phase-dot { background: #6366f1; border-color: #6366f1; color: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,.22); }

.phase-label {
  font-size: .63rem; color: #aaa;
  margin-top: 4px; text-align: center;
  line-height: 1.2; max-width: 72px;
}
.phase-step--active .phase-label { color: #6366f1; font-weight: 600; }
.phase-step--done   .phase-label { color: #22c55e; }
.dark .phase-step--active .phase-label { color: #818cf8; }

.phase-meta {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 12px; border-radius: 6px;
  background: rgba(99,102,241,.05);
  border: 1px solid rgba(99,102,241,.12);
  flex-wrap: wrap;
}
.dark .phase-meta { background: rgba(99,102,241,.08); border-color: rgba(99,102,241,.18); }

.phase-badge {
  font-size: .72rem; font-weight: 600; padding: 2px 8px; border-radius: 20px; white-space: nowrap;
}
.phase-badge--gray   { background:#f3f4f6;color:#6b7280 } .phase-badge--violet { background:#ede9fe;color:#7c3aed }
.phase-badge--blue   { background:#dbeafe;color:#1d4ed8 } .phase-badge--amber  { background:#fef3c7;color:#b45309 }
.phase-badge--orange { background:#ffedd5;color:#c2410c } .phase-badge--green  { background:#dcfce7;color:#15803d }
.phase-badge--teal   { background:#ccfbf1;color:#0f766e }
.dark .phase-badge--gray   { background:#27272a;color:#9ca3af } .dark .phase-badge--violet { background:#2e1065;color:#c4b5fd }
.dark .phase-badge--blue   { background:#1e3a5f;color:#93c5fd } .dark .phase-badge--amber  { background:#3d2700;color:#fcd34d }
.dark .phase-badge--orange { background:#3d1500;color:#fdba74 } .dark .phase-badge--green  { background:#052e16;color:#86efac }
.dark .phase-badge--teal   { background:#042f2e;color:#5eead4 }

.phase-meta-desc { font-size: .75rem; color: #888; }
.phase-saved { font-size: .72rem; color: #22c55e; margin-left: auto; }
</style>

      <div
        v-for="(phase, idx) in phases"
        :key="phase.key"
        class="phase-step"
        :class="{
          'phase-step--done':   phaseIndex(phase.key) < currentIndex,
          'phase-step--active': phase.key === current,
          'phase-step--future': phaseIndex(phase.key) > currentIndex,
          'phase-step--open':   detailKey === phase.key,
        }"
        @click="toggleDetail(phase.key)"
        :title="phase.description"
      >
        <!-- vertical connector line -->
        <div v-if="idx > 0" class="phase-line" :class="{ 'phase-line--done': phaseIndex(phase.key) <= currentIndex }" />
        <div class="phase-row">
          <div class="phase-dot">
            <template v-if="phaseIndex(phase.key) < currentIndex">✓</template>
            <template v-else>{{ phase.short }}</template>
          </div>
          <div class="phase-label">
            <span class="phase-label-text">{{ phase.label }}</span>
            <span v-if="phase.key === current" class="phase-label-cur">текущая</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Change phase select -->
    <div class="phase-footer" v-if="!readOnly">
      <select v-model="draft" class="phase-select" @change="save" :disabled="saving" title="Сменить фазу">
        <option v-for="p in phases" :key="p.key" :value="p.key">{{ p.label }}</option>
      </select>
      <span v-if="saved" class="phase-saved">✓</span>
    </div>

    <!-- Floating detail panel -->
    <Teleport to="body">
      <Transition name="phase-detail-slide">
        <div
          v-if="detailKey && detailPos"
          class="phase-detail-float"
          :style="detailPos"
          @click.stop
        >
          <AdminPhaseDetail :phaseKey="detailKey" @close="closeDetail" @navigate="onNavigate" />
        </div>
      </Transition>
    </Teleport>
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
  (e: 'navigate', page: string): void
}>()

const phases = PROJECT_PHASES
const draft = ref<ProjectStatus>(props.status as ProjectStatus || 'lead')
const saving = ref(false)
const saved = ref(false)
const detailKey = ref<string | null>(null)
const detailPos = ref<Record<string, string> | null>(null)
const wrapRef = ref<HTMLElement | null>(null)

watch(() => props.status, (v) => { if (v) draft.value = v as ProjectStatus })

const currentIndex = computed(() => phases.findIndex(p => p.key === draft.value))
const current = computed(() => draft.value)

function phaseIndex(key: string) {
  return phases.findIndex(p => p.key === key)
}

function toggleDetail(key: string) {
  if (detailKey.value === key) { closeDetail(); return }
  detailKey.value = key
  nextTick(() => {
    const wrap = wrapRef.value
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    detailPos.value = {
      position: 'fixed',
      left: (rect.right + 12) + 'px',
      top: Math.max(8, rect.top) + 'px',
      maxHeight: (window.innerHeight - Math.max(8, rect.top) - 16) + 'px',
      width: '420px',
      overflowY: 'auto',
      zIndex: '200',
      borderRadius: '12px',
      boxShadow: '0 12px 40px rgba(0,0,0,.18)',
    }
  })
}

function closeDetail() {
  detailKey.value = null
  detailPos.value = null
}

function onNavigate(page: string) {
  emit('navigate', page)
  closeDetail()
}

onMounted(() => document.addEventListener('click', onOutside))
onUnmounted(() => document.removeEventListener('click', onOutside))
function onOutside(e: MouseEvent) {
  const wrap = wrapRef.value
  if (wrap && wrap.contains(e.target as Node)) return
  const float = document.querySelector('.phase-detail-float')
  if (float && float.contains(e.target as Node)) return
  closeDetail()
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
  } catch (e) { console.error(e) }
  finally { saving.value = false }
}
</script>

<style scoped>
.phase-wrap { width: 130px; flex-shrink: 0; }

/* ── Vertical track ── */
.phase-track { display: flex; flex-direction: column; }

.phase-step {
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: opacity .15s;
}
.phase-step--future { opacity: .4; }
.phase-step:hover:not(.phase-step--future) { opacity: .75; }

/* vertical connector */
.phase-line {
  width: 2px;
  height: 14px;
  background: #ddd;
  margin-left: 13px;
  transition: background .2s;
}
.dark .phase-line { background: #333; }
.phase-line--done { background: #22c55e; }

/* row: dot + label */
.phase-row { display: flex; align-items: center; gap: 8px; padding: 2px 0; }

/* dot */
.phase-dot {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid #ddd; background: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: .68rem; font-weight: 700; color: #aaa;
  flex-shrink: 0; transition: all .2s;
}
.dark .phase-dot { border-color: #333; background: #151517; color: #666; }
.phase-step--done .phase-dot   { background: #22c55e; border-color: #22c55e; color: #fff; }
.phase-step--active .phase-dot { background: #6366f1; border-color: #6366f1; color: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,.22); }
.phase-step--open .phase-dot   { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,.28); }

/* label */
.phase-label { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.phase-label-text {
  font-size: .7rem; color: #999; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.phase-step--active .phase-label-text { color: #6366f1; font-weight: 600; }
.phase-step--done   .phase-label-text { color: #22c55e; }
.phase-step--open   .phase-label-text { color: #6366f1; }
.dark .phase-step--active .phase-label-text { color: #818cf8; }

.phase-label-cur { font-size: .58rem; color: #6366f1; font-weight: 500; }
.dark .phase-label-cur { color: #a5b4fc; }

/* Footer */
.phase-footer { margin-top: 12px; display: flex; align-items: center; gap: 5px; }
.phase-select {
  font-size: .67rem; padding: 3px 5px; border-radius: 5px;
  border: 1px solid #ddd; background: transparent; color: inherit;
  cursor: pointer; font-family: inherit; max-width: 118px;
}
.dark .phase-select { border-color: #333; background: #1e1e20; }
.phase-select:disabled { opacity: .5; }
.phase-saved { font-size: .68rem; color: #22c55e; font-weight: 600; }

/* slide animation */
.phase-detail-slide-enter-active,
.phase-detail-slide-leave-active { transition: opacity .15s, transform .15s; }
.phase-detail-slide-enter-from,
.phase-detail-slide-leave-to { opacity: 0; transform: translateX(-10px); }
</style>
