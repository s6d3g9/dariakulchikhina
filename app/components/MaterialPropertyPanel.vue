<template>
  <div v-if="hasAnyData" class="mpp-wrap">
    <!-- Табы групп свойств -->
    <div class="mpp-tabs" role="tablist">
      <button
        v-for="group in visibleGroups"
        :key="group.key"
        class="mpp-tab"
        :class="{ 'mpp-tab--active': activeTab === group.key }"
        role="tab"
        :aria-selected="activeTab === group.key"
        @click="activeTab = group.key"
      >
        <span class="mpp-tab-icon" v-html="groupIcons[group.key]" />
        <span class="mpp-tab-label">{{ group.label }}</span>
      </button>
    </div>

    <!-- Содержимое активного таба -->
    <Transition name="mpp-fade" mode="out-in">
      <div :key="activeTab" class="mpp-content">

        <!-- Обычные группы свойств (key-value) -->
        <template v-if="activeTab !== 'certifications'">
          <div class="mpp-grid">
            <div
              v-for="field in activeFields"
              :key="field.key"
              class="mpp-field"
              :class="{ 'mpp-field--bool': field.type === 'boolean', 'mpp-field--array': field.type === 'array' }"
            >
              <span class="mpp-field-label">{{ field.label }}</span>
              <!-- Boolean -->
              <span v-if="field.type === 'boolean'" class="mpp-field-value mpp-field-value--bool">
                <span :class="field.value ? 'mpp-bool-yes' : 'mpp-bool-no'">{{ field.value ? 'да' : 'нет' }}</span>
              </span>
              <!-- Array (zones, colors, etc.) -->
              <div v-else-if="field.type === 'array'" class="mpp-chips">
                <span v-for="(v, i) in field.value" :key="i" class="mpp-chip">
                  <span
                    v-if="isColor(v)"
                    class="mpp-color-dot"
                    :style="{ background: v }"
                  />
                  {{ v }}
                </span>
              </div>
              <!-- String/number -->
              <span v-else class="mpp-field-value">{{ field.value }}</span>
            </div>
          </div>
        </template>

        <!-- Сертификаты -->
        <template v-else>
          <div v-if="properties?.certifications?.length" class="mpp-certs">
            <div v-for="(cert, i) in properties.certifications" :key="i" class="mpp-cert">
              <div class="mpp-cert-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div class="mpp-cert-info">
                <span class="mpp-cert-name">{{ cert.name }}</span>
                <span v-if="cert.number" class="mpp-cert-num">№ {{ cert.number }}</span>
                <span v-if="cert.validUntil" class="mpp-cert-date">до {{ cert.validUntil }}</span>
              </div>
              <a
                v-if="cert.document"
                :href="`/uploads/${cert.document}`"
                target="_blank"
                class="mpp-cert-doc"
                title="Скачать документ"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
            </div>
          </div>
          <div v-else class="mpp-empty">нет сертификатов</div>
        </template>

        <!-- Пользовательские группы -->
        <template v-if="activeTab !== 'certifications' && hasCustom">
          <div v-for="cg in properties?.custom" :key="cg.groupName" class="mpp-custom-group">
            <h4 class="mpp-custom-title">{{ cg.groupName }}</h4>
            <div class="mpp-grid">
              <div v-for="item in cg.items" :key="item.label" class="mpp-field">
                <span class="mpp-field-label">{{ item.label }}</span>
                <span class="mpp-field-value">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Заметки -->
        <p v-if="properties?.notes && activeTab === visibleGroups[visibleGroups.length - 1]?.key" class="mpp-notes">
          {{ properties.notes }}
        </p>
      </div>
    </Transition>

    <!-- Коммерческая мини-строка (всегда видна внизу если есть данные) -->
    <div v-if="commercialSummary" class="mpp-commercial-bar">
      <span v-if="properties?.commercial?.manufacturer" class="mpp-comm-item">
        {{ properties.commercial.manufacturer }}
        <template v-if="properties.commercial.collection"> · {{ properties.commercial.collection }}</template>
      </span>
      <span v-if="properties?.commercial?.article" class="mpp-comm-item mpp-comm-article">
        арт. {{ properties.commercial.article }}
      </span>
      <span v-if="properties?.commercial?.pricePerUnit" class="mpp-comm-price">
        {{ properties.commercial.pricePerUnit }}
      </span>
      <span
        v-if="properties?.commercial?.availability"
        class="mpp-comm-avail"
        :class="`mpp-comm-avail--${properties.commercial.availability}`"
      >
        {{ availabilityLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MaterialProperties, MaterialPropertyGroupKey } from '~~/shared/types/material'
import { MATERIAL_PROPERTY_GROUPS, MATERIAL_FIELD_LABELS } from '~~/shared/types/material'

const props = defineProps<{
  properties?: MaterialProperties | null
}>()

const activeTab = ref<string>('' as string)

// Определяем какие группы свойств имеют данные
const visibleGroups = computed(() => {
  if (!props.properties) return []
  return MATERIAL_PROPERTY_GROUPS.filter((g) => {
    const data = props.properties?.[g.key as keyof MaterialProperties]
    if (!data) return false
    if (g.key === 'certifications') return Array.isArray(data) && data.length > 0
    if (typeof data === 'object') return Object.values(data).some((v) => v !== undefined && v !== null && v !== '')
    return false
  })
})

const hasAnyData = computed(() => visibleGroups.value.length > 0)
const hasCustom = computed(() => (props.properties?.custom?.length ?? 0) > 0)

// Авто-выбор первого таба
watch(visibleGroups, (groups) => {
  if (groups.length && !groups.find((g) => g.key === activeTab.value)) {
    activeTab.value = groups[0].key
  }
}, { immediate: true })

// Коммерческая строка
const commercialSummary = computed(() => {
  const c = props.properties?.commercial
  return c && (c.manufacturer || c.pricePerUnit || c.availability)
})

const availabilityLabel = computed(() => {
  const a = props.properties?.commercial?.availability
  if (a === 'in-stock') return 'в наличии'
  if (a === 'to-order') return 'под заказ'
  if (a === 'discontinued') return 'снято'
  return a || ''
})

// Поля текущего активного таба
const activeFields = computed(() => {
  if (!props.properties || activeTab.value === 'certifications') return []
  const groupData = props.properties[activeTab.value as keyof MaterialProperties] as Record<string, unknown> | undefined
  if (!groupData || typeof groupData !== 'object') return []
  const labels = MATERIAL_FIELD_LABELS[activeTab.value] || {}
  return Object.entries(groupData)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({
      key,
      label: labels[key] || key,
      value,
      type: typeof value === 'boolean' ? 'boolean' : Array.isArray(value) ? 'array' : 'string',
    }))
})

function isColor(v: unknown): boolean {
  if (typeof v !== 'string') return false
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^(rgb|hsl)/i.test(v)
}

// Иконки для табов (inline SVG)
const groupIcons: Record<string, string> = {
  physical: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16"/><path d="M12 4v16"/></svg>',
  tactile: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
  chemical: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/></svg>',
  visual: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  performance: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>',
  application: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  commercial: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  certifications: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
}
</script>

<style scoped>
.mpp-wrap {
  font-family: inherit;
  font-size: .85rem;
  color: var(--glass-text, #e0e0e0);
}

/* ── Табы ──────────────────────────────────────────── */
.mpp-tabs {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border, #333) 60%, transparent);
  scrollbar-width: none;
}
.mpp-tabs::-webkit-scrollbar { display: none; }

.mpp-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 55%, transparent);
  font-size: .78rem;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  border-radius: 6px 6px 0 0;
  transition: all .15s;
}
.mpp-tab:hover {
  color: var(--glass-text, #e0e0e0);
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 50%, transparent);
}
.mpp-tab--active {
  color: var(--glass-text, #e0e0e0);
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 70%, transparent);
  border-bottom: 2px solid color-mix(in srgb, var(--glass-text, #e0e0e0) 40%, #667eea);
}

.mpp-tab-icon { display: flex; align-items: center; opacity: .7; }
.mpp-tab--active .mpp-tab-icon { opacity: 1; }

/* ── Контент ──────────────────────────────────────── */
.mpp-content {
  padding: 12px 0;
  min-height: 80px;
}

.mpp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px 16px;
}

/* ── Поля ─────────────────────────────────────────── */
.mpp-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border, #333) 30%, transparent);
}
.mpp-field--array { grid-column: 1 / -1; }

.mpp-field-label {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .4px;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 45%, transparent);
  font-weight: 500;
}
.mpp-field-value {
  font-size: .84rem;
  color: var(--glass-text, #e0e0e0);
  font-weight: 400;
}
.mpp-field-value--bool { display: flex; gap: 6px; align-items: center; }

.mpp-bool-yes {
  color: #4ade80;
  font-weight: 500;
}
.mpp-bool-no {
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 40%, transparent);
}

/* ── Chips (zones, colors) ────────────────────────── */
.mpp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}
.mpp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-border, #333) 40%, transparent);
  font-size: .76rem;
  color: var(--glass-text, #e0e0e0);
}

.mpp-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--glass-border, #333) 50%, transparent);
  flex-shrink: 0;
}

/* ── Сертификаты ──────────────────────────────────── */
.mpp-certs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mpp-cert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 40%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-border, #333) 30%, transparent);
}
.mpp-cert-icon { opacity: .5; display: flex; }
.mpp-cert-info { flex: 1; display: flex; flex-wrap: wrap; gap: 4px 12px; }
.mpp-cert-name { font-weight: 500; font-size: .82rem; }
.mpp-cert-num { color: color-mix(in srgb, var(--glass-text, #e0e0e0) 55%, transparent); font-size: .78rem; }
.mpp-cert-date { color: color-mix(in srgb, var(--glass-text, #e0e0e0) 45%, transparent); font-size: .74rem; }
.mpp-cert-doc {
  display: flex;
  padding: 4px;
  color: var(--glass-text, #e0e0e0);
  opacity: .5;
  transition: opacity .15s;
}
.mpp-cert-doc:hover { opacity: 1; }

/* ── Custom groups ────────────────────────────────── */
.mpp-custom-group {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed color-mix(in srgb, var(--glass-border, #333) 40%, transparent);
}
.mpp-custom-title {
  font-size: .78rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .3px;
  margin-bottom: 8px;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 60%, transparent);
}

/* ── Заметки ──────────────────────────────────────── */
.mpp-notes {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 30%, transparent);
  font-size: .8rem;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 70%, transparent);
  font-style: italic;
  line-height: 1.5;
}

/* ── Commercial bar ───────────────────────────────── */
.mpp-commercial-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  padding: 8px 12px;
  margin-top: 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 50%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-border, #333) 30%, transparent);
  font-size: .78rem;
}
.mpp-comm-item {
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 70%, transparent);
}
.mpp-comm-article {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: .74rem;
}
.mpp-comm-price {
  font-weight: 600;
  color: var(--glass-text, #e0e0e0);
  margin-left: auto;
}
.mpp-comm-avail {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: .72rem;
  font-weight: 500;
}
.mpp-comm-avail--in-stock { background: #16a34a20; color: #4ade80; }
.mpp-comm-avail--to-order { background: #eab30820; color: #fbbf24; }
.mpp-comm-avail--discontinued { background: #ef444420; color: #f87171; }

/* ── Переходы ─────────────────────────────────────── */
.mpp-fade-enter-active, .mpp-fade-leave-active { transition: opacity .15s, transform .15s; }
.mpp-fade-enter-from { opacity: 0; transform: translateY(4px); }
.mpp-fade-leave-to { opacity: 0; transform: translateY(-4px); }

.mpp-empty {
  padding: 20px;
  text-align: center;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 35%, transparent);
  font-size: .82rem;
}
</style>
