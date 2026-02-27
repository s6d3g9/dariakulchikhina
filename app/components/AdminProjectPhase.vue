<template>
  <div class="phase-wrap" ref="wrapRef">
    <!-- Vertical circles -->
    <div class="phase-track">
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
