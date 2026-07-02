<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Entity, EntityFieldValue, EntitySection } from '@daria/shell-panels/entity'

const props = defineProps<{
  entity: Entity
}>()

const emit = defineEmits<{
  (event: 'toggle-view'): void
}>()

const openAccordionIndex = ref<number | null>(null)

watch(
  () => [props.entity.id, props.entity.view],
  () => {
    openAccordionIndex.value = null
  },
)

function valueText(value: EntityFieldValue['value'] | undefined): string {
  return value === null || value === undefined ? '—' : String(value)
}

function fieldText(field: EntityFieldValue): string {
  return valueText(field.value)
}

function sectionKey(section: EntitySection, index: number): string {
  return `${section.key}-${section.role}-${index}`
}

function headerTitle(section: EntitySection): string {
  const preferredField = section.fields.find(field => field.key === 'title' || field.key === 'name')
    ?? section.fields[0]

  return valueText(preferredField?.value ?? props.entity.title)
}

function headerSubtitle(section: EntitySection): string {
  const preferredField = section.fields.find(field => ['subtitle', 'role', 'status', 'category'].includes(field.key))
    ?? section.fields.find(field => field.value !== null && !['title', 'name', 'avatar', 'logo'].includes(field.key))

  return valueText(preferredField?.value ?? props.entity.subtitle ?? section.title)
}

function viewClass(): string {
  return props.entity.view === 'type' ? 'view-badge-type' : 'view-badge-instance'
}

function toggleAccordion(index: number): void {
  openAccordionIndex.value = openAccordionIndex.value === index ? null : index
}

function isAccordionOpen(index: number): boolean {
  return openAccordionIndex.value === index
}

function accordionPanelId(index: number): string {
  return `entity-card-accordion-${props.entity.id}-${props.entity.view}-${index}`
}
</script>

<template>
  <article class="entity-card" data-testid="entity-card">
    <section
      v-for="(section, sectionIndex) in entity.sections"
      :key="sectionKey(section, sectionIndex)"
      class="entity-section"
      :class="`entity-section-${section.key}`"
      :data-section-key="section.key"
      :data-section-role="section.role"
      data-testid="entity-section"
    >
      <template v-if="section.key === 'header'">
        <header class="identity-header">
          <div class="identity-copy">
            <p class="section-kicker">
              {{ section.title }}
            </p>
            <h1>{{ headerTitle(section) }}</h1>
            <p class="identity-subtitle">
              {{ headerSubtitle(section) }}
            </p>
          </div>
          <div class="identity-actions">
            <span class="view-badge" :class="viewClass()" data-testid="entity-card-view-badge">
              {{ entity.view }}
            </span>
            <button
              class="invert-button"
              type="button"
              aria-label="Переключить view"
              data-testid="entity-card-toggle-view"
              @click="emit('toggle-view')"
            >
              ⇄
            </button>
          </div>
        </header>

        <dl class="identity-fields">
          <div
            v-for="field in section.fields"
            :key="field.key"
            class="identity-field"
            :data-field-key="field.key"
          >
            <dt>{{ field.label }}</dt>
            <dd>{{ fieldText(field) }}</dd>
          </div>
        </dl>
      </template>

      <template v-else-if="section.key === 'timeline'">
        <h2>{{ section.title }}</h2>
        <ol class="timeline-row">
          <li
            v-for="field in section.fields"
            :key="field.key"
            class="timeline-item"
            :data-field-key="field.key"
          >
            <span class="timeline-dot" aria-hidden="true" />
            <span class="timeline-copy">
              <strong>{{ fieldText(field) }}</strong>
              <span>{{ field.label }}</span>
            </span>
          </li>
        </ol>
      </template>

      <template v-else-if="section.key === 'summary'">
        <h2>{{ section.title }}</h2>
        <dl class="metric-grid">
          <div
            v-for="field in section.fields"
            :key="field.key"
            class="metric-tile"
            :data-field-key="field.key"
          >
            <dt>{{ field.label }}</dt>
            <dd>{{ fieldText(field) }}</dd>
          </div>
        </dl>
      </template>

      <template v-else-if="section.key === 'actions'">
        <h2>{{ section.title }}</h2>
        <div class="action-row">
          <button
            v-for="field in section.fields"
            :key="field.key"
            class="action-chip"
            type="button"
            disabled
            :data-field-key="field.key"
          >
            {{ fieldText(field) }}
          </button>
        </div>
      </template>

      <template v-else-if="section.key === 'sections'">
        <h2>{{ section.title }}</h2>
        <div class="accordion-list">
          <div
            v-for="(field, fieldIndex) in section.fields"
            :key="field.key"
            class="accordion-item"
            :class="{ 'accordion-item-open': isAccordionOpen(fieldIndex) }"
            :data-field-key="field.key"
          >
            <button
              class="accordion-trigger"
              type="button"
              :aria-expanded="isAccordionOpen(fieldIndex)"
              :aria-controls="accordionPanelId(fieldIndex)"
              data-testid="entity-card-accordion-trigger"
              @click="toggleAccordion(fieldIndex)"
            >
              <span>{{ field.label }}</span>
              <span class="accordion-value">{{ fieldText(field) }}</span>
              <span class="accordion-chevron" aria-hidden="true">
                {{ isAccordionOpen(fieldIndex) ? '⌃' : '⌄' }}
              </span>
            </button>
            <div
              v-if="isAccordionOpen(fieldIndex)"
              :id="accordionPanelId(fieldIndex)"
              class="accordion-panel"
              data-testid="entity-card-accordion-panel"
            >
              <p>{{ fieldText(field) }}</p>
              <p>данные раздела появятся с World Model API</p>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="section.key === 'footer'">
        <h2>{{ section.title }}</h2>
        <dl class="footer-chip-row">
          <div
            v-for="field in section.fields"
            :key="field.key"
            class="footer-chip"
            :data-field-key="field.key"
          >
            <dt>{{ field.label }}</dt>
            <dd>{{ fieldText(field) }}</dd>
          </div>
        </dl>
      </template>

      <template v-else>
        <h2>{{ section.title }}</h2>
        <dl class="field-list">
          <div
            v-for="field in section.fields"
            :key="field.key"
            class="field-row"
            :data-field-key="field.key"
          >
            <dt>{{ field.label }}</dt>
            <dd>{{ fieldText(field) }}</dd>
          </div>
        </dl>
      </template>
    </section>
  </article>
</template>

<style scoped>
.entity-card {
  overflow: hidden;
  border: 1px solid #d2d8e0;
  border-radius: 12px;
  background: #ffffff;
  color: #22272f;
}

.entity-section {
  padding: 16px;
}

.entity-section + .entity-section {
  border-top: 1px solid #e4e8ee;
}

.entity-section h2,
.entity-section h1,
.entity-section p,
.entity-section dl,
.entity-section dd {
  margin: 0;
}

.entity-section h2 {
  margin-bottom: 12px;
  color: #303640;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.identity-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.identity-copy {
  min-width: 0;
}

.section-kicker {
  color: #69727f;
  font-size: 12px;
  line-height: 1.3;
}

.identity-copy h1 {
  margin-top: 4px;
  font-size: 22px;
  line-height: 1.18;
}

.identity-subtitle {
  margin-top: 6px;
  color: #4e5967;
  font-size: 14px;
  line-height: 1.4;
}

.identity-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.view-badge {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  padding: 0 10px;
}

.view-badge-instance {
  border-color: #9ad4af;
  background: #e8f7ee;
  color: #1f7a3f;
}

.view-badge-type {
  border-color: #c5afe9;
  background: #f1eafa;
  color: #6f3db6;
}

.invert-button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid #c7d0da;
  border-radius: 50%;
  background: #ffffff;
  color: #22272f;
  cursor: pointer;
  font: inherit;
  font-size: 18px;
  line-height: 1;
}

.identity-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.identity-field,
.metric-tile,
.field-row {
  min-width: 0;
  border: 1px solid #e1e6ec;
  border-radius: 8px;
  background: #fbfcfd;
  padding: 10px;
}

.identity-field dt,
.metric-tile dt,
.footer-chip dt,
.field-row dt {
  color: #69727f;
  font-size: 12px;
  line-height: 1.25;
}

.identity-field dd,
.field-row dd {
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.35;
}

.timeline-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.timeline-item {
  display: flex;
  min-width: 150px;
  flex: 1 1 0;
  align-items: flex-start;
  gap: 8px;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: #3a6ea5;
  margin-top: 5px;
}

.timeline-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.timeline-copy strong {
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.3;
}

.timeline-copy span {
  color: #69727f;
  font-size: 12px;
  line-height: 1.25;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.metric-tile dd {
  margin-top: 6px;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-chip {
  min-height: 34px;
  border: 1px solid #d3d9e1;
  border-radius: 999px;
  background: #eef2f6;
  color: #586273;
  cursor: not-allowed;
  font: inherit;
  font-size: 13px;
  line-height: 1.2;
  padding: 0 12px;
}

.accordion-list {
  display: grid;
  overflow: hidden;
  border: 1px solid #e0e5eb;
  border-radius: 8px;
}

.accordion-item + .accordion-item {
  border-top: 1px solid #e0e5eb;
}

.accordion-trigger {
  display: grid;
  width: 100%;
  min-height: 42px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  border: 0;
  background: #ffffff;
  color: #22272f;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1.3;
  padding: 0 12px;
  text-align: left;
}

.accordion-item-open .accordion-trigger {
  background: #f7f9fb;
}

.accordion-value {
  color: #69727f;
  font-size: 12px;
}

.accordion-chevron {
  color: #4e5967;
  font-size: 16px;
  line-height: 1;
}

.accordion-panel {
  display: grid;
  gap: 6px;
  border-top: 1px solid #e0e5eb;
  background: #fbfcfd;
  padding: 12px;
}

.accordion-panel p {
  overflow-wrap: anywhere;
  color: #4e5967;
  font-size: 13px;
  line-height: 1.4;
}

.accordion-panel p:first-child {
  color: #22272f;
  font-weight: 700;
}

.footer-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.footer-chip {
  display: inline-grid;
  gap: 2px;
  max-width: 100%;
  border: 1px solid #d8dde4;
  border-radius: 999px;
  background: #f1f3f5;
  padding: 7px 10px;
}

.footer-chip dd {
  overflow-wrap: anywhere;
  color: #4e5967;
  font-size: 12px;
  line-height: 1.2;
}

.field-list {
  display: grid;
  gap: 8px;
}
</style>
