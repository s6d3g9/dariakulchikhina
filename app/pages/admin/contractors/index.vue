<template>
  <div>
    <!-- ── Project filter banner ── -->
    <div v-if="projectSlugFilter" class="ct-filter-info glass-surface glass-card">
      <span>Фильтр по проекту: <b>{{ projectSlugFilter }}</b></span>
      <NuxtLink :to="`/admin/projects/${projectSlugFilter}`" class="ct-filter-link">← к проекту</NuxtLink>
      <NuxtLink to="/admin/contractors" class="ct-filter-link">показать всех</NuxtLink>
    </div>

    <!-- ── Contractor cabinet view ── -->
    <div v-if="selectedId" class="ent-cabinet-wrap">
      <div class="ent-cabinet-topbar">
        <button class="ent-back-btn a-btn-sm" @click="selectedId = null">← к списку</button>
        <span v-if="selected" class="ent-cabinet-title">{{ selected.name }}</span>
        <div class="ent-cabinet-actions">
          <button class="a-btn-sm" @click="openEdit(selected)">✎ редактировать</button>
          <button class="a-btn-sm a-btn-danger" @click="del(selected!.id)">× удалить</button>
        </div>
      </div>
      <AdminContractorCabinet :contractor-id="selectedId" />
    </div>

    <!-- ── Intake detail view ── -->
    <div v-else-if="selectedIntakeId && selectedIntake" class="ct-intake-view">
      <div class="ct-topbar">
        <div class="ct-topbar-left">
          <button class="a-btn-sm" @click="selectedIntakeId = null">← к доске</button>
          <span class="ct-title">заявка</span>
        </div>
        <div class="ct-topbar-right">
          <select v-model="selectedIntake.status" class="ct-intake-status-sel glass-input"
            @change="updateIntakeStatus(selectedIntake.id, ($event.target as HTMLSelectElement).value)">
            <option value="new">Новая</option>
            <option value="reviewed">Рассмотрена</option>
            <option value="added">Добавлен</option>
            <option value="rejected">Отклонена</option>
          </select>
        </div>
      </div>
      <div class="ct-intake-detail glass-surface glass-card">
        <div class="ct-intake-dhead">
          <div class="ct-intake-dtitle">{{ selectedIntake.name }}</div>
          <span class="ct-intake-status-pill" :class="`ct-intake-pill--${selectedIntake.status}`">
            {{ { new: 'Новая', reviewed: 'Рассмотрена', added: 'Добавлен', rejected: 'Отклонена' }[selectedIntake.status] ?? selectedIntake.status }}
          </span>
        </div>
        <div class="ct-intake-grid">
          <div v-if="selectedIntake.companyName" class="ct-intake-field">
            <span class="ct-intake-label">Компания</span>
            <span class="ct-intake-val">{{ selectedIntake.companyName }}</span>
          </div>
          <div class="ct-intake-field">
            <span class="ct-intake-label">Телефон</span>
            <a :href="`tel:${selectedIntake.phone}`" class="ct-intake-val ct-intake-link">{{ selectedIntake.phone }}</a>
          </div>
          <div v-if="selectedIntake.email" class="ct-intake-field">
            <span class="ct-intake-label">Email</span>
            <a :href="`mailto:${selectedIntake.email}`" class="ct-intake-val ct-intake-link">{{ selectedIntake.email }}</a>
          </div>
          <div v-if="selectedIntake.city" class="ct-intake-field">
            <span class="ct-intake-label">Город</span>
            <span class="ct-intake-val">{{ selectedIntake.city }}</span>
          </div>
          <div v-if="selectedIntake.createdAt" class="ct-intake-field">
            <span class="ct-intake-label">Дата заявки</span>
            <span class="ct-intake-val">{{ fmtIntakeDate(selectedIntake.createdAt) }}</span>
          </div>
        </div>
        <div v-if="selectedIntake.workTypes?.length" class="ct-intake-wt">
          <div class="ct-intake-label">Виды работ</div>
          <div class="ct-intake-chips">
            <span v-for="wt in selectedIntake.workTypes" :key="wt" class="ct-intake-chip">{{ wt }}</span>
          </div>
        </div>
        <div v-if="selectedIntake.notes" class="ct-intake-notes">
          <div class="ct-intake-label">Примечания</div>
          <p class="ct-intake-notes-text">{{ selectedIntake.notes }}</p>
        </div>
      </div>
    </div>

    <!-- ── Board view ── -->
    <div v-else class="ct-root">
      <div class="ct-topbar">
        <div class="ct-topbar-left">
          <span class="ct-title">подрядчики</span>
          <span class="ct-total">{{ (contractors?.length ?? 0) + (intakes?.length ?? 0) }}</span>
        </div>
        <div class="ct-topbar-right">
          <input v-model="searchQuery" class="glass-input ct-search" placeholder="поиск..." />
          <button class="a-btn-sm" @click="openCreate">+ добавить</button>
          <button class="a-btn-sm" @click="refresh(); refreshIntakes()">↺</button>
        </div>
      </div>

      <!-- ── Board ── -->
      <div class="ct-board">

        <!-- Col 1: Companies -->
        <div class="ct-col">
          <div class="ct-col-head" style="border-top-color: #f59e0b;">
            <span class="ct-col-title">Подрядчики</span>
            <span class="ct-col-count">{{ filteredCompanies.length }}</span>
          </div>
          <div class="ct-col-body">
            <div v-if="pending && !hasContractorsCache" v-for="i in 2" :key="i" class="ct-skel" />
            <div v-else-if="filteredCompanies.length === 0" class="ct-col-empty">—</div>
            <div v-for="c in filteredCompanies" :key="c.id" class="ct-card glass-card" @click="selectContractor(c)">
              <div class="ct-card-who">
                <div class="ct-avatar ct-av--company">{{ c.name?.charAt(0)?.toUpperCase() || '?' }}</div>
                <div class="ct-card-meta">
                  <div class="ct-card-name">{{ c.companyName || c.name }}</div>
                  <div v-if="c.phone || c.city" class="ct-card-sub">{{ [c.city, c.phone].filter(Boolean).join(' · ') }}</div>
                </div>
              </div>
              <div v-if="c.workTypes?.length" class="ct-card-tags">
                <span v-for="wt in c.workTypes.slice(0, 3)" :key="wt" class="ct-tag">{{ wt }}</span>
                <span v-if="c.workTypes.length > 3" class="ct-tag ct-tag--more">+{{ c.workTypes.length - 3 }}</span>
              </div>
              <div v-if="(mastersByParent.get(c.id) || []).length > 0" class="ct-card-masters">
                <span class="ct-card-masters-label">мастеров</span>
                <span class="ct-card-masters-count">{{ (mastersByParent.get(c.id) || []).length }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Col 2: Masters -->
        <div class="ct-col">
          <div class="ct-col-head" style="border-top-color: #3b82f6;">
            <span class="ct-col-title">Мастера</span>
            <span class="ct-col-count">{{ filteredAllMasters.length }}</span>
          </div>
          <div class="ct-col-body">
            <div v-if="pending && !hasContractorsCache" v-for="i in 3" :key="i" class="ct-skel" />
            <div v-else-if="filteredAllMasters.length === 0" class="ct-col-empty">—</div>
            <div v-for="m in filteredAllMasters" :key="m.id" class="ct-card glass-card" @click="selectContractor(m)">
              <div class="ct-card-who">
                <div class="ct-avatar ct-av--master">{{ m.name?.charAt(0)?.toUpperCase() || '?' }}</div>
                <div class="ct-card-meta">
                  <div class="ct-card-name">{{ m.name }}</div>
                  <div v-if="m.phone || parentNameOf(m)" class="ct-card-sub">{{ [parentNameOf(m), m.phone].filter(Boolean).join(' · ') }}</div>
                </div>
              </div>
              <div v-if="m.workTypes?.length" class="ct-card-tags">
                <span v-for="wt in m.workTypes.slice(0, 3)" :key="wt" class="ct-tag">{{ wt }}</span>
                <span v-if="m.workTypes.length > 3" class="ct-tag ct-tag--more">+{{ m.workTypes.length - 3 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Col 3: Intakes -->
        <div class="ct-col">
          <div class="ct-col-head" style="border-top-color: #ef4444;">
            <span class="ct-col-title">Заявки</span>
            <span class="ct-col-count" :class="{ 'ct-col-count--alert': newIntakesCount > 0 }">
              {{ intakes?.length ?? 0 }}
              <span v-if="newIntakesCount" class="ct-col-new-dot" />
            </span>
          </div>
          <div class="ct-col-body">
            <div v-if="intakesPending" v-for="i in 2" :key="i" class="ct-skel" />
            <div v-else-if="!intakes?.length" class="ct-col-empty">—</div>
            <div
              v-for="intake in intakes" :key="intake.id"
              class="ct-card glass-card"
              :class="{ 'ct-card--new': intake.status === 'new' }"
              @click="selectedIntakeId = intake.id"
            >
              <div class="ct-card-who">
                <div class="ct-avatar ct-av--intake">{{ intake.name?.charAt(0)?.toUpperCase() || '?' }}</div>
                <div class="ct-card-meta">
                  <div class="ct-card-name">{{ intake.name }}</div>
                  <div v-if="intake.createdAt" class="ct-card-sub">{{ fmtIntakeDate(intake.createdAt) }}</div>
                </div>
                <span class="ct-intake-status-dot" :class="`ct-intake-dot--${intake.status}`" style="margin-left: auto; flex-shrink: 0;" />
              </div>
              <div v-if="intake.workTypes?.length" class="ct-card-tags">
                <span v-for="wt in intake.workTypes.slice(0, 3)" :key="wt" class="ct-tag">{{ wt }}</span>
                <span v-if="intake.workTypes.length > 3" class="ct-tag ct-tag--more">+{{ intake.workTypes.length - 3 }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ══ Modal ══ -->
    <Teleport to="body">
      <div v-if="showModal" class="ct-backdrop" @click.self="closeModal">
        <div class="ct-modal glass-surface">
          <div class="ct-modal-head">
            <span>{{ editingId ? 'редактировать' : 'добавить' }} подрядчика</span>
            <button class="ct-modal-close" @click="closeModal">✕</button>
          </div>

          <!-- Табы (только в режиме редактирования) -->
          <div v-if="isEditMode" class="ct-modal-tabs">
            <button v-for="t in modalTabs" :key="t.key" class="ct-modal-tab" :class="{ active: modalTab === t.key }" @click="modalTab = t.key">{{ t.label }}</button>
          </div>

          <div class="ct-modal-body">
            <!-- ═══ TAB: Основное ═══ -->
            <form v-show="modalTab === 'main' || !isEditMode" @submit.prevent="save">
              <div class="ct-form-section">тип участника</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Тип</label><select v-model="form.contractorType" class="glass-input"><option value="master">Мастер (частный специалист)</option><option value="company">Подрядчик (организация)</option></select></div>
                <div v-if="form.contractorType === 'master'" class="u-field"><label class="u-field__label">Компания-работодатель</label><select v-model="form.parentId" class="glass-input"><option :value="null">— самозанятый —</option><option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
              </div>
              <template v-if="isEditMode">
                <div class="ct-form-section">проекты</div>
                <div v-if="projectsLoading" class="ct-form-hint">Загрузка проектов...</div>
                <div v-else-if="projectsError" class="ct-form-error">{{ projectsError }}</div>
                <div v-else-if="!allProjects.length" class="ct-form-hint">Нет проектов</div>
                <div v-else class="ct-project-pool">
                  <div class="ct-project-pool-title">Выбрано</div>
                  <TransitionGroup name="tag-shift" tag="div" class="ct-projects-grid">
                    <button v-for="p in allProjects.filter((item) => selectedProjectIds.includes(item.id))" :key="`project-selected-${p.id}`" type="button" class="ct-project-tag ct-project-tag--active" @click.prevent="toggleProject(p.id)">#{{ p.title }}</button>
                  </TransitionGroup>
                  <div class="ct-project-pool-title" style="margin-top:8px">Доступно</div>
                  <TransitionGroup name="tag-shift" tag="div" class="ct-projects-grid">
                    <button v-for="p in allProjects.filter((item) => !selectedProjectIds.includes(item.id))" :key="`project-available-${p.id}`" type="button" class="ct-project-tag" @click.prevent="toggleProject(p.id)">#{{ p.title }}</button>
                  </TransitionGroup>
                </div>
              </template>
              <div class="ct-form-section">основное</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Название *</label><input v-model="form.name" class="glass-input" required /></div>
                <div class="u-field"><label class="u-field__label">Slug *</label><input v-model="form.slug" class="glass-input" required :disabled="!!editingId" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Компания</label><input v-model="form.companyName" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Контактное лицо</label><input v-model="form.contactPerson" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Виды работ</label><input v-model="workTypesStr" class="glass-input" placeholder="через запятую" /></div>
                <div class="u-field"></div>
              </div>
              <div class="ct-form-section">контакты</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Телефон</label><AppPhoneInput v-model="form.phone" /></div>
                <div class="u-field"><label class="u-field__label">Email</label><input v-model="form.email" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Мессенджер</label><select v-model="form.messenger" class="glass-input"><option value="">—</option><option value="telegram">telegram</option><option value="whatsapp">whatsapp</option><option value="viber">viber</option></select></div>
                <div class="u-field"><label class="u-field__label">Ник / номер мессенджера</label><input v-model="form.messengerNick" class="glass-input" /></div>
              </div>
              <div class="ct-form-section">адреса</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Юридический адрес</label><AppAddressInput v-model="form.legalAddress" input-class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Фактический адрес</label><AppAddressInput v-model="form.factAddress" input-class="glass-input" /></div>
              </div>
              <div class="ct-form-section">реквизиты</div>
              <div class="u-grid-2">
                <div class="u-field u-field--full"><label class="u-field__label">Форма собственности</label><select v-model="form.legalForm" class="glass-input"><option value="">— не указана —</option><option value="self_employed">Самозанятый (физлицо / НПД)</option><option value="ip">ИП</option><option value="ooo">ООО</option><option value="other_legal">Другое юрлицо (АО, ПАО…)</option></select></div>
              </div>
              <div class="u-grid-3">
                <div class="u-field"><label class="u-field__label">ИНН</label><input v-model="form.inn" class="glass-input" :placeholder="(form.legalForm === 'ooo' || form.legalForm === 'other_legal') ? '0000000000 (10)' : '000000000000 (12)'" :maxlength="(form.legalForm === 'ooo' || form.legalForm === 'other_legal') ? 10 : 12" /></div>
                <div v-if="form.legalForm === 'ooo' || form.legalForm === 'other_legal' || !form.legalForm" class="u-field"><label class="u-field__label">КПП</label><input v-model="form.kpp" class="glass-input" placeholder="000000000" maxlength="9" /></div>
                <div v-if="form.legalForm !== 'self_employed'" class="u-field"><label class="u-field__label">{{ form.legalForm === 'ip' ? 'ОГРНИП' : 'ОГРН / ОГРНИП' }}</label><input v-model="form.ogrn" class="glass-input" :placeholder="form.legalForm === 'ip' ? '000000000000000' : '0000000000000'" :maxlength="form.legalForm === 'ip' ? 15 : 13" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Банк</label><input v-model="form.bankName" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">БИК</label><input v-model="form.bik" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Расчётный счёт</label><input v-model="form.settlementAccount" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Корр. счёт</label><input v-model="form.correspondentAccount" class="glass-input" /></div>
              </div>
              <div class="ct-form-section">примечания</div>
              <div class="u-field"><textarea v-model="form.notes" class="glass-input u-ta" rows="3" placeholder="заметки о подрядчике"></textarea></div>
              <p v-if="formError" class="ct-form-error ct-form-error--bottom">{{ formError }}</p>
              <div class="ct-modal-foot"><button type="button" class="a-btn-sm" @click="closeModal">отмена</button><button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button></div>
            </form>

            <!-- ═══ TAB: Паспорт ═══ -->
            <div v-if="isEditMode && modalTab === 'passport'" class="ct-tab-content">
              <div class="ct-form-section">паспортные данные (только чтение)</div>
              <div class="u-grid-3">
                <div class="ct-ro-field"><span class="ct-ro-label">Серия</span><span class="ct-ro-value">{{ editContractor?.passportSeries || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Номер</span><span class="ct-ro-value">{{ editContractor?.passportNumber || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Код подразделения</span><span class="ct-ro-value">{{ editContractor?.passportDepartmentCode || '—' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Кем выдан</span><span class="ct-ro-value">{{ editContractor?.passportIssuedBy || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Дата выдачи</span><span class="ct-ro-value">{{ editContractor?.passportIssueDate || '—' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Дата рождения</span><span class="ct-ro-value">{{ editContractor?.birthDate || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Место рождения</span><span class="ct-ro-value">{{ editContractor?.birthPlace || '—' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Адрес регистрации</span><span class="ct-ro-value">{{ editContractor?.registrationAddress || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">СНИЛС</span><span class="ct-ro-value">{{ editContractor?.snils || '—' }}</span></div>
              </div>
            </div>

            <!-- ═══ TAB: Документы ═══ -->
            <div v-if="isEditMode && modalTab === 'documents'" class="ct-tab-content">
              <div class="ct-form-section">загруженные документы</div>
              <div v-if="docsLoading" class="ct-form-hint">Загрузка...</div>
              <div v-else-if="!contractorDocs.length" class="ct-form-hint" style="text-align:center;padding:24px 0;opacity:0.5">Подрядчик пока не загрузил документы</div>
              <div v-else class="ct-docs-list">
                <div v-for="doc in contractorDocs" :key="doc.id" class="ct-doc-row">
                  <span class="ct-doc-icon">📄</span>
                  <div class="ct-doc-info"><span class="ct-doc-name">{{ doc.originalName }}</span><span class="ct-doc-meta">{{ doc.category || 'Без категории' }} · {{ formatDocDate(doc.createdAt) }}</span></div>
                  <a :href="doc.url" target="_blank" class="ct-doc-download">скачать</a>
                </div>
              </div>
            </div>

            <!-- ═══ TAB: Финансы ═══ -->
            <div v-if="isEditMode && modalTab === 'finances'" class="ct-tab-content">
              <div class="ct-form-section">финансовые данные (только чтение)</div>
              <div class="u-grid-3">
                <div class="ct-ro-field"><span class="ct-ro-label">Ставка (₽/час)</span><span class="ct-ro-value">{{ editContractor?.hourlyRate ? editContractor.hourlyRate + ' ₽' : '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Система налогообложения</span><span class="ct-ro-value">{{ editContractor?.taxSystem || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Опыт (лет)</span><span class="ct-ro-value">{{ editContractor?.experienceYears ?? '—' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Способы оплаты</span><span class="ct-ro-value">{{ formatPaymentMethods(editContractor?.paymentMethods) }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Страхование</span><span class="ct-ro-value">{{ editContractor?.hasInsurance ? 'Да — ' + (editContractor?.insuranceDetails || '') : 'Нет' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Образование</span><span class="ct-ro-value">{{ editContractor?.education || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Сертификаты</span><span class="ct-ro-value"><template v-if="editContractor?.certifications?.length"><span v-for="cert in editContractor.certifications" :key="cert" class="ct-cert-chip">{{ cert }}</span></template><template v-else>—</template></span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const route = useRoute()
const projectSlugFilter = computed(() => typeof route.query.projectSlug === 'string' ? route.query.projectSlug : '')
const contractorsCacheByProject = useState<Record<string, any[]>>('cache-admin-contractors-by-project', () => ({}))
const contractorsCacheKey = computed(() => projectSlugFilter.value || '__all__')
const hasContractorsCache = computed(() => (contractorsCacheByProject.value[contractorsCacheKey.value] || []).length > 0)

const { data: contractors, pending, refresh } = await useFetch<any[]>(
  () => projectSlugFilter.value ? `/api/contractors?projectSlug=${encodeURIComponent(projectSlugFilter.value)}` : '/api/contractors',
  { server: false, default: () => contractorsCacheByProject.value[contractorsCacheKey.value] || [] },
)
watch(contractors, (value) => { if (Array.isArray(value)) contractorsCacheByProject.value = { ...contractorsCacheByProject.value, [contractorsCacheKey.value]: value } }, { deep: true })

// ── Search & selection ─────────────────────────────────
const searchQuery = ref('')
const selectedId = ref<number | null>(null)
const selected = computed(() => contractors.value?.find((c: any) => c.id === selectedId.value) || null)
function selectContractor(c: any) { selectedId.value = c.id }

// Deselect when layout sends "все подрядчики" signal
const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)
watch(entityDeselectSignal, () => { selectedId.value = null })

// Auto-select contractor from ?contractorId= query
const router = useRouter()
const contractorIdFromQuery = computed(() => {
  const v = route.query.contractorId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applyContractorIdQuery() {
  const qid = contractorIdFromQuery.value
  if (qid && contractors.value?.length) {
    const found = contractors.value.find((c: any) => c.id === qid)
    if (found) selectedId.value = found.id
    router.replace({ query: { ...route.query, contractorId: undefined } })
  }
}
watch(contractors, () => applyContractorIdQuery(), { immediate: true })
watch(contractorIdFromQuery, () => applyContractorIdQuery())

const companies = computed(() => (contractors.value || []).filter((c: any) => c.contractorType === 'company'))
const mastersByParent = computed(() => {
  const map = new Map<number, any[]>()
  for (const c of contractors.value || []) {
    if (c.contractorType === 'master' && c.parentId) {
      if (!map.has(c.parentId)) map.set(c.parentId, [])
      map.get(c.parentId)!.push(c)
    }
  }
  return map
})
const standaloneMasters = computed(() => (contractors.value || []).filter((c: any) => c.contractorType === 'master' && !c.parentId))

const filteredCompanies = computed(() => {
  if (!searchQuery.value.trim()) return companies.value
  const q = searchQuery.value.toLowerCase()
  return companies.value.filter((c: any) =>
    c.name?.toLowerCase().includes(q) || c.companyName?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) ||
    (mastersByParent.value.get(c.id) || []).some((m: any) => m.name?.toLowerCase().includes(q) || m.phone?.toLowerCase().includes(q))
  )
})
const filteredStandalone = computed(() => {
  if (!searchQuery.value.trim()) return standaloneMasters.value
  const q = searchQuery.value.toLowerCase()
  return standaloneMasters.value.filter((m: any) => m.name?.toLowerCase().includes(q) || m.phone?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
})
// All masters (under companies + standalone), filtered by search
const allMasters = computed(() => (contractors.value || []).filter((c: any) => c.contractorType === 'master'))
const filteredAllMasters = computed(() => {
  if (!searchQuery.value.trim()) return allMasters.value
  const q = searchQuery.value.toLowerCase()
  return allMasters.value.filter((m: any) => m.name?.toLowerCase().includes(q) || m.phone?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
})
// Returns parent company name for a master
function parentNameOf(m: any): string | null {
  if (!m.parentId) return null
  return companies.value.find((c: any) => c.id === m.parentId)?.name ?? null
}

// ── Modal state ────────────────────────────────────────
const showModal = ref(false); const saving = ref(false); const formError = ref('')
const editingId = ref<number | null>(null); const isEditMode = ref(false)
const selectedProjectIds = ref<number[]>([]); const originalProjectIds = ref<number[]>([])
const allProjects = ref<any[]>([]); const projectsLoading = ref(false); const projectsError = ref('')

const modalTab = ref<'main' | 'passport' | 'documents' | 'finances'>('main')
const modalTabs = [{ key: 'main' as const, label: 'Основное' }, { key: 'passport' as const, label: 'Паспорт' }, { key: 'documents' as const, label: 'Документы' }, { key: 'finances' as const, label: 'Финансы' }]
const editContractor = ref<any>(null); const contractorDocs = ref<any[]>([]); const docsLoading = ref(false)

const PAYMENT_METHOD_LABELS: Record<string, string> = { cash: 'Наличные', sbp: 'СБП', card_transfer: 'На карту', bank_transfer: 'Безналичный (р/с)', crypto: 'Криптовалюта' }
function formatPaymentMethods(methods: string[] | null | undefined) { if (!methods?.length) return '—'; return methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join(', ') }
function formatDocDate(dateStr: string | null | undefined) { if (!dateStr) return ''; try { return new Date(dateStr).toLocaleDateString('ru-RU') } catch { return dateStr || '' } }

function toggleProject(id: number) {
  const idx = selectedProjectIds.value.indexOf(id)
  if (idx === -1) selectedProjectIds.value = [...selectedProjectIds.value, id]
  else selectedProjectIds.value = selectedProjectIds.value.filter(x => x !== id)
}

const emptyForm = () => ({
  name: '', slug: '', companyName: '', contactPerson: '',
  phone: '', email: '', messenger: '', messengerNick: '', website: '',
  legalAddress: '', factAddress: '',
  inn: '', kpp: '', ogrn: '', legalForm: '', bankName: '', bik: '', settlementAccount: '', correspondentAccount: '',
  notes: '', workTypes: [] as string[],
  contractorType: 'master' as 'master' | 'company', parentId: null as number | null,
})
const form = reactive(emptyForm())

const workTypesStr = computed({
  get: () => form.workTypes.join(', '),
  set: (v: string) => { form.workTypes = v.split(',').map(s => s.trim()).filter(Boolean) },
})

function openCreate() {
  editingId.value = null; isEditMode.value = false; modalTab.value = 'main'
  editContractor.value = null; contractorDocs.value = []
  Object.assign(form, emptyForm()); showModal.value = true
}
function openCreateMaster(companyId: number) {
  editingId.value = null; isEditMode.value = false
  Object.assign(form, emptyForm()); form.contractorType = 'master'; form.parentId = companyId
  showModal.value = true
}

async function openEdit(c: any) {
  editingId.value = c.id; isEditMode.value = true; modalTab.value = 'main'
  editContractor.value = c; contractorDocs.value = []
  const empty = emptyForm()
  for (const key of Object.keys(empty) as (keyof typeof empty)[]) { ;(form as any)[key] = c[key] ?? (empty as any)[key] }
  selectedProjectIds.value = []; originalProjectIds.value = []
  allProjects.value = []; projectsLoading.value = true; projectsError.value = ''
  showModal.value = true
  try {
    const [projs, linked, fullContractor] = await Promise.all([
      $fetch<any[]>('/api/projects'),
      $fetch<any[]>(`/api/contractors/${c.id}/projects`),
      $fetch<any>(`/api/contractors/${c.id}`),
    ])
    allProjects.value = projs; editContractor.value = fullContractor
    const ids = linked.map((p: any) => Number(p.id))
    selectedProjectIds.value = ids; originalProjectIds.value = [...ids]
  } catch (e: any) { projectsError.value = e?.data?.message || 'Ошибка загрузки проектов' }
  finally { projectsLoading.value = false }
}

watch(modalTab, async (tab) => {
  if (tab === 'documents' && editingId.value && !contractorDocs.value.length) {
    docsLoading.value = true
    try { contractorDocs.value = await $fetch<any[]>(`/api/contractors/${editingId.value}/documents`) } catch { contractorDocs.value = [] }
    finally { docsLoading.value = false }
  }
})

function closeModal() {
  showModal.value = false; editingId.value = null; isEditMode.value = false
  modalTab.value = 'main'; editContractor.value = null; contractorDocs.value = []
  selectedProjectIds.value = []; originalProjectIds.value = []
}

async function save() {
  saving.value = true; formError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/contractors/${editingId.value}`, { method: 'PUT', body: JSON.parse(JSON.stringify(form)) })
      const toAdd = selectedProjectIds.value.filter(id => !originalProjectIds.value.includes(id))
      const toRemove = originalProjectIds.value.filter(id => !selectedProjectIds.value.includes(id))
      const projectMap: Record<number, string> = {}
      for (const p of allProjects.value) projectMap[p.id] = p.slug
      await Promise.all([
        ...toAdd.map(id => $fetch(`/api/projects/${projectMap[id]}/contractors`, { method: 'POST', body: { contractorId: editingId.value } })),
        ...toRemove.map(id => $fetch(`/api/projects/${projectMap[id]}/contractors/${editingId.value}`, { method: 'DELETE' })),
      ])
    } else {
      await $fetch('/api/contractors', { method: 'POST', body: { ...form } })
    }
    closeModal(); refresh()
  } catch (e: any) {
    const status = e.status || e.statusCode || e.data?.statusCode || ''
    const msg = e.data?.message || e.data?.statusMessage || e.message || 'неизвестная'
    formError.value = `Ошибка ${status}: ${msg}`
  } finally { saving.value = false }
}

async function del(id: number) {
  if (!confirm('Удалить подрядчика?')) return
  await $fetch(`/api/contractors/${id}`, { method: 'DELETE' })
  if (selectedId.value === id) selectedId.value = null
  refresh()
}

// ── Contractor Intakes ─────────────────────────────────
const showIntakes = ref(false)
const selectedIntakeId = ref<number | null>(null)
const { data: intakes, pending: intakesPending, refresh: refreshIntakes } = await useFetch<any[]>(
  '/api/contractor-intake',
  { server: false, default: () => [] }
)
const newIntakesCount = computed(() => (intakes.value || []).filter((i: any) => i.status === 'new').length)
const selectedIntake = computed(() => (intakes.value || []).find((i: any) => i.id === selectedIntakeId.value) || null)

async function updateIntakeStatus(id: number, status: string) {
  try {
    await $fetch(`/api/contractor-intake/${id}`, { method: 'PUT', body: { status } })
    refreshIntakes()
  } catch (e) { console.error(e) }
}
function fmtIntakeDate(d: string) {
  try { return new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}


</script>

<style scoped>
/* ── Project filter banner ── */
.ct-filter-info { margin-bottom: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; font-size: .76rem; }
.ct-filter-link { text-decoration: none; color: var(--glass-text); opacity: .5; transition: opacity .15s; }
.ct-filter-link:hover { opacity: 1; }

/* ── Board root ── */
.ct-root { display: flex; flex-direction: column; gap: 16px; }

/* ── Topbar (matches dk-topbar style from designers) ── */
.ct-topbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
.ct-topbar-left { display: flex; align-items: center; gap: 10px; }
.ct-topbar-right { display: flex; align-items: center; gap: 8px; }
.ct-title { font-size: .8rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; opacity: .7; }
.ct-total { font-size: .7rem; font-weight: 700; background: color-mix(in srgb, var(--glass-text) 10%, transparent); border: 1px solid var(--glass-border); border-radius: 20px; padding: 1px 8px; }
.ct-search { width: 200px; height: 32px; font-size: .78rem; }

/* ── Board layout ── */
.ct-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; align-items: flex-start; }
.ct-board::-webkit-scrollbar { height: 5px; }
.ct-board::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }

/* ── Column (matches dk-col) ── */
.ct-col { flex: 0 0 240px; min-width: 220px; display: flex; flex-direction: column; gap: 8px; }
.ct-col-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px 6px 12px; border-radius: 10px; border-top: 3px solid #94a3b8;
  background: color-mix(in srgb, var(--glass-bg) 70%, transparent);
  border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border);
}
.ct-col-title { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; opacity: .75; }
.ct-col-count { font-size: .65rem; font-weight: 700; background: color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius: 20px; padding: 0 6px; min-width: 18px; text-align: center; display: flex; align-items: center; gap: 4px; }
.ct-col-count--alert { background: color-mix(in srgb, #ef4444 15%, transparent); color: #dc2626; }
.ct-col-new-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; display: inline-block; }
.ct-col-body { display: flex; flex-direction: column; gap: 8px; }
.ct-col-empty { font-size: .72rem; opacity: .3; text-align: center; padding: 16px 0; }

/* ── Card ── */
.ct-card { padding: 12px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: transform .12s, box-shadow .12s; border: 1px solid var(--glass-border); }
.ct-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.12); }
.ct-card--new { border-color: rgba(59,130,246,.35); }

/* ── Card person row ── */
.ct-card-who { display: flex; align-items: center; gap: 8px; }
.ct-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: color-mix(in srgb, var(--glass-text) 12%, transparent); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 700; letter-spacing: .04em; }
.ct-av--company { background: color-mix(in srgb, #f59e0b 15%, transparent); color: #a06e1e; border-color: rgba(245,158,11,.25); }
html.dark .ct-av--company { background: color-mix(in srgb, #f59e0b 20%, transparent); color: #fbbf24; }
.ct-av--master { background: color-mix(in srgb, #3b82f6 12%, transparent); color: #3b82f6; border-color: rgba(59,130,246,.25); }
html.dark .ct-av--master { background: color-mix(in srgb, #60a5fa 18%, transparent); color: #60a5fa; }
.ct-av--intake { background: color-mix(in srgb, #ef4444 10%, transparent); color: #ef4444; border-color: rgba(239,68,68,.25); }
.ct-card-meta { min-width: 0; flex: 1; }
.ct-card-name { font-size: .8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ct-card-sub { font-size: .68rem; opacity: .5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Tags ── */
.ct-card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.ct-tag { font-size: .62rem; font-weight: 500; padding: 2px 7px; border-radius: 20px; background: color-mix(in srgb, var(--glass-text) 8%, transparent); border: 1px solid var(--glass-border); }
.ct-tag--more { opacity: .5; }

/* ── Masters count ── */
.ct-card-masters { display: flex; align-items: center; gap: 6px; }
.ct-card-masters-label { font-size: .6rem; text-transform: uppercase; letter-spacing: .07em; opacity: .4; font-weight: 600; }
.ct-card-masters-count { font-size: .7rem; font-weight: 700; background: color-mix(in srgb, #3b82f6 12%, transparent); color: #3b82f6; border-radius: 20px; padding: 0 6px; }

/* ── Skeleton ── */
.ct-skel { height: 72px; border-radius: 12px; background: color-mix(in srgb, var(--glass-text) 5%, transparent); animation: skel-pulse 1.4s ease-in-out infinite; }
@keyframes skel-pulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }

/* ── Intake status dot ── */
.ct-intake-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.ct-intake-dot--new      { background: #3b82f6; }
.ct-intake-dot--reviewed { background: #f59e0b; }
.ct-intake-dot--added    { background: #16a34a; }
.ct-intake-dot--rejected { background: #9ca3af; }

/* ── Intake detail view ── */
.ct-intake-view { display: flex; flex-direction: column; gap: 16px; }
.ct-intake-detail { padding: 24px 28px; border-radius: 14px; max-width: 720px; }
.ct-intake-dhead { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
.ct-intake-dtitle { font-size: 1.1rem; font-weight: 700; flex: 1; }
.ct-intake-status-sel { max-width: 160px; font-size: .78rem; padding: 5px 10px; }
.ct-intake-status-pill { font-size: .68rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
.ct-intake-pill--new      { background: rgba(59,130,246,.12); color: #3b82f6; }
.ct-intake-pill--reviewed { background: rgba(245,158,11,.12); color: #d97706; }
.ct-intake-pill--added    { background: rgba(22,163,74,.12); color: #16a34a; }
.ct-intake-pill--rejected { background: rgba(107,114,128,.1); color: #6b7280; }
.ct-intake-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
@media (max-width: 640px) { .ct-intake-grid { grid-template-columns: 1fr; } }
.ct-intake-field { display: flex; flex-direction: column; gap: 2px; }
.ct-intake-label { font-size: .62rem; text-transform: uppercase; letter-spacing: .07em; opacity: .4; font-weight: 600; }
.ct-intake-val { font-size: .88rem; font-weight: 500; }
.ct-intake-link { color: var(--ds-accent, #6366f1); text-decoration: none; }
.ct-intake-link:hover { text-decoration: underline; }
.ct-intake-wt { margin-bottom: 14px; }
.ct-intake-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.ct-intake-chip { font-size: .72rem; padding: 2px 10px; border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius: 12px; opacity: .7; }
.ct-intake-notes { margin-top: 4px; }
.ct-intake-notes-text { font-size: .84rem; opacity: .6; white-space: pre-line; margin-top: 4px; line-height: 1.5; }

/* ══ Modal ══ */
.ct-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
.ct-modal { width: 620px; max-width: 100%; max-height: 90vh; border-radius: var(--modal-radius, 16px); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.18); }
.ct-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent); font-size: var(--ds-text-sm, .84rem); font-weight: 500; color: var(--glass-text); flex-shrink: 0; }
.ct-modal-close { background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--glass-text); opacity: .45; padding: 2px 6px; }
.ct-modal-close:hover { opacity: 1; }
.ct-modal-body { overflow-y: auto; flex: 1; padding: 16px 20px; }
.ct-modal-foot { display: flex; gap: 10px; justify-content: flex-end; padding-top: 16px; margin-top: 12px; border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent); }

.ct-form-section { font-size: .62rem; text-transform: uppercase; letter-spacing: .08em; color: var(--glass-text); opacity: .3; font-weight: 600; margin: 16px 0 8px; padding-bottom: 4px; }
.ct-form-section:first-child { margin-top: 0; }
.ct-form-hint { font-size: var(--ds-text-xs, .78rem); color: var(--glass-text); opacity: .4; margin-bottom: 8px; }
.ct-form-error { font-size: var(--ds-text-xs, .78rem); color: var(--ds-error, #dc2626); margin-bottom: 8px; }
.ct-form-error--bottom { margin-top: 8px; }

.ct-project-pool-title { font-size: .66rem; text-transform: uppercase; letter-spacing: .08em; opacity: .48; margin-bottom: 6px; }
.ct-projects-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
.ct-project-tag { display: inline-flex; align-items: center; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--glass-text); border-radius: 10px; padding: 6px 12px; font-size: .78rem; font-weight: 600; cursor: pointer; transition: all .18s ease; }
.ct-project-tag:hover { opacity: .9; }
.ct-project-tag--active { background: color-mix(in srgb, var(--ds-accent, #6366f1) 14%, transparent); color: var(--ds-accent, #6366f1); border-color: color-mix(in srgb, var(--ds-accent, #6366f1) 40%, var(--glass-border)); }
.tag-shift-move, .tag-shift-enter-active, .tag-shift-leave-active { transition: all .22s ease; }
.tag-shift-enter-from, .tag-shift-leave-to { opacity: 0; transform: translateY(8px) scale(.97); }

.ct-modal-tabs { display: flex; gap: 0; border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent); padding: 0 20px; flex-shrink: 0; }
.ct-modal-tab { background: none; border: none; padding: 10px 14px 8px; font-size: .78rem; font-weight: 600; color: var(--glass-text); opacity: .4; cursor: pointer; border-bottom: 2px solid transparent; transition: all .12s; }
.ct-modal-tab:hover { opacity: .7; }
.ct-modal-tab.active { opacity: 1; border-bottom-color: var(--ds-accent, #6366f1); color: var(--ds-accent, #6366f1); }

.ct-tab-content { padding-top: 4px; }
.ct-ro-field { display: flex; flex-direction: column; gap: 3px; padding: 8px 0; }
.ct-ro-label { font-size: .6rem; text-transform: uppercase; letter-spacing: .05em; color: var(--glass-text); opacity: .4; font-weight: 600; }
.ct-ro-value { font-size: .85rem; color: var(--glass-text); font-weight: 500; }

.ct-docs-list { display: flex; flex-direction: column; gap: 6px; }
.ct-doc-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: color-mix(in srgb, var(--glass-text) 3%, transparent); }
.ct-doc-icon { font-size: 1.2rem; }
.ct-doc-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.ct-doc-name { font-size: .84rem; font-weight: 600; color: var(--glass-text); }
.ct-doc-meta { font-size: .72rem; opacity: .45; }
.ct-doc-download { font-size: .78rem; font-weight: 600; color: var(--ds-accent, #6366f1); text-decoration: none; }
.ct-doc-download:hover { text-decoration: underline; }
.ct-cert-chip { display: inline-block; padding: 2px 8px; border-radius: 6px; background: color-mix(in srgb, var(--ds-accent, #6366f1) 10%, transparent); color: var(--ds-accent, #6366f1); font-size: .75rem; font-weight: 500; margin-right: 4px; margin-bottom: 2px; }
</style>
