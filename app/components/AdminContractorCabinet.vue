<template>
  <div class="cab-embed" v-if="contractorId">
    <div v-if="pending" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="contractor" class="cab-body">
      <aside class="cab-sidebar glass-surface std-sidenav">
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
            <div v-if="contractor?.contractorType === 'company' && staff?.length" class="cab-add-task-row">
              <button class="cab-add-task-btn" @click="openNewTaskModal">＋ Добавить задачу мастеру</button>
            </div>

            <div v-if="showNewTaskModal" class="u-modal glass-surface">
              <div class="u-modal__head">
                <span class="u-modal__title">Новая задача мастеру</span>
                <button class="u-modal__close" @click="showNewTaskModal = false">✕</button>
              </div>
              <div class="u-modal__body">
                <div class="u-field">
                  <label class="u-field__label">Мастер *</label>
                  <select v-model="newTask.masterContractorId" class="glass-input">
                    <option :value="null" disabled>— выберите мастера —</option>
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
                  :disabled="creatingTask || !newTask.masterContractorId || !newTask.projectSlug || !newTask.title.trim()"
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
                    <div class="u-tag-subtitle">Выбрано</div>
                    <TransitionGroup name="tag-shift" tag="div" class="u-tags u-tags--selected">
                      <button
                        v-for="r in group.items.filter((item) => form.roleTypes.includes(item.value))"
                        :key="`role-selected-${group.label}-${r.value}`"
                        type="button"
                        class="u-tag u-tag--picker u-tag--active"
                        @click="toggleArr(form.roleTypes, r.value)"
                      >#{{ r.label }}</button>
                    </TransitionGroup>
                    <div class="u-tag-subtitle" style="margin-top:8px">Доступно</div>
                    <TransitionGroup name="tag-shift" tag="div" class="u-tags u-tags--available">
                      <button
                        v-for="r in group.items.filter((item) => !form.roleTypes.includes(item.value))"
                        :key="`role-available-${group.label}-${r.value}`"
                        type="button"
                        class="u-tag u-tag--picker"
                        @click="toggleArr(form.roleTypes, r.value)"
                      >#{{ r.label }}</button>
                    </TransitionGroup>
                  </div>
                </div>
              </div>

              <div class="u-form-section">
                <h3>Виды работ</h3>
                <div class="u-field u-field--full">
                  <div v-for="group in WORK_GROUPS" :key="group.label" class="u-tag-group">
                    <div class="u-tag-group__label">{{ group.label }}</div>
                    <div class="u-tag-subtitle">Выбрано</div>
                    <TransitionGroup name="tag-shift" tag="div" class="u-tags u-tags--selected">
                      <button
                        v-for="w in group.items.filter((item) => form.workTypes.includes(item.value))"
                        :key="`work-selected-${group.label}-${w.value}`"
                        type="button"
                        class="u-tag u-tag--picker u-tag--active"
                        @click="toggleArr(form.workTypes, w.value)"
                      >#{{ w.label }}</button>
                    </TransitionGroup>
                    <div class="u-tag-subtitle" style="margin-top:8px">Доступно</div>
                    <TransitionGroup name="tag-shift" tag="div" class="u-tags u-tags--available">
                      <button
                        v-for="w in group.items.filter((item) => !form.workTypes.includes(item.value))"
                        :key="`work-available-${group.label}-${w.value}`"
                        type="button"
                        class="u-tag u-tag--picker"
                        @click="toggleArr(form.workTypes, w.value)"
                      >#{{ w.label }}</button>
                    </TransitionGroup>
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
                <div class="u-tag-subtitle">Выбрано</div>
                <TransitionGroup name="tag-shift" tag="div" class="u-tags u-tags--selected">
                  <button
                    v-for="pm in PAYMENT_METHOD_OPTIONS.filter((item) => form.paymentMethods.includes(item.value))"
                    :key="`pay-selected-${pm.value}`"
                    type="button"
                    class="u-tag u-tag--picker u-tag--active"
                    @click="toggleArr(form.paymentMethods, pm.value)"
                  >#{{ pm.label }}</button>
                </TransitionGroup>
                <div class="u-tag-subtitle" style="margin-top:8px">Доступно</div>
                <TransitionGroup name="tag-shift" tag="div" class="u-tags u-tags--available">
                  <button
                    v-for="pm in PAYMENT_METHOD_OPTIONS.filter((item) => !form.paymentMethods.includes(item.value))"
                    :key="pm.value"
                    type="button"
                    class="u-tag u-tag--picker"
                    @click="toggleArr(form.paymentMethods, pm.value)"
                  >#{{ pm.label }}</button>
                </TransitionGroup>
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
}>()

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
.cab-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  opacity: .5;
  font-size: 1.1rem;
}
.cab-body {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.cab-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-radius: 16px;
  padding: 12px 0;
  position: sticky;
  top: 84px;
}
.cab-nav { display: flex; flex-direction: column; }
.cab-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: .8rem;
  color: var(--glass-text, #1a1a2e);
  opacity: .64;
  border-radius: 9px;
}
.cab-nav-item.active { opacity: 1; font-weight: 600; }
.cab-nav-icon { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }
.cab-main { flex: 1; min-width: 0; }
.cab-inner { max-width: 980px; }

.cab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
  opacity: .55;
  border: 1px dashed var(--glass-border, rgba(255,255,255,.3));
  border-radius: 16px;
}
.cab-empty-icon { font-size: 2rem; margin-bottom: 10px; }

.cab-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.cab-filter-btn {
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid var(--glass-border, rgba(255,255,255,.3));
  background: var(--glass-bg, rgba(255,255,255,.2));
  font-size: .8rem;
  cursor: pointer;
}
.cab-filter-btn.active { background: rgba(100,110,200,.18); font-weight: 600; }
.cab-filter-count { margin-left: 4px; font-size: .7rem; font-weight: 700; }

.cab-project-group { margin-bottom: 28px; }
.cab-proj-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.cab-proj-title { font-size: .72rem; text-transform: uppercase; letter-spacing: 1.2px; opacity: .5; }
.cab-proj-stats { font-size: .7rem; opacity: .4; }
.cab-proj-progress { height: 3px; background: rgba(255,255,255,.18); border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
.cab-proj-progress-bar { height: 100%; background: rgba(40,160,100,.6); }

.cab-wt-group { margin-bottom: 14px; }
.cab-wt-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: var(--glass-bg, rgba(255,255,255,.28));
  border: none;
  border-radius: 10px;
  font-size: .85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  margin-bottom: 6px;
}
.cab-wt-icon { font-size: .65rem; opacity: .45; width: 12px; }
.cab-wt-name { flex: 1; }
.cab-wt-count { font-size: .73rem; opacity: .45; font-weight: 400; }
.cab-wt-prog { font-size: .73rem; font-weight: 700; color: #228855; }

.cab-tasks { display: flex; flex-direction: column; gap: 10px; }
.cab-task { border-radius: 12px; padding: 14px 18px; display: flex; flex-direction: column; gap: 6px; }
.cab-task-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; cursor: pointer; }
.cab-task-expand-icon { font-size: .7rem; opacity: .45; width: 12px; }
.cab-task-name { font-size: .9rem; font-weight: 600; flex: 1; }
.cab-task-meta { font-size: .78rem; opacity: .6; display: flex; gap: 8px; flex-wrap: wrap; }
.cab-task-overdue { color: #e05252; font-weight: 700; }
.cab-task-counters { display: flex; gap: 8px; margin-top: 4px; }
.cab-task-counter { font-size: .75rem; opacity: .65; }
.cab-task-notes { font-size: .82rem; opacity: .65; line-height: 1.5; }
.cab-task-notes--preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.cab-task-edit { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.15); margin-top: 6px; }
.cab-task-edit-row { display: flex; gap: 12px; flex-wrap: wrap; }
.cab-task-edit-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; }
.cab-task-edit-field label { font-size: .72rem; opacity: .5; }
.cab-task-edit-actions { display: flex; gap: 10px; align-items: center; }
.cab-task-save {
  cursor: pointer;
  padding: 5px 18px;
  border-radius: 20px;
  font-size: .82rem;
  font-weight: 600;
  background: rgba(255,255,255,.35);
  border: 1px solid rgba(180,180,220,.45);
}
.cab-task-cancel { background: none; border: none; cursor: pointer; opacity: .6; }

.u-tag-subtitle {
  font-size: .66rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--glass-text, #1a1a2e);
  opacity: .5;
  margin-bottom: 6px;
}
.u-tag--picker {
  border: 1px solid var(--glass-border, rgba(255,255,255,.3));
  background: var(--glass-bg, rgba(255,255,255,.2));
  border-radius: 999px;
  padding: 6px 12px;
  font-size: .8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all .18s ease;
}
.u-tag--picker:hover { opacity: .92; }
.u-tag--active {
  background: color-mix(in srgb, var(--ds-accent, #4a80f0) 14%, transparent);
  border-color: color-mix(in srgb, var(--ds-accent, #4a80f0) 40%, var(--glass-border, rgba(255,255,255,.3)));
  color: var(--ds-accent, #4a80f0);
}
.tag-shift-move,
.tag-shift-enter-active,
.tag-shift-leave-active {
  transition: all .22s ease;
}
.tag-shift-enter-from,
.tag-shift-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(.97);
}

.cab-task-stage-badge { background: rgba(240,180,30,.14); border: 1px solid rgba(220,160,20,.3); }
.cab-task-assigned-badge { background: rgba(80,140,255,.1); border: 1px solid rgba(80,140,255,.25); }

.cab-select { appearance: none; cursor: pointer; }

.cab-upload-btn {
  display: inline-flex;
  align-items: center;
  padding: 7px 18px;
  border-radius: 20px;
  font-size: .85rem;
  font-weight: 600;
  color: #4a80f0;
  background: rgba(74,128,240,.1);
  border: 1px solid rgba(74,128,240,.25);
  cursor: pointer;
}

.cab-docs-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.cab-doc-card { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 12px; }
.cab-doc-icon { font-size: 1.4rem; flex-shrink: 0; }
.cab-doc-info { flex: 1; min-width: 0; }
.cab-doc-title { font-size: .9rem; font-weight: 600; margin-bottom: 3px; }
.cab-doc-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: .75rem; opacity: .6; }
.cab-doc-cat { display: inline-block; padding: 1px 8px; border-radius: 10px; background: rgba(100,110,200,.12); font-weight: 600; }
.cab-doc-expires { color: #c05818; font-weight: 600; }
.cab-doc-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.cab-doc-link { font-size: .8rem; padding: 4px 12px; border-radius: 20px; background: rgba(74,128,240,.1); border: 1px solid rgba(74,128,240,.25); color: #4a80f0; text-decoration: none; font-weight: 600; }
.cab-doc-del { background: rgba(200,50,50,.08); border: 1px solid rgba(200,50,50,.2); color: #bb3333; width: 28px; height: 28px; border-radius: 50%; font-size: .7rem; cursor: pointer; }

.cab-certs-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.cab-cert-item { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; background: rgba(100,110,200,.12); font-size: .82rem; font-weight: 500; }
.cab-cert-del { background: none; border: none; font-size: .65rem; cursor: pointer; opacity: .5; }
.cab-cert-add { display: flex; gap: 8px; align-items: center; }
.cab-cert-add .glass-input { flex: 1; }

.cab-portfolio-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; padding: 20px 16px 16px; border-radius: 16px; text-align: center; }
.cab-portfolio-stat-val { font-size: 1.8rem; font-weight: 800; line-height: 1; color: #4a80f0; display: block; }
.cab-portfolio-stat-label { font-size: .72rem; opacity: .5; margin-top: 4px; display: block; }
.cab-portfolio-grid { display: flex; flex-direction: column; gap: 14px; }
.cab-portfolio-proj { padding: 14px 18px; border-radius: 14px; }
.cab-portfolio-proj-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cab-portfolio-proj-title { font-size: .92rem; font-weight: 700; }
.cab-portfolio-proj-progress { font-size: .78rem; font-weight: 600; opacity: .5; }
.cab-portfolio-item { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px; background: rgba(74,128,240,.04); margin-bottom: 4px; }
.cab-portfolio-item-check { color: #2ea86a; font-weight: 700; font-size: .9rem; }
.cab-portfolio-item-name { font-size: .88rem; font-weight: 500; flex: 1; }
.cab-portfolio-item-wt { font-size: .72rem; opacity: .4; }

.cab-field-static { font-size: .9rem; padding: 8px 0; opacity: .7; font-weight: 500; }
.cab-field-slug { font-family: monospace; letter-spacing: .04em; opacity: .85; }
.cab-settings-toggles { display: flex; flex-direction: column; gap: 2px; }
.cab-toggle-row { display: grid; grid-template-columns: 28px 1fr; grid-template-rows: auto auto; column-gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; }
.cab-toggle-checkbox { grid-row: 1 / 3; margin-top: 2px; }
.cab-toggle-label { font-size: .88rem; font-weight: 600; }
.cab-toggle-hint { font-size: .76rem; opacity: .45; grid-column: 2; }

.cab-staff-list { display: flex; flex-direction: column; gap: 10px; }
.cab-staff-card { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: 14px; text-decoration: none; color: var(--glass-text, #1a1a2e); }
.cab-staff-avatar { width: 42px; height: 42px; border-radius: 50%; background: rgba(100,110,200,.15); border: 1px solid rgba(100,110,200,.25); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.cab-staff-info { flex: 1; min-width: 0; }
.cab-staff-name { font-size: .92rem; font-weight: 600; margin-bottom: 3px; }
.cab-staff-wt { font-size: .75rem; opacity: .55; margin-bottom: 4px; }
.cab-staff-arrow { font-size: 1.4rem; opacity: .25; line-height: 1; }

.cab-add-task-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.cab-add-task-btn {
  background: rgba(99,179,237,.18);
  border: 1px solid rgba(99,179,237,.4);
  border-radius: 20px;
  padding: 7px 18px;
  font-size: .88rem;
  font-weight: 600;
  cursor: pointer;
}

.cab-inline-task-window { margin-bottom: 14px; border-radius: 16px; overflow: hidden; }
.cab-modal-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.cab-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.cab-modal { width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; border-radius: 20px; }
.cab-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--glass-border, rgba(255,255,255,.2)); }
.cab-modal-title { font-size: 1rem; font-weight: 700; }
.cab-modal-close { background: none; border: none; font-size: 1rem; cursor: pointer; opacity: .5; }
.cab-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.cab-modal-foot { padding: 16px 24px 20px; display: flex; gap: 10px; border-top: 1px solid var(--glass-border, rgba(255,255,255,.2)); }

.dash-welcome { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-radius: 16px; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.dash-welcome-left { display: flex; align-items: center; gap: 14px; }
.dash-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #4a80f0, #6c47ff); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.4rem; font-weight: 800; }
.dash-welcome-name { font-size: 1.15rem; font-weight: 700; }
.dash-welcome-role { font-size: .82rem; opacity: .55; margin-top: 2px; }

.dash-profile-progress { display: flex; align-items: center; gap: 12px; }
.dash-profile-pct-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: conic-gradient(#4a80f0 calc(var(--pct) * 1%), rgba(0,0,0,.08) 0);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.dash-profile-pct-ring::after { content: ''; position: absolute; width: 40px; height: 40px; border-radius: 50%; background: var(--glass-bg, #fff); }
.dash-profile-pct-val { position: relative; z-index: 1; font-size: .72rem; font-weight: 800; }
.dash-profile-progress-info { display: flex; flex-direction: column; gap: 2px; }
.dash-profile-progress-label { font-size: .78rem; opacity: .6; font-weight: 500; }
.dash-profile-fill-btn { background: none; border: none; color: #4a80f0; cursor: pointer; font-size: .78rem; font-weight: 600; padding: 0; text-align: left; }

.dash-quick-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.dash-quick-btn { display: flex; flex-direction: column; align-items: center; padding: 14px 10px 12px; border-radius: 14px; border: none; cursor: pointer; gap: 6px; position: relative; }
.dash-quick-icon { font-size: 1.4rem; }
.dash-quick-label { font-size: .78rem; font-weight: 600; opacity: .7; }
.dash-quick-badge { position: absolute; top: 6px; right: 8px; background: #4a80f0; color: #fff; font-size: .65rem; font-weight: 700; padding: 1px 6px; border-radius: 99px; }

.dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.dash-stat { padding: 20px 16px 16px; border-radius: 16px; text-align: center; }
.dash-stat-val { font-size: 2rem; font-weight: 800; line-height: 1; }
.dash-stat-label { font-size: .75rem; opacity: .6; margin-top: 6px; }
.dash-stat--blue .dash-stat-val { color: #4a80f0; }
.dash-stat--green .dash-stat-val { color: #2ea86a; }
.dash-stat--red .dash-stat-val { color: #e05252; }

.dash-progress { padding: 16px 20px; border-radius: 14px; margin-bottom: 16px; }
.dash-progress-head { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: .9rem; font-weight: 600; }
.dash-progress-bar-wrap { height: 8px; background: rgba(0,0,0,.07); border-radius: 99px; overflow: hidden; }
.dash-progress-bar { height: 100%; background: linear-gradient(90deg, #4a80f0, #6c47ff); border-radius: 99px; }
.dash-section-title { font-size: .8rem; font-weight: 700; text-transform: uppercase; opacity: .5; margin-bottom: 10px; }

.dash-projects, .dash-deadlines, .dash-nodue { padding: 16px 20px; border-radius: 14px; margin-bottom: 14px; }
.dash-projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.dash-project-card { display: flex; flex-direction: column; padding: 12px 14px; border-radius: 10px; background: rgba(74,128,240,.06); border: 1px solid var(--glass-border, rgba(0,0,0,.06)); }
.dash-project-name { font-size: .88rem; font-weight: 600; }
.dash-project-slug { font-size: .72rem; opacity: .4; margin-top: 2px; }

.dash-deadline-row, .dash-nodue-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--glass-border, rgba(0,0,0,.06)); font-size: .88rem; }
.dash-deadline-row:last-child, .dash-nodue-row:last-child { border-bottom: none; }
.dash-deadline-row.overdue .dash-deadline-title { color: #e05252; }
.dash-deadline-dot, .dash-nodue-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: rgba(0,0,0,.15); }
.dash-deadline-dot.red { background: #e05252; }
.dash-deadline-dot.amber { background: #f0a030; }
.dash-deadline-title { flex: 1; font-weight: 500; }
.dash-deadline-proj { font-size: .78rem; opacity: .5; }
.dash-deadline-date { font-size: .78rem; font-weight: 600; white-space: nowrap; }
.dash-nodue-title { flex: 1; opacity: .8; }
.dash-nodue-proj { font-size: .78rem; opacity: .45; }

@media (max-width: 980px) {
  .cab-body { flex-direction: column; }
  .cab-sidebar { width: 100%; position: static; }
  .cab-nav { flex-direction: row; overflow-x: auto; gap: 4px; padding: 0 4px 4px; }
  .cab-nav-item { flex-shrink: 0; border-radius: 20px; padding: 7px 14px; white-space: nowrap; }
  .dash-quick-nav { grid-template-columns: repeat(2, 1fr); }
  .dash-stats { grid-template-columns: repeat(2, 1fr); }
}

/* ── Small phones ── */
@media (max-width: 480px) {
  .cab-portfolio-stats { grid-template-columns: repeat(2, 1fr); }
  .dash-stats { grid-template-columns: 1fr; }
  .dash-quick-nav { grid-template-columns: repeat(2, 1fr); }
  .cab-modal-row2 { grid-template-columns: 1fr; }
  .u-form-section { padding: 14px 12px; }
  .cab-task { padding: 10px 12px; }
  .cab-task-edit-row { flex-direction: column; }
  .cab-task-edit-field { min-width: 0; }
  .cab-wt-head { padding: 8px 10px; font-size: .8rem; }
  .cab-doc-card { flex-wrap: wrap; gap: 8px; padding: 10px 12px; }
  .cab-doc-actions { width: 100%; justify-content: flex-end; }
  .cab-staff-card { flex-wrap: wrap; padding: 12px 14px; gap: 10px; }
  .dash-welcome { padding: 14px 16px; }
  .dash-project-card { padding: 10px; }
  .cab-nav { scrollbar-width: none; -ms-overflow-style: none; }
  .cab-nav::-webkit-scrollbar { display: none; }
}
</style>
