<script setup lang="ts">
import type {
  MessengerProjectAgreementStatus,
  MessengerProjectAgreementType,
  MessengerProjectCabinetLinkKind,
  MessengerProjectCapability,
  MessengerProjectCoverageStatus,
  MessengerProjectSubjectKind,
} from '../../composables/useMessengerProjectEngine'

interface ProjectNodePosition {
  x: number
  y: number
}

const projectEngine = useMessengerProjectEngine()
const selectedContextId = ref<string>('')
const feedbackMessage = ref('')
const feedbackTone = ref<'info' | 'error'>('info')
const bootstrapDraft = reactive({
  templateId: 'platform-role-cabinets',
  slug: 'platform-role-cabinets',
  label: 'Кабинеты платформы',
  repositoryId: 'repo-main',
  rootPath: '/opt/daria-nuxt',
})
const subjectDraft = reactive({
  label: '',
  kind: 'client' as MessengerProjectSubjectKind,
  managerAgentIds: ['cabinet-manager'],
})
const agreementDraft = reactive({
  label: '',
  type: 'scope' as MessengerProjectAgreementType,
  status: 'draft' as MessengerProjectAgreementStatus,
  managerAgentIds: ['agreements-manager'],
})
const linkDraft = reactive({
  targetContextId: '',
  kind: 'shared-data' as MessengerProjectCabinetLinkKind,
  sharedCapabilities: ['logic'] as MessengerProjectCapability[],
  status: 'planned' as MessengerProjectCoverageStatus,
})

const capabilityOptions: Array<{ title: string; value: MessengerProjectCapability }> = [
  { title: 'Frontend', value: 'frontend' },
  { title: 'Backend', value: 'backend' },
  { title: 'Logic', value: 'logic' },
  { title: 'Styles', value: 'styles' },
  { title: 'Data', value: 'data' },
  { title: 'QA', value: 'qa' },
  { title: 'Docs', value: 'docs' },
  { title: 'Integration', value: 'integration' },
]

const contextPositions = computed<Record<string, ProjectNodePosition>>(() => {
  const contexts = projectEngine.syncBrief.value?.contexts || []
  return Object.fromEntries(contexts.map((context, index) => [context.id, {
    x: 36 + (index % 2) * 296,
    y: 32 + Math.floor(index / 2) * 172,
  }]))
})

const selectedContext = computed(() => projectEngine.syncBrief.value?.contexts.find(context => context.id === selectedContextId.value) ?? null)
const selectedContextSubjects = computed(() => projectEngine.managerBrief.value?.subjects.filter(subject => subject.contextIds.includes(selectedContextId.value)) || [])
const selectedContextAgreements = computed(() => projectEngine.managerBrief.value?.agreements.filter(agreement => agreement.contextIds.includes(selectedContextId.value)) || [])
const selectedContextLinks = computed(() => projectEngine.managerBrief.value?.cabinetLinks.filter(link => link.sourceContextId === selectedContextId.value || link.targetContextId === selectedContextId.value) || [])
const projectOptions = computed(() => projectEngine.projects.value.map(project => ({ title: project.label, value: project.id })))
const templateOptions = computed(() => projectEngine.templates.value.map(template => ({ title: template.label, value: template.id })))
const contextOptions = computed(() => (projectEngine.syncBrief.value?.contexts || []).map(context => ({ title: context.label, value: context.id })))
const graphEdges = computed(() => {
  const brief = projectEngine.managerBrief.value
  if (!brief) {
    return []
  }

  return brief.cabinetLinks.map((link) => {
    const source = contextPositions.value[link.sourceContextId]
    const target = contextPositions.value[link.targetContextId]
    if (!source || !target) {
      return null
    }

    const sourceX = source.x + 124
    const sourceY = source.y + 56
    const targetX = target.x + 124
    const targetY = target.y + 56
    const controlOffset = Math.max(84, Math.abs(targetX - sourceX) * 0.4)

    return {
      ...link,
      labelX: (sourceX + targetX) / 2,
      labelY: (sourceY + targetY) / 2,
      path: `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`,
    }
  }).filter((item): item is NonNullable<typeof item> => Boolean(item))
})
const contextStatusCounts = computed(() => (projectEngine.syncBrief.value?.contexts || []).reduce<Record<string, number>>((accumulator, context) => {
  accumulator[context.status] = (accumulator[context.status] || 0) + 1
  return accumulator
}, {}))

watch(() => projectEngine.syncBrief.value?.project.id, (projectId) => {
  if (!projectId) {
    selectedContextId.value = ''
    return
  }

  if (!selectedContextId.value || !projectEngine.syncBrief.value?.contexts.some(context => context.id === selectedContextId.value)) {
    selectedContextId.value = projectEngine.syncBrief.value?.contexts[0]?.id || ''
  }
}, { immediate: true })

watch(() => projectEngine.activeProjectId.value, async (projectId) => {
  if (!projectId) {
    return
  }

  await projectEngine.loadBriefs(projectId)
}, { immediate: true })

onMounted(async () => {
  await projectEngine.refresh()
  if (projectEngine.activeProjectId.value) {
    await projectEngine.loadBriefs(projectEngine.activeProjectId.value)
  }
})

function contextStatusLabel(value: string) {
  switch (value) {
    case 'planned':
      return 'Planned'
    case 'in-progress':
      return 'В работе'
    case 'review':
      return 'Review'
    case 'blocked':
      return 'Blocked'
    case 'done':
      return 'Done'
    default:
      return value
  }
}

function contextStatusClass(value: string) {
  return `project-engine-status--${value}`
}

async function bootstrapProject() {
  feedbackMessage.value = ''

  try {
    const project = await projectEngine.bootstrapProject({
      templateId: bootstrapDraft.templateId,
      slug: bootstrapDraft.slug,
      label: bootstrapDraft.label,
      repositoryId: bootstrapDraft.repositoryId,
      rootPath: bootstrapDraft.rootPath,
    })
    projectEngine.activeProjectId.value = project.id
    feedbackTone.value = 'info'
    feedbackMessage.value = 'Проектный граф создан из шаблона.'
  } catch {
    feedbackTone.value = 'error'
    feedbackMessage.value = 'Не удалось создать проектный граф из шаблона.'
  }
}

async function createSubject() {
  if (!projectEngine.activeProjectId.value || !selectedContextId.value || !subjectDraft.label.trim()) {
    return
  }

  feedbackMessage.value = ''

  try {
    await projectEngine.createSubject(projectEngine.activeProjectId.value, {
      label: subjectDraft.label,
      kind: subjectDraft.kind,
      status: 'active',
      contextIds: [selectedContextId.value],
      managerAgentIds: [...subjectDraft.managerAgentIds],
      tags: [],
      notes: '',
    })
    subjectDraft.label = ''
    feedbackTone.value = 'info'
    feedbackMessage.value = 'Субъект добавлен в выбранный кабинет.'
  } catch {
    feedbackTone.value = 'error'
    feedbackMessage.value = 'Не удалось создать субъекта.'
  }
}

async function createAgreement() {
  if (!projectEngine.activeProjectId.value || !selectedContextId.value || !agreementDraft.label.trim()) {
    return
  }

  feedbackMessage.value = ''

  try {
    await projectEngine.createAgreement(projectEngine.activeProjectId.value, {
      label: agreementDraft.label,
      type: agreementDraft.type,
      status: agreementDraft.status,
      subjectIds: selectedContextSubjects.value.map(subject => subject.id),
      contextIds: [selectedContextId.value],
      managerAgentIds: [...agreementDraft.managerAgentIds],
      summary: '',
      terms: [],
      dueAt: '',
    })
    agreementDraft.label = ''
    feedbackTone.value = 'info'
    feedbackMessage.value = 'Договорённость добавлена.'
  } catch {
    feedbackTone.value = 'error'
    feedbackMessage.value = 'Не удалось создать договорённость.'
  }
}

async function createLink() {
  if (!projectEngine.activeProjectId.value || !selectedContextId.value || !linkDraft.targetContextId) {
    return
  }

  feedbackMessage.value = ''

  try {
    await projectEngine.createCabinetLink(projectEngine.activeProjectId.value, {
      sourceContextId: selectedContextId.value,
      targetContextId: linkDraft.targetContextId,
      kind: linkDraft.kind,
      status: linkDraft.status,
      sharedCapabilities: [...linkDraft.sharedCapabilities],
      agreementIds: selectedContextAgreements.value.map(agreement => agreement.id).slice(0, 1),
      notes: '',
    })
    linkDraft.targetContextId = ''
    feedbackTone.value = 'info'
    feedbackMessage.value = 'Связь между кабинетами создана.'
  } catch {
    feedbackTone.value = 'error'
    feedbackMessage.value = 'Не удалось создать связь между кабинетами.'
  }
}
</script>

<template>
  <section class="project-engine-module">
    <header class="project-engine-module__head">
      <div>
        <p class="project-engine-module__eyebrow">Project graph</p>
        <h2 class="project-engine-module__title">Ноды проекта, кабинетов и договорённостей</h2>
      </div>
      <div class="project-engine-module__toolbar">
        <VSelect
          v-model="projectEngine.activeProjectId.value"
          :items="projectOptions"
          label="Проект"
          variant="outlined"
          hide-details="auto"
          density="comfortable"
          class="project-engine-module__select"
        />
        <VBtn color="secondary" variant="text" :loading="projectEngine.briefsPending.value" @click="projectEngine.loadBriefs()">
          Обновить
        </VBtn>
      </div>
    </header>

    <VAlert v-if="feedbackMessage" :type="feedbackTone === 'error' ? 'error' : 'info'" class="mb-4">
      {{ feedbackMessage }}
    </VAlert>

    <div v-if="!projectEngine.projects.value.length" class="project-engine-bootstrap">
      <div class="project-engine-bootstrap__copy">
        <h3 class="title-medium">Режим нод был пуст, потому что у него не было project graph</h3>
        <p class="on-surface-variant">Создайте проектный граф из шаблона, и режим начнёт показывать кабинеты, subjects, agreements и связи между ними.</p>
      </div>
      <div class="project-engine-bootstrap__form">
        <VSelect v-model="bootstrapDraft.templateId" :items="templateOptions" label="Шаблон" variant="outlined" hide-details="auto" />
        <VTextField v-model="bootstrapDraft.slug" label="Slug проекта" variant="outlined" hide-details="auto" />
        <VTextField v-model="bootstrapDraft.label" label="Название проекта" variant="outlined" hide-details="auto" />
        <VTextField v-model="bootstrapDraft.repositoryId" label="Repository ID" variant="outlined" hide-details="auto" />
        <VTextField v-model="bootstrapDraft.rootPath" label="Root path" variant="outlined" hide-details="auto" />
        <VBtn color="primary" variant="tonal" :loading="projectEngine.mutating.value" @click="bootstrapProject">
          Создать project graph
        </VBtn>
      </div>
    </div>

    <div v-else-if="projectEngine.syncBrief.value && projectEngine.managerBrief.value" class="project-engine-module__body">
      <div class="project-engine-canvas-shell">
        <div class="project-engine-overview-cards">
          <div class="project-engine-overview-card">
            <span class="project-engine-overview-card__label">Контекстов</span>
            <strong class="project-engine-overview-card__value">{{ projectEngine.syncBrief.value.contexts.length }}</strong>
          </div>
          <div class="project-engine-overview-card">
            <span class="project-engine-overview-card__label">Subjects</span>
            <strong class="project-engine-overview-card__value">{{ projectEngine.managerBrief.value.subjects.length }}</strong>
          </div>
          <div class="project-engine-overview-card">
            <span class="project-engine-overview-card__label">Agreements</span>
            <strong class="project-engine-overview-card__value">{{ projectEngine.managerBrief.value.agreements.length }}</strong>
          </div>
          <div class="project-engine-overview-card">
            <span class="project-engine-overview-card__label">Gaps</span>
            <strong class="project-engine-overview-card__value">{{ projectEngine.managerBrief.value.gaps.length + projectEngine.syncBrief.value.gaps.length }}</strong>
          </div>
        </div>

        <div class="project-engine-canvas">
          <svg class="project-engine-canvas__edges" viewBox="0 0 760 520" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="project-engine-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--v-theme-secondary))" />
              </marker>
            </defs>
            <path
              v-for="edge in graphEdges"
              :key="edge.id"
              :d="edge.path"
              class="project-engine-canvas__edge"
              :class="contextStatusClass(edge.status)"
              marker-end="url(#project-engine-arrow)"
            />
          </svg>

          <div
            v-for="edge in graphEdges"
            :key="`${edge.id}:label`"
            class="project-engine-edge-label"
            :style="{ left: `${edge.labelX}px`, top: `${edge.labelY}px` }"
          >
            {{ edge.kind }}
          </div>

          <button
            v-for="context in projectEngine.syncBrief.value.contexts"
            :key="context.id"
            type="button"
            class="project-engine-node"
            :class="[
              contextStatusClass(context.status),
              { 'project-engine-node--selected': selectedContextId === context.id },
            ]"
            :style="{ left: `${contextPositions[context.id]?.x || 0}px`, top: `${contextPositions[context.id]?.y || 0}px` }"
            @click="selectedContextId = context.id"
          >
            <span class="project-engine-node__kind">{{ context.kind }}</span>
            <strong class="project-engine-node__title">{{ context.label }}</strong>
            <span class="project-engine-node__meta">{{ context.ownerRole }} · {{ contextStatusLabel(context.status) }}</span>
            <span class="project-engine-node__meta">subjects: {{ projectEngine.managerBrief.value.subjects.filter(subject => subject.contextIds.includes(context.id)).length }} · agreements: {{ projectEngine.managerBrief.value.agreements.filter(agreement => agreement.contextIds.includes(context.id)).length }}</span>
          </button>
        </div>
      </div>

      <aside class="project-engine-inspector">
        <div class="project-engine-inspector__section">
          <span class="project-engine-inspector__label">Статусы контекстов</span>
          <div class="project-engine-inspector__chips">
            <span v-for="(count, status) in contextStatusCounts" :key="status" class="project-engine-chip" :class="contextStatusClass(status)">
              {{ contextStatusLabel(status) }} · {{ count }}
            </span>
          </div>
        </div>

        <template v-if="selectedContext">
          <div class="project-engine-inspector__section">
            <span class="project-engine-inspector__eyebrow">Выбранный кабинет</span>
            <h3 class="project-engine-inspector__title">{{ selectedContext.label }}</h3>
            <p class="project-engine-inspector__text">{{ selectedContext.summary || 'Краткое описание пока не заполнено.' }}</p>
            <div class="project-engine-inspector__chips">
              <span v-for="capability in selectedContext.capabilities" :key="capability.capability" class="project-engine-chip" :class="contextStatusClass(capability.status)">
                {{ capability.capability }}
              </span>
            </div>
          </div>

          <div class="project-engine-inspector__section">
            <div class="project-engine-inspector__section-head">
              <span class="project-engine-inspector__label">Subjects</span>
            </div>
            <div class="project-engine-inspector__chips">
              <span v-for="subject in selectedContextSubjects" :key="subject.id" class="project-engine-chip project-engine-chip--passive">
                {{ subject.label }} · {{ subject.kind }}
              </span>
            </div>
            <div class="project-engine-form-row">
              <VTextField v-model="subjectDraft.label" label="Новый субъект" variant="outlined" hide-details="auto" density="comfortable" />
              <VSelect
                v-model="subjectDraft.kind"
                :items="[
                  { title: 'Client', value: 'client' },
                  { title: 'Manager', value: 'manager' },
                  { title: 'Designer', value: 'designer' },
                  { title: 'Contractor', value: 'contractor' },
                  { title: 'External', value: 'external' },
                ]"
                label="Тип"
                variant="outlined"
                hide-details="auto"
                density="comfortable"
              />
              <VBtn color="secondary" variant="tonal" :loading="projectEngine.mutating.value" @click="createSubject">Добавить</VBtn>
            </div>
          </div>

          <div class="project-engine-inspector__section">
            <span class="project-engine-inspector__label">Agreements</span>
            <div class="project-engine-inspector__chips">
              <span v-for="agreement in selectedContextAgreements" :key="agreement.id" class="project-engine-chip project-engine-chip--passive">
                {{ agreement.label }} · {{ agreement.type }}
              </span>
            </div>
            <div class="project-engine-form-row">
              <VTextField v-model="agreementDraft.label" label="Новая договорённость" variant="outlined" hide-details="auto" density="comfortable" />
              <VSelect
                v-model="agreementDraft.type"
                :items="[
                  { title: 'Scope', value: 'scope' },
                  { title: 'Delivery', value: 'delivery' },
                  { title: 'Approval', value: 'approval' },
                  { title: 'Change request', value: 'change-request' },
                  { title: 'Support', value: 'support' },
                ]"
                label="Тип"
                variant="outlined"
                hide-details="auto"
                density="comfortable"
              />
              <VBtn color="secondary" variant="tonal" :loading="projectEngine.mutating.value" @click="createAgreement">Добавить</VBtn>
            </div>
          </div>

          <div class="project-engine-inspector__section">
            <span class="project-engine-inspector__label">Cabinet links</span>
            <div class="project-engine-inspector__chips">
              <span v-for="link in selectedContextLinks" :key="link.id" class="project-engine-chip project-engine-chip--passive">
                {{ link.sourceLabel }} → {{ link.targetLabel }} · {{ link.kind }}
              </span>
            </div>
            <div class="project-engine-form-row project-engine-form-row--stacked">
              <VSelect v-model="linkDraft.targetContextId" :items="contextOptions.filter(item => item.value !== selectedContext.id)" label="Связать с кабинетом" variant="outlined" hide-details="auto" density="comfortable" />
              <VSelect
                v-model="linkDraft.kind"
                :items="[
                  { title: 'Shared data', value: 'shared-data' },
                  { title: 'Depends on', value: 'depends-on' },
                  { title: 'Handoff', value: 'handoff' },
                  { title: 'Approval', value: 'approval' },
                  { title: 'Mirrors', value: 'mirrors' },
                ]"
                label="Тип связи"
                variant="outlined"
                hide-details="auto"
                density="comfortable"
              />
              <VSelect v-model="linkDraft.sharedCapabilities" :items="capabilityOptions" label="Shared capability" variant="outlined" hide-details="auto" density="comfortable" multiple chips />
              <VBtn color="primary" variant="tonal" :loading="projectEngine.mutating.value" @click="createLink">Создать связь</VBtn>
            </div>
          </div>
        </template>

        <div class="project-engine-inspector__section">
          <span class="project-engine-inspector__label">Manager gaps</span>
          <div class="project-engine-gap-list">
            <div v-for="gap in [...projectEngine.syncBrief.value.gaps, ...projectEngine.managerBrief.value.gaps]" :key="gap.message" class="project-engine-gap-list__item">
              {{ gap.message }}
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.project-engine-module {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-engine-module__head,
.project-engine-module__toolbar,
.project-engine-bootstrap,
.project-engine-module__body,
.project-engine-canvas-shell,
.project-engine-overview-cards,
.project-engine-form-row,
.project-engine-inspector__section-head,
.project-engine-inspector__chips {
  display: flex;
}

.project-engine-module__head,
.project-engine-inspector__section-head {
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.project-engine-module__toolbar,
.project-engine-overview-cards,
.project-engine-form-row,
.project-engine-inspector__chips {
  flex-wrap: wrap;
  gap: 12px;
}

.project-engine-module__body {
  gap: 16px;
  min-height: 680px;
}

.project-engine-canvas-shell {
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.project-engine-inspector {
  width: min(360px, 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-engine-module__eyebrow,
.project-engine-inspector__eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface-variant));
}

.project-engine-module__title,
.project-engine-inspector__title {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.project-engine-bootstrap,
.project-engine-canvas,
.project-engine-inspector__section,
.project-engine-overview-card {
  border: 1px solid rgb(var(--v-theme-outline-variant));
  background: rgb(var(--v-theme-surface));
  border-radius: 20px;
}

.project-engine-bootstrap {
  padding: 20px;
  gap: 20px;
  flex-wrap: wrap;
}

.project-engine-bootstrap__copy {
  flex: 1 1 260px;
}

.project-engine-bootstrap__form {
  display: grid;
  gap: 12px;
  flex: 1 1 320px;
}

.project-engine-overview-card {
  flex: 1 1 140px;
  min-width: 140px;
  padding: 16px;
}

.project-engine-overview-card__label,
.project-engine-inspector__label,
.project-engine-node__kind {
  display: block;
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface-variant));
}

.project-engine-overview-card__value {
  display: block;
  margin-top: 6px;
  font-size: 28px;
  line-height: 1;
}

.project-engine-canvas {
  position: relative;
  min-height: 520px;
  overflow: auto;
  padding: 20px;
}

.project-engine-canvas__edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.project-engine-canvas__edge {
  fill: none;
  stroke: rgb(var(--v-theme-secondary));
  stroke-width: 2.5;
  opacity: 0.75;
}

.project-engine-edge-label {
  position: absolute;
  transform: translate(-50%, -50%);
  background: rgb(var(--v-theme-surface-container-high));
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
}

.project-engine-node {
  position: absolute;
  width: 248px;
  min-height: 112px;
  padding: 14px 16px;
  text-align: left;
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 24px;
  background: rgb(var(--v-theme-surface-container));
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-engine-node--selected {
  outline: 2px solid rgb(var(--v-theme-primary));
}

.project-engine-node__title {
  font-size: 16px;
  line-height: 1.2;
}

.project-engine-node__meta,
.project-engine-inspector__text {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 14px;
}

.project-engine-inspector__section {
  padding: 16px;
}

.project-engine-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary-container));
  color: rgb(var(--v-theme-on-primary-container));
  font-size: 12px;
}

.project-engine-chip--passive {
  background: rgb(var(--v-theme-surface-container-high));
  color: rgb(var(--v-theme-on-surface));
}

.project-engine-form-row--stacked {
  flex-direction: column;
}

.project-engine-gap-list {
  display: grid;
  gap: 8px;
}

.project-engine-gap-list__item {
  padding: 10px 12px;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface-container-high));
  font-size: 14px;
}

.project-engine-status--planned {
  --project-engine-accent: rgb(var(--v-theme-outline));
}

.project-engine-status--in-progress {
  --project-engine-accent: rgb(var(--v-theme-primary));
}

.project-engine-status--review {
  --project-engine-accent: rgb(var(--v-theme-secondary));
}

.project-engine-status--blocked {
  --project-engine-accent: rgb(var(--v-theme-error));
}

.project-engine-status--done {
  --project-engine-accent: rgb(var(--v-theme-tertiary, var(--v-theme-primary)));
}

.project-engine-node[class*='project-engine-status--'],
.project-engine-chip[class*='project-engine-status--'] {
  box-shadow: inset 0 0 0 1px var(--project-engine-accent);
}

.project-engine-canvas__edge[class*='project-engine-status--'] {
  stroke: var(--project-engine-accent);
}

@media (max-width: 1024px) {
  .project-engine-module__body {
    flex-direction: column;
  }

  .project-engine-inspector {
    width: 100%;
  }
}
</style>