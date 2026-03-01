<template>
  <div class="ci-root">
    <div v-if="pending" class="ci-loading"><div class="ci-loading-bar"></div></div>
    <template v-else-if="project">

      <!-- Phase header -->
      <div class="ci-phase-header">
        <div class="ci-phase-badge">Фаза 0</div>
        <h2 class="ci-phase-title">Инициация проекта</h2>
        <p class="ci-phase-sub">Знакомство, сбор требований, аудит объекта и оформление договора</p>
        <!-- Progress bar -->
        <div class="ci-progress-track">
          <div class="ci-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <div class="ci-progress-label">{{ doneCount }} из {{ steps.length }} шагов выполнено</div>
      </div>

      <!-- Steps -->
      <div class="ci-steps">
        <div
          v-for="(step, idx) in steps"
          :key="step.key"
          class="ci-step"
          :class="{
            'ci-step--done':    step.done,
            'ci-step--active':  step.active && !step.done,
            'ci-step--pending': !step.done && !step.active,
          }"
        >
          <!-- Connector line (except first) -->
          <div v-if="idx > 0" class="ci-step-connector" :class="{ 'ci-step-connector--done': !!steps[idx - 1]?.done }"></div>

          <div class="ci-step-inner">
            <!-- Left: number + icon -->
            <div class="ci-step-aside">
              <div class="ci-step-num-wrap">
                <div class="ci-step-num" :class="{ 'ci-step-num--done': step.done, 'ci-step-num--active': step.active && !step.done }">
                  <span v-if="step.done">✓</span>
                  <span v-else>{{ step.number }}</span>
                </div>
              </div>
            </div>

            <!-- Right: content -->
            <div class="ci-step-body">
              <div class="ci-step-header">
                <div class="ci-step-meta">
                  <span class="ci-step-num-label">{{ step.number }}</span>
                  <span class="ci-step-badge" :class="`ci-step-badge--${step.statusKey}`">{{ step.statusLabel }}</span>
                </div>
                <h3 class="ci-step-title">{{ step.title }}</h3>
                <p class="ci-step-desc">{{ step.desc }}</p>
              </div>

              <!-- Business action -->
              <div class="ci-step-block ci-step-block--biz" v-if="step.bizText">
                <div class="ci-block-label">🏢 Бизнес</div>
                <div class="ci-block-text">{{ step.bizText }}</div>
              </div>

              <!-- System action -->
              <div class="ci-step-block ci-step-block--sys" v-if="step.sysText">
                <div class="ci-block-label">⚙️ Система</div>
                <div class="ci-block-text">{{ step.sysText }}</div>
              </div>

              <!-- Artifacts -->
              <div class="ci-artifacts" v-if="step.artifacts && step.artifacts.length">
                <div class="ci-artifacts-label">📎 Документы</div>
                <div class="ci-artifacts-list">
                  <a
                    v-for="art in step.artifacts"
                    :key="art.label"
                    :href="art.url || undefined"
                    :class="['ci-artifact', art.url ? 'ci-artifact--available' : 'ci-artifact--pending']"
                    :target="art.url ? '_blank' : undefined"
                  >
                    <span class="ci-artifact-icon">{{ art.url ? '📄' : '○' }}</span>
                    <span class="ci-artifact-name">{{ art.label }}</span>
                    <span class="ci-artifact-status">{{ art.url ? '↓ скачать' : 'ожидается' }}</span>
                  </a>
                </div>
              </div>

              <!-- CTA actions -->
              <div class="ci-actions" v-if="step.actions && step.actions.length">
                <NuxtLink
                  v-for="action in step.actions"
                  :key="action.label"
                  :to="action.to"
                  class="ci-action-btn"
                  :class="{ 'ci-action-btn--primary': action.primary }"
                >{{ action.label }}</NuxtLink>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Phase completion notice -->
      <div v-if="phaseComplete" class="ci-phase-done">
        <div class="ci-phase-done-icon">✓</div>
        <div>
          <strong>Фаза 0 «Инициация» завершена</strong>
          <p>Договор подписан, аванс получен. Следующий этап — разработка дизайн-концепции.</p>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { BRIEF_COMPLETION_KEYS } from '~~/shared/constants/profile-fields'

const props = defineProps<{ slug: string }>()
const route = useRoute()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const pf = computed<any>(() => project.value?.profile || {})

// ── Step completion logic ──────────────────────────────────────────────────

const step01Done = computed(() => !!pf.value.lead_step_done)

const step02Done = computed(() => {
  // Admin marked as completed
  if (pf.value.brief_completed) return true
  // Check if brief fields are filled (client or admin — same fields now)
  const briefFilled = BRIEF_COMPLETION_KEYS
    .filter((k: string) => !!pf.value[k]).length
  return briefFilled >= 3
})

const step03Done = computed(() => pf.value.survey_status === 'completed')

const step04Done = computed(() =>
  pf.value.contract_status === 'signed' &&
  pf.value.invoice_payment_status !== 'pending' &&
  !!pf.value.invoice_payment_status
)

const phaseComplete = computed(() => step01Done.value && step02Done.value && step03Done.value && step04Done.value)

// ── Steps ──────────────────────────────────────────────────────────────────

const steps = computed(() => [
  {
    key:       'first_contact',
    number:    '0.1',
    title:     'Первичный контакт',
    desc:      'Знакомство, обсуждение базовых параметров: площадь, ЖК, примерный бюджет.',
    done:      step01Done.value,
    active:    true,
    statusKey:   step01Done.value ? 'done' : 'active',
    statusLabel: step01Done.value ? 'выполнено' : 'на старте',
    bizText:   'Знакомство с командой студии, обсуждение концепции проекта и первичная оценка объёма работ.',
    sysText:   'Создана карточка проекта в системе. Назначен менеджер проекта.',
    artifacts: [] as any[],
    actions:   [] as any[],
  },
  {
    key:       'briefing',
    number:    '0.2',
    title:     'Брифинг',
    desc:      'Заполнение подробной анкеты о составе семьи, хобби, утренних рутинах и привычках хранения.',
    done:      step02Done.value,
    active:    step01Done.value,
    statusKey:   step02Done.value ? 'done' : step01Done.value ? 'active' : 'pending',
    statusLabel: step02Done.value ? 'заполнено ✓' : step01Done.value ? 'ожидает вас' : 'ожидание',
    bizText:   'Клиент заполняет Smart Brief Form — детальную анкету о составе семьи, режиме дня, хобби и требованиях к пространству.',
    sysText:   '«Анкета клиента» формируется в системе. Генерируются теги проекта (#smart_home, #kids_room и др.).',
    artifacts: [
      { label: 'Anket_Brief.pdf', url: pf.value.brief_pdf_url || '' },
    ],
    actions: step02Done.value
      ? [{ label: 'Редактировать анкету →', to: `/client/${props.slug}/self_profile`, primary: false }]
      : [{ label: 'Заполнить анкету →', to: `/client/${props.slug}/self_profile`, primary: true }],
  },
  {
    key:       'survey',
    number:    '0.3',
    title:     'Обмеры / аудит',
    desc:      'Выезд инженера, лазерное 3D-сканирование, проверка вентканалов, стояков, электрощита.',
    done:      step03Done.value,
    active:    step02Done.value,
    statusKey:   step03Done.value ? 'done'
      : pf.value.survey_status === 'in_progress' ? 'active'
      : pf.value.survey_status === 'planned'     ? 'active'
      : step02Done.value ? 'waiting' : 'pending',
    statusLabel: step03Done.value ? 'завершён ✓'
      : pf.value.survey_status === 'in_progress' ? 'выполняется'
      : pf.value.survey_status === 'planned'     ? 'запланирован'
      : step02Done.value ? 'ожидается' : 'ожидание',
    bizText:   'Выезд инженера на объект. Лазерное 3D-сканирование всего пространства, аудит инженерных сетей (электрика, сантехника, вентиляция).',
    sysText:   'Загрузка облака точек (​.e57/.rcp), фотофиксации «как есть» и Акта технического обследования.',
    artifacts: [
      { label: 'SurveyReport.pdf', url: pf.value.survey_report_url || '' },
      { label: 'Pointcloud.e57',   url: pf.value.survey_pointcloud_url || '' },
      { label: 'Photo_As-Is.zip',  url: pf.value.survey_photo_url || '' },
    ],
    actions: [] as any[],
  },
  {
    key:       'tor_contract',
    number:    '0.4',
    title:     'ТЗ и договор',
    desc:      'Сведение данных из брифа и обмеров в единый документ с графиком и стоимостью работ.',
    done:      step04Done.value,
    active:    step03Done.value,
    statusKey:   step04Done.value ? 'done'
      : pf.value.contract_status === 'signed'  ? 'active'
      : pf.value.contract_status === 'sent'    ? 'active'
      : step03Done.value ? 'waiting' : 'pending',
    statusLabel: step04Done.value ? 'подписан ✓'
      : pf.value.contract_status === 'signed'  ? 'подписан'
      : pf.value.contract_status === 'sent'    ? 'на подписании'
      : pf.value.contract_status === 'draft'   ? 'черновик'
      : step03Done.value ? 'формируется' : 'ожидание',
    bizText:   'Формирование Технического задания, согласование графика работ и стоимости. Выставление инвойса за первый этап.',
    sysText:   'Генерация Contract_ToR.pdf. Подписание документов клиентом. После получения аванса — переход в фазу «Эскиз».',
    artifacts: [
      { label: 'Contract_ToR.pdf',    url: pf.value.contract_file || '' },
      { label: 'Invoice_Advance.pdf', url: pf.value.invoice_file  || '' },
    ],
    actions: pf.value.contract_file
      ? [{ label: 'Открыть документы →', to: `/client/${props.slug}/contracts`, primary: false }]
      : [] as any[],
  },
])

const doneCount   = computed(() => steps.value.filter(s => s.done).length)
const progressPct = computed(() => Math.round((doneCount.value / steps.value.length) * 100))
</script>

<style scoped>
.ci-root { padding: 4px 0 60px; }
.ci-loading { padding: 40px 0; }
.ci-loading-bar { height: 2px; width: 60px; background: var(--c-border, #e8e8e4); animation: ci-b .9s ease infinite alternate; }
@keyframes ci-b { to { width: 140px; opacity: .4; } }

/* Phase header */
.ci-phase-header { margin-bottom: 44px; }
.ci-phase-badge {
  display: inline-block; font-size: .65rem; text-transform: uppercase; letter-spacing: 1.5px;
  color: var(--c-muted, #aaa);
  padding: 3px 10px; margin-bottom: 10px;
}
.ci-phase-title { font-size: 1.4rem; font-weight: 300; letter-spacing: -.3px; margin: 0 0 8px; }
.ci-phase-sub { font-size: .82rem; color: var(--c-muted, #888); margin: 0 0 20px; line-height: 1.6; }
.ci-progress-track { height: 3px; background: var(--c-border, #e8e8e4); margin-bottom: 8px; overflow: hidden; }
.ci-progress-fill { height: 100%; background: var(--c-text, #1a1a1a); transition: width .4s; }
.ci-progress-label { font-size: .7rem; color: var(--c-muted, #aaa); }

/* Steps */
.ci-steps { display: flex; flex-direction: column; gap: 0; }

.ci-step { position: relative; }
.ci-step-connector {
  position: absolute; left: 19px; top: 0; width: 1px; height: 28px;
  background: var(--c-border, #e8e8e4);
  transform: translateY(-100%);
}
.ci-step-connector--done { background: var(--c-text, #1a1a1a); }

.ci-step-inner { display: flex; gap: 20px; padding: 24px 0 0; }

/* Step aside (number dot) */
.ci-step-aside { flex-shrink: 0; }
.ci-step-num-wrap { width: 38px; display: flex; justify-content: center; }
.ci-step-num {
  width: 38px; height: 38px; border-radius: 50%;
  border: none;
  display: flex; align-items: center; justify-content: center;
  font-size: .72rem; font-weight: 500; color: var(--c-muted, #aaa);
  background: var(--c-bg, #fff); flex-shrink: 0;
}
.ci-step-num--done   { background: var(--c-text, #1a1a1a); border-color: var(--c-text, #1a1a1a); color: #fff; }
.ci-step-num--active { color: var(--c-text, #1a1a1a); }

/* Step body */
.ci-step-body {
  flex: 1; min-width: 0;
  padding: 20px 22px 22px;
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
  border: none;
  border-radius: 14px;
}
.ci-step--done .ci-step-body  { background: color-mix(in srgb, #d9f5e6 46%, transparent); }
.ci-step--active .ci-step-body { background: color-mix(in srgb, var(--glass-bg, #fff) 94%, transparent); }
.ci-step--pending .ci-step-body { opacity: .55; }

/* Step header */
.ci-step-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ci-step-num-label { font-size: .68rem; color: var(--c-muted, #aaa); text-transform: uppercase; letter-spacing: 1px; }
.ci-step-badge {
  font-size: .64rem; padding: 2px 8px; border-radius: 2px;
  text-transform: uppercase; letter-spacing: .8px;
}
.ci-step-badge--done    { background: #d4edda; color: #2a7a52; }
.ci-step-badge--active  { background: #e8e8e4; color: var(--c-text, #333); }
.ci-step-badge--waiting { background: #fff8e1; color: #b8860b; }
.ci-step-badge--pending { background: var(--c-bg2, #f8f8f7); color: #bbb; }

.ci-step-title { font-size: 1rem; font-weight: 400; margin: 0 0 6px; letter-spacing: -.2px; }
.ci-step-desc  { font-size: .78rem; color: var(--c-muted, #888); margin: 0 0 16px; line-height: 1.6; }

/* Blocks */
.ci-step-block { display: flex; gap: 10px; padding: 10px 12px; margin-bottom: 8px; background: var(--c-bg2, #f8f8f7); border: none; border-radius: 10px; }
.ci-step-block--biz { background: color-mix(in srgb, #fff0d5 54%, transparent); }
.ci-step-block--sys { background: color-mix(in srgb, #e8f1ff 54%, transparent); }
.ci-block-label { font-size: .7rem; flex-shrink: 0; width: 80px; color: var(--c-muted, #aaa); padding-top: 1px; }
.ci-block-text  { font-size: .78rem; color: var(--c-text, #444); line-height: 1.55; }

/* Artifacts */
.ci-artifacts { margin-top: 16px; }
.ci-artifacts-label { font-size: .68rem; text-transform: uppercase; letter-spacing: 1px; color: var(--c-muted, #aaa); margin-bottom: 8px; }
.ci-artifacts-list { display: flex; flex-wrap: wrap; gap: 6px; }
.ci-artifact {
  display: flex; align-items: center; gap: 7px;
  border: none; padding: 6px 12px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 86%, transparent);
  border-radius: 999px;
  font-size: .76rem; text-decoration: none; color: inherit;
}
.ci-artifact--available { cursor: pointer; }
.ci-artifact--available:hover { opacity: .9; }
.ci-artifact--pending { opacity: .45; cursor: default; }
.ci-artifact-icon  { font-size: .9rem; }
.ci-artifact-name  { flex: 1; }
.ci-artifact-status { font-size: .66rem; color: var(--c-muted, #aaa); white-space: nowrap; }
.ci-artifact--available .ci-artifact-status { color: #5caa7f; }

/* Actions */
.ci-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.ci-action-btn {
  border: none; padding: 8px 18px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 90%, transparent);
  border-radius: 999px;
  font-size: .78rem; text-decoration: none; color: var(--c-text, #333);
  display: inline-flex; align-items: center;
}
.ci-action-btn:hover { opacity: .9; }
.ci-action-btn--primary {
  background: var(--c-text, #1a1a1a); color: #fff;
  border-color: var(--c-text, #1a1a1a);
}
.ci-action-btn--primary:hover { opacity: .85; }

/* Phase done */
.ci-phase-done {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 20px 22px; margin-top: 8px;
  background: color-mix(in srgb, #e5f7ee 58%, transparent);
  border: none;
  border-radius: 14px;
}
.ci-phase-done-icon { font-size: 1.5rem; flex-shrink: 0; color: #2a7a52; }
.ci-phase-done strong { display: block; font-size: .92rem; margin-bottom: 4px; color: #2a7a52; }
.ci-phase-done p { margin: 0; font-size: .78rem; color: #2a7a52; }

@media (max-width: 640px) {
  .ci-step-inner { gap: 12px; }
  .ci-step-body { padding: 14px 14px 16px; }
  .ci-step-num { width: 30px; height: 30px; font-size: .68rem; }
  .ci-step-num-wrap { width: 30px; }
  .ci-step-connector { left: 15px; }
  .ci-block-label { width: 60px; font-size: .65rem; }
}
</style>
