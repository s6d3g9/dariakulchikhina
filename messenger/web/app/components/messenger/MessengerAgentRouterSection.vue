<script setup lang="ts">
import type {
  MessengerAgentRouterPlanPayload,
  MessengerAgentRouterProfileId,
  MessengerAgentRouterRunAction,
  MessengerAgentRouterRunStatus,
} from '../../composables/useMessengerAgentRouter'

const router = useMessengerAgentRouter()
const activeTab = ref<'plan' | 'runs'>('plan')
const selectedRunActions = ref<MessengerAgentRouterRunAction[]>([])
const approvalNote = ref('UI approval')
const draft = reactive({
  profile: '' as MessengerAgentRouterProfileId | '',
  scope: 'AI Launcher UI / CRM / Studio OS task',
  tenantKey: 'daria-platform',
  projectId: 'messenger-router-ui',
  changedFilesText: 'messenger/web/app/components/messenger/MessengerAgentRouterSection.vue',
  environment: 'local',
  dataClasses: ['internal'],
  requestedActions: ['prepare-patch', 'run-checks'],
})

const environmentOptions = [
  { title: 'local', value: 'local' },
  { title: 'dev', value: 'dev' },
  { title: 'staging', value: 'staging' },
  { title: 'production', value: 'production' },
]

const dataClassOptions = ['public', 'internal', 'client-content', 'pii', 'financial', 'contracts', 'legal', 'credentials']
const requestedActionOptions = ['inspect-files', 'draft-plan', 'prepare-patch', 'run-checks', 'send-message', 'update-crm', 'create-task', 'db-migration', 'deploy']

const profileOptions = computed(() => router.profiles.value.map(profile => ({
  title: `${profile.title} · ${profile.riskTier}/${profile.costTier}`,
  value: profile.id,
})))

const gateTitleById = computed(() => new Map(router.gates.value.map(gate => [gate.id, gate.title])))
const selectedPlan = computed(() => router.selectedPlan.value)
const selectedRun = computed(() => router.selectedRun.value)
const selectedRunGateResults = computed(() => selectedRun.value?.gateResults || [])
const approvableGateResults = computed(() => selectedRunGateResults.value.filter(gate => gate.status === 'pending' || gate.status === 'blocked'))
const selectedRunPlan = computed(() => router.selectedRunPlan.value)
const latestRuns = computed(() => router.runs.value.slice(0, 24))

watch(selectedPlan, (plan) => {
  selectedRunActions.value = plan?.executableActions.slice(0, 4) || []
})

onMounted(async () => {
  await Promise.all([
    router.refreshProfiles(),
    router.refreshRuns(),
  ])
})

function linesToArray(value: string) {
  return value
    .split(/\n|,/u)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 80)
}

function buildPlanPayload(idempotencyPrefix = 'ui-plan'): MessengerAgentRouterPlanPayload {
  return {
    profile: draft.profile || undefined,
    scope: draft.scope,
    tenantKey: draft.tenantKey,
    projectId: draft.projectId,
    changedFiles: linesToArray(draft.changedFilesText),
    environment: draft.environment,
    dataClasses: draft.dataClasses,
    requestedActions: draft.requestedActions,
    idempotencyKey: router.createRouterIdempotencyKey(idempotencyPrefix),
  }
}

async function createPlan() {
  await router.createPlan(buildPlanPayload())
}

async function createRun() {
  const plan = selectedPlan.value
  const fallbackActions = plan?.executableActions || ['inspect-current-state', 'prepare-report']
  await router.createRun({
    ...buildPlanPayload('ui-run'),
    idempotencyKey: router.createRouterIdempotencyKey('ui-run'),
    runActions: selectedRunActions.value.length ? selectedRunActions.value : fallbackActions.slice(0, 3),
  })
  activeTab.value = 'runs'
}

async function refreshAll() {
  await Promise.all([
    router.refreshProfiles(),
    router.refreshRuns(),
  ])
}

async function openRun(runId: string) {
  await router.openRun(runId)
  activeTab.value = 'runs'
}

async function approveGate(gateId: string) {
  if (!selectedRun.value) return
  await router.approveRun(selectedRun.value.runId, [gateId], approvalNote.value)
}

async function cancelSelectedRun() {
  if (!selectedRun.value) return
  await router.cancelRun(selectedRun.value.runId, 'Cancelled from router UI')
}

function gateTitle(gateId: string) {
  return gateTitleById.value.get(gateId) || gateId
}

function statusColor(status: MessengerAgentRouterRunStatus | string) {
  if (status === 'succeeded' || status === 'passed') return 'success'
  if (status === 'failed' || status === 'blocked') return 'error'
  if (status === 'awaiting_approval' || status === 'pending') return 'warning'
  if (status === 'running' || status === 'ready') return 'primary'
  return 'default'
}

function compactId(value: string | undefined) {
  if (!value) return ''
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function formatDate(value: string | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <section class="section-block section-block--router" aria-label="Router section">
    <div class="router-section__head">
      <div class="router-section__title">
        <VIcon size="22">mdi-router-network</VIcon>
        <span>Router</span>
      </div>
      <div class="router-section__head-actions">
        <VChip size="small" variant="tonal">{{ router.profileVersion.value || 'profile' }}</VChip>
        <VChip size="small" variant="tonal">{{ router.policyVersion.value || 'policy' }}</VChip>
        <VBtn size="small" variant="text" icon="mdi-refresh" aria-label="Обновить router" :loading="router.pending.value" @click="refreshAll" />
      </div>
    </div>

    <VAlert v-if="router.error.value" type="warning" density="compact" class="ma-2">
      {{ router.error.value }}
    </VAlert>

    <div v-if="router.pending.value" class="section-progress section-progress--floating">
      <MessengerProgressLinear aria-label="Загрузка router" indeterminate four-color />
    </div>

    <VTabs v-model="activeTab" class="section-tabs router-section__tabs" bg-color="surface-container" color="primary" density="compact" grow>
      <VTab value="plan" aria-label="План" title="План">
        <VIcon>mdi-file-tree-outline</VIcon>
      </VTab>
      <VTab value="runs" aria-label="Runs" title="Runs">
        <VIcon>mdi-history</VIcon>
      </VTab>
    </VTabs>

    <VWindow v-model="activeTab" class="router-section__window">
      <VWindowItem value="plan" class="router-section__pane">
        <div class="router-section__grid">
          <div class="router-panel router-panel--form">
            <div class="router-panel__bar">
              <span class="router-panel__title">План</span>
              <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-file-tree-outline" :loading="router.pending.value" @click="createPlan">
                Собрать
              </VBtn>
            </div>

            <div class="router-form-grid">
              <VSelect
                v-model="draft.profile"
                :items="profileOptions"
                item-title="title"
                item-value="value"
                label="Профиль"
                placeholder="Авто"
                persistent-placeholder
                variant="outlined"
                density="compact"
                :clearable="Boolean(draft.profile)"
                hide-details="auto"
              />
              <VSelect
                v-model="draft.environment"
                :items="environmentOptions"
                label="Среда"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
              <VTextField
                v-model="draft.tenantKey"
                label="Tenant"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
              <VTextField
                v-model="draft.projectId"
                label="Project"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
            </div>

            <VTextarea
              v-model="draft.scope"
              class="mt-3"
              label="Scope"
              variant="outlined"
              rows="3"
              auto-grow
              hide-details="auto"
            />
            <VTextarea
              v-model="draft.changedFilesText"
              class="mt-3"
              label="Files"
              variant="outlined"
              rows="4"
              auto-grow
              hide-details="auto"
            />

            <div class="router-form-grid mt-3">
              <VSelect
                v-model="draft.dataClasses"
                :items="dataClassOptions"
                label="Data"
                variant="outlined"
                density="compact"
                multiple
                chips
                hide-details="auto"
              />
              <VSelect
                v-model="draft.requestedActions"
                :items="requestedActionOptions"
                label="Actions"
                variant="outlined"
                density="compact"
                multiple
                chips
                hide-details="auto"
              />
            </div>

            <div v-if="selectedPlan" class="router-run-actions">
              <span class="router-run-actions__label">Run actions</span>
              <VCheckbox
                v-for="action in selectedPlan.executableActions"
                :key="action"
                v-model="selectedRunActions"
                :value="action"
                density="compact"
                hide-details
                color="primary"
                :label="action"
              />
            </div>

            <div class="router-panel__actions">
              <VBtn color="primary" variant="flat" prepend-icon="mdi-play-circle-outline" :disabled="!selectedPlan" :loading="router.actionPending.value" @click="createRun">
                Run
              </VBtn>
              <VBtn variant="text" prepend-icon="mdi-history" @click="router.refreshRuns(); activeTab = 'runs'">
                Runs
              </VBtn>
            </div>
          </div>

          <div class="router-panel router-panel--summary">
            <template v-if="selectedPlan">
              <div class="router-summary-head">
                <div>
                  <p class="router-eyebrow">{{ selectedPlan.profile.id }}</p>
                  <h2>{{ selectedPlan.profile.title }}</h2>
                </div>
                <div class="router-summary-head__chips">
                  <VChip size="small" :color="statusColor(selectedPlan.policy.riskTier)" variant="tonal">{{ selectedPlan.policy.riskTier }}</VChip>
                  <VChip size="small" variant="tonal">{{ selectedPlan.policy.costTier }}</VChip>
                </div>
              </div>

              <div class="router-facts">
                <div>
                  <span>Task</span>
                  <strong>{{ selectedPlan.policy.taskClass }}</strong>
                </div>
                <div>
                  <span>Budget</span>
                  <strong>{{ selectedPlan.budget.estimatedCostUnits }} / {{ selectedPlan.budget.estimatedPremiumUnits }}</strong>
                </div>
                <div>
                  <span>Quota</span>
                  <strong>{{ selectedPlan.budget.quotaScope }}</strong>
                </div>
                <div>
                  <span>External</span>
                  <strong>{{ selectedPlan.policy.externalModelAllowed ? 'allowed' : 'blocked' }}</strong>
                </div>
              </div>

              <div class="router-subsection">
                <p class="router-subsection__title">Routes</p>
                <div v-if="selectedPlan.routing.candidates.length" class="router-route-list">
                  <div v-for="candidate in selectedPlan.routing.candidates.slice(0, 5)" :key="candidate.model" class="router-route-row">
                    <span>{{ candidate.rank }} · {{ candidate.model }}</span>
                    <VChip size="x-small" variant="tonal">{{ candidate.provider }}</VChip>
                  </div>
                </div>
                <p v-else class="router-muted">No route</p>
              </div>

              <div class="router-subsection">
                <p class="router-subsection__title">Required gates</p>
                <div class="router-gate-cloud">
                  <VChip
                    v-for="gate in selectedPlan.gates.required"
                    :key="gate.id"
                    size="small"
                    variant="outlined"
                  >
                    {{ gate.title }}
                  </VChip>
                </div>
              </div>
            </template>

            <div v-else class="empty-state">
              <VIcon size="44" color="on-surface-variant">mdi-router-network</VIcon>
              <p class="empty-state__title">Plan empty</p>
              <p class="empty-state__text">Соберите router plan для текущей задачи.</p>
            </div>
          </div>
        </div>
      </VWindowItem>

      <VWindowItem value="runs" class="router-section__pane">
        <div class="router-section__grid router-section__grid--runs">
          <div class="router-panel router-panel--runs">
            <div class="router-panel__bar">
              <span class="router-panel__title">Runs</span>
              <VBtn size="small" variant="text" icon="mdi-refresh" aria-label="Обновить runs" @click="router.refreshRuns()" />
            </div>

            <div v-if="latestRuns.length" class="router-run-list">
              <button
                v-for="run in latestRuns"
                :key="run.runId"
                type="button"
                class="router-run-row"
                :class="{ 'router-run-row--active': selectedRun?.runId === run.runId }"
                @click="openRun(run.runId)"
              >
                <span>
                  <strong>{{ compactId(run.runId) }}</strong>
                  <small>{{ formatDate(run.updatedAt) }} · {{ run.requestedActions.join(', ') }}</small>
                </span>
                <VChip size="x-small" :color="statusColor(run.status)" variant="tonal">{{ run.status }}</VChip>
              </button>
            </div>

            <div v-else class="empty-state">
              <VIcon size="44" color="on-surface-variant">mdi-history</VIcon>
              <p class="empty-state__title">Runs empty</p>
              <p class="empty-state__text">История появится после первого router run.</p>
            </div>
          </div>

          <div class="router-panel router-panel--run-detail">
            <template v-if="selectedRun">
              <div class="router-summary-head">
                <div>
                  <p class="router-eyebrow">{{ compactId(selectedRun.planId) }}</p>
                  <h2>{{ selectedRun.status }}</h2>
                </div>
                <VChip size="small" :color="statusColor(selectedRun.status)" variant="tonal">{{ selectedRun.status }}</VChip>
              </div>

              <div v-if="selectedRunPlan" class="router-facts">
                <div>
                  <span>Profile</span>
                  <strong>{{ selectedRunPlan.profile.id }}</strong>
                </div>
                <div>
                  <span>Risk</span>
                  <strong>{{ selectedRunPlan.policy.riskTier }}</strong>
                </div>
                <div>
                  <span>Cost</span>
                  <strong>{{ selectedRunPlan.policy.costTier }}</strong>
                </div>
                <div>
                  <span>Updated</span>
                  <strong>{{ formatDate(selectedRun.updatedAt) }}</strong>
                </div>
              </div>

              <div class="router-approval-bar">
                <VTextField
                  v-model="approvalNote"
                  label="Approval note"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                />
                <VBtn color="error" variant="text" prepend-icon="mdi-cancel" :loading="router.actionPending.value" @click="cancelSelectedRun">
                  Cancel
                </VBtn>
              </div>

              <div class="router-subsection">
                <p class="router-subsection__title">Gate matrix</p>
                <div class="router-gate-list">
                  <div v-for="gate in selectedRun.gateResults" :key="gate.gateId" class="router-gate-row">
                    <span>
                      <strong>{{ gateTitle(gate.gateId) }}</strong>
                      <small>{{ gate.reason }}</small>
                    </span>
                    <div class="router-gate-row__actions">
                      <VChip size="x-small" :color="statusColor(gate.status)" variant="tonal">{{ gate.status }}</VChip>
                      <VBtn
                        v-if="gate.status === 'pending' || gate.status === 'blocked'"
                        size="x-small"
                        variant="text"
                        icon="mdi-check-circle-outline"
                        :aria-label="`Approve ${gate.gateId}`"
                        :loading="router.actionPending.value"
                        @click="approveGate(gate.gateId)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="router-subsection">
                <p class="router-subsection__title">Verification</p>
                <div v-if="selectedRun.verificationResults.length" class="router-gate-list">
                  <div v-for="result in selectedRun.verificationResults" :key="`${result.action}-${result.startedAt}`" class="router-gate-row">
                    <span>
                      <strong>{{ result.action }}</strong>
                      <small>{{ result.summary }}</small>
                    </span>
                    <VChip size="x-small" :color="statusColor(result.status)" variant="tonal">{{ result.status }}</VChip>
                  </div>
                </div>
                <p v-else class="router-muted">No verification output</p>
              </div>
            </template>

            <div v-else class="empty-state">
              <VIcon size="44" color="on-surface-variant">mdi-timeline-check-outline</VIcon>
              <p class="empty-state__title">Run not selected</p>
              <p class="empty-state__text">Откройте run из истории.</p>
            </div>
          </div>
        </div>
      </VWindowItem>
    </VWindow>
  </section>
</template>
