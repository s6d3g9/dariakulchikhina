<template>
  <div ref="controlShell" class="hpc-root">
    <div v-if="pending" class="ent-content-loading">
      <div v-for="i in 6" :key="i" class="ent-skeleton-line" />
    </div>

    <template v-else>

      <nav
        ref="moduleNavRef"
        class="hpc-module-nav"
        :class="{ 'hpc-module-nav--mobile-visible': isMobileModuleDockVisible }"
        aria-label="Разделы контроля проекта"
      >
        <button
          v-for="moduleCard in moduleCards"
          :key="moduleCard.id"
          type="button"
          class="hpc-module-nav__btn"
          :class="{ 'hpc-module-nav__btn--active': activeModule === moduleCard.id }"
          :aria-current="activeModule === moduleCard.id ? 'page' : undefined"
          :aria-label="`${moduleCard.label}: ${moduleCard.metric}`"
          :title="moduleCard.label"
          @click="selectModule(moduleCard.id)"
        >
          <span class="hpc-module-nav__icon-wrap" aria-hidden="true">
            <span class="hpc-module-nav__glyph">{{ moduleCard.glyph }}</span>
          </span>
          <span class="hpc-module-nav__label">{{ moduleCard.navLabel }}</span>
        </button>
      </nav>

      <div ref="moduleViewportStart" class="hpc-module-anchor" aria-hidden="true" />

      <section v-if="activeModule !== 'overview'" class="hpc-module-hero">
        <div>
          <p class="hpc-eyebrow">Контур контроля</p>
          <h2 class="hpc-title">{{ activeModuleCard.label }}</h2>
          <p class="hpc-module-hero__meta">{{ activeModuleCard.meta }}</p>
        </div>
        <div class="hpc-summary__meta">
          <span class="hpc-chip">{{ activeModuleCard.metric }}</span>
          <span v-if="saveMetaText" class="hpc-saved" :class="{ 'hpc-saved--error': saveState === 'error' }">{{ saveMetaText }}</span>
        </div>
      </section>

      <section class="hpc-summary" v-show="activeModule === 'overview'">
        <div class="hpc-summary__head">
          <div>
            <p class="hpc-eyebrow">Контур контроля</p>
            <h2 class="hpc-title">Фазовый каркас и спринтовый ритм исполнения</h2>
          </div>
          <div class="hpc-summary__meta">
            <span class="hpc-pill" :class="`hpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
            <GlassButton variant="secondary" density="compact" type="button" @click="openProjectScopeDetails">контур проекта</GlassButton>
            <span v-if="saveMetaText" class="hpc-saved" :class="{ 'hpc-saved--error': saveState === 'error' }">{{ saveMetaText }}</span>
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
            <GlassInput v-model="control.manager"  placeholder="Менеджер" @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Интервал обзора, дней</label>
            <GlassInput v-model.number="control.cadenceDays" type="number" min="1" max="90"  @blur="save" />
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
                <GlassInput v-model.number="agent.cadenceDays" type="number" min="1" max="90"  @blur="save" />
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
            <GlassButton variant="secondary" density="compact" type="button"  @click="addCommunicationRule">добавить правило</GlassButton>
          </div>

          <div class="hpc-playbook-list">
            <article v-for="(rule, index) in control.communicationPlaybook" :key="rule.id" class="hpc-playbook-card">
              <div class="hpc-phase-card__head">
                <div>
                  <p class="hpc-phase-card__kicker">{{ getCommunicationChannelLabel(rule.linkedChannel) }}</p>
                  <h4 class="hpc-phase-card__title">{{ rule.title }}</h4>
                </div>
                <div class="hpc-phase-card__head-right">
                  <GlassButton variant="danger" density="compact" type="button"  @click="removeCommunicationRule(index)">удалить</GlassButton>
                </div>
              </div>

              <div class="hpc-grid">
                <div class="u-field">
                  <label class="u-field__label">Название протокола</label>
                  <GlassInput v-model="rule.title"  @blur="save" />
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
                  <GlassInput v-model.number="rule.cadenceDays" type="number" min="1" max="90"  @blur="save" />
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
            <div v-if="getRecommendationRecipients(recommendation).length" class="hpc-agent-targets">
              <GlassButton
                v-for="member in getRecommendationRecipients(recommendation)"
                :key="`${recommendation.id}-${member.id}`"
                variant="secondary"
                density="compact"
                type="button"
                @click="openMessageModal(member, recommendation.suggestedMessage)"
              >
                {{ member.name }}
              </GlassButton>
            </div>
          </article>
        </div>

        <div class="hpc-subsection">
          <div class="hpc-subsection__head">
            <div>
              <p class="hpc-section__label">Команда</p>
              <h4 class="hpc-phase-card__title">Участники контура</h4>
            </div>
          </div>

          <div v-if="control.team.length" class="hpc-agent-list">
            <article v-for="member in control.team" :key="member.id" class="hpc-agent-card">
              <div class="hpc-phase-card__head">
                <div>
                  <p class="hpc-phase-card__kicker">{{ getTeamMemberRoleLabel(member.role) }}</p>
                  <h4 class="hpc-phase-card__title">{{ member.name }}</h4>
                </div>
                <div class="hpc-phase-card__head-right">
                  <span class="hpc-chip">{{ getTeamMemberChannelLabel(member.notifyBy) }}</span>
                  <GlassButton variant="secondary" density="compact" type="button" @click="openMessageModal(member)">сообщение</GlassButton>
                </div>
              </div>
              <p v-if="member.contact" class="hpc-recommendation-text">{{ member.contact }}</p>
            </article>
          </div>
          <div v-else class="hpc-empty">Нет участников</div>
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
            <GlassInput v-model="callInsightDraft.title"  placeholder="Название звонка" />
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
            <textarea v-model="callInsightDraft.summary" class="glass-input u-ta" rows="3" placeholder="Конспект" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">Транскрипт или выдержка звонка</label>
            <textarea v-model="callInsightDraft.transcript" class="glass-input u-ta" rows="5" placeholder="Транскрипт" />
          </div>
        </div>

        <div class="hpc-section__tools">
          <GlassButton variant="primary" type="button"  :disabled="callInsightSaving || !callInsightDraft.summary.trim()" @click="submitCallInsight">
            {{ callInsightSaving ? 'сохраняем...' : 'добавить звонок в проект' }}
          </GlassButton>
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
                <GlassButton
                  v-if="insight.appliedTaskIds?.length"
                  variant="secondary"
                  density="compact"
                  type="button"
                  @click="openCallInsightTasks(insight)"
                >
                  к задачам
                </GlassButton>
                <GlassButton variant="secondary" density="compact"
                  v-if="insight.nextSteps.length"
                  type="button"
                  
                  :disabled="callInsightApplyPendingId === insight.id"
                  @click="applyCallInsightToSprint(insight.id)"
                >
                  {{ callInsightApplyPendingId === insight.id ? 'применяем...' : (insight.appliedTaskIds?.length ? 'досинхронизировать задачи' : 'в активный спринт') }}
                </GlassButton>
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
        <p v-else class="hpc-empty">Нет импортированных звонков</p>
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
        <p v-else class="hpc-empty">
          Журнал пуст
        </p>
      </section>

      <section class="hpc-section hpc-section--timeline" v-show="activeModule === 'timeline'">
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

        <div class="hpc-timeline-shell">
          <div class="hpc-timeline-overview">
            <article v-for="stat in timelineStats" :key="stat.label" class="hpc-timeline-stat">
              <span class="hpc-timeline-stat__label">{{ stat.label }}</span>
              <strong class="hpc-timeline-stat__value">{{ stat.value }}</strong>
            </article>
          </div>

          <div
            v-if="timelineTooltip.visible"
            class="hpc-timeline-hover-tooltip"
            :style="timelineTooltipStyle"
          >
            {{ timelineTooltip.content }}
          </div>

          <div class="hpc-timeline-content" :class="{ 'hpc-timeline-content--details': !!selectedTimelineRowDetails }">
            <div class="hpc-timeline-board-card">
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
                        <div class="hpc-board__entity-main">
                          <button
                            class="hpc-board__title-btn"
                            type="button"
                            :aria-label="`Открыть детали ${row.title}`"
                            @pointerenter="scheduleTimelineTooltip($event, row)"
                            @pointerleave="hideTimelineTooltip"
                            @focus="scheduleTimelineTooltip($event, row)"
                            @blur="hideTimelineTooltip"
                            @click="openTimelineRowDetails(row)"
                          >
                            <span class="hpc-board__title">{{ row.title }}</span>
                          </button>
                          <button
                            v-if="row.type === 'phase' && getTimelinePhaseSprintCount(row.phaseKey)"
                            type="button"
                            class="hpc-board__toggle"
                            :title="isTimelinePhaseCollapsed(row.phaseKey) ? `Показать вложенные спринты: ${getTimelinePhaseSprintCount(row.phaseKey)}` : `Свернуть вложенные спринты: ${getTimelinePhaseSprintCount(row.phaseKey)}`"
                            :aria-label="isTimelinePhaseCollapsed(row.phaseKey) ? `Показать вложенные спринты: ${getTimelinePhaseSprintCount(row.phaseKey)}` : `Свернуть вложенные спринты: ${getTimelinePhaseSprintCount(row.phaseKey)}`"
                            @click="toggleTimelinePhase(row.phaseKey)"
                          >
                            {{ isTimelinePhaseCollapsed(row.phaseKey) ? `+${getTimelinePhaseSprintCount(row.phaseKey)}` : `-${getTimelinePhaseSprintCount(row.phaseKey)}` }}
                          </button>
                        </div>
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
                        :class="[
                          `hpc-board__bar--${row.tone}`,
                          { 'hpc-board__bar--active': isTimelineRowSelected(row) },
                        ]"
                        :style="getTimelineBarStyle(row)"
                      >
                        <button
                          class="hpc-board__bar-handle hpc-board__bar-handle--start"
                          type="button"
                          :disabled="!timelineEditingEnabled"
                          :aria-label="`Сдвинуть начало ${row.title}`"
                          :draggable="timelineEditingEnabled"
                          @click.stop
                          @dragstart.stop="onResizeDragStart($event, row, 'start')"
                          @dragend="onDragEnd"
                        />
                        <button
                          class="hpc-board__bar-move"
                          type="button"
                          :disabled="!timelineEditingEnabled"
                          :aria-label="`Сдвинуть ${row.title}`"
                          :draggable="timelineEditingEnabled"
                          @click.stop
                          @dragstart.stop="onScheduleDragStart($event, row)"
                          @dragend="onDragEnd"
                        >
                          ::
                        </button>
                        <button
                          class="hpc-board__bar-body"
                          type="button"
                          :aria-label="`Открыть детали ${row.title}`"
                          @pointerenter="scheduleTimelineTooltip($event, row)"
                          @pointerleave="hideTimelineTooltip"
                          @focus="scheduleTimelineTooltip($event, row)"
                          @blur="hideTimelineTooltip"
                          @click.stop="openTimelineRowDetails(row)"
                        >
                          <span class="hpc-board__bar-label">{{ row.title }}</span>
                        </button>
                        <button
                          class="hpc-board__bar-handle hpc-board__bar-handle--end"
                          type="button"
                          :disabled="!timelineEditingEnabled"
                          :aria-label="`Сдвинуть окончание ${row.title}`"
                          :draggable="timelineEditingEnabled"
                          @click.stop
                          @dragstart.stop="onResizeDragStart($event, row, 'end')"
                          @dragend="onDragEnd"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <GlassSurface v-if="selectedTimelineRowDetails" class="hpc-timeline-details-modal glass-surface">
              <div class="hpc-timeline-details-modal__head">
                <div class="hpc-timeline-details-modal__title-wrap">
                  <p class="hpc-timeline-details-modal__eyebrow">{{ selectedTimelineRowDetails.typeLabel }}</p>
                  <h4 class="hpc-section__title hpc-timeline-details-modal__title">{{ selectedTimelineRowDetails.title }}</h4>
                  <p class="hpc-recommendation-text">{{ selectedTimelineRowDetails.meta }}</p>
                </div>
                <GlassButton variant="secondary" density="compact" class="hpc-timeline-details-modal__close" @click="closeTimelineRowDetails">Закрыть</GlassButton>
              </div>

              <div v-if="selectedTimelineDetailCards.length" class="hpc-grid hpc-grid--top">
                <div v-for="card in selectedTimelineDetailCards" :key="card.label" class="hpc-timeline-detail-field">
                  <span class="hpc-timeline-detail-field__label">{{ card.label }}</span>
                  <strong class="hpc-timeline-detail-field__value">{{ card.value }}</strong>
                </div>
              </div>

              <p v-if="timelineScopeDetailPending" class="hpc-timeline-empty">Загружаю детали контура…</p>
              <p v-else-if="timelineScopeDetailError" class="hpc-timeline-empty hpc-timeline-empty--error">{{ timelineScopeDetailError }}</p>

              <div class="hpc-timeline-clusters">
                <section class="hpc-timeline-cluster">
                  <div class="hpc-timeline-cluster__head">
                    <p class="hpc-summary__label">Субъекты</p>
                    <span class="hpc-chip">{{ timelineDetailSubjects.length }}</span>
                  </div>
                  <div v-if="timelineDetailSubjects.length" class="hpc-timeline-cluster__list">
                    <article v-for="item in timelineDetailSubjects" :key="item.key" class="hpc-timeline-cluster__item">
                      <span class="hpc-timeline-cluster__label">{{ item.label }}</span>
                      <strong class="hpc-timeline-cluster__value">{{ item.value }}</strong>
                    </article>
                  </div>
                  <p v-else class="hpc-timeline-empty">Связанные участники пока не назначены.</p>
                </section>

                <section v-if="timelineScopeDetail" class="hpc-timeline-cluster hpc-timeline-cluster--governance">
                  <div class="hpc-timeline-cluster__head">
                    <p class="hpc-summary__label">Управление участниками</p>
                    <span class="hpc-chip">{{ timelineGovernanceParticipants.length }}</span>
                  </div>

                  <div v-if="timelineGovernanceParticipants.length" class="hpc-timeline-governance-list">
                    <article v-for="participant in timelineGovernanceParticipants" :key="participant.assignmentId" class="hpc-timeline-governance-card">
                      <div class="hpc-timeline-governance-card__head">
                        <div>
                          <strong class="hpc-timeline-governance-card__title">{{ participant.displayName }}</strong>
                          <p class="hpc-recommendation-text">{{ participant.roleLabel }} · {{ participant.responsibilityLabel }}</p>
                        </div>
                        <span class="hpc-chip">{{ participant.originLabel }}</span>
                      </div>

                      <p v-if="participant.secondary" class="hpc-recommendation-text">{{ participant.secondary }}</p>

                      <div v-if="participant.editable" class="hpc-timeline-governance-card__controls">
                        <div class="u-field">
                          <label class="u-field__label">Ответственность</label>
                          <select class="u-status-sel" :value="participant.responsibility" :disabled="timelineGovernancePending" @change="handleTimelineGovernanceResponsibilityChange(participant.assignmentId, $event)">
                            <option v-for="option in projectGovernanceResponsibilityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                          </select>
                        </div>
                        <GlassButton variant="danger" density="compact" type="button" :disabled="timelineGovernancePending" @click="deleteTimelineGovernanceAssignment(participant.assignmentId)">
                          убрать
                        </GlassButton>
                      </div>
                    </article>
                  </div>
                  <p v-else class="hpc-timeline-empty">Для этого контура ещё нет прямых назначений.</p>

                  <div class="hpc-grid hpc-grid--top hpc-timeline-governance-form">
                    <div class="u-field">
                      <label class="u-field__label">Имя участника</label>
                      <GlassInput v-model="timelineGovernanceParticipantDraft.displayName" placeholder="Например, юрист проекта" :disabled="timelineGovernancePending" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Роль</label>
                      <select v-model="timelineGovernanceParticipantDraft.roleKey" class="u-status-sel" :disabled="timelineGovernancePending">
                        <option v-for="option in projectParticipantRoleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                      </select>
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Ответственность</label>
                      <select v-model="timelineGovernanceParticipantDraft.responsibility" class="u-status-sel" :disabled="timelineGovernancePending">
                        <option v-for="option in projectGovernanceResponsibilityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                      </select>
                    </div>
                    <div class="u-field u-field--actions">
                      <label class="u-field__label">Добавление</label>
                      <GlassButton variant="primary" density="compact" type="button" :disabled="!canCreateTimelineGovernanceParticipant" @click="createTimelineGovernanceParticipant">
                        добавить в контур
                      </GlassButton>
                    </div>
                  </div>

                  <p v-if="timelineGovernanceError" class="hpc-timeline-empty hpc-timeline-empty--error">{{ timelineGovernanceError }}</p>
                  <p v-else-if="timelineGovernanceNotice" class="hpc-recommendation-text">{{ timelineGovernanceNotice }}</p>
                </section>

                <section class="hpc-timeline-cluster">
                  <div class="hpc-timeline-cluster__head">
                    <p class="hpc-summary__label">Объекты</p>
                    <span class="hpc-chip">{{ timelineDetailObjects.length }}</span>
                  </div>
                  <div v-if="timelineDetailObjects.length" class="hpc-timeline-cluster__list">
                    <article v-for="item in timelineDetailObjects" :key="item.key" class="hpc-timeline-cluster__item">
                      <span class="hpc-timeline-cluster__label">{{ item.label }}</span>
                      <strong class="hpc-timeline-cluster__value">{{ item.value }}</strong>
                    </article>
                  </div>
                  <p v-else class="hpc-timeline-empty">Связанные объекты еще не описаны.</p>
                </section>

                <section class="hpc-timeline-cluster">
                  <div class="hpc-timeline-cluster__head">
                    <p class="hpc-summary__label">Настройки</p>
                    <span class="hpc-chip">{{ timelineDetailSettings.length }}</span>
                  </div>
                  <div v-if="timelineDetailSettings.length" class="hpc-timeline-cluster__list">
                    <article v-for="item in timelineDetailSettings" :key="item.key" class="hpc-timeline-cluster__item">
                      <span class="hpc-timeline-cluster__label">{{ item.label }}</span>
                      <strong class="hpc-timeline-cluster__value">{{ item.value }}</strong>
                    </article>
                  </div>
                  <p v-else class="hpc-timeline-empty">Для этого контура дополнительные настройки пока не заданы.</p>
                </section>

                <section v-if="timelineGovernanceEditableSettings.length" class="hpc-timeline-cluster hpc-timeline-cluster--governance">
                  <div class="hpc-timeline-cluster__head">
                    <p class="hpc-summary__label">Редактирование настроек</p>
                    <span class="hpc-chip">{{ timelineGovernanceEditableSettings.length }}</span>
                  </div>

                  <div class="hpc-grid hpc-grid--top hpc-timeline-governance-settings">
                    <div v-for="field in timelineGovernanceEditableSettings" :key="field.key" class="u-field">
                      <label class="u-field__label">{{ field.label }}</label>

                      <select
                        v-if="field.kind === 'select'"
                        class="u-status-sel"
                        :value="field.value == null ? '' : String(field.value)"
                        :disabled="timelineGovernancePending"
                        @change="handleTimelineGovernanceSelectSettingChange(field.key, $event)"
                      >
                        <option v-for="option in communicationChannelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                      </select>

                      <label v-else-if="field.kind === 'boolean'" class="hpc-timeline-governance-toggle">
                        <input
                          :checked="Boolean(field.value)"
                          type="checkbox"
                          :disabled="timelineGovernancePending"
                          @change="handleTimelineGovernanceBooleanSettingChange(field.key, $event)"
                        />
                        <span>{{ Boolean(field.value) ? 'Включено' : 'Выключено' }}</span>
                      </label>

                      <input
                        v-else
                        class="glass-input"
                        :type="field.kind === 'number' ? 'number' : 'text'"
                        :value="field.value == null ? '' : String(field.value)"
                        :disabled="timelineGovernancePending"
                        @input="handleTimelineGovernanceTextSettingInput(field.key, field.kind, $event)"
                        @blur="commitTimelineGovernanceSettings()"
                      />

                      <span class="hpc-recommendation-text">{{ field.kind === 'list' ? 'Список через запятую' : 'Изменения отправляются сразу' }}</span>
                    </div>
                  </div>
                </section>

                <section class="hpc-timeline-cluster">
                  <div class="hpc-timeline-cluster__head">
                    <p class="hpc-summary__label">Связанные контуры</p>
                    <span class="hpc-chip">{{ timelineDetailLinkedScopes.length }}</span>
                  </div>
                  <div v-if="timelineDetailLinkedScopes.length" class="hpc-timeline-cluster__list">
                    <article v-for="item in timelineDetailLinkedScopes" :key="item.key" class="hpc-timeline-cluster__item">
                      <span class="hpc-timeline-cluster__label">{{ item.label }}</span>
                      <strong class="hpc-timeline-cluster__value">{{ item.value }}</strong>
                    </article>
                  </div>
                  <p v-else class="hpc-timeline-empty">Связанные контуры пока не определены.</p>
                </section>

                <section class="hpc-timeline-cluster hpc-timeline-cluster--actions">
                  <div class="hpc-timeline-cluster__head">
                    <p class="hpc-summary__label">Действия</p>
                    <span class="hpc-chip">{{ timelineDetailActions.length }}</span>
                  </div>
                  <ul v-if="timelineDetailActions.length" class="hpc-timeline-action-list">
                    <li v-for="item in timelineDetailActions" :key="item.key" class="hpc-timeline-action-item">
                      <span class="hpc-timeline-action-item__title">{{ item.label }}</span>
                      <span class="hpc-timeline-action-item__meta">{{ item.value }}</span>
                    </li>
                  </ul>
                  <p v-else class="hpc-timeline-empty">Следующие действия пока не сформированы.</p>
                </section>
              </div>

              <div class="hpc-timeline-meta">
                <p class="hpc-summary__label">Контур коммуникации</p>
                <div v-if="timelineDetailRules.length" class="hpc-timeline-rule-list">
                  <article v-for="rule in timelineDetailRules" :key="rule.id" class="hpc-timeline-rule-card">
                    <div class="hpc-timeline-rule-card__head">
                      <strong class="hpc-timeline-rule-card__title">{{ rule.title }}</strong>
                      <span class="hpc-chip">{{ rule.channel }}</span>
                    </div>
                    <p class="hpc-timeline-rule-card__copy">{{ rule.trigger }}</p>
                    <p class="hpc-timeline-rule-card__meta">{{ rule.audience }}</p>
                  </article>
                </div>
                <p v-else class="hpc-timeline-empty">Для этого контура нет отдельного правила коммуникации.</p>
              </div>

              <div v-if="timelineDetailTasks.length" class="hpc-timeline-meta">
                <p class="hpc-summary__label">Задачи спринта</p>
                <ul class="hpc-timeline-task-list">
                  <li v-for="task in timelineDetailTasks" :key="task.id" class="hpc-timeline-task-item">
                    <div>
                      <strong class="hpc-timeline-task-item__title">{{ task.title }}</strong>
                      <span class="hpc-timeline-task-item__meta">{{ task.meta }}</span>
                    </div>
                    <div class="hpc-timeline-task-item__actions">
                      <GlassButton variant="secondary" density="compact" type="button" @click="openTaskScopeDetails(task.scopeId, task.sprintId)">контур</GlassButton>
                      <GlassButton variant="secondary" density="compact" type="button" @click="openTimelineTask(task.id, task.sprintId)">к задаче</GlassButton>
                    </div>
                  </li>
                </ul>
              </div>

              <div class="hpc-timeline-actions">
                <GlassButton
                  v-if="selectedTimelineRowDetails.type === 'sprint'"
                  variant="primary"
                  density="compact"
                  type="button"
                  @click="openTimelineSprintInKanban(selectedTimelineRowDetails.id)"
                >
                  В Канбан
                </GlassButton>
                <GlassButton
                  v-if="selectedTimelineRowDetails.type === 'phase'"
                  variant="primary"
                  density="compact"
                  type="button"
                  @click="openTimelinePhaseEditor()"
                >
                  Настройки фазы
                </GlassButton>
                <GlassButton
                  v-if="selectedTimelineRowDetails.scopeType === 'task'"
                  variant="secondary"
                  density="compact"
                  type="button"
                  @click="openTimelineTask(selectedTimelineRowDetails.id, selectedTimelineTaskSprintId)"
                >
                  К задаче
                </GlassButton>
              </div>
            </GlassSurface>
          </div>
        </div>
      </section>

      <section class="hpc-section hpc-section--phases" v-show="activeModule === 'phases'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Фазовый слой</p>
            <h3 class="hpc-section__title">Базовые этапы и привязка спринтов</h3>
          </div>
        </div>

        <div class="hpc-phase-shell">
          <div class="hpc-phase-overview">
            <article v-for="stat in phaseStats" :key="stat.label" class="hpc-phase-stat">
              <span class="hpc-phase-stat__label">{{ stat.label }}</span>
              <strong class="hpc-phase-stat__value">{{ stat.value }}</strong>
            </article>
          </div>

          <div class="hpc-phase-board-card">
            <AdminProjectPhaseBoard :control="control" @save="save" />
          </div>

          <div class="hpc-phase-list">
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

              <div class="hpc-phase-card__body">
                <div class="hpc-grid">
                  <div class="u-field">
                    <label class="u-field__label">Ответственный</label>
                    <GlassInput v-model="phase.owner" placeholder="Ответственный" @blur="save" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Прогресс, %</label>
                    <GlassInput v-model.number="phase.percent" type="number" min="0" max="100" @blur="save" />
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
                      <GlassTextarea v-model="phase.deliverable" :rows="2" @blur="save" />
                  </div>
                  <div class="u-field u-field--full">
                    <label class="u-field__label">Заметка менеджера</label>
                      <GlassTextarea v-model="phase.notes" :rows="2" @blur="save" />
                  </div>
                </div>
              </div>

              <div class="hpc-phase-card__footer">
                <p class="hpc-phase-card__subhead">Контрольные гейты</p>
                <div class="hpc-gates">
                  <label v-for="gate in phase.gates" :key="gate.id" class="hpc-gate-row">
                    <input v-model="gate.done" class="hpc-gate-row__check" type="checkbox" @change="save" />
                    <span class="hpc-gate-row__label">{{ gate.label }}</span>
                  </label>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'kanban'">
        <AdminProjectKanban
          :control="control"
          :active-sprint-id="activeSprintId"
          :active-task-id="activeTaskId"
          @save="save"
          @update:active-task="setActiveTaskId"
        />
      </section>

      <section class="hpc-section hpc-section--sprints" v-show="activeModule === 'phases'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Формы метаданных</p>
            <h3 class="hpc-section__title">Редактирование спринтов</h3>
          </div>
          <GlassButton variant="secondary" density="compact"  type="button" @click="addSprint">+ спринт</GlassButton>
        </div>

        <div v-if="control.sprints.length" class="hpc-phase-overview hpc-phase-overview--sprints">
          <article v-for="stat in sprintStats" :key="stat.label" class="hpc-phase-stat">
            <span class="hpc-phase-stat__label">{{ stat.label }}</span>
            <strong class="hpc-phase-stat__value">{{ stat.value }}</strong>
          </article>
        </div>

        <div v-if="control.sprints.length" class="hpc-sprint-shell hpc-sprint-shell--detail">
          <div class="hpc-sprint-list hpc-sprint-list--cards">
            <article
              v-for="sprint in control.sprints"
              :key="sprint.id"
              class="hpc-sprint-card"
              :class="{ 'hpc-sprint-card--active': isSelectedSprint(sprint) }"
              :data-sprint-id="sprint.id"
              tabindex="0"
              @click="focusSprint(sprint.id)"
              @keydown.enter.prevent="focusSprint(sprint.id)"
              @keydown.space.prevent="focusSprint(sprint.id)"
            >
              <div class="hpc-sprint-card__head">
                <div>
                  <p class="hpc-phase-card__kicker">{{ sprint.linkedPhaseKey ? getPhaseTitleByKey(sprint.linkedPhaseKey) : 'Без фазы' }}</p>
                  <h4 class="hpc-phase-card__title">{{ sprint.name }}</h4>
                </div>
                <div class="hpc-phase-card__head-right">
                  <span class="hpc-chip">{{ sprintStatusLabels[sprint.status] }}</span>
                  <span class="hpc-chip">{{ getSprintCompletionLabel(sprint) }}</span>
                </div>
              </div>

              <div class="hpc-sprint-card__summary">
                <article class="hpc-sprint-card__summary-item">
                  <span class="hpc-sprint-card__summary-label">Цель</span>
                  <strong class="hpc-sprint-card__summary-value">{{ sprint.goal || 'Цель пока не зафиксирована' }}</strong>
                </article>
                <article class="hpc-sprint-card__summary-item">
                  <span class="hpc-sprint-card__summary-label">Фокус</span>
                  <strong class="hpc-sprint-card__summary-value">{{ sprint.focus || 'Фокус не заполнен' }}</strong>
                </article>
                <article class="hpc-sprint-card__summary-item">
                  <span class="hpc-sprint-card__summary-label">Период</span>
                  <strong class="hpc-sprint-card__summary-value">{{ formatDateRange(sprint.startDate, sprint.endDate) }}</strong>
                </article>
              </div>

              <div class="hpc-sprint-card__foot">
                <span class="hpc-recommendation-text">{{ sprint.tasks.length }} задач в спринте</span>
                <GlassButton variant="secondary" density="compact" type="button" @click.stop="focusSprint(sprint.id)">редактировать</GlassButton>
              </div>
            </article>
          </div>

          <section
            v-if="selectedSprint"
            class="hpc-sprint-detail-card"
            :data-admin-sprint-detail-id="selectedSprint.id"
          >
            <div class="hpc-sprint-detail__head">
              <div>
                <p class="hpc-phase-card__kicker">{{ selectedSprintPhaseTitle }}</p>
                <h3 class="hpc-section__title">{{ selectedSprint.name }}</h3>
              </div>
              <div class="hpc-phase-card__head-right">
                <span class="hpc-chip">{{ sprintStatusLabels[selectedSprint.status] }}</span>
                <span class="hpc-chip">{{ selectedSprint.tasks.length }} задач</span>
                <GlassButton variant="danger" density="compact" type="button" @click="removeSelectedSprint">удалить спринт</GlassButton>
              </div>
            </div>

            <div class="hpc-phase-overview hpc-phase-overview--detail">
              <article v-for="stat in selectedSprintStats" :key="stat.label" class="hpc-phase-stat">
                <span class="hpc-phase-stat__label">{{ stat.label }}</span>
                <strong class="hpc-phase-stat__value">{{ stat.value }}</strong>
              </article>
            </div>

            <div class="hpc-grid hpc-grid--top">
              <div class="u-field">
                <label class="u-field__label">Название спринта</label>
                <GlassInput v-model="selectedSprint.name" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Привязка к фазе</label>
                <select v-model="selectedSprint.linkedPhaseKey" class="u-status-sel" @change="save">
                  <option v-for="phase in control.phases" :key="phase.phaseKey" :value="phase.phaseKey">{{ phase.title }}</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">Статус</label>
                <select v-model="selectedSprint.status" class="u-status-sel" @change="save">
                  <option v-for="option in sprintStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">Старт</label>
                <AppDatePicker v-model="selectedSprint.startDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Финиш</label>
                <AppDatePicker v-model="selectedSprint.endDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Цель спринта</label>
                <GlassTextarea v-model="selectedSprint.goal" :rows="2" @blur="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Фокус команды</label>
                <GlassTextarea v-model="selectedSprint.focus" :rows="2" @blur="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Ретроспектива</label>
                <GlassTextarea v-model="selectedSprint.retrospective" :rows="2" @blur="save" />
              </div>
            </div>

            <div class="hpc-task-head">
              <span class="hpc-task-head__title">Задачи спринта</span>
              <div class="hpc-phase-card__head-right">
                <span class="hpc-chip">{{ selectedSprint.tasks.length }} задач</span>
                <GlassButton variant="secondary" density="compact" type="button" @click="addTask(selectedSprint)">+ задача</GlassButton>
              </div>
            </div>

            <div class="hpc-sprint-board">
              <section v-for="column in selectedSprintColumns" :key="column.status" class="hpc-sprint-column">
                <div class="hpc-sprint-column__head">
                  <span>{{ column.label }}</span>
                  <strong>{{ column.tasks.length }}</strong>
                </div>

                <div v-if="column.tasks.length" class="hpc-task-list hpc-task-list--board">
                  <article
                    v-for="task in column.tasks"
                    :key="task.id"
                    class="hpc-task-card"
                    :class="{ 'hpc-task-card--active': isSelectedTask(task) }"
                    :data-phase-task-id="task.id"
                    tabindex="0"
                    @click="focusTask(task.id, selectedSprint.id, 'phases')"
                    @keydown.enter.prevent="focusTask(task.id, selectedSprint.id, 'phases')"
                    @keydown.space.prevent="focusTask(task.id, selectedSprint.id, 'phases')"
                  >
                    <div class="hpc-task-card__top">
                      <div class="hpc-task-card__title">{{ task.title }}</div>
                      <span class="hpc-chip">{{ task.points || 0 }} pt</span>
                    </div>
                    <div class="hpc-task-card__meta">
                      <span>{{ task.assignee || 'без исполнителя' }}</span>
                      <span>{{ formatTaskDueDate(task.dueDate) }}</span>
                    </div>
                    <div v-if="task.notes" class="hpc-task-card__note">{{ task.notes }}</div>
                  </article>
                </div>
                <div v-else class="hpc-empty hpc-empty--inline">Нет задач</div>
              </section>
            </div>

            <section v-if="selectedTask" class="hpc-sprint-detail-card hpc-task-detail-card">
              <div class="hpc-sprint-detail__head">
                <div>
                  <p class="hpc-phase-card__kicker">{{ taskStatusLabels[selectedTask.status] }}</p>
                  <h3 class="hpc-section__title">{{ selectedTask.title }}</h3>
                </div>
                <div class="hpc-phase-card__head-right">
                  <span class="hpc-chip">{{ selectedSprint.name }}</span>
                  <span class="hpc-chip">{{ selectedTask.points || 0 }} pt</span>
                  <GlassButton variant="secondary" density="compact" type="button" @click="openTaskScopeDetails(selectedTask.id, selectedSprint.id)">контур задачи</GlassButton>
                  <GlassButton variant="secondary" density="compact" type="button" @click="clearTaskFocus">снять фокус</GlassButton>
                </div>
              </div>

              <div class="hpc-phase-overview hpc-phase-overview--detail">
                <article v-for="stat in selectedTaskStats" :key="stat.label" class="hpc-phase-stat">
                  <span class="hpc-phase-stat__label">{{ stat.label }}</span>
                  <strong class="hpc-phase-stat__value">{{ stat.value }}</strong>
                </article>
              </div>

              <div class="hpc-grid hpc-grid--top">
                <div class="u-field">
                  <label class="u-field__label">Статус</label>
                  <button class="hpc-task-state" type="button" @click="cycleTask(selectedTask)">{{ taskStatusLabels[selectedTask.status] }}</button>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Название</label>
                  <GlassInput v-model="selectedTask.title" @blur="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Оценка</label>
                  <GlassInput v-model.number="selectedTask.points" type="number" min="0" max="100" @blur="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Исполнитель</label>
                  <GlassInput v-model="selectedTask.assignee" @blur="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Дедлайн</label>
                  <AppDatePicker v-model="selectedTask.dueDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Удалить задачу</label>
                  <GlassButton variant="danger" density="compact" type="button" @click="removeSelectedTask">удалить</GlassButton>
                </div>
                <div class="u-field u-field--full">
                  <label class="u-field__label">Заметки</label>
                  <GlassTextarea v-model="selectedTask.notes" :rows="2" @blur="save" />
                </div>
              </div>
            </section>
          </section>
        </div>

        <div v-else class="hpc-empty">Нет спринтов</div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'health'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Здоровье проекта</p>
            <h3 class="hpc-section__title">Контрольные точки и блокеры</h3>
          </div>
          <GlassButton variant="secondary" density="compact"  type="button" @click="addCheckpoint">+ точка</GlassButton>
        </div>

        <div class="hpc-checkpoint-list">
          <div v-for="(checkpoint, checkpointIndex) in control.checkpoints" :key="checkpoint.id" class="hpc-checkpoint-row">
            <GlassInput v-model="checkpoint.title"  placeholder="Контрольная точка" @blur="save" />
            <GlassInput v-model="checkpoint.category"  placeholder="Категория" @blur="save" />
            <select v-model="checkpoint.status" class="u-status-sel" @change="save">
              <option v-for="option in checkpointStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <GlassInput v-model="checkpoint.note" class=" hpc-checkpoint-row__note" placeholder="Комментарий" @blur="save" />
            <GlassButton variant="danger" density="compact"  type="button" @click="removeCheckpoint(checkpointIndex)">×</GlassButton>
          </div>
        </div>

        <div class="hpc-task-head hpc-task-head--blockers">
          <span class="hpc-task-head__title">Текущие блокеры</span>
          <GlassButton variant="secondary" density="compact"  type="button" @click="addBlocker">+ блокер</GlassButton>
        </div>
        <div class="hpc-blocker-list">
          <div v-for="(blocker, blockerIndex) in control.blockers" :key="`blocker-${blockerIndex}`" class="hpc-blocker-row">
            <GlassInput v-model="control.blockers[blockerIndex]" class=" hpc-blocker-row__input" placeholder="Описание блокера" @blur="save" />
            <GlassButton variant="danger" density="compact"  type="button" @click="removeBlocker(blockerIndex)">×</GlassButton>
          </div>
        </div>
      </section>

    <Teleport to="body">
      <div v-if="msgModalOpen" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(8px);">
        <div class="glass-surface" style="width: 400px; padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 16px; color: var(--ds-surface-fg);">
          <h3 style="font-size: 1.25rem; font-weight: 500; margin: 0;">Отправить сообщение</h3>
          <p style="font-size: 0.9rem; opacity: 0.8; margin: 0;">
            Получатель: {{ msgModalTarget?.name || 'Без имени' }} (Канал: {{ msgModalTarget?.notifyBy }})
          </p>
          <textarea v-model="msgModalText" class="glass-input" style="min-height: 120px; padding: 12px; resize: vertical;" placeholder="Сообщение..."></textarea>
          <p v-if="msgModalError" class="hpc-recommendation-text hpc-recommendation-text--error">{{ msgModalError }}</p>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <GlassButton variant="danger" density="compact" type="button"  @click="closeMessageModal">Отмена</GlassButton>
            <GlassButton variant="primary" type="button"  :disabled="msgModalSending || !msgModalText.trim()" @click="executeMessageDispatch">{{ msgModalSending ? 'Отправка...' : 'Отправить' }}</GlassButton>
          </div>
        </div>
      </div>
    </Teleport>
    </template>

  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
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
import {
  PROJECT_PARTICIPANT_ROLE_KEYS,
  PROJECT_RESPONSIBILITY_KEYS,
  type ProjectParticipantRoleKey,
  type ProjectResponsibilityKey,
  type ProjectScopeType,
} from '~~/shared/types/project-governance'
import {
  getProjectParticipantRoleLabel,
  getProjectResponsibilityLabel,
} from '~~/shared/utils/project-governance'
import type {
  HybridControl,
  HybridControlCallInsight,
  HybridControlCommunicationChannel,
  HybridControlCommunicationRule,
  HybridControlManagerAgentRole,
  HybridControlSprint,
  HybridControlStakeholderRole,
  HybridControlTeamMember,
  HybridControlTask,
} from '~~/shared/types/project'
import type { ProjectScopeDetailBundle } from '~~/shared/types/project-governance'

const modules = [
  { id: 'overview', label: 'Обзор' },
  { id: 'timeline', label: 'Таймлайн / Таблица' },
  { id: 'phases', label: 'Этапы и Спринты' },
  { id: 'kanban', label: 'Канбан' },
  { id: 'health', label: 'Контрольные точки' },
  { id: 'communications', label: 'Звонки и Агенты' }
] as const

type ControlModuleId = (typeof modules)[number]['id']
type TimelineDetailItem = {
  key: string
  label: string
  value: string
}

type TimelineRuleSummary = {
  id: string
  title: string
  channel: string
  trigger: string
  audience: string
}

type SelectedTimelineRowState = {
  id: string
  scopeType: ProjectScopeType
  scopeId: string
  type: ProjectScopeType
  typeLabel: string
  title: string
  meta: string
  startDate?: string
  endDate?: string
  progressLabel?: string
  statusLabel?: string
  phaseKey?: string
  linkedPhaseKey?: string
  sprintId?: string
  taskId?: string
}

type TimelineDetailTaskItem = {
  id: string
  scopeId: string
  title: string
  meta: string
  sprintId: string
}

type SaveOptions = {
  refreshAfter?: boolean
}

type TimelineGovernanceParticipantDraft = {
  displayName: string
  roleKey: ProjectParticipantRoleKey
  responsibility: ProjectResponsibilityKey
}

type TimelineGovernanceSettingFieldKind = 'select' | 'number' | 'boolean' | 'list' | 'text'

type TimelineGovernanceMutationResponse = {
  participant: {
    persistedId: number
  }
}

const CONTROL_QUERY_TAB_KEY = 'controlTab'
const CONTROL_QUERY_SPRINT_KEY = 'controlSprint'
const CONTROL_QUERY_TASK_KEY = 'controlTask'
const controlModuleIds = new Set<ControlModuleId>(modules.map(module => module.id))

const activeModule = ref<ControlModuleId>('overview')

const props = defineProps<{ slug: string }>()
const route = useRoute()
const router = useRouter()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const control = reactive<HybridControl>(ensureHybridControl(undefined))
const saveState = ref<'idle' | 'saving' | 'error'>('idle')
const activeSprintId = ref('')
const activeTaskId = ref('')
const controlShell = ref<HTMLElement | null>(null)
const moduleNavRef = ref<HTMLElement | null>(null)
const moduleViewportStart = ref<HTMLElement | null>(null)
const isMobileModuleDockVisible = ref(true)
let moduleDockSyncFrame = 0

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

const checkpointStatusLabels = Object.fromEntries(
  checkpointStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof checkpointStatusOptions)[number]['value'], string>

const sprintStatusLabels = Object.fromEntries(
  sprintStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof sprintStatusOptions)[number]['value'], string>

const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}

const taskStatuses: HybridControlTask['status'][] = ['todo', 'doing', 'review', 'done']
const taskDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
})

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

let syncingControlStateFromRoute = false

function parseControlModuleQuery(value: unknown): ControlModuleId {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && controlModuleIds.has(raw as ControlModuleId)
    ? raw as ControlModuleId
    : 'overview'
}

function parseControlSprintQuery(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

function parseControlTaskQuery(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

function readControlStateFromRoute() {
  syncingControlStateFromRoute = true
  activeModule.value = parseControlModuleQuery(route.query[CONTROL_QUERY_TAB_KEY])
  activeSprintId.value = parseControlSprintQuery(route.query[CONTROL_QUERY_SPRINT_KEY])
  activeTaskId.value = parseControlTaskQuery(route.query[CONTROL_QUERY_TASK_KEY])
  syncingControlStateFromRoute = false
}

async function syncControlStateToRoute() {
  if (syncingControlStateFromRoute) return

  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>

  if (activeModule.value !== 'overview') nextQuery[CONTROL_QUERY_TAB_KEY] = activeModule.value
  else delete nextQuery[CONTROL_QUERY_TAB_KEY]

  if (activeSprintId.value) nextQuery[CONTROL_QUERY_SPRINT_KEY] = activeSprintId.value
  else delete nextQuery[CONTROL_QUERY_SPRINT_KEY]

  if (activeTaskId.value) nextQuery[CONTROL_QUERY_TASK_KEY] = activeTaskId.value
  else delete nextQuery[CONTROL_QUERY_TASK_KEY]

  const currentTab = Array.isArray(route.query[CONTROL_QUERY_TAB_KEY]) ? route.query[CONTROL_QUERY_TAB_KEY][0] : route.query[CONTROL_QUERY_TAB_KEY]
  const currentSprint = Array.isArray(route.query[CONTROL_QUERY_SPRINT_KEY]) ? route.query[CONTROL_QUERY_SPRINT_KEY][0] : route.query[CONTROL_QUERY_SPRINT_KEY]
  const currentTask = Array.isArray(route.query[CONTROL_QUERY_TASK_KEY]) ? route.query[CONTROL_QUERY_TASK_KEY][0] : route.query[CONTROL_QUERY_TASK_KEY]
  const nextTab = typeof nextQuery[CONTROL_QUERY_TAB_KEY] === 'string' ? nextQuery[CONTROL_QUERY_TAB_KEY] : undefined
  const nextSprint = typeof nextQuery[CONTROL_QUERY_SPRINT_KEY] === 'string' ? nextQuery[CONTROL_QUERY_SPRINT_KEY] : undefined
  const nextTask = typeof nextQuery[CONTROL_QUERY_TASK_KEY] === 'string' ? nextQuery[CONTROL_QUERY_TASK_KEY] : undefined

  if (currentTab === nextTab && currentSprint === nextSprint && currentTask === nextTask) return
  await router.replace({ query: nextQuery })
}

watch(project, (value) => {
  if (!value) return
  Object.assign(control, ensureHybridControl(value.profile?.hybridControl, value))
}, { immediate: true })

watch(() => [route.query[CONTROL_QUERY_TAB_KEY], route.query[CONTROL_QUERY_SPRINT_KEY], route.query[CONTROL_QUERY_TASK_KEY]], () => {
  readControlStateFromRoute()
}, { immediate: true })

watch(activeModule, async () => {
  await syncControlStateToRoute()
})

watch(activeSprintId, async () => {
  await syncControlStateToRoute()
})

watch(activeTaskId, async (taskId) => {
  if (taskId) {
    const taskContext = getTaskContext(taskId)
    if (taskContext?.sprint.id && activeSprintId.value !== taskContext.sprint.id) {
      activeSprintId.value = taskContext.sprint.id
    }
  }

  await syncControlStateToRoute()
})

watch(() => control.sprints.map(sprint => sprint.id), (sprintIds) => {
  if (activeSprintId.value && !sprintIds.includes(activeSprintId.value)) {
    activeSprintId.value = ''
  }
}, { immediate: true })

watch(() => control.sprints.flatMap(sprint => sprint.tasks.map(task => task.id)), (taskIds) => {
  if (activeTaskId.value && !taskIds.includes(activeTaskId.value)) {
    activeTaskId.value = ''
  }

  if (activeTaskId.value) {
    const taskContext = getTaskContext(activeTaskId.value)
    if (taskContext?.sprint.id && activeSprintId.value !== taskContext.sprint.id) {
      activeSprintId.value = taskContext.sprint.id
    }
  }
}, { immediate: true })

const summary = computed(() => buildHybridControlSummary(control))
const coordinationBrief = computed(() => buildHybridCoordinationBrief(control, { projectSlug: props.slug }))

const communicationChannelOptions = (
  ['project-room', 'direct-thread', 'handoff', 'approval', 'daily-digest'] as const satisfies readonly HybridControlCommunicationChannel[]
).map(value => ({
  value,
  label: getHybridCommunicationChannelLabel(value),
}))

const projectParticipantRoleOptions = PROJECT_PARTICIPANT_ROLE_KEYS.map(value => ({
  value,
  label: getProjectParticipantRoleLabel(value),
}))

const projectGovernanceResponsibilityOptions = PROJECT_RESPONSIBILITY_KEYS.map(value => ({
  value,
  label: getProjectResponsibilityLabel(value),
}))

const timelineGovernanceSettingOrder = [
  'communicationChannel',
  'approvalMode',
  'visibility',
  'requiredResponsibilities',
  'reviewCadenceDays',
  'reminderCadenceDays',
  'slaHours',
  'escalateOnBlocked',
] as const

const timelineGovernanceSettingLabels: Record<string, string> = {
  communicationChannel: 'Канал коммуникации',
  approvalMode: 'Режим согласования',
  visibility: 'Видимость',
  requiredResponsibilities: 'Обязательные роли',
  reviewCadenceDays: 'Ревью, дней',
  reminderCadenceDays: 'Напоминание, дней',
  slaHours: 'SLA, часов',
  escalateOnBlocked: 'Эскалация при блокере',
}

const timelineGovernanceOriginLabels: Record<ProjectScopeDetailBundle['participants'][number]['origin'], string> = {
  direct: 'контур',
  project: 'проект',
  derived: 'legacy',
}

const stakeholderRoleOptions = (
  ['admin', 'manager', 'designer', 'client', 'contractor', 'seller', 'service'] as const satisfies readonly HybridControlStakeholderRole[]
).map(value => ({
  value,
  label: getHybridStakeholderRoleLabel(value),
}))

const teamMemberRoleLabels: Record<HybridControlTeamMember['role'], string> = {
  architect: 'Архитектор',
  designer: 'Дизайнер',
  contractor: 'Подрядчик',
  client: 'Клиент',
  manager: 'Менеджер',
  other: 'Участник',
}

const teamMemberChannelLabels: Record<HybridControlTeamMember['notifyBy'], string> = {
  email: 'Email',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  manual: 'Вручную',
  'ai-agent': 'AI агент',
}

const teamMemberStakeholderMap: Record<HybridControlTeamMember['role'], HybridControlStakeholderRole[]> = {
  architect: ['designer'],
  designer: ['designer'],
  contractor: ['contractor'],
  client: ['client'],
  manager: ['manager'],
  other: ['service'],
}

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
const saveRequestId = ref(0)

const saveMetaText = computed(() => {
  if (saveState.value === 'saving') return 'сохраняем...'
  if (saveState.value === 'error') return 'ошибка сохранения'
  return savedAt.value ? `обновлено ${savedAt.value}` : ''
})

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
  '--hpc-entity-column-width': '220px',
  '--hpc-period-column-width': '148px',
  minWidth: `${368 + Math.max(timelineColumns.value.length, 1) * getHybridTimelineColumnWidth(timelineScale.value)}px`,
}))

const timelineWindowLabel = computed(() => `${toIsoLocalDate(timelineBounds.value.start)} - ${toIsoLocalDate(timelineBounds.value.end)}`)

const timelineStats = computed(() => ([
  { label: 'Период', value: timelineWindowLabel.value },
  { label: 'Строк', value: `${visibleTimelineRows.value.length}` },
  { label: 'Фаз', value: `${control.phases.length}` },
  { label: 'Спринтов', value: `${control.sprints.length}` },
]))

const phaseGateStats = computed(() => control.phases.reduce((acc, phase) => {
  acc.total += phase.gates.length
  acc.done += phase.gates.filter(gate => gate.done).length
  return acc
}, { done: 0, total: 0 }))

const sprintTaskStats = computed(() => control.sprints.reduce((acc, sprint) => {
  acc.total += sprint.tasks.length
  acc.done += sprint.tasks.filter(task => task.status === 'done').length
  return acc
}, { done: 0, total: 0 }))

const phaseStats = computed(() => ([
  { label: 'Фаз', value: `${control.phases.length}` },
  { label: 'Активных', value: `${control.phases.filter(phase => phase.status === 'active').length}` },
  { label: 'Гейтов', value: phaseGateStats.value.total ? `${phaseGateStats.value.done}/${phaseGateStats.value.total}` : '0' },
  { label: 'Спринтов', value: `${control.sprints.length}` },
]))

const sprintStats = computed(() => ([
  { label: 'Спринтов', value: `${control.sprints.length}` },
  { label: 'Активных', value: `${control.sprints.filter(sprint => sprint.status === 'active').length}` },
  { label: 'Задач', value: `${sprintTaskStats.value.total}` },
  { label: 'Готово', value: sprintTaskStats.value.total ? `${sprintTaskStats.value.done}/${sprintTaskStats.value.total}` : '0' },
]))

const selectedSprint = computed(() => getSprintById(activeSprintId.value)
  || getTaskContext(activeTaskId.value)?.sprint
  || summary.value.activeSprint
  || control.sprints[0]
  || null)

const selectedTaskContext = computed(() => getTaskContext(activeTaskId.value))

const selectedTask = computed(() => {
  const sprint = selectedSprint.value
  const taskContext = selectedTaskContext.value
  if (!sprint || !taskContext || taskContext.sprint.id !== sprint.id) return null
  return taskContext.task
})

const selectedSprintPhaseTitle = computed(() => {
  if (!selectedSprint.value?.linkedPhaseKey) return 'Без фазы'
  return getPhaseTitleByKey(selectedSprint.value.linkedPhaseKey)
})

const selectedSprintStats = computed(() => {
  const sprint = selectedSprint.value
  if (!sprint) return []

  const total = sprint.tasks.length
  const done = sprint.tasks.filter(task => task.status === 'done').length
  const active = sprint.tasks.filter(task => task.status === 'doing' || task.status === 'review').length

  return [
    { label: 'Фаза', value: selectedSprintPhaseTitle.value },
    { label: 'Период', value: formatDateRange(sprint.startDate, sprint.endDate) },
    { label: 'Готово', value: total ? `${done}/${total}` : '0' },
    { label: 'В работе', value: `${active}` },
  ]
})

const selectedSprintColumns = computed(() => taskStatuses.map(status => ({
  status,
  label: taskStatusLabels[status],
  tasks: (selectedSprint.value?.tasks ?? []).filter(task => task.status === status),
})))

const selectedTaskStats = computed(() => {
  const task = selectedTask.value
  if (!task) return []

  return [
    { label: 'Статус', value: taskStatusLabels[task.status] },
    { label: 'Исполнитель', value: task.assignee || 'не назначен' },
    { label: 'Дедлайн', value: formatTaskDueDate(task.dueDate) },
    { label: 'Фаза', value: selectedSprintPhaseTitle.value },
  ]
})

const moduleCards = computed(() => ([
  {
    id: 'overview' as const,
    label: 'Обзор',
    glyph: 'О',
    navLabel: 'Обзор',
    metric: `${summary.value.phasePercent}% каркаса`,
    meta: control.manager || 'ответственный не назначен',
  },
  {
    id: 'timeline' as const,
    label: 'Таймлайн / Таблица',
    glyph: 'П',
    navLabel: 'План',
    metric: timelineWindowLabel.value,
    meta: `${visibleTimelineRows.value.length} строк плана`,
  },
  {
    id: 'phases' as const,
    label: 'Этапы и Спринты',
    glyph: 'Э',
    navLabel: 'Этапы',
    metric: `${control.phases.length} фаз / ${control.sprints.length} спринтов`,
    meta: phaseGateStats.value.total ? `${phaseGateStats.value.done}/${phaseGateStats.value.total} гейтов закрыто` : 'гейты не заданы',
  },
  {
    id: 'kanban' as const,
    label: 'Канбан',
    glyph: 'К',
    navLabel: 'Канбан',
    metric: `${sprintTaskStats.value.total} задач`,
    meta: sprintTaskStats.value.total ? `${sprintTaskStats.value.done} готово` : 'задачи не заведены',
  },
  {
    id: 'health' as const,
    label: 'Контрольные точки',
    glyph: 'Т',
    navLabel: 'Точки',
    metric: `${summary.value.blockerCount} блокеров`,
    meta: control.nextReviewDate || 'обзор не назначен',
  },
  {
    id: 'communications' as const,
    label: 'Звонки и Агенты',
    glyph: 'А',
    navLabel: 'Агенты',
    metric: `${coordinationBrief.value.agents.filter(item => item.enabled).length} агентов`,
    meta: control.callInsights.length ? `${control.callInsights.length} звонков в базе` : 'звонки не добавлены',
  },
]))

const activeModuleCard = computed(() => moduleCards.value.find(moduleCard => moduleCard.id === activeModule.value) ?? moduleCards.value[0])

const activeTaskContext = computed(() => getTaskContext(activeTaskId.value))
const selectedTimelineRowState = ref<SelectedTimelineRowState | null>(null)
const timelineScopeDetail = ref<ProjectScopeDetailBundle | null>(null)
const timelineScopeDetailPending = ref(false)
const timelineScopeDetailError = ref('')
const timelineScopeDetailRequestId = ref(0)
const timelineGovernancePending = ref(false)
const timelineGovernanceError = ref('')
const timelineGovernanceNotice = ref('')
const timelineGovernanceSettingsDraft = ref<Record<string, unknown>>({})
const timelineGovernanceParticipantDraft = reactive<TimelineGovernanceParticipantDraft>({
  displayName: '',
  roleKey: 'manager',
  responsibility: 'owner',
})

const selectedTimelineRowDetails = computed<SelectedTimelineRowState | null>(() => selectedTimelineRowState.value)

const selectedTimelinePhase = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected || selected.scopeType !== 'phase') return null
  return getPhaseById(selected.id) || control.phases.find(phase => phase.phaseKey === selected.phaseKey) || null
})

const selectedTimelineSprint = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected || selected.scopeType !== 'sprint') return null
  return getSprintById(selected.id)
})

const selectedTimelineTaskSprintId = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected || selected.scopeType !== 'task') return ''
  return selected.sprintId || ''
})

const selectedTimelineDetailCards = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return [] as Array<{ label: string; value: string }>

  const cards: Array<{ label: string; value: string }> = []

  if (selected.startDate || selected.endDate) {
    cards.push({
      label: 'Период',
      value: formatDateRange(selected.startDate, selected.endDate),
    })
  }

  if (selected.progressLabel) {
    cards.push({
      label: 'Прогресс',
      value: selected.progressLabel,
    })
  }

  const resolvedStatusLabel = timelineScopeDetail.value?.scope.statusLabel || selected.statusLabel
  if (resolvedStatusLabel) {
    cards.push({
      label: 'Статус',
      value: resolvedStatusLabel,
    })
  }

  return cards
})

const timelineScopeTypeLabels = {
  project: 'Проект',
  phase: 'Фаза',
  sprint: 'Спринт',
  task: 'Задача',
  document: 'Документ',
  service: 'Услуга',
} as const

function mapTimelineDetailItems(items: Array<{ key: string; label: string; value: string }>): TimelineDetailItem[] {
  return items.map(item => ({
    key: item.key,
    label: item.label,
    value: item.value,
  }))
}

const timelineDetailRules = computed<TimelineRuleSummary[]>(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return []

  if (timelineScopeDetail.value) {
    return timelineScopeDetail.value.ruleItems.map(rule => ({
      id: rule.id,
      title: rule.title,
      channel: rule.channel,
      trigger: rule.trigger,
      audience: rule.audience,
    }))
  }

  const selectedPhaseKey = selected.type === 'phase'
    ? selected.phaseKey
    : selected.linkedPhaseKey

  return control.communicationPlaybook.slice(0, 4).map(rule => ({
    id: rule.id,
    title: rule.title,
    channel: getCommunicationChannelLabel(rule.linkedChannel),
    trigger: rule.trigger,
    audience: rule.audience.length
      ? rule.audience.map(getStakeholderRoleLabel).join(' · ')
      : (selectedPhaseKey ? `Контур ${getPhaseTitleByKey(selectedPhaseKey)}` : 'Общий контур'),
  }))
})

const timelineDetailSubjects = computed<TimelineDetailItem[]>(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return []

  if (timelineScopeDetail.value) {
    return [
      ...timelineScopeDetail.value.participants.map(participant => ({
        key: participant.assignmentId,
        label: participant.roleLabel,
        value: [participant.displayName, participant.responsibilityLabel, participant.secondary].filter(Boolean).join(' · '),
      })),
      ...timelineScopeDetail.value.subjectItems.map(item => ({
        key: `subject-${item.key}`,
        label: item.label,
        value: item.value,
      })),
    ]
  }

  const audienceLabels = Array.from(new Set(
    control.communicationPlaybook.flatMap(rule => rule.audience.map(getStakeholderRoleLabel)),
  ))

  if (selected.type === 'phase') {
    const phase = selectedTimelinePhase.value
    const linkedSprints = control.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
    const assignees = Array.from(new Set(
      linkedSprints.flatMap(sprint => sprint.tasks.map(task => (task.assignee || '').trim())).filter(Boolean),
    ))

    return [
      {
        key: `phase-owner-${phase?.id || selected.id}`,
        label: 'Куратор',
        value: phase?.owner || 'не назначен',
      },
      {
        key: `phase-assignees-${selected.id}`,
        label: 'Исполнители',
        value: assignees.length ? assignees.join(', ') : 'пока не назначены',
      },
      {
        key: `phase-audience-${selected.id}`,
        label: 'Аудитория',
        value: audienceLabels.length ? audienceLabels.join(' · ') : 'общий проектный контур',
      },
    ]
  }

  if (selected.scopeType !== 'sprint') {
    return []
  }

  const sprint = selectedTimelineSprint.value
  const assignees = Array.from(new Set(
    (sprint?.tasks || []).map(task => (task.assignee || '').trim()).filter(Boolean),
  ))

  return [
    {
      key: `sprint-phase-${selected.id}`,
      label: 'Фаза',
      value: getPhaseTitleByKey(sprint?.linkedPhaseKey),
    },
    {
      key: `sprint-assignees-${selected.id}`,
      label: 'Исполнители',
      value: assignees.length ? assignees.join(', ') : 'команда не назначена',
    },
    {
      key: `sprint-audience-${selected.id}`,
      label: 'Аудитория',
      value: audienceLabels.length ? audienceLabels.join(' · ') : 'без закрепленной аудитории',
    },
  ]
})

const timelineDetailObjects = computed<TimelineDetailItem[]>(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return []

  if (timelineScopeDetail.value) {
    return mapTimelineDetailItems(timelineScopeDetail.value.objectItems)
  }

  if (selected.type === 'phase') {
    const phase = selectedTimelinePhase.value
    const linkedSprints = control.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
    const linkedTasks = linkedSprints.flatMap(sprint => sprint.tasks)

    return [
      {
        key: `phase-deliverable-${selected.id}`,
        label: 'Результат',
        value: phase?.deliverable || 'результат не зафиксирован',
      },
      {
        key: `phase-sprints-${selected.id}`,
        label: 'Связанные спринты',
        value: linkedSprints.length ? linkedSprints.map(sprint => sprint.name).join(' · ') : 'спринты еще не привязаны',
      },
      {
        key: `phase-tasks-${selected.id}`,
        label: 'Задачи контура',
        value: linkedTasks.length ? `${linkedTasks.length} задач в связанных спринтах` : 'задачи еще не заведены',
      },
    ]
  }

  if (selected.scopeType !== 'sprint') {
    return []
  }

  const sprint = selectedTimelineSprint.value
  return [
    {
      key: `sprint-goal-${selected.id}`,
      label: 'Цель',
      value: sprint?.goal || 'цель не описана',
    },
    {
      key: `sprint-focus-${selected.id}`,
      label: 'Фокус',
      value: sprint?.focus || 'фокус команды не задан',
    },
    {
      key: `sprint-retro-${selected.id}`,
      label: 'Ретроспектива',
      value: sprint?.retrospective || 'пока без ретроспективы',
    },
  ]
})

const timelineDetailActions = computed<TimelineDetailItem[]>(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return []

  if (timelineScopeDetail.value) {
    return mapTimelineDetailItems(timelineScopeDetail.value.actionItems)
  }

  if (selected.type === 'phase') {
    const phase = selectedTimelinePhase.value
    const gateActions = (phase?.gates || []).map(gate => ({
      key: `gate-${gate.id}`,
      label: gate.label,
      value: gate.done ? 'готово' : 'ожидает закрытия',
    }))

    const checkpointActions = control.checkpoints.slice(0, 2).map(checkpoint => ({
      key: `checkpoint-${checkpoint.id}`,
      label: checkpoint.title,
      value: checkpoint.note || checkpointStatusLabels[checkpoint.status],
    }))

    return [...gateActions, ...checkpointActions].slice(0, 6)
  }

  if (selected.scopeType !== 'sprint') {
    return []
  }

  const sprint = selectedTimelineSprint.value
  const taskActions = (sprint?.tasks || []).map(task => ({
    key: `task-${task.id}`,
    label: task.title,
    value: `${taskStatusLabels[task.status]}${task.assignee ? ` · ${task.assignee}` : ''}`,
  }))

  const projectBlockers = control.blockers.slice(0, 2).map((blocker, index) => ({
    key: `blocker-${selected.id}-${index}`,
    label: `Блокер ${index + 1}`,
    value: blocker,
  }))

  return [...taskActions, ...projectBlockers].slice(0, 6)
})

const timelineDetailSettings = computed<TimelineDetailItem[]>(() => {
  if (!timelineScopeDetail.value) return []
  return mapTimelineDetailItems(timelineScopeDetail.value.settingItems)
})

const timelineDetailLinkedScopes = computed<TimelineDetailItem[]>(() => {
  if (!timelineScopeDetail.value) return []

  return timelineScopeDetail.value.linkedScopes.map(linkedScope => ({
    key: `${linkedScope.scopeType}-${linkedScope.scopeId}`,
    label: timelineScopeTypeLabels[linkedScope.scopeType],
    value: [linkedScope.title, linkedScope.statusLabel || linkedScope.status].filter(Boolean).join(' · '),
  }))
})

const timelineDetailTasks = computed<TimelineDetailTaskItem[]>(() => {
  if (timelineScopeDetail.value) {
    return timelineScopeDetail.value.tasks.map(task => {
      const normalizedTaskId = normalizeTaskScopeId(task.id)
      const taskContext = getTaskContext(normalizedTaskId)

      return {
        id: normalizedTaskId,
        scopeId: task.id,
        title: task.title,
        meta: [
          task.assigneeLabels.length ? task.assigneeLabels.join(', ') : 'Исполнитель не назначен',
          task.statusLabel,
          task.secondary,
        ].filter(Boolean).join(' · '),
        sprintId: taskContext?.sprint.id || (selectedTimelineRowDetails.value?.type === 'sprint' ? selectedTimelineRowDetails.value.id : ''),
      }
    })
  }

  if (selectedTimelineRowDetails.value?.scopeType !== 'sprint') {
    return []
  }

  return (selectedTimelineSprint.value?.tasks || []).map(task => ({
    id: task.id,
    scopeId: task.id,
    title: task.title,
    meta: `${task.assignee || 'Исполнитель не назначен'} · ${taskStatusLabels[task.status]}`,
    sprintId: selectedTimelineRowDetails.value?.id || '',
  }))
})

const timelineGovernanceParticipants = computed(() => {
  return (timelineScopeDetail.value?.participants || []).map(participant => ({
    ...participant,
    editable: participant.origin === 'direct' && /^assignment:\d+$/.test(participant.assignmentId),
    originLabel: timelineGovernanceOriginLabels[participant.origin],
  }))
})

const canCreateTimelineGovernanceParticipant = computed(() => {
  return Boolean(
    timelineScopeDetail.value
    && timelineGovernanceParticipantDraft.displayName.trim()
    && !timelineGovernancePending.value,
  )
})

const timelineGovernanceEditableSettings = computed(() => {
  const detail = timelineScopeDetail.value
  if (!detail) {
    return [] as Array<{
      key: string
      label: string
      kind: TimelineGovernanceSettingFieldKind
      value: string | number | boolean | null
    }>
  }

  const labelMap = new Map(detail.settingItems.map(item => [item.key, item.label]))
  const knownKeys = timelineGovernanceSettingOrder.filter(key => key in timelineGovernanceSettingsDraft.value)
  const dynamicKeys = Object.keys(timelineGovernanceSettingsDraft.value).filter(key => !knownKeys.includes(key as typeof timelineGovernanceSettingOrder[number]))
  const keys = [...knownKeys, ...dynamicKeys]

  return keys.map((key) => {
    const rawValue = timelineGovernanceSettingsDraft.value[key]

    if (key === 'communicationChannel') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'select' as const,
        value: typeof rawValue === 'string' ? rawValue : '',
      }
    }

    if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'number' as const,
        value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue),
      }
    }

    if (key === 'escalateOnBlocked') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'boolean' as const,
        value: Boolean(rawValue),
      }
    }

    if (key === 'requiredResponsibilities') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'list' as const,
        value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '',
      }
    }

    return {
      key,
      label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
      kind: 'text' as const,
      value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue),
    }
  })
})

watch(() => timelineScopeDetail.value?.revision, () => {
  timelineGovernanceSettingsDraft.value = cloneTimelineGovernanceSettings(timelineScopeDetail.value?.settings || {})
  timelineGovernanceError.value = ''
  timelineGovernanceNotice.value = ''
}, { immediate: true })

function getMemberName(id: string) {
  const m = control.team?.find((t: any) => t.id === id)
  return m ? m.name : id
}

function cloneTimelineGovernanceSettings(settings: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
}

function normalizeTimelineGovernanceError(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const record = error as {
    statusMessage?: string
    message?: string
    data?: { statusMessage?: string; message?: string }
  }

  return String(record.data?.statusMessage || record.statusMessage || record.data?.message || record.message || fallback).trim() || fallback
}

function extractTimelineGovernanceAssignmentId(assignmentId: string) {
  const match = assignmentId.match(/^assignment:(\d+)$/)
  return match ? Number(match[1]) : 0
}

function normalizeTimelineGovernanceSettingValue(kind: TimelineGovernanceSettingFieldKind, value: unknown) {
  if (kind === 'boolean') {
    return Boolean(value)
  }

  if (kind === 'number') {
    const normalized = typeof value === 'number' ? value : Number(String(value || '').trim())
    return Number.isFinite(normalized) ? normalized : null
  }

  if (kind === 'list') {
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
}

function updateTimelineGovernanceSettingDraft(key: string, kind: TimelineGovernanceSettingFieldKind, value: unknown) {
  timelineGovernanceSettingsDraft.value = {
    ...timelineGovernanceSettingsDraft.value,
    [key]: normalizeTimelineGovernanceSettingValue(kind, value),
  }
}

async function refreshTimelineGovernanceView(refreshControl = false) {
  const selectedRow = selectedTimelineRowDetails.value
  const jobs: Array<Promise<unknown>> = []

  if (selectedRow) {
    jobs.push(fetchTimelineScopeDetail(selectedRow))
  }

  if (refreshControl) {
    jobs.push(refresh())
  }

  if (!jobs.length) {
    return
  }

  await Promise.allSettled(jobs)
}

async function runTimelineGovernanceMutation(
  execute: () => Promise<void>,
  successMessage: string,
  refreshControl = false,
  fallbackMessage = 'Не удалось обновить контур проекта.',
) {
  timelineGovernancePending.value = true
  timelineGovernanceError.value = ''
  timelineGovernanceNotice.value = ''

  try {
    await execute()
    await refreshTimelineGovernanceView(refreshControl)
    timelineGovernanceNotice.value = successMessage
    return true
  } catch (error) {
    timelineGovernanceError.value = normalizeTimelineGovernanceError(error, fallbackMessage)
    return false
  } finally {
    timelineGovernancePending.value = false
  }
}

async function createTimelineGovernanceParticipant() {
  const detail = timelineScopeDetail.value
  const displayName = timelineGovernanceParticipantDraft.displayName.trim()

  if (!detail || !displayName) {
    timelineGovernanceError.value = 'Сначала откройте контур и заполните имя участника.'
    return
  }

  await runTimelineGovernanceMutation(async () => {
    const participantResponse = await $fetch<TimelineGovernanceMutationResponse>(`/api/projects/${props.slug}/coordination/participants`, {
      method: 'POST',
      body: {
        displayName,
        roleKey: timelineGovernanceParticipantDraft.roleKey,
        sourceKind: 'custom',
      },
    })

    await $fetch(`/api/projects/${props.slug}/coordination/assignments`, {
      method: 'POST',
      body: {
        participantId: participantResponse.participant.persistedId,
        scopeType: detail.scope.scopeType,
        scopeSource: detail.scope.scopeSource,
        scopeId: detail.scope.scopeId,
        responsibility: timelineGovernanceParticipantDraft.responsibility,
      },
    })

    timelineGovernanceParticipantDraft.displayName = ''
  }, 'Участник добавлен в контур.', true, 'Не удалось добавить участника в контур.')
}

async function updateTimelineGovernanceAssignment(assignmentId: string, responsibility: ProjectResponsibilityKey) {
  const persistedAssignmentId = extractTimelineGovernanceAssignmentId(assignmentId)
  if (!persistedAssignmentId) {
    timelineGovernanceError.value = 'Не удалось определить назначение для обновления.'
    return
  }

  await runTimelineGovernanceMutation(async () => {
    await $fetch(`/api/projects/${props.slug}/coordination/assignments/${persistedAssignmentId}`, {
      method: 'PATCH',
      body: { responsibility },
    })
  }, 'Назначение обновлено.', true, 'Не удалось обновить назначение.')
}

async function deleteTimelineGovernanceAssignment(assignmentId: string) {
  const persistedAssignmentId = extractTimelineGovernanceAssignmentId(assignmentId)
  if (!persistedAssignmentId) {
    timelineGovernanceError.value = 'Не удалось определить назначение для удаления.'
    return
  }

  await runTimelineGovernanceMutation(async () => {
    await $fetch(`/api/projects/${props.slug}/coordination/assignments/${persistedAssignmentId}`, {
      method: 'DELETE',
    })
  }, 'Назначение удалено.', true, 'Не удалось удалить назначение.')
}

async function commitTimelineGovernanceSettings() {
  const detail = timelineScopeDetail.value
  if (!detail) {
    return
  }

  await runTimelineGovernanceMutation(async () => {
    await $fetch(`/api/projects/${props.slug}/coordination/scopes/${detail.scope.scopeType}/${encodeURIComponent(detail.scope.scopeId)}/settings`, {
      method: 'PATCH',
      body: {
        settings: cloneTimelineGovernanceSettings(timelineGovernanceSettingsDraft.value),
      },
    })
  }, 'Настройки контура обновлены.', false, 'Не удалось обновить настройки контура.')
}

function handleTimelineGovernanceResponsibilityChange(assignmentId: string, event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value as ProjectResponsibilityKey | undefined
  if (!value) {
    return
  }

  void updateTimelineGovernanceAssignment(assignmentId, value)
}

function handleTimelineGovernanceSelectSettingChange(key: string, event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value || ''
  updateTimelineGovernanceSettingDraft(key, 'select', value)
  void commitTimelineGovernanceSettings()
}

function handleTimelineGovernanceBooleanSettingChange(key: string, event: Event) {
  const checked = Boolean((event.target as HTMLInputElement | null)?.checked)
  updateTimelineGovernanceSettingDraft(key, 'boolean', checked)
  void commitTimelineGovernanceSettings()
}

function handleTimelineGovernanceTextSettingInput(key: string, kind: TimelineGovernanceSettingFieldKind, event: Event) {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value || ''
  updateTimelineGovernanceSettingDraft(key, kind, value)
}

function resolveSaveOptions(value?: unknown): SaveOptions {
  if (value && typeof value === 'object' && !('target' in value)) {
    return value as SaveOptions
  }

  return {}
}

async function save(value?: unknown) {
  const options = resolveSaveOptions(value)
  const requestId = saveRequestId.value + 1
  saveRequestId.value = requestId
  saveState.value = 'saving'

  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: {
        profile: {
          ...(project.value?.profile || {}),
          hybridControl: control,
        },
      },
    })

    if (requestId !== saveRequestId.value) return

    markSaved()
    saveState.value = 'idle'
    if (options.refreshAfter === true) {
      await refresh()
    }
  } catch {
    if (requestId !== saveRequestId.value) return
    saveState.value = 'error'
  }
}

function addSprint() {
  const sprint: HybridControlSprint = {
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
  }

  control.sprints.push(sprint)
  activeSprintId.value = sprint.id
  activeTaskId.value = ''
  void save({ refreshAfter: false })
}

function removeSprint(index: number) {
  const removed = control.sprints[index]
  control.sprints.splice(index, 1)

  if (removed?.id === activeSprintId.value) {
    activeSprintId.value = control.sprints[index]?.id || control.sprints[index - 1]?.id || ''
  }

  if (removed?.tasks.some(task => task.id === activeTaskId.value)) {
    activeTaskId.value = ''
  }

  void save({ refreshAfter: false })
}

function addTask(sprint: HybridControlSprint) {
  const task: HybridControlTask = {
    id: `hybrid-task-${Date.now()}`,
    title: 'Новая задача',
    status: 'todo',
    assignee: '',
    dueDate: '',
    points: 1,
    notes: '',
  }

  sprint.tasks.push(task)
  activeSprintId.value = sprint.id
  activeTaskId.value = task.id
  void save({ refreshAfter: false })
}

function removeTask(sprint: HybridControlSprint, index: number) {
  const removed = sprint.tasks[index]
  sprint.tasks.splice(index, 1)

  if (removed?.id === activeTaskId.value) {
    activeTaskId.value = sprint.tasks[index]?.id || sprint.tasks[index - 1]?.id || ''
  }

  void save({ refreshAfter: false })
}

function getTaskContext(taskId?: string) {
  if (!taskId) return null

  for (const sprint of control.sprints) {
    const task = sprint.tasks.find(item => item.id === taskId)
    if (task) {
      return { sprint, task }
    }
  }

  return null
}

async function selectModule(moduleId: ControlModuleId) {
  const moduleChanged = activeModule.value !== moduleId
  activeModule.value = moduleId

  if (!moduleChanged || !import.meta.client || typeof window === 'undefined' || window.innerWidth > 900) {
    return
  }

  await nextTick()
  moduleViewportStart.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  queueMobileModuleDockSync()
}

function syncMobileModuleDockVisibility() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (window.innerWidth > 768) {
    isMobileModuleDockVisible.value = true
    return
  }

  const shell = controlShell.value
  if (!shell) {
    isMobileModuleDockVisible.value = false
    return
  }

  const shellRect = shell.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const dockHeight = moduleNavRef.value?.getBoundingClientRect().height || 72

  isMobileModuleDockVisible.value = shellRect.top <= viewportHeight * 0.45 && shellRect.bottom >= dockHeight + 32
}

function queueMobileModuleDockSync() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (moduleDockSyncFrame) {
    window.cancelAnimationFrame(moduleDockSyncFrame)
  }

  moduleDockSyncFrame = window.requestAnimationFrame(() => {
    moduleDockSyncFrame = 0
    syncMobileModuleDockVisibility()
  })
}

onMounted(() => {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  queueMobileModuleDockSync()
  window.addEventListener('scroll', queueMobileModuleDockSync, { passive: true })
  window.addEventListener('resize', queueMobileModuleDockSync)
})

onBeforeUnmount(() => {
  clearTimelineTooltipTimer()

  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (moduleDockSyncFrame) {
    window.cancelAnimationFrame(moduleDockSyncFrame)
  }

  window.removeEventListener('scroll', queueMobileModuleDockSync)
  window.removeEventListener('resize', queueMobileModuleDockSync)
})

watch([activeModule, pending], async () => {
  if (!import.meta.client) {
    return
  }

  await nextTick()
  queueMobileModuleDockSync()
}, { flush: 'post' })

function setActiveTaskId(taskId: string) {
  activeTaskId.value = taskId || ''
}

function clearTaskFocus() {
  activeTaskId.value = ''
}

function isSelectedSprint(sprint: HybridControlSprint) {
  return selectedSprint.value?.id === sprint.id
}

function isSelectedTask(task: HybridControlTask) {
  return selectedTask.value?.id === task.id
}

function removeSelectedSprint() {
  const sprint = selectedSprint.value
  if (!sprint) return

  const index = control.sprints.findIndex(item => item.id === sprint.id)
  if (index < 0) return

  removeSprint(index)
}

function removeSelectedTask() {
  const taskContext = selectedTaskContext.value
  if (!taskContext) return

  const index = taskContext.sprint.tasks.findIndex(task => task.id === taskContext.task.id)
  if (index < 0) return

  removeTask(taskContext.sprint, index)
}

async function scrollControlTargetIntoView(targetModule: ControlModuleId, options: { sprintId?: string, taskId?: string }) {
  if (!import.meta.client || typeof document === 'undefined') return

  await nextTick()

  const selector = targetModule === 'kanban'
    ? (options.taskId
      ? `[data-kanban-task-id="${options.taskId}"]`
      : options.sprintId
        ? `[data-kanban-sprint-id="${options.sprintId}"]`
        : '')
    : (options.taskId
      ? `[data-phase-task-id="${options.taskId}"]`
      : options.sprintId
        ? `[data-sprint-id="${options.sprintId}"]`
        : '')

  if (!selector) return
  document.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

async function focusSprint(sprintId?: string) {
  if (!sprintId) return

  activeTaskId.value = ''
  activeSprintId.value = sprintId
  selectModule('phases')
  await scrollControlTargetIntoView('phases', { sprintId })
}

async function focusTask(taskId?: string, sprintId?: string, targetModule: ControlModuleId = 'kanban') {
  if (!taskId) return

  const taskContext = getTaskContext(taskId)
  const resolvedSprintId = sprintId || taskContext?.sprint.id || ''

  activeTaskId.value = taskId
  if (resolvedSprintId) {
    activeSprintId.value = resolvedSprintId
  }
  selectModule(targetModule)
  await scrollControlTargetIntoView(targetModule, {
    sprintId: resolvedSprintId,
    taskId,
  })
}

watch(() => [activeModule.value, activeSprintId.value, activeTaskId.value], async ([moduleId, sprintId, taskId]) => {
  if (moduleId !== 'phases') return

  if (taskId) {
    await scrollControlTargetIntoView('phases', { sprintId, taskId })
    return
  }

  if (sprintId) {
    await scrollControlTargetIntoView('phases', { sprintId })
  }
})

async function openTimelineSprintInKanban(sprintId?: string) {
  closeTimelineRowDetails()
  if (!sprintId) {
    activeTaskId.value = ''
    selectModule('kanban')
    return
  }

  activeTaskId.value = ''
  activeSprintId.value = sprintId
  selectModule('kanban')
  await scrollControlTargetIntoView('kanban', { sprintId })
}

function openTimelineTask(taskId: string, sprintId?: string) {
  const normalizedTaskId = normalizeTaskScopeId(taskId)
  closeTimelineRowDetails()
  void focusTask(normalizedTaskId, sprintId, 'kanban')
}

function openTimelinePhaseEditor() {
  closeTimelineRowDetails()
  selectModule('phases')
}

function cycleTask(task: HybridControlTask) {
  const next: Record<string, HybridControlTask['status']> = {
    todo: 'doing',
    doing: 'review',
    review: 'done',
    done: 'todo',
  }
  task.status = next[task.status]
  void save({ refreshAfter: false })
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
  } catch {
    callInsightStatus.value = 'Не удалось превратить инсайт звонка в задачи спринта.'
  } finally {
    callInsightApplyPendingId.value = ''
  }
}

function formatDateRange(startDate?: string, endDate?: string) {
  return formatHybridTimelineDateRange(startDate, endDate)
}

function formatTaskDueDate(value?: string) {
  if (!value) return 'без дедлайна'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return taskDateFormatter.format(parsed)
}

function getSprintCompletionLabel(sprint: HybridControlSprint) {
  if (!sprint.tasks.length) return '0/0'
  return `${sprint.tasks.filter(task => task.status === 'done').length}/${sprint.tasks.length}`
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

function openCallInsightTasks(insight: HybridControlCallInsight) {
  const taskIds = insight.appliedTaskIds || []
  const sprintId = insight.appliedSprintId
    || control.sprints.find(sprint => sprint.tasks.some(task => taskIds.includes(task.id)))?.id

  if (taskIds.length === 1) {
    void focusTask(taskIds[0], sprintId, 'kanban')
    return
  }

  void openTimelineSprintInKanban(sprintId)
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

function getTeamMemberRoleLabel(role: HybridControlTeamMember['role']) {
  return teamMemberRoleLabels[role] || role
}

function getTeamMemberChannelLabel(channel: HybridControlTeamMember['notifyBy']) {
  return teamMemberChannelLabels[channel] || channel
}

function getRecommendationRecipients(recommendation: { audience: HybridControlStakeholderRole[] }) {
  return control.team.filter(member => teamMemberStakeholderMap[member.role]?.some(role => recommendation.audience.includes(role)))
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
  if (changed) await save({ refreshAfter: false })
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
    await save({ refreshAfter: false })
    return
  }

  const sprint = getSprintById(row.id)
  if (!sprint) return
  sprint.startDate = toIsoLocalDate(start)
  sprint.endDate = toIsoLocalDate(end)
  await save({ refreshAfter: false })
}

function onDragEnd() {
  timelineDrag.kind = 'idle'
  timelineDrag.rowId = ''
  timelineDrag.rowType = null
  timelineDrag.overRowId = ''
  timelineDrag.overColumnKey = ''
}

const msgModalOpen = ref(false)
const msgModalTarget = ref<HybridControlTeamMember | null>(null)
const msgModalText = ref('')
const msgModalSending = ref(false)
const msgModalError = ref('')

function openMessageModal(member: HybridControlTeamMember, draftMessage: string = '') {
  msgModalTarget.value = member
  msgModalText.value = draftMessage
  msgModalError.value = ''
  msgModalOpen.value = true
}

function closeMessageModal() {
  msgModalOpen.value = false
  msgModalTarget.value = null
  msgModalText.value = ''
  msgModalError.value = ''
}

async function executeMessageDispatch() {
  if (!msgModalTarget.value || !msgModalText.value.trim()) return

  msgModalError.value = ''
  msgModalSending.value = true

  try {
    const res = await $fetch<{ success: boolean }>(`/api/projects/${props.slug}/communications/dispatch`, {
      method: 'POST',
      body: {
        memberId: msgModalTarget.value.id,
        message: msgModalText.value
      }
    })
    
    if (res.success) {
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

      markSaved()
      closeMessageModal()
    }
  } catch (e: any) {
    msgModalError.value = e?.message || 'Не удалось отправить сообщение'
  } finally {
    msgModalSending.value = false
  }
}

function isTimelineRowSelected(row: HybridTimelineRow) {
  return selectedTimelineRowDetails.value?.scopeId === row.id && selectedTimelineRowDetails.value?.scopeType === row.type
}

function normalizeTaskScopeId(taskId: string) {
  return taskId.startsWith('hybrid:') ? taskId.slice('hybrid:'.length) : taskId
}

function buildSelectedTimelineScopeState(row: HybridTimelineRow): SelectedTimelineRowState {
  return {
    id: row.id,
    scopeType: row.type,
    scopeId: row.id,
    type: row.type,
    typeLabel: row.typeLabel,
    title: row.title,
    meta: row.meta,
    startDate: row.startDate,
    endDate: row.endDate,
    progressLabel: row.progressLabel,
    statusLabel: row.statusLabel,
    phaseKey: row.phaseKey,
    linkedPhaseKey: row.linkedPhaseKey,
  }
}

function buildProjectScopeState(): SelectedTimelineRowState {
  return {
    id: props.slug,
    scopeType: 'project',
    scopeId: props.slug,
    type: 'project',
    typeLabel: 'Проект',
    title: project.value?.title || 'Проект',
    meta: [project.value?.status, summary.value.activePhase?.title, summary.value.activeSprint?.name].filter(Boolean).join(' · '),
    statusLabel: project.value?.status || 'Проект',
  }
}

function buildTaskScopeState(taskId: string, sprintId?: string): SelectedTimelineRowState | null {
  const normalizedTaskId = normalizeTaskScopeId(taskId)
  const taskContext = getTaskContext(normalizedTaskId)
  const resolvedSprintId = sprintId || taskContext?.sprint.id || ''
  const resolvedSprintName = taskContext?.sprint.name || selectedSprint.value?.name || 'Спринт'
  const resolvedPhaseTitle = taskContext?.sprint.linkedPhaseKey ? getPhaseTitleByKey(taskContext.sprint.linkedPhaseKey) : selectedSprintPhaseTitle.value

  if (!taskContext && !normalizedTaskId) {
    return null
  }

  return {
    id: normalizedTaskId,
    taskId: normalizedTaskId,
    sprintId: resolvedSprintId,
    scopeType: 'task',
    scopeId: taskId,
    type: 'task',
    typeLabel: 'Задача',
    title: taskContext?.task.title || 'Задача',
    meta: [resolvedSprintName, resolvedPhaseTitle].filter(Boolean).join(' · '),
    progressLabel: taskContext?.task.points ? `${taskContext.task.points} pt` : '',
    statusLabel: taskContext?.task ? taskStatusLabels[taskContext.task.status] : 'Задача',
    linkedPhaseKey: taskContext?.sprint.linkedPhaseKey || '',
  }
}

async function scrollTimelineDetailModalIntoView() {
  if (!import.meta.client || typeof document === 'undefined') return

  await nextTick()
  document.querySelector<HTMLElement>('.hpc-timeline-details-modal')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

const timelineTooltip = ref({
  visible: false,
  content: '',
  left: 0,
  top: 0,
  maxWidth: 280,
})

let timelineTooltipTimer: number | null = null

function getTimelineRowTooltip(row: HybridTimelineRow) {
  return [
    row.title,
    row.typeLabel,
    `Статус: ${row.statusLabel}`,
    `Период: ${formatDateRange(row.startDate, row.endDate)}`,
    `Прогресс: ${row.progressLabel}`,
    row.meta,
  ].filter(Boolean).join('\n')
}

const timelineTooltipStyle = computed(() => ({
  left: `${timelineTooltip.value.left}px`,
  top: `${timelineTooltip.value.top}px`,
  maxWidth: `${timelineTooltip.value.maxWidth}px`,
}))

function clearTimelineTooltipTimer() {
  if (!timelineTooltipTimer) return
  window.clearTimeout(timelineTooltipTimer)
  timelineTooltipTimer = null
}

function scheduleTimelineTooltip(event: Event, row: HybridTimelineRow) {
  if (!import.meta.client || typeof window === 'undefined') return

  if ('pointerType' in event && event.pointerType === 'touch') {
    return
  }

  const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (!target) return

  clearTimelineTooltipTimer()
  timelineTooltip.value.visible = false

  timelineTooltipTimer = window.setTimeout(() => {
    const rect = target.getBoundingClientRect()
    const maxWidth = Math.min(320, Math.max(220, window.innerWidth - 24))
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - maxWidth - 12),
    )

    timelineTooltip.value = {
      visible: true,
      content: getTimelineRowTooltip(row),
      left,
      top: Math.max(20, rect.top - 12),
      maxWidth,
    }
  }, 1000)
}

function hideTimelineTooltip() {
  clearTimelineTooltipTimer()
  timelineTooltip.value.visible = false
}

function resetTimelineScopeDetailState() {
  timelineScopeDetail.value = null
  timelineScopeDetailPending.value = false
  timelineScopeDetailError.value = ''
  timelineGovernanceSettingsDraft.value = {}
  timelineGovernanceError.value = ''
  timelineGovernanceNotice.value = ''
}

async function fetchTimelineScopeDetail(scope: SelectedTimelineRowState | null) {
  if (!scope?.scopeType || !scope.scopeId) {
    resetTimelineScopeDetailState()
    return
  }

  const preserveCurrentDetail = Boolean(
    timelineScopeDetail.value
    && timelineScopeDetail.value.scope.scopeType === scope.scopeType
    && timelineScopeDetail.value.scope.scopeId === scope.scopeId,
  )

  const requestId = timelineScopeDetailRequestId.value + 1
  timelineScopeDetailRequestId.value = requestId
  timelineScopeDetailPending.value = true
  timelineScopeDetailError.value = ''

  if (!preserveCurrentDetail) {
    timelineScopeDetail.value = null
    timelineGovernanceSettingsDraft.value = {}
    timelineGovernanceError.value = ''
    timelineGovernanceNotice.value = ''
  }

  try {
    const detail = await $fetch<ProjectScopeDetailBundle>(`/api/projects/${props.slug}/coordination/scopes/${scope.scopeType}/${encodeURIComponent(scope.scopeId)}`)

    if (timelineScopeDetailRequestId.value !== requestId) {
      return
    }

    timelineScopeDetail.value = detail
  } catch {
    if (timelineScopeDetailRequestId.value !== requestId) {
      return
    }

    if (!preserveCurrentDetail) {
      timelineScopeDetail.value = null
    }
    timelineScopeDetailError.value = 'Не удалось загрузить детали контура проекта.'
  } finally {
    if (timelineScopeDetailRequestId.value === requestId) {
      timelineScopeDetailPending.value = false
    }
  }
}

async function openSelectedTimelineScope(scope: SelectedTimelineRowState) {
  hideTimelineTooltip()
  if (activeModule.value !== 'timeline') {
    activeModule.value = 'timeline'
  }

  selectedTimelineRowState.value = scope
  void fetchTimelineScopeDetail(scope)

  if (import.meta.client && typeof window !== 'undefined' && window.innerWidth >= 1180) return
  await scrollTimelineDetailModalIntoView()
}

async function openTimelineRowDetails(row: HybridTimelineRow) {
  await openSelectedTimelineScope(buildSelectedTimelineScopeState(row))
}

async function openProjectScopeDetails() {
  await openSelectedTimelineScope(buildProjectScopeState())
}

async function openTaskScopeDetails(taskId?: string, sprintId?: string) {
  if (!taskId) return
  const scope = buildTaskScopeState(taskId, sprintId)
  if (!scope) return
  await openSelectedTimelineScope(scope)
}

function closeTimelineRowDetails() {
  hideTimelineTooltip()
  timelineScopeDetailRequestId.value += 1
  resetTimelineScopeDetailState()
  selectedTimelineRowState.value = null
}
</script>

<style scoped src="./AdminProjectControl.scoped.css"></style>
