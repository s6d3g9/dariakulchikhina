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

    <div class="cpc-grid cpc-grid--summary">
      <section class="cpc-card">
        <p class="cpc-card__label">Текущая фаза</p>
        <h3 class="cpc-card__title">{{ summary.activePhase?.title || 'Фаза не определена' }}</h3>
        <p class="cpc-card__meta">Прогресс каркаса: {{ summary.phasePercent }}%</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Текущий спринт</p>
        <h3 class="cpc-card__title">{{ summary.activeSprint?.name || 'Спринт ещё не запущен' }}</h3>
        <p class="cpc-card__meta">Исполнение: {{ summary.doneTasks }} / {{ summary.totalTasks }} задач</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Следующий обзор</p>
        <h3 class="cpc-card__title">{{ control.nextReviewDate || 'Не назначен' }}</h3>
        <p class="cpc-card__meta">Следующая управленческая синхронизация</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Блокеры</p>
        <h3 class="cpc-card__title">{{ summary.blockerCount }}</h3>
        <p class="cpc-card__meta">Критических блокеров на текущий момент</p>
      </section>
    </div>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Агенты менеджмента</div>
          <div class="cpc-section__meta">Кто следит за ритмом и правильной коммуникацией</div>
        </div>
      </div>

      <div class="cpc-agent-list">
        <div v-for="agent in coordinationBrief.agents.filter(item => item.enabled)" :key="agent.id" class="cpc-agent-card">
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

    <section class="cpc-section cpc-section--phases">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Фазы проекта</div>
          <div class="cpc-section__meta">Фазовый каркас и контрольные гейты</div>
        </div>
      </div>

      <div class="cpc-phase-overview">
        <article v-for="stat in phaseStats" :key="stat.label" class="cpc-phase-stat">
          <span class="cpc-phase-stat__label">{{ stat.label }}</span>
          <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
        </article>
      </div>

      <div class="cpc-phase-list cpc-phase-list--cards">
        <article v-for="phase in control.phases" :key="phase.id" class="cpc-phase-card" :data-client-phase-id="phase.id">
          <div class="cpc-phase-card__head">
            <div>
              <p class="cpc-phase-card__kicker">{{ phase.phaseKey }}</p>
              <h3 class="cpc-phase-card__title">{{ phase.title }}</h3>
            </div>
            <div class="cpc-phase-row__right">
              <span class="cpc-chip" :class="`cpc-chip--${phase.status}`">{{ phaseStatusLabels[phase.status] }}</span>
              <span class="cpc-chip">{{ phase.percent || 0 }}%</span>
            </div>
          </div>

          <div class="cpc-phase-card__grid">
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Результат</span>
              <strong class="cpc-phase-field__value">{{ phase.deliverable || 'Результат пока не зафиксирован' }}</strong>
            </div>
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Ответственный</span>
              <strong class="cpc-phase-field__value">{{ phase.owner || 'Команда проекта' }}</strong>
            </div>
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Период</span>
              <strong class="cpc-phase-field__value">{{ formatDateRange(phase.startDate, phase.endDate) }}</strong>
            </div>
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Комментарий</span>
              <strong class="cpc-phase-field__value">{{ phase.notes || 'Без дополнительной заметки' }}</strong>
            </div>
          </div>

          <div v-if="phase.gates.length" class="cpc-phase-gates">
            <div class="cpc-phase-gates__head">
              <span class="cpc-phase-field__label">Контрольные гейты</span>
              <span class="cpc-chip">{{ getPhaseGateProgress(phase) }}</span>
            </div>
            <div class="cpc-phase-gate-list">
              <div
                v-for="gate in phase.gates"
                :key="gate.id"
                class="cpc-phase-gate"
                :class="{ 'cpc-phase-gate--done': gate.done }"
              >
                <span class="cpc-phase-gate__state">{{ gate.done ? 'готово' : 'в работе' }}</span>
                <span class="cpc-phase-gate__label">{{ gate.label }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

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

    <section v-if="control.blockers.length" class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Текущие блокеры</div>
          <div class="cpc-section__meta">Что мешает движению</div>
        </div>
      </div>
      <div class="cpc-blocker-list">
        <div v-for="(blocker, index) in control.blockers" :key="`client-blocker-${index}`" class="cpc-blocker">
          {{ blocker }}
        </div>
      </div>
    </section>
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

function getPhaseGateProgress(phase: HybridControlPhase) {
  if (!phase.gates.length) return '0'
  return `${phase.gates.filter(gate => gate.done).length}/${phase.gates.length}`
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

<style scoped>
.cpc-root {
  --cpc-text: var(--glass-text);
  --cpc-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --cpc-border: color-mix(in srgb, var(--glass-text) 14%, transparent);
  --cpc-strong-border: color-mix(in srgb, var(--glass-text) 24%, transparent);
  --cpc-surface: color-mix(in srgb, var(--glass-bg) 84%, white 4%);
  --cpc-surface-strong: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  --cpc-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-radius: 28px;
  --cpc-inner-radius: 22px;
  --cpc-chip-radius: 999px;
  --cpc-border-width: 1px;
  --cpc-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
  --cpc-backdrop: blur(18px) saturate(145%);
  --cpc-label-transform: uppercase;
  --cpc-label-spacing: 0.12em;
  display: grid;
  gap: 18px;
}

.cpc-hero__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.cpc-timeline-governance-settings {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.cpc-timeline-governance-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cpc-timeline-task-item__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

:global(html[data-design-mode="liquid-glass"] .cpc-root) {
  --cpc-text: var(--glass-text);
  --cpc-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --cpc-border: color-mix(in srgb, var(--glass-text) 14%, transparent);
  --cpc-strong-border: color-mix(in srgb, var(--glass-text) 24%, transparent);
  --cpc-surface: color-mix(in srgb, var(--glass-bg) 84%, white 4%);
  --cpc-surface-strong: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  --cpc-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-radius: 22px;
  --cpc-inner-radius: 22px;
  --cpc-chip-radius: 999px;
  --cpc-border-width: 1px;
  --cpc-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
  --cpc-backdrop: blur(18px) saturate(145%);
  --cpc-label-transform: uppercase;
  --cpc-label-spacing: 0.12em;
}

:global(html[data-design-mode="material3"] .cpc-root) {
  --cpc-text: var(--sys-color-on-surface);
  --cpc-muted: var(--sys-color-on-surface-variant);
  --cpc-border: var(--sys-color-outline-variant);
  --cpc-strong-border: var(--sys-color-outline);
  --cpc-surface: var(--sys-color-surface-container-low);
  --cpc-surface-strong: var(--sys-color-surface-container);
  --cpc-surface-muted: color-mix(in srgb, var(--sys-color-secondary-container) 42%, transparent);
  --cpc-radius: var(--sys-radius-xl, 28px);
  --cpc-inner-radius: var(--sys-radius-lg, 20px);
  --cpc-shadow: var(--sys-elevation-level2, 0 12px 28px rgba(15, 23, 42, 0.12));
  --cpc-backdrop: none;
  --cpc-label-transform: none;
  --cpc-label-spacing: 0.01em;
}

:global(html[data-design-mode="brutalist"] .cpc-root) {
  --cpc-radius: 0px;
  --cpc-inner-radius: 0px;
  --cpc-chip-radius: 0px;
  --cpc-border-width: 2px;
  --cpc-shadow: none;
  --cpc-backdrop: none;
  --cpc-label-transform: uppercase;
  --cpc-label-spacing: 0.14em;
}

:global(html[data-concept="minale"] .cpc-root) {
  --cpc-text: rgba(255, 255, 255, 0.92);
  --cpc-muted: rgba(255, 255, 255, 0.56);
  --cpc-border: rgba(255, 255, 255, 0.12);
  --cpc-strong-border: rgba(255, 255, 255, 0.24);
  --cpc-surface: rgba(255, 255, 255, 0.02);
  --cpc-surface-strong: rgba(255, 255, 255, 0.04);
  --cpc-surface-muted: rgba(255, 255, 255, 0.03);
  --cpc-radius: 4px 4px 0 0;
  --cpc-inner-radius: 4px 4px 0 0;
  --cpc-chip-radius: 4px 4px 0 0;
  --cpc-border-width: 1px;
  --cpc-shadow: none;
  --cpc-backdrop: none;
  --cpc-label-spacing: 0.16em;
}

:global(html[data-concept="brutal"] .cpc-root) {
  --cpc-text: #000000;
  --cpc-muted: rgba(0, 0, 0, 0.66);
  --cpc-border: #000000;
  --cpc-strong-border: #000000;
  --cpc-surface: #ffffff;
  --cpc-surface-strong: #f5efdf;
  --cpc-surface-muted: #fbf4e7;
  --cpc-radius: 4px 4px 0 0;
  --cpc-inner-radius: 4px 4px 0 0;
  --cpc-chip-radius: 4px 4px 0 0;
  --cpc-border-width: 2px;
  --cpc-shadow: 6px 6px 0 #000000;
  --cpc-backdrop: none;
  --cpc-label-spacing: 0.14em;
}

.cpc-shell,
.cpc-card,
.cpc-section,
.cpc-agent-card,
.cpc-recommendation-card,
.cpc-playbook-card,
.cpc-call-insight-card,
.cpc-phase-stat,
.cpc-phase-card,
.cpc-sprint-card,
.cpc-sprint-detail-card,
.cpc-checkpoint,
.cpc-blocker,
.cpc-board-card,
.cpc-task-card {
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-radius);
  background: var(--cpc-surface);
  color: var(--cpc-text);
  box-shadow: var(--cpc-shadow);
  backdrop-filter: var(--cpc-backdrop);
  -webkit-backdrop-filter: var(--cpc-backdrop);
}

.cpc-eyebrow,
.cpc-card__label,
.cpc-section__meta,
.cpc-phase-card__kicker,
.cpc-phase-field__label,
.cpc-phase-stat__label,
.cpc-board__type,
.cpc-board__timeline-group-label,
.cpc-board__week-label,
.cpc-empty,
.cpc-board__toggle {
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-eyebrow,
.cpc-card__label,
.cpc-section__meta,
.cpc-phase-row__meta,
.cpc-card__meta,
.cpc-phase-card__kicker,
.cpc-phase-field__label,
.cpc-phase-stat__label,
.cpc-board__type,
.cpc-board__timeline-group-label,
.cpc-board__week-label,
.cpc-task-card__meta,
.cpc-empty {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cpc-muted);
}

.cpc-title,
.cpc-card__title,
.cpc-section__title,
.cpc-phase-row__title,
.cpc-phase-card__title,
.cpc-phase-field__value,
.cpc-phase-stat__value,
.cpc-board__title {
  margin: 0;
  color: var(--cpc-text);
}

.cpc-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
}

.cpc-title {
  font-size: clamp(1.12rem, 1.8vw, 1.42rem);
  line-height: 1.3;
}

.cpc-grid--summary,
.cpc-phase-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.cpc-card,
.cpc-phase-stat {
  display: grid;
  gap: 10px;
  min-height: 92px;
  padding: 16px 18px;
}

.cpc-card__title,
.cpc-phase-stat__value {
  font-size: clamp(1rem, 2vw, 1.2rem);
  line-height: 1.35;
}

.cpc-section {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.cpc-section__head,
.cpc-phase-row__right,
.cpc-phase-card__head,
.cpc-sprint-card__head,
.cpc-sprint-card__foot,
.cpc-sprint-detail__head,
.cpc-task-card__top,
.cpc-task-card__meta,
.cpc-playbook-card,
.cpc-agent-card,
.cpc-recommendation-card,
.cpc-call-insight-card,
.cpc-checkpoint,
.cpc-blocker,
.cpc-phase-gates__head,
.cpc-sprint-column__head,
.cpc-board__entity-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cpc-agent-list,
.cpc-recommendation-list,
.cpc-playbook-list,
.cpc-call-insight-list,
.cpc-checkpoint-list,
.cpc-blocker-list,
.cpc-phase-gate-list,
.cpc-task-list {
  display: grid;
  gap: 12px;
}

.cpc-agent-card,
.cpc-recommendation-card,
.cpc-playbook-card,
.cpc-call-insight-card,
.cpc-checkpoint,
.cpc-blocker {
  padding: 16px 18px;
}

.cpc-subsection {
  display: grid;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--cpc-border);
}

.cpc-playbook-template,
.cpc-recommendation-text,
.cpc-task-card__note {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--cpc-text);
}

.cpc-task-card {
  cursor: pointer;
}

.cpc-task-card:focus-visible {
  outline: max(2px, var(--cpc-border-width)) solid color-mix(in srgb, var(--ds-accent) 72%, var(--cpc-strong-border));
  outline-offset: 2px;
}

.cpc-task-card--active {
  border-color: color-mix(in srgb, var(--ds-accent) 34%, var(--cpc-strong-border));
  background: color-mix(in srgb, var(--ds-accent) 6%, var(--cpc-surface));
}

.cpc-call-insight-listing,
.cpc-playbook-audience {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.cpc-section--timeline .cpc-section__tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.cpc-scale-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cpc-scale-switch__btn {
  min-height: 44px;
}

.cpc-scale-switch__btn--active {
  border-color: var(--cpc-strong-border);
}

.cpc-board-card {
  padding: 14px;
}

.cpc-board-wrap {
  overflow: auto;
  border-radius: var(--cpc-inner-radius);
  background: var(--cpc-surface-muted);
}

.cpc-board {
  min-width: 1040px;
}

.cpc-board__head,
.cpc-board__row {
  display: grid;
  grid-template-columns: var(--cpc-entity-column-width, 240px) var(--cpc-period-column-width, 170px) minmax(520px, 2fr);
  gap: 0;
  align-items: stretch;
}

.cpc-board__head {
  position: sticky;
  top: 0;
  z-index: 8;
  border-bottom: 1px solid var(--cpc-border);
  background: var(--cpc-surface-strong);
}

.cpc-board__row {
  border-bottom: 1px solid var(--cpc-border);
}

.cpc-board__row--phase {
  background: color-mix(in srgb, var(--cpc-surface-muted) 84%, transparent);
}

.cpc-board__cell,
.cpc-board__timeline-head-stack,
.cpc-board__timeline {
  min-height: 72px;
}

.cpc-board__cell {
  padding: 12px 0;
}

.cpc-board__cell--entity,
.cpc-board__cell--period {
  position: sticky;
  z-index: 3;
  background: var(--cpc-surface);
}

.cpc-board__cell--entity {
  left: 0;
}

.cpc-board__cell--period {
  left: var(--cpc-entity-column-width, 240px);
  padding: 12px 14px;
  border-left: 1px solid var(--cpc-border);
  border-right: 1px solid var(--cpc-border);
}

.cpc-board__head .cpc-board__cell,
.cpc-board__head .cpc-board__timeline-head-stack,
.cpc-board__head .cpc-board__timeline-groups,
.cpc-board__head .cpc-board__timeline-head,
.cpc-board__head .cpc-board__timeline-group-label,
.cpc-board__head .cpc-board__week-label {
  background: var(--cpc-surface-strong);
}

.cpc-board__row--phase .cpc-board__cell--entity,
.cpc-board__row--phase .cpc-board__cell--period {
  background: color-mix(in srgb, var(--cpc-surface-muted) 88%, var(--cpc-surface));
}

.cpc-board__entity,
.cpc-board__period,
.cpc-board__entity-body {
  display: grid;
  gap: 6px;
  align-content: center;
}

.cpc-board__toggle {
  min-height: 44px;
  padding: 0 10px;
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-chip-radius);
  background: transparent;
  color: var(--cpc-muted);
}

.cpc-board__toggle:hover {
  color: var(--cpc-text);
  border-color: var(--cpc-strong-border);
}

.cpc-board__timeline-head-stack,
.cpc-board__timeline-groups,
.cpc-board__timeline-head,
.cpc-board__weeks {
  display: grid;
}

.cpc-board__timeline-head-stack {
  grid-template-rows: auto auto;
}

.cpc-board__timeline-groups {
  border-bottom: 1px solid var(--cpc-border);
}

.cpc-board__timeline-group-label,
.cpc-board__week-label,
.cpc-board__week {
  border-left: 1px solid var(--cpc-border);
}

.cpc-board__timeline-group-label,
.cpc-board__week-label {
  display: grid;
  gap: 4px;
}

.cpc-board__timeline-group-label {
  min-height: 34px;
  padding: 8px 10px;
  align-content: center;
}

.cpc-board__week-label {
  padding: 12px 10px;
}

.cpc-board__period strong,
.cpc-board__week-label strong {
  font-size: 0.78rem;
  color: var(--cpc-text);
}

.cpc-board__timeline {
  position: relative;
}

.cpc-board__weeks {
  height: 100%;
}

.cpc-board__bar {
  position: absolute;
  top: 14px;
  bottom: 14px;
  min-width: 56px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: var(--cpc-border-width) solid currentColor;
  border-radius: var(--cpc-chip-radius);
  background: color-mix(in srgb, currentColor 10%, transparent);
  overflow: hidden;
}

.cpc-board__bar--stable {
  color: color-mix(in srgb, var(--cpc-text) 78%, transparent);
}

.cpc-board__bar--warning {
  color: var(--ds-warning);
}

.cpc-board__bar--critical {
  color: var(--ds-error);
}

.cpc-board__bar-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.74rem;
}

.cpc-phase-list--cards,
.cpc-sprint-list--cards {
  display: grid;
  gap: 14px;
}

.cpc-phase-card,
.cpc-sprint-card,
.cpc-sprint-detail-card {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.cpc-phase-card__grid,
.cpc-sprint-card__body,
.cpc-sprint-detail__grid,
.cpc-sprint-shell,
.cpc-sprint-board {
  display: grid;
  gap: 12px;
}

.cpc-phase-card__grid,
.cpc-sprint-card__body,
.cpc-sprint-detail__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cpc-phase-field {
  display: grid;
  gap: 8px;
  min-height: 84px;
  padding: 14px 16px;
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-inner-radius);
  background: var(--cpc-surface-muted);
}

.cpc-phase-field--full {
  grid-column: 1 / -1;
}

.cpc-phase-field__value {
  font-size: 0.88rem;
  line-height: 1.45;
}

.cpc-phase-gates {
  display: grid;
  gap: 12px;
  padding-top: 4px;
}

.cpc-phase-gate-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cpc-phase-gate {
  display: grid;
  gap: 8px;
  min-height: 68px;
  padding: 14px 16px;
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-inner-radius);
  background: var(--cpc-surface-muted);
}

.cpc-phase-gate--done {
  border-color: color-mix(in srgb, var(--ds-success) 50%, var(--cpc-border));
  background: color-mix(in srgb, var(--ds-success) 8%, var(--cpc-surface-muted));
}

.cpc-phase-gate__state {
  font-size: 0.68rem;
  color: var(--cpc-muted);
}

.cpc-phase-gate__label {
  font-size: 0.84rem;
  line-height: 1.4;
}

.cpc-sprint-card--active {
  border-color: color-mix(in srgb, var(--ds-accent) 40%, var(--cpc-strong-border));
  background: color-mix(in srgb, var(--ds-accent) 6%, var(--cpc-surface));
}

.cpc-task-detail-card {
  border-color: color-mix(in srgb, var(--ds-accent) 38%, var(--cpc-strong-border));
  background: color-mix(in srgb, var(--ds-accent) 4%, var(--cpc-surface));
}

.cpc-sprint-card__foot {
  padding-top: 4px;
  border-top: 1px solid var(--cpc-border);
}

.cpc-sprint-detail__head {
  align-items: flex-start;
}

.cpc-phase-overview--detail {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.cpc-sprint-board {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
}

.cpc-sprint-column {
  display: grid;
  gap: 10px;
  min-height: 200px;
  padding: 12px;
  border: var(--cpc-border-width) dashed var(--cpc-border);
  border-radius: var(--cpc-inner-radius);
  background: color-mix(in srgb, var(--cpc-surface-strong) 82%, transparent);
}

.cpc-task-list--board {
  align-content: start;
}

.cpc-task-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: var(--cpc-inner-radius);
}

.cpc-chip,
.cpc-pill {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-chip-radius);
  background: var(--cpc-surface-strong);
  color: var(--cpc-text);
  font-size: 0.68rem;
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-pill--stable,
.cpc-chip--done,
.cpc-chip--stable {
  color: var(--ds-success);
}

.cpc-pill--warning,
.cpc-chip--warning,
.cpc-chip--review {
  color: var(--ds-warning);
}

.cpc-pill--critical,
.cpc-chip--critical,
.cpc-chip--blocked {
  color: var(--ds-error);
}

.cpc-chip--active,
.cpc-chip--doing {
  color: var(--ds-accent);
}

.cpc-empty {
  display: grid;
  place-items: center;
  min-height: 72px;
}

.cpc-empty--inline {
  min-height: 120px;
}

:global(html[data-concept="brutal"] .cpc-shell),
:global(html[data-concept="brutal"] .cpc-card),
:global(html[data-concept="brutal"] .cpc-section),
:global(html[data-concept="brutal"] .cpc-agent-card),
:global(html[data-concept="brutal"] .cpc-recommendation-card),
:global(html[data-concept="brutal"] .cpc-playbook-card),
:global(html[data-concept="brutal"] .cpc-call-insight-card),
:global(html[data-concept="brutal"] .cpc-phase-stat),
:global(html[data-concept="brutal"] .cpc-phase-card),
:global(html[data-concept="brutal"] .cpc-sprint-card),
:global(html[data-concept="brutal"] .cpc-sprint-detail-card),
:global(html[data-concept="brutal"] .cpc-checkpoint),
:global(html[data-concept="brutal"] .cpc-blocker),
:global(html[data-concept="brutal"] .cpc-board-card),
:global(html[data-concept="brutal"] .cpc-task-card),
:global(html[data-concept="brutal"] .cpc-phase-field),
:global(html[data-concept="brutal"] .cpc-phase-gate),
:global(html[data-concept="brutal"] .cpc-sprint-column),
:global(html[data-concept="brutal"] .cpc-chip),
:global(html[data-concept="brutal"] .cpc-pill) {
  box-shadow: 4px 4px 0 #000000;
}

.cpc-section--timeline {
  --cpc-tl-text: var(--glass-text);
  --cpc-tl-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --cpc-tl-soft: color-mix(in srgb, var(--glass-text) 10%, transparent);
  --cpc-tl-strong-border: color-mix(in srgb, var(--glass-text) 22%, transparent);
  --cpc-tl-surface: color-mix(in srgb, var(--glass-bg) 78%, transparent);
  --cpc-tl-surface-strong: color-mix(in srgb, var(--glass-bg) 92%, white 8%);
  --cpc-tl-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-tl-base: var(--glass-page-bg);
  --cpc-tl-panel-radius: 28px;
  --cpc-tl-inner-radius: 22px;
  --cpc-tl-chip-radius: 999px;
  --cpc-tl-border-width: 1px;
  --cpc-tl-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
  --cpc-tl-backdrop: blur(18px) saturate(145%);
  --cpc-tl-label-transform: uppercase;
  --cpc-tl-label-spacing: 0.12em;
  --cpc-tl-stable: color-mix(in srgb, var(--glass-text) 82%, transparent);
  --cpc-tl-warning: var(--ds-warning);
  --cpc-tl-critical: var(--ds-error);
  color: var(--cpc-tl-text);
}

:global(html[data-design-mode="liquid-glass"] .cpc-section--timeline) {
  --cpc-tl-surface: color-mix(in srgb, var(--glass-bg) 82%, transparent);
  --cpc-tl-surface-strong: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  --cpc-tl-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-tl-base: color-mix(in srgb, var(--glass-page-bg) 92%, transparent);
  --cpc-tl-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.22), 0 18px 40px rgba(15, 23, 42, 0.14);
}

:global(html[data-design-mode="material3"] .cpc-section--timeline) {
  --cpc-tl-text: var(--sys-color-on-surface);
  --cpc-tl-muted: var(--sys-color-on-surface-variant);
  --cpc-tl-soft: var(--sys-color-outline-variant);
  --cpc-tl-strong-border: var(--sys-color-outline);
  --cpc-tl-surface: var(--sys-color-surface-container-low);
  --cpc-tl-surface-strong: var(--sys-color-surface-container);
  --cpc-tl-surface-muted: color-mix(in srgb, var(--sys-color-secondary-container) 40%, transparent);
  --cpc-tl-base: var(--sys-color-surface);
  --cpc-tl-panel-radius: var(--sys-radius-xl, 28px);
  --cpc-tl-inner-radius: var(--sys-radius-lg, 20px);
  --cpc-tl-chip-radius: 999px;
  --cpc-tl-shadow: var(--sys-elevation-level2);
  --cpc-tl-backdrop: none;
  --cpc-tl-label-transform: none;
  --cpc-tl-label-spacing: 0.01em;
  --cpc-tl-stable: var(--sys-color-secondary);
  --cpc-tl-warning: #b26a00;
  --cpc-tl-critical: var(--sys-color-error);
}

:global(html[data-design-mode="brutalist"] .cpc-section--timeline) {
  --cpc-tl-panel-radius: 0px;
  --cpc-tl-inner-radius: 0px;
  --cpc-tl-chip-radius: 0px;
  --cpc-tl-border-width: 2px;
  --cpc-tl-shadow: none;
  --cpc-tl-backdrop: none;
  --cpc-tl-label-transform: uppercase;
  --cpc-tl-label-spacing: 0.14em;
}

:global(html[data-concept="minale"] .cpc-section--timeline) {
  --cpc-tl-text: rgba(255, 255, 255, 0.92);
  --cpc-tl-muted: rgba(255, 255, 255, 0.58);
  --cpc-tl-soft: rgba(255, 255, 255, 0.12);
  --cpc-tl-strong-border: rgba(255, 255, 255, 0.24);
  --cpc-tl-surface: rgba(255, 255, 255, 0.02);
  --cpc-tl-surface-strong: rgba(255, 255, 255, 0.04);
  --cpc-tl-surface-muted: rgba(255, 255, 255, 0.03);
  --cpc-tl-base: rgba(0, 0, 0, 0.42);
  --cpc-tl-panel-radius: 4px 4px 0 0;
  --cpc-tl-inner-radius: 4px 4px 0 0;
  --cpc-tl-chip-radius: 4px 4px 0 0;
  --cpc-tl-border-width: 1px;
  --cpc-tl-shadow: none;
  --cpc-tl-backdrop: none;
  --cpc-tl-label-spacing: 0.16em;
  --cpc-tl-stable: rgba(255, 255, 255, 0.92);
}

:global(html[data-concept="brutal"] .cpc-section--timeline) {
  --cpc-tl-text: #000000;
  --cpc-tl-muted: rgba(0, 0, 0, 0.64);
  --cpc-tl-soft: #000000;
  --cpc-tl-strong-border: #000000;
  --cpc-tl-surface: #ffffff;
  --cpc-tl-surface-strong: #f4efe3;
  --cpc-tl-surface-muted: #faf5ea;
  --cpc-tl-base: #ffffff;
  --cpc-tl-panel-radius: 4px 4px 0 0;
  --cpc-tl-inner-radius: 4px 4px 0 0;
  --cpc-tl-chip-radius: 4px 4px 0 0;
  --cpc-tl-border-width: 2px;
  --cpc-tl-shadow: 6px 6px 0 #000000;
  --cpc-tl-backdrop: none;
  --cpc-tl-label-spacing: 0.14em;
  --cpc-tl-stable: #000000;
  --cpc-tl-warning: #b35a00;
  --cpc-tl-critical: #c1121f;
}

.cpc-section--timeline .cpc-section__head {
  align-items: flex-end;
}

.cpc-timeline-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.cpc-timeline-content--details {
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.9fr);
}

.cpc-section--timeline .cpc-phase-stat,
.cpc-section--timeline .cpc-board-card,
.cpc-timeline-details-panel {
  border: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  border-radius: var(--cpc-tl-panel-radius);
  background: var(--cpc-tl-surface);
  color: var(--cpc-tl-text);
  box-shadow: var(--cpc-tl-shadow);
  backdrop-filter: var(--cpc-tl-backdrop);
  -webkit-backdrop-filter: var(--cpc-tl-backdrop);
}

.cpc-section--timeline .cpc-phase-stat__label,
.cpc-section--timeline .cpc-board__type,
.cpc-section--timeline .cpc-board__timeline-group-label,
.cpc-section--timeline .cpc-board__week-label span,
.cpc-section--timeline .cpc-scale-switch__btn,
.cpc-section--timeline .cpc-board__toggle,
.cpc-section--timeline .cpc-chip {
  text-transform: var(--cpc-tl-label-transform);
  letter-spacing: var(--cpc-tl-label-spacing);
}

.cpc-section--timeline .cpc-phase-stat__label,
.cpc-section--timeline .cpc-board__meta-line,
.cpc-section--timeline .cpc-board__period span,
.cpc-section--timeline .cpc-board__week-label {
  color: var(--cpc-tl-muted);
}

.cpc-section--timeline .cpc-phase-stat__value,
.cpc-section--timeline .cpc-board__title,
.cpc-section--timeline .cpc-board__period strong,
.cpc-section--timeline .cpc-board__week-label strong {
  color: var(--cpc-tl-text);
}

.cpc-section--timeline .cpc-board-card {
  padding: 14px;
}

.cpc-section--timeline .cpc-board-wrap {
  border-radius: var(--cpc-tl-inner-radius);
  background: var(--cpc-tl-surface-muted);
}

.cpc-section--timeline .cpc-board__head {
  border-bottom: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  background: var(--cpc-tl-surface-strong);
  backdrop-filter: var(--cpc-tl-backdrop);
  -webkit-backdrop-filter: var(--cpc-tl-backdrop);
}

.cpc-section--timeline .cpc-board__row {
  border-bottom: 1px solid var(--cpc-tl-soft);
  transition: background-color 0.18s ease;
}

.cpc-section--timeline .cpc-board__row:hover {
  background: color-mix(in srgb, var(--cpc-tl-surface-strong) 88%, transparent);
}

.cpc-section--timeline .cpc-board__row--phase {
  background: color-mix(in srgb, var(--cpc-tl-surface-muted) 80%, transparent);
}

.cpc-section--timeline .cpc-board__cell,
.cpc-section--timeline .cpc-board__timeline-head-stack,
.cpc-section--timeline .cpc-board__timeline {
  min-height: 66px;
}

.cpc-section--timeline .cpc-board__cell--entity,
.cpc-section--timeline .cpc-board__cell--period {
  background: var(--cpc-tl-base);
}

.cpc-section--timeline .cpc-board__row--phase .cpc-board__cell--entity,
.cpc-section--timeline .cpc-board__row--phase .cpc-board__cell--period {
  background: color-mix(in srgb, var(--cpc-tl-surface-muted) 92%, var(--cpc-tl-base));
}

.cpc-section--timeline .cpc-board__cell--period {
  border-left: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  border-right: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
}

.cpc-section--timeline .cpc-board__entity-body,
.cpc-section--timeline .cpc-board__period {
  gap: 8px;
}

.cpc-section--timeline .cpc-board__toggle,
.cpc-section--timeline .cpc-scale-switch__btn,
.cpc-section--timeline .cpc-chip {
  border-radius: var(--cpc-tl-chip-radius);
  border: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  background: transparent;
  color: var(--cpc-tl-muted);
}

.cpc-section--timeline .cpc-scale-switch__btn,
.cpc-section--timeline .cpc-board__toggle {
  padding-inline: 14px;
}

.cpc-section--timeline .cpc-scale-switch__btn--active,
.cpc-section--timeline .cpc-board__toggle:hover {
  color: var(--cpc-tl-text);
  border-color: var(--cpc-tl-strong-border);
  background: var(--cpc-tl-surface-strong);
}

.cpc-section--timeline .cpc-chip {
  min-height: 30px;
  padding-inline: 10px;
  background: var(--cpc-tl-surface-muted);
}

.cpc-section--timeline .cpc-chip--stable {
  color: var(--cpc-tl-stable);
}

.cpc-section--timeline .cpc-chip--warning {
  color: var(--cpc-tl-warning);
}

.cpc-section--timeline .cpc-chip--critical {
  color: var(--cpc-tl-critical);
}

.cpc-section--timeline .cpc-board__title-btn {
  width: fit-content;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--cpc-tl-text);
  text-align: left;
  cursor: pointer;
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--cpc-tl-text) 22%, transparent);
}

.cpc-section--timeline .cpc-board__title-btn:hover {
  color: color-mix(in srgb, var(--cpc-tl-text) 88%, var(--ds-accent));
}

.cpc-section--timeline .cpc-board__timeline-groups {
  border-bottom: 1px solid var(--cpc-tl-soft);
}

.cpc-section--timeline .cpc-board__timeline-group-label,
.cpc-section--timeline .cpc-board__week-label,
.cpc-section--timeline .cpc-board__week {
  border-left: 1px solid var(--cpc-tl-soft);
}

.cpc-section--timeline .cpc-board__bar {
  top: 50%;
  bottom: auto;
  height: 42px;
  min-height: 42px;
  border-radius: var(--cpc-tl-chip-radius);
  border: var(--cpc-tl-border-width) solid currentColor;
  background: color-mix(in srgb, currentColor 13%, var(--cpc-tl-surface));
  transform: translateY(-50%);
  padding: 0 10px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 18%, transparent);
}

.cpc-section--timeline .cpc-board__bar--active {
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 18%, transparent), 0 0 0 1px currentColor, 0 12px 26px color-mix(in srgb, currentColor 18%, transparent);
}

.cpc-section--timeline .cpc-board__bar-body {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 1px;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cpc-section--timeline .cpc-board__bar-label {
  font-size: 0.72rem;
  font-weight: 600;
}

.cpc-section--timeline .cpc-board__bar-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, currentColor 72%, transparent);
}

.cpc-section--timeline .cpc-board__bar--stable {
  color: var(--cpc-tl-stable);
}

.cpc-section--timeline .cpc-board__bar--warning {
  color: var(--cpc-tl-warning);
}

.cpc-section--timeline .cpc-board__bar--critical {
  color: var(--cpc-tl-critical);
}

.cpc-timeline-details-panel {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 18px;
  padding: 20px 22px;
}

.cpc-timeline-details-panel__head,
.cpc-timeline-cluster__head,
.cpc-timeline-rule-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cpc-timeline-details-panel__title-wrap {
  display: grid;
  gap: 8px;
}

.cpc-timeline-details-panel__eyebrow,
.cpc-timeline-detail-card__label,
.cpc-timeline-empty,
.cpc-timeline-cluster__label,
.cpc-timeline-rule-card__meta,
.cpc-timeline-action-item__meta,
.cpc-timeline-task-item__meta {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--cpc-tl-muted);
}

.cpc-timeline-details-panel__title {
  margin: 0;
}

.cpc-timeline-detail-grid,
.cpc-timeline-clusters {
  display: grid;
  gap: 12px;
}

.cpc-timeline-detail-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cpc-timeline-clusters {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cpc-timeline-detail-card,
.cpc-timeline-cluster,
.cpc-timeline-action-item,
.cpc-timeline-rule-card,
.cpc-timeline-task-item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--cpc-tl-soft);
  border-radius: calc(var(--cpc-tl-inner-radius) - 6px);
  background: color-mix(in srgb, var(--cpc-tl-surface-strong) 76%, transparent);
}

.cpc-timeline-detail-card__value,
.cpc-timeline-cluster__value,
.cpc-timeline-rule-card__title,
.cpc-timeline-action-item__title,
.cpc-timeline-task-item__title {
  font-size: 0.86rem;
  line-height: 1.4;
}

.cpc-timeline-cluster {
  align-content: start;
}

.cpc-timeline-cluster__list,
.cpc-timeline-rule-list,
.cpc-timeline-meta,
.cpc-timeline-actions {
  display: grid;
  gap: 10px;
}

.cpc-timeline-action-list,
.cpc-timeline-task-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cpc-timeline-rule-card__copy {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
}

.cpc-timeline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cpc-section--phases,
.cpc-section--sprints {
  --cpc-pm-text: var(--glass-text);
  --cpc-pm-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --cpc-pm-soft: color-mix(in srgb, var(--glass-text) 10%, transparent);
  --cpc-pm-strong-border: color-mix(in srgb, var(--glass-text) 20%, transparent);
  --cpc-pm-surface: color-mix(in srgb, var(--glass-bg) 78%, transparent);
  --cpc-pm-surface-strong: color-mix(in srgb, var(--glass-bg) 92%, white 6%);
  --cpc-pm-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-pm-panel-radius: 28px;
  --cpc-pm-inner-radius: 22px;
  --cpc-pm-chip-radius: 999px;
  --cpc-pm-border-width: 1px;
  --cpc-pm-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
  --cpc-pm-backdrop: blur(18px) saturate(145%);
  --cpc-pm-label-transform: uppercase;
  --cpc-pm-label-spacing: 0.12em;
  color: var(--cpc-pm-text);
}

:global(html[data-design-mode="liquid-glass"] .cpc-section--phases),
:global(html[data-design-mode="liquid-glass"] .cpc-section--sprints) {
  --cpc-pm-surface: color-mix(in srgb, var(--glass-bg) 82%, transparent);
  --cpc-pm-surface-strong: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  --cpc-pm-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-pm-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 16px 34px rgba(15, 23, 42, 0.1);
}

:global(html[data-design-mode="material3"] .cpc-section--phases),
:global(html[data-design-mode="material3"] .cpc-section--sprints) {
  --cpc-pm-text: var(--sys-color-on-surface);
  --cpc-pm-muted: var(--sys-color-on-surface-variant);
  --cpc-pm-soft: var(--sys-color-outline-variant);
  --cpc-pm-strong-border: var(--sys-color-outline);
  --cpc-pm-surface: var(--sys-color-surface-container-low);
  --cpc-pm-surface-strong: var(--sys-color-surface-container);
  --cpc-pm-surface-muted: color-mix(in srgb, var(--sys-color-secondary-container) 40%, transparent);
  --cpc-pm-panel-radius: var(--sys-radius-xl, 28px);
  --cpc-pm-inner-radius: var(--sys-radius-lg, 20px);
  --cpc-pm-shadow: var(--sys-elevation-level2);
  --cpc-pm-backdrop: none;
  --cpc-pm-label-transform: none;
  --cpc-pm-label-spacing: 0.01em;
}

:global(html[data-design-mode="brutalist"] .cpc-section--phases),
:global(html[data-design-mode="brutalist"] .cpc-section--sprints) {
  --cpc-pm-panel-radius: 0px;
  --cpc-pm-inner-radius: 0px;
  --cpc-pm-chip-radius: 0px;
  --cpc-pm-border-width: 2px;
  --cpc-pm-shadow: none;
  --cpc-pm-backdrop: none;
  --cpc-pm-label-transform: uppercase;
  --cpc-pm-label-spacing: 0.14em;
}

:global(html[data-concept="minale"] .cpc-section--phases),
:global(html[data-concept="minale"] .cpc-section--sprints) {
  --cpc-pm-text: rgba(255, 255, 255, 0.92);
  --cpc-pm-muted: rgba(255, 255, 255, 0.56);
  --cpc-pm-soft: rgba(255, 255, 255, 0.12);
  --cpc-pm-strong-border: rgba(255, 255, 255, 0.24);
  --cpc-pm-surface: rgba(255, 255, 255, 0.02);
  --cpc-pm-surface-strong: rgba(255, 255, 255, 0.04);
  --cpc-pm-surface-muted: rgba(255, 255, 255, 0.03);
  --cpc-pm-panel-radius: 4px 4px 0 0;
  --cpc-pm-inner-radius: 4px 4px 0 0;
  --cpc-pm-chip-radius: 4px 4px 0 0;
  --cpc-pm-border-width: 1px;
  --cpc-pm-shadow: none;
  --cpc-pm-backdrop: none;
  --cpc-pm-label-spacing: 0.16em;
}

:global(html[data-concept="brutal"] .cpc-section--phases),
:global(html[data-concept="brutal"] .cpc-section--sprints) {
  --cpc-pm-text: #000000;
  --cpc-pm-muted: rgba(0, 0, 0, 0.66);
  --cpc-pm-soft: #000000;
  --cpc-pm-strong-border: #000000;
  --cpc-pm-surface: #ffffff;
  --cpc-pm-surface-strong: #f5efdf;
  --cpc-pm-surface-muted: #fbf4e7;
  --cpc-pm-panel-radius: 4px 4px 0 0;
  --cpc-pm-inner-radius: 4px 4px 0 0;
  --cpc-pm-chip-radius: 4px 4px 0 0;
  --cpc-pm-border-width: 2px;
  --cpc-pm-shadow: 6px 6px 0 #000000;
  --cpc-pm-backdrop: none;
  --cpc-pm-label-spacing: 0.14em;
}

.cpc-section--phases .cpc-phase-stat,
.cpc-section--phases .cpc-phase-card,
.cpc-section--phases .cpc-phase-field,
.cpc-section--phases .cpc-phase-gate,
.cpc-section--sprints .cpc-phase-stat,
.cpc-section--sprints .cpc-sprint-card,
.cpc-section--sprints .cpc-sprint-detail-card,
.cpc-section--sprints .cpc-phase-field,
.cpc-section--sprints .cpc-sprint-column,
.cpc-section--sprints .cpc-task-card {
  border: var(--cpc-pm-border-width) solid var(--cpc-pm-soft);
  border-radius: var(--cpc-pm-panel-radius);
  background: var(--cpc-pm-surface);
  color: var(--cpc-pm-text);
  box-shadow: var(--cpc-pm-shadow);
  backdrop-filter: var(--cpc-pm-backdrop);
  -webkit-backdrop-filter: var(--cpc-pm-backdrop);
}

.cpc-section--phases .cpc-phase-stat__label,
.cpc-section--phases .cpc-phase-card__kicker,
.cpc-section--phases .cpc-phase-field__label,
.cpc-section--phases .cpc-phase-row__meta,
.cpc-section--sprints .cpc-phase-stat__label,
.cpc-section--sprints .cpc-phase-card__kicker,
.cpc-section--sprints .cpc-phase-field__label,
.cpc-section--sprints .cpc-phase-row__meta,
.cpc-section--sprints .cpc-task-card__meta {
  color: var(--cpc-pm-muted);
}

.cpc-section--phases .cpc-phase-stat__label,
.cpc-section--phases .cpc-phase-card__kicker,
.cpc-section--phases .cpc-phase-field__label,
.cpc-section--sprints .cpc-phase-stat__label,
.cpc-section--sprints .cpc-phase-card__kicker,
.cpc-section--sprints .cpc-phase-field__label,
.cpc-section--sprints .cpc-chip {
  text-transform: var(--cpc-pm-label-transform);
  letter-spacing: var(--cpc-pm-label-spacing);
}

.cpc-section--phases .cpc-phase-row__title,
.cpc-section--phases .cpc-phase-card__title,
.cpc-section--phases .cpc-phase-field__value,
.cpc-section--phases .cpc-phase-stat__value,
.cpc-section--sprints .cpc-section__title,
.cpc-section--sprints .cpc-phase-row__title,
.cpc-section--sprints .cpc-phase-field__value,
.cpc-section--sprints .cpc-phase-stat__value,
.cpc-section--sprints .cpc-task-card__note {
  color: var(--cpc-pm-text);
}

.cpc-section--phases .cpc-phase-field,
.cpc-section--phases .cpc-phase-gate,
.cpc-section--sprints .cpc-phase-field,
.cpc-section--sprints .cpc-sprint-column {
  border-radius: var(--cpc-pm-inner-radius);
  background: var(--cpc-pm-surface-muted);
}

.cpc-section--phases .cpc-phase-gate--done {
  border-color: color-mix(in srgb, var(--ds-success) 50%, var(--cpc-pm-soft));
  background: color-mix(in srgb, var(--ds-success) 8%, var(--cpc-pm-surface-muted));
}

.cpc-section--phases .cpc-chip,
.cpc-section--sprints .cpc-chip {
  border: var(--cpc-pm-border-width) solid var(--cpc-pm-soft);
  border-radius: var(--cpc-pm-chip-radius);
  background: var(--cpc-pm-surface-strong);
  color: var(--cpc-pm-text);
}

.cpc-section--sprints .cpc-sprint-card--active,
.cpc-section--sprints .cpc-task-card--active,
.cpc-section--sprints .cpc-task-detail-card {
  border-color: color-mix(in srgb, var(--ds-accent) 38%, var(--cpc-pm-strong-border));
  background: color-mix(in srgb, var(--ds-accent) 6%, var(--cpc-pm-surface));
}

@media (max-width: 1200px) {
  .cpc-grid--summary,
  .cpc-phase-overview,
  .cpc-phase-overview--detail,
  .cpc-sprint-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cpc-sprint-shell {
    grid-template-columns: 1fr;
  }

  .cpc-timeline-content--details,
  .cpc-timeline-detail-grid,
  .cpc-timeline-clusters {
    grid-template-columns: 1fr;
  }

  .cpc-timeline-details-panel {
    position: static;
  }
}

@media (max-width: 900px) {
  .cpc-hero,
  .cpc-section__head,
  .cpc-agent-card,
  .cpc-recommendation-card,
  .cpc-playbook-card,
  .cpc-call-insight-card,
  .cpc-checkpoint,
  .cpc-blocker,
  .cpc-timeline-details-panel__head,
  .cpc-timeline-cluster__head,
  .cpc-timeline-rule-card__head,
  .cpc-sprint-card__head,
  .cpc-sprint-card__foot,
  .cpc-sprint-detail__head,
  .cpc-sprint-column__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .cpc-grid--summary,
  .cpc-phase-overview,
  .cpc-phase-overview--detail,
  .cpc-phase-card__grid,
  .cpc-sprint-card__body,
  .cpc-sprint-detail__grid,
  .cpc-phase-gate-list,
  .cpc-sprint-board {
    grid-template-columns: 1fr;
  }

  .cpc-section--timeline .cpc-board__cell,
  .cpc-section--timeline .cpc-board__timeline-head-stack,
  .cpc-section--timeline .cpc-board__timeline {
    min-height: 62px;
  }

  .cpc-section--timeline .cpc-board__bar {
    height: 38px;
    min-height: 38px;
  }

  .cpc-board {
    min-width: 980px;
  }
}

@media (max-width: 640px) {
  .cpc-root {
    gap: 14px;
  }

  .cpc-hero,
  .cpc-section,
  .cpc-card,
  .cpc-phase-card,
  .cpc-sprint-card,
  .cpc-sprint-detail-card,
  .cpc-agent-card,
  .cpc-recommendation-card,
  .cpc-playbook-card,
  .cpc-call-insight-card,
  .cpc-checkpoint,
  .cpc-blocker,
  .cpc-board-card,
  .cpc-timeline-details-panel,
  .cpc-task-card {
    padding: 14px;
  }
}
</style>
