<template>
  <GlassSurface class="cap-root">
    <div v-if="pending" class="cap-loading">
      <div v-for="index in 4" :key="index" class="cap-skeleton" />
    </div>

    <template v-else>
      <header class="cap-header">
        <div>
          <p class="cap-kicker">согласования</p>
          <h2 class="cap-title">Решения проекта</h2>
        </div>
        <div class="cap-summary">
          <span class="cap-summary__item">
            <strong>{{ summary.pendingCount }}</strong>
            ждёт ответа
          </span>
          <span class="cap-summary__item">
            <strong>{{ summary.approvedCount }}</strong>
            принято
          </span>
          <span class="cap-summary__item">
            <strong>{{ summary.rejectedCount + summary.changesRequestedCount }}</strong>
            с правками
          </span>
        </div>
      </header>

      <section class="cap-section">
        <div class="cap-section__head">
          <div>
            <div class="cap-section__title">На согласовании</div>
            <div class="cap-section__meta">{{ pendingMeta }}</div>
          </div>
        </div>

        <div v-if="pendingItems.length" class="cap-list">
          <article
            v-for="item in pendingItems"
            :key="item.id"
            class="cap-item"
            :class="`cap-item--${item.awaiting}`"
          >
            <div class="cap-item__main">
              <div class="cap-row">
                <span class="cap-pill" :class="`cap-pill--${item.awaiting}`">{{ item.statusLabel }}</span>
                <span v-if="item.dueDate" class="cap-date" :class="{ 'cap-date--overdue': isOverdue(item.dueDate) }">
                  {{ formatDate(item.dueDate) }}
                </span>
              </div>
              <h3 class="cap-item__title">{{ item.title }}</h3>
              <p v-if="item.summary" class="cap-item__text">{{ item.summary }}</p>
              <div class="cap-tags">
                <span class="cap-tag">{{ kindLabel(item.kind) }}</span>
                <span class="cap-tag">{{ item.sourceLabel }}</span>
                <span v-if="item.blocking" class="cap-tag cap-tag--warning">блокирует этап</span>
              </div>
            </div>

            <button
              type="button"
              class="cap-open"
              @click="openSource(item.sourceUrl || item.scopeRef.href)"
            >
              открыть
            </button>
          </article>
        </div>
        <div v-else class="cap-empty">Нет активных согласований</div>
      </section>

      <section class="cap-section">
        <div class="cap-section__head">
          <div>
            <div class="cap-section__title">История решений</div>
            <div class="cap-section__meta">{{ historyMeta }}</div>
          </div>
        </div>

        <div v-if="historyItems.length" class="cap-list cap-list--history">
          <article
            v-for="item in historyItems"
            :key="item.id"
            class="cap-item cap-item--history"
          >
            <div class="cap-item__main">
              <div class="cap-row">
                <span class="cap-pill" :class="`cap-pill--${item.decision}`">{{ item.decisionLabel }}</span>
                <span v-if="item.decidedAt" class="cap-date">{{ formatDate(item.decidedAt) }}</span>
              </div>
              <h3 class="cap-item__title">{{ item.title }}</h3>
              <p v-if="item.summary" class="cap-item__text">{{ item.summary }}</p>
              <div class="cap-tags">
                <span class="cap-tag">{{ kindLabel(item.kind) }}</span>
                <span class="cap-tag">{{ item.sourceLabel }}</span>
                <span class="cap-tag">{{ actorLabel(item.decidedBy.role) }}</span>
              </div>
            </div>

            <button
              type="button"
              class="cap-open cap-open--ghost"
              @click="openSource(item.sourceUrl || item.scopeRef.href)"
            >
              открыть
            </button>
          </article>
        </div>
        <div v-else class="cap-empty">История пока пустая</div>
      </section>
    </template>
  </GlassSurface>
</template>

<script setup lang="ts">
import type {
  ApiV1ClientApprovalActor,
  ApiV1ClientApprovalKind,
  ApiV1ClientProjectApprovals,
  ApiV1Envelope,
} from '~~/shared/types/api-v1'

const props = defineProps<{ slug: string }>()
const router = useRouter()
const reqHeaders = useRequestHeaders(['cookie'])

const { data: approvalsEnvelope, pending } = await useFetch<ApiV1Envelope<ApiV1ClientProjectApprovals>>(
  () => `/api/v1/client/projects/${props.slug}/approvals`,
  { headers: reqHeaders },
)

const fallbackSummary = {
  total: 0,
  pendingCount: 0,
  overdueCount: 0,
  awaitingClient: 0,
  awaitingStudio: 0,
  approvedCount: 0,
  changesRequestedCount: 0,
  rejectedCount: 0,
  lastDecisionAt: '',
}

const approvals = computed(() => approvalsEnvelope.value?.data || null)
const summary = computed(() => approvals.value?.summary || fallbackSummary)
const pendingItems = computed(() => approvals.value?.pending || [])
const historyItems = computed(() => approvals.value?.history || [])

const pendingMeta = computed(() => {
  if (!summary.value.pendingCount) return 'все решения зафиксированы'
  if (summary.value.awaitingStudio && !summary.value.awaitingClient) return 'ожидает подготовки студии'
  if (summary.value.awaitingClient && summary.value.awaitingStudio) return 'есть вопросы к клиенту и студии'
  return 'ожидает ответа клиента'
})

const historyMeta = computed(() => {
  if (!historyItems.value.length) return 'решения появятся после согласований'
  if (summary.value.lastDecisionAt) return `обновлено ${formatDate(summary.value.lastDecisionAt)}`
  return `${historyItems.value.length} записей`
})

function kindLabel(kind: ApiV1ClientApprovalKind) {
  const labels: Record<ApiV1ClientApprovalKind, string> = {
    gate: 'этап',
    document: 'документ',
    extra_service: 'услуга',
    call_decision: 'коммуникация',
  }
  return labels[kind] || kind
}

function actorLabel(role: ApiV1ClientApprovalActor['role']) {
  if (role === 'client') return 'по данным проекта'
  if (role === 'studio') return 'зафиксировано студией'
  return 'зафиксировано системой'
}

function formatDate(value: string) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function isOverdue(value: string) {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() < Date.now()
}

async function openSource(rawUrl: string) {
  if (!rawUrl) return

  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (rawUrl.startsWith('/client/')) {
    const url = new URL(rawUrl, window.location.origin)
    await router.push({ path: url.pathname, query: Object.fromEntries(url.searchParams.entries()) })
    return
  }

  window.open(rawUrl, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.cap-root {
  display: grid;
  gap: 18px;
  padding: 18px;
  color: var(--glass-text);
}

.cap-loading {
  display: grid;
  gap: 10px;
}

.cap-skeleton {
  min-height: 74px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 5%, var(--glass-bg));
  animation: cap-shimmer 1.4s infinite ease-in-out;
}

@keyframes cap-shimmer {
  0%, 100% { opacity: .42; }
  50% { opacity: .72; }
}

.cap-header,
.cap-section__head,
.cap-item,
.cap-row,
.cap-tags,
.cap-summary {
  display: flex;
}

.cap-header,
.cap-section__head,
.cap-item {
  justify-content: space-between;
}

.cap-header,
.cap-section__head {
  align-items: flex-start;
  gap: 14px;
}

.cap-kicker,
.cap-section__meta,
.cap-date,
.cap-tag,
.cap-pill,
.cap-summary__item {
  letter-spacing: 0;
}

.cap-kicker {
  margin: 0 0 4px;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.cap-title {
  margin: 0;
  font-size: 1.14rem;
  font-weight: 650;
  color: color-mix(in srgb, var(--glass-text) 88%, transparent);
}

.cap-summary {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.cap-summary__item {
  display: inline-grid;
  min-width: 86px;
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

.cap-summary__item strong {
  font-size: 1.08rem;
  color: color-mix(in srgb, var(--glass-text) 86%, transparent);
}

.cap-section {
  display: grid;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.cap-section__title {
  font-size: .9rem;
  font-weight: 650;
  color: color-mix(in srgb, var(--glass-text) 84%, transparent);
}

.cap-section__meta,
.cap-date,
.cap-tag {
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 48%, transparent);
}

.cap-list {
  display: grid;
  gap: 10px;
}

.cap-item {
  position: relative;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg));
}

.cap-item::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: color-mix(in srgb, var(--ds-accent) 64%, var(--glass-text));
}

.cap-item--studio::before {
  background: color-mix(in srgb, var(--ds-warning) 72%, var(--glass-text));
}

.cap-item--history::before {
  background: color-mix(in srgb, var(--ds-success) 58%, var(--glass-text));
}

.cap-item__main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.cap-row,
.cap-tags {
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.cap-pill,
.cap-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
}

.cap-pill {
  color: color-mix(in srgb, var(--glass-text) 78%, transparent);
  font-size: .7rem;
  font-weight: 650;
}

.cap-pill--client,
.cap-pill--pending {
  color: var(--ds-accent);
}

.cap-pill--studio {
  color: var(--ds-warning);
}

.cap-pill--approved,
.cap-pill--recorded {
  color: var(--ds-success);
}

.cap-pill--rejected,
.cap-pill--cancelled,
.cap-pill--changes_requested,
.cap-date--overdue,
.cap-tag--warning {
  color: var(--ds-error);
}

.cap-item__title {
  margin: 0;
  color: color-mix(in srgb, var(--glass-text) 88%, transparent);
  font-size: .95rem;
  font-weight: 650;
  line-height: 1.35;
}

.cap-item__text {
  margin: 0;
  color: color-mix(in srgb, var(--glass-text) 58%, transparent);
  font-size: .8rem;
  line-height: 1.5;
}

.cap-open {
  flex: 0 0 auto;
  min-width: 86px;
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid color-mix(in srgb, var(--ds-accent) 30%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ds-accent) 9%, var(--glass-bg));
  color: color-mix(in srgb, var(--glass-text) 82%, transparent);
  font-size: .78rem;
  cursor: pointer;
}

.cap-open:hover {
  background: color-mix(in srgb, var(--ds-accent) 14%, var(--glass-bg));
}

.cap-open--ghost {
  border-color: color-mix(in srgb, var(--glass-text) 14%, transparent);
  background: color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg));
}

.cap-empty {
  display: grid;
  min-height: 76px;
  place-items: center;
  border: 1px dashed color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
  font-size: .82rem;
}

@media (max-width: 760px) {
  .cap-root {
    padding: 14px;
  }

  .cap-header,
  .cap-section__head,
  .cap-item {
    flex-direction: column;
  }

  .cap-summary {
    justify-content: flex-start;
    width: 100%;
  }

  .cap-summary__item {
    min-width: 0;
    flex: 1 1 92px;
  }

  .cap-open {
    width: 100%;
  }
}
</style>
