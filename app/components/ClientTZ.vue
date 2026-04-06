<template>
  <GlassSurface  class="ctz-wrap ">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else-if="hasTZ">

      <!-- ── Содержание ТЗ ── -->
      <div class="ctz-section" :class="{ 'ctz-section--expanded': isSectionExpanded('tz') }">
        <div class="ctz-section-head">
          <button type="button" class="ctz-section-toggle" :aria-expanded="isSectionExpanded('tz') ? 'true' : 'false'" @click="toggleSection('tz')">
            <span class="ctz-section-title">содержание технического задания</span>
            <span class="ctz-section-chevron" :class="{ 'ctz-section-chevron--expanded': isSectionExpanded('tz') }">⌄</span>
          </button>
        </div>
        <div v-show="isSectionExpanded('tz')" class="ctz-section-panel">
        <div class="ass-upload-zone">
          <div v-if="profile.tor_scope" class="u-field">
            <span class="u-field__label">Объём работ</span>
            <span class="ctz-val ctz-val--pre">{{ profile.tor_scope }}</span>
          </div>
          <div v-if="profile.tor_exclusions" class="u-field">
            <span class="u-field__label">Исключения</span>
            <span class="ctz-val ctz-val--pre">{{ profile.tor_exclusions }}</span>
          </div>
          <div v-if="profile.tor_timeline" class="u-field">
            <span class="u-field__label">Сроки проектирования</span>
            <span class="ctz-val">{{ profile.tor_timeline }}</span>
          </div>
          <div v-if="profile.tor_deliverables" class="u-field">
            <span class="u-field__label">Формат результата</span>
            <span class="ctz-val ctz-val--pre">{{ profile.tor_deliverables }}</span>
          </div>
        </div>
        </div>
      </div>

      <!-- ── Договор (если есть) ── -->
      <div v-if="hasContract" class="ctz-section" :class="{ 'ctz-section--expanded': isSectionExpanded('contract') }">
        <div class="ctz-section-head">
          <button type="button" class="ctz-section-toggle" :aria-expanded="isSectionExpanded('contract') ? 'true' : 'false'" @click="toggleSection('contract')">
            <span class="ctz-section-title">договор</span>
            <span class="ctz-section-chevron" :class="{ 'ctz-section-chevron--expanded': isSectionExpanded('contract') }">⌄</span>
          </button>
        </div>
        <div v-show="isSectionExpanded('contract')" class="ctz-section-panel">
        <div class="ass-upload-zone">
          <div v-if="profile.contract_number" class="u-field">
            <span class="u-field__label">Номер</span>
            <span class="ctz-val">{{ profile.contract_number }}</span>
          </div>
          <div v-if="profile.contract_date" class="u-field">
            <span class="u-field__label">Дата</span>
            <span class="ctz-val">{{ fmtDate(profile.contract_date) }}</span>
          </div>
          <div v-if="profile.contract_status" class="u-field">
            <span class="u-field__label">Статус</span>
            <span class="ctz-badge" :class="`ctz-badge--${profile.contract_status}`">{{ contractStatusLabel }}</span>
          </div>
          <div v-if="profile.contract_parties" class="u-field">
            <span class="u-field__label">Стороны договора</span>
            <span class="ctz-val">{{ profile.contract_parties }}</span>
          </div>
          <div v-if="profile.contract_notes" class="u-field">
            <span class="u-field__label">Примечания</span>
            <span class="ctz-val ctz-val--pre">{{ profile.contract_notes }}</span>
          </div>
        </div>
        <div v-if="profile.contract_file" class="ctz-download">
          <a :href="profile.contract_file" target="_blank" class="ctz-download-btn">↓ Скачать договор</a>
        </div>
        </div>
      </div>

    </template>
    <div v-else class="ctz-empty">Техническое задание ещё не заполнено</div>
  </GlassSurface>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const reqHeaders = useRequestHeaders(['cookie'])
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`, { headers: reqHeaders })

const profile = computed(() => (project.value?.profile || {}) as Record<string, any>)

type ClientTzSectionKey = 'tz' | 'contract'

const expandedSectionKey = ref<ClientTzSectionKey | null>('tz')

function isSectionExpanded(sectionKey: ClientTzSectionKey) {
  return expandedSectionKey.value === sectionKey
}

function toggleSection(sectionKey: ClientTzSectionKey) {
  expandedSectionKey.value = expandedSectionKey.value === sectionKey ? null : sectionKey
}

const hasTZ = computed(() =>
  !!(profile.value.tor_scope || profile.value.tor_exclusions || profile.value.tor_timeline || profile.value.tor_deliverables
    || profile.value.contract_number || profile.value.contract_file),
)

const hasContract = computed(() =>
  !!(profile.value.contract_number || profile.value.contract_date || profile.value.contract_file),
)

const contractStatusLabel = computed(() => {
  const map: Record<string, string> = { draft: 'черновик', sent: 'отправлен', signed: 'подписан', rejected: 'отклонён' }
  return map[profile.value.contract_status] || profile.value.contract_status || ''
})

function fmtDate(val: string | null | undefined): string {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<style scoped>
.ctz-wrap { padding: 16px; }
.ctz-loading { font-size: .85rem; color: var(--ds-muted, #999); }
.ctz-empty { font-size: .85rem; color: var(--ds-muted, #999); padding: 20px 0; }

.ctz-section {
  margin-bottom: 18px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 92%, transparent);
  overflow: hidden;
}
.ctz-section-head {
  display: flex;
  align-items: stretch;
}
.ctz-section--expanded .ctz-section-head {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.ctz-section-toggle {
  width: 100%;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.ctz-section-toggle:hover {
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}
.ctz-section-title {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--glass-text);
  opacity: .45;
}
.ctz-section-chevron {
  flex-shrink: 0;
  font-size: 1rem;
  line-height: 1;
  color: color-mix(in srgb, var(--glass-text) 38%, transparent);
  transition: transform .18s ease, color .18s ease;
}
.ctz-section-chevron--expanded {
  transform: rotate(180deg);
  color: var(--glass-text);
}
.ctz-section-panel {
  padding: 16px 18px 18px;
}

.ctz-section-panel .ass-upload-zone {
  gap: 12px;
}

.ctz-section-panel .u-field {
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.ctz-val { font-size: .88rem; color: var(--glass-text); line-height: 1.5; }
.ctz-val--pre { white-space: pre-wrap; }

.ctz-badge {
  display: inline-block; font-size: .66rem; letter-spacing: .4px; text-transform: uppercase;
  padding: 2px 10px; border-radius: 999px; width: fit-content;
  background: var(--glass-bg); color: var(--glass-text); opacity: .6;
}
.ctz-badge--signed { color: var(--ds-success, #16a34a); background: color-mix(in srgb, var(--ds-success, #16a34a) 8%, transparent); opacity: 1; }
.ctz-badge--sent   { color: var(--phase-blue, #2563eb); background: color-mix(in srgb, var(--phase-blue, #2563eb) 8%, transparent); opacity: 1; }
.ctz-badge--rejected { color: var(--ds-error, #dc2626); background: color-mix(in srgb, var(--ds-error, #dc2626) 8%, transparent); opacity: 1; }

.ctz-download { margin-top: 12px; }
.ctz-download-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .8rem; text-decoration: none;
  color: var(--glass-page-bg); background: var(--glass-text);
  padding: 6px 14px; border-radius: 8px;
  transition: opacity .15s;
}
.ctz-download-btn:hover { opacity: .8; }
</style>
