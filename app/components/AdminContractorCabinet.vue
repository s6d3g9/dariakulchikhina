<template>
  <div class="cab-embed" v-if="contractorId">
    <div v-if="pending && !contractor" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="contractor" class="cab-body">
      <aside v-if="!props.hideNav" class="cab-sidebar glass-surface std-sidenav">
        <nav class="cab-nav std-nav">
          <button
            v-for="item in nav"
            :key="item.key"
            class="cab-nav-item std-nav-item"
            :class="{ active: section === item.key, 'std-nav-item--active': section === item.key }"
            @click="section = item.key"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.key === 'tasks' && activeCount" class="u-counter">{{ activeCount }}</span>
            <span v-if="item.key === 'staff' && staff?.length" class="u-counter">{{ staff.length }}</span>
            <span v-if="item.key === 'documents' && contractorDocs?.length" class="u-counter">{{ contractorDocs.length }}</span>
          </button>
        </nav>
      </aside>

      <main class="cab-main">
        <div class="cab-inner">
          <template v-if="section === 'dashboard'">
            <div class="dash-welcome glass-surface">
              <div class="dash-welcome-left">
                <div class="dash-avatar">{{ contractor?.name?.charAt(0)?.toUpperCase() || '◑' }}</div>
                <div>
                  <div class="dash-welcome-name">{{ contractor?.name }}</div>
                  <div class="dash-welcome-role">
                    {{ contractor?.contractorType === 'company' ? 'Подрядчик (компания)' : 'Мастер' }}
                    <span v-if="contractor?.city"> · {{ contractor.city }}</span>
                  </div>
                </div>
              </div>
              <div class="dash-profile-progress">
                <div class="dash-profile-pct-ring" :style="{ '--pct': profilePct }">
                  <span class="dash-profile-pct-val">{{ profilePct }}%</span>
                </div>
                <div class="dash-profile-progress-info">
                  <span class="dash-profile-progress-label">Профиль заполнен</span>
                  <button v-if="profilePct < 100" class="dash-profile-fill-btn" @click="section = profileNextSection">Заполнить →</button>
                </div>
              </div>
            </div>

            <div class="dash-quick-nav">
              <button v-for="item in quickActions" :key="item.key" class="dash-quick-btn glass-surface" @click="section = item.key">
                <span class="dash-quick-icon">{{ item.icon }}</span>
                <span class="dash-quick-label">{{ item.label }}</span>
                <span v-if="item.badge" class="dash-quick-badge">{{ item.badge }}</span>
              </button>
            </div>

            <div class="dash-stats">
              <div class="dash-stat glass-surface">
                <div class="dash-stat-val">{{ dashStats.total }}</div>
                <div class="dash-stat-label">Всего задач</div>
              </div>
              <div class="dash-stat glass-surface dash-stat--blue">
                <div class="dash-stat-val">{{ dashStats.inProgress }}</div>
                <div class="dash-stat-label">В работе</div>
              </div>
              <div class="dash-stat glass-surface dash-stat--green">
                <div class="dash-stat-val">{{ dashStats.done }}</div>
                <div class="dash-stat-label">Выполнено</div>
              </div>
              <div class="dash-stat glass-surface" :class="dashStats.overdue ? 'dash-stat--red' : ''">
                <div class="dash-stat-val">{{ dashStats.overdue }}</div>
                <div class="dash-stat-label">Просрочено</div>
              </div>
            </div>

            <div class="dash-progress glass-surface">
              <div class="dash-progress-head">
                <span>Общий прогресс</span>
                <span class="dash-progress-pct">{{ dashStats.total ? Math.round(dashStats.done / dashStats.total * 100) : 0 }}%</span>
              </div>
              <div class="dash-progress-bar-wrap">
                <div class="dash-progress-bar" :style="{ width: dashStats.total ? (dashStats.done / dashStats.total * 100) + '%' : '0%' }" />
              </div>
            </div>

            <div v-if="linkedProjects?.length" class="dash-projects glass-surface">
              <div class="u-section-title">Мои проекты ({{ linkedProjects.length }})</div>
              <div class="dash-projects-grid">
                <div v-for="p in linkedProjects" :key="p.slug" class="dash-project-card">
                  <span class="dash-project-name">{{ p.title }}</span>
                  <span class="dash-project-slug">{{ p.slug }}</span>
                </div>
              </div>
            </div>

            <div v-if="dashDeadlines.length" class="dash-deadlines glass-surface">
              <div class="u-section-title">Ближайшие дедлайны</div>
              <div
                v-for="item in dashDeadlines"
                :key="item.id"
                class="dash-deadline-row"
                :class="{ overdue: isDue(item.dateEnd) }"
              >
                <span class="dash-deadline-dot" :class="isDue(item.dateEnd) ? 'red' : 'amber'" />
                <span class="dash-deadline-title">{{ item.title }}</span>
                <span class="dash-deadline-proj">{{ item.projectTitle }}</span>
                <span class="dash-deadline-date">до {{ item.dateEnd }}</span>
              </div>
            </div>

            <div v-if="dashNoDue.length" class="dash-nodue glass-surface">
              <div class="u-section-title">Без срока ({{ dashNoDue.length }})</div>
              <div v-for="item in dashNoDue" :key="item.id" class="dash-nodue-row">
                <span class="dash-nodue-dot" />
                <span class="dash-nodue-title">{{ item.title }}</span>
                <span class="dash-nodue-proj">{{ item.projectTitle }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="section === 'tasks'">
            <div class="cab-add-task-row">
              <button class="cab-add-task-btn" @click="openNewTaskModal">＋ Добавить задачу</button>
            </div>

            <div v-if="showNewTaskModal" class="u-modal glass-surface">
              <div class="u-modal__head">
                <span class="u-modal__title">Новая задача</span>
                <button class="u-modal__close" @click="showNewTaskModal = false">✕</button>
              </div>
              <div class="u-modal__body">
                <div v-if="contractor?.contractorType === 'company' && staff?.length" class="u-field">
                  <label class="u-field__label">Мастер</label>
                  <select v-model="newTask.masterContractorId" class="glass-input">
                    <option :value="null">— сам подрядчик —</option>
                    <option v-for="m in staff" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Проект *</label>
                  <select v-model="newTask.projectSlug" class="glass-input">
                    <option value="" disabled>— выберите проект —</option>
                    <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Название задачи *</label>
                  <input v-model="newTask.title" class="glass-input" placeholder="Что нужно сделать…" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Вид работ</label>
                  <select v-model="newTask.workType" class="glass-input">
                    <option value="">— не указан —</option>
                    <option v-for="w in CONTRACTOR_WORK_TYPE_OPTIONS" :key="w.value" :value="w.value">{{ w.label }}</option>
                  </select>
                </div>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Дата начала</label>
                    <input v-model="newTask.dateStart" class="glass-input" placeholder="дд.мм.гггг" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Дата окончания</label>
                    <input v-model="newTask.dateEnd" class="glass-input" placeholder="дд.мм.гггг" />
                  </div>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Бюджет</label>
                  <input v-model="newTask.budget" class="glass-input" placeholder="например: 50 000 ₽" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Примечание</label>
                  <textarea v-model="newTask.notes" class="glass-input u-ta" rows="3" placeholder="Уточнения, материалы, особые требования…" />
                </div>
              </div>
              <div class="u-modal__foot">
                <button
                  class="cab-task-save"
                  :disabled="creatingTask || !newTask.projectSlug || !newTask.title.trim()"
                  @click="createTask"
                >{{ creatingTask ? 'Создание…' : 'Создать задачу' }}</button>
                <button class="cab-task-cancel" @click="showNewTaskModal = false">Отмена</button>
              </div>
            </div>

            <div v-if="workItems?.length" class="cab-filters">
              <button
                v-for="f in FILTERS"
                :key="f.value"
                class="cab-filter-btn"
                :class="{ active: statusFilter === f.value }"
                @click="statusFilter = f.value"
              >
                {{ f.label }}
                <span v-if="f.count" class="cab-filter-count">{{ f.count }}</span>
              </button>
            </div>

            <div v-if="!workItems?.length" class="u-empty glass-surface">
              <span>◎</span>
              <p>Задач пока нет.<br>Они появятся когда дизайнер добавит вас к проекту.</p>
            </div>
            <div v-else-if="!byProject.length" class="u-empty glass-surface">
              <span>◉</span>
              <p>Нет задач с выбранным фильтром.</p>
            </div>
            <template v-else>
              <div v-for="proj in byProject" :key="proj.slug" class="cab-project-group">
                <div class="cab-proj-header">
                  <span class="cab-proj-title">{{ proj.title }}</span>
                  <span class="cab-proj-stats">{{ proj.doneCount }} / {{ proj.totalCount }}</span>
                </div>
                <div class="cab-proj-progress">
                  <div class="cab-proj-progress-bar" :style="{ width: proj.totalCount ? (proj.doneCount / proj.totalCount * 100) + '%' : '0%' }" />
                </div>

                <div v-for="wtGroup in proj.wtGroups" :key="wtGroup.workType" class="cab-wt-group">
                  <button class="cab-wt-head" @click="toggleWtGroup(proj.slug, wtGroup.workType)">
                    <span class="cab-wt-icon">{{ isWtGroupOpen(proj.slug, wtGroup.workType) ? '▾' : '▸' }}</span>
                    <span class="cab-wt-name">{{ wtGroup.label }}</span>
                    <span class="cab-wt-count">{{ wtGroup.items.length }} зад.</span>
                    <span v-if="wtGroup.stages.length" class="cab-wt-prog">
                      {{ stagesPct(proj.slug, wtGroup.workType, wtGroup.stages.length) }}% этапов
                    </span>
                  </button>

                  <div v-if="isWtGroupOpen(proj.slug, wtGroup.workType)" class="cab-wt-body">
                    <div class="cab-tasks">
                      <div
                        v-for="item in wtGroup.items"
                        :key="item.id"
                        class="cab-task glass-surface"
                        :class="{ expanded: expandedId === item.id }"
                      >
                        <div class="cab-task-top" @click="toggleExpand(item.id)">
                          <span class="cab-task-expand-icon">{{ expandedId === item.id ? '▾' : '▸' }}</span>
                          <span class="cab-task-name">{{ item.title }}</span>
                          <span v-if="item.assignedToName" class="cab-task-assigned-badge">→ {{ item.assignedToName }}</span>
                          <select
                            :value="item.status"
                            class="u-status-sel"
                            :class="`cab-status--${item.status}`"
                            @click.stop
                            @change="updateStatus(item, ($event.target as HTMLSelectElement).value)"
                          >
                            <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
                          </select>
                        </div>

                        <template v-if="expandedId !== item.id">
                          <div v-if="item.dateStart || item.dateEnd || item.budget" class="cab-task-meta">
                            <span v-if="item.dateStart">с {{ item.dateStart }}</span>
                            <span v-if="item.dateEnd" :class="{ 'cab-task-overdue': isDue(item.dateEnd) && item.status !== 'done' }">по {{ item.dateEnd }}</span>
                            <span v-if="item.budget" class="cab-task-budget">{{ item.budget }}</span>
                          </div>
                          <div class="cab-task-counters">
                            <span v-if="item.photoCount" class="cab-task-counter">📷 {{ item.photoCount }}</span>
                            <span v-if="item.commentCount" class="cab-task-counter">💬 {{ item.commentCount }}</span>
                          </div>
                          <div v-if="item.notes" class="cab-task-notes cab-task-notes--preview">{{ item.notes }}</div>
                        </template>

                        <template v-else>
                          <div class="cab-task-edit">
                            <div class="cab-task-edit-row">
                              <div class="cab-task-edit-field">
                                <label>Дата начала</label>
                                <input v-model="editMap[item.id].dateStart" class="glass-input cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" />
                              </div>
                              <div class="cab-task-edit-field">
                                <label>Дата окончания</label>
                                <input v-model="editMap[item.id].dateEnd" class="glass-input cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" />
                              </div>
                              <div v-if="item.budget" class="cab-task-edit-field">
                                <label>Бюджет</label>
                                <span class="cab-task-budget cab-task-budget--lg">{{ item.budget }}</span>
                              </div>
                            </div>

                            <div class="cab-task-edit-field">
                              <label>Заметка для дизайнера</label>
                              <textarea v-model="editMap[item.id].notes" class="glass-input u-ta" rows="3" placeholder="Статус работ, вопросы, уточнения…" />
                            </div>

                            <div class="cab-task-edit-actions">
                              <button type="button" class="cab-task-save" :disabled="savingItem === item.id" @click.stop="saveTaskDetails(item)">
                                {{ savingItem === item.id ? 'Сохранение…' : 'Сохранить' }}
                              </button>
                              <button type="button" class="cab-task-cancel" @click.stop="expandedId = null">Отмена</button>
                            </div>
                          </div>
                        </template>
                      </div>
                    </div>

                    <div v-if="wtGroup.stages.length" class="cab-stages-inline glass-surface">
                      <div class="cab-stages-inline-head">
                        <span class="cab-stages-inline-title">Технологические этапы</span>
                        <span class="cab-stages-inline-pct">{{ stagesPct(proj.slug, wtGroup.workType, wtGroup.stages.length) }}%</span>
                      </div>
                      <div class="cab-stages-inline-bar-wrap">
                        <div class="cab-stages-inline-bar" :style="{ width: stagesPct(proj.slug, wtGroup.workType, wtGroup.stages.length) + '%' }" />
                      </div>
                      <div
                        v-for="(stage, idx) in wtGroup.stages"
                        :key="stage.key"
                        class="cab-stage-check-row"
                        :class="{ done: isStageDone(proj.slug, wtGroup.workType, stage.key) }"
                        @click="toggleStage(proj.slug, wtGroup.workType, stage.key)"
                      >
                        <span class="cab-stage-check-icon">{{ isStageDone(proj.slug, wtGroup.workType, stage.key) ? '✓' : '○' }}</span>
                        <span class="cab-stage-num">{{ idx + 1 }}</span>
                        <span class="cab-stage-label">{{ stage.label }}</span>
                        <span v-if="stage.hint" class="cab-stage-hint">{{ stage.hint }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <template v-else-if="section === 'contacts'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="u-form-section">
                <h3>Основные контакты</h3>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Имя / название</label>
                    <input v-model="form.name" class="glass-input" required />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Компания</label>
                    <input v-model="form.companyName" class="glass-input" placeholder="ООО / ИП…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Телефон</label>
                    <input v-model="form.phone" class="glass-input" type="tel" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Email</label>
                    <input v-model="form.email" class="glass-input" type="email" placeholder="mail@example.com" />
                  </div>
                </div>
              </div>

              <div class="u-form-foot">
                <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <template v-else-if="section === 'passport'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="u-form-section">
                <h3>Паспорт гражданина РФ</h3>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Серия</label>
                    <input v-model="form.passportSeries" class="glass-input" placeholder="00 00" maxlength="5" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Номер</label>
                    <input v-model="form.passportNumber" class="glass-input" placeholder="000000" maxlength="7" />
                  </div>
                  <div class="u-field u-field--full">
                    <label class="u-field__label">Кем выдан</label>
                    <input v-model="form.passportIssuedBy" class="glass-input" placeholder="ОВД района…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Дата выдачи</label>
                    <input v-model="form.passportIssueDate" class="glass-input" placeholder="дд.мм.гггг" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Код подразделения</label>
                    <input v-model="form.passportDepartmentCode" class="glass-input" placeholder="000-000" maxlength="7" />
                  </div>
                </div>
              </div>

              <div class="u-form-section">
                <h3>Персональные данные</h3>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Дата рождения</label>
                    <input v-model="form.birthDate" class="glass-input" placeholder="дд.мм.гггг" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Место рождения</label>
                    <input v-model="form.birthPlace" class="glass-input" placeholder="г. Москва" />
                  </div>
                  <div class="u-field u-field--full">
                    <label class="u-field__label">Адрес регистрации</label>
                    <input v-model="form.registrationAddress" class="glass-input" placeholder="Адрес по прописке" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">СНИЛС</label>
                    <input v-model="form.snils" class="glass-input" placeholder="000-000-000 00" maxlength="14" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">ИНН</label>
                    <input v-model="form.inn" class="glass-input" placeholder="000000000000" maxlength="12" />
                  </div>
                </div>
              </div>

              <div class="u-form-foot">
                <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <template v-else-if="section === 'requisites'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="u-form-section">
                <h3>Юридические данные</h3>
                <div class="u-grid-2">
                  <div class="u-field">
                    <label>ИНН</label>
                    <input v-model="form.inn" class="glass-input" placeholder="000000000000" maxlength="12" />
                  </div>
                  <div class="u-field">
                    <label>КПП</label>
                    <input v-model="form.kpp" class="glass-input" placeholder="000000000" maxlength="9" />
                  </div>
                  <div class="u-field">
                    <label>ОГРН / ОГРНИП</label>
                    <input v-model="form.ogrn" class="glass-input" placeholder="0000000000000" maxlength="15" />
                  </div>
                  <div class="u-field u-field--full">
                    <label>Юридический адрес</label>
                    <input v-model="form.legalAddress" class="glass-input" placeholder="Адрес регистрации ИП / ООО" />
                  </div>
                  <div class="u-field u-field--full">
                    <label>Фактический адрес</label>
                    <input v-model="form.factAddress" class="glass-input" placeholder="Адрес ведения деятельности" />
                  </div>
                </div>
              </div>

              <div class="u-form-section">
                <h3>Банковские реквизиты</h3>
                <div class="u-grid-2">
                  <div class="u-field u-field--full">
                    <label>Наименование банка</label>
                    <input v-model="form.bankName" class="glass-input" placeholder="ПАО Сбербанк" />
                  </div>
                  <div class="u-field">
                    <label>БИК</label>
                    <input v-model="form.bik" class="glass-input" placeholder="000000000" maxlength="9" />
                  </div>
                  <div class="u-field">
                    <label>Расчётный счёт</label>
                    <input v-model="form.settlementAccount" class="glass-input" placeholder="00000000000000000000" maxlength="20" />
                  </div>
                  <div class="u-field">
                    <label>Корреспондентский счёт</label>
                    <input v-model="form.correspondentAccount" class="glass-input" placeholder="00000000000000000000" maxlength="20" />
                  </div>
                </div>
              </div>

              <div class="u-form-foot">
                <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <template v-else-if="section === 'documents'">
            <div class="u-grid-2" style="margin-bottom:12px">
              <div class="u-field">
                <label>Поиск</label>
                <input v-model="docsSearch" class="glass-input" placeholder="Название, заметка" />
              </div>
              <div class="u-field">
                <label>Категория</label>
                <select v-model="docsFilter" class="glass-input cab-select">
                  <option value="">Все категории</option>
                  <option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
                </select>
              </div>
              <div class="u-field">
                <label>Сортировка</label>
                <select v-model="docsSort" class="glass-input cab-select">
                  <option value="new">Сначала новые</option>
                  <option value="old">Сначала старые</option>
                </select>
              </div>
            </div>

            <div class="u-form-section">
              <h3>Загрузить документ</h3>
              <div class="u-grid-2">
                <div class="u-field">
                  <label>Название</label>
                  <input v-model="newDocTitle" class="glass-input" placeholder="Название документа" />
                </div>
                <div class="u-field">
                  <label>Категория</label>
                  <select v-model="newDocCategory" class="glass-input cab-select">
                    <option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
                  </select>
                </div>
                <div class="u-field u-field--full">
                  <label>Примечание</label>
                  <input v-model="newDocNotes" class="glass-input" placeholder="Необязательно" />
                </div>
              </div>
              <div style="margin-top: 12px;">
                <label class="cab-upload-btn">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple style="display:none" @change="uploadDoc" />
                  {{ docUploading ? 'Загрузка…' : '＋ Выбрать файл' }}
                </label>
              </div>
            </div>

            <div v-if="filteredContractorDocs.length" class="cab-docs-list">
              <div v-for="doc in filteredContractorDocs" :key="doc.id" class="cab-doc-card glass-surface">
                <div class="cab-doc-icon">📎</div>
                <div class="cab-doc-info">
                  <div class="cab-doc-title">{{ doc.title }}</div>
                  <div class="cab-doc-meta">
                    <span class="cab-doc-cat">{{ DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category }}</span>
                    <span v-if="doc.notes" class="cab-doc-notes">{{ doc.notes }}</span>
                    <span v-if="doc.expiresAt" class="cab-doc-expires">до {{ doc.expiresAt }}</span>
                    <span v-if="doc.createdAt" class="cab-doc-notes">{{ formatDocDate(doc.createdAt) }}</span>
                  </div>
                </div>
                <div class="cab-doc-actions">
                  <a v-if="doc.url" :href="doc.url" target="_blank" class="cab-doc-link">Скачать</a>
                  <button class="cab-doc-del" @click="deleteDoc(doc.id)">✕</button>
                </div>
              </div>
            </div>
            <div v-else-if="contractorDocs?.length" class="u-empty glass-surface">
              <span>🔎</span>
              <p>По фильтру ничего не найдено.</p>
            </div>
            <div v-else class="u-empty glass-surface">
              <span>📂</span>
              <p>Документов пока нет.<br>Загрузите паспорт, лицензии, сертификаты и другие документы.</p>
            </div>
          </template>

          <template v-else-if="section === 'specialization'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="u-form-section">
                <h3>Роль / профессия</h3>
                <div class="u-field u-field--full">
                  <div v-for="group in ROLE_GROUPS" :key="group.label" class="u-tag-group">
                    <div class="u-tag-group__label">{{ group.label }}</div>
                    <div class="u-tags">
                      <button
                        v-for="r in group.items"
                        :key="`role-${group.label}-${r.value}`"
                        type="button"
                        class="u-tag u-tag--picker"
                        :class="{ 'u-tag--active': form.roleTypes.includes(r.value) }"
                        @click="toggleArr(form.roleTypes, r.value)"
                      >{{ r.label }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="u-form-section">
                <h3>Виды работ</h3>
                <div class="u-field u-field--full">
                  <div v-for="group in WORK_GROUPS" :key="group.label" class="u-tag-group">
                    <div class="u-tag-group__label">{{ group.label }}</div>
                    <div class="u-tags">
                      <button
                        v-for="w in group.items"
                        :key="`work-${group.label}-${w.value}`"
                        type="button"
                        class="u-tag u-tag--picker"
                        :class="{ 'u-tag--active': form.workTypes.includes(w.value) }"
                        @click="toggleArr(form.workTypes, w.value)"
                      >{{ w.label }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="u-form-foot">
                <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <template v-else-if="section === 'finances'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="u-form-section">
                <h3>Система налогообложения</h3>
                <div class="u-grid-2">
                  <div class="u-field">
                    <label>СНО</label>
                    <select v-model="form.taxSystem" class="glass-input cab-select">
                      <option value="">— не указана —</option>
                      <option value="osn">ОСН (общая)</option>
                      <option value="usn6">УСН 6%</option>
                      <option value="usn15">УСН 15%</option>
                      <option value="patent">Патент</option>
                      <option value="npd">НПД (самозанятый)</option>
                      <option value="other">Другая</option>
                    </select>
                  </div>
                  <div class="u-field">
                    <label>Ставка / стоимость часа</label>
                    <input v-model="form.hourlyRate" class="glass-input" placeholder="2 500 ₽/час" />
                  </div>
                </div>
              </div>

              <div class="u-form-section">
                <h3>Способы оплаты</h3>
                <div class="u-tags">
                  <button
                    v-for="pm in PAYMENT_METHOD_OPTIONS"
                    :key="`pay-${pm.value}`"
                    type="button"
                    class="u-tag u-tag--picker"
                    :class="{ 'u-tag--active': form.paymentMethods.includes(pm.value) }"
                    @click="toggleArr(form.paymentMethods, pm.value)"
                  >{{ pm.label }}</button>
                </div>
              </div>

              <div class="u-form-section">
                <h3>Сертификаты и допуски</h3>
                <div class="cab-certs-list">
                  <div v-for="(cert, idx) in form.certifications" :key="idx" class="cab-cert-item">
                    <span>{{ cert }}</span>
                    <button type="button" class="cab-cert-del" @click="removeCert(idx)">✕</button>
                  </div>
                </div>
                <div class="cab-cert-add">
                  <input v-model="newCert" class="glass-input" placeholder="Новый сертификат / допуск" @keydown.enter.prevent="addCert" />
                  <button type="button" class="cab-task-save" @click="addCert">+</button>
                </div>
              </div>

              <div class="u-form-foot">
                <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <template v-else-if="section === 'portfolio'">
            <div class="cab-portfolio-stats glass-surface">
              <div class="cab-portfolio-stat">
                <span class="cab-portfolio-stat-val">{{ portfolioStats.doneCount }}</span>
                <span class="cab-portfolio-stat-label">Выполнено задач</span>
              </div>
              <div class="cab-portfolio-stat">
                <span class="cab-portfolio-stat-val">{{ portfolioStats.projectCount }}</span>
                <span class="cab-portfolio-stat-label">Проектов</span>
              </div>
              <div class="cab-portfolio-stat">
                <span class="cab-portfolio-stat-val">{{ portfolioStats.photoCount }}</span>
                <span class="cab-portfolio-stat-label">Фотографий</span>
              </div>
              <div class="cab-portfolio-stat">
                <span class="cab-portfolio-stat-val">{{ contractor?.experienceYears || '—' }}</span>
                <span class="cab-portfolio-stat-label">Лет опыта</span>
              </div>
            </div>

            <div class="u-form-section">
              <h3>Выполненные работы</h3>
              <div class="cab-portfolio-grid">
                <div v-for="proj in byProject" :key="proj.slug" class="cab-portfolio-proj glass-surface">
                  <div class="cab-portfolio-proj-head">
                    <span class="cab-portfolio-proj-title">{{ proj.title }}</span>
                    <span class="cab-portfolio-proj-progress">{{ proj.doneCount }}/{{ proj.totalCount }}</span>
                  </div>
                  <div v-for="wt in proj.wtGroups" :key="wt.workType">
                    <div v-for="item in wt.items.filter(i => i.status === 'done')" :key="item.id" class="cab-portfolio-item">
                      <span class="cab-portfolio-item-check">✓</span>
                      <span class="cab-portfolio-item-name">{{ item.title }}</span>
                      <span class="cab-portfolio-item-wt">{{ wt.label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="section === 'settings'">
            <div class="u-form-section">
              <h3>Аккаунт</h3>
              <div class="u-grid-2">
                <div class="u-field">
                  <label>ID</label>
                  <div class="cab-field-static">{{ contractorId }}</div>
                </div>
                <div class="u-field">
                  <label>Slug (ссылка для входа)</label>
                  <div class="cab-field-static cab-field-slug">{{ contractor?.slug }}</div>
                </div>
                <div class="u-field">
                  <label>Тип</label>
                  <div class="cab-field-static">{{ contractor?.contractorType === 'company' ? 'Компания-подрядчик' : 'Мастер' }}</div>
                </div>
              </div>
            </div>

            <div class="u-form-section">
              <h3>Уведомления</h3>
              <div class="cab-settings-toggles">
                <label class="cab-toggle-row">
                  <input type="checkbox" v-model="notifSettings.newTasks" class="cab-toggle-checkbox" />
                  <span class="cab-toggle-label">Новые задачи</span>
                  <span class="cab-toggle-hint">Уведомлять о назначении новых задач</span>
                </label>
                <label class="cab-toggle-row">
                  <input type="checkbox" v-model="notifSettings.deadlines" class="cab-toggle-checkbox" />
                  <span class="cab-toggle-label">Дедлайны</span>
                  <span class="cab-toggle-hint">Напоминание за 1 день до срока</span>
                </label>
              </div>
              <button class="a-btn-sm" style="margin-top:12px" @click="saveNotifSettings">Сохранить настройки</button>
            </div>
          </template>

          <template v-else-if="section === 'staff'">
            <div v-if="!staff?.length" class="u-empty glass-surface">
              <span>◔</span>
              <p>Сотрудников пока нет.<br>Администратор добавит мастеров за вашей компанией.</p>
            </div>
            <div v-else class="cab-staff-list">
              <NuxtLink
                v-for="m in staff"
                :key="m.id"
                :to="`/contractor/${m.id}`"
                class="cab-staff-card glass-surface"
              >
                <div class="cab-staff-avatar">◑</div>
                <div class="cab-staff-info">
                  <div class="cab-staff-name">{{ m.name }}</div>
                  <div v-if="m.workTypes?.length" class="cab-staff-wt">
                    {{ m.workTypes.slice(0, 3).map((w: string) => workTypeLabel(w)).join(' · ') }}
                  </div>
                </div>
                <div class="cab-staff-arrow">›</div>
              </NuxtLink>
            </div>
          </template>

          <template v-else>
            <div class="u-empty glass-surface">
              <span>◔</span>
              <p>Раздел в процессе переноса.<br>Продолжаю дописывать его по частям.</p>
            </div>
          </template>
        </div>
      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  useContractorCabinet,
  STATUSES,
  PAYMENT_METHOD_OPTIONS,
  DOC_CATEGORIES,
  ROLE_GROUPS,
  WORK_GROUPS,
} from '~/composables/useContractorCabinet'

const props = defineProps<{
  contractorId: number | null
  hideNav?: boolean
  modelSection?: string
}>()
const emit = defineEmits<{ 'update:section': [string] }>()

const contractorIdRef = computed(() => props.contractorId)

const {
  contractor,
  pending,
  staff,
  workItems,
  linkedProjects,
  contractorDocs,
  form,
  section,
  nav,
  saving,
  saveMsg,
  saveProfile,
  statusFilter,
  expandedId,
  savingItem,
  editMap,
  FILTERS,
  byProject,
  activeCount,
  toggleExpand,
  updateStatus,
  saveTaskDetails,
  isWtGroupOpen,
  toggleWtGroup,
  isStageDone,
  toggleStage,
  stagesPct,
  dashStats,
  dashDeadlines,
  dashNoDue,
  profilePct,
  profileNextSection,
  quickActions,
  isDue,
  portfolioStats,
  docUploading,
  newDocTitle,
  newDocCategory,
  newDocNotes,
  uploadDoc,
  deleteDoc,
  toggleArr,
  newCert,
  addCert,
  removeCert,
  notifSettings,
  saveNotifSettings,
  workTypeLabel,
  showNewTaskModal,
  creatingTask,
  newTask,
  allProjects,
  CONTRACTOR_WORK_TYPE_OPTIONS,
  openNewTaskModal,
  createTask,
} = useContractorCabinet(contractorIdRef)

// ── 2-layer sidebar: accept section from parent page ──
watch(() => props.modelSection, v => { if (v && v !== section.value) section.value = v })
watch(section, v => emit('update:section', v))
defineExpose({ nav, section, activeCount, staffCount: computed(() => staff.value?.length ?? 0), docsCount: computed(() => (contractorDocs.value ?? []).length) })

const docsSearch = ref('')
const docsFilter = ref('')
const docsSort = ref<'new' | 'old'>('new')
const filteredContractorDocs = computed(() => {
  const rows = contractorDocs.value || []
  const q = docsSearch.value.trim().toLowerCase()
  return rows.filter((doc: any) => {
    const byCategory = !docsFilter.value || doc.category === docsFilter.value
    if (!byCategory) return false
    if (!q) return true
    const hay = `${doc.title || ''} ${doc.notes || ''} ${doc.category || ''}`.toLowerCase()
    return hay.includes(q)
  }).slice().sort((a: any, b: any) => {
    const at = new Date(a.createdAt || 0).getTime()
    const bt = new Date(b.createdAt || 0).getTime()
    return docsSort.value === 'new' ? bt - at : at - bt
  })
})

function formatDocDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU')
}
</script>

<style scoped>
.cab-embed { min-height: 420px; }
.cab-select { appearance: none; cursor: pointer; }
.cab-inline-task-window { margin-bottom: 14px; border-radius: var(--card-radius, 16px); overflow: hidden; }

.u-tag-subtitle {
  font-size: .66rem; text-transform: uppercase; letter-spacing: .08em;
  color: var(--glass-text); opacity: .5; margin-bottom: 6px;
}
.u-tag--picker {
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  border-radius: 999px; padding: 6px 12px; font-size: .8rem;
  font-weight: 600; cursor: pointer; transition: all .18s ease;
}
.u-tag--picker:hover { opacity: .92; }
.u-tag--active {
  background: color-mix(in srgb, var(--ds-accent, #4a80f0) 14%, transparent);
  border-color: color-mix(in srgb, var(--ds-accent, #4a80f0) 40%, var(--glass-border));
  color: var(--ds-accent, #4a80f0);
}
.tag-shift-move, .tag-shift-enter-active, .tag-shift-leave-active { transition: all .22s ease; }
.tag-shift-enter-from, .tag-shift-leave-to { opacity: 0; transform: translateY(8px) scale(.97); }
</style>
