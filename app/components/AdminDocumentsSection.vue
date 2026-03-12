<template>
  <div
    ref="viewportRef"
    class="docs-screen"
    :class="{ 'cv-viewport--paged': isPaged }"
    :tabindex="isPaged ? 0 : undefined"
    @wheel="handleWheel"
    @keydown="handleKeydown"
    @scroll="syncPager"
  >
    <AdminEntityHero
      kicker="реестр документов / admin"
      title="Документы"
      :facts="heroFacts"
      :prompt="docsHeroPrompt"
      :full-height="true"
      frame="divided"
      max-width="1120px"
    >
      <template #actions>
        <button class="admin-entity-hero__action" type="button" @click="openGenerate">из шаблона</button>
        <button class="admin-entity-hero__action" type="button" @click="openUpload">загрузить документ</button>
      </template>

      <template #notices>
        <span class="admin-entity-hero__notice docs-hero-notice">{{ currentCategoryLabel }}</span>
        <span
          class="admin-entity-hero__notice docs-hero-notice"
          :class="legalStatus?.ready ? 'admin-entity-hero__notice--success' : 'docs-hero-notice--muted'"
        >
          {{ legalStatusLabel }}
        </span>
      </template>
    </AdminEntityHero>

    <Transition name="tab-fade" mode="out-in">
      <section v-if="viewMode === 'editor'" key="editor" class="docs-editor-stage">
        <div class="docs-stage-head">
          <AdminEntityHeader title="Генератор документов">
            <template #actions>
              <button class="docs-inline-action" type="button" @click="viewMode = 'list'">назад к реестру</button>
            </template>
          </AdminEntityHeader>
          <p class="docs-stage-hint">Шаблон открывается в рабочей зоне и остаётся частью общего реестра документов.</p>
        </div>

        <AdminDocumentEditor
          :templates="DOC_TEMPLATES"
          :projects="allProjects"
          :existingDoc="existingDocToEdit"
          @close="viewMode = 'list'"
          @saved="onEditorSaved"
        />
      </section>

      <section v-else key="registry" class="docs-registry">
        <div class="docs-registry-head">
          <div class="docs-registry-copy">
            <p class="docs-registry-kicker">реестр</p>
            <h2 class="docs-registry-title">{{ currentCategoryLabel }}</h2>
            <p class="docs-registry-note">{{ registryNote }}</p>
          </div>

          <div class="docs-registry-controls">
            <label class="u-field docs-search-field">
              <span class="u-field__label">Поиск по реестру</span>
              <input v-model="search" class="glass-input docs-search-input" placeholder="название, проект, заметка" />
            </label>

            <div class="docs-registry-stats">
              <div class="docs-stat">
                <span class="docs-stat__label">найдено</span>
                <span class="docs-stat__value">{{ filteredDocs.length }}</span>
              </div>
              <div class="docs-stat">
                <span class="docs-stat__label">проектов</span>
                <span class="docs-stat__value">{{ linkedProjectsCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="docs-grid">
          <div class="docs-column docs-column--list">
            <AdminEntityHeader :title="listHeaderTitle">
              <template #actions>
                <button v-if="search" class="docs-inline-action" type="button" @click="search = ''">сбросить поиск</button>
              </template>
            </AdminEntityHeader>

            <div v-if="!hasMounted || pending" class="docs-loading">[ LOADING... ]</div>

            <div v-else-if="!filteredDocs.length" class="docs-empty">
              <span class="docs-empty__title">[ NO DATA ATTACHED ]</span>
              <span class="docs-empty__text">
                {{ search ? 'По этому запросу ничего не найдено.' : 'В текущей выборке ещё нет документов.' }}
              </span>
              <button v-if="!search" class="docs-inline-action" type="button" @click="openUpload">добавить документ</button>
            </div>

            <transition-group v-else name="doc-list" tag="div" class="docs-list">
              <article
                v-for="doc in filteredDocs"
                :key="doc.id"
                class="doc-card"
                :class="{ 'doc-card--active': activeDoc?.id === doc.id }"
                @click="openDoc(doc)"
              >
                <div class="doc-card-head">
                  <span class="doc-code">{{ categoryCode(doc.category) }}</span>
                  <span class="doc-badge" :class="`doc-badge--${doc.category}`">{{ categoryName(doc.category) }}</span>
                  <span class="doc-kind">{{ fileKind(doc) }}</span>
                  <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
                </div>

                <h3 class="doc-title">{{ doc.title }}</h3>

                <p v-if="doc.projectTitle" class="doc-project">{{ doc.projectTitle }}</p>
                <p v-if="doc.notes" class="doc-notes">{{ doc.notes }}</p>

                <div class="doc-actions" @click.stop>
                  <a v-if="doc.url" :href="doc.url" class="doc-action" @click.stop>открыть</a>
                  <button v-if="doc.content" class="doc-action" type="button" @click="openInEditor(doc)">редактор</button>
                  <button class="doc-action doc-action--danger" type="button" @click="deleteDoc(doc.id)">удалить</button>
                </div>
              </article>
            </transition-group>
          </div>

          <div class="docs-column docs-column--panel">
            <AdminEntityHeader :title="panelTitle">
              <template #actions>
                <button v-if="panelMode === 'form'" class="docs-inline-action" type="button" @click="cancelUpload">отмена</button>
                <button v-else-if="activeDoc" class="docs-inline-action" type="button" @click="activeDoc = null">закрыть</button>
              </template>
            </AdminEntityHeader>

            <div v-if="panelMode === 'form'" class="docs-panel docs-panel--form">
              <div class="docs-panel-head">
                <div>
                  <p class="docs-panel-kicker">{{ editingDoc ? 'редактирование записи' : 'новая запись' }}</p>
                  <h3 class="docs-panel-title">{{ editingDoc ? editingDoc.title : 'Добавить документ в реестр' }}</h3>
                </div>
              </div>

              <div class="docs-field-grid">
                <label class="u-field">
                  <span class="u-field__label">Название *</span>
                  <input v-model="uploadForm.title" class="glass-input docs-input" placeholder="Договор подряда №12" />
                </label>

                <label class="u-field">
                  <span class="u-field__label">Категория</span>
                  <select v-model="uploadForm.category" class="glass-input docs-input">
                    <option v-for="c in CATEGORIES.filter(cat => cat.key !== 'all')" :key="c.key" :value="c.key">
                      {{ c.num }} {{ c.label }}
                    </option>
                  </select>
                </label>

                <label class="u-field">
                  <span class="u-field__label">Проект</span>
                  <select v-model="uploadForm.projectSlug" class="glass-input docs-input">
                    <option value="">без проекта</option>
                    <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
                  </select>
                </label>

                <label v-if="!editingDoc" class="u-field">
                  <span class="u-field__label">Файл</span>
                  <input :key="uploadInputKey" type="file" class="glass-input docs-input docs-file-input" @change="onFileSelect" />
                </label>

                <label class="u-field" :class="{ 'docs-field--full': editingDoc }">
                  <span class="u-field__label">URL файла</span>
                  <input v-model="uploadForm.url" class="glass-input docs-input" placeholder="https://..." />
                </label>

                <label class="u-field docs-field--full">
                  <span class="u-field__label">Заметки</span>
                  <textarea
                    v-model="uploadForm.notes"
                    rows="4"
                    class="glass-input docs-input docs-textarea"
                    placeholder="контекст, версия, назначение документа"
                  ></textarea>
                </label>
              </div>

              <p v-if="uploadError" class="docs-error">{{ uploadError }}</p>

              <div class="docs-panel-foot">
                <button class="docs-inline-action" type="button" @click="cancelUpload">отмена</button>
                <button class="docs-primary-action" type="button" :disabled="uploading || !uploadForm.title" @click="submitUpload">
                  {{ uploading ? 'обработка...' : (editingDoc ? 'обновить запись' : 'добавить в реестр') }}
                </button>
              </div>
            </div>

            <div v-else-if="activeDoc" class="docs-panel docs-panel--detail">
              <div class="docs-panel-head docs-panel-head--detail">
                <div>
                  <p class="docs-panel-kicker">{{ categoryCode(activeDoc.category) }} / {{ categoryName(activeDoc.category) }}</p>
                  <h3 class="docs-panel-title">{{ activeDoc.title }}</h3>
                </div>

                <div class="docs-panel-actions">
                  <a v-if="activeDoc.url" :href="activeDoc.url" class="docs-inline-action">открыть файл</a>
                  <button v-if="activeDoc.content" class="docs-inline-action" type="button" @click="openInEditor(activeDoc)">в редактор</button>
                  <button class="docs-inline-action" type="button" @click="editDoc">реквизиты</button>
                  <button class="docs-inline-action docs-inline-action--danger" type="button" @click="deleteDoc(activeDoc.id)">удалить</button>
                </div>
              </div>

              <div class="docs-meta-grid">
                <div class="docs-meta-card">
                  <span class="docs-meta-label">дата</span>
                  <span class="docs-meta-value">{{ formatDate(activeDoc.createdAt) || '—' }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">тип файла</span>
                  <span class="docs-meta-value">{{ fileKind(activeDoc) }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">проект</span>
                  <NuxtLink
                    v-if="activeDoc.projectTitle && activeDoc.projectSlug"
                    :to="`/admin/projects/${activeDoc.projectSlug}`"
                    class="docs-meta-link"
                  >
                    {{ activeDoc.projectTitle }}
                  </NuxtLink>
                  <span v-else class="docs-meta-value">не привязан</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">файл</span>
                  <span class="docs-meta-value docs-meta-value--mono">{{ activeDoc.filename || '—' }}</span>
                </div>
              </div>

              <div v-if="activeDoc.notes" class="docs-note-block">
                <span class="docs-meta-label">заметки</span>
                <p class="docs-note-text">{{ activeDoc.notes }}</p>
              </div>

              <div v-if="activeDoc.content" class="docs-preview docs-preview--content">
                <pre class="docs-view-pre">{{ activeDoc.content }}</pre>
              </div>
              <div v-else-if="previewText" class="docs-preview">
                <pre class="docs-view-pre">{{ previewText }}</pre>
              </div>
              <div v-else-if="activeDoc.url && isImage(activeDoc.url)" class="docs-preview">
                <img :src="activeDoc.url" class="docs-view-img" alt="Предпросмотр документа" />
              </div>
              <div v-else-if="activeDoc.url && isPdf(activeDoc.url)" class="docs-preview docs-preview--pdf">
                <iframe :src="activeDoc.url" class="docs-view-pdf" title="Предпросмотр PDF"></iframe>
              </div>
              <div v-else class="docs-preview docs-preview--empty">[ FILE ATTACHED ]</div>
            </div>

            <div v-else class="docs-panel docs-panel--summary">
              <p class="docs-panel-kicker">рабочая панель</p>
              <h3 class="docs-panel-title">Контекст текущей выборки</h3>
              <p class="docs-summary-text">
                Выберите документ слева, чтобы открыть реквизиты и превью, либо добавьте новую запись напрямую в реестр.
              </p>

              <div class="docs-meta-grid docs-meta-grid--summary">
                <div class="docs-meta-card">
                  <span class="docs-meta-label">категория</span>
                  <span class="docs-meta-value">{{ currentCategoryLabel }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">всего записей</span>
                  <span class="docs-meta-value">{{ documentsCount }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">в выборке</span>
                  <span class="docs-meta-value">{{ filteredDocs.length }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">правовая база</span>
                  <span class="docs-meta-value">{{ legalStatusLabel }}</span>
                </div>
              </div>

              <div class="docs-panel-foot docs-panel-foot--summary">
                <button class="docs-inline-action" type="button" @click="openUpload">добавить документ</button>
                <button class="docs-inline-action" type="button" @click="openGenerate">открыть шаблон</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Transition>

    <div v-if="isPaged" class="cv-pager-rail">
      <div class="cv-pager-rail__meta">
        <span class="cv-pager-rail__mode">{{ pagerModeLabel }}</span>
        <span>экран {{ pageIndex }} / {{ pageCount }}</span>
      </div>
      <div class="cv-pager-rail__actions">
        <button type="button" class="a-btn-sm" @click="move('prev')">← экран</button>
        <button type="button" class="a-btn-sm" @click="move('next')">{{ contentViewMode === 'flow' ? 'экран / кат.' : pagerNextLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ── Props — driven by global nav ──
const props = defineProps<{ category: string }>()
const designSystem = useDesignSystem()
const adminNav = useAdminNav()

// ══════════════════════════════════════════════════════════════════
// CATEGORIES — numbered, professional
// ══════════════════════════════════════════════════════════════════
const CATEGORIES: { key: string; num: string; label: string; icon: string }[] = [
  { key: 'all',             num: '',   label: 'все документы',                   icon: '📂' },
  { key: 'contract',        num: '01', label: 'договоры на дизайн-проект',       icon: '📝' },
  { key: 'contract_supply', num: '02', label: 'договоры поставки',               icon: '📦' },
  { key: 'contract_work',   num: '03', label: 'договоры подряда (строительство)',icon: '🏗' },
  { key: 'act',             num: '04', label: 'акты выполненных работ',          icon: '✅' },
  { key: 'act_defect',      num: '05', label: 'акты о дефектах / рекламации',   icon: '⚠️' },
  { key: 'invoice',         num: '06', label: 'счета на оплату',                icon: '🧾' },
  { key: 'estimate',        num: '07', label: 'сметы и калькуляции',            icon: '📊' },
  { key: 'specification',   num: '08', label: 'спецификации и ведомости',       icon: '📋' },
  { key: 'tz',              num: '09', label: 'техническое задание',            icon: '📐' },
  { key: 'approval',        num: '10', label: 'согласования и визы',            icon: '✍️' },
  { key: 'warranty',        num: '11', label: 'гарантийные документы',          icon: '🛡' },
  { key: 'photo_report',    num: '12', label: 'фотоотчёты объекта',            icon: '📸' },
  { key: 'correspondence',  num: '13', label: 'переписка и протоколы',         icon: '✉️' },
  { key: 'template',        num: '14', label: 'шаблоны документов',             icon: '📋' },
  { key: 'other',           num: '15', label: 'прочее',                         icon: '📎' },
]

function catLabel(key: string) {
  const cat = CATEGORIES.find(c => c.key === key)
  return cat ? (cat.num ? `${cat.num} ${cat.label}` : cat.label) : key
}

// ══════════════════════════════════════════════════════════════════
// DOCUMENT TEMPLATES
// ══════════════════════════════════════════════════════════════════
const DOC_TEMPLATES = [
  {
    key: 'contract_design',
    name: 'Договор на дизайн-проект',
    icon: '📝',
    description: 'Стандартный договор на выполнение работ по дизайну интерьера',
    category: 'contract',
    fields: [
      { key: 'contract_number',        label: 'Номер договора',           placeholder: '№ 01/2026' },
      { key: 'contract_date',          label: 'Дата договора',            placeholder: '01.03.2026' },
      { key: 'client_name',            label: 'ФИО клиента',              placeholder: 'Иванов Иван Иванович' },
      { key: 'client_passport',        label: 'Паспорт (серия номер)',    placeholder: '45 09 123456' },
      { key: 'client_passport_issued', label: 'Кем выдан',               placeholder: 'ГУ МВД России по г. Москве' },
      { key: 'client_passport_date',   label: 'Дата выдачи паспорта',    placeholder: '01.03.2020' },
      { key: 'client_registration',    label: 'Адрес регистрации',       placeholder: 'г. Москва, ул. Пушкина, д.10, кв.5' },
      { key: 'client_phone',           label: 'Телефон клиента',         placeholder: '+7 (999) 000-00-00' },
      { key: 'client_email',           label: 'E-mail клиента',          placeholder: 'client@mail.ru' },
      { key: 'object_address',         label: 'Адрес объекта',           placeholder: 'г. Москва, ул. ...' },
      { key: 'object_type',            label: 'Тип объекта',             placeholder: 'квартира / дом / офис' },
      { key: 'area',                   label: 'Площадь (кв.м)',          placeholder: '120' },
      { key: 'price',                  label: 'Общая сумма договора',    placeholder: '350 000 руб.' },
      { key: 'price_words',            label: 'Сумма прописью',          placeholder: 'Триста пятьдесят тысяч рублей 00 копеек' },
      { key: 'advance',                label: 'Аванс (%)',               placeholder: '50%' },
      { key: 'advance_amount',         label: 'Сумма аванса',            placeholder: '175 000 руб.' },
      { key: 'remaining_amount',        label: 'Остаток к доплате',        placeholder: '175 000 руб.' },
      { key: 'deadline',               label: 'Срок выполнения',         placeholder: '90 календарных дней' },
      { key: 'penalty_pct',            label: 'Неустойка за просрочку',  placeholder: '0,1% от суммы за каждый день' },
      { key: 'executor_name',            label: '— ФИО исполнителя',         placeholder: 'Кульчихина Дария Андреевна' },
      { key: 'executor_inn',             label: '— ИНН исполнителя',          placeholder: '770112345678' },
      { key: 'executor_passport',        label: '— Паспорт исполнителя',      placeholder: '45 09 123456' },
      { key: 'executor_passport_issued', label: '— Паспорт выдан',            placeholder: 'ГУ МВД России по г. Москве' },
      { key: 'executor_passport_date',   label: '— Дата выдачи паспорта',     placeholder: '01.01.2015' },
      { key: 'executor_registration',    label: '— Прописка исполнителя',     placeholder: 'г. Москва, ул. ...' },
      { key: 'executor_phone',           label: '— Телефон исполнителя',      placeholder: '+7 (___) ___-__-__' },
      { key: 'executor_email',           label: '— Email исполнителя',        placeholder: 'daria@kulchikhina.ru' },
      { key: 'executor_bank',            label: '— Банк исполнителя',         placeholder: 'Сбербанк России' },
      { key: 'executor_bik',             label: '— БИК',                      placeholder: '044525225' },
      { key: 'executor_account',         label: '— Расчётный счёт',           placeholder: '40802810938000012345' },
      { key: 'executor_corr_account',    label: '— Корреспондентский счёт',   placeholder: '30101810400000000225' },
    ],
    template: `ДОГОВОР НА ВЫПОЛНЕНИЕ ДИЗАЙН-ПРОЕКТА ИНТЕРЬЕРА {{contract_number}}

г. Москва                                                        «{{contract_date}}»

{{executor_name}}, именуемая в дальнейшем «Исполнитель», с одной стороны,
и {{client_name}}, паспорт серия {{client_passport}}, выдан {{client_passport_issued}}
{{client_passport_date}}, зарегистрированный(ая) по адресу: {{client_registration}},
именуемый(ая) в дальнейшем «Заказчик», с другой стороны,
вместе именуемые «Стороны», заключили настоящий Договор о нижеследующем:


1. ПРЕДМЕТ ДОГОВОРА

1.1. Исполнитель обязуется по заданию Заказчика разработать дизайн-проект
     интерьера объекта — {{object_type}}, расположенного по адресу:
     {{object_address}}, общей площадью {{area}} кв.м (далее — «Объект»),
     а Заказчик обязуется принять и оплатить результат работ в порядке,
     предусмотренном настоящим Договором.

1.2. Состав дизайн-проекта определяется Техническим заданием (Приложение № 1),
     являющимся неотъемлемой частью настоящего Договора, и включает:
     — обмерный план Объекта;
     — концепцию и настроечный образ (мудборд);
     — планировочные решения (не менее 2 вариантов);
     — расстановку мебели и оборудования;
     — разверти стен с отделочными материалами;
     — спецификацию материалов, мебели и декора;
     — рабочие чертежи (электрика, сантехника, освещение);
     — 3D-визуализации ключевых пространств.


2. СТОИМОСТЬ РАБОТ И ПОРЯДОК ОПЛАТЫ

2.1. Общая стоимость работ по настоящему Договору составляет
     {{price}} ({{price_words}}).

2.2. Оплата производится в следующем порядке:
     — Авансовый платёж: {{advance}} от общей стоимости — {{advance_amount}}
       в течение 3 (трёх) рабочих дней с даты подписания настоящего Договора;
     — Окончательный расчёт: оставшаяся часть стоимости — {{remaining_amount}} —
       в течение 3 (трёх) рабочих дней с даты подписания Акта приёма-передачи.

2.3. Оплата производится безналичным переводом на расчётный счёт Исполнителя
     или наличными по квитанции. Датой оплаты считается дата поступления
     денежных средств на счёт Исполнителя.

2.4. Если по инициативе Заказчика вносятся изменения, выходящие за рамки
     Технического задания, стоимость дополнительных работ согласовывается
     Сторонами письменно и оформляется дополнительным соглашением.


3. СРОКИ ВЫПОЛНЕНИЯ РАБОТ

3.1. Работы выполняются в течение {{deadline}} с момента подписания
     настоящего Договора и поступления авансового платежа на счёт Исполнителя.

3.2. Сроки могут быть пересмотрены по соглашению Сторон в случае существенного
     изменения Технического задания или возникновения обстоятельств непреодолимой
     силы (форс-мажор).

3.3. Промежуточные этапы сдачи работ фиксируются в Техническом задании.


4. ПРАВА И ОБЯЗАННОСТИ ИСПОЛНИТЕЛЯ

4.1. Исполнитель обязуется:
     — выполнить работы в сроки и в объёме, предусмотренные Договором;
     — при необходимости проводить консультации с Заказчиком;
     — передать Заказчику готовый проект в электронном виде (форматы PDF + DWG
       или JPG) и, по запросу, в распечатанном виде в 1 (одном) экземпляре;
     — сохранять конфиденциальность сведений об Объекте и Заказчике.

4.2. Исполнитель вправе:
     — использовать фотографии, визуализации и описание проекта в портфолио
       и маркетинговых материалах без указания персональных данных Заказчика,
       если иное не оговорено письменно;
     — привлекать субподрядчиков, оставаясь ответственным за результат.


5. ПРАВА И ОБЯЗАННОСТИ ЗАКАЗЧИКА

5.1. Заказчик обязуется:
     — своевременно производить оплату согласно разделу 2 настоящего Договора;
     — предоставить Исполнителю доступ к Объекту для обмера и инспекции;
     — предоставить все необходимые документы и сведения;
     — в течение 5 (пяти) рабочих дней с момента получения материалов
       предоставить письменные замечания или подписать Акт приёма-передачи;
     — не вносить изменения в разработанные материалы без согласия Исполнителя.

5.2. Заказчик вправе:
     — вносить замечания по промежуточным вариантам (до 2 итераций правок,
       включённых в стоимость по каждому разделу);
     — расторгнуть настоящий Договор с письменным уведомлением за 10 дней,
       оплатив объём фактически выполненных работ.


6. ПОРЯДОК СДАЧИ И ПРИЁМКИ РАБОТ

6.1. По завершении каждого этапа Исполнитель направляет материалы Заказчику
     для проверки и согласования.

6.2. Заказчик в течение 5 (пяти) рабочих дней обязан:
     — подписать промежуточный или итоговый Акт приёма-передачи, или
     — направить мотивированный отказ с перечнем конкретных замечаний.

6.3. Если в указанный срок замечания или подписанный Акт не поступили,
     работы считаются принятыми Заказчиком в полном объёме.

6.4. Финальная передача проекта осуществляется после полной оплаты по Договору.


7. АВТОРСКИЕ ПРАВА И ИНТЕЛЛЕКТУАЛЬНАЯ СОБСТВЕННОСТЬ

7.1. Все разработанные в рамках настоящего Договора материалы являются
     результатом интеллектуальной деятельности Исполнителя.

7.2. После полной оплаты по Договору Заказчику передаётся неисключительное
     право на использование проекта в целях реализации интерьерного решения
     на указанном Объекте.

7.3. Исполнитель сохраняет авторское право на проект, включая право публикации
     материалов в портфолио.


8. ОТВЕТСТВЕННОСТЬ СТОРОН

8.1. За просрочку сдачи результата работ Исполнитель уплачивает неустойку
     в размере {{penalty_pct}} от стоимости просроченного этапа,
     но не более 5% от общей суммы Договора.

8.2. За просрочку оплаты Заказчик уплачивает неустойку {{penalty_pct}}
     от суммы просроченного платежа за каждый день просрочки.

8.3. Ответственность Исполнителя ограничена общей суммой Договора.

8.4. Стороны освобождаются от ответственности при наступлении обстоятельств
     непреодолимой силы (форс-мажор): стихийные бедствия, военные действия,
     действия государственных органов, иные непредвиденные обстоятельства.


9. КОНФИДЕНЦИАЛЬНОСТЬ

9.1. Каждая из Сторон обязуется не разглашать третьим лицам информацию,
     ставшую известной в ходе исполнения настоящего Договора, без
     предварительного письменного согласия другой Стороны.

9.2. Условия настоящего раздела не распространяются на общедоступную
     информацию и на случаи, предусмотренные законодательством РФ.


10. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ

10.1. Все споры и разногласия, возникающие из настоящего Договора,
      Стороны урегулируют путём переговоров.

10.2. При недостижении согласия спор передаётся на рассмотрение в суд
      по месту нахождения Исполнителя в соответствии с действующим
      законодательством Российской Федерации.


11. СРОК ДЕЙСТВИЯ И РАСТОРЖЕНИЕ ДОГОВОРА

11.1. Договор вступает в силу с момента подписания обеими Сторонами и
      действует до полного исполнения обязательств Сторонами.

11.2. Договор может быть расторгнут по соглашению Сторон или в одностороннем
      порядке с письменным уведомлением за 10 (десять) календарных дней.

11.3. При одностороннем расторжении по инициативе Заказчика Исполнитель
      удерживает оплату фактически выполненных работ. Авансовый платёж
      возврату не подлежит, если работы были начаты.

11.4. При одностороннем расторжении по инициативе Исполнителя ранее
      уплаченные суммы за невыполненные работы возвращаются Заказчику
      в течение 10 (десяти) рабочих дней.


12. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ

12.1. Настоящий Договор составлен в 2 (двух) экземплярах, имеющих
      одинаковую юридическую силу — по одному для каждой из Сторон.

12.2. Все изменения и дополнения к настоящему Договору действительны
      только при наличии письменного соглашения, подписанного обеими Сторонами.

12.3. Неотъемлемой частью настоящего Договора является:
      Приложение № 1 — Техническое задание на разработку дизайн-проекта.


13. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН

ИСПОЛНИТЕЛЬ:                                    ЗАКАЗЧИК:
{{executor_name}}                               {{client_name}}
Паспорт: {{executor_passport}}                  Паспорт: {{client_passport}}
Выдан: {{executor_passport_issued}}             Выдан: {{client_passport_issued}} {{client_passport_date}}
{{executor_passport_date}}                      Зарег.: {{client_registration}}
Прописка: {{executor_registration}}             Тел.: {{client_phone}}
ИНН: {{executor_inn}}                           E-mail: {{client_email}}
Тел.: {{executor_phone}}
E-mail: {{executor_email}}
Банк: {{executor_bank}}
БИК: {{executor_bik}}
Р/с: {{executor_account}}
К/с: {{executor_corr_account}}

Подпись: _______________________                Подпись: _______________________

«____» _________________ {{contract_date}}      «____» _________________ {{contract_date}}`,
  },
  {
    key: 'contract_supply',
    name: 'Договор поставки материалов',
    icon: '📦',
    description: 'Договор на поставку мебели / материалов',
    category: 'contract_supply',
    fields: [
      { key: 'contract_number', label: 'Номер договора', placeholder: '№ П-01/2026' },
      { key: 'contract_date',   label: 'Дата',           placeholder: '01.03.2026' },
      { key: 'supplier_name',   label: 'Поставщик',      placeholder: 'ООО "Мебель Плюс"' },
      { key: 'items',           label: 'Перечень товаров', placeholder: 'Диван угловой — 1 шт, ...',  multiline: true },
      { key: 'amount',          label: 'Сумма',           placeholder: '250 000 руб.' },
      { key: 'delivery_date',   label: 'Срок поставки',   placeholder: '30 календарных дней' },
      { key: 'delivery_address',label: 'Адрес доставки',  placeholder: 'г. Москва, ул. ...' },
      { key: 'executor_name',   label: '— Исполнитель',    placeholder: 'Кульчихина Д.А.' },
    ],
    template: `ДОГОВОР ПОСТАВКИ {{contract_number}}

г. Москва                                                        {{contract_date}}

{{supplier_name}}, именуемый(ая) далее «Поставщик», с одной стороны,
и {{executor_name}} (от лица Заказчика), именуемая далее «Покупатель»,
с другой стороны, заключили настоящий договор:

1. ПРЕДМЕТ ДОГОВОРА
Поставщик обязуется передать, а Покупатель — принять и оплатить
следующие товары:
{{items}}

2. ЦЕНА И ПОРЯДОК ОПЛАТЫ
Общая стоимость: {{amount}}.

3. СРОКИ И УСЛОВИЯ ПОСТАВКИ
Срок: {{delivery_date}}.
Адрес доставки: {{delivery_address}}.

Поставщик: {{supplier_name}}            Покупатель: {{executor_name}}

_______________________                _______________________`,
  },
  {
    key: 'contract_work',
    name: 'Договор подряда (строительный)',
    icon: '🏗',
    description: 'Договор на строительные / отделочные работы',
    category: 'contract_work',
    fields: [
      { key: 'contract_number', label: 'Номер договора', placeholder: '№ СМР-01/2026' },
      { key: 'contract_date',   label: 'Дата',           placeholder: '01.03.2026' },
      { key: 'contractor_name', label: 'Подрядчик',      placeholder: 'ООО "Ремонт Сервис"' },
      { key: 'object_address',  label: 'Адрес объекта',  placeholder: 'г. Москва, ул. ...' },
      { key: 'work_scope',      label: 'Перечень работ',  placeholder: 'Демонтаж, штукатурка, ...',  multiline: true },
      { key: 'amount',          label: 'Сумма',           placeholder: '800 000 руб.' },
      { key: 'deadline',        label: 'Сроки',           placeholder: '60 рабочих дней' },
      { key: 'executor_name',   label: '— Заказчик (исполнитель)', placeholder: 'Кульчихина Д.А.' },
    ],
    template: `ДОГОВОР ПОДРЯДА {{contract_number}}

г. Москва                                                        {{contract_date}}

{{contractor_name}}, именуемый(ая) далее «Подрядчик»,
и {{executor_name}} (от лица Заказчика), именуемая далее «Заказчик»,
заключили договор:

1. ПРЕДМЕТ ДОГОВОРА
Подрядчик обязуется выполнить строительно-отделочные работы
по адресу: {{object_address}}:
{{work_scope}}

2. СТОИМОСТЬ
Общая стоимость работ: {{amount}}.

3. СРОКИ
Срок выполнения: {{deadline}}.

Подрядчик: {{contractor_name}}            Заказчик: {{executor_name}}

_______________________                  _______________________`,
  },
  {
    key: 'act_acceptance',
    name: 'Акт приёмки работ',
    icon: '✅',
    description: 'Акт выполненных работ по дизайн-проекту',
    category: 'act',
    fields: [
      { key: 'act_number',      label: 'Номер акта',      placeholder: '№ А-01/2026' },
      { key: 'act_date',        label: 'Дата акта',       placeholder: '01.03.2026' },
      { key: 'contract_number', label: 'Номер договора',  placeholder: '№ 01/2026' },
      { key: 'client_name',     label: 'ФИО клиента',     placeholder: 'Иванов Иван Иванович' },
      { key: 'work_description',label: 'Перечень работ',  placeholder: 'Разработка дизайн-проекта интерьера...', multiline: true },
      { key: 'price',           label: 'Сумма',           placeholder: '350 000 руб.' },
      { key: 'executor_name',   label: '— Исполнитель',    placeholder: 'Кульчихина Д.А.' },
    ],
    template: `АКТ ВЫПОЛНЕННЫХ РАБОТ {{act_number}}

г. Москва                                                        {{act_date}}

К договору {{contract_number}}

{{executor_name}} (Исполнитель) и {{client_name}} (Заказчик)
составили настоящий акт о том, что:

ИСПОЛНИТЕЛЬ ВЫПОЛНИЛ СЛЕДУЮЩИЕ РАБОТЫ:
{{work_description}}

СТОИМОСТЬ ВЫПОЛНЕННЫХ РАБОТ: {{price}}

Заказчик претензий к качеству и срокам выполнения работ не имеет.
Работы выполнены в полном объёме.

Исполнитель: {{executor_name}}        Заказчик: {{client_name}}

_______________________              _______________________`,
  },
  {
    key: 'act_defect',
    name: 'Акт о дефектах',
    icon: '⚠️',
    description: 'Рекламационный акт при обнаружении дефектов',
    category: 'act_defect',
    fields: [
      { key: 'act_number',    label: 'Номер акта', placeholder: '№ Д-01/2026' },
      { key: 'act_date',      label: 'Дата',       placeholder: '01.03.2026' },
      { key: 'contractor',    label: 'Подрядчик / поставщик', placeholder: 'ООО ...' },
      { key: 'object_address',label: 'Адрес объекта', placeholder: 'г. Москва ...' },
      { key: 'defects',       label: 'Описание дефектов', placeholder: '1. Неровная штукатурка\n2. ...', multiline: true },
      { key: 'deadline_fix',  label: 'Срок устранения', placeholder: '10 рабочих дней' },
      { key: 'executor_name', label: '— Заказчик (исполнитель)', placeholder: 'Кульчихина Д.А.' },
    ],
    template: `АКТ О ВЫЯВЛЕННЫХ ДЕФЕКТАХ {{act_number}}

г. Москва                                                        {{act_date}}

Объект: {{object_address}}
Подрядчик / Поставщик: {{contractor}}

В ходе приёмки / эксплуатации объекта выявлены следующие дефекты:

{{defects}}

Подрядчик обязуется устранить дефекты в срок: {{deadline_fix}}.

Заказчик: {{executor_name}}            Подрядчик: {{contractor}}

_______________________              _______________________`,
  },
  {
    key: 'invoice',
    name: 'Счёт на оплату',
    icon: '🧾',
    description: 'Счёт для выставления клиенту',
    category: 'invoice',
    fields: [
      { key: 'invoice_number', label: 'Номер счёта',  placeholder: '№ С-01/2026' },
      { key: 'invoice_date',   label: 'Дата',         placeholder: '01.03.2026' },
      { key: 'client_name',    label: 'Получатель',   placeholder: 'Иванов Иван Иванович' },
      { key: 'description',    label: 'Назначение',   placeholder: 'Аванс по договору № ...', multiline: true },
      { key: 'amount',         label: 'Сумма',        placeholder: '175 000 руб.' },
      { key: 'due_date',       label: 'Оплатить до',  placeholder: '15.03.2026' },
      { key: 'executor_name',  label: '— Исполнитель',  placeholder: 'Кульчихина Дария Андреевна' },
      { key: 'executor_inn',   label: '— ИНН',          placeholder: '770112345678' },
      { key: 'executor_bank',  label: '— Банк',         placeholder: 'Сбербанк России' },
      { key: 'executor_bik',   label: '— БИК',          placeholder: '044525225' },
      { key: 'executor_account',label: '— Расчётный счёт',placeholder: '40802810938000012345' },
    ],
    template: `СЧЁТ НА ОПЛАТУ {{invoice_number}}
от {{invoice_date}}

Исполнитель: {{executor_name}}
ИНН: {{executor_inn}}
Получатель: {{client_name}}

НАЗНАЧЕНИЕ ПЛАТЕЖА:
{{description}}

СУММА К ОПЛАТЕ: {{amount}}

Оплатить до: {{due_date}}

РЕКВИЗИТЫ ДЛЯ ОПЛАТЫ:
Банк: {{executor_bank}}
БИК: {{executor_bik}}
Р/с: {{executor_account}}`,
  },
  {
    key: 'estimate',
    name: 'Смета на работы',
    icon: '📊',
    description: 'Калькуляция стоимости работ или материалов',
    category: 'estimate',
    fields: [
      { key: 'estimate_no',  label: 'Номер сметы',  placeholder: '№ СМ-01/2026' },
      { key: 'date',         label: 'Дата',          placeholder: '01.03.2026' },
      { key: 'object',       label: 'Объект',        placeholder: 'Квартира 120 кв.м, ул. ...' },
      { key: 'items',        label: 'Позиции',       placeholder: '1. Демонтаж — 50 000 руб.\n2. Штукатурка — 120 000 руб.\n...', multiline: true },
      { key: 'total',        label: 'Итого',         placeholder: '850 000 руб.' },
      { key: 'executor_name',label: '— Составил',    placeholder: 'Кульчихина Д.А.' },
    ],
    template: `СМЕТА {{estimate_no}}
от {{date}}

Объект: {{object}}

ПЕРЕЧЕНЬ РАБОТ / МАТЕРИАЛОВ:
{{items}}

══════════════════════════════════
ИТОГО: {{total}}

Составил: {{executor_name}}`,
  },
  {
    key: 'tz_doc',
    name: 'Техническое задание',
    icon: '📐',
    description: 'ТЗ на дизайн-проект или строительные работы',
    category: 'tz',
    fields: [
      { key: 'tz_no',          label: 'Номер ТЗ',       placeholder: '№ ТЗ-01/2026' },
      { key: 'date',           label: 'Дата',            placeholder: '01.03.2026' },
      { key: 'client_name',    label: 'Заказчик',        placeholder: 'Иванов И.И.' },
      { key: 'object_address', label: 'Адрес объекта',   placeholder: 'г. Москва ...' },
      { key: 'area',           label: 'Площадь',         placeholder: '120 кв.м' },
      { key: 'requirements',   label: 'Требования',      placeholder: '1. Зонирование гостиной\n2. ...', multiline: true },
      { key: 'style',          label: 'Стиль',           placeholder: 'современный минимализм' },
      { key: 'budget',         label: 'Бюджет',          placeholder: 'до 1 500 000 руб.' },
      { key: 'executor_name',  label: '— Составил',       placeholder: 'Кульчихина Д.А.' },
    ],
    template: `ТЕХНИЧЕСКОЕ ЗАДАНИЕ {{tz_no}}
от {{date}}

Заказчик: {{client_name}}
Объект: {{object_address}}, {{area}}
Стилевое направление: {{style}}
Бюджет: {{budget}}

ТРЕБОВАНИЯ К ПРОЕКТУ:
{{requirements}}

Составил: {{executor_name}}
Согласовал: {{client_name}}`,
  },
]

// ══════════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════════
const { data: allDocs, pending, refresh } = useFetch<any[]>('/api/documents', {
  default: () => [],
  lazy: true,
  server: false,
})
const { data: projectsData } = useFetch<any[]>('/api/projects', { server: false, default: () => [] })
const { data: legalStatus } = useFetch<{ ready: boolean; totalChunks: number; sources: any[] }>('/api/ai/legal-status', { server: false })

const allProjects = computed(() => (projectsData.value || []).map((p: any) => ({
  slug: p.slug, title: p.title,
  clientName: p.profile?.client_name || '',
  address: p.profile?.objectAddress || '',
})))

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
const viewMode = useState<'list' | 'editor'>('docs-viewMode', () => 'list')
const activeCategory = ref(props.category || 'all')
const search = ref('')
const activeDoc = ref<any>(null)
const editingDoc = ref<any>(null)
const previewText = ref('')
const existingDocToEdit = ref<{ id: number; content: string; templateKey?: string | null; projectSlug?: string | null } | null>(null)
const uploadInputKey = ref(0)
const hasMounted = ref(false)
const isCreatingUpload = ref(false)

const documentsCount = computed(() => allDocs.value?.length || 0)
const linkedProjectsCount = computed(() => new Set(
  (allDocs.value || []).map((doc: any) => doc.projectSlug).filter(Boolean),
).size)

const currentCategoryLabel = computed(() => catLabel(activeCategory.value))
const legalStatusLabel = computed(() => {
  if (legalStatus.value?.ready) return `в базе ${legalStatus.value.totalChunks} норм`
  return 'база не загружена'
})
const listHeaderTitle = computed(() => activeCategory.value === 'all' ? 'Все документы' : currentCategoryLabel.value)
const panelMode = computed<'summary' | 'form' | 'detail'>(() => {
  if (editingDoc.value || isCreatingUpload.value) return 'form'
  if (activeDoc.value) return 'detail'
  return 'summary'
})
const panelTitle = computed(() => {
  if (panelMode.value === 'form') return editingDoc.value ? 'Редактирование документа' : 'Новый документ'
  if (panelMode.value === 'detail') return 'Карточка документа'
  return 'Панель документа'
})
const registryNote = computed(() => {
  const query = search.value.trim()
  if (query) return `Поиск активен: ${filteredDocs.value.length} результатов по запросу «${query}».`
  if (activeCategory.value === 'all') return 'Единый реестр договоров, актов, счетов и шаблонов по всем проектам.'
  return `Срез по категории ${currentCategoryLabel.value}. Записи отсортированы от новых к старым.`
})
const docsSectionOrder = computed(() => CATEGORIES.map((item) => item.key))
const docsHeroPrompt = computed(() => isPaged.value ? '↓ экран / PgDn ↓' : 'прокрутите вниз к реестру')
const heroFacts = computed(() => ([
  { label: 'всего записей', value: String(documentsCount.value) },
  { label: 'в выборке', value: String(filteredDocs.value.length) },
  { label: 'проектов', value: String(linkedProjectsCount.value) },
]))

const {
  viewportRef,
  contentViewMode,
  isPaged,
  pagerModeLabel,
  pagerNextLabel,
  pageIndex,
  pageCount,
  syncPager,
  move,
  handleWheel,
  handleKeydown,
} = useContentViewport({
  mode: computed(() => designSystem.tokens.value.contentViewMode),
  enabled: computed(() => viewMode.value === 'list'),
  currentSection: activeCategory,
  sectionOrder: docsSectionOrder,
  onNavigate: async (nextCategory) => {
    activeCategory.value = nextCategory
    adminNav.select({ id: `doc_${nextCategory}`, name: nextCategory, type: 'leaf' })
  },
  transitionMs: computed(() => designSystem.tokens.value.pageTransitDuration ?? 280),
})

// Sync from parent prop (nav drives category)
watch(() => props.category, (cat) => {
  if (cat && cat !== activeCategory.value) {
    activeCategory.value = cat
    viewMode.value = 'list'
    activeDoc.value = null
    editingDoc.value = null
    isCreatingUpload.value = false
    previewText.value = ''
    resetUploadForm()
  }
})

// Обновляем список документов при возврате из редактора
watch(viewMode, (v, prev) => {
  if (v === 'list' && prev === 'editor') {
    existingDocToEdit.value = null
    refresh()
  }
})

// При уходе со страницы сбрасываем, чтобы при возврате не открывался редактор
onBeforeRouteLeave(() => {
  viewMode.value = 'list'
  editingDoc.value = null
  isCreatingUpload.value = false
  activeDoc.value = null
})

onMounted(() => {
  hasMounted.value = true
})

const countByCategory = computed(() => {
  const r: Record<string, number> = {}
  for (const doc of allDocs.value || []) {
    r[doc.category] = (r[doc.category] || 0) + 1
    r['all'] = (r['all'] || 0) + 1
  }
  return r
})

const filteredDocs = computed(() => {
  let list = allDocs.value || []
  if (activeCategory.value !== 'all') list = list.filter(d => d.category === activeCategory.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.notes || '').toLowerCase().includes(q) ||
      (d.projectTitle || '').toLowerCase().includes(q),
    )
  }
  return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

function fileIcon(url?: string): string {
  if (!url) return '📄'
  if (/\.pdf$/i.test(url)) return '📕'
  if (/\.(doc|docx)$/i.test(url)) return '📘'
  if (/\.(xls|xlsx)$/i.test(url)) return '📊'
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) return '🖼'
  if (/\.(txt|md|csv)$/i.test(url)) return '📝'
  if (/\.(zip|rar|7z|tar)$/i.test(url)) return '📦'
  return '📄'
}

function formatDate(val: string) {
  if (!val) return ''
  return new Date(val).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) }
function isPdf(url: string) { return /\.pdf$/i.test(url) }
function isTextFile(url: string) { return /\.(txt|md|csv)$/i.test(url) }
function categoryCode(key: string) { return CATEGORIES.find(c => c.key === key)?.num || '00' }
function categoryName(key: string) { return CATEGORIES.find(c => c.key === key)?.label || key }
function fileKind(doc: any) {
  if (doc?.content && !doc?.url) return 'AI'
  const source = String(doc?.filename || doc?.url || '').split('?')[0]
  const ext = source.includes('.') ? source.split('.').pop()?.toUpperCase() : ''
  return ext || 'FILE'
}

function resetUploadForm() {
  uploadForm.title = ''
  uploadForm.category = activeCategory.value === 'all' ? 'contract' : activeCategory.value
  uploadForm.projectSlug = ''
  uploadForm.url = ''
  uploadForm.notes = ''
  uploadFile.value = null
  uploadError.value = ''
  uploadInputKey.value += 1
}

function selectCategory(key: string) {
  viewMode.value = 'list'
  activeCategory.value = key
  activeDoc.value = null
  previewText.value = ''
}

async function openDoc(doc: any) {
  viewMode.value = 'list'
  editingDoc.value = null
  isCreatingUpload.value = false
  activeDoc.value = doc
  previewText.value = ''
  if (!doc.content && doc.url && isTextFile(doc.url)) {
    try {
      const text = await $fetch<string>(doc.url, { responseType: 'text' } as any)
      previewText.value = typeof text === 'string' ? text : ''
    } catch { /* no preview */ }
  }
}

function openInEditor(doc: any) {
  existingDocToEdit.value = {
    id: doc.id,
    content: doc.content || '',
    templateKey: doc.templateKey || null,
    projectSlug: doc.projectSlug || null,
  }
  editingDoc.value = null
  isCreatingUpload.value = false
  activeDoc.value = null
  previewText.value = ''
  viewMode.value = 'editor'
}

function editDoc() {
  if (!activeDoc.value) return
  isCreatingUpload.value = true
  editingDoc.value = activeDoc.value
  uploadForm.title = activeDoc.value.title
  uploadForm.category = activeDoc.value.category
  uploadForm.projectSlug = activeDoc.value.projectSlug || ''
  uploadForm.url = activeDoc.value.url || ''
  uploadForm.notes = activeDoc.value.notes || ''
  uploadFile.value = null
  uploadError.value = ''
  uploadInputKey.value += 1
  activeDoc.value = null
  previewText.value = ''
}

// ══════════════════════════════════════════════════════════════════
// UPLOAD / EDIT
// ══════════════════════════════════════════════════════════════════
const uploading = ref(false)
const uploadError = ref('')
const uploadFile = ref<File | null>(null)
const uploadForm = reactive({
  title: '',
  category: 'contract',
  projectSlug: '',
  url: '',
  notes: '',
})

function openUpload() {
  viewMode.value = 'list'
  isCreatingUpload.value = true
  editingDoc.value = null
  activeDoc.value = null
  previewText.value = ''
  resetUploadForm()
}

function cancelUpload() {
  isCreatingUpload.value = false
  editingDoc.value = null
  resetUploadForm()
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  uploadFile.value = input.files?.[0] || null
}

async function submitUpload() {
  if (!uploadForm.title.trim()) return
  uploading.value = true
  uploadError.value = ''
  try {
    let fileUrl = uploadForm.url
    let filename: string | undefined
    let savedDoc: any = null

    if (uploadFile.value) {
      const fd = new FormData()
      fd.append('file', uploadFile.value)
      const { url, filename: fn } = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      fileUrl = url
      filename = fn
    }

    if (editingDoc.value) {
      savedDoc = await $fetch(`/api/documents/${editingDoc.value.id}`, {
        method: 'PUT',
        body: {
          title: uploadForm.title,
          category: uploadForm.category,
          projectSlug: uploadForm.projectSlug || undefined,
          url: fileUrl || undefined,
          filename: filename || editingDoc.value.filename,
          notes: uploadForm.notes || undefined,
        },
      })
    } else {
      savedDoc = await $fetch('/api/documents', {
        method: 'POST',
        body: {
          title: uploadForm.title,
          category: uploadForm.category,
          projectSlug: uploadForm.projectSlug || undefined,
          url: fileUrl || undefined,
          filename,
          notes: uploadForm.notes || undefined,
        },
      })
    }

    await refresh()
    isCreatingUpload.value = false
    editingDoc.value = null
    resetUploadForm()
    activeDoc.value = (allDocs.value || []).find((doc: any) => doc.id === savedDoc?.id) || null
  } catch (e: any) {
    uploadError.value = e?.data?.statusMessage || 'Ошибка загрузки'
  } finally {
    uploading.value = false
  }
}

async function deleteDoc(id: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/documents/${id}`, { method: 'DELETE' }).catch(() => {})
  if (activeDoc.value?.id === id) activeDoc.value = null
  if (editingDoc.value?.id === id) {
    isCreatingUpload.value = false
    editingDoc.value = null
    resetUploadForm()
  }
  await refresh()
}

// ══════════════════════════════════════════════════════════════════
// GENERATE FROM TEMPLATE (inline editor)
// ══════════════════════════════════════════════════════════════════
function openGenerate() {
  viewMode.value = 'editor'
  activeDoc.value = null
  editingDoc.value = null
  isCreatingUpload.value = false
  previewText.value = ''
}

function onEditorSaved() {
  refresh()
}
</script>

<style scoped>
.docs-screen {
  color: var(--glass-text);
}

@media (min-width: 768px) {
  .docs-screen {
    padding-left: clamp(140px, 14vw, 240px);
  }
}

.docs-hero-notice--muted {
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
}

.docs-screen :deep(.admin-entity-hero) {
  justify-content: flex-start;
  padding-top: 40px;
}

.docs-screen :deep(.admin-entity-hero__body),
.docs-screen :deep(.admin-entity-hero__actions),
.docs-screen :deep(.admin-entity-hero__notices) {
  align-items: flex-start;
  justify-content: flex-start;
}

.docs-screen :deep(.admin-entity-hero__title),
.docs-screen :deep(.admin-entity-hero__kicker),
.docs-screen :deep(.admin-entity-hero__prompt) {
  text-align: left;
}

.docs-screen :deep(.admin-entity-hero__prompt) {
  left: 20px;
  right: 20px;
  transform: none;
}

.docs-editor-stage,
.docs-registry {
  padding: 24px 20px 48px;
}

.docs-stage-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.docs-stage-hint,
.docs-registry-note,
.docs-summary-text,
.doc-notes,
.doc-project,
.docs-note-text {
  margin: 0;
  font-size: .82rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--glass-text) 72%, transparent);
}

.docs-inline-action,
.docs-primary-action,
.doc-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 16%, transparent);
  background: transparent;
  color: var(--glass-text);
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: .68rem;
  text-decoration: none;
  cursor: pointer;
}

.docs-primary-action {
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.docs-inline-action--danger,
.doc-action--danger {
  color: color-mix(in srgb, var(--ds-error, #c00) 84%, var(--glass-text) 16%);
}

.docs-registry {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.docs-registry-head,
.docs-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
  gap: 16px;
}

.docs-registry-copy,
.docs-registry-controls,
.docs-column,
.docs-panel,
.doc-card {
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.docs-registry-copy,
.docs-registry-controls,
.docs-column {
  padding: 16px;
}

.docs-registry-kicker,
.docs-panel-kicker,
.docs-meta-label,
.docs-stat__label,
.doc-code,
.doc-kind,
.docs-empty__title {
  margin: 0;
  font-size: .64rem;
  text-transform: uppercase;
  letter-spacing: .16em;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
}

.docs-registry-title,
.docs-panel-title,
.doc-title {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: .08em;
  line-height: 1.08;
}

.docs-registry-title {
  font-size: clamp(1.6rem, 3vw, 2.7rem);
}

.docs-search-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.docs-search-input,
.docs-input {
  min-height: 48px;
  border-radius: 0;
  font-size: 1rem;
}

.docs-file-input {
  padding: 10px 12px;
}

.docs-textarea {
  min-height: 132px;
  resize: vertical;
}

.docs-registry-stats,
.docs-meta-grid,
.docs-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.docs-stat,
.docs-meta-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 88px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.docs-stat__value,
.docs-meta-value {
  font-size: .94rem;
  line-height: 1.35;
  word-break: break-word;
}

.docs-meta-value--mono,
.docs-view-pre,
.doc-code,
.doc-kind {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.docs-column {
  min-width: 0;
}

.docs-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.doc-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 168px;
  padding: 14px;
  cursor: pointer;
  transition: background-color .16s ease, border-color .16s ease;
}

.doc-card:hover,
.doc-card--active {
  border-color: color-mix(in srgb, var(--glass-text) 26%, transparent);
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
}

.doc-card-head,
.doc-actions,
.docs-panel-actions,
.docs-panel-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.doc-card-head {
  justify-content: space-between;
}

.doc-code {
  min-width: 34px;
}

.doc-badge {
  padding: 4px 8px;
  border: 1px solid currentColor;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.doc-badge--contract,
.doc-badge--contract_supply,
.doc-badge--contract_work {
  color: color-mix(in srgb, var(--ds-accent, #4964d1) 76%, var(--glass-text) 24%);
}

.doc-badge--act,
.doc-badge--act_defect,
.doc-badge--approval {
  color: color-mix(in srgb, var(--ds-success, #4d8f61) 78%, var(--glass-text) 22%);
}

.doc-badge--invoice,
.doc-badge--estimate,
.doc-badge--specification,
.doc-badge--tz,
.doc-badge--template,
.doc-badge--warranty,
.doc-badge--photo_report,
.doc-badge--correspondence,
.doc-badge--other {
  color: color-mix(in srgb, var(--glass-text) 74%, transparent);
}

.doc-date {
  margin-left: auto;
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.doc-title {
  font-size: 1.02rem;
}

.doc-actions {
  margin-top: auto;
}

.docs-panel {
  margin-top: 14px;
  padding: 16px;
  min-height: 420px;
}

.docs-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.docs-meta-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.docs-note-block,
.docs-preview {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.docs-preview {
  max-height: 560px;
  overflow: auto;
}

.docs-preview--empty,
.docs-loading,
.docs-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  text-align: center;
}

.docs-empty {
  flex-direction: column;
  gap: 8px;
}

.docs-empty__text {
  max-width: 320px;
  font-size: .82rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--glass-text) 68%, transparent);
}

.docs-view-pre {
  margin: 0;
  font-size: .76rem;
  line-height: 1.65;
  white-space: pre-wrap;
}

.docs-view-img,
.docs-view-pdf {
  width: 100%;
  border: none;
}

.docs-view-pdf {
  min-height: 540px;
}

.docs-error {
  margin: 12px 0 0;
  font-size: .82rem;
  color: color-mix(in srgb, var(--ds-error, #c00) 84%, var(--glass-text) 16%);
}

.docs-field--full {
  grid-column: 1 / -1;
}

.doc-list-enter-active,
.doc-list-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}

.doc-list-enter-from,
.doc-list-leave-to,
.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}

.doc-list-enter-from {
  transform: translateY(6px);
}

.doc-list-leave-to {
  transform: translateY(-6px);
}

.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity .18s ease;
}

@media (max-width: 1080px) {
  .docs-registry-head,
  .docs-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .docs-screen :deep(.admin-entity-hero__prompt) {
    left: 16px;
    right: 16px;
  }

  .docs-editor-stage,
  .docs-registry {
    padding: 18px 14px 40px;
  }

  .docs-registry-stats,
  .docs-meta-grid,
  .docs-field-grid {
    grid-template-columns: 1fr;
  }

  .docs-panel-head,
  .doc-card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .doc-date {
    margin-left: 0;
  }
}
</style>
