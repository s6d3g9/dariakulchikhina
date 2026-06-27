<template>
  <GlassSurface class="caf-root">
    <div v-if="pending" class="caf-loading">
      <div v-for="index in 5" :key="index" class="caf-skeleton" />
    </div>

    <template v-else>
      <header class="caf-header">
        <div>
          <p class="caf-kicker">журнал проекта</p>
          <h2 class="caf-title">События и отчёты</h2>
        </div>
        <div class="caf-summary">
          <span class="caf-summary__item">
            <strong>{{ summary.total }}</strong>
            всего
          </span>
          <span class="caf-summary__item">
            <strong>{{ summary.documents }}</strong>
            документы
          </span>
          <span class="caf-summary__item">
            <strong>{{ summary.workItems }}</strong>
            работы
          </span>
          <span class="caf-summary__item">
            <strong>{{ summary.warnings }}</strong>
            внимание
          </span>
        </div>
      </header>

      <section class="caf-feed">
        <article
          v-for="item in items"
          :key="item.id"
          class="caf-item"
          :class="`caf-item--${item.tone}`"
        >
          <div class="caf-marker">
            <span>{{ kindIcon(item.kind) }}</span>
          </div>
          <div class="caf-content">
            <div class="caf-row">
              <span class="caf-pill" :class="`caf-pill--${item.tone}`">{{ kindLabel(item.kind) }}</span>
              <span class="caf-date">{{ formatDate(item.occurredAt) }}</span>
              <span class="caf-actor">{{ actorLabel(item.actor.role) }}</span>
            </div>
            <h3 class="caf-item__title">{{ item.title }}</h3>
            <p class="caf-item__summary">{{ item.summary }}</p>
            <p v-if="item.body" class="caf-item__body">{{ item.body }}</p>
          </div>
        </article>

        <div v-if="!items.length" class="caf-empty">
          События проекта пока не опубликованы
        </div>
      </section>
    </template>
  </GlassSurface>
</template>

<script setup lang="ts">
import type {
  ApiV1Envelope,
  ApiV1ProjectActivity,
  ApiV1ProjectActivityActorRole,
  ApiV1ProjectActivityKind,
} from '~~/shared/types/api-v1'

const props = defineProps<{ slug: string }>()
const reqHeaders = useRequestHeaders(['cookie'])

const { data: activityEnvelope, pending } = await useFetch<ApiV1Envelope<ApiV1ProjectActivity>>(
  () => `/api/v1/client/projects/${props.slug}/activity`,
  { headers: reqHeaders },
)

const fallbackSummary = {
  total: 0,
  documents: 0,
  extraServices: 0,
  workItems: 0,
  callInsights: 0,
  warnings: 0,
}

const activity = computed(() => activityEnvelope.value?.data || null)
const summary = computed(() => activity.value?.summary || fallbackSummary)
const items = computed(() => activity.value?.items || [])

function kindIcon(kind: ApiV1ProjectActivityKind) {
  const icons: Record<ApiV1ProjectActivityKind, string> = {
    document_created: '□',
    extra_service_requested: '+',
    extra_service_updated: '◐',
    work_item_comment: '◌',
    work_item_status: '◉',
    call_insight: '◇',
  }
  return icons[kind] || '•'
}

function kindLabel(kind: ApiV1ProjectActivityKind) {
  const labels: Record<ApiV1ProjectActivityKind, string> = {
    document_created: 'документ',
    extra_service_requested: 'услуга',
    extra_service_updated: 'услуга',
    work_item_comment: 'комментарий',
    work_item_status: 'работы',
    call_insight: 'коммуникация',
  }
  return labels[kind] || kind
}

function actorLabel(role: ApiV1ProjectActivityActorRole) {
  if (role === 'client') return 'клиент'
  if (role === 'contractor' || role === 'worker') return 'исполнитель'
  if (role === 'admin' || role === 'studio') return 'студия'
  return 'система'
}

function formatDate(value: string) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}
</script>

<style scoped>
.caf-root {
  display: grid;
  gap: 18px;
  padding: 18px;
  color: var(--glass-text);
}

.caf-loading,
.caf-feed,
.caf-content {
  display: grid;
}

.caf-loading,
.caf-feed {
  gap: 10px;
}

.caf-skeleton {
  min-height: 76px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 5%, var(--glass-bg));
  animation: caf-pulse 1.4s infinite ease-in-out;
}

@keyframes caf-pulse {
  0%, 100% { opacity: .42; }
  50% { opacity: .72; }
}

.caf-header,
.caf-summary,
.caf-item,
.caf-row {
  display: flex;
}

.caf-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.caf-kicker,
.caf-date,
.caf-actor,
.caf-pill,
.caf-summary__item {
  letter-spacing: 0;
}

.caf-kicker {
  margin: 0 0 4px;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.caf-title {
  margin: 0;
  font-size: 1.14rem;
  font-weight: 650;
  color: color-mix(in srgb, var(--glass-text) 88%, transparent);
}

.caf-summary {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.caf-summary__item {
  display: inline-grid;
  min-width: 76px;
  min-height: 52px;
  place-items: center;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg));
  font-size: .7rem;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
  text-align: center;
}

.caf-summary__item strong {
  font-size: 1.08rem;
  color: color-mix(in srgb, var(--glass-text) 86%, transparent);
}

.caf-feed {
  padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.caf-item {
  position: relative;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg));
}

.caf-marker {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  color: color-mix(in srgb, var(--glass-text) 76%, transparent);
}

.caf-content {
  min-width: 0;
  gap: 7px;
}

.caf-row {
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.caf-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 62%, transparent);
}

.caf-pill--success {
  border-color: color-mix(in srgb, var(--ds-success) 34%, transparent);
  color: color-mix(in srgb, var(--ds-success) 70%, var(--glass-text));
}

.caf-pill--warning,
.caf-pill--critical {
  border-color: color-mix(in srgb, var(--ds-warning) 38%, transparent);
  color: color-mix(in srgb, var(--ds-warning) 74%, var(--glass-text));
}

.caf-date,
.caf-actor {
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 48%, transparent);
}

.caf-item__title {
  margin: 0;
  font-size: .94rem;
  font-weight: 650;
  color: color-mix(in srgb, var(--glass-text) 86%, transparent);
}

.caf-item__summary,
.caf-item__body {
  margin: 0;
  font-size: .82rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--glass-text) 64%, transparent);
}

.caf-item__body {
  white-space: pre-line;
  color: color-mix(in srgb, var(--glass-text) 52%, transparent);
}

.caf-empty {
  padding: 26px 16px;
  border: 1px dashed color-mix(in srgb, var(--glass-text) 16%, transparent);
  border-radius: 8px;
  color: color-mix(in srgb, var(--glass-text) 48%, transparent);
  text-align: center;
}

@media (max-width: 720px) {
  .caf-root {
    padding: 14px;
  }

  .caf-header {
    display: grid;
  }

  .caf-summary {
    justify-content: stretch;
  }

  .caf-summary__item {
    min-width: 0;
    flex: 1 1 120px;
  }
}
</style>
