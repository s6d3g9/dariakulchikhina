<template>
  <div class="cab-root glass-page">

    <div v-if="pending" class="cab-loading">Загружаем…</div>

    <div v-else-if="contractor" class="cab-body">

      <!-- Sidebar -->
      <aside class="cab-sidebar glass-surface std-sidenav">
        <nav class="cab-nav std-nav">
          <button
            v-for="item in nav" :key="item.key"
            class="cab-nav-item std-nav-item"
            :class="{ active: section === item.key, 'std-nav-item--active': section === item.key }"
            @click="section = item.key"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.key === 'tasks' && activeCount" class="cab-badge">{{ activeCount }}</span>
            <span v-if="item.key === 'staff' && staff?.length" class="cab-badge">{{ staff.length }}</span>
            <span v-if="item.key === 'documents' && contractorDocs?.length" class="cab-badge">{{ contractorDocs.length }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main -->
      <main class="cab-main">
        <div class="cab-inner">

          <!-- ── Обзор (Dashboard) ──────────────────────────────── -->
          <template v-if="section === 'dashboard'">

            <!-- Приветствие и профиль -->
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

            <!-- Быстрые действия -->
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

            <!-- Прогресс выполнения -->
            <div class="dash-progress glass-surface">
              <div class="dash-progress-head">
                <span>Общий прогресс</span>
                <span class="dash-progress-pct">{{ dashStats.total ? Math.round(dashStats.done / dashStats.total * 100) : 0 }}%</span>
              </div>
              <div class="dash-progress-bar-wrap">
                <div class="dash-progress-bar" :style="{ width: dashStats.total ? (dashStats.done / dashStats.total * 100) + '%' : '0%' }" />
              </div>
            </div>

            <!-- Привязанные проекты -->
            <div v-if="linkedProjects?.length" class="dash-projects glass-surface">
              <div class="dash-section-title">Мои проекты ({{ linkedProjects.length }})</div>
              <div class="dash-projects-grid">
                <div v-for="p in linkedProjects" :key="p.slug" class="dash-project-card">
                  <span class="dash-project-name">{{ p.title }}</span>
                  <span class="dash-project-slug">{{ p.slug }}</span>
                </div>
              </div>
            </div>

            <!-- Ближайшие дедлайны -->
            <div v-if="dashDeadlines.length" class="dash-deadlines glass-surface">
              <div class="dash-section-title">Ближайшие дедлайны</div>
              <div
                v-for="item in dashDeadlines" :key="item.id"
                class="dash-deadline-row"
                :class="{ overdue: isDue(item.dateEnd) }"
              >
                <span class="dash-deadline-dot" :class="isDue(item.dateEnd) ? 'red' : 'amber'" />
                <span class="dash-deadline-title">{{ item.title }}</span>
                <span class="dash-deadline-proj">{{ item.projectTitle }}</span>
                <span class="dash-deadline-date">до {{ item.dateEnd }}</span>
              </div>
            </div>

            <!-- Задачи без дедлайна -->
            <div v-if="dashNoDue.length" class="dash-nodue glass-surface">
              <div class="dash-section-title">Без срока ({{ dashNoDue.length }})</div>
              <div v-for="item in dashNoDue" :key="item.id" class="dash-nodue-row">
                <span class="dash-nodue-dot" />
                <span class="dash-nodue-title">{{ item.title }}</span>
                <span class="dash-nodue-proj">{{ item.projectTitle }}</span>
              </div>
            </div>
          </template>

          <!-- ── Задачи ──────────────────────────────────────────── -->
          <template v-if="section === 'tasks'">

            <!-- Кнопка «Добавить задачу мастеру» для компании -->
            <div v-if="contractor?.contractorType === 'company' && staff?.length" class="cab-add-task-row">
              <button class="cab-add-task-btn" @click="openNewTaskModal">＋ Добавить задачу мастеру</button>
            </div>

            <div v-if="showNewTaskModal" class="cab-inline-task-window glass-surface">
              <div class="cab-modal-head">
                <span class="cab-modal-title">Новая задача мастеру</span>
                <button class="cab-modal-close" @click="showNewTaskModal = false">✕</button>
              </div>
              <div class="cab-modal-body">
                <div class="cab-field">
                  <label>Мастер *</label>
                  <select v-model="newTask.masterContractorId" class="glass-input">
                    <option :value="null" disabled>— выберите мастера —</option>
                    <option v-for="m in staff" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <div class="cab-field">
                  <label>Проект *</label>
                  <select v-model="newTask.projectSlug" class="glass-input">
                    <option value="" disabled>— выберите проект —</option>
                    <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
                  </select>
                </div>
                <div class="cab-field">
                  <label>Название задачи *</label>
                  <input v-model="newTask.title" class="glass-input" placeholder="Что нужно сделать…" />
                </div>
                <div class="cab-field">
                  <label>Вид работ</label>
                  <select v-model="newTask.workType" class="glass-input">
                    <option value="">— не указан —</option>
                    <option v-for="w in CONTRACTOR_WORK_TYPE_OPTIONS" :key="w.value" :value="w.value">{{ w.label }}</option>
                  </select>
                </div>
                <div class="cab-modal-row2">
                  <div class="cab-field">
                    <label>Дата начала</label>
                    <input v-model="newTask.dateStart" class="glass-input" placeholder="дд.мм.гггг" />
                  </div>
                  <div class="cab-field">
                    <label>Дата окончания</label>
                    <input v-model="newTask.dateEnd" class="glass-input" placeholder="дд.мм.гггг" />
                  </div>
                </div>
                <div class="cab-field">
                  <label>Бюджет</label>
                  <input v-model="newTask.budget" class="glass-input" placeholder="например: 50 000 ₽" />
                </div>
                <div class="cab-field">
                  <label>Примечание</label>
                  <textarea v-model="newTask.notes" class="glass-input" rows="3" placeholder="Уточнения, материалы, особые требования…" />
                </div>
              </div>
              <div class="cab-modal-foot">
                <button
                  class="cab-task-save"
                  :disabled="creatingTask || !newTask.masterContractorId || !newTask.projectSlug || !newTask.title.trim()"
                  @click="createTask"
                >{{ creatingTask ? 'Создание…' : 'Создать задачу' }}</button>
                <button class="cab-task-cancel" @click="showNewTaskModal = false">Отмена</button>
              </div>
            </div>

            <!-- Фильтр -->
            <div v-if="workItems?.length" class="cab-filters">
              <button
                v-for="f in FILTERS" :key="f.value"
                class="cab-filter-btn"
                :class="{ active: statusFilter === f.value }"
                @click="statusFilter = f.value"
              >{{ f.label }}<span v-if="f.count" class="cab-filter-count">{{ f.count }}</span></button>
            </div>

            <div v-if="!workItems?.length" class="cab-empty">
              <div class="cab-empty-icon">◎</div>
              <p>Задач пока нет.<br>Они появятся когда дизайнер добавит вас к проекту.</p>
            </div>
            <div v-else-if="!byProject.length" class="cab-empty">
              <div class="cab-empty-icon">◉</div>
              <p>Нет задач с выбранным фильтром.</p>
            </div>
            <template v-else>
              <div v-for="proj in byProject" :key="proj.slug" class="cab-project-group">
                <!-- Заголовок проекта с прогрессом -->
                <div class="cab-proj-header">
                  <span class="cab-proj-title">{{ proj.title }}</span>
                  <span class="cab-proj-stats">{{ proj.doneCount }} / {{ proj.totalCount }}</span>
                </div>
                <div class="cab-proj-progress">
                  <div class="cab-proj-progress-bar" :style="{ width: proj.totalCount ? (proj.doneCount / proj.totalCount * 100) + '%' : '0%' }" />
                </div>

                <!-- Группы по виду работ -->
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
                    <!-- Задачи -->
                    <div class="cab-tasks">
                      <div
                        v-for="item in wtGroup.items" :key="item.id"
                        class="cab-task glass-surface"
                        :class="{ expanded: expandedId === item.id }"
                      >
                        <!-- Верхняя строка -->
                        <div class="cab-task-top" @click="toggleExpand(item.id)">
                          <span class="cab-task-expand-icon">{{ expandedId === item.id ? '▾' : '▸' }}</span>
                          <span class="cab-task-name">{{ item.title }}</span>
                          <span v-if="item.assignedToName" class="cab-task-assigned-badge">→ {{ item.assignedToName }}</span>
                          <span v-if="item.roadmapStageTitle" class="cab-task-stage-badge">{{ item.roadmapStageTitle }}</span>
                          <select
                            :value="item.status"
                            class="cab-status-select"
                            :class="`cab-status--${item.status}`"
                            @click.stop
                            @change="updateStatus(item, ($event.target as HTMLSelectElement).value)"
                          >
                            <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
                          </select>
                        </div>

                        <!-- Collapsed: краткая инфо -->
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

                        <!-- Expanded: редактирование -->
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
                              <textarea v-model="editMap[item.id].notes" class="glass-input" rows="3" placeholder="Статус работ, вопросы, уточнения…" />
                            </div>
                            <div class="cab-task-edit-actions">
                              <button type="button" class="cab-task-save" :disabled="savingItem === item.id" @click.stop="saveTaskDetails(item)">
                                {{ savingItem === item.id ? 'Сохранение…' : 'Сохранить' }}
                              </button>
                              <button type="button" class="cab-task-cancel" @click.stop="expandedId = null">Отмена</button>
                            </div>

                            <!-- ── Фото выполнения ── -->
                            <div class="cab-task-photos">
                              <div class="cab-task-photos-head">
                                <span class="cab-task-photos-title">Фото выполнения</span>
                                <label class="cab-photo-upload-btn">
                                  <input type="file" accept="image/*" multiple style="display:none" @change="uploadPhotos(item, $event)" />
                                  {{ uploadingFor === item.id ? 'Загрузка…' : '＋ Добавить фото' }}
                                </label>
                              </div>
                              <div v-if="(photosByItem[item.id] || []).length" class="cab-photos-grid">
                                <div
                                  v-for="ph in photosByItem[item.id]" :key="ph.id"
                                  class="cab-photo-thumb"
                                >
                                  <img :src="ph.url" @click.stop="lightboxUrl = ph.url" />
                                  <button class="cab-photo-del" @click.stop="deletePhoto(item.id, ph.id)">✕</button>
                                </div>
                              </div>
                              <div v-else class="cab-photos-empty">Нет фотографий</div>
                            </div>

                            <!-- ── Комментарии ── -->
                            <div class="cab-task-comments">
                              <div class="cab-task-comments-title">Комментарии</div>
                              <div class="cab-comments-list">
                                <div
                                  v-for="c in (commentsByItem[item.id] || [])" :key="c.id"
                                  class="cab-comment"
                                  :class="'cab-comment--' + c.authorType"
                                >
                                  <span class="cab-comment-author">{{ c.authorName }}</span>
                                  <span class="cab-comment-time">{{ fmtTime(c.createdAt) }}</span>
                                  <div class="cab-comment-text">{{ c.text }}</div>
                                </div>
                                <div v-if="!(commentsByItem[item.id] || []).length" class="cab-comments-empty">Нет комментариев</div>
                              </div>
                              <div class="cab-comment-form" @click.stop>
                                <textarea
                                  v-model="commentText[item.id]"
                                  class="glass-input cab-comment-input"
                                  rows="2"
                                  placeholder="Напишите комментарий…"
                                />
                                <button
                                  class="cab-task-save cab-comment-send"
                                  :disabled="sendingComment === item.id || !commentText[item.id]?.trim()"
                                  @click.stop="sendComment(item)"
                                >{{ sendingComment === item.id ? '…' : 'Отправить' }}</button>
                              </div>
                            </div>
                          </div>
                        </template>
                      </div>
                    </div>

                    <!-- Технологические этапы (интерактивный чеклист) -->
                    <div v-if="wtGroup.stages.length" class="cab-stages-inline glass-surface">
                      <div class="cab-stages-inline-head">
                        <span class="cab-stages-inline-title">Технологические этапы</span>
                        <span class="cab-stages-inline-pct">{{ stagesPct(proj.slug, wtGroup.workType, wtGroup.stages.length) }}%</span>
                      </div>
                      <div class="cab-stages-inline-bar-wrap">
                        <div class="cab-stages-inline-bar" :style="{ width: stagesPct(proj.slug, wtGroup.workType, wtGroup.stages.length) + '%' }" />
                      </div>
                      <div
                        v-for="(stage, idx) in wtGroup.stages" :key="stage.key"
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

          <!-- ── Контактные данные ──────────────────────────────── -->
          <template v-else-if="section === 'contacts'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="cab-form-section">
                <h3>Основные контакты</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Имя / название</label>
                    <input v-model="form.name" class="glass-input" required />
                  </div>
                  <div class="cab-field">
                    <label>Компания</label>
                    <input v-model="form.companyName" class="glass-input" placeholder="ООО / ИП…" />
                  </div>
                  <div class="cab-field">
                    <label>Телефон</label>
                    <input v-model="form.phone" class="glass-input" type="tel" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div class="cab-field">
                    <label>Email</label>
                    <input v-model="form.email" class="glass-input" type="email" placeholder="mail@example.com" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Мессенджеры</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Telegram</label>
                    <input v-model="form.telegram" class="glass-input" placeholder="@username или номер" />
                  </div>
                  <div class="cab-field">
                    <label>WhatsApp</label>
                    <input v-model="form.whatsapp" class="glass-input" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div class="cab-field">
                    <label>Мессенджер (другой)</label>
                    <select v-model="form.messenger" class="glass-input cab-select">
                      <option value="">—</option>
                      <option>telegram</option>
                      <option>whatsapp</option>
                      <option>viber</option>
                    </select>
                  </div>
                  <div class="cab-field">
                    <label>Ник / номер</label>
                    <input v-model="form.messengerNick" class="glass-input" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Адрес и география</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Город</label>
                    <input v-model="form.city" class="glass-input" placeholder="Москва" />
                  </div>
                  <div class="cab-field">
                    <label>Радиус выезда</label>
                    <input v-model="form.workRadius" class="glass-input" placeholder="50 км / Москва и МО" />
                  </div>
                  <div class="cab-field cab-field-full">
                    <label>Фактический адрес</label>
                    <input v-model="form.factAddress" class="glass-input" placeholder="Адрес для корреспонденции" />
                  </div>
                  <div class="cab-field cab-field-full">
                    <label>Сайт / портфолио</label>
                    <input v-model="form.website" class="glass-input" placeholder="https://example.com" />
                  </div>
                </div>
              </div>

              <div class="cab-foot">
                <button type="submit" class="cab-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="cab-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <!-- ── Паспортные данные ──────────────────────────────── -->
          <template v-else-if="section === 'passport'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="cab-form-section">
                <h3>Паспорт гражданина РФ</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Серия</label>
                    <input v-model="form.passportSeries" class="glass-input" placeholder="00 00" maxlength="5" />
                  </div>
                  <div class="cab-field">
                    <label>Номер</label>
                    <input v-model="form.passportNumber" class="glass-input" placeholder="000000" maxlength="7" />
                  </div>
                  <div class="cab-field cab-field-full">
                    <label>Кем выдан</label>
                    <input v-model="form.passportIssuedBy" class="glass-input" placeholder="ОВД района…" />
                  </div>
                  <div class="cab-field">
                    <label>Дата выдачи</label>
                    <input v-model="form.passportIssueDate" class="glass-input" placeholder="дд.мм.гггг" />
                  </div>
                  <div class="cab-field">
                    <label>Код подразделения</label>
                    <input v-model="form.passportDepartmentCode" class="glass-input" placeholder="000-000" maxlength="7" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Персональные данные</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Дата рождения</label>
                    <input v-model="form.birthDate" class="glass-input" placeholder="дд.мм.гггг" />
                  </div>
                  <div class="cab-field">
                    <label>Место рождения</label>
                    <input v-model="form.birthPlace" class="glass-input" placeholder="г. Москва" />
                  </div>
                  <div class="cab-field cab-field-full">
                    <label>Адрес регистрации</label>
                    <input v-model="form.registrationAddress" class="glass-input" placeholder="Адрес по прописке" />
                  </div>
                  <div class="cab-field">
                    <label>СНИЛС</label>
                    <input v-model="form.snils" class="glass-input" placeholder="000-000-000 00" maxlength="14" />
                  </div>
                  <div class="cab-field">
                    <label>ИНН</label>
                    <input v-model="form.inn" class="glass-input" placeholder="000000000000" maxlength="12" />
                  </div>
                </div>
              </div>

              <div class="cab-foot">
                <button type="submit" class="cab-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="cab-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <!-- ── Реквизиты ──────────────────────────────────────── -->
          <template v-else-if="section === 'requisites'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="cab-form-section">
                <h3>Юридические данные</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>ИНН</label>
                    <input v-model="form.inn" class="glass-input" placeholder="000000000000" maxlength="12" />
                  </div>
                  <div class="cab-field">
                    <label>КПП</label>
                    <input v-model="form.kpp" class="glass-input" placeholder="000000000" maxlength="9" />
                  </div>
                  <div class="cab-field">
                    <label>ОГРН / ОГРНИП</label>
                    <input v-model="form.ogrn" class="glass-input" placeholder="0000000000000" maxlength="15" />
                  </div>
                  <div class="cab-field cab-field-full">
                    <label>Юридический адрес</label>
                    <input v-model="form.legalAddress" class="glass-input" placeholder="Адрес регистрации ИП / ООО" />
                  </div>
                  <div class="cab-field cab-field-full">
                    <label>Фактический адрес</label>
                    <input v-model="form.factAddress" class="glass-input" placeholder="Адрес ведения деятельности" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Банковские реквизиты</h3>
                <div class="cab-grid-2">
                  <div class="cab-field cab-field-full">
                    <label>Наименование банка</label>
                    <input v-model="form.bankName" class="glass-input" placeholder="ПАО Сбербанк" />
                  </div>
                  <div class="cab-field">
                    <label>БИК</label>
                    <input v-model="form.bik" class="glass-input" placeholder="000000000" maxlength="9" />
                  </div>
                  <div class="cab-field">
                    <label>Расчётный счёт</label>
                    <input v-model="form.settlementAccount" class="glass-input" placeholder="00000000000000000000" maxlength="20" />
                  </div>
                  <div class="cab-field">
                    <label>Корреспондентский счёт</label>
                    <input v-model="form.correspondentAccount" class="glass-input" placeholder="00000000000000000000" maxlength="20" />
                  </div>
                </div>
              </div>

              <div class="cab-foot">
                <button type="submit" class="cab-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="cab-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <!-- ── Документы ──────────────────────────────────────── -->
          <template v-else-if="section === 'documents'">
            <div class="cab-form-section">
              <h3>Загрузить документ</h3>
              <div class="cab-grid-2">
                <div class="cab-field">
                  <label>Название</label>
                  <input v-model="newDocTitle" class="glass-input" placeholder="Название документа" />
                </div>
                <div class="cab-field">
                  <label>Категория</label>
                  <select v-model="newDocCategory" class="glass-input cab-select">
                    <option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
                  </select>
                </div>
                <div class="cab-field cab-field-full">
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

            <div v-if="contractorDocs?.length" class="cab-docs-list">
              <div v-for="doc in contractorDocs" :key="doc.id" class="cab-doc-card glass-surface">
                <div class="cab-doc-icon">
                  {{ doc.category === 'passport' ? '🪪' : doc.category === 'license' ? '📜' : doc.category === 'certificate' ? '📄' : doc.category === 'contract' ? '📋' : doc.category === 'insurance' ? '🛡' : doc.category === 'diploma' ? '🎓' : '📎' }}
                </div>
                <div class="cab-doc-info">
                  <div class="cab-doc-title">{{ doc.title }}</div>
                  <div class="cab-doc-meta">
                    <span class="cab-doc-cat">{{ DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category }}</span>
                    <span v-if="doc.notes" class="cab-doc-notes">{{ doc.notes }}</span>
                    <span v-if="doc.expiresAt" class="cab-doc-expires">до {{ doc.expiresAt }}</span>
                  </div>
                </div>
                <div class="cab-doc-actions">
                  <a v-if="doc.url" :href="doc.url" target="_blank" class="cab-doc-link">Скачать</a>
                  <button class="cab-doc-del" @click="deleteDoc(doc.id)">✕</button>
                </div>
              </div>
            </div>
            <div v-else class="cab-empty">
              <div class="cab-empty-icon">📂</div>
              <p>Документов пока нет.<br>Загрузите паспорт, лицензии, сертификаты и другие документы.</p>
            </div>
          </template>

          <!-- ── Специализации ──────────────────────────────────── -->
          <template v-else-if="section === 'specialization'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="cab-form-section">
                <h3>Роль / профессия</h3>
                <div class="cab-field cab-field-full">
                  <div v-for="group in ROLE_GROUPS" :key="group.label" class="cab-tag-group">
                    <div class="cab-tag-group-label">{{ group.label }}</div>
                    <div class="cab-tags">
                      <button
                        v-for="r in group.items" :key="r.value" type="button"
                        class="cab-tag" :class="{ active: form.roleTypes.includes(r.value) }"
                        @click="toggleArr(form.roleTypes, r.value)"
                      >{{ r.label }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Виды работ</h3>
                <div class="cab-field cab-field-full">
                  <div v-for="group in WORK_GROUPS" :key="group.label" class="cab-tag-group">
                    <div class="cab-tag-group-label">{{ group.label }}</div>
                    <div class="cab-tags">
                      <button
                        v-for="w in group.items" :key="w.value" type="button"
                        class="cab-tag" :class="{ active: form.workTypes.includes(w.value) }"
                        @click="toggleArr(form.workTypes, w.value)"
                      >{{ w.label }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Опыт</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Стаж (лет)</label>
                    <input v-model.number="form.experienceYears" class="glass-input" type="number" min="0" max="100" placeholder="10" />
                  </div>
                  <div class="cab-field">
                    <label>Образование</label>
                    <input v-model="form.education" class="glass-input" placeholder="Высшее строительное…" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>О себе</h3>
                <div class="cab-field cab-field-full">
                  <label>Заметки / описание</label>
                  <textarea v-model="form.notes" class="glass-input" rows="4" placeholder="Опыт, специализация, особые условия работы…" />
                </div>
              </div>

              <div class="cab-foot">
                <button type="submit" class="cab-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="cab-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <!-- ── Финансы ────────────────────────────────────────── -->
          <template v-else-if="section === 'finances'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="cab-form-section">
                <h3>Система налогообложения</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
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
                  <div class="cab-field">
                    <label>Ставка / стоимость часа</label>
                    <input v-model="form.hourlyRate" class="glass-input" placeholder="2 500 ₽/час" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Способы оплаты</h3>
                <div class="cab-tags">
                  <button
                    v-for="pm in PAYMENT_METHOD_OPTIONS" :key="pm.value" type="button"
                    class="cab-tag" :class="{ active: form.paymentMethods.includes(pm.value) }"
                    @click="toggleArr(form.paymentMethods, pm.value)"
                  >{{ pm.label }}</button>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Страхование</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label class="cab-checkbox-label">
                      <input v-model="form.hasInsurance" type="checkbox" class="cab-checkbox" />
                      Есть страховка ответственности
                    </label>
                  </div>
                  <div v-if="form.hasInsurance" class="cab-field cab-field-full">
                    <label>Детали страхования</label>
                    <textarea v-model="form.insuranceDetails" class="glass-input" rows="2" placeholder="Компания, номер полиса, срок…" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
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

              <div class="cab-foot">
                <button type="submit" class="cab-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="cab-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <!-- ── Портфолио ──────────────────────────────────────── -->
          <template v-else-if="section === 'portfolio'">
            <!-- Статистика портфолио -->
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

            <!-- Специализации -->
            <div v-if="contractor?.workTypes?.length" class="cab-portfolio-specializations glass-surface">
              <div class="cab-portfolio-spec-title">Специализации</div>
              <div class="cab-portfolio-chips">
                <span v-for="wt in contractor.workTypes" :key="wt" class="glass-chip">
                  {{ CONTRACTOR_WORK_TYPE_OPTIONS.find(o => o.value === wt)?.label || wt }}
                </span>
              </div>
            </div>

            <div class="cab-form-section">
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
                      <span class="cab-portfolio-item-photos" v-if="item.photoCount">📷 {{ item.photoCount }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="!byProject.length" class="cab-empty" style="margin-top:12px;">
                <div class="cab-empty-icon">◖</div>
                <p>Завершённых проектов пока нет.<br>Ваше портфолио автоматически пополнится по мере выполнения задач.</p>
              </div>
            </div>

            <div class="cab-form-section">
              <h3>Ссылки на внешнее портфолио</h3>
              <div class="cab-grid-2">
                <div class="cab-field cab-field-full">
                  <label>Сайт / Behance / Instagram</label>
                  <input v-model="form.website" class="glass-input" placeholder="https://…" />
                </div>
              </div>
              <div class="cab-foot" style="margin-top:12px;">
                <button type="button" class="cab-save" :disabled="saving" @click="saveProfile">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="cab-save-msg">{{ saveMsg }}</span>
              </div>
            </div>
          </template>

          <!-- ── Настройки ──────────────────────────────────────── -->
          <template v-else-if="section === 'settings'">
            <div class="cab-form-section">
              <h3>Аккаунт</h3>
              <div class="cab-grid-2">
                <div class="cab-field">
                  <label>ID</label>
                  <div class="cab-field-static">{{ contractorId }}</div>
                </div>
                <div class="cab-field">
                  <label>Slug (ссылка для входа)</label>
                  <div class="cab-field-static cab-field-slug">{{ contractor?.slug }}</div>
                </div>
                <div class="cab-field">
                  <label>Тип</label>
                  <div class="cab-field-static">{{ contractor?.contractorType === 'company' ? 'Компания-подрядчик' : 'Мастер' }}</div>
                </div>
                <div class="cab-field">
                  <label>Зарегистрирован</label>
                  <div class="cab-field-static">{{ contractor?.createdAt ? new Date(contractor.createdAt).toLocaleDateString('ru-RU') : '—' }}</div>
                </div>
              </div>
            </div>

            <div class="cab-form-section">
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
                <label class="cab-toggle-row">
                  <input type="checkbox" v-model="notifSettings.comments" class="cab-toggle-checkbox" />
                  <span class="cab-toggle-label">Комментарии</span>
                  <span class="cab-toggle-hint">Новые комментарии к задачам</span>
                </label>
                <label class="cab-toggle-row">
                  <input type="checkbox" v-model="notifSettings.statusChanges" class="cab-toggle-checkbox" />
                  <span class="cab-toggle-label">Смена статуса</span>
                  <span class="cab-toggle-hint">Изменение статуса задач дизайнером</span>
                </label>
              </div>
              <button class="cab-save-btn cab-save-btn--sm" style="margin-top:12px" @click="saveNotifSettings">Сохранить настройки</button>
            </div>

            <div class="cab-form-section">
              <h3>Безопасность</h3>
              <p class="cab-settings-hint">
                Для входа в кабинет используйте ваш ID <b>({{ contractorId }})</b> и slug <b>({{ contractor?.slug }})</b>.
                Если нужно сменить slug — обратитесь к администратору.
              </p>
            </div>
          </template>

          <!-- ── Бригада ────────────────────────────────────── -->
          <template v-else-if="section === 'staff'">
            <div v-if="!staff?.length" class="cab-empty">
              <div class="cab-empty-icon">◔</div>
              <p>Сотрудников пока нет.<br>Администратор добавит мастеров за вашей компанией.</p>
            </div>
            <div v-else class="cab-staff-list">
              <NuxtLink
                v-for="m in staff" :key="m.id"
                :to="`/contractor/${m.id}`"
                class="cab-staff-card glass-surface"
              >
                <div class="cab-staff-avatar">◑</div>
                <div class="cab-staff-info">
                  <div class="cab-staff-name">{{ m.name }}</div>
                  <div v-if="m.workTypes?.length" class="cab-staff-wt">
                    {{ m.workTypes.slice(0,3).map((w: string) => workTypeLabel(w)).join(' · ') }}
                    <span v-if="m.workTypes.length > 3"> +{{ m.workTypes.length - 3 }}</span>
                  </div>
                  <div class="cab-staff-contacts">
                    <span v-if="m.phone">☎️ {{ m.phone }}</span>
                    <span v-if="m.messenger && m.messengerNick">
                      <template v-if="m.messenger === 'telegram'">✈️</template>
                      <template v-else-if="m.messenger === 'whatsapp'">&#128242;</template>
                      <template v-else>💬</template>
                      {{ m.messengerNick }}
                    </span>
                  </div>
                </div>
                <div class="cab-staff-arrow">›</div>
              </NuxtLink>
            </div>
          </template>

        </div>
      </main>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightboxUrl" class="cab-lightbox" @click="lightboxUrl = null">
        <button class="cab-lightbox-close" @click.stop="lightboxUrl = null">✕</button>
        <img :src="lightboxUrl" class="cab-lightbox-img" @click.stop />
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_ROLE_TYPE_OPTIONS, CONTRACTOR_WORK_TYPE_OPTIONS, WORK_TYPE_STAGES } from '~~/shared/types/catalogs'
import { workTypeLabel } from '~~/shared/utils/work-status'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'sbp', label: 'СБП' },
  { value: 'card_transfer', label: 'На карту' },
  { value: 'bank_transfer', label: 'Безналичный (р/с)' },
  { value: 'crypto', label: 'Криптовалюта' },
]

definePageMeta({ layout: 'contractor' })
const route = useRoute()
const contractorId = Number(route.params.id)

const { data: contractor, pending, refresh } = await useFetch<any>(`/api/contractors/${contractorId}`)
const { data: workItems, refresh: refreshItems } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/work-items`, { default: () => [] }
)
const { data: staff } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/staff`, { default: () => [] }
)
const { data: linkedProjects } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/projects`, { default: () => [] }
)

// ── Form ──────────────────────────────────────────────────────────
const form = reactive({
  name: '',
  companyName: '',
  phone: '',
  email: '',
  messenger: '',
  messengerNick: '',
  website: '',
  notes: '',
  roleTypes: [] as string[],
  workTypes: [] as string[],
  // Паспортные данные
  passportSeries: '',
  passportNumber: '',
  passportIssuedBy: '',
  passportIssueDate: '',
  passportDepartmentCode: '',
  birthDate: '',
  birthPlace: '',
  registrationAddress: '',
  snils: '',
  // Доп. контакты
  telegram: '',
  whatsapp: '',
  city: '',
  workRadius: '',
  // Реквизиты
  inn: '',
  kpp: '',
  ogrn: '',
  bankName: '',
  bik: '',
  settlementAccount: '',
  correspondentAccount: '',
  legalAddress: '',
  factAddress: '',
  // Финансовые
  taxSystem: '',
  paymentMethods: [] as string[],
  hourlyRate: '',
  hasInsurance: false,
  insuranceDetails: '',
  education: '',
  certifications: [] as string[],
  experienceYears: null as number | null,
})

watch(contractor, (c) => {
  if (!c) return
  form.name          = c.name          || ''
  form.companyName   = c.companyName   || ''
  form.phone         = c.phone         || ''
  form.email         = c.email         || ''
  form.messenger     = c.messenger     || ''
  form.messengerNick = c.messengerNick || ''
  form.website       = c.website       || ''
  form.notes         = c.notes         || ''
  form.roleTypes     = Array.isArray(c.roleTypes) ? [...c.roleTypes] : []
  form.workTypes     = Array.isArray(c.workTypes) ? [...c.workTypes] : []
  // Паспортные
  form.passportSeries        = c.passportSeries        || ''
  form.passportNumber        = c.passportNumber        || ''
  form.passportIssuedBy      = c.passportIssuedBy      || ''
  form.passportIssueDate     = c.passportIssueDate     || ''
  form.passportDepartmentCode = c.passportDepartmentCode || ''
  form.birthDate             = c.birthDate             || ''
  form.birthPlace            = c.birthPlace            || ''
  form.registrationAddress   = c.registrationAddress   || ''
  form.snils                 = c.snils                 || ''
  // Доп. контакты
  form.telegram    = c.telegram    || ''
  form.whatsapp    = c.whatsapp    || ''
  form.city        = c.city        || ''
  form.workRadius  = c.workRadius  || ''
  // Реквизиты
  form.inn                 = c.inn                 || ''
  form.kpp                 = c.kpp                 || ''
  form.ogrn                = c.ogrn                || ''
  form.bankName            = c.bankName            || ''
  form.bik                 = c.bik                 || ''
  form.settlementAccount   = c.settlementAccount   || ''
  form.correspondentAccount = c.correspondentAccount || ''
  form.legalAddress        = c.legalAddress        || ''
  form.factAddress         = c.factAddress         || ''
  // Финансовые
  form.taxSystem       = c.taxSystem       || ''
  form.paymentMethods  = Array.isArray(c.paymentMethods) ? [...c.paymentMethods] : []
  form.hourlyRate      = c.hourlyRate      || ''
  form.hasInsurance    = c.hasInsurance    || false
  form.insuranceDetails = c.insuranceDetails || ''
  form.education       = c.education       || ''
  form.certifications  = Array.isArray(c.certifications) ? [...c.certifications] : []
  form.experienceYears = c.experienceYears ?? null
}, { immediate: true })

// ── Документы подрядчика ─────────────────────────────────────────
const { data: contractorDocs, refresh: refreshDocs } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/documents`, { default: () => [] }
)
const docUploading = ref(false)
const newDocTitle = ref('')
const newDocCategory = ref('other')
const newDocNotes = ref('')

const DOC_CATEGORIES = [
  { value: 'passport',    label: 'Паспорт' },
  { value: 'inn_doc',     label: 'ИНН' },
  { value: 'snils',       label: 'СНИЛС' },
  { value: 'license',     label: 'Лицензия' },
  { value: 'certificate', label: 'Сертификат' },
  { value: 'contract',    label: 'Договор' },
  { value: 'insurance',   label: 'Страховка' },
  { value: 'diploma',     label: 'Диплом / удостоверение' },
  { value: 'sro',         label: 'СРО допуск' },
  { value: 'other',       label: 'Другой' },
]

async function uploadDoc(ev: Event) {
  const files = (ev.target as HTMLInputElement).files
  if (!files?.length) return
  docUploading.value = true
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', newDocTitle.value || file.name)
      fd.append('category', newDocCategory.value)
      if (newDocNotes.value) fd.append('notes', newDocNotes.value)
      await $fetch(`/api/contractors/${contractorId}/documents`, { method: 'POST', body: fd })
    }
    newDocTitle.value = ''
    newDocNotes.value = ''
    newDocCategory.value = 'other'
    refreshDocs()
  } finally {
    docUploading.value = false
    ;(ev.target as HTMLInputElement).value = ''
  }
}

async function deleteDoc(docId: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/contractors/${contractorId}/documents/${docId}`, { method: 'DELETE' })
  refreshDocs()
}

// Новый сертификат (для секции «Финансы»)
const newCert = ref('')
function addCert() {
  const v = newCert.value.trim()
  if (v && !form.certifications.includes(v)) form.certifications.push(v)
  newCert.value = ''
}
function removeCert(idx: number) { form.certifications.splice(idx, 1) }

// ── Auth guard ───────────────────────────────────────────────────
const { data: meData } = await useFetch<any>('/api/auth/me')
if (meData.value?.contractorId && meData.value.contractorId !== contractorId) {
  await navigateTo(`/contractor/${meData.value.contractorId}`)
}

// ── Nav ──────────────────────────────────────────────────────────
const section = ref('dashboard')
const nav = computed(() => {
  const items: { key: string; icon: string; label: string }[] = [
    { key: 'dashboard',     icon: '◈', label: 'Обзор' },
    { key: 'tasks',         icon: '◎', label: 'Мои задачи' },
    { key: 'contacts',      icon: '☎', label: 'Контактные данные' },
    { key: 'passport',      icon: '◑', label: 'Паспортные данные' },
    { key: 'requisites',    icon: '◒', label: 'Реквизиты' },
    { key: 'documents',     icon: '◓', label: 'Документы' },
    { key: 'specialization',icon: '◔', label: 'Специализации' },
    { key: 'finances',      icon: '◕', label: 'Финансы' },
    { key: 'portfolio',     icon: '◖', label: 'Портфолио' },
    { key: 'settings',      icon: '⚙', label: 'Настройки' },
  ]
  if (contractor.value?.contractorType === 'company') {
    items.splice(2, 0, { key: 'staff', icon: '◔', label: 'Бригада' })
  }
  return items
})

// ── Wt group open state ──────────────────────────────────────────
const wtGroupOpenSet = reactive(new Set<string>())
function wtGroupKey(slug: string, wt: string) { return `${slug}::${wt}` }
function isWtGroupOpen(slug: string, wt: string) { return wtGroupOpenSet.has(wtGroupKey(slug, wt)) }
function toggleWtGroup(slug: string, wt: string) {
  const k = wtGroupKey(slug, wt)
  if (wtGroupOpenSet.has(k)) wtGroupOpenSet.delete(k)
  else wtGroupOpenSet.add(k)
}

// ── Stage checklist (localStorage) ──────────────────────────────
interface WtGroup { workType: string; label: string; items: any[]; stages: any[] }

function lsKey(projectSlug: string, wt: string) {
  return `cab_stages_${contractorId}_${projectSlug}_${wt}`
}
function loadStageDone(projectSlug: string, wt: string): Set<string> {
  if (process.server) return new Set()
  try { const r = localStorage.getItem(lsKey(projectSlug, wt)); return new Set(r ? JSON.parse(r) : []) }
  catch { return new Set() }
}
const stagesCache = reactive<Record<string, Set<string>>>({})
function getStageDone(projectSlug: string, wt: string): Set<string> {
  const k = lsKey(projectSlug, wt)
  if (!stagesCache[k]) stagesCache[k] = loadStageDone(projectSlug, wt)
  return stagesCache[k]
}
function toggleStage(projectSlug: string, wt: string, stageKey: string) {
  const s = getStageDone(projectSlug, wt)
  if (s.has(stageKey)) s.delete(stageKey)
  else s.add(stageKey)
  if (!process.server) localStorage.setItem(lsKey(projectSlug, wt), JSON.stringify([...s]))
}
function isStageDone(projectSlug: string, wt: string, key: string) {
  return getStageDone(projectSlug, wt).has(key)
}
function stagesPct(projectSlug: string, wt: string, total: number) {
  if (!total) return 0
  return Math.round(getStageDone(projectSlug, wt).size / total * 100)
}

// ── Tasks ─────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'pending',     label: 'Ожидание' },
  { value: 'planned',     label: 'Запланировано' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'paused',      label: 'На паузе' },
  { value: 'done',        label: 'Выполнено' },
  { value: 'cancelled',   label: 'Отменено' },
]

const statusFilter = ref('all')
const expandedId = ref<number | null>(null)
const savingItem = ref<number | null>(null)

// map id → { notes, dateStart, dateEnd } для редактирования
const editMap = reactive<Record<number, { notes: string; dateStart: string; dateEnd: string }>>({})

watch(workItems, (items) => {
  for (const item of items || []) {
    if (!editMap[item.id]) {
      editMap[item.id] = { notes: item.notes || '', dateStart: item.dateStart || '', dateEnd: item.dateEnd || '' }
    }
    // auto-open all wt groups
    const k = wtGroupKey(item.projectSlug, item.workType || '__general__')
    wtGroupOpenSet.add(k)
  }
}, { immediate: true })

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

const activeCount = computed(() =>
  (workItems.value || []).filter((i: any) => ['planned', 'in_progress'].includes(i.status)).length
)

const FILTERS = computed(() => {
  const all = workItems.value || []
  return [
    { value: 'all',       label: 'Все',       count: all.length },
    { value: 'active',    label: 'Активные',  count: all.filter((i: any) => ['planned','in_progress'].includes(i.status)).length },
    { value: 'done',      label: 'Выполнено', count: all.filter((i: any) => i.status === 'done').length },
    { value: 'cancelled', label: 'Отменено',  count: all.filter((i: any) => i.status === 'cancelled').length },
  ]
})

const byProject = computed(() => {
  const all = workItems.value || []
  const map = new Map<string, { slug: string; title: string; wtGroups: WtGroup[]; doneCount: number; totalCount: number }>()
  for (const item of all) {
    if (!map.has(item.projectSlug)) {
      map.set(item.projectSlug, { slug: item.projectSlug, title: item.projectTitle, wtGroups: [], doneCount: 0, totalCount: 0 })
    }
    const proj = map.get(item.projectSlug)!
    proj.totalCount++
    if (item.status === 'done') proj.doneCount++
    const f = statusFilter.value
    const show = (
      f === 'all' ||
      (f === 'active' && ['planned','in_progress'].includes(item.status)) ||
      (f === 'done' && item.status === 'done') ||
      (f === 'cancelled' && item.status === 'cancelled')
    )
    if (!show) continue
    const wt = item.workType || '__general__'
    let grp = proj.wtGroups.find(g => g.workType === wt)
    if (!grp) {
      const label = wt === '__general__'
        ? 'Общие задачи'
        : (CONTRACTOR_WORK_TYPE_OPTIONS.find(o => o.value === wt)?.label || wt)
      const stages = wt !== '__general__' ? (WORK_TYPE_STAGES[wt] || []) : []
      grp = { workType: wt, label, items: [], stages }
      proj.wtGroups.push(grp)
    }
    grp.items.push(item)
  }
  return [...map.values()].filter(p => p.wtGroups.length > 0)
})

// ── Все проекты (для формы новой задачи) ────────────────────────
const allProjects = computed(() => {
  // Берём проекты из API (привязанные к подрядчику/компании)
  const result: { slug: string; title: string }[] = [...(linkedProjects.value || [])]
  const seen = new Set(result.map(p => p.slug))
  // Дополняем проектами из задач (на случай если API вернул меньше)
  for (const item of workItems.value || []) {
    if (!seen.has(item.projectSlug)) {
      seen.add(item.projectSlug)
      result.push({ slug: item.projectSlug, title: item.projectTitle })
    }
  }
  return result
})

// ── Новая задача мастеру ─────────────────────────────────────────
const showNewTaskModal = ref(false)
const creatingTask = ref(false)
const newTask = reactive({
  masterContractorId: null as number | null,
  projectSlug: '',
  title: '',
  workType: '',
  dateStart: '',
  dateEnd: '',
  budget: '',
  notes: '',
})

function openNewTaskModal() {
  newTask.masterContractorId = staff.value?.length === 1 ? staff.value[0].id : null
  newTask.projectSlug = allProjects.value.length === 1 ? allProjects.value[0].slug : ''
  newTask.title = ''
  newTask.workType = ''
  newTask.dateStart = ''
  newTask.dateEnd = ''
  newTask.budget = ''
  newTask.notes = ''
  showNewTaskModal.value = true
}

async function createTask() {
  if (!newTask.masterContractorId || !newTask.projectSlug || !newTask.title.trim()) return
  creatingTask.value = true
  try {
    await $fetch(`/api/contractors/${contractorId}/work-items`, {
      method: 'POST',
      body: {
        projectSlug: newTask.projectSlug,
        masterContractorId: newTask.masterContractorId,
        title: newTask.title.trim(),
        workType: newTask.workType || null,
        dateStart: newTask.dateStart || null,
        dateEnd: newTask.dateEnd || null,
        budget: newTask.budget || null,
        notes: newTask.notes || null,
      },
    })
    showNewTaskModal.value = false
    refreshItems()
  } finally {
    creatingTask.value = false
  }
}

async function updateStatus(item: any, status: string) {
  item.status = status
  await $fetch(`/api/contractors/${contractorId}/work-items/${item.id}`, {
    method: 'PUT',
    body: { status },
  })
  refreshItems()
}

// ── Dashboard ─────────────────────────────────────────────────────
function isDue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const [d, m, y] = dateStr.split('.')
  if (!d || !m || !y) return false
  const due = new Date(Number(y), Number(m) - 1, Number(d))
  return due < new Date()
}

const dashStats = computed(() => {
  const all = workItems.value || []
  const today = new Date()
  return {
    total: all.length,
    inProgress: all.filter((i: any) => i.status === 'in_progress').length,
    done: all.filter((i: any) => i.status === 'done').length,
    overdue: all.filter((i: any) => {
      if (i.status === 'done' || i.status === 'cancelled') return false
      return isDue(i.dateEnd)
    }).length,
  }
})

const dashDeadlines = computed(() =>
  (workItems.value || [])
    .filter((i: any) => i.dateEnd && i.status !== 'done' && i.status !== 'cancelled')
    .sort((a: any, b: any) => {
      const parse = (s: string) => { const [d,m,y] = s.split('.'); return new Date(Number(y), Number(m)-1, Number(d)).getTime() }
      return parse(a.dateEnd) - parse(b.dateEnd)
    })
    .slice(0, 8)
)

const dashNoDue = computed(() =>
  (workItems.value || []).filter((i: any) => !i.dateEnd && i.status !== 'done' && i.status !== 'cancelled')
)

// ── Профиль: полнота заполнения ──────────────────────────────────
const profileFields: { key: string; section: string }[] = [
  { key: 'name', section: 'contacts' },
  { key: 'phone', section: 'contacts' },
  { key: 'email', section: 'contacts' },
  { key: 'city', section: 'contacts' },
  { key: 'passportSeries', section: 'passport' },
  { key: 'passportNumber', section: 'passport' },
  { key: 'inn', section: 'requisites' },
  { key: 'bankName', section: 'requisites' },
  { key: 'settlementAccount', section: 'requisites' },
  { key: 'workTypes', section: 'specialization' },
  { key: 'roleTypes', section: 'specialization' },
  { key: 'hourlyRate', section: 'finances' },
]
const profilePct = computed(() => {
  const c = contractor.value
  if (!c) return 0
  let filled = 0
  for (const f of profileFields) {
    const v = c[f.key]
    if (Array.isArray(v) ? v.length > 0 : !!v) filled++
  }
  return Math.round(filled / profileFields.length * 100)
})
const profileNextSection = computed(() => {
  const c = contractor.value
  if (!c) return 'contacts'
  for (const f of profileFields) {
    const v = c[f.key]
    if (!(Array.isArray(v) ? v.length > 0 : !!v)) return f.section
  }
  return 'contacts'
})

// ── Quick actions ─────────────────────────────────────────────────
const quickActions = computed(() => {
  const items = [
    { key: 'tasks',    icon: '◎', label: 'Мои задачи', badge: activeCount.value || '' },
    { key: 'contacts', icon: '☎', label: 'Контакты',   badge: '' },
    { key: 'documents',icon: '◓', label: 'Документы',  badge: '' },
    { key: 'finances', icon: '◕', label: 'Финансы',    badge: '' },
  ]
  return items
})

// ── Portfolio stats ───────────────────────────────────────────────
const portfolioStats = computed(() => {
  const all = workItems.value || []
  const doneItems = all.filter((i: any) => i.status === 'done')
  const projects = new Set(doneItems.map((i: any) => i.projectSlug))
  const photoCount = doneItems.reduce((sum: number, i: any) => sum + (i.photoCount || 0), 0)
  return {
    doneCount: doneItems.length,
    projectCount: projects.size,
    photoCount,
  }
})

// ── Notification settings (localStorage) ─────────────────────────
const NOTIF_LS_KEY = `cab_notif_${contractorId}`
function loadNotifSettings() {
  if (process.server) return { newTasks: true, deadlines: true, comments: true, statusChanges: false }
  try {
    const raw = localStorage.getItem(NOTIF_LS_KEY)
    return raw ? JSON.parse(raw) : { newTasks: true, deadlines: true, comments: true, statusChanges: false }
  } catch { return { newTasks: true, deadlines: true, comments: true, statusChanges: false } }
}
const notifSettings = reactive(loadNotifSettings())
function saveNotifSettings() {
  if (!process.server) localStorage.setItem(NOTIF_LS_KEY, JSON.stringify({ ...notifSettings }))
}

// ── Photos ────────────────────────────────────────────────────────
const photosByItem = reactive<Record<number, any[]>>({})
const uploadingFor = ref<number | null>(null)
const lightboxUrl = ref<string | null>(null)

async function loadPhotos(itemId: number) {
  const photos = await $fetch<any[]>(`/api/contractors/${contractorId}/work-items/${itemId}/photos`)
  photosByItem[itemId] = photos
}

async function uploadPhotos(item: any, event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return
  uploadingFor.value = item.id
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const photo = await $fetch<any>(`/api/contractors/${contractorId}/work-items/${item.id}/photos`, {
        method: 'POST', body: fd,
      })
      if (!photosByItem[item.id]) photosByItem[item.id] = []
      photosByItem[item.id].push(photo)
    }
    item.photoCount = (item.photoCount || 0) + files.length
  } finally {
    uploadingFor.value = null
    ;(event.target as HTMLInputElement).value = ''
  }
}

async function deletePhoto(itemId: number, photoId: number) {
  await $fetch(`/api/contractors/${contractorId}/work-items/${itemId}/photos/${photoId}`, { method: 'DELETE' })
  photosByItem[itemId] = (photosByItem[itemId] || []).filter((p: any) => p.id !== photoId)
  const item = (workItems.value || []).find((i: any) => i.id === itemId)
  if (item) item.photoCount = Math.max(0, (item.photoCount || 1) - 1)
}

// ── Comments ──────────────────────────────────────────────────────
const commentsByItem = reactive<Record<number, any[]>>({})
const commentText = reactive<Record<number, string>>({})
const sendingComment = ref<number | null>(null)

async function loadComments(itemId: number) {
  const comments = await $fetch<any[]>(`/api/contractors/${contractorId}/work-items/${itemId}/comments`)
  commentsByItem[itemId] = comments
}

async function sendComment(item: any) {
  const text = (commentText[item.id] || '').trim()
  if (!text) return
  sendingComment.value = item.id
  try {
    const c = await $fetch<any>(`/api/contractors/${contractorId}/work-items/${item.id}/comments`, {
      method: 'POST', body: { text },
    })
    if (!commentsByItem[item.id]) commentsByItem[item.id] = []
    commentsByItem[item.id].push(c)
    item.commentCount = (item.commentCount || 0) + 1
    commentText[item.id] = ''
  } finally {
    sendingComment.value = null
  }
}

function fmtTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

// Загружаем фото и комментарии при открытии задачи
watch(expandedId, (id) => {
  if (id !== null) {
    loadPhotos(id)
    loadComments(id)
  }
})

async function saveTaskDetails(item: any) {
  savingItem.value = item.id
  const edit = editMap[item.id]
  try {
    const updated = await $fetch<any>(`/api/contractors/${contractorId}/work-items/${item.id}`, {
      method: 'PUT',
      body: { notes: edit.notes, dateStart: edit.dateStart || null, dateEnd: edit.dateEnd || null },
    })
    item.notes = updated.notes
    item.dateStart = updated.dateStart
    item.dateEnd = updated.dateEnd
    expandedId.value = null
  } finally {
    savingItem.value = null
  }
}

// ── Profile ───────────────────────────────────────────────────────
const ROLE_GROUPS = [
  {
    label: 'Управление',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['general_contractor','foreman','site_manager','estimator'].includes(r.value)
    ),
  },
  {
    label: 'Конструктив',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['demolition_worker','mason','concrete_worker','reinforcer','welder'].includes(r.value)
    ),
  },
  {
    label: 'Инженерные системы',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['electrician','plumber','hvac_engineer','low_current_engineer','gas_engineer','smart_home_installer','security_installer','av_installer'].includes(r.value)
    ),
  },
  {
    label: 'Чистовая отделка',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['plasterer','painter','tiler','floor_installer','wallpaper_installer','decorative_finish_specialist'].includes(r.value)
    ),
  },
  {
    label: 'Столярные / плотницкие',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['carpenter','joiner','drywall_installer','window_installer','glazier','furniture_assembler'].includes(r.value)
    ),
  },
  {
    label: 'Специальные',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['stone_worker','facade_worker','roofer','landscape_worker','pool_installer','cleaner'].includes(r.value)
    ),
  },
]

const WORK_GROUPS = [
  {
    label: 'Демонтаж и подготовка',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['demolition','debris_removal'].includes(w.value)
    ),
  },
  {
    label: 'Конструктив',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['masonry','concrete_work','screed','waterproofing','partition_installation','insulation'].includes(w.value)
    ),
  },
  {
    label: 'Инженерные системы',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['electrical_installation','plumbing_installation','hvac','heating','smart_home','low_current','gas_installation','security_systems','av_systems'].includes(w.value)
    ),
  },
  {
    label: 'Чистовая отделка',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['plastering','puttying','tile_installation','painting','wallpapering','ceiling_installation','floor_installation','decorative_plaster'].includes(w.value)
    ),
  },
  {
    label: 'Столярные / плотницкие',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['carpentry','joinery','window_installation','door_installation','built_in_furniture','drywall_installation'].includes(w.value)
    ),
  },
  {
    label: 'Специальные',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['stone_cladding','facade_works','roofing','landscaping','pool_installation','furniture_installation','final_cleaning'].includes(w.value)
    ),
  },
]

function toggleArr(arr: string[], val: string) {
  const idx = arr.indexOf(val)
  if (idx === -1) arr.push(val)
  else arr.splice(idx, 1)
}

const saving = ref(false)
const saveMsg = ref('')

async function saveProfile() {
  saving.value = true
  saveMsg.value = ''
  try {
    await $fetch(`/api/contractors/${contractorId}/self`, {
      method: 'PUT',
      body: { ...form },
    })
    await refresh()
    saveMsg.value = 'Сохранено!'
    setTimeout(() => (saveMsg.value = ''), 3000)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cab-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--glass-page-bg, #f0f4ff);
}

/* Header */
.cab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.25));
}
.cab-logo {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--glass-text, #1a1a2e);
}
.cab-logo span { font-weight: 400; font-size: 0.95rem; opacity: 0.65; margin-left: 6px; }
.cab-hright { display: flex; align-items: center; gap: 14px; }
.cab-hname { font-size: 0.9rem; opacity: 0.75; }
.cab-logout {
  cursor: pointer;
  background: none;
  border: none;
  font-size: 0.85rem;
}

.cab-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 60px;
  opacity: 0.5;
  font-size: 1.1rem;
}

/* Body layout */
.cab-body {
  flex: 1;
  display: flex;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 20px;
  gap: 24px;
  align-items: flex-start;
}

/* Sidebar */
.cab-sidebar {
  width: var(--ds-sidebar-width, 200px);
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
  font-size: 0.8rem;
  color: var(--glass-text, #1a1a2e);
  opacity: 0.64;
  border-radius: 9px;
  transition: background 0.15s, opacity 0.15s, border-color 0.15s;
}
.cab-nav-item:hover { background: color-mix(in srgb, var(--glass-bg) 82%, transparent); opacity: .92; }
.cab-nav-item.active {
  background: color-mix(in srgb, var(--glass-bg) 92%, transparent);
  border: none;
  opacity: 1;
  font-weight: 600;
}
.cab-nav-icon { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }
.cab-badge {
  margin-left: auto;
  background: rgba(100,110,200,0.25);
  color: var(--glass-text, #1a1a2e);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

/* Main */
.cab-main { flex: 1; min-width: 0; }
.cab-inner { max-width: 900px; }

/* Empty state */
.cab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
  opacity: 0.55;
  background: var(--glass-bg, rgba(255,255,255,0.2));
  border: 1px dashed var(--glass-border, rgba(255,255,255,0.3));
  border-radius: 16px;
}
.cab-empty-icon { font-size: 2.5rem; margin-bottom: 14px; }
.cab-empty p { font-size: 0.95rem; line-height: 1.6; margin: 0; }

/* Filters */
.cab-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.cab-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  background: var(--glass-bg, rgba(255,255,255,0.2));
  backdrop-filter: blur(8px);
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  cursor: pointer;
  opacity: 0.65;
  transition: opacity 0.15s, background 0.15s;
}
.cab-filter-btn:hover { opacity: 1; }
.cab-filter-btn.active {
  opacity: 1;
  background: rgba(100,110,200,0.18);
  border-color: rgba(100,110,200,0.5);
  font-weight: 600;
}
.cab-filter-count {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 8px;
  background: rgba(100,110,200,0.15);
}

/* Project groups */
.cab-project-group { margin-bottom: 28px; }
.cab-proj-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cab-proj-title {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  opacity: 0.5;
}
.cab-proj-stats { font-size: 0.7rem; opacity: 0.4; }
.cab-proj-progress {
  height: 3px;
  background: rgba(255,255,255,0.18);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}
.cab-proj-progress-bar {
  height: 100%;
  background: rgba(40,160,100,0.6);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.cab-tasks { display: flex; flex-direction: column; gap: 10px; }

/* Task card */
.cab-task {
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: box-shadow 0.2s;
}
.cab-task.expanded {
  box-shadow: 0 8px 32px rgba(80,90,180,0.12);
}
.cab-task-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  cursor: pointer;
  user-select: none;
}
.cab-task-expand-icon {
  font-size: 0.7rem;
  opacity: 0.45;
  flex-shrink: 0;
  width: 12px;
}
.cab-task-name { font-size: 0.9rem; font-weight: 600; flex: 1; min-width: 0; }
.cab-task-meta { font-size: 0.78rem; opacity: 0.6; display: flex; gap: 8px; flex-wrap: wrap; }
.cab-task-budget { font-size: 0.78rem; opacity: 0.7; }
.cab-task-budget--lg { font-size: 0.88rem; font-weight: 600; opacity: 0.8; }
.cab-task-notes { font-size: 0.82rem; opacity: 0.65; line-height: 1.5; }
.cab-task-notes--preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Task inline edit */
.cab-task-edit { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); margin-top: 6px; }
.cab-task-edit-row { display: flex; gap: 12px; flex-wrap: wrap; }
.cab-task-edit-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; }
.cab-task-edit-field label { font-size: 0.72rem; opacity: 0.5; }
.cab-task-edit-inp { width: 100%; }
.cab-task-edit-actions { display: flex; gap: 10px; align-items: center; }
.cab-task-save {
  cursor: pointer;
  padding: 5px 18px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(180,180,220,0.45);
  backdrop-filter: blur(8px);
  transition: background 0.15s;
}
.cab-task-save:hover { background: rgba(255,255,255,0.5); }
.cab-task-save:disabled { opacity: 0.5; cursor: default; }
.cab-task-cancel {
  cursor: pointer;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-family: inherit;
  background: none;
  border: none;
  opacity: 0.45;
  transition: opacity 0.15s;
}
.cab-task-cancel:hover { opacity: 0.9; }

/* Status select */
.cab-status-select {
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  appearance: none;
  font-weight: 600;
  white-space: nowrap;
}
.cab-status--pending     { background: rgba(160,160,170,0.18); color: #888; }
.cab-status--planned     { background: rgba(80,120,220,0.15);  color: #3b6fd4; }
.cab-status--in_progress { background: rgba(210,160,30,0.15);  color: #a07a10; }
.cab-status--paused      { background: color-mix(in srgb, var(--ds-warning, #dc6428) 15%, transparent);  color: var(--ds-warning, #c05818); }
.cab-status--done        { background: rgba(40,160,100,0.15);  color: var(--ds-success, #228855); }
.cab-status--cancelled   { background: color-mix(in srgb, var(--ds-error, #c83232) 12%, transparent);   color: var(--ds-error, #bb3333); }

/* Form */
.cab-form-section {
  background: var(--glass-bg, rgba(255,255,255,0.35));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 18px;
}
.cab-form-section h3 {
  margin: 0 0 16px;
  font-size: 0.9rem;
  font-weight: 700;
  opacity: 0.65;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cab-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cab-field { display: flex; flex-direction: column; gap: 5px; }
.cab-field label { font-size: 0.78rem; opacity: 0.6; }
.cab-field .glass-input { width: 100%; resize: vertical; }
.cab-field-full { grid-column: 1 / -1; }
.cab-select { appearance: none; cursor: pointer; }

/* Tag groups */
.cab-tag-group { margin-bottom: 12px; }
.cab-tag-group-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.5;
  margin-bottom: 7px;
}
.cab-tags { display: flex; flex-wrap: wrap; gap: 7px; }
.cab-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(180,180,220,0.3);
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(6px);
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
  white-space: nowrap;
}
.cab-tag:hover { background: rgba(255,255,255,0.28); border-color: rgba(120,130,200,0.4); }
.cab-tag.active {
  background: rgba(100,110,200,0.22);
  border-color: rgba(100,110,200,0.55);
  font-weight: 600;
}

/* Form footer */
.cab-foot { display: flex; align-items: center; gap: 16px; margin-top: 6px; }
.cab-save {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 8px 26px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(180,180,220,0.45);
  backdrop-filter: blur(10px);
  transition: background 0.15s;
}
.cab-save:hover { background: rgba(255,255,255,0.5); }
.cab-save:disabled { opacity: 0.5; cursor: default; }
.cab-save-msg { font-size: 0.88rem; color: var(--ds-success, #4a7c59); font-weight: 600; }

.cab-footer { text-align: center; padding: 18px; font-size: 0.8rem; opacity: 0.35; }

/* Stages */
.cab-stages-block {
  border-radius: 12px;
  margin-bottom: 10px;
  overflow: hidden;
}
.cab-stages-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 18px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  text-align: left;
}
.cab-stages-head:hover { background: rgba(255,255,255,0.15); }
.cab-stages-icon { font-size: 0.7rem; opacity: 0.45; width: 12px; flex-shrink: 0; }
.cab-stages-title { font-size: 0.9rem; font-weight: 600; flex: 1; }
.cab-stages-count { font-size: 0.72rem; opacity: 0.45; white-space: nowrap; }
.cab-stages-list {
  border-top: 1px solid rgba(255,255,255,0.12);
  padding: 10px 0 8px;
}
.cab-stage-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 7px 18px;
  transition: background 0.1s;
}
.cab-stage-row:hover { background: rgba(255,255,255,0.1); }
.cab-stage-num {
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.35;
  min-width: 18px;
  text-align: right;
  flex-shrink: 0;
}
.cab-stage-label { font-size: 0.85rem; flex: 1; line-height: 1.4; }
.cab-stage-hint { font-size: 0.75rem; opacity: 0.5; white-space: nowrap; }

/* Mobile */
@media (max-width: 768px) {
  .cab-header { padding: 12px 16px; }
  .cab-body { flex-direction: column; padding: 16px 12px; gap: 16px; }
  .cab-sidebar { width: 100%; position: static; padding: 6px 0; }
  .cab-nav { flex-direction: row; overflow-x: auto; gap: 4px; padding: 0 4px 4px; }
  .cab-nav-item { flex-shrink: 0; border-radius: 20px; padding: 7px 14px; white-space: nowrap; }
  .cab-grid-2 { grid-template-columns: 1fr; }
}

/* Work type group */
.cab-wt-group { margin-bottom: 14px; }
.cab-wt-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: var(--glass-bg, rgba(255,255,255,0.28));
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(8px);
  transition: background 0.15s;
  margin-bottom: 6px;
}
.cab-wt-head:hover { background: rgba(255,255,255,0.38); }
.cab-wt-icon { font-size: 0.65rem; opacity: 0.45; width: 12px; flex-shrink: 0; }
.cab-wt-name { flex: 1; }
.cab-wt-count { font-size: 0.73rem; opacity: 0.45; font-weight: 400; white-space: nowrap; }
.cab-wt-prog { font-size: 0.73rem; font-weight: 700; opacity: 0.7; color: var(--ds-success, #228855); white-space: nowrap; }
.cab-wt-body { padding-left: 4px; }

/* Stage inline checklist */
.cab-stages-inline {
  margin-top: 12px;
  border-radius: 12px;
  padding: 14px 18px;
  background: var(--glass-bg, rgba(255,255,255,0.18));
}
.cab-stages-inline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cab-stages-inline-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.5; }
.cab-stages-inline-pct { font-size: 0.8rem; font-weight: 700; color: var(--ds-success, #228855); opacity: 0.85; }
.cab-stages-inline-bar-wrap {
  height: 3px;
  background: rgba(255,255,255,0.18);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}
.cab-stages-inline-bar {
  height: 100%;
  background: rgba(40,160,100,0.6);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.cab-stage-check-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 7px 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s;
  user-select: none;
}
.cab-stage-check-row:hover { background: rgba(255,255,255,0.15); }
.cab-stage-check-row.done { opacity: 0.55; }
.cab-stage-check-icon {
  font-size: 0.8rem;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
  color: var(--ds-success, #228855);
  font-weight: 700;
  opacity: 0.75;
}
.cab-stage-check-row:not(.done) .cab-stage-check-icon { color: var(--glass-text, #1a1a2e); opacity: 0.3; }
.cab-stage-check-row.done .cab-stage-label { text-decoration: line-through; }

/* Roadmap stage badge on task */
.cab-task-stage-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
  background: rgba(240,180,30,0.14);
  border: 1px solid rgba(220,160,20,0.3);
  color: rgba(160,110,10,1);
  white-space: nowrap;
  flex-shrink: 0;
}
.dark .cab-task-stage-badge {
  background: rgba(240,200,60,0.12);
  border-color: rgba(240,200,60,0.25);
  color: rgba(230,190,80,1);
}
/* Assigned-to master badge */
.cab-task-assigned-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
  background: rgba(80,140,255,0.1);
  border: 1px solid rgba(80,140,255,0.25);
  color: rgba(40,90,200,1);
  white-space: nowrap;
  flex-shrink: 0;
}
.dark .cab-task-assigned-badge {
  background: rgba(100,160,255,0.1);
  border-color: rgba(100,160,255,0.25);
  color: rgba(140,195,255,1);
}

/* Staff list */
.cab-staff-list { display: flex; flex-direction: column; gap: 10px; }
.cab-staff-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  text-decoration: none;
  color: var(--glass-text, #1a1a2e);
  transition: box-shadow 0.18s, background 0.15s;
}
.cab-staff-card:hover {
  box-shadow: 0 6px 24px rgba(80,90,180,0.13);
  background: rgba(255,255,255,0.35);
}
.cab-staff-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: rgba(100,110,200,0.15);
  border: 1px solid rgba(100,110,200,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  opacity: 0.75;
}
.cab-staff-info { flex: 1; min-width: 0; }
.cab-staff-name { font-size: 0.92rem; font-weight: 600; margin-bottom: 3px; }
.cab-staff-wt { font-size: 0.75rem; opacity: 0.55; margin-bottom: 4px; }
.cab-staff-contacts {
  display: flex; gap: 12px;
  font-size: 0.78rem; opacity: 0.6;
}
.cab-staff-arrow {
  font-size: 1.4rem;
  opacity: 0.25;
  flex-shrink: 0;
  line-height: 1;
}

/* Добавить задачу мастеру */
.cab-add-task-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.cab-add-task-btn {
  background: rgba(99, 179, 237, 0.18);
  border: 1px solid rgba(99, 179, 237, 0.4);
  color: var(--glass-text, #1a1a2e);
  border-radius: 20px;
  padding: 7px 18px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.cab-add-task-btn:hover { background: rgba(99, 179, 237, 0.32); }

.cab-inline-task-window {
  margin-bottom: 14px;
  border-radius: 16px;
  overflow: hidden;
}

/* Модальное окно */
.cab-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.cab-modal {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.cab-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.2));
}
.cab-modal-title {
  font-size: 1rem;
  font-weight: 700;
}
.cab-modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.5;
  padding: 4px 8px;
}
.cab-modal-close:hover { opacity: 1; }
.cab-modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cab-modal-row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.cab-modal-foot {
  padding: 16px 24px 20px;
  display: flex;
  gap: 10px;
  border-top: 1px solid var(--glass-border, rgba(255,255,255,0.2));
}

/* ── Dashboard ───────────────────────────────────────────────── */
/* Welcome card */
.dash-welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-radius: 16px;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}
.dash-welcome-left { display: flex; align-items: center; gap: 14px; }
.dash-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, var(--ds-accent, #4a80f0), var(--ds-accent-dark, #6c47ff));
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 1.4rem; font-weight: 800;
}
.dash-welcome-name { font-size: 1.15rem; font-weight: 700; color: var(--glass-text, #1a1a2e); }
.dash-welcome-role { font-size: 0.82rem; opacity: 0.55; margin-top: 2px; }

/* Profile progress ring */
.dash-profile-progress { display: flex; align-items: center; gap: 12px; }
.dash-profile-pct-ring {
  width: 52px; height: 52px; border-radius: 50%;
  background: conic-gradient(var(--ds-accent, #4a80f0) calc(var(--pct) * 1%), rgba(0,0,0,0.08) 0);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.dash-profile-pct-ring::after {
  content: '';
  position: absolute;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--glass-bg, #fff);
}
.dash-profile-pct-val {
  position: relative; z-index: 1;
  font-size: 0.72rem; font-weight: 800;
  color: var(--glass-text, #1a1a2e);
}
.dash-profile-progress-info { display: flex; flex-direction: column; gap: 2px; }
.dash-profile-progress-label { font-size: 0.78rem; opacity: 0.6; font-weight: 500; }
.dash-profile-fill-btn {
  background: none; border: none; color: var(--ds-accent, #4a80f0); cursor: pointer;
  font-size: 0.78rem; font-weight: 600; padding: 0; text-align: left;
}
.dash-profile-fill-btn:hover { text-decoration: underline; }

/* Quick actions */
.dash-quick-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
@media (max-width: 640px) { .dash-quick-nav { grid-template-columns: repeat(2, 1fr); } }
.dash-quick-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 14px 10px 12px; border-radius: 14px; border: none;
  cursor: pointer; gap: 6px;
  transition: transform 0.15s, box-shadow 0.15s;
  position: relative;
}
.dash-quick-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(74,128,240,0.12); }
.dash-quick-icon { font-size: 1.4rem; }
.dash-quick-label { font-size: 0.78rem; font-weight: 600; opacity: 0.7; }
.dash-quick-badge {
  position: absolute; top: 6px; right: 8px;
  background: var(--ds-accent, #4a80f0); color: #fff;
  font-size: 0.65rem; font-weight: 700;
  padding: 1px 6px; border-radius: 99px;
  min-width: 18px; text-align: center;
}

/* Projects */
.dash-projects {
  padding: 16px 20px;
  border-radius: 14px;
  margin-bottom: 14px;
}
.dash-projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.dash-project-card {
  display: flex; flex-direction: column;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(74,128,240,0.06);
  border: 1px solid var(--glass-border, rgba(0,0,0,0.06));
}
.dash-project-name { font-size: 0.88rem; font-weight: 600; }
.dash-project-slug { font-size: 0.72rem; opacity: 0.4; margin-top: 2px; }

.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
@media (max-width: 640px) { .dash-stats { grid-template-columns: repeat(2, 1fr); } }
.dash-stat {
  padding: 20px 16px 16px;
  border-radius: 16px;
  text-align: center;
}
.dash-stat-val {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  color: var(--glass-text, #1a1a2e);
}
.dash-stat-label {
  font-size: 0.75rem;
  opacity: 0.6;
  margin-top: 6px;
}
.dash-stat--blue .dash-stat-val { color: var(--ds-accent, #4a80f0); }
.dash-stat--green .dash-stat-val { color: var(--ds-success, #2ea86a); }
.dash-stat--red .dash-stat-val { color: var(--ds-error, #e05252); }
.dash-progress {
  padding: 16px 20px;
  border-radius: 14px;
  margin-bottom: 16px;
}
.dash-progress-head { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; font-weight: 600; }
.dash-progress-pct { opacity: 0.7; }
.dash-progress-bar-wrap { height: 8px; background: rgba(0,0,0,0.07); border-radius: 99px; overflow: hidden; }
.dash-progress-bar { height: 100%; background: linear-gradient(90deg, #4a80f0, #6c47ff); border-radius: 99px; transition: width 0.5s; }
.dash-section-title { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.5; margin-bottom: 10px; }
.dash-deadlines, .dash-nodue {
  padding: 16px 20px;
  border-radius: 14px;
  margin-bottom: 14px;
}
.dash-deadline-row, .dash-nodue-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid var(--glass-border, rgba(0,0,0,0.06));
  font-size: 0.88rem;
}
.dash-deadline-row:last-child, .dash-nodue-row:last-child { border-bottom: none; }
.dash-deadline-row.overdue .dash-deadline-title { color: var(--ds-error, #e05252); }
.dash-deadline-dot, .dash-nodue-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: rgba(0,0,0,0.15);
}
.dash-deadline-dot.red { background: var(--ds-error, #e05252); }
.dash-deadline-dot.amber { background: var(--ds-warning, #f0a030); }
.dash-deadline-title { flex: 1; font-weight: 500; }
.dash-deadline-proj { font-size: 0.78rem; opacity: 0.5; }
.dash-deadline-date { font-size: 0.78rem; font-weight: 600; white-space: nowrap; }
.dash-nodue-title { flex: 1; opacity: 0.8; }
.dash-nodue-proj { font-size: 0.78rem; opacity: 0.45; }

/* Overdue date highlight */
.cab-task-overdue { color: var(--ds-error, #e05252); font-weight: 700; }
.cab-task-counters { display: flex; gap: 8px; margin-top: 4px; }
.cab-task-counter { font-size: 0.75rem; opacity: 0.65; }

/* ── Photos ──────────────────────────────────────────────────── */
.cab-task-photos {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--glass-border, rgba(0,0,0,0.07));
}
.cab-task-photos-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.cab-task-photos-title { font-size: 0.82rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.55; }
.cab-photo-upload-btn {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
  background: rgba(74,128,240,0.1);
  border: 1px solid rgba(74,128,240,0.25);
  color: var(--ds-accent, #4a80f0);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.cab-photo-upload-btn:hover { background: rgba(74,128,240,0.18); }
.cab-photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
.cab-photo-thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
}
.cab-photo-thumb img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.cab-photo-thumb:hover img { transform: scale(1.05); }
.cab-photo-del {
  position: absolute;
  top: 4px; right: 4px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 0.6rem;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}
.cab-photo-thumb:hover .cab-photo-del { opacity: 1; }
.cab-photos-empty { font-size: 0.82rem; opacity: 0.4; padding: 6px 0; }

/* Lightbox */
.cab-lightbox {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,0.88);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cab-lightbox-img {
  max-width: 92vw;
  max-height: 90vh;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.cab-lightbox-close {
  position: absolute;
  top: 20px; right: 24px;
  background: rgba(255,255,255,0.12);
  border: none;
  color: #fff;
  font-size: 1.4rem;
  width: 44px; height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.cab-lightbox-close:hover { background: rgba(255,255,255,0.22); }

/* ── Comments ────────────────────────────────────────────────── */
.cab-task-comments {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--glass-border, rgba(0,0,0,0.07));
}
.cab-task-comments-title { font-size: 0.82rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.55; margin-bottom: 12px; }
.cab-comments-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; max-height: 240px; overflow-y: auto; }
.cab-comment {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(0,0,0,0.04);
}
.cab-comment--admin { background: color-mix(in srgb, var(--ds-accent, #4a80f0) 7%, transparent); border-left: 2px solid #4a80f0; }
.dark .cab-comment { background: rgba(255,255,255,0.05); }
.dark .cab-comment--admin { background: rgba(74,128,240,0.1); }
.cab-comment-author { font-size: 0.78rem; font-weight: 700; opacity: 0.7; }
.cab-comment-time { font-size: 0.72rem; opacity: 0.4; margin-left: 8px; }
.cab-comment-text { font-size: 0.88rem; margin-top: 4px; line-height: 1.45; white-space: pre-wrap; }
.cab-comments-empty { font-size: 0.82rem; opacity: 0.4; }
.cab-comment-form { display: flex; gap: 8px; align-items: flex-end; }
.cab-comment-input { flex: 1; resize: vertical; min-height: 56px; }
.cab-comment-send { white-space: nowrap; align-self: flex-end; }

/* ── Documents ───────────────────────────────────────────────── */
.cab-docs-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.cab-doc-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 12px;
}
.cab-doc-icon { font-size: 1.6rem; flex-shrink: 0; }
.cab-doc-info { flex: 1; min-width: 0; }
.cab-doc-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 3px; }
.cab-doc-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.75rem; opacity: 0.6; }
.cab-doc-cat {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(100,110,200,0.12);
  font-weight: 600;
}
.cab-doc-expires { color: var(--ds-warning, #c05818); font-weight: 600; }
.cab-doc-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.cab-doc-link {
  font-size: 0.8rem;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(74,128,240,0.1);
  border: 1px solid rgba(74,128,240,0.25);
  color: var(--ds-accent, #4a80f0);
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}
.cab-doc-link:hover { background: rgba(74,128,240,0.18); }
.cab-doc-del {
  background: rgba(200,50,50,0.08);
  border: 1px solid rgba(200,50,50,0.2);
  color: var(--ds-error, #bb3333);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cab-doc-del:hover { background: rgba(200,50,50,0.18); }

.cab-upload-btn {
  display: inline-flex;
  align-items: center;
  padding: 7px 18px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ds-accent, #4a80f0);
  background: rgba(74,128,240,0.1);
  border: 1px solid rgba(74,128,240,0.25);
  cursor: pointer;
  transition: background 0.15s;
}
.cab-upload-btn:hover { background: rgba(74,128,240,0.18); }

/* ── Certificates ────────────────────────────────────────────── */
.cab-certs-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.cab-cert-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(100,110,200,0.12);
  font-size: 0.82rem;
  font-weight: 500;
}
.cab-cert-del {
  background: none;
  border: none;
  font-size: 0.65rem;
  cursor: pointer;
  opacity: 0.5;
  padding: 2px;
}
.cab-cert-del:hover { opacity: 1; }
.cab-cert-add {
  display: flex;
  gap: 8px;
  align-items: center;
}
.cab-cert-add .glass-input { flex: 1; }

/* ── Checkbox ────────────────────────────────────────────────── */
.cab-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  cursor: pointer;
  padding: 8px 0;
}
.cab-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--ds-accent, #4a80f0);
  cursor: pointer;
}

/* ── Portfolio ───────────────────────────────────────────────── */
.cab-portfolio-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding: 20px 16px 16px;
  border-radius: 16px;
  text-align: center;
}
@media (max-width: 640px) { .cab-portfolio-stats { grid-template-columns: repeat(2, 1fr); } }
.cab-portfolio-stat-val {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
  color: var(--ds-accent, #4a80f0);
  display: block;
}
.cab-portfolio-stat-label {
  font-size: 0.72rem;
  opacity: 0.5;
  margin-top: 4px;
  display: block;
}
.cab-portfolio-specializations {
  padding: 14px 18px;
  border-radius: 14px;
  margin-bottom: 16px;
}
.cab-portfolio-spec-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.4;
  font-weight: 600;
  margin-bottom: 8px;
}
.cab-portfolio-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cab-portfolio-grid { display: flex; flex-direction: column; gap: 14px; }
.cab-portfolio-proj {
  padding: 14px 18px;
  border-radius: 14px;
}
.cab-portfolio-proj-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.cab-portfolio-proj-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--glass-text, #1a1a2e);
}
.cab-portfolio-proj-progress {
  font-size: 0.78rem;
  font-weight: 600;
  opacity: 0.5;
}
.cab-portfolio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(74, 128, 240, 0.04);
  margin-bottom: 4px;
}
.cab-portfolio-item-check {
  color: var(--ds-success, #2ea86a);
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.cab-portfolio-item-name { font-size: 0.88rem; font-weight: 500; flex: 1; }
.cab-portfolio-item-wt { font-size: 0.72rem; opacity: 0.4; }
.cab-portfolio-item-photos { font-size: 0.78rem; opacity: 0.6; flex-shrink: 0; }

/* ── Settings ────────────────────────────────────────────────── */
.cab-field-static {
  font-size: 0.9rem;
  padding: 8px 0;
  opacity: 0.7;
  font-weight: 500;
}
.cab-field-slug {
  font-family: monospace;
  letter-spacing: 0.04em;
  color: var(--glass-text, #1a1a2e);
  opacity: 0.85;
}
.cab-settings-hint {
  font-size: 0.85rem;
  opacity: 0.5;
  font-style: italic;
  margin: 0;
}

/* Notification toggles */
.cab-settings-toggles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cab-toggle-row {
  display: grid;
  grid-template-columns: 28px 1fr;
  grid-template-rows: auto auto;
  column-gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s;
}
.cab-toggle-row:hover {
  background: rgba(74, 128, 240, 0.04);
}
.cab-toggle-checkbox {
  grid-row: 1 / 3;
  width: 18px; height: 18px;
  margin-top: 2px;
  accent-color: var(--ds-accent, #4a80f0);
  cursor: pointer;
}
.cab-toggle-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
}
.cab-toggle-hint {
  font-size: 0.76rem;
  opacity: 0.45;
  grid-column: 2;
}
.cab-save-btn--sm {
  font-size: 0.8rem;
  padding: 8px 18px;
}
</style>
