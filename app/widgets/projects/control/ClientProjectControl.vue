<template>
  <div class="cpc-root">
    <div class="cpc-hero cpc-shell">
      <div>
        <p class="cpc-eyebrow">Контроль проекта</p>
        <h2 class="cpc-title">Как проект ведётся и где находится сейчас</h2>
      </div>
      <div class="cpc-hero__actions">
        <span class="cpc-pill" :class="`cpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
        <GlassButton variant="secondary" density="compact" type="button" @click="openProjectScopeDetails">
          контур проекта
        </GlassButton>
      </div>
    </div>

    <ClientControlSummaryCards :summary="summary" :next-review-date="control.nextReviewDate" />

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Агенты менеджмента</div>
          <div class="cpc-section__meta">Кто следит за ритмом и правильной коммуникацией</div>
        </div>
      </div>

      <div class="cpc-agent-list">
        <div v-for="agent in coordinationBrief.agents.filter((item: any) => item.enabled)" :key="agent.id" class="cpc-agent-card">
          <div>
            <div class="cpc-phase-row__title">{{ agent.title }}</div>
            <div class="cpc-phase-row__meta">{{ agent.mission || agent.linkedChannelLabel }}</div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip">{{ agent.roleLabel }}</span>
            <span class="cpc-chip">{{ agent.recommendedActionCount }} действий</span>
          </div>
        </div>
      </div>

      <div class="cpc-subsection">
        <div class="cpc-section__meta">Протоколы handoff, approval и эскалации</div>
        <div class="cpc-playbook-list">
          <div v-for="rule in coordinationBrief.playbook" :key="rule.id" class="cpc-playbook-card">
            <div>
              <div class="cpc-phase-row__title">{{ rule.title }}</div>
              <div class="cpc-phase-row__meta">{{ rule.trigger }}</div>
              <div v-if="rule.template" class="cpc-playbook-template">{{ rule.template }}</div>
              <div class="cpc-playbook-audience">
                <span v-for="label in rule.audienceLabels" :key="`${rule.id}-${label}`" class="cpc-chip">{{ label }}</span>
              </div>
            </div>
            <div class="cpc-phase-row__right">
              <span class="cpc-chip">{{ rule.linkedChannelLabel }}</span>
              <span class="cpc-chip">{{ rule.ownerAgentTitle }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="cpc-recommendation-list">
        <div v-for="recommendation in coordinationBrief.recommendations" :key="recommendation.id" class="cpc-recommendation-card">
          <div>
            <div class="cpc-phase-row__title">{{ recommendation.title }}</div>
            <div class="cpc-phase-row__meta">{{ recommendation.reason }}</div>
            <div class="cpc-recommendation-text">{{ recommendation.suggestedMessage }}</div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip">{{ recommendation.ownerAgentTitle }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Инсайты после звонков</div>
          <div class="cpc-section__meta">Что из созвонов уже превратилось в решения, шаги и блокеры проекта</div>
        </div>
      </div>

      <div v-if="control.callInsights.length" class="cpc-call-insight-list">
        <div v-for="insight in control.callInsights" :key="insight.id" class="cpc-call-insight-card">
          <div>
            <div class="cpc-phase-row__title">{{ insight.title }}</div>
            <div class="cpc-phase-row__meta">{{ formatCallInsightDate(insight.happenedAt || insight.createdAt) }}<span v-if="getCallInsightActorLabel(insight)"> · {{ getCallInsightActorLabel(insight) }}</span></div>
            <div class="cpc-recommendation-text">{{ insight.summary }}</div>
            <div v-if="insight.decisions.length" class="cpc-playbook-audience">
              <span v-for="item in insight.decisions" :key="`${insight.id}-decision-${item}`" class="cpc-chip">{{ item }}</span>
            </div>
            <div v-if="insight.nextSteps.length" class="cpc-call-insight-listing">
              <div v-for="item in insight.nextSteps" :key="`${insight.id}-next-${item}`" class="cpc-phase-row__meta">{{ item }}</div>
            </div>
            <div v-if="insight.blockers.length" class="cpc-call-insight-listing">
              <div v-for="item in insight.blockers" :key="`${insight.id}-blocker-${item}`" class="cpc-phase-row__meta">Блокер: {{ item }}</div>
            </div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip" :class="`cpc-chip--${insight.tone}`">{{ getHealthTone(insight.tone) }}</span>
            <span v-if="insight.relatedPhaseKey" class="cpc-chip">{{ getPhaseTitleByKey(insight.relatedPhaseKey) }}</span>
            <span v-if="insight.appliedTaskIds?.length" class="cpc-chip">задач: {{ insight.appliedTaskIds.length }}</span>
            <GlassButton
              v-if="insight.appliedTaskIds?.length"
              variant="secondary"
              density="compact"
              type="button"
              @click="openCallInsightTasks(insight)"
            >
              к задачам
            </GlassButton>
          </div>
        </div>
      </div>
      <div v-else class="cpc-empty">Нет звонков</div>
    </section>

    <section class="cpc-section cpc-section--timeline">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">План-график проекта</div>
          <div class="cpc-section__meta">Фазы и спринты на одной временной шкале</div>
        </div>
        <div class="cpc-section__tools">
          <div class="cpc-scale-switch" role="tablist" aria-label="Масштаб таймлайна">
            <GlassButton
              v-for="option in timelineScaleOptions"
              :key="option"
              variant="secondary"
              density="compact"
              type="button"
              class="cpc-scale-switch__btn"
              :class="{ 'cpc-scale-switch__btn--active': timelineScale === option }"
              @click="timelineScale = option"
            >
              {{ getTimelineScaleLabel(option) }}
            </GlassButton>
          </div>
          <GlassButton
            v-if="hasCollapsibleTimelinePhases"
            variant="secondary"
            density="compact"
            type="button"
            class="cpc-scale-switch__btn"
            @click="toggleAllTimelinePhases"
          >
            {{ allTimelinePhasesCollapsed ? 'раскрыть все фазы' : 'свернуть все фазы' }}
          </GlassButton>
        </div>
      </div>

      <div class="cpc-phase-overview cpc-phase-overview--timeline">
        <article v-for="stat in timelineStats" :key="stat.label" class="cpc-phase-stat">
          <span class="cpc-phase-stat__label">{{ stat.label }}</span>
          <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
        </article>
      </div>

      <div class="cpc-timeline-content" :class="{ 'cpc-timeline-content--details': !!selectedTimelineRowDetails }">
        <div class="cpc-board-card">
          <div class="cpc-board-wrap">
            <div class="cpc-board" :style="timelineBoardStyle">
              <div class="cpc-board__head">
                <div class="cpc-board__cell cpc-board__cell--entity">Слой</div>
                <div class="cpc-board__cell cpc-board__cell--period">Период</div>
                <div class="cpc-board__timeline-head-stack">
                  <div class="cpc-board__timeline-groups" :style="timelineGridStyle">
                    <div
                      v-for="group in timelineGroups"
                      :key="group.key"
                      class="cpc-board__timeline-group-label"
                      :style="{ gridColumn: `span ${group.span}` }"
                    >
                      <span>{{ group.label }}</span>
                    </div>
                  </div>
                  <div class="cpc-board__timeline-head" :style="timelineGridStyle">
                    <div
                      v-for="column in timelineColumns"
                      :key="column.key"
                      class="cpc-board__week-label"
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
                class="cpc-board__row"
                :class="{ 'cpc-board__row--phase': row.type === 'phase' }"
              >
                <div class="cpc-board__cell cpc-board__cell--entity cpc-board__entity">
                  <div class="cpc-board__entity-body">
                    <div class="cpc-board__entity-top">
                      <span class="cpc-board__type">{{ row.typeLabel }}</span>
                      <span class="cpc-chip" :class="`cpc-chip--${row.tone}`">{{ row.statusLabel }}</span>
                      <button
                        v-if="row.type === 'phase' && getTimelinePhaseSprintCount(row.phaseKey)"
                        type="button"
                        class="cpc-board__toggle"
                        @click="toggleTimelinePhase(row.phaseKey)"
                      >
                        {{ isTimelinePhaseCollapsed(row.phaseKey) ? `показать ${getTimelinePhaseSprintCount(row.phaseKey)}` : `свернуть ${getTimelinePhaseSprintCount(row.phaseKey)}` }}
                      </button>
                    </div>
                    <button class="cpc-board__title-btn" type="button" @click="openTimelineRowDetails(row)">
                      <span class="cpc-board__title">{{ row.title }}</span>
                    </button>
                    <div class="cpc-board__meta-line">{{ row.meta }}</div>
                  </div>
                </div>

                <div class="cpc-board__cell cpc-board__cell--period cpc-board__period">
                  <span>{{ formatDateRange(row.startDate, row.endDate) }}</span>
                  <strong>{{ row.progressLabel }}</strong>
                </div>

                <div class="cpc-board__timeline">
                  <div class="cpc-board__weeks" :style="timelineGridStyle">
                    <div
                      v-for="column in timelineColumns"
                      :key="`${row.id}-${column.key}`"
                      class="cpc-board__week"
                    />
                  </div>
                  <div
                    class="cpc-board__bar"
                    :class="[
                      `cpc-board__bar--${row.tone}`,
                      { 'cpc-board__bar--active': isTimelineRowSelected(row) },
                    ]"
                    :style="getTimelineBarStyle(row)"
                  >
                    <button
                      class="cpc-board__bar-body"
                      type="button"
                      :aria-label="`Открыть детали ${row.title}`"
                      @click.stop="openTimelineRowDetails(row)"
                    >
                      <span class="cpc-board__bar-label">{{ row.title }}</span>
                      <span class="cpc-board__bar-meta">{{ row.progressLabel }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section v-if="selectedTimelineRowDetails" class="cpc-timeline-details-panel">
          <div class="cpc-timeline-details-panel__head">
            <div class="cpc-timeline-details-panel__title-wrap">
              <p class="cpc-timeline-details-panel__eyebrow">{{ selectedTimelineRowDetails.typeLabel }}</p>
              <h3 class="cpc-section__title cpc-timeline-details-panel__title">{{ selectedTimelineRowDetails.title }}</h3>
              <p class="cpc-section__meta">{{ selectedTimelineRowDetails.meta }}</p>
            </div>
            <GlassButton variant="secondary" density="compact" type="button" @click="closeTimelineRowDetails">закрыть</GlassButton>
          </div>

          <div v-if="selectedTimelineDetailCards.length" class="cpc-timeline-detail-grid">
            <article v-for="card in selectedTimelineDetailCards" :key="card.label" class="cpc-timeline-detail-card">
              <span class="cpc-timeline-detail-card__label">{{ card.label }}</span>
              <strong class="cpc-timeline-detail-card__value">{{ card.value }}</strong>
            </article>
          </div>

          <p v-if="timelineScopeDetailPending" class="cpc-timeline-empty">Загружаю детали контура…</p>
          <p v-else-if="timelineScopeDetailError" class="cpc-timeline-empty cpc-timeline-empty--error">{{ timelineScopeDetailError }}</p>

          <div class="cpc-timeline-clusters">
            <section class="cpc-timeline-cluster">
              <div class="cpc-timeline-cluster__head">
                <p class="cpc-phase-field__label">Субъекты</p>
                <span class="cpc-chip">{{ timelineDetailSubjects.length }}</span>
              </div>
              <div v-if="timelineDetailSubjects.length" class="cpc-timeline-cluster__list">
                <article v-for="item in timelineDetailSubjects" :key="item.key" class="cpc-timeline-cluster__item">
                  <span class="cpc-timeline-cluster__label">{{ item.label }}</span>
                  <strong class="cpc-timeline-cluster__value">{{ item.value }}</strong>
                </article>
              </div>
              <p v-else class="cpc-timeline-empty">Связанные участники пока не назначены.</p>
            </section>

            <section class="cpc-timeline-cluster">
              <div class="cpc-timeline-cluster__head">
                <p class="cpc-phase-field__label">Объекты</p>
                <span class="cpc-chip">{{ timelineDetailObjects.length }}</span>
              </div>
              <div v-if="timelineDetailObjects.length" class="cpc-timeline-cluster__list">
                <article v-for="item in timelineDetailObjects" :key="item.key" class="cpc-timeline-cluster__item">
                  <span class="cpc-timeline-cluster__label">{{ item.label }}</span>
                  <strong class="cpc-timeline-cluster__value">{{ item.value }}</strong>
                </article>
              </div>
              <p v-else class="cpc-timeline-empty">Связанные объекты еще не описаны.</p>
            </section>

            <section class="cpc-timeline-cluster">
              <div class="cpc-timeline-cluster__head">
                <p class="cpc-phase-field__label">Настройки</p>
                <span class="cpc-chip">{{ timelineDetailSettings.length }}</span>
              </div>
              <div v-if="timelineDetailSettings.length" class="cpc-timeline-cluster__list">
                <article v-for="item in timelineDetailSettings" :key="item.key" class="cpc-timeline-cluster__item">
                  <span class="cpc-timeline-cluster__label">{{ item.label }}</span>
                  <strong class="cpc-timeline-cluster__value">{{ item.value }}</strong>
                </article>
              </div>
              <p v-else class="cpc-timeline-empty">Для этого контура дополнительные настройки пока не заданы.</p>
            </section>

            <section v-if="clientEditableScopeSettings.length" class="cpc-timeline-cluster cpc-timeline-cluster--actions">
              <div class="cpc-timeline-cluster__head">
                <p class="cpc-phase-field__label">Настройки клиента</p>
                <span class="cpc-chip">{{ clientEditableScopeSettings.length }}</span>
              </div>
              <div class="cpc-timeline-cluster__list cpc-timeline-governance-settings">
                <article v-for="field in clientEditableScopeSettings" :key="field.key" class="cpc-timeline-cluster__item">
                  <span class="cpc-timeline-cluster__label">{{ field.label }}</span>

                  <select
                    v-if="field.kind === 'select'"
                    class="glass-input"
                    :value="field.value == null ? '' : String(field.value)"
                    :disabled="timelineScopeMutationPending"
                    @change="handleClientScopeSelectSettingChange(field.key, $event)"
                  >
                    <option v-for="option in field.items || []" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>

                  <label v-else-if="field.kind === 'boolean'" class="cpc-timeline-governance-toggle">
                    <input
                      :checked="Boolean(field.value)"
                      type="checkbox"
                      :disabled="timelineScopeMutationPending"
                      @change="handleClientScopeBooleanSettingChange(field.key, $event)"
                    />
                    <span>{{ Boolean(field.value) ? 'Включено' : 'Выключено' }}</span>
                  </label>

                  <input
                    v-else
                    class="glass-input"
                    :type="field.kind === 'number' ? 'number' : 'text'"
                    :value="field.value == null ? '' : String(field.value)"
                    :disabled="timelineScopeMutationPending"
                    @input="handleClientScopeTextSettingInput(field.key, field.kind, $event)"
                    @blur="commitClientScopeSettings()"
                  />

                  <strong class="cpc-timeline-cluster__value">{{ field.kind === 'list' ? 'Список через запятую' : 'Изменения отправляются сразу' }}</strong>
                </article>
              </div>
              <p v-if="timelineScopeMutationError" class="cpc-timeline-empty cpc-timeline-empty--error">{{ timelineScopeMutationError }}</p>
              <p v-else-if="timelineScopeMutationNotice" class="cpc-phase-row__meta">{{ timelineScopeMutationNotice }}</p>
            </section>

            <section class="cpc-timeline-cluster">
              <div class="cpc-timeline-cluster__head">
                <p class="cpc-phase-field__label">Связанные контуры</p>
                <span class="cpc-chip">{{ timelineDetailLinkedScopes.length }}</span>
              </div>
              <div v-if="timelineDetailLinkedScopes.length" class="cpc-timeline-cluster__list">
                <article v-for="item in timelineDetailLinkedScopes" :key="item.key" class="cpc-timeline-cluster__item">
                  <span class="cpc-timeline-cluster__label">{{ item.label }}</span>
                  <strong class="cpc-timeline-cluster__value">{{ item.value }}</strong>
                </article>
              </div>
              <p v-else class="cpc-timeline-empty">Связанные контуры пока не определены.</p>
            </section>

            <section class="cpc-timeline-cluster cpc-timeline-cluster--actions">
              <div class="cpc-timeline-cluster__head">
                <p class="cpc-phase-field__label">Действия</p>
                <span class="cpc-chip">{{ timelineDetailActions.length }}</span>
              </div>
              <ul v-if="timelineDetailActions.length" class="cpc-timeline-action-list">
                <li v-for="item in timelineDetailActions" :key="item.key" class="cpc-timeline-action-item">
                  <span class="cpc-timeline-action-item__title">{{ item.label }}</span>
                  <span class="cpc-timeline-action-item__meta">{{ item.value }}</span>
                </li>
              </ul>
              <p v-else class="cpc-timeline-empty">Следующие действия пока не сформированы.</p>
            </section>
          </div>

          <div class="cpc-timeline-meta">
            <p class="cpc-phase-field__label">Контур коммуникации</p>
            <div v-if="timelineDetailRules.length" class="cpc-timeline-rule-list">
              <article v-for="rule in timelineDetailRules" :key="rule.id" class="cpc-timeline-rule-card">
                <div class="cpc-timeline-rule-card__head">
                  <strong class="cpc-timeline-rule-card__title">{{ rule.title }}</strong>
                  <span class="cpc-chip">{{ rule.channel }}</span>
                </div>
                <p class="cpc-timeline-rule-card__copy">{{ rule.trigger }}</p>
                <p class="cpc-timeline-rule-card__meta">{{ rule.audience }}</p>
              </article>
            </div>
            <p v-else class="cpc-timeline-empty">Для этого контура нет отдельного правила коммуникации.</p>
          </div>

          <div v-if="timelineDetailTasks.length" class="cpc-timeline-meta">
            <p class="cpc-phase-field__label">Задачи спринта</p>
            <ul class="cpc-timeline-task-list">
              <li v-for="task in timelineDetailTasks" :key="task.id" class="cpc-timeline-task-item">
                <div>
                  <strong class="cpc-timeline-task-item__title">{{ task.title }}</strong>
                  <span class="cpc-timeline-task-item__meta">{{ task.meta }}</span>
                </div>
                <div class="cpc-timeline-task-item__actions">
                  <GlassButton variant="secondary" density="compact" type="button" @click="openTaskScopeDetails(task.scopeId, task.sprintId)">контур</GlassButton>
                  <GlassButton variant="secondary" density="compact" type="button" @click="openTimelineTask(task.id, task.sprintId)">к задаче</GlassButton>
                </div>
              </li>
            </ul>
          </div>

          <div class="cpc-timeline-actions">
            <GlassButton
              v-if="selectedTimelineRowDetails.type === 'phase'"
              variant="secondary"
              density="compact"
              type="button"
              @click="openTimelinePhase(selectedTimelineRowDetails.id)"
            >
              к фазе
            </GlassButton>
            <GlassButton
              v-if="selectedTimelineRowDetails.type === 'sprint'"
              variant="secondary"
              density="compact"
              type="button"
              @click="openTimelineSprint(selectedTimelineRowDetails.id)"
            >
              к спринту
            </GlassButton>
            <GlassButton
              v-if="selectedTimelineRowDetails.scopeType === 'task'"
              variant="secondary"
              density="compact"
              type="button"
              @click="openTimelineTask(selectedTimelineRowDetails.id, selectedTimelineTaskSprintId)"
            >
              к задаче
            </GlassButton>
          </div>
        </section>
      </div>
    </section>

    <ClientControlPhasesSection :phases="control.phases" :phase-stats="phaseStats" />

    <section v-if="control.sprints.length" class="cpc-section cpc-section--sprints">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Активные циклы исполнения</div>
          <div class="cpc-section__meta">Спринтовый слой и текущий канбан выбранного спринта</div>
        </div>
      </div>

      <div class="cpc-phase-overview cpc-phase-overview--sprints">
        <article v-for="stat in sprintStats" :key="stat.label" class="cpc-phase-stat">
          <span class="cpc-phase-stat__label">{{ stat.label }}</span>
          <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
        </article>
      </div>

      <div class="cpc-sprint-shell">
        <div class="cpc-sprint-list cpc-sprint-list--cards">
          <article
            v-for="sprint in control.sprints"
            :key="sprint.id"
            class="cpc-sprint-card"
            :class="{ 'cpc-sprint-card--active': isSelectedSprint(sprint) }"
            :data-sprint-id="sprint.id"
          >
            <div class="cpc-sprint-card__head">
              <div>
                <div class="cpc-phase-row__title">{{ sprint.name }}</div>
                <div class="cpc-phase-row__meta">{{ sprint.linkedPhaseKey ? getPhaseTitleByKey(sprint.linkedPhaseKey) : 'Без фазы' }}</div>
              </div>
              <div class="cpc-phase-row__right">
                <span class="cpc-chip" :class="`cpc-chip--${sprint.status}`">{{ sprintStatusLabels[sprint.status] }}</span>
                <span class="cpc-chip">{{ getSprintCompletionLabel(sprint) }}</span>
              </div>
            </div>

            <div class="cpc-sprint-card__body">
              <div class="cpc-phase-field">
                <span class="cpc-phase-field__label">Цель</span>
                <strong class="cpc-phase-field__value">{{ sprint.goal || 'Цель пока не зафиксирована' }}</strong>
              </div>
              <div class="cpc-phase-field">
                <span class="cpc-phase-field__label">Фокус</span>
                <strong class="cpc-phase-field__value">{{ sprint.focus || 'Фокус не заполнен' }}</strong>
              </div>
              <div class="cpc-phase-field">
                <span class="cpc-phase-field__label">Период</span>
                <strong class="cpc-phase-field__value">{{ formatDateRange(sprint.startDate, sprint.endDate) }}</strong>
              </div>
            </div>

            <div class="cpc-sprint-card__foot">
              <span class="cpc-phase-row__meta">{{ sprint.tasks.length }} задач в спринте</span>
              <GlassButton variant="secondary" density="compact" type="button" @click="focusSprint(sprint.id)">задачи</GlassButton>
            </div>
          </article>
        </div>

        <section
          v-if="selectedSprint"
          ref="sprintDetailRef"
          class="cpc-sprint-detail-card"
          :data-client-sprint-detail-id="selectedSprint.id"
        >
          <div class="cpc-sprint-detail__head">
            <div>
              <p class="cpc-phase-card__kicker">{{ selectedSprintPhaseTitle }}</p>
              <h3 class="cpc-section__title">{{ selectedSprint.name }}</h3>
            </div>
            <div class="cpc-phase-row__right">
              <span class="cpc-chip" :class="`cpc-chip--${selectedSprint.status}`">{{ sprintStatusLabels[selectedSprint.status] }}</span>
              <span class="cpc-chip">{{ selectedSprint.tasks.length }} задач</span>
            </div>
          </div>

          <div class="cpc-phase-overview cpc-phase-overview--detail">
            <article v-for="stat in selectedSprintStats" :key="stat.label" class="cpc-phase-stat">
              <span class="cpc-phase-stat__label">{{ stat.label }}</span>
              <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
            </article>
          </div>

          <div class="cpc-sprint-detail__grid">
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Цель</span>
              <strong class="cpc-phase-field__value">{{ selectedSprint.goal || 'Цель пока не описана' }}</strong>
            </div>
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Фокус</span>
              <strong class="cpc-phase-field__value">{{ selectedSprint.focus || 'Фокус команды не заполнен' }}</strong>
            </div>
            <div class="cpc-phase-field cpc-phase-field--full">
              <span class="cpc-phase-field__label">Ретроспектива</span>
              <strong class="cpc-phase-field__value">{{ selectedSprint.retrospective || 'Ретроспектива ещё не добавлена' }}</strong>
            </div>
          </div>

          <div class="cpc-sprint-board">
            <section v-for="column in selectedSprintColumns" :key="column.status" class="cpc-sprint-column">
              <div class="cpc-sprint-column__head">
                <span>{{ column.label }}</span>
                <strong>{{ column.tasks.length }}</strong>
              </div>

              <div v-if="column.tasks.length" class="cpc-task-list cpc-task-list--board">
                <article
                  v-for="task in column.tasks"
                  :key="task.id"
                  class="cpc-task-card"
                  :class="{ 'cpc-task-card--active': isSelectedTask(task) }"
                  :data-client-task-id="task.id"
                  tabindex="0"
                  @click="selectTask(task.id, selectedSprint.id)"
                  @keydown.enter.prevent="selectTask(task.id, selectedSprint.id)"
                  @keydown.space.prevent="selectTask(task.id, selectedSprint.id)"
                >
                  <div class="cpc-task-card__top">
                    <div class="cpc-phase-row__title">{{ task.title }}</div>
                    <span class="cpc-chip">{{ task.points || 0 }} pt</span>
                  </div>
                  <div class="cpc-task-card__meta">
                    <span>{{ task.assignee || 'без исполнителя' }}</span>
                    <span>{{ formatTaskDueDate(task.dueDate) }}</span>
                  </div>
                  <div v-if="task.notes" class="cpc-task-card__note">{{ task.notes }}</div>
                </article>
              </div>
              <div v-else class="cpc-empty cpc-empty--inline">нет задач</div>
            </section>
          </div>

          <section v-if="selectedTask" class="cpc-sprint-detail-card cpc-task-detail-card">
            <div class="cpc-sprint-detail__head">
              <div>
                <p class="cpc-phase-card__kicker">{{ taskStatusLabels[selectedTask.status] }}</p>
                <h3 class="cpc-section__title">{{ selectedTask.title }}</h3>
              </div>
              <div class="cpc-phase-row__right">
                <span class="cpc-chip">{{ selectedSprint?.name || 'Спринт' }}</span>
                <span class="cpc-chip">{{ selectedTask.points || 0 }} pt</span>
                <GlassButton variant="secondary" density="compact" type="button" @click="openTaskScopeDetails(selectedTask.id, selectedSprint?.id)">контур задачи</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button" @click="clearTaskFocus">снять фокус</GlassButton>
              </div>
            </div>

            <div class="cpc-phase-overview cpc-phase-overview--detail">
              <article v-for="stat in selectedTaskStats" :key="stat.label" class="cpc-phase-stat">
                <span class="cpc-phase-stat__label">{{ stat.label }}</span>
                <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
              </article>
            </div>

            <div class="cpc-sprint-detail__grid">
              <div class="cpc-phase-field">
                <span class="cpc-phase-field__label">Контур</span>
                <strong class="cpc-phase-field__value">{{ selectedSprint?.name || 'Без спринта' }} · {{ selectedSprintPhaseTitle }}</strong>
              </div>
              <div class="cpc-phase-field cpc-phase-field--full">
                <span class="cpc-phase-field__label">Заметки</span>
                <strong class="cpc-phase-field__value">{{ selectedTask.notes || 'Комментарий к задаче пока не добавлен' }}</strong>
              </div>
            </div>
          </section>
        </section>
      </div>
    </section>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Контрольные точки</div>
          <div class="cpc-section__meta">Состояние проекта</div>
        </div>
      </div>
      <div class="cpc-checkpoint-list">
        <div v-for="checkpoint in control.checkpoints" :key="checkpoint.id" class="cpc-checkpoint">
          <div>
            <div class="cpc-phase-row__title">{{ checkpoint.title }}</div>
            <div class="cpc-phase-row__meta">{{ checkpoint.note || 'Без комментария' }}</div>
          </div>
          <span class="cpc-chip" :class="`cpc-chip--${checkpoint.status}`">{{ checkpointStatusLabels[checkpoint.status] }}</span>
        </div>
      </div>
    </section>

    <ClientControlBlockersSection :blockers="control.blockers" />
  </div>
</template>

<script setup lang="ts">
import { buildHybridControlSummary, buildHybridCoordinationBrief, ensureHybridControl, getHealthTone, getHybridStakeholderRoleLabel } from '~~/shared/utils/project-control'
import {
  buildHybridTimelineBounds,
  buildHybridTimelineColumns,
  buildHybridTimelineGroups,
  buildHybridTimelineRows,
  formatHybridTimelineDateRange,
  getHybridTimelineBarStyle,
  getHybridTimelineColumnWidth,
  getHybridTimelineScaleLabel,
  toIsoLocalDate,
  type HybridTimelineRow,
  type HybridTimelineScale,
} from '~~/shared/utils/project-control-timeline'
import type { HybridControlCallInsight, HybridControlCheckpoint, HybridControlPhase, HybridControlSprint, HybridControlTask } from '~~/shared/types/project'
import type { ProjectScopeDetailBundle, ProjectScopeType } from '~~/shared/types/project-governance'
import { getProjectScopeEditableSettingKeys } from '~~/shared/utils/project-governance'

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

type SelectedTimelineScopeState = {
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

type ClientScopeSettingFieldKind = 'select' | 'number' | 'boolean' | 'list' | 'text'

const props = defineProps<{ slug: string }>()
const route = useRoute()
const router = useRouter()

const CONTROL_QUERY_SPRINT_KEY = 'controlSprint'
const CONTROL_QUERY_TASK_KEY = 'controlTask'

const { data: project } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const control = computed(() => ensureHybridControl(project.value?.profile?.hybridControl, project.value || {}))
const summary = computed(() => buildHybridControlSummary(control.value))
const coordinationBrief = computed(() => buildHybridCoordinationBrief(control.value, { projectSlug: props.slug }))

const phaseStatusLabels: Record<HybridControlPhase['status'], string> = {
  planned: 'запланирована',
  active: 'в работе',
  blocked: 'заблокирована',
  done: 'завершена',
}

const sprintStatusLabels: Record<HybridControlSprint['status'], string> = {
  planned: 'запланирован',
  active: 'активен',
  review: 'на ревью',
  done: 'завершён',
}

const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}

const checkpointStatusLabels: Record<HybridControlCheckpoint['status'], string> = {
  stable: 'стабильно',
  warning: 'внимание',
  critical: 'критично',
}

const taskStatuses: HybridControlTask['status'][] = ['todo', 'doing', 'review', 'done']
const taskDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
})

const timelineScaleOptions: HybridTimelineScale[] = ['months', 'weeks', 'days', 'hours']
const timelineScale = ref<HybridTimelineScale>('weeks')
const selectedTimelineScopeState = ref<SelectedTimelineScopeState | null>(null)
const timelineScopeDetail = ref<ProjectScopeDetailBundle | null>(null)
const timelineScopeDetailPending = ref(false)
const timelineScopeDetailError = ref('')
const timelineScopeDetailRequestId = ref(0)
const timelineScopeSettingsDraft = ref<Record<string, unknown>>({})
const timelineScopeMutationPending = ref(false)
const timelineScopeMutationError = ref('')
const timelineScopeMutationNotice = ref('')
const selectedSprintId = ref('')
const selectedTaskId = ref('')
const sprintDetailRef = ref<HTMLElement | null>(null)

const clientScopeSelectItems: Record<string, Array<{ label: string; value: string }>> = {
  approvalMode: [
    { label: 'Через лида проекта', value: 'project-lead' },
    { label: 'Через владельца фазы', value: 'phase-owner' },
    { label: 'Через ревью спринта', value: 'sprint-review' },
    { label: 'Через ревью задачи', value: 'task-review' },
    { label: 'Через согласование документа', value: 'document-approval' },
    { label: 'Через согласование услуги', value: 'service-request' },
  ],
  visibility: [
    { label: 'Команда проекта', value: 'team' },
    { label: 'Только участники контура', value: 'assigned-only' },
  ],
  acceptanceMode: [
    { label: 'Явное подтверждение', value: 'explicit' },
    { label: 'Без отдельного подтверждения', value: 'implicit' },
  ],
}

let syncingControlStateFromRoute = false

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
  selectedSprintId.value = parseControlSprintQuery(route.query[CONTROL_QUERY_SPRINT_KEY])
  selectedTaskId.value = parseControlTaskQuery(route.query[CONTROL_QUERY_TASK_KEY])
  syncingControlStateFromRoute = false
}

async function syncControlStateToRoute() {
  if (syncingControlStateFromRoute) return

  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>

  if (selectedSprintId.value) nextQuery[CONTROL_QUERY_SPRINT_KEY] = selectedSprintId.value
  else delete nextQuery[CONTROL_QUERY_SPRINT_KEY]

  if (selectedTaskId.value) nextQuery[CONTROL_QUERY_TASK_KEY] = selectedTaskId.value
  else delete nextQuery[CONTROL_QUERY_TASK_KEY]

  const currentSprint = Array.isArray(route.query[CONTROL_QUERY_SPRINT_KEY]) ? route.query[CONTROL_QUERY_SPRINT_KEY][0] : route.query[CONTROL_QUERY_SPRINT_KEY]
  const currentTask = Array.isArray(route.query[CONTROL_QUERY_TASK_KEY]) ? route.query[CONTROL_QUERY_TASK_KEY][0] : route.query[CONTROL_QUERY_TASK_KEY]
  const nextSprint = typeof nextQuery[CONTROL_QUERY_SPRINT_KEY] === 'string' ? nextQuery[CONTROL_QUERY_SPRINT_KEY] : undefined
  const nextTask = typeof nextQuery[CONTROL_QUERY_TASK_KEY] === 'string' ? nextQuery[CONTROL_QUERY_TASK_KEY] : undefined

  if (currentSprint === nextSprint && currentTask === nextTask) return
  await router.replace({ query: nextQuery })
}

const timelineRows = computed(() => buildHybridTimelineRows(control.value))

const timelineCollapsedPhases = reactive<Record<string, boolean>>({})

watch(() => control.value.phases.map(phase => phase.phaseKey), (phaseKeys) => {
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

const timelineSprintCountByPhase = computed(() => control.value.sprints.reduce<Record<string, number>>((acc, sprint) => {
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

const timelineBoardStyle = computed(() => ({
  '--cpc-entity-column-width': '240px',
  '--cpc-period-column-width': '170px',
  minWidth: `${410 + (timelineColumns.value.length * getHybridTimelineColumnWidth(timelineScale.value))}px`,
}))

const timelineWindowLabel = computed(() => `${toIsoLocalDate(timelineBounds.value.start)} - ${toIsoLocalDate(timelineBounds.value.end)}`)

const timelineStats = computed(() => ([
  { label: 'Период', value: timelineWindowLabel.value },
  { label: 'Строк в таблице', value: `${visibleTimelineRows.value.length}` },
  { label: 'Фаз', value: `${control.value.phases.length}` },
  { label: 'Спринтов', value: `${control.value.sprints.length}` },
]))

const selectedTimelineRowDetails = computed<SelectedTimelineScopeState | null>(() => selectedTimelineScopeState.value)

const selectedTimelinePhase = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected || selected.scopeType !== 'phase') return null
  return getPhaseById(selected.id) || control.value.phases.find(phase => phase.phaseKey === selected.phaseKey) || null
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

  return coordinationBrief.value.playbook.slice(0, 4).map(rule => ({
    id: rule.id,
    title: rule.title,
    channel: rule.linkedChannelLabel,
    trigger: rule.trigger,
    audience: rule.audienceLabels.length
      ? rule.audienceLabels.join(' · ')
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
    coordinationBrief.value.playbook.flatMap(rule => rule.audienceLabels),
  ))

  if (selected.type === 'phase') {
    const phase = selectedTimelinePhase.value
    const linkedSprints = control.value.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
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
    const linkedSprints = control.value.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
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

    const checkpointActions = control.value.checkpoints.slice(0, 2).map(checkpoint => ({
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

  const projectBlockers = control.value.blockers.slice(0, 2).map((blocker, index) => ({
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

const clientEditableScopeSettings = computed(() => {
  const detail = timelineScopeDetail.value
  if (!detail) {
    return [] as Array<{
      key: string
      label: string
      kind: ClientScopeSettingFieldKind
      value: string | number | boolean | null
      items?: Array<{ label: string; value: string }>
    }>
  }

  const labelMap = new Map(detail.settingItems.map(item => [item.key, item.label]))
  const allowedKeys = getProjectScopeEditableSettingKeys(detail.scope.scopeType, 'client')

  return allowedKeys
    .filter(key => key in timelineScopeSettingsDraft.value)
    .map((key) => {
      const rawValue = timelineScopeSettingsDraft.value[key]

      if (key in clientScopeSelectItems) {
        return {
          key,
          label: labelMap.get(key) || key,
          kind: 'select' as const,
          value: typeof rawValue === 'string' ? rawValue : '',
          items: clientScopeSelectItems[key],
        }
      }

      if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
        return {
          key,
          label: labelMap.get(key) || key,
          kind: 'number' as const,
          value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue),
        }
      }

      if (key === 'escalateOnBlocked') {
        return {
          key,
          label: labelMap.get(key) || key,
          kind: 'boolean' as const,
          value: Boolean(rawValue),
        }
      }

      if (key === 'requiredResponsibilities') {
        return {
          key,
          label: labelMap.get(key) || key,
          kind: 'list' as const,
          value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '',
        }
      }

      return {
        key,
        label: labelMap.get(key) || key,
        kind: 'text' as const,
        value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue),
      }
    })
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

const phaseGateStats = computed(() => control.value.phases.reduce((acc, phase) => {
  acc.total += phase.gates.length
  acc.done += phase.gates.filter(gate => gate.done).length
  return acc
}, { done: 0, total: 0 }))

const sprintTaskStats = computed(() => control.value.sprints.reduce((acc, sprint) => {
  acc.total += sprint.tasks.length
  acc.done += sprint.tasks.filter(task => task.status === 'done').length
  acc.active += sprint.tasks.filter(task => task.status === 'doing' || task.status === 'review').length
  return acc
}, { done: 0, total: 0, active: 0 }))

const phaseStats = computed(() => ([
  { label: 'Фаз', value: `${control.value.phases.length}` },
  { label: 'Активных', value: `${control.value.phases.filter(phase => phase.status === 'active').length}` },
  { label: 'Гейтов', value: phaseGateStats.value.total ? `${phaseGateStats.value.done}/${phaseGateStats.value.total}` : '0' },
  { label: 'Завершено', value: `${control.value.phases.filter(phase => phase.status === 'done').length}` },
]))

const sprintStats = computed(() => ([
  { label: 'Спринтов', value: `${control.value.sprints.length}` },
  { label: 'Активных', value: `${control.value.sprints.filter(sprint => sprint.status === 'active').length}` },
  { label: 'Задач', value: `${sprintTaskStats.value.total}` },
  { label: 'Готово', value: sprintTaskStats.value.total ? `${sprintTaskStats.value.done}/${sprintTaskStats.value.total}` : '0' },
]))

const selectedTask = computed(() => {
  const taskId = selectedTaskId.value
  if (!taskId) return null
  return control.value.sprints.flatMap(sprint => sprint.tasks).find(task => task.id === taskId) || null
})

const selectedSprint = computed(() => control.value.sprints.find(sprint => sprint.id === selectedSprintId.value)
  || summary.value.activeSprint
  || control.value.sprints[0]
  || null)

watch(() => route.query[CONTROL_QUERY_SPRINT_KEY], () => {
  readControlStateFromRoute()
}, { immediate: true })

watch(() => route.query[CONTROL_QUERY_TASK_KEY], () => {
  readControlStateFromRoute()
}, { immediate: true })

watch(selectedTaskId, (taskId) => {
  if (taskId) {
    const taskContext = getTaskContext(taskId)
    if (taskContext?.sprint.id && selectedSprintId.value !== taskContext.sprint.id) {
      selectedSprintId.value = taskContext.sprint.id
    }
  }
}, { immediate: true })

watch([selectedSprintId, selectedTaskId], async ([sprintId, taskId]) => {
  await syncControlStateToRoute()

  if (taskId) {
    await scrollClientControlTargetIntoView({ sprintId, taskId })
    return
  }

  if (sprintId) {
    await scrollClientControlTargetIntoView({ sprintId })
  }
}, { immediate: true })

watch(() => control.value.sprints.map(sprint => sprint.id), (sprintIds) => {
  if (selectedSprintId.value && !sprintIds.includes(selectedSprintId.value)) {
    selectedSprintId.value = ''
  }
}, { immediate: true })

watch(() => control.value.sprints.flatMap(sprint => sprint.tasks.map(task => task.id)), (taskIds) => {
  if (selectedTaskId.value && !taskIds.includes(selectedTaskId.value)) {
    selectedTaskId.value = ''
  }

  if (selectedTaskId.value) {
    const taskContext = getTaskContext(selectedTaskId.value)
    if (taskContext?.sprint.id && selectedSprintId.value !== taskContext.sprint.id) {
      selectedSprintId.value = taskContext.sprint.id
    }
  }
}, { immediate: true })

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

function formatDateRange(startDate?: string, endDate?: string) {
  return formatHybridTimelineDateRange(startDate, endDate)
}

function formatTaskDueDate(value?: string) {
  if (!value) return 'без дедлайна'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return taskDateFormatter.format(parsed)
}

function getTimelineBarStyle(row: HybridTimelineRow) {
  return getHybridTimelineBarStyle(row, timelineBounds.value)
}

function getPhaseById(phaseId?: string) {
  if (!phaseId) return null
  return control.value.phases.find(phase => phase.id === phaseId) || null
}

function getSprintById(sprintId?: string) {
  if (!sprintId) return null
  return control.value.sprints.find(sprint => sprint.id === sprintId) || null
}

function getTimelineScaleLabel(scale: HybridTimelineScale) {
  return getHybridTimelineScaleLabel(scale)
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
  const roleLabel = insight.actorRole ? getHybridStakeholderRoleLabel(insight.actorRole) : ''
  const actorName = insight.actorName || ''

  if (roleLabel && actorName) return `${roleLabel}: ${actorName}`
  return actorName || roleLabel
}


function getSprintCompletionLabel(sprint: HybridControlSprint) {
  if (!sprint.tasks.length) return '0/0'
  return `${sprint.tasks.filter(task => task.status === 'done').length}/${sprint.tasks.length}`
}

function getTaskContext(taskId?: string) {
  if (!taskId) return null

  for (const sprint of control.value.sprints) {
    const task = sprint.tasks.find(item => item.id === taskId)
    if (task) {
      return { sprint, task }
    }
  }

  return null
}

async function scrollClientControlTargetIntoView(options: { sprintId?: string, taskId?: string }) {
  if (!import.meta.client || typeof document === 'undefined') return

  await nextTick()

  if (options.taskId) {
    document.querySelector<HTMLElement>(`[data-client-task-id="${options.taskId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  if (options.sprintId) {
    const sprintTarget = sprintDetailRef.value
      || document.querySelector<HTMLElement>(`[data-client-sprint-detail-id="${options.sprintId}"]`)
      || document.querySelector<HTMLElement>(`[data-sprint-id="${options.sprintId}"]`)

    sprintTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function scrollClientPhaseIntoView(phaseId?: string) {
  if (!phaseId || !import.meta.client || typeof document === 'undefined') return

  await nextTick()
  document.querySelector<HTMLElement>(`[data-client-phase-id="${phaseId}"]`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function focusSprint(sprintId?: string) {
  if (!sprintId) return

  selectedSprintId.value = sprintId
  selectedTaskId.value = ''
}

function isSelectedSprint(sprint: HybridControlSprint) {
  return selectedSprint.value?.id === sprint.id
}

function selectTask(taskId?: string, sprintId?: string) {
  if (!taskId) return

  const taskContext = getTaskContext(taskId)
  selectedTaskId.value = taskId
  selectedSprintId.value = sprintId || taskContext?.sprint.id || selectedSprintId.value
}

function isSelectedTask(task: HybridControlTask) {
  return selectedTask.value?.id === task.id
}

function clearTaskFocus() {
  selectedTaskId.value = ''
}

function openCallInsightTasks(insight: HybridControlCallInsight) {
  const taskIds = insight.appliedTaskIds || []
  const relatedSprint = control.value.sprints.find(sprint => sprint.id === insight.appliedSprintId)
    || control.value.sprints.find(sprint => sprint.tasks.some(task => taskIds.includes(task.id)))

  if (taskIds.length === 1) {
    void selectTask(taskIds[0], relatedSprint?.id)
    return
  }

  if (relatedSprint) {
    void focusSprint(relatedSprint.id)
  }
}

function getPhaseTitleByKey(phaseKey?: string) {
  if (!phaseKey) return 'Без привязки'
  return control.value.phases.find(phase => phase.phaseKey === phaseKey)?.title || phaseKey
}

function isTimelineRowSelected(row: HybridTimelineRow) {
  return selectedTimelineRowDetails.value?.scopeId === row.id && selectedTimelineRowDetails.value?.scopeType === row.type
}

function cloneTimelineScopeSettings(settings: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
}

function normalizeTimelineScopeMutationError(error: unknown, fallback: string) {
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

function normalizeClientScopeSettingValue(kind: ClientScopeSettingFieldKind, value: unknown) {
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

function updateClientScopeSettingDraft(key: string, kind: ClientScopeSettingFieldKind, value: unknown) {
  timelineScopeSettingsDraft.value = {
    ...timelineScopeSettingsDraft.value,
    [key]: normalizeClientScopeSettingValue(kind, value),
  }
}

function normalizeTaskScopeId(taskId: string) {
  return taskId.startsWith('hybrid:') ? taskId.slice('hybrid:'.length) : taskId
}

function buildSelectedTimelineScopeState(row: HybridTimelineRow): SelectedTimelineScopeState {
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

function buildProjectScopeState(): SelectedTimelineScopeState {
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

function buildTaskScopeState(taskId: string, sprintId?: string): SelectedTimelineScopeState | null {
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

async function scrollTimelineDetailsIntoView() {
  if (!import.meta.client || typeof document === 'undefined') return

  await nextTick()
  document.querySelector<HTMLElement>('.cpc-timeline-details-panel')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function resetTimelineScopeDetailState() {
  timelineScopeDetail.value = null
  timelineScopeDetailPending.value = false
  timelineScopeDetailError.value = ''
  timelineScopeSettingsDraft.value = {}
  timelineScopeMutationPending.value = false
  timelineScopeMutationError.value = ''
  timelineScopeMutationNotice.value = ''
}

async function fetchTimelineScopeDetail(scope: SelectedTimelineScopeState | null) {
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
    timelineScopeSettingsDraft.value = {}
    timelineScopeMutationError.value = ''
    timelineScopeMutationNotice.value = ''
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

async function openTimelineRowDetails(row: HybridTimelineRow) {
  const nextScope = buildSelectedTimelineScopeState(row)
  selectedTimelineScopeState.value = nextScope
  void fetchTimelineScopeDetail(nextScope)

  if (import.meta.client && typeof window !== 'undefined' && window.innerWidth >= 1180) return
  await scrollTimelineDetailsIntoView()
}

async function openProjectScopeDetails() {
  const nextScope = buildProjectScopeState()
  selectedTimelineScopeState.value = nextScope
  void fetchTimelineScopeDetail(nextScope)
  await scrollTimelineDetailsIntoView()
}

async function openTaskScopeDetails(taskId?: string, sprintId?: string) {
  if (!taskId) return

  const nextScope = buildTaskScopeState(taskId, sprintId)
  if (!nextScope) return

  selectedTimelineScopeState.value = nextScope
  void fetchTimelineScopeDetail(nextScope)
  await scrollTimelineDetailsIntoView()
}

function closeTimelineRowDetails() {
  timelineScopeDetailRequestId.value += 1
  resetTimelineScopeDetailState()
  selectedTimelineScopeState.value = null
}

watch(() => timelineScopeDetail.value?.revision, () => {
  timelineScopeSettingsDraft.value = cloneTimelineScopeSettings(timelineScopeDetail.value?.settings || {})
  timelineScopeMutationError.value = ''
  timelineScopeMutationNotice.value = ''
}, { immediate: true })

async function commitClientScopeSettings() {
  const detail = timelineScopeDetail.value
  if (!detail) {
    return
  }

  timelineScopeMutationPending.value = true
  timelineScopeMutationError.value = ''
  timelineScopeMutationNotice.value = ''

  try {
    await $fetch(`/api/projects/${props.slug}/coordination/scopes/${detail.scope.scopeType}/${encodeURIComponent(detail.scope.scopeId)}/settings`, {
      method: 'PATCH',
      body: {
        settings: cloneTimelineScopeSettings(timelineScopeSettingsDraft.value),
      },
    })

    await fetchTimelineScopeDetail(selectedTimelineRowDetails.value)
    timelineScopeMutationNotice.value = 'Настройки контура обновлены.'
  } catch (error) {
    timelineScopeMutationError.value = normalizeTimelineScopeMutationError(error, 'Не удалось обновить настройки контура.')
  } finally {
    timelineScopeMutationPending.value = false
  }
}

function handleClientScopeSelectSettingChange(key: string, event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value || ''
  updateClientScopeSettingDraft(key, 'select', value)
  void commitClientScopeSettings()
}

function handleClientScopeBooleanSettingChange(key: string, event: Event) {
  const checked = Boolean((event.target as HTMLInputElement | null)?.checked)
  updateClientScopeSettingDraft(key, 'boolean', checked)
  void commitClientScopeSettings()
}

function handleClientScopeTextSettingInput(key: string, kind: ClientScopeSettingFieldKind, event: Event) {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value || ''
  updateClientScopeSettingDraft(key, kind, value)
}

function openTimelinePhase(phaseId?: string) {
  closeTimelineRowDetails()
  void scrollClientPhaseIntoView(phaseId)
}

function openTimelineSprint(sprintId?: string) {
  closeTimelineRowDetails()
  focusSprint(sprintId)
}

function openTimelineTask(taskId?: string, sprintId?: string) {
  if (!taskId) return
  const normalizedTaskId = normalizeTaskScopeId(taskId)
  closeTimelineRowDetails()
  selectTask(normalizedTaskId, sprintId)
}
</script>

<style scoped src="./ClientProjectControl.scoped.css"></style>
