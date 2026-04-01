<template>
  <div class="hpc-root">
    <div v-if="pending" class="ent-content-loading">
      <div v-for="i in 6" :key="i" class="ent-skeleton-line" />
    </div>

    <template v-else>

      <!-- Module Navigation (Bottom Scrollbar) -->
      <div class="hpc-module-nav">
        <div class="hpc-module-nav__scroll">
          <button
            v-for="mod in modules"
            :key="mod.id"
            class="hpc-module-nav__btn"
            :class="{ 'hpc-module-nav__btn--active': activeModule === mod.id }"
            @click="activeModule = mod.id"
          >
            {{ mod.label }}
          </button>
        </div>
      </div>

      <section class="hpc-summary" v-show="activeModule === 'overview'">
        <div class="hpc-summary__head">
          <div>
            <p class="hpc-eyebrow">Контур контроля</p>
            <h2 class="hpc-title">Фазовый каркас и спринтовый ритм исполнения</h2>
          </div>
          <div class="hpc-summary__meta">
            <span class="hpc-pill" :class="`hpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
            <span v-if="savedAt" class="hpc-saved">обновлено {{ savedAt }}</span>
          </div>
        </div>

        <div class="hpc-metrics">
          <div class="hpc-metric">
            <span class="hpc-metric__label">Фазовый прогресс</span>
            <strong class="hpc-metric__value">{{ summary.phasePercent }}%</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Спринтовое исполнение</span>
            <strong class="hpc-metric__value">{{ summary.doneTasks }} / {{ summary.totalTasks }}</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Блокеры</span>
            <strong class="hpc-metric__value">{{ summary.blockerCount }}</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Следующий обзор</span>
            <strong class="hpc-metric__value">{{ control.nextReviewDate || 'не задан' }}</strong>
          </div>
        </div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'overview'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Контур</p>
            <h3 class="hpc-section__title">Управление ритмом проекта</h3>
          </div>
        </div>
        <div class="hpc-grid hpc-grid--top">
          <div class="u-field">
            <label class="u-field__label">Ответственный за контроль</label>
            <input v-model="control.manager" class="glass-input" placeholder="Имя или роль" @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Интервал обзора, дней</label>
            <input v-model.number="control.cadenceDays" type="number" min="1" max="90" class="glass-input" @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Следующий контрольный обзор</label>
            <AppDatePicker v-model="control.nextReviewDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Последняя синхронизация</label>
            <AppDatePicker v-model="control.lastSyncAt" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
        </div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'communications'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Manager Agents</p>
            <h3 class="hpc-section__title">Агенты менеджмента и сценарии коммуникации</h3>
          </div>
        </div>

        <div class="hpc-agent-list">
          <article v-for="agent in control.managerAgents" :key="agent.id" class="hpc-agent-card">
            <div class="hpc-phase-card__head">
              <div>
                <p class="hpc-phase-card__kicker">{{ getManagerAgentRoleLabel(agent.role) }}</p>
                <h4 class="hpc-phase-card__title">{{ agent.title }}</h4>
              </div>
              <div class="hpc-phase-card__head-right">
                <span class="hpc-chip">действий: {{ getAgentRecommendationCount(agent.id) }}</span>
                <label class="hpc-agent-toggle">
                  <input v-model="agent.enabled" type="checkbox" @change="save">
                  <span>{{ agent.enabled ? 'активен' : 'выключен' }}</span>
                </label>
              </div>
            </div>

            <div class="hpc-grid">
              <div class="u-field">
                <label class="u-field__label">Основной канал</label>
                <select v-model="agent.linkedChannel" class="u-status-sel" @change="save">
                  <option v-for="option in communicationChannelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">Ритм, дней</label>
                <input v-model.number="agent.cadenceDays" type="number" min="1" max="90" class="glass-input" @blur="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Миссия</label>
                <textarea v-model="agent.mission" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Заметка менеджера</label>
                <textarea v-model="agent.notes" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
            </div>

            <div class="hpc-agent-targets">
              <span v-for="role in agent.targetRoles" :key="`${agent.id}-${role}`" class="hpc-chip">{{ getStakeholderRoleLabel(role) }}</span>
            </div>
          </article>
        </div>

        <div class="hpc-subsection">
          <div class="hpc-subsection__head">
            <div>
              <p class="hpc-section__label">Communication Playbook</p>
              <h4 class="hpc-phase-card__title">Протоколы handoff, approval и эскалации</h4>
            </div>
            <button type="button" class="a-btn-sm" @click="addCommunicationRule">добавить правило</button>
          </div>

          <div class="hpc-playbook-list">
            <article v-for="(rule, index) in control.communicationPlaybook" :key="rule.id" class="hpc-playbook-card">
              <div class="hpc-phase-card__head">
                <div>
                  <p class="hpc-phase-card__kicker">{{ getCommunicationChannelLabel(rule.linkedChannel) }}</p>
                  <h4 class="hpc-phase-card__title">{{ rule.title }}</h4>
                </div>
                <div class="hpc-phase-card__head-right">
                  <button type="button" class="a-btn-sm a-btn-danger" @click="removeCommunicationRule(index)">удалить</button>
                </div>
              </div>

              <div class="hpc-grid">
                <div class="u-field">
                  <label class="u-field__label">Название протокола</label>
                  <input v-model="rule.title" class="glass-input" @blur="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Владелец сценария</label>
                  <select v-model="rule.ownerAgentId" class="u-status-sel" @change="save">
                    <option v-for="option in managerAgentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Основной канал</label>
                  <select v-model="rule.linkedChannel" class="u-status-sel" @change="save">
                    <option v-for="option in communicationChannelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Ритм, дней</label>
                  <input v-model.number="rule.cadenceDays" type="number" min="1" max="90" class="glass-input" @blur="save" />
                </div>
                <div class="u-field u-field--full">
                  <label class="u-field__label">Когда запускать сценарий</label>
                  <textarea v-model="rule.trigger" class="glass-input u-ta" rows="2" @blur="save" />
                </div>
                <div class="u-field u-field--full">
                  <label class="u-field__label">Шаблон сообщения</label>
                  <textarea v-model="rule.template" class="glass-input u-ta" rows="2" @blur="save" />
                </div>
              </div>

              <div class="hpc-playbook-audience">
                <button
                  v-for="option in stakeholderRoleOptions"
                  :key="`${rule.id}-${option.value}`"
                  type="button"
                  class="hpc-chip hpc-chip--toggle"
                  :class="{ 'hpc-chip--active': hasRuleAudience(rule, option.value) }"
                  @click="toggleRuleAudience(rule, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </article>
          </div>
        </div>

        <div class="hpc-recommendation-list">
          <article v-for="recommendation in coordinationBrief.recommendations" :key="recommendation.id" class="hpc-recommendation-card">
            <div class="hpc-phase-card__head">
              <div>
                <p class="hpc-phase-card__kicker">{{ recommendation.channelLabel }}</p>
                <h4 class="hpc-phase-card__title">{{ recommendation.title }}</h4>
              </div>
              <div class="hpc-phase-card__head-right">
                <span class="hpc-pill" :class="`hpc-pill--${recommendation.tone}`">{{ recommendation.ownerAgentTitle }}</span>
              </div>
            </div>
            <p class="hpc-recommendation-text">{{ recommendation.reason }}</p>
            <p class="hpc-recommendation-text hpc-recommendation-text--message">{{ recommendation.suggestedMessage }}</p>
            <div class="hpc-agent-targets">
              <span v-for="label in recommendation.audienceLabels" :key="`${recommendation.id}-${label}`" class="hpc-chip">{{ label }}</span>
            </div>
          </article>
        </div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'communications'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Call Intelligence</p>
            <h3 class="hpc-section__title">Звонки, которые меняют проект</h3>
          </div>
        </div>

        <div class="hpc-grid">
          <div class="u-field">
            <label class="u-field__label">Название звонка</label>
            <input v-model="callInsightDraft.title" class="glass-input" placeholder="Например, созвон по согласованию кухни" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Связанная фаза</label>
            <select v-model="callInsightDraft.relatedPhaseKey" class="u-status-sel">
              <option value="">авто / без привязки</option>
              <option v-for="phase in control.phases" :key="phase.id" :value="phase.phaseKey">{{ phase.title }}</option>
            </select>
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">Краткий конспект</label>
            <textarea v-model="callInsightDraft.summary" class="glass-input u-ta" rows="3" placeholder="Что решили, что зависло, что нужно сделать дальше" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">Транскрипт или выдержка звонка</label>
            <textarea v-model="callInsightDraft.transcript" class="glass-input u-ta" rows="5" placeholder="Сюда можно вставить расшифровку звонка из мессенджера, а система сама выделит решения, блокеры и следующие шаги" />
          </div>
        </div>

        <div class="hpc-section__tools">
          <button type="button" class="a-btn-save" :disabled="callInsightSaving || !callInsightDraft.summary.trim()" @click="submitCallInsight">
            {{ callInsightSaving ? 'сохраняем...' : 'добавить звонок в проект' }}
          </button>
          <p v-if="callInsightStatus" class="hpc-recommendation-text">{{ callInsightStatus }}</p>
        </div>

        <div v-if="control.callInsights.length" class="hpc-call-insight-list">
          <article v-for="insight in control.callInsights" :key="insight.id" class="hpc-call-insight-card">
            <div class="hpc-phase-card__head">
              <div>
                <p class="hpc-phase-card__kicker">{{ formatCallInsightDate(insight.happenedAt || insight.createdAt) }}</p>
                <h4 class="hpc-phase-card__title">{{ insight.title }}</h4>
              </div>
              <div class="hpc-phase-card__head-right">
                <span class="hpc-pill" :class="`hpc-pill--${insight.tone}`">{{ getHealthTone(insight.tone) }}</span>
                <span v-if="getCallInsightActorLabel(insight)" class="hpc-chip">{{ getCallInsightActorLabel(insight) }}</span>
                <span v-if="insight.relatedPhaseKey" class="hpc-chip">{{ getPhaseTitleByKey(insight.relatedPhaseKey) }}</span>
                <span v-if="insight.appliedTaskIds?.length" class="hpc-chip">в задачах: {{ insight.appliedTaskIds.length }}</span>
                <button
                  v-if="insight.nextSteps.length"
                  type="button"
                  class="a-btn-sm"
                  :disabled="callInsightApplyPendingId === insight.id"
                  @click="applyCallInsightToSprint(insight.id)"
                >
                  {{ callInsightApplyPendingId === insight.id ? 'применяем...' : (insight.appliedTaskIds?.length ? 'досинхронизировать задачи' : 'в активный спринт') }}
                </button>
              </div>
            </div>
            <p class="hpc-recommendation-text hpc-recommendation-text--message">{{ insight.summary }}</p>
            <div v-if="insight.decisions.length" class="hpc-call-insight-block">
              <p class="hpc-phase-card__kicker">Решения</p>
              <div class="hpc-agent-targets">
                <span v-for="item in insight.decisions" :key="`${insight.id}-decision-${item}`" class="hpc-chip">{{ item }}</span>
              </div>
            </div>
            <div v-if="insight.nextSteps.length" class="hpc-call-insight-block">
              <p class="hpc-phase-card__kicker">Следующие шаги</p>
              <div class="hpc-call-insight-listing">
                <p v-for="item in insight.nextSteps" :key="`${insight.id}-next-${item}`" class="hpc-recommendation-text">{{ item }}</p>
              </div>
            </div>
            <div v-if="insight.blockers.length" class="hpc-call-insight-block">
              <p class="hpc-phase-card__kicker">Поднятые блокеры</p>
              <div class="hpc-call-insight-listing">
                <p v-for="item in insight.blockers" :key="`${insight.id}-blocker-${item}`" class="hpc-recommendation-text">{{ item }}</p>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="hpc-recommendation-text">Пока нет импортированных звонков. Сюда можно вставлять конспекты и транскрипты после созвонов.</p>
      </section>

      <section class="hpc-section" v-show="activeModule === 'communications'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Communication Log</p>
            <h3 class="hpc-section__title">Журнал отправленных поручений и уведомлений</h3>
          </div>
        </div>
        <div v-if="control.communicationLog && control.communicationLog.length > 0" class="hpc-grid">
          <article v-for="log in control.communicationLog" :key="log.id" class="hpc-agent-card">
            <div class="hpc-agent-card__head">
              <div class="hpc-agent-info">
                <span class="hpc-agent-role">{{ getMemberName(log.memberId) }}</span>
                <span class="hpc-agent-name">{{ log.channel }}</span>
              </div>
              <div class="hpc-status-label" :class="{'hpc-status-label--ok': log.status === 'delivered', 'hpc-status-label--error': log.status === 'failed'}">
                {{ log.status }}
              </div>
            </div>
            <p class="hpc-recommendation-text hpc-recommendation-text--message" style="margin-top: 12px; white-space: pre-wrap;">{{ log.message }}</p>
            <div class="hpc-phase-card__kicker" style="margin-top: 12px; opacity: 0.6;">{{ new Date(log.dispatchedAt).toLocaleString('ru-RU') }}</div>
          </article>
        </div>
        <p v-else class="hpc-recommendation-text">
          Журнал коммуникаций пуст. Здесь будут отображаться все поручения и сообщения, отправленные участникам гибридного контура через интерфейс.
        </p>
      </section>

      <section class="hpc-section" v-show="activeModule === 'timeline'">
        <div class="hpc-section__head">
          <div>
            <h3 class="hpc-section__title">Таймлайн проекта</h3>
          </div>
          <div class="hpc-section__tools">
            <div class="hpc-scale-switch" role="group" aria-label="Масштаб таймлайна">
              <button
                v-for="option in timelineScaleOptions"
                :key="option.value"
                type="button"
                class="hpc-scale-switch__btn"
                :class="{ 'hpc-scale-switch__btn--active': timelineScale === option.value }"
                @click="timelineScale = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <button
              v-if="hasCollapsibleTimelinePhases"
              type="button"
              class="hpc-scale-switch__btn"
              @click="toggleAllTimelinePhases"
            >
              {{ allTimelinePhasesCollapsed ? 'раскрыть все фазы' : 'свернуть все фазы' }}
            </button>
          </div>
        </div>

        <div class="hpc-board-wrap">
          <div class="hpc-board" :style="timelineBoardStyle">
            <div class="hpc-board__head">
              <div class="hpc-board__cell hpc-board__cell--entity">Слой</div>
              <div class="hpc-board__cell hpc-board__cell--period">Период</div>
              <div class="hpc-board__timeline-head-stack">
                <div class="hpc-board__timeline-groups" :style="timelineGridStyle">
                  <div
                    v-for="group in timelineGroups"
                    :key="group.key"
                    class="hpc-board__timeline-group-label"
                    :style="{ gridColumn: `span ${group.span}` }"
                  >
                    <span>{{ group.label }}</span>
                  </div>
                </div>
                <div class="hpc-board__timeline-head" :style="timelineGridStyle">
                  <div
                    v-for="column in timelineColumns"
                    :key="column.key"
                    class="hpc-board__week-label"
                  >
                    <span>{{ column.label }}</span>
                    <strong>{{ column.rangeLabel }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-for="row in visibleTimelineRows"
              :key="row.id"
              class="hpc-board__row"
              :class="{
                'hpc-board__row--phase': row.type === 'phase',
                'hpc-board__row--drag-over': timelineDrag.overRowId === row.id && timelineDrag.kind === 'reorder',
              }"
            >
              <div
                class="hpc-board__cell hpc-board__cell--entity hpc-board__entity"
                @dragover.prevent="onRowDragOver(row.id)"
                @drop="onRowDrop(row)"
              >
                <button
                  class="hpc-board__drag"
                  type="button"
                  :draggable="timelineEditingEnabled"
                  :disabled="!timelineEditingEnabled"
                  :aria-label="`Переместить ${row.title}`"
                  @dragstart="onReorderDragStart($event, row)"
                  @dragend="onDragEnd"
                >
                  ::
                </button>
                <div class="hpc-board__entity-body">
                  <div class="hpc-board__entity-top">
                    <span class="hpc-board__type">{{ row.typeLabel }}</span>
                    <span class="hpc-pill" :class="`hpc-pill--${row.tone}`">{{ row.statusLabel }}</span>
                    <button
                      v-if="row.type === 'phase' && getTimelinePhaseSprintCount(row.phaseKey)"
                      type="button"
                      class="hpc-board__toggle"
                      @click="toggleTimelinePhase(row.phaseKey)"
                    >
                      {{ isTimelinePhaseCollapsed(row.phaseKey) ? `показать ${getTimelinePhaseSprintCount(row.phaseKey)}` : `свернуть ${getTimelinePhaseSprintCount(row.phaseKey)}` }}
                    </button>
                  </div>
                  <strong class="hpc-board__title">{{ row.title }}</strong>
                  <div class="hpc-board__meta-line">{{ row.meta }}</div>
                </div>
              </div>

              <div class="hpc-board__cell hpc-board__cell--period hpc-board__period">
                <span>{{ formatDateRange(row.startDate, row.endDate) }}</span>
                <strong>{{ row.progressLabel }}</strong>
              </div>

              <div class="hpc-board__timeline">
                <div class="hpc-board__weeks" :style="timelineGridStyle">
                  <div
                    v-for="(column, columnIndex) in timelineColumns"
                    :key="`${row.id}-${column.key}`"
                    class="hpc-board__week"
                    :class="{ 'hpc-board__week--drop': timelineDrag.overColumnKey === `${row.id}-${column.key}` }"
                    @dragover.prevent="onTimelineWeekDragOver(row.id, column.key)"
                    @drop="onTimelineWeekDrop(row, columnIndex)"
                  />
                </div>
                <div
                  class="hpc-board__bar"
                  :class="`hpc-board__bar--${row.tone}`"
                  :style="getTimelineBarStyle(row)"
                  :draggable="timelineEditingEnabled"
                  @dragstart="onScheduleDragStart($event, row)"
                  @dragend="onDragEnd"
                >
                  <button
                    class="hpc-board__bar-handle hpc-board__bar-handle--start"
                    type="button"
                    :disabled="!timelineEditingEnabled"
                    :aria-label="`Сдвинуть начало ${row.title}`"
                    :draggable="timelineEditingEnabled"
                    @dragstart.stop="onResizeDragStart($event, row, 'start')"
                    @dragend="onDragEnd"
                  />
                  <span class="hpc-board__bar-label">{{ row.title }}</span>
                  <button
                    class="hpc-board__bar-handle hpc-board__bar-handle--end"
                    type="button"
                    :disabled="!timelineEditingEnabled"
                    :aria-label="`Сдвинуть окончание ${row.title}`"
                    :draggable="timelineEditingEnabled"
                    @dragstart.stop="onResizeDragStart($event, row, 'end')"
                    @dragend="onDragEnd"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'phases'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Фазовый слой</p>
            <h3 class="hpc-section__title">Базовые этапы и привязка спринтов</h3>
          </div>
        </div>

        <AdminProjectPhaseBoard :control="control" @save="save" />

        <div class="hpc-phase-list" style="margin-top: 24px;">
          <article v-for="phase in control.phases" :key="phase.id" class="hpc-phase-card">
            <div class="hpc-phase-card__head">
              <div>
                <p class="hpc-phase-card__kicker">{{ phase.phaseKey }}</p>
                <h4 class="hpc-phase-card__title">{{ phase.title }}</h4>
              </div>
              <div class="hpc-phase-card__head-right">
                <select v-model="phase.status" class="u-status-sel" @change="save">
                  <option v-for="option in phaseStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <span class="hpc-chip">{{ phase.percent || 0 }}%</span>
              </div>
            </div>

            <div class="hpc-grid">
              <div class="u-field">
                <label class="u-field__label">Ответственный</label>
                <input v-model="phase.owner" class="glass-input" placeholder="Ответственный" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Прогресс, %</label>
                <input v-model.number="phase.percent" type="number" min="0" max="100" class="glass-input" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Плановый старт</label>
                <AppDatePicker v-model="phase.startDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Плановый финиш</label>
                <AppDatePicker v-model="phase.endDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Ключевой результат</label>
                <textarea v-model="phase.deliverable" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Заметка менеджера</label>
                <textarea v-model="phase.notes" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
            </div>

            <div class="hpc-gates">
              <label v-for="gate in phase.gates" :key="gate.id" class="hpc-gate-row">
                <input v-model="gate.done" type="checkbox" @change="save" />
                <span>{{ gate.label }}</span>
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'kanban'">
        <AdminProjectKanban :control="control" @save="save" />
      </section>

      <section class="hpc-section" v-show="activeModule === 'phases'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Формы метаданных</p>
            <h3 class="hpc-section__title">Редактирование спринтов</h3>
          </div>
          <button class="a-btn-sm" type="button" @click="addSprint">+ спринт</button>
        </div>

        <div v-if="control.sprints.length" class="hpc-sprint-list">
          <article v-for="(sprint, sprintIndex) in control.sprints" :key="sprint.id" class="hpc-sprint-card">
            <div class="hpc-sprint-card__head">
              <div class="hpc-grid hpc-grid--top">
                <div class="u-field">
                  <label class="u-field__label">Название спринта</label>
                  <input v-model="sprint.name" class="glass-input" @blur="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Привязка к фазе</label>
                  <select v-model="sprint.linkedPhaseKey" class="u-status-sel" @change="save">
                    <option v-for="phase in control.phases" :key="phase.phaseKey" :value="phase.phaseKey">{{ phase.title }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Статус</label>
                  <select v-model="sprint.status" class="u-status-sel" @change="save">
                    <option v-for="option in sprintStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Удалить спринт</label>
                  <button class="a-btn-sm a-btn-danger" type="button" @click="removeSprint(sprintIndex)">удалить</button>
                </div>
              </div>
            </div>

            <div class="hpc-grid">
              <div class="u-field u-field--full">
                <label class="u-field__label">Цель спринта</label>
                <textarea v-model="sprint.goal" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Старт</label>
                <AppDatePicker v-model="sprint.startDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Финиш</label>
                <AppDatePicker v-model="sprint.endDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Фокус команды</label>
                <textarea v-model="sprint.focus" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
            </div>



            <div class="u-field">
              <label class="u-field__label">Ретроспектива</label>
              <textarea v-model="sprint.retrospective" class="glass-input u-ta" rows="2" @blur="save" />
            </div>
          </article>
        </div>
        <div v-else class="hpc-empty">спринты ещё не добавлены</div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'health'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Здоровье проекта</p>
            <h3 class="hpc-section__title">Контрольные точки и блокеры</h3>
          </div>
          <button class="a-btn-sm" type="button" @click="addCheckpoint">+ точка</button>
        </div>

        <div class="hpc-checkpoint-list">
          <div v-for="(checkpoint, checkpointIndex) in control.checkpoints" :key="checkpoint.id" class="hpc-checkpoint-row">
            <input v-model="checkpoint.title" class="glass-input" placeholder="Контрольная точка" @blur="save" />
            <input v-model="checkpoint.category" class="glass-input" placeholder="Категория" @blur="save" />
            <select v-model="checkpoint.status" class="u-status-sel" @change="save">
              <option v-for="option in checkpointStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <input v-model="checkpoint.note" class="glass-input hpc-checkpoint-row__note" placeholder="Что происходит" @blur="save" />
            <button class="a-btn-sm a-btn-danger" type="button" @click="removeCheckpoint(checkpointIndex)">×</button>
          </div>
        </div>

        <div class="hpc-task-head hpc-task-head--blockers">
          <span class="hpc-task-head__title">Текущие блокеры</span>
          <button class="a-btn-sm" type="button" @click="addBlocker">+ блокер</button>
        </div>
        <div class="hpc-blocker-list">
          <div v-for="(blocker, blockerIndex) in control.blockers" :key="`blocker-${blockerIndex}`" class="hpc-blocker-row">
            <input v-model="control.blockers[blockerIndex]" class="glass-input hpc-blocker-row__input" placeholder="Что тормозит проект" @blur="save" />
            <button class="a-btn-sm a-btn-danger" type="button" @click="removeBlocker(blockerIndex)">×</button>
          </div>
        </div>
      </section>
    </template>
  
    <Teleport to="body">
      <div v-if="msgModalOpen" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(8px);">
        <div class="glass-surface" style="width: 400px; padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 16px; color: var(--ds-surface-fg);">
          <h3 style="font-size: 1.25rem; font-weight: 500; margin: 0;">Отправить сообщение</h3>
          <p style="font-size: 0.9rem; opacity: 0.8; margin: 0;">
            Получатель: {{ msgModalTarget?.name || 'Без имени' }} (Канал: {{ msgModalTarget?.notifyBy }})
          </p>
          <textarea v-model="msgModalText" class="glass-input" style="min-height: 120px; padding: 12px; resize: vertical;" placeholder="Напишите суть задачи, правки или вопроса..."></textarea>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="a-btn-sm a-btn-danger" @click="msgModalOpen = false">Отмена</button>
            <button type="button" class="a-btn-sm a-btn-save" :disabled="msgModalSending" @click="executeMessageDispatch">{{ msgModalSending ? 'Отправка...' : 'Отправить' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeModule = ref('overview')

const modules = [
  { id: 'overview', label: 'Обзор' },
  { id: 'timeline', label: 'Таймлайн / Таблица' },
  { id: 'phases', label: 'Этапы и Спринты' },
  { id: 'kanban', label: 'Канбан' },
  { id: 'health', label: 'Контрольные точки' },
  { id: 'communications', label: 'Звонки и Агенты' }
]

import {
  buildHybridControlSummary,
  buildHybridCoordinationBrief,
  ensureHybridControl,
  getHealthTone,
  getHybridCommunicationChannelLabel,
  getHybridControlManagerAgentRoleLabel,
  getHybridStakeholderRoleLabel,
} from '~~/shared/utils/project-control'
import {
  addTimelineDays,
  buildHybridTimelineBounds,
  buildHybridTimelineColumns,
  buildHybridTimelineGroups,
  buildHybridTimelineRows,
  endOfHybridTimelineScale,
  formatHybridTimelineDateRange,
  getHybridTimelineBarStyle,
  getHybridTimelineColumnWidth,
  getHybridTimelineScaleLabel,
  resolveHybridTimelineRowRange,
  type HybridTimelineScale,
  toIsoLocalDate,
  type HybridTimelineRow,
} from '~~/shared/utils/project-control-timeline'
import type {
  HybridControl,
  HybridControlCallInsight,
  HybridControlCommunicationChannel,
  HybridControlCommunicationRule,
  HybridControlManagerAgentRole,
  HybridControlSprint,
  HybridControlStakeholderRole,
  HybridControlTask,
} from '~~/shared/types/project'

const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const control = reactive<HybridControl>(ensureHybridControl(undefined))

const phaseStatusOptions = [
  { value: 'planned', label: 'запланирована' },
  { value: 'active', label: 'в работе' },
  { value: 'blocked', label: 'заблокирована' },
  { value: 'done', label: 'завершена' },
] as const

const sprintStatusOptions = [
  { value: 'planned', label: 'запланирован' },
  { value: 'active', label: 'активен' },
  { value: 'review', label: 'на ревью' },
  { value: 'done', label: 'завершён' },
] as const

const checkpointStatusOptions = [
  { value: 'stable', label: 'стабильно' },
  { value: 'warning', label: 'внимание' },
  { value: 'critical', label: 'критично' },
] as const

const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}

const timelineScale = ref<HybridTimelineScale>('weeks')

const timelineScaleOptions = (
  ['months', 'weeks', 'days', 'hours'] as const satisfies readonly HybridTimelineScale[]
).map(value => ({ value, label: getHybridTimelineScaleLabel(value) }))

type TimelineDragKind = 'idle' | 'reorder' | 'schedule' | 'resize-start' | 'resize-end'

const timelineDrag = reactive<{
  kind: TimelineDragKind
  rowId: string
  rowType: HybridTimelineRow['type'] | null
  overRowId: string
  overColumnKey: string
}>({
  kind: 'idle',
  rowId: '',
  rowType: null,
  overRowId: '',
  overColumnKey: '',
})

watch(project, (value) => {
  if (!value) return
  Object.assign(control, ensureHybridControl(value.profile?.hybridControl, value))
}, { immediate: true })

const summary = computed(() => buildHybridControlSummary(control))
const coordinationBrief = computed(() => buildHybridCoordinationBrief(control, { projectSlug: props.slug }))

const communicationChannelOptions = (
  ['project-room', 'direct-thread', 'handoff', 'approval', 'daily-digest'] as const satisfies readonly HybridControlCommunicationChannel[]
).map(value => ({
  value,
  label: getHybridCommunicationChannelLabel(value),
}))

const stakeholderRoleOptions = (
  ['admin', 'manager', 'designer', 'client', 'contractor', 'seller', 'service'] as const satisfies readonly HybridControlStakeholderRole[]
).map(value => ({
  value,
  label: getHybridStakeholderRoleLabel(value),
}))

const managerAgentOptions = computed(() => control.managerAgents.map(agent => ({
  value: agent.id,
  label: agent.title,
})))

const callInsightDraft = reactive({
  title: '',
  relatedPhaseKey: '',
  summary: '',
  transcript: '',
})

const callInsightSaving = ref(false)
const callInsightStatus = ref('')
const callInsightApplyPendingId = ref('')

const timelineRows = computed(() => buildHybridTimelineRows(control))

const timelineCollapsedPhases = reactive<Record<string, boolean>>({})

watch(() => control.phases.map(phase => phase.phaseKey), (phaseKeys) => {
  const activeKeys = new Set(phaseKeys)

  phaseKeys.forEach((phaseKey) => {
    if (!(phaseKey in timelineCollapsedPhases)) {
      timelineCollapsedPhases[phaseKey] = false
    }
  })

  Object.keys(timelineCollapsedPhases).forEach((phaseKey) => {
    if (!activeKeys.has(phaseKey)) {
      delete timelineCollapsedPhases[phaseKey]
    }
  })
}, { immediate: true })

const timelineSprintCountByPhase = computed(() => control.sprints.reduce<Record<string, number>>((acc, sprint) => {
  if (!sprint.linkedPhaseKey) return acc
  acc[sprint.linkedPhaseKey] = (acc[sprint.linkedPhaseKey] || 0) + 1
  return acc
}, {}))

const collapsibleTimelinePhaseKeys = computed(() => Object.entries(timelineSprintCountByPhase.value)
  .filter(([, count]) => count > 0)
  .map(([phaseKey]) => phaseKey))

const hasCollapsibleTimelinePhases = computed(() => collapsibleTimelinePhaseKeys.value.length > 0)

const allTimelinePhasesCollapsed = computed(() => hasCollapsibleTimelinePhases.value
  && collapsibleTimelinePhaseKeys.value.every(phaseKey => timelineCollapsedPhases[phaseKey]))

const visibleTimelineRows = computed(() => timelineRows.value.filter((row) => {
  if (row.type === 'phase') return true
  if (!row.linkedPhaseKey) return true
  return !timelineCollapsedPhases[row.linkedPhaseKey]
}))

const timelineBounds = computed(() => buildHybridTimelineBounds(timelineRows.value, timelineScale.value))

const timelineColumns = computed(() => buildHybridTimelineColumns(timelineBounds.value, timelineScale.value))

const timelineGroups = computed(() => buildHybridTimelineGroups(timelineColumns.value, timelineScale.value))

const timelineGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(timelineColumns.value.length, 1)}, minmax(0, 1fr))`,
}))

const timelineEditingEnabled = computed(() => timelineScale.value !== 'hours')
const timelineBoardStyle = computed(() => ({
  '--hpc-entity-column-width': '260px',
  '--hpc-period-column-width': '170px',
  minWidth: `${430 + Math.max(timelineColumns.value.length, 1) * getHybridTimelineColumnWidth(timelineScale.value)}px`,
}))

function getMemberName(id: string) {
  const m = control.team?.find((t: any) => t.id === id)
  return m ? m.name : id
}

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: {
      profile: {
        ...(project.value?.profile || {}),
        hybridControl: control,
      },
    },
  })
  markSaved()
  await refresh()
}

function addSprint() {
  control.sprints.push({
    id: `hybrid-sprint-${Date.now()}`,
    name: `Спринт ${control.sprints.length + 1}`,
    linkedPhaseKey: summary.value.activePhase?.phaseKey || 'construction',
    goal: '',
    focus: '',
    status: 'planned',
    startDate: '',
    endDate: '',
    retrospective: '',
    tasks: [],
  })
  save()
}

function removeSprint(index: number) {
  control.sprints.splice(index, 1)
  save()
}

function addTask(sprint: HybridControlSprint) {
  sprint.tasks.push({
    id: `hybrid-task-${Date.now()}`,
    title: 'Новая задача',
    status: 'todo',
    assignee: '',
    dueDate: '',
    points: 1,
    notes: '',
  })
  save()
}

function removeTask(sprint: HybridControlSprint, index: number) {
  sprint.tasks.splice(index, 1)
  save()
}

function cycleTask(task: HybridControlTask) {
  const next: Record<string, HybridControlTask['status']> = {
    todo: 'doing',
    doing: 'review',
    review: 'done',
    done: 'todo',
  }
  task.status = next[task.status]
  save()
}

function addCheckpoint() {
  control.checkpoints.push({
    id: `hybrid-checkpoint-${Date.now()}`,
    title: 'Новая контрольная точка',
    category: 'control',
    status: 'stable',
    note: '',
  })
  save()
}

function removeCheckpoint(index: number) {
  control.checkpoints.splice(index, 1)
  save()
}

function addBlocker() {
  control.blockers.push('')
  save()
}

function removeBlocker(index: number) {
  control.blockers.splice(index, 1)
  save()
}

function addCommunicationRule() {
  control.communicationPlaybook.push({
    id: `hybrid-rule-${Date.now()}`,
    title: `Правило ${control.communicationPlaybook.length + 1}`,
    trigger: 'Опишите условие, при котором запускается сценарий.',
    linkedChannel: 'project-room',
    audience: ['manager', 'designer'],
    ownerAgentId: managerAgentOptions.value[0]?.value || '',
    cadenceDays: 7,
    template: 'Коротко обозначьте статус, ожидание и следующий шаг.',
  })
  save()
}

function removeCommunicationRule(index: number) {
  control.communicationPlaybook.splice(index, 1)
  save()
}

async function submitCallInsight() {
  if (!callInsightDraft.summary.trim() || callInsightSaving.value) return

  callInsightSaving.value = true
  callInsightStatus.value = ''

  try {
    const response = await $fetch<{
      hybridControl: HybridControl
      meta: {
        blockerCountAdded: number
        checkpointCreated: boolean
      }
    }>(`/api/projects/${props.slug}/communications/call-insights`, {
      method: 'POST',
      body: {
        title: callInsightDraft.title,
        relatedPhaseKey: callInsightDraft.relatedPhaseKey,
        summary: callInsightDraft.summary,
        transcript: callInsightDraft.transcript,
      },
    })

    Object.assign(control, ensureHybridControl(response.hybridControl, project.value || {}))
    callInsightDraft.title = ''
    callInsightDraft.relatedPhaseKey = ''
    callInsightDraft.summary = ''
    callInsightDraft.transcript = ''
    callInsightStatus.value = response.meta.checkpointCreated
      ? `Звонок добавлен: блокеров поднято ${response.meta.blockerCountAdded}, контрольная точка создана.`
      : `Звонок добавлен: блокеров поднято ${response.meta.blockerCountAdded}.`
    markSaved()
    await refresh()
  } catch {
    callInsightStatus.value = 'Не удалось сохранить инсайты звонка.'
  } finally {
    callInsightSaving.value = false
  }
}

async function applyCallInsightToSprint(insightId: string) {
  if (!insightId || callInsightApplyPendingId.value) return

  callInsightApplyPendingId.value = insightId
  callInsightStatus.value = ''

  try {
    const response = await $fetch<{
      hybridControl: HybridControl
      meta: {
        createdTaskCount: number
        createdSprint: boolean
      }
    }>(`/api/projects/${props.slug}/communications/call-insights/${insightId}/apply`, {
      method: 'POST',
      body: {},
    })

    Object.assign(control, ensureHybridControl(response.hybridControl, project.value || {}))
    callInsightStatus.value = response.meta.createdTaskCount
      ? `Задач создано: ${response.meta.createdTaskCount}${response.meta.createdSprint ? '. Для них автоматически создан follow-up спринт.' : '.'}`
      : 'Новых задач не создано: все следующие шаги уже есть в спринте.'
    markSaved()
    await refresh()
  } catch {
    callInsightStatus.value = 'Не удалось превратить инсайт звонка в задачи спринта.'
  } finally {
    callInsightApplyPendingId.value = ''
  }
}

function formatDateRange(startDate?: string, endDate?: string) {
  return formatHybridTimelineDateRange(startDate, endDate)
}

function getTimelineBarStyle(row: HybridTimelineRow) {
  return getHybridTimelineBarStyle(row, timelineBounds.value)
}

function getPhaseById(id: string) {
  return control.phases.find(phase => phase.id === id) || null
}

function getSprintById(id: string) {
  return control.sprints.find(sprint => sprint.id === id) || null
}

function getManagerAgentRoleLabel(role: HybridControlManagerAgentRole) {
  return getHybridControlManagerAgentRoleLabel(role)
}

function getCommunicationChannelLabel(channel: HybridControlCommunicationChannel) {
  return getHybridCommunicationChannelLabel(channel)
}

function getStakeholderRoleLabel(role: HybridControlStakeholderRole) {
  return getHybridStakeholderRoleLabel(role)
}

function getPhaseTitleByKey(phaseKey?: string) {
  if (!phaseKey) return 'Без привязки'
  return control.phases.find(phase => phase.phaseKey === phaseKey)?.title || phaseKey
}

function formatCallInsightDate(value?: string) {
  if (!value) return 'без даты'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getCallInsightActorLabel(insight: HybridControlCallInsight) {
  const roleLabel = insight.actorRole ? getStakeholderRoleLabel(insight.actorRole) : ''
  const actorName = insight.actorName || ''

  if (roleLabel && actorName) return `${roleLabel}: ${actorName}`
  return actorName || roleLabel
}

function hasRuleAudience(rule: HybridControlCommunicationRule, role: HybridControlStakeholderRole) {
  return rule.audience.includes(role)
}

function toggleRuleAudience(rule: HybridControlCommunicationRule, role: HybridControlStakeholderRole) {
  const index = rule.audience.indexOf(role)

  if (index >= 0) {
    if (rule.audience.length === 1) return
    rule.audience.splice(index, 1)
  } else {
    rule.audience.push(role)
  }

  save()
}

function getAgentRecommendationCount(agentId: string) {
  return coordinationBrief.value.agents.find(agent => agent.id === agentId)?.recommendedActionCount || 0
}

function getTimelinePhaseSprintCount(phaseKey?: string) {
  if (!phaseKey) return 0
  return timelineSprintCountByPhase.value[phaseKey] || 0
}

function isTimelinePhaseCollapsed(phaseKey?: string) {
  if (!phaseKey) return false
  return !!timelineCollapsedPhases[phaseKey]
}

function toggleTimelinePhase(phaseKey?: string) {
  if (!phaseKey || !getTimelinePhaseSprintCount(phaseKey)) return
  timelineCollapsedPhases[phaseKey] = !timelineCollapsedPhases[phaseKey]
}

function collapseAllTimelinePhases() {
  collapsibleTimelinePhaseKeys.value.forEach((phaseKey) => {
    timelineCollapsedPhases[phaseKey] = true
  })
}

function expandAllTimelinePhases() {
  collapsibleTimelinePhaseKeys.value.forEach((phaseKey) => {
    timelineCollapsedPhases[phaseKey] = false
  })
}

function toggleAllTimelinePhases() {
  if (allTimelinePhasesCollapsed.value) {
    expandAllTimelinePhases()
    return
  }
  collapseAllTimelinePhases()
}

function reorderItems<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex(item => item.id === sourceId)
  const targetIndex = items.findIndex(item => item.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return false
  const [moved] = items.splice(sourceIndex, 1)
  if (!moved) return false
  items.splice(targetIndex, 0, moved)
  return true
}

function onReorderDragStart(event: DragEvent, row: HybridTimelineRow) {
  if (!timelineEditingEnabled.value) return
  timelineDrag.kind = 'reorder'
  timelineDrag.rowId = row.id
  timelineDrag.rowType = row.type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'reorder', rowId: row.id, rowType: row.type }))
  }
}

function onScheduleDragStart(event: DragEvent, row: HybridTimelineRow) {
  if (!timelineEditingEnabled.value) return
  timelineDrag.kind = 'schedule'
  timelineDrag.rowId = row.id
  timelineDrag.rowType = row.type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'schedule', rowId: row.id, rowType: row.type }))
  }
}

function onResizeDragStart(event: DragEvent, row: HybridTimelineRow, edge: 'start' | 'end') {
  if (!timelineEditingEnabled.value) return
  timelineDrag.kind = edge === 'start' ? 'resize-start' : 'resize-end'
  timelineDrag.rowId = row.id
  timelineDrag.rowType = row.type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ kind: timelineDrag.kind, rowId: row.id, rowType: row.type }))
  }
}

function onRowDragOver(rowId: string) {
  if (!timelineEditingEnabled.value) return
  if (timelineDrag.kind !== 'reorder') return
  timelineDrag.overRowId = rowId
}

function onTimelineWeekDragOver(rowId: string, columnKey: string) {
  if (!timelineEditingEnabled.value) return
  if (!['schedule', 'resize-start', 'resize-end'].includes(timelineDrag.kind)) return
  timelineDrag.overColumnKey = `${rowId}-${columnKey}`
}

async function onRowDrop(target: HybridTimelineRow) {
  if (timelineDrag.kind !== 'reorder' || !timelineDrag.rowId || timelineDrag.rowId === target.id) {
    onDragEnd()
    return
  }

  let changed = false

  if (timelineDrag.rowType === 'phase' && target.type === 'phase') {
    changed = reorderItems(control.phases, timelineDrag.rowId, target.id)
  }

  if (timelineDrag.rowType === 'sprint') {
    const sourceSprint = getSprintById(timelineDrag.rowId)
    if (sourceSprint) {
      if (target.type === 'phase' && target.phaseKey) {
        sourceSprint.linkedPhaseKey = target.phaseKey
        changed = true
      }
      if (target.type === 'sprint') {
        sourceSprint.linkedPhaseKey = target.linkedPhaseKey || sourceSprint.linkedPhaseKey
      }
      changed = reorderItems(control.sprints, timelineDrag.rowId, target.id) || changed
    }
  }

  onDragEnd()
  if (changed) await save()
}

async function onTimelineWeekDrop(row: HybridTimelineRow, columnIndex: number) {
  if (!timelineEditingEnabled.value) {
    onDragEnd()
    return
  }
  if (!['schedule', 'resize-start', 'resize-end'].includes(timelineDrag.kind) || timelineDrag.rowId !== row.id || timelineDrag.rowType !== row.type) {
    onDragEnd()
    return
  }

  const column = timelineColumns.value[columnIndex]
  if (!column) {
    onDragEnd()
    return
  }

  const range = resolveHybridTimelineRowRange(row)
  const durationDays = Math.max(Math.round((range.end.getTime() - range.start.getTime()) / 86400000), 0)
  const nextStart = new Date(column.start)
  const nextEnd = addTimelineDays(nextStart, durationDays)

  if (timelineDrag.kind === 'resize-start') {
    const resizedEnd = new Date(range.end)
    const resizedStart = nextStart.getTime() > resizedEnd.getTime() ? resizedEnd : nextStart
    await persistTimelineRange(row, resizedStart, resizedEnd)
    onDragEnd()
    return
  }

  if (timelineDrag.kind === 'resize-end') {
    const resizedStart = new Date(range.start)
    const droppedWeekEnd = endOfHybridTimelineScale(nextStart, timelineScale.value)
    const resizedEnd = droppedWeekEnd.getTime() < resizedStart.getTime() ? resizedStart : droppedWeekEnd
    await persistTimelineRange(row, resizedStart, resizedEnd)
    onDragEnd()
    return
  }

  await persistTimelineRange(row, nextStart, nextEnd)
  onDragEnd()
}

async function persistTimelineRange(row: HybridTimelineRow, start: Date, end: Date) {
  if (row.type === 'phase') {
    const phase = getPhaseById(row.id)
    if (!phase) return
    phase.startDate = toIsoLocalDate(start)
    phase.endDate = toIsoLocalDate(end)
    await save()
    return
  }

  const sprint = getSprintById(row.id)
  if (!sprint) return
  sprint.startDate = toIsoLocalDate(start)
  sprint.endDate = toIsoLocalDate(end)
  await save()
}

function onDragEnd() {
  timelineDrag.kind = 'idle'
  timelineDrag.rowId = ''
  timelineDrag.rowType = null
  timelineDrag.overRowId = ''
  timelineDrag.overColumnKey = ''
}

const msgModalOpen = ref(false)
const msgModalTarget = ref<any>(null)
const msgModalText = ref('')
const msgModalSending = ref(false)
async function executeMessageDispatch() {
  if (!msgModalTarget.value || !msgModalText.value) return
  msgModalSending.value = true
  try {
    const res = await $fetch(`/api/projects/${props.slug}/communications/dispatch`, {
      method: 'POST',
      body: {
        memberId: msgModalTarget.value.id,
        message: msgModalText.value
      }
    })
    
    if (res.success) {
      const resp = res as any
      if (!control.communicationLog) {
        control.communicationLog = []
      }
      control.communicationLog.push({
        id: crypto.randomUUID(),
        memberId: msgModalTarget.value.id,
        channel: msgModalTarget.value.notifyBy || 'manual',
        message: msgModalText.value,
        status: 'delivered',
        dispatchedAt: new Date().toISOString()
      })
      alert(`Сообщение успешно отправлено через ${resp.channel}`)
      msgModalText.value = ''
      msgModalOpen.value = false
    }
  } catch (e: any) {
    alert(`Ошибка: ${e.message || 'Не удалось отправить'}`)
  } finally {
    msgModalSending.value = false
  }
}
</script>

<style scoped>



.hpc-module-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--glass-surface, #ffffff);
  border-bottom: 1px solid var(--glass-border, #e5e5e5);
  padding: 12px 24px;
  margin: 0 -24px 24px -24px;
  backdrop-filter: blur(12px);
}

@media (max-width: 768px) {
  .hpc-module-nav {
    position: fixed;
    bottom: 0px;
    top: auto;
    left: 0;
    right: 0;
    margin: 0;
    border-top: 1px solid var(--glass-border, #e5e5e5);
    border-bottom: none;
    background: rgba(255,255,255, 0.95);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 1000;
  }
}

html.dark .hpc-module-nav {
  background: var(--glass-surface, #1e1e1e);
}
@media (max-width: 768px) {
  html.dark .hpc-module-nav {
    background: rgba(30,30,30, 0.95);
  }
}

.hpc-module-nav__scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hpc-module-nav__scroll::-webkit-scrollbar {
  display: none;
}

.hpc-module-nav__btn {
  white-space: nowrap;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.hpc-module-nav__btn:hover {
  background: var(--glass-surf-hover, #f5f5f5);
}

.hpc-module-nav__btn--active {
  color: var(--text-primary, #000);
  background: var(--glass-surface, #fff);
  border-color: var(--glass-border, #e5e5e5);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

html.dark .hpc-module-nav__btn--active {
  color: #fff;
  background: var(--glass-surface, #2d2d2d);
  border-color: var(--glass-border, #3d3d3d);
}
</style>

<style scoped>
.hpc-root {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 4px 0 40px;
}

.hpc-summary,
.hpc-section {
  position: relative;
  padding: 18px 0 0;
}

.hpc-summary::before,
.hpc-section::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ds-accent) 42%, transparent), color-mix(in srgb, var(--glass-text) 8%, transparent) 62%, transparent);
}

.hpc-summary__head,
.hpc-section__head,
.hpc-phase-card__head,
.hpc-sprint-card__head,
.hpc-task-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.hpc-summary__meta,
.hpc-phase-card__head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hpc-section__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hpc-scale-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hpc-scale-switch__btn {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.hpc-scale-switch__btn--active {
  color: var(--glass-text);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}

.hpc-eyebrow,
.hpc-section__label,
.hpc-phase-card__kicker {
  margin: 0 0 6px;
  font-size: .68rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
}

.hpc-title,
.hpc-section__title,
.hpc-phase-card__title {
  margin: 0;
  letter-spacing: .04em;
}

.hpc-title {
  font-size: clamp(1.2rem, 2.2vw, 1.8rem);
}

.hpc-section__title {
  font-size: 1rem;
}

.hpc-phase-card__title {
  font-size: .96rem;
}

.hpc-saved,
.hpc-chip,
.hpc-task-head__title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.hpc-pill,
.hpc-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.hpc-chip--toggle {
  cursor: pointer;
  transition: background-color .18s ease, border-color .18s ease, color .18s ease;
}

.hpc-chip--active {
  color: var(--glass-text);
  border-color: color-mix(in srgb, var(--ds-accent) 22%, transparent);
  background: color-mix(in srgb, var(--ds-accent) 10%, transparent);
}

.hpc-pill--stable { color: var(--ds-success); }
.hpc-pill--warning { color: var(--ds-warning); }
.hpc-pill--critical { color: var(--ds-error); }

.hpc-metrics,
.hpc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.hpc-grid--top {
  width: 100%;
}

.hpc-metric {
  min-height: 72px;
  padding: 10px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.hpc-metric__label {
  display: block;
  margin-bottom: 8px;
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

.hpc-metric__value {
  font-size: 1.1rem;
  letter-spacing: .06em;
}

.hpc-phase-list,
.hpc-sprint-list,
.hpc-checkpoint-list,
.hpc-blocker-list {
  display: grid;
  gap: 14px;
}

.hpc-agent-list,
.hpc-recommendation-list {
  display: grid;
  gap: 14px;
}

.hpc-subsection {
  display: grid;
  gap: 14px;
  padding-top: 18px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.hpc-subsection__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hpc-playbook-list {
  display: grid;
  gap: 14px;
}

.hpc-call-insight-list {
  display: grid;
  gap: 14px;
}

.hpc-agent-card,
.hpc-recommendation-card {
  display: grid;
  gap: 14px;
  padding: 0 0 0 18px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.hpc-call-insight-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.hpc-playbook-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.hpc-agent-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hpc-playbook-audience {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hpc-call-insight-block,
.hpc-call-insight-listing {
  display: grid;
  gap: 8px;
}

.hpc-agent-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: color-mix(in srgb, var(--glass-text) 56%, transparent);
}

.hpc-recommendation-text {
  margin: 0;
  font-size: .8rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--glass-text) 68%, transparent);
}

.hpc-recommendation-text--message {
  color: var(--glass-text);
}

.hpc-board-wrap {
  overflow-x: auto;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.hpc-board {
  min-width: 1040px;
}

.hpc-board__head,
.hpc-board__row {
  display: grid;
  grid-template-columns: var(--hpc-entity-column-width, 260px) var(--hpc-period-column-width, 170px) minmax(520px, 2fr);
  gap: 0;
  align-items: stretch;
}

.hpc-board__head {
  position: sticky;
  top: 0;
  z-index: 8;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  backdrop-filter: blur(12px);
}

.hpc-board__row {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-board__row--phase {
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.hpc-board__row--drag-over {
  background: color-mix(in srgb, var(--ds-accent) 4%, transparent);
}

.hpc-board__cell,
.hpc-board__timeline-head-stack,
.hpc-board__timeline {
  min-height: 72px;
}

.hpc-board__cell {
  padding: 12px 0;
}

.hpc-board__cell--entity,
.hpc-board__cell--period {
  position: sticky;
  z-index: 3;
}

.hpc-board__cell--entity {
  left: 0;
}

.hpc-board__cell--period {
  left: var(--hpc-entity-column-width, 260px);
}

.hpc-board__head .hpc-board__cell,
.hpc-board__head .hpc-board__timeline-head-stack,
.hpc-board__head .hpc-board__timeline-groups,
.hpc-board__head .hpc-board__timeline-head,
.hpc-board__head .hpc-board__timeline-group-label,
.hpc-board__head .hpc-board__week-label {
  background: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
}

.hpc-board__cell--entity,
.hpc-board__cell--period {
  padding-right: 14px;
  background: var(--glass-page-bg);
}

.hpc-board__cell--period {
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  padding-left: 14px;
}

.hpc-board__row--phase .hpc-board__cell--entity,
.hpc-board__row--phase .hpc-board__cell--period {
  background: color-mix(in srgb, var(--glass-text) 2%, var(--glass-page-bg));
}

.hpc-board__head .hpc-board__cell--entity,
.hpc-board__head .hpc-board__cell--period {
  z-index: 9;
}

.hpc-board__entity {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.hpc-board__drag {
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
  cursor: grab;
}

.hpc-board__drag:disabled,
.hpc-board__bar-handle:disabled {
  opacity: .45;
  cursor: default;
}

.hpc-board__entity-body,
.hpc-board__period {
  display: grid;
  gap: 6px;
  align-content: center;
}

.hpc-board__entity-top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hpc-board__toggle {
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.hpc-board__toggle:hover {
  color: var(--glass-text);
  border-color: color-mix(in srgb, var(--glass-text) 18%, transparent);
}

.hpc-board__type {
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

.hpc-board__title {
  font-size: .92rem;
  letter-spacing: .03em;
}

.hpc-board__meta-line,
.hpc-board__period span,
.hpc-board__week-label {
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.hpc-board__period strong,
.hpc-board__week-label strong {
  font-size: .76rem;
  color: var(--glass-text);
}

.hpc-board__timeline-head-stack,
.hpc-board__timeline-groups,
.hpc-board__timeline-head,
.hpc-board__weeks {
  display: grid;
}

.hpc-board__timeline-head-stack {
  grid-template-rows: auto auto;
}

.hpc-board__timeline-groups {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-board__timeline-head {
  align-items: stretch;
}

.hpc-board__timeline-group-label,
.hpc-board__week-label {
  display: grid;
  gap: 4px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-board__timeline-group-label {
  min-height: 34px;
  padding: 8px 10px;
  align-content: center;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
}

.hpc-board__week-label {
  padding: 12px 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.hpc-board__timeline {
  position: relative;
}

.hpc-board__weeks {
  height: 100%;
}

.hpc-board__week {
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 7%, transparent);
}

.hpc-board__week--drop {
  background: color-mix(in srgb, var(--ds-accent) 5%, transparent);
}

.hpc-board__bar {
  position: absolute;
  top: 14px;
  bottom: 14px;
  min-width: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 6px;
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 8%, transparent);
  cursor: grab;
  overflow: hidden;
}

.hpc-board__bar-handle {
  width: 14px;
  min-width: 14px;
  min-height: 44px;
  align-self: stretch;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: ew-resize;
  appearance: none;
}

.hpc-board__bar-handle--start {
  border-right: 1px solid currentColor;
}

.hpc-board__bar-handle--end {
  border-left: 1px solid currentColor;
}

.hpc-board__bar--stable {
  color: color-mix(in srgb, var(--glass-text) 78%, transparent);
}

.hpc-board__bar--warning {
  color: var(--ds-warning);
}

.hpc-board__bar--critical {
  color: var(--ds-error);
}

.hpc-board__bar-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .74rem;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.hpc-phase-card,
.hpc-sprint-card {
  display: grid;
  gap: 14px;
  padding: 0 0 0 18px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.hpc-gates,
.hpc-task-list {
  display: grid;
  gap: 10px;
}

.hpc-gate-row,
.hpc-task-row,
.hpc-checkpoint-row,
.hpc-blocker-row {
  display: grid;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-gate-row {
  grid-template-columns: auto 1fr;
  min-height: 44px;
}

.hpc-task-row {
  grid-template-columns: 88px minmax(0, 2fr) 88px minmax(0, 1fr) 150px auto;
}

.hpc-checkpoint-row {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .8fr) 160px minmax(0, 1.4fr) auto;
}

.hpc-blocker-row {
  grid-template-columns: 1fr auto;
}

.hpc-task-row__title,
.hpc-checkpoint-row__note,
.hpc-blocker-row__input {
  min-width: 0;
}

.hpc-task-state {
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: transparent;
  color: var(--glass-text);
  text-transform: uppercase;
  letter-spacing: .06em;
  cursor: pointer;
}

.hpc-empty {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
  text-transform: uppercase;
  letter-spacing: .12em;
}

:deep(.glass-input),
:deep(.u-status-sel) {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}

:deep(.u-ta) {
  min-height: 64px;
}

@media (max-width: 900px) {
  .hpc-metrics,
  .hpc-grid,
  .hpc-task-row,
  .hpc-checkpoint-row {
    grid-template-columns: 1fr;
  }

  .hpc-summary__head,
  .hpc-section__head,
  .hpc-phase-card__head,
  .hpc-task-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .hpc-section__tools {
    width: 100%;
  }
}
</style>