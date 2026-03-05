<template>
  <div>
    <div class="proj-content-area">

      <div class="proj-nav-col">
        <AdminNestedNav
          :node="currentNode"
          :direction="slideDir"
          :can-go-back="navDepth > 0"
          :back-label="navDepth > 0 ? 'разделы' : ''"
          :active-key="navDepth === 1 ? activeCategory : undefined"
          @back="onBack"
          @drill="onDrill"
          @select="onSelect"
        >
          <template #footer>
            <button class="ent-sidebar-add a-btn-sm" @click="openGenerate">✦ из шаблона</button>
            <button class="ent-sidebar-add a-btn-sm" style="margin-top:4px" @click="openUpload">+ загрузить</button>
            <div class="docs-rag-status" :class="legalStatus?.ready ? 'docs-rag-status--ok' : 'docs-rag-status--off'" style="margin-top:8px">
              <span class="docs-rag-dot"></span>
              <div class="docs-rag-info">
                <span class="docs-rag-label">правовая база</span>
                <span v-if="legalStatus?.ready" class="docs-rag-count">{{ legalStatus.totalChunks }} норм</span>
                <span v-else class="docs-rag-count">не загружена</span>
              </div>
            </div>
          </template>
        </AdminNestedNav>
      </div><!-- /.proj-nav-col -->

      <!-- ══ Right: content area ══ -->
      <div class="proj-main">
        <div class="docs-topbar glass-card" style="margin-bottom:14px">
          <div class="docs-topbar-left">
            <span class="docs-topbar-title">документы</span>
            <span class="docs-count">{{ allDocs.length }}</span>
          </div>
          <div class="docs-topbar-right">
            <input v-model="search" class="docs-search glass-input" placeholder="поиск..." />
          </div>
        </div>
        <Transition name="tab-fade" mode="out-in">

                <!-- ── EDITOR VIEW (inline) ── -->
          <div v-if="viewMode === 'editor'" key="editor">
            <AdminDocumentEditor
              :templates="DOC_TEMPLATES"
              :projects="allProjects"
              :existingDoc="existingDocToEdit"
              @close="viewMode = 'list'"
              @saved="onEditorSaved"
            />
          </div>

          <!-- ── Document detail view ── -->
          <div v-else-if="activeDoc" key="doc-view">
            <div class="docs-view">
              <div class="docs-view-head">
                <button class="docs-back" @click="activeDoc = null">← назад к списку</button>
                              <div class="docs-view-actions">
                  <a v-if="activeDoc.url" :href="activeDoc.url" target="_blank" class="a-btn-sm">↗ открыть файл</a>
                  <button v-if="activeDoc.content" class="a-btn-save" @click="openInEditor(activeDoc)">✏️ открыть в редакторе</button>
                  <button class="a-btn-sm" @click="editDoc">✎ реквизиты</button>
                  <button class="a-btn-sm a-btn-danger" @click="deleteDoc(activeDoc.id)">удалить</button>
                </div>
              </div>
              <div class="docs-view-card glass-card">
                <div class="docs-view-badge" :class="`docs-view-badge--${activeDoc.category}`">
                  {{ catLabel(activeDoc.category) }}
                </div>
                <h2 class="docs-view-title">{{ activeDoc.title }}</h2>
                <div v-if="activeDoc.projectTitle" class="docs-view-project">
                  проект: <NuxtLink :to="`/admin/projects/${activeDoc.projectSlug}`" class="docs-view-project-link">{{ activeDoc.projectTitle }}</NuxtLink>
                </div>
                <div class="docs-view-meta">
                  <span class="docs-view-date">{{ formatDate(activeDoc.createdAt) }}</span>
                  <span v-if="activeDoc.filename" class="docs-view-file">{{ activeDoc.filename }}</span>
                </div>
                <div v-if="activeDoc.notes" class="docs-view-notes">{{ activeDoc.notes }}</div>

                <!-- Inline preview for text files -->
                <div v-if="activeDoc.content" class="docs-view-preview docs-view-preview--content">
                  <pre class="docs-view-pre">{{ activeDoc.content }}</pre>
                </div>
                <div v-else-if="previewText" class="docs-view-preview">
                  <pre class="docs-view-pre">{{ previewText }}</pre>
                </div>
                <div v-else-if="activeDoc.url && isImage(activeDoc.url)" class="docs-view-preview">
                  <img :src="activeDoc.url" class="docs-view-img" />
                </div>
                <div v-else-if="activeDoc.url && isPdf(activeDoc.url)" class="docs-view-preview">
                  <iframe :src="activeDoc.url" class="docs-view-pdf"></iframe>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Document list ── -->
          <div v-else key="doc-list">
            <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
            <div v-else-if="!filteredDocs.length" class="docs-empty">
              <span class="docs-empty-icon">{{ search ? '🔍' : '📂' }}</span>
              <span>{{ search ? 'Ничего не найдено' : 'Нет документов в этой категории' }}</span>
              <button v-if="!search" class="docs-empty-action a-btn-sm" @click="openGenerate">✦ создать из шаблона</button>
            </div>
            <transition-group v-else name="doc-list" tag="div" class="docs-list">
              <div
                v-for="doc in filteredDocs" :key="doc.id"
                class="doc-card glass-card"
                @click="openDoc(doc)"
              >
                <div class="doc-card-head">
                  <span class="doc-file-icon" :class="{ 'doc-file-icon--ai': doc.content && !doc.url }">
                    {{ doc.content && !doc.url ? '✦' : fileIcon(doc.url) }}
                  </span>
                  <span class="doc-badge" :class="`doc-badge--${doc.category}`">
                    {{ catLabel(doc.category) }}
                  </span>
                  <span v-if="doc.projectTitle" class="doc-project">
                    {{ doc.projectTitle }}
                  </span>
                  <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
                  <div class="doc-actions" @click.stop>
                    <a v-if="doc.url" :href="doc.url" target="_blank" class="doc-btn-ico" title="открыть">↗</a>
                    <button v-if="doc.content" class="doc-btn-ico" title="открыть в редакторе" @click="openInEditor(doc)">✎</button>
                    <button class="doc-btn-ico doc-btn-ico--del" title="удалить" @click="deleteDoc(doc.id)">×</button>
                  </div>
                </div>
                <div class="doc-title">{{ doc.title }}</div>
                <div v-if="doc.notes" class="doc-notes">{{ doc.notes }}</div>
              </div>
            </transition-group>
          </div>

        </Transition>
      </div><!-- /.proj-main -->
    </div><!-- /.proj-content-area -->

    <!-- ═══ Upload modal ═══ -->
    <Teleport to="body">
      <div v-if="showUploadModal" class="docs-backdrop" @click.self="showUploadModal = false">
        <div class="docs-modal glass-surface">
          <div class="docs-modal-head">
            <span>{{ editingDoc ? 'Редактировать документ' : 'Загрузить документ' }}</span>
            <button class="docs-modal-close" @click="showUploadModal = false">✕</button>
          </div>
          <div class="docs-modal-body">
            <div class="docs-field">
              <label class="docs-label">Название *</label>
              <input v-model="uploadForm.title" class="glass-input" placeholder="Договор подряда №12..." />
            </div>
            <div class="docs-field">
              <label class="docs-label">Категория</label>
              <select v-model="uploadForm.category" class="glass-input">
                <option v-for="c in CATEGORIES.filter(c => c.key !== 'all')" :key="c.key" :value="c.key">
                  {{ c.num }} {{ c.label }}
                </option>
              </select>
            </div>
            <div class="docs-field">
              <label class="docs-label">Проект</label>
              <select v-model="uploadForm.projectSlug" class="glass-input">
                <option value="">— без проекта —</option>
                <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
              </select>
            </div>
            <div v-if="!editingDoc" class="docs-field">
              <label class="docs-label">Файл</label>
              <input type="file" class="glass-input" @change="onFileSelect" />
            </div>
            <div class="docs-field">
              <label class="docs-label">Или вставьте URL</label>
              <input v-model="uploadForm.url" class="glass-input" placeholder="https://..." />
            </div>
            <div class="docs-field">
              <label class="docs-label">Заметки</label>
              <textarea v-model="uploadForm.notes" rows="2" class="glass-input u-ta" placeholder="дополнительная информация..."></textarea>
            </div>
            <p v-if="uploadError" class="docs-error">{{ uploadError }}</p>
          </div>
          <div class="docs-modal-foot">
            <button class="a-btn-sm" @click="showUploadModal = false">отмена</button>
            <button class="a-btn-save" :disabled="uploading || !uploadForm.title" @click="submitUpload">
              {{ uploading ? 'загрузка...' : (editingDoc ? 'сохранить' : 'загрузить') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })
import type { NavItem, NavNode } from '~/components/AdminNestedNav.vue'

// ══════════════════════════════════════════════════════════════════
// CATEGORIES — numbered, professional
// ══════════════════════════════════════════════════════════════════
const CATEGORIES = [
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
      { key: 'executor_name',   label: '— Заказчик (исполнитель)', placeholder: 'Кульчихина Д.А.' },
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
      { key: 'executor_name',   label: '— Исполнитель',  placeholder: 'Кульчихина Дария Андреевна' },
      { key: 'executor_inn',    label: '— ИНН',          placeholder: '770112345678' },
      { key: 'executor_bank',   label: '— Банк',         placeholder: 'Сбербанк России' },
      { key: 'executor_bik',    label: '— БИК',          placeholder: '044525225' },
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
// lazy: true + server: false — без await, нет Suspense-границы, refresh() не пересоздаёт страницу
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
// useState вместо ref — Nuxt сохраняет это значение при любых ре-рендерах
// и клиентских рефетчах (useFetch), поэтому редактор не сбрасывается
const viewMode = useState<'list' | 'editor'>('docs-viewMode', () => 'list')
const activeCategory = ref('all')
const search = ref('')
const activeDoc = ref<any>(null)
const editingDoc = ref<any>(null)
const previewText = ref('')
// Существующий документ для редактирования в AdminDocumentEditor
const existingDocToEdit = ref<{ id: number; content: string; templateKey?: string | null; projectSlug?: string | null } | null>(null)

// Обновляем список документов при возврате из редактора
watch(viewMode, (v, prev) => {
  if (v === 'list' && prev === 'editor') {
    existingDocToEdit.value = null
    refresh()
  }
})

// При уходе со страницы сбрасываем, чтобы при возврате не открывался редактор
onBeforeRouteLeave(() => { viewMode.value = 'list' })

const countByCategory = computed(() => {
  const r: Record<string, number> = {}
  for (const doc of allDocs.value || []) {
    r[doc.category] = (r[doc.category] || 0) + 1
    r['all'] = (r['all'] || 0) + 1
  }
  return r
})

// ── Nav state (AdminNestedNav) ──
const navDepth = ref<0 | 1>(1)
const slideDir = ref<'fwd' | 'back'>('fwd')
const NAV_ROUTES: Record<string, string> = {
  projects: '/admin', clients: '/admin/clients',
  contractors: '/admin/contractors', designers: '/admin/designers', sellers: '/admin/sellers',
}
const currentNode = computed((): NavNode => navDepth.value === 0
  ? {
      key: 'root', title: 'разделы',
      items: [
        { key: 'projects',    icon: '◈', label: 'проекты',    isNode: true },
        { key: 'clients',     icon: '◐', label: 'клиенты',    isNode: true },
        { key: 'contractors', icon: '◒', label: 'подрядчики', isNode: true },
        { key: 'designers',   icon: '◓', label: 'дизайнеры',  isNode: true },
        { key: 'sellers',     icon: '◑', label: 'продавцы',   isNode: true },
        { key: 'documents',   icon: '○', label: 'документы',  isNode: true },
      ],
    }
  : {
      key: 'documents',
      title: 'документы',
      count: allDocs.value?.length,
      items: CATEGORIES.map(cat => ({
        key: cat.key,
        label: cat.num ? `${cat.num} ${cat.label}` : cat.label,
        count: countByCategory.value[cat.key],
      })),
    }
)
function onDrill(item: NavItem) {
  if (navDepth.value === 0) {
    if (item.key === 'documents') { slideDir.value = 'fwd'; navDepth.value = 1 }
    else if (NAV_ROUTES[item.key]) navigateTo(NAV_ROUTES[item.key])
  }
}
function onSelect(item: NavItem) { selectCategory(item.key) }
function onBack() { slideDir.value = 'back'; if (navDepth.value === 1) navDepth.value = 0 }

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

function selectCategory(key: string) {
  viewMode.value = 'list'
  activeCategory.value = key
  activeDoc.value = null
  previewText.value = ''
}

async function openDoc(doc: any) {
  viewMode.value = 'list'
  activeDoc.value = doc
  previewText.value = ''
  // Загружаем текст только если нет content, но есть url
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
  activeDoc.value = null
  viewMode.value = 'editor'
}

function editDoc() {
  if (!activeDoc.value) return
  editingDoc.value = activeDoc.value
  uploadForm.title = activeDoc.value.title
  uploadForm.category = activeDoc.value.category
  uploadForm.projectSlug = activeDoc.value.projectSlug || ''
  uploadForm.url = activeDoc.value.url || ''
  uploadForm.notes = activeDoc.value.notes || ''
  uploadFile.value = null
  uploadError.value = ''
  showUploadModal.value = true
}

// ══════════════════════════════════════════════════════════════════
// UPLOAD / EDIT
// ══════════════════════════════════════════════════════════════════
const showUploadModal = ref(false)
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
  editingDoc.value = null
  uploadForm.title = ''
  uploadForm.category = activeCategory.value === 'all' ? 'contract' : activeCategory.value
  uploadForm.projectSlug = ''
  uploadForm.url = ''
  uploadForm.notes = ''
  uploadFile.value = null
  uploadError.value = ''
  showUploadModal.value = true
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

    if (uploadFile.value) {
      const fd = new FormData()
      fd.append('file', uploadFile.value)
      const { url, filename: fn } = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      fileUrl = url
      filename = fn
    }

    if (editingDoc.value) {
      // Update existing
      await $fetch(`/api/documents/${editingDoc.value.id}`, {
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
      await $fetch('/api/documents', {
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

    showUploadModal.value = false
    editingDoc.value = null
    activeDoc.value = null
    await refresh()
  } catch (e: any) {
    uploadError.value = e?.data?.statusMessage || 'Ошибка загрузки'
  } finally {
    uploading.value = false
  }
}

async function deleteDoc(id: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/documents/${id}`, { method: 'DELETE' }).catch(() => {})
  activeDoc.value = null
  await refresh()
}

// ══════════════════════════════════════════════════════════════════
// GENERATE FROM TEMPLATE (inline editor)
// ══════════════════════════════════════════════════════════════════
function openGenerate() {
  viewMode.value = 'editor'
  activeDoc.value = null
}

function onEditorSaved() {
  // Ничего не делаем — редактор остаётся открытым.
  // Список обновится автоматически когда пользователь вернётся через @close
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   DOCUMENTS — admin panel
   ══════════════════════════════════════════════════════════════ */

/* ── Topbar ── */
.docs-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 18px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
}
.docs-topbar-left { display: flex; align-items: center; gap: 10px; }
.docs-topbar-title {
  font-size: var(--ds-text-sm, .78rem); text-transform: uppercase;
  letter-spacing: .08em; color: var(--glass-text); opacity: .45; font-weight: var(--ds-heading-weight, 600);
}
.docs-count {
  font-size: var(--ds-text-xs, .65rem); padding: 1px 7px; border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: var(--glass-text); opacity: .6;
}
.docs-topbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.docs-search { width: 200px; padding: 7px 12px; font-size: var(--ds-text-sm, .8rem); }

/* ── Layout ── */
.docs-layout { display: flex; gap: var(--ds-grid-gap, 16px); align-items: flex-start; }

/* ── Nav sidebar ── */
.docs-nav {
  width: var(--ds-sidebar-width, 220px); flex-shrink: 0; padding: 8px;
  position: sticky; top: 80px;
  max-height: calc(100vh - 120px); overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: rgba(128,128,128,.15) transparent;
}
.docs-nav-item {
  gap: 6px !important;
  font-size: var(--ds-text-xs, .74rem) !important;
  padding: 7px 10px !important;
}
.docs-nav-num {
  font-size: .6rem; opacity: .35; font-variant-numeric: tabular-nums;
  min-width: 16px; flex-shrink: 0;
}
.docs-nav-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.docs-nav-count {
  font-size: .58rem; padding: 0 5px; border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  flex-shrink: 0; line-height: 1.6;
}
.docs-nav-create {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  margin-bottom: 4px; padding-bottom: 8px !important;
  font-weight: 500 !important;
}

/* ── RAG status widget ── */
.docs-rag-status {
  display: flex; align-items: center; gap: 8px;
  margin-top: 8px; padding: 8px 10px;
  border-radius: var(--chip-radius, 8px);
  border: 1px solid transparent;
  font-size: .62rem;
}
.docs-rag-status--ok  { background: rgba(22, 163, 74, .08); border-color: rgba(22, 163, 74, .18); }
.docs-rag-status--off { background: rgba(128,128,128, .06); border-color: rgba(128,128,128, .12); }
.docs-rag-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.docs-rag-status--ok  .docs-rag-dot { background: var(--ds-success, #16a34a); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ds-success, #16a34a) 25%, transparent); }
.docs-rag-status--off .docs-rag-dot { background: var(--ds-muted, #9ca3af); }
.docs-rag-info { display: flex; flex-direction: column; gap: 1px; }
.docs-rag-label { font-weight: 600; text-transform: uppercase; letter-spacing: .07em; opacity: .45; color: var(--glass-text); }
.docs-rag-count { opacity: .65; color: var(--glass-text); }

/* ── Main content ── */
.docs-main { flex: 1; min-width: 0; }
.docs-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  font-size: var(--ds-text-sm, .84rem); color: var(--glass-text); opacity: .35; padding: 40px 0;
}
.docs-empty-icon { font-size: 1.8rem; opacity: .5; }
.docs-empty-action { margin-top: 4px; opacity: 1; }
.docs-list { display: flex; flex-direction: column; gap: 8px; }

/* ── Doc card ── */
.doc-card {
  padding: 12px 16px; cursor: pointer;
  transition: box-shadow var(--ds-transition, .18s ease), transform var(--ds-transition, .18s ease);
}
.doc-card:hover {
  box-shadow: var(--ds-shadow-lg, 0 8px 32px rgba(0,0,0,.1));
  transform: translateY(-1px);
}
.doc-card-head {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; margin-bottom: 6px;
}
.doc-badge {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .5px;
  padding: 2px 8px; border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  color: var(--glass-text); flex-shrink: 0;
}
.doc-file-icon {
  font-size: .9rem; flex-shrink: 0; line-height: 1; opacity: .6;
}
.doc-file-icon--ai {
  opacity: 1; color: var(--ds-accent, #6366f1); font-size: .8rem; font-weight: 700;
}
.doc-badge--contract,
.doc-badge--contract_supply,
.doc-badge--contract_work { background: color-mix(in srgb, var(--ds-accent, #6366f1) 12%, transparent); color: var(--ds-accent, #6366f1); }
.doc-badge--act,
.doc-badge--act_defect { background: color-mix(in srgb, var(--ds-success, #22c55e) 10%, transparent); color: var(--ds-success, #16a34a); }
.doc-badge--invoice { background: color-mix(in srgb, var(--ds-warning, #f59e0b) 12%, transparent); color: var(--ds-warning, #d97706); }
.doc-badge--estimate { background: color-mix(in srgb, var(--phase-violet, #a855f7) 10%, transparent); color: var(--phase-violet, #9333ea); }
.doc-badge--specification,
.doc-badge--tz { background: color-mix(in srgb, var(--phase-blue, #3b82f6) 10%, transparent); color: var(--phase-blue, #3b82f6); }
.doc-badge--approval { background: color-mix(in srgb, var(--ds-success, #22c55e) 8%, transparent); color: var(--ds-success, #059669); }
.doc-badge--warranty { background: color-mix(in srgb, var(--phase-teal, #0ea5e9) 10%, transparent); color: var(--phase-teal, #0ea5e9); }
.doc-badge--photo_report { background: color-mix(in srgb, var(--ds-accent, #ec4899) 10%, transparent); color: var(--ds-accent, #db2777); }
.doc-badge--correspondence { background: color-mix(in srgb, var(--ds-muted, #6b7280) 10%, transparent); color: var(--ds-muted, #6b7280); }
.doc-badge--template { background: color-mix(in srgb, var(--phase-violet, #a855f7) 10%, transparent); color: var(--phase-violet, #9333ea); }

html.dark .doc-badge--contract,
html.dark .doc-badge--contract_supply,
html.dark .doc-badge--contract_work { background: rgba(99,102,241,.2); color: #a5b4fc; }
html.dark .doc-badge--act,
html.dark .doc-badge--act_defect { background: rgba(34,197,94,.15); color: #86efac; }
html.dark .doc-badge--invoice { background: rgba(245,158,11,.15); color: #fcd34d; }
html.dark .doc-badge--estimate { background: rgba(168,85,247,.15); color: #c4b5fd; }

.doc-project { flex: 1; min-width: 0; font-size: .74rem; color: var(--glass-text); opacity: .5; }
.doc-date { font-size: .68rem; color: var(--glass-text); opacity: .3; white-space: nowrap; margin-left: auto; }

.doc-actions { display: flex; gap: 4px; flex-shrink: 0; }
.doc-btn-ico {
  width: 24px; height: 24px; border: none; background: none;
  cursor: pointer; font-size: .8rem; color: var(--glass-text); opacity: .3;
  border-radius: 4px; display: flex; align-items: center; justify-content: center;
  text-decoration: none; transition: opacity .15s;
}
.doc-btn-ico:hover { opacity: .7; }
.doc-btn-ico--del:hover { color: var(--ds-error, #dc2626); opacity: .8; }

.doc-title { font-size: var(--ds-text-sm, .88rem); font-weight: 500; color: var(--glass-text); }
.doc-notes { margin-top: 4px; font-size: var(--ds-text-xs, .74rem); color: var(--glass-text); opacity: .4; }

/* ── Transitions ── */
.doc-list-enter-active, .doc-list-leave-active { transition: all .2s ease; }
.doc-list-enter-from { opacity: 0; transform: translateY(-4px); }
.doc-list-leave-to  { opacity: 0; transform: translateY(4px); }
.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity .2s ease; }
.tab-fade-enter-from, .tab-fade-leave-to { opacity: 0; }

/* ══ Document inline view ══ */
.docs-view-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
}
.docs-back {
  background: none; border: none; cursor: pointer;
  font-size: var(--ds-text-sm, .8rem); color: var(--glass-text); opacity: .5;
  font-family: inherit; padding: 4px 0;
  transition: opacity .15s;
}
.docs-back:hover { opacity: 1; }
.docs-view-actions { display: flex; gap: 6px; }
.docs-view-card { padding: 24px; }
.docs-view-badge {
  display: inline-block;
  font-size: .6rem; text-transform: uppercase; letter-spacing: .5px;
  padding: 2px 10px; border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  color: var(--glass-text); margin-bottom: 12px;
}
.docs-view-badge--contract,
.docs-view-badge--contract_supply,
.docs-view-badge--contract_work { background: color-mix(in srgb, var(--ds-accent, #6366f1) 12%, transparent); color: var(--ds-accent, #6366f1); }
.docs-view-badge--act { background: color-mix(in srgb, var(--ds-success, #22c55e) 10%, transparent); color: var(--ds-success, #16a34a); }
.docs-view-badge--invoice { background: color-mix(in srgb, var(--ds-warning, #f59e0b) 12%, transparent); color: var(--ds-warning, #d97706); }

.docs-view-title {
  font-size: var(--ds-text-xl, 1.2rem); font-weight: var(--ds-heading-weight, 600);
  color: var(--glass-text); margin-bottom: 8px; line-height: 1.3;
}
.docs-view-project {
  font-size: var(--ds-text-sm, .8rem); color: var(--glass-text); opacity: .5; margin-bottom: 6px;
}
.docs-view-project-link { color: var(--ds-accent, #6366f1); text-decoration: none; }
.docs-view-project-link:hover { text-decoration: underline; }
.docs-view-meta {
  display: flex; gap: 12px; margin-bottom: 12px;
  font-size: var(--ds-text-xs, .72rem); color: var(--glass-text); opacity: .35;
}
.docs-view-file {
  font-family: 'JetBrains Mono', monospace; font-size: .68rem;
}
.docs-view-notes {
  font-size: var(--ds-text-sm, .82rem); color: var(--glass-text); opacity: .6;
  line-height: 1.6; margin-bottom: 16px;
  padding: 12px; border-radius: var(--input-radius, 6px);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.docs-view-preview {
  margin-top: 16px; padding: 16px; border-radius: var(--input-radius, 8px);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
  max-height: 500px; overflow-y: auto;
}
/* Превью текста сгенерированного документа — шрифт как в редакторе */
.docs-view-preview--content .docs-view-pre {
  font-family: inherit;
  font-size: var(--ds-text-sm, .82rem);
  line-height: 1.7;
}
.docs-view-pre {
  margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: var(--ds-text-xs, .74rem); color: var(--glass-text);
  white-space: pre-wrap; line-height: 1.6;
}
.docs-view-img { max-width: 100%; border-radius: var(--input-radius, 6px); }
.docs-view-pdf { width: 100%; height: 500px; border: none; border-radius: var(--input-radius, 6px); }

/* ══ Modal ══ */
.docs-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 16px;
}
.docs-modal {
  width: 480px; max-width: 100%; max-height: 88vh;
  border-radius: var(--modal-radius, 16px);
  display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.18);
}
.docs-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  font-size: var(--ds-text-sm, .84rem); font-weight: 500; color: var(--glass-text);
  flex-shrink: 0;
}
.docs-modal-close {
  background: none; border: none; cursor: pointer;
  font-size: 1rem; color: var(--glass-text); opacity: .45; padding: 2px 6px;
}
.docs-modal-close:hover { opacity: 1; }
.docs-modal-body { overflow-y: auto; flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.docs-modal-foot {
  padding: 12px 20px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  flex-shrink: 0;
}
.docs-field { display: flex; flex-direction: column; gap: 4px; }
.docs-label {
  font-size: .62rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .45; font-weight: var(--ds-heading-weight, 600);
}
.docs-error { font-size: var(--ds-text-xs, .78rem); color: var(--ds-error, #dc2626); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .docs-layout { flex-direction: column; }
  .docs-nav { width: 100%; position: static; flex-direction: row; overflow-x: auto; max-height: none; }
  .docs-nav .std-nav { flex-direction: row; }
  .docs-nav-item { white-space: nowrap; }
  .docs-nav-num { display: none; }
}
</style>
