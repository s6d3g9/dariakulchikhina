<template>
  <div class="cab-root glass-page">

    <div v-if="pending" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="contractor" class="cab-body">

      <!-- Sidebar -->
      <aside
        ref="sidebarRef"
        class="cab-sidebar cab-sidebar--persistent-nav glass-surface std-sidenav"
        :class="{ 'cab-sidebar--mobile-hidden': isMobileShell && mobileShellView === 'content' }"
        aria-label="Разделы кабинета подрядчика"
        :aria-hidden="isMobileShell && mobileShellView === 'content' ? 'true' : 'false'"
        tabindex="-1"
      >
        <div v-if="isMobileShell" class="cab-mobile-shell cab-mobile-shell--sidebar">
          <div class="cab-mobile-shell__copy">
            <p class="cab-mobile-shell__eyebrow">Навигация</p>
            <strong class="cab-mobile-shell__label">Разделы кабинета</strong>
          </div>
          <button type="button" class="cab-mobile-shell__btn" @click="openContractorContent">к экрану</button>
        </div>
        <nav class="cab-nav std-nav">
          <button
            v-for="item in nav" :key="item.key"
            class="cab-nav-item cab-nav-item--persistent-nav std-nav-item"
            :class="{ active: section === item.key, 'std-nav-item--active': section === item.key }"
            @click="section = item.key"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span class="cab-nav-label">{{ item.label }}</span>
            <span v-if="item.key === 'tasks' && activeCount" class="cab-badge">{{ activeCount }}</span>
            <span v-if="item.key === 'staff' && staff?.length" class="cab-badge">{{ staff.length }}</span>
            <span v-if="item.key === 'documents' && contractorDocs?.length" class="cab-badge">{{ contractorDocs.length }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main -->
      <main
        ref="mainRef"
        class="cab-main"
        :class="{ 'cab-main--mobile-hidden': isMobileShell && mobileShellView === 'sidebar' }"
        aria-label="Рабочая область подрядчика"
        :aria-hidden="isMobileShell && mobileShellView === 'sidebar' ? 'true' : 'false'"
        tabindex="-1"
      >
        <div class="cab-inner">
          <div v-if="isMobileShell" ref="mobileContentShellRef" class="cab-mobile-shell cab-mobile-shell--content">
            <button type="button" class="cab-mobile-shell__btn" @click="openContractorSidebar">разделы</button>
            <div class="cab-mobile-shell__copy cab-mobile-shell__copy--content">
              <p class="cab-mobile-shell__eyebrow">Активный экран</p>
              <strong class="cab-mobile-shell__label">{{ activeSectionLabel }}</strong>
            </div>
          </div>

          <!-- ── Обзор (Dashboard) ──────────────────────────────── -->
          <template v-if="section === 'dashboard'">
            <ContractorDashboardSection
              :contractor="contractor"
              :profile-pct="profilePct"
              :profile-next-section="profileNextSection"
              :quick-actions="quickActions"
              :dash-stats="dashStats"
              :linked-projects="linkedProjects"
              :dash-deadlines="dashDeadlines"
              :dash-no-due="dashNoDue"
              @navigate="(s: string) => section = s"
            />
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
                <div class="u-field">
                  <label>Мастер *</label>
                  <select v-model="newTask.masterContractorId" class="glass-input">
                    <option :value="null" disabled>— выберите мастера —</option>
                    <option v-for="m in staff" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label>Проект *</label>
                  <select v-model="newTask.projectSlug" class="glass-input">
                    <option value="" disabled>— выберите проект —</option>
                    <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label>Название задачи *</label>
                  <GlassInput v-model="newTask.title"  placeholder="Что нужно сделать…" />
                </div>
                <div class="u-field">
                  <label>Вид работ</label>
                  <select v-model="newTask.workType" class="glass-input">
                    <option value="">— не указан —</option>
                    <option v-for="w in CONTRACTOR_WORK_TYPE_OPTIONS" :key="w.value" :value="w.value">{{ w.label }}</option>
                  </select>
                </div>
                <div class="cab-modal-row2">
                  <div class="u-field">
                    <label>Дата начала</label>
                    <GlassInput v-model="newTask.dateStart"  placeholder="дд.мм.гггг" />
                  </div>
                  <div class="u-field">
                    <label>Дата окончания</label>
                    <GlassInput v-model="newTask.dateEnd"  placeholder="дд.мм.гггг" />
                  </div>
                </div>
                <div class="u-field">
                  <label>Бюджет</label>
                  <GlassInput v-model="newTask.budget"  placeholder="например: 50 000 ₽" />
                </div>
                <div class="u-field">
                  <label>Примечание</label>
                  <textarea v-model="newTask.notes" class="glass-input u-ta" rows="3" placeholder="Уточнения, материалы, особые требования…" />
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
                                <GlassInput v-model="editMap[item.id].dateStart" class=" cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" />
                              </div>
                              <div class="cab-task-edit-field">
                                <label>Дата окончания</label>
                                <GlassInput v-model="editMap[item.id].dateEnd" class=" cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" />
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

          <!-- ── Коммуникации ─────────────────────────────────── -->
          <template v-else-if="section === 'communications'">
            <ContractorCommunicationsSection
              v-model="selectedCommunicationProjectSlug"
              :projects="allProjects"
            />
          </template>

          <!-- ── Контактные данные ──────────────────────────────── -->
          <template v-else-if="section === 'contacts'">
            <ContractorContactsSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Паспортные данные ──────────────────────────────── -->
          <template v-else-if="section === 'passport'">
            <ContractorPassportSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Реквизиты ──────────────────────────────────────── -->
          <template v-else-if="section === 'requisites'">
            <ContractorRequisitesSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Документы ──────────────────────────────────────── -->
          <template v-else-if="section === 'documents'">
            <div class="u-grid-2" style="margin-bottom:12px">
              <div class="u-field">
                <label>Поиск</label>
                <GlassInput v-model="docsSearch"  placeholder="Название, заметка" />
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
                  <GlassInput v-model="newDocTitle"  placeholder="Название документа" />
                </div>
                <div class="u-field">
                  <label>Категория</label>
                  <select v-model="newDocCategory" class="glass-input cab-select">
                    <option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
                  </select>
                </div>
                <div class="u-field u-field--full">
                  <label>Примечание</label>
                  <GlassInput v-model="newDocNotes"  placeholder="Необязательно" />
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
                <div class="cab-doc-icon">
                  {{ doc.category === 'passport' ? '🪪' : doc.category === 'license' ? '📜' : doc.category === 'certificate' ? '📄' : doc.category === 'contract' ? '📋' : doc.category === 'insurance' ? '🛡' : doc.category === 'diploma' ? '🎓' : '📎' }}
                </div>
                <div class="cab-doc-info">
                  <div class="cab-doc-title">{{ doc.title }}</div>
                  <div class="cab-doc-meta">
                    <span class="cab-doc-cat">{{ DOC_CATEGORIES.find((c: any) => c.value === doc.category)?.label || doc.category }}</span>
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
            <div v-else-if="contractorDocs?.length" class="cab-empty">
              <div class="cab-empty-icon">🔎</div>
              <p>По фильтру ничего не найдено.</p>
            </div>
            <div v-else class="cab-empty">
              <div class="cab-empty-icon">📂</div>
              <p>Документов пока нет.<br>Загрузите паспорт, лицензии, сертификаты и другие документы.</p>
            </div>
          </template>

          <!-- ── Специализации ──────────────────────────────────── -->
          <template v-else-if="section === 'specialization'">
            <ContractorSpecializationSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Финансы ────────────────────────────────────────── -->
          <template v-else-if="section === 'finances'">
            <ContractorFinancesSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Портфолио ──────────────────────────────────────── -->
          <template v-else-if="section === 'portfolio'">
            <ContractorPortfolioSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              :stats="portfolioStats"
              :contractor="contractor"
              :by-project="byProject"
              @save="saveProfile"
            />
          </template>

          <!-- ── Настройки ──────────────────────────────────────── -->
          <template v-else-if="section === 'settings'">
            <ContractorSettingsSection
              :contractor-id="contractorId"
              :contractor="contractor"
              :notif-settings="notifSettings"
              @save-notifications="saveNotifSettings"
            />
          </template>

          <!-- ── Бригада ────────────────────────────────────── -->
          <template v-else-if="section === 'staff'">
            <ContractorStaffSection :staff="staff" />
          </template>

        </div>
      </main>

      <button
        v-if="showMobileQuickSwitch"
        type="button"
        class="cab-mobile-shell-fab"
        aria-label="Открыть разделы кабинета"
        @click="openContractorSidebar"
      >
        разделы
      </button>
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
import ContractorDashboardSection from './ContractorDashboardSection.vue'
import ContractorStaffSection from './ContractorStaffSection.vue'
import ContractorCommunicationsSection from './ContractorCommunicationsSection.vue'
import ContractorContactsSection from './ContractorContactsSection.vue'
import ContractorPassportSection from './ContractorPassportSection.vue'
import ContractorRequisitesSection from './ContractorRequisitesSection.vue'
import ContractorSpecializationSection from './ContractorSpecializationSection.vue'
import ContractorFinancesSection from './ContractorFinancesSection.vue'
import ContractorPortfolioSection from './ContractorPortfolioSection.vue'
import ContractorSettingsSection from './ContractorSettingsSection.vue'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'sbp', label: 'СБП' },
  { value: 'card_transfer', label: 'На карту' },
  { value: 'bank_transfer', label: 'Безналичный (р/с)' },
  { value: 'crypto', label: 'Криптовалюта' },
]

definePageMeta({ layout: 'contractor', middleware: ['contractor'] })
const route = useRoute()
const sidebarRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const mobileContentShellRef = ref<HTMLElement | null>(null)
const isDesktopContractorShell = ref(false)
const mobileShellView = ref<'sidebar' | 'content'>('content')
const mobileContentScrollState = reactive({
  route: '',
  y: 0,
})
const showMobileQuickSwitch = ref(false)
let contractorShellScrollFrame = 0
let contractorShellQuickSwitchFrame = 0

const isMobileShell = computed(() => !isDesktopContractorShell.value)

function syncDesktopContractorShellState() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  isDesktopContractorShell.value = window.innerWidth > 768
}

function cancelContractorShellScrollFrame() {
  if (!import.meta.client || typeof window === 'undefined' || !contractorShellScrollFrame) {
    return
  }

  window.cancelAnimationFrame(contractorShellScrollFrame)
  contractorShellScrollFrame = 0
}

function cancelContractorShellQuickSwitchFrame() {
  if (!import.meta.client || typeof window === 'undefined' || !contractorShellQuickSwitchFrame) {
    return
  }

  window.cancelAnimationFrame(contractorShellQuickSwitchFrame)
  contractorShellQuickSwitchFrame = 0
}

function rememberContractorContentScroll() {
  if (!import.meta.client || typeof window === 'undefined' || isDesktopContractorShell.value) {
    return
  }

  if (mobileShellView.value !== 'content') {
    return
  }

  mobileContentScrollState.route = route.fullPath
  mobileContentScrollState.y = window.scrollY
}

function syncContractorContentQuickSwitch() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (isDesktopContractorShell.value || mobileShellView.value !== 'content') {
    showMobileQuickSwitch.value = false
    return
  }

  const shell = mobileContentShellRef.value
  if (!shell) {
    showMobileQuickSwitch.value = window.scrollY > 120
    return
  }

  showMobileQuickSwitch.value = shell.getBoundingClientRect().bottom < 0
}

function queueContractorContentQuickSwitchSync() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  cancelContractorShellQuickSwitchFrame()
  contractorShellQuickSwitchFrame = window.requestAnimationFrame(() => {
    contractorShellQuickSwitchFrame = 0
    syncContractorContentQuickSwitch()
  })
}

async function syncContractorShellViewport(nextView: 'sidebar' | 'content', behavior: ScrollBehavior) {
  if (!import.meta.client || typeof window === 'undefined' || isDesktopContractorShell.value) {
    return
  }

  await nextTick()
  cancelContractorShellScrollFrame()

  contractorShellScrollFrame = window.requestAnimationFrame(() => {
    contractorShellScrollFrame = 0

    const target = nextView === 'sidebar' ? sidebarRef.value : mainRef.value
    const shouldRestoreContentScroll = nextView === 'content'
      && mobileContentScrollState.route === route.fullPath
      && mobileContentScrollState.y > 0

    if (shouldRestoreContentScroll) {
      window.scrollTo({ top: mobileContentScrollState.y, behavior })
    } else {
      target?.scrollIntoView({ behavior, block: 'start' })
    }

    target?.focus({ preventScroll: true })
  })
}

async function setContractorShellView(
  nextView: 'sidebar' | 'content',
  options: { behavior?: ScrollBehavior, forceScroll?: boolean } = {},
) {
  if (isDesktopContractorShell.value) {
    mobileShellView.value = 'content'
    return
  }

  if (mobileShellView.value === 'content' && nextView !== 'content') {
    rememberContractorContentScroll()
  }

  const changed = mobileShellView.value !== nextView
  mobileShellView.value = nextView

  if (!changed && !options.forceScroll) {
    return
  }

  await syncContractorShellViewport(nextView, options.behavior || 'smooth')
}

function openContractorSidebar() {
  void setContractorShellView('sidebar', { behavior: 'smooth', forceScroll: true })
}

function openContractorContent() {
  void setContractorShellView('content', { behavior: 'smooth', forceScroll: true })
}

const contractorId = Number(route.params.id)
if (isNaN(contractorId) || contractorId <= 0) {
  throw createError({ statusCode: 400, statusMessage: 'Неверный ID подрядчика' })
}

const { data: contractor, error: contractorError, pending, refresh } = await useFetch<any>(`/api/contractors/${contractorId}`)
if (contractorError.value) {
  const statusCode = contractorError.value.statusCode || contractorError.value.status || 500
  throw createError({
    statusCode,
    statusMessage: contractorError.value.statusMessage || contractorError.value.message || 'Не удалось загрузить кабинет подрядчика',
  })
}

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
const docsSearch = ref('')
const docsFilter = ref('')
const docsSort = ref<'new' | 'old'>('new')

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
    { key: 'communications', icon: '◉', label: 'Коммуникации' },
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
const activeSectionLabel = computed(() => nav.value.find(item => item.key === section.value)?.label || 'Обзор')

watch(section, async (nextSection, prevSection) => {
  if (nextSection === prevSection) {
    return
  }

  if (!import.meta.client || typeof window === 'undefined' || !isMobileShell.value) {
    return
  }

  mobileContentScrollState.route = ''
  mobileContentScrollState.y = 0
  await setContractorShellView('content', { behavior: 'auto', forceScroll: true })
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

watch([isDesktopContractorShell, () => route.fullPath], async ([desktop]) => {
  if (desktop) {
    mobileShellView.value = 'content'
    showMobileQuickSwitch.value = false
    return
  }

  await setContractorShellView('content')
}, { immediate: true })

watch([isDesktopContractorShell, mobileShellView, () => route.fullPath, section], async () => {
  await nextTick()
  queueContractorContentQuickSwitchSync()
}, { immediate: true })

onMounted(() => {
  syncDesktopContractorShellState()
  window.addEventListener('resize', syncDesktopContractorShellState)
  window.addEventListener('scroll', queueContractorContentQuickSwitchSync, { passive: true })
  queueContractorContentQuickSwitchSync()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncDesktopContractorShellState)
  window.removeEventListener('scroll', queueContractorContentQuickSwitchSync)
  cancelContractorShellScrollFrame()
  cancelContractorShellQuickSwitchFrame()
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
  if (import.meta.server) return new Set()
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
  if (!import.meta.server) localStorage.setItem(lsKey(projectSlug, wt), JSON.stringify([...s]))
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

const selectedCommunicationProjectSlug = ref('')

watch(allProjects, (projects) => {
  if (!projects.length) {
    selectedCommunicationProjectSlug.value = ''
    return
  }

  if (!projects.some(project => project.slug === selectedCommunicationProjectSlug.value)) {
    selectedCommunicationProjectSlug.value = projects[0].slug
  }
}, { immediate: true })

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
  if (import.meta.server) return { newTasks: true, deadlines: true, comments: true, statusChanges: false }
  try {
    const raw = localStorage.getItem(NOTIF_LS_KEY)
    return raw ? JSON.parse(raw) : { newTasks: true, deadlines: true, comments: true, statusChanges: false }
  } catch { return { newTasks: true, deadlines: true, comments: true, statusChanges: false } }
}
const notifSettings = reactive(loadNotifSettings())
function saveNotifSettings() {
  if (!import.meta.server) localStorage.setItem(NOTIF_LS_KEY, JSON.stringify({ ...notifSettings }))
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

<style scoped src="./ContractorIndexPage.scoped.css"></style>
