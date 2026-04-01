<template>
  <div class="cl-page" :class="{ 'cl-page--brutalist': isBrutalistClientsMode }">
    <div v-if="projectSlugFilter" class="cl-filter-info glass-surface glass-card" :class="{ 'cl-filter-info--brutalist': isBrutalistClientsMode }">
      <span>Фильтр по проекту: <b>{{ projectSlugFilter }}</b></span>
      <NuxtLink :to="`/admin/projects/${projectSlugFilter}`" class="cl-filter-link">← к проекту</NuxtLink>
      <NuxtLink to="/admin/clients" class="cl-filter-link">показать всех</NuxtLink>
    </div>

    <!-- Content: selected client or empty state -->
    <template v-if="selectedClient">
      <div class="cl-wipe-host">
          <AdminEntityHero
            v-if="showBrutalistClientHero"
            :kicker="selectedClientSlug ? 'клиентский кабинет' : 'карточка клиента'"
            :title="selectedClient.name"
            :facts="clientHeroFacts"
            :meta-columns="3"
          >
            <template #actions>
              <button class="admin-entity-hero__action" @click="openEdit(selectedClient)">редактировать</button>
              <button class="admin-entity-hero__action" @click="openLink(selectedClient)">{{ selectedClient.linkedProjects?.length ? 'сменить проект' : 'привязать к проекту' }}</button>
              <button class="admin-entity-hero__action" @click="clientPage = 'documents'">документы</button>
              <a v-if="selectedClient.linkedProjects?.length" :href="`/client/${selectedClient.linkedProjects[0].slug}`" class="admin-entity-hero__action">кабинет ↗</a>
            </template>
          </AdminEntityHero>

          <!-- Minimal context strip -->
          <AdminEntityHeader v-if="!showBrutalistClientHero" :title="selectedClient.name">
            <template #actions>
              <button class="ent-entity-hd-action" @click="openEdit(selectedClient)">ред.</button>
              <button class="ent-entity-hd-action" @click="openLink(selectedClient)">{{ selectedClient.linkedProjects?.length ? 'проект' : 'привязать' }}</button>
              <button class="ent-entity-hd-action" @click="clientPage = 'documents'">документы</button>
              <a v-if="selectedClient.linkedProjects?.length" :href="`/client/${selectedClient.linkedProjects[0].slug}`" class="ent-entity-hd-action">↗</a>
            </template>
          </AdminEntityHeader>

          <section v-show="!isWipe2Mode" class="cl-main-shell" :class="{ 'cl-main-shell--brutalist': isBrutalistClientsMode }">
            <div v-if="currentClientPage === 'dashboard'" class="cl-section-grid">
              <div class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
                <div class="ent-detail-section">клиент</div>
                <div class="ent-detail-row">{{ selectedClient.name }}</div>
                <div v-if="selectedClient.phone" class="ent-detail-row">{{ selectedClient.phone }}</div>
                <div v-if="selectedClient.email" class="ent-detail-row">{{ selectedClient.email }}</div>
                <div v-if="selectedClient.address" class="ent-detail-row">{{ selectedClient.address }}</div>
                <p v-if="selectedClient.notes" class="ent-detail-notes">{{ selectedClient.notes }}</p>
              </div>
              <div class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
                <div class="ent-detail-section">проект</div>
                <template v-if="selectedClientSlug && clientProject">
                  <div class="ent-detail-row">{{ clientProject.title }}</div>
                  <div class="ent-detail-row" style="opacity:.62">{{ selectedClientSlug }}</div>
                  <div class="ent-detail-foot" style="margin-top:16px">
                    <NuxtLink :to="`/admin/projects/${selectedClientSlug}`" class="a-btn-sm">открыть проект</NuxtLink>
                  </div>
                </template>
                <template v-else>
                  <div class="ent-detail-row" style="opacity:.48">проект не привязан</div>
                  <div class="ent-detail-foot" style="margin-top:16px">
                    <GlassButton variant="secondary" density="compact"  @click="openLink(selectedClient)">привязать к проекту</GlassButton>
                  </div>
                </template>
              </div>
            </div>

            <div v-else-if="currentClientPage === 'profile'" class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
              <div class="ent-detail-section">профиль клиента</div>
              <div class="ent-detail-row">имя: {{ selectedClient.name }}</div>
              <div v-if="selectedClient.phone" class="ent-detail-row">телефон: {{ selectedClient.phone }}</div>
              <div v-if="selectedClient.email" class="ent-detail-row">email: {{ selectedClient.email }}</div>
              <div v-if="selectedClient.messengerNick" class="ent-detail-row">мессенджер: {{ selectedClient.messenger ? selectedClient.messenger + ' ' : '' }}{{ selectedClient.messengerNick }}</div>
              <div v-if="selectedClient.address" class="ent-detail-row">адрес: {{ selectedClient.address }}</div>
              <p v-if="selectedClient.notes" class="ent-detail-notes">{{ selectedClient.notes }}</p>
            </div>

            <div v-else-if="currentClientPage === 'signoff'" class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
              <div class="ent-detail-section">подписание и согласование</div>
              <template v-if="selectedClientSlug && clientProject">
                <div class="ent-detail-row">проект: {{ clientProject.title }}</div>
                <div class="ent-detail-row" style="opacity:.62">клиент может согласовывать документы через кабинет проекта</div>
                <div class="ent-detail-foot" style="margin-top:16px">
                  <NuxtLink :to="`/admin/projects/${selectedClientSlug}`" class="a-btn-sm">открыть проект</NuxtLink>
                </div>
              </template>
              <div v-else class="ent-detail-row" style="opacity:.48">для этого раздела сначала нужен привязанный проект</div>
            </div>

            <div v-else-if="currentClientPage === 'projects'" class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
              <div class="ent-detail-section">проекты клиента</div>
              <div v-if="selectedClient.linkedProjects?.length" class="cl-linked-projects">
                <NuxtLink
                  v-for="projectItem in selectedClient.linkedProjects"
                  :key="projectItem.slug"
                  :to="`/admin/projects/${projectItem.slug}`"
                  class="cl-linked-project-card"
                >
                  <span>{{ projectItem.title || projectItem.slug }}</span>
                  <span>{{ projectItem.slug }}</span>
                </NuxtLink>
              </div>
              <div v-else class="ent-detail-row" style="opacity:.48">у клиента пока нет привязанных проектов</div>
            </div>

            <div v-else-if="currentClientPage === 'documents'" class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
              <div class="ent-detail-section">документы клиента</div>
              <div class="cl-row"><div class="cl-field"><label>Поиск</label><GlassInput v-model="docsSearch"  placeholder="Название" /></div><div class="cl-field"><label>Категория</label><select v-model="docsFilter" class="glass-input"><option value="">Все</option><option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option></select></div></div>
              <div class="cl-row"><div class="cl-field"><label>Название</label><GlassInput v-model="docsTitle"  placeholder="Название документа" /></div><div class="cl-field"><label>Категория</label><select v-model="docsCategory" class="glass-input"><option v-for="dc in DOC_CATEGORIES" :key="`inline-${dc.value}`" :value="dc.value">{{ dc.label }}</option></select></div></div>
              <div class="cl-field"><label>Примечание</label><GlassInput v-model="docsNotes"  placeholder="Необязательно" /></div>
              <div style="margin-bottom:14px"><label class="a-btn-save" style="display:inline-flex;align-items:center;cursor:pointer"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple style="display:none" @change="uploadClientDoc" />{{ docsUploading ? 'загрузка…' : '＋ выбрать файл' }}</label></div>
              <div v-if="docsPending" class="ent-detail-row" style="opacity:.48">загрузка документов…</div>
              <div v-else-if="filteredClientDocs.length" class="cl-docs-list">
                <div v-for="doc in filteredClientDocs" :key="doc.id" class="cl-doc-item glass-surface">
                  <div><div class="cl-doc-title">{{ doc.title }}</div><div class="cl-doc-meta">{{ DOC_CATEGORIES.find((c: any) => c.value === doc.category)?.label || doc.category }}<span v-if="doc.notes"> · {{ doc.notes }}</span><span v-if="doc.createdAt"> · {{ formatDocDate(doc.createdAt) }}</span></div></div>
                  <div class="cl-doc-actions"><a v-if="doc.url" :href="doc.url" target="_blank" class="ent-detail-chip">скачать</a><GlassButton variant="danger" density="compact"  @click="deleteClientDoc(doc.id)">✕</GlassButton></div>
                </div>
              </div>
              <div v-else class="ent-detail-row" style="opacity:.48">документов пока нет</div>
            </div>
          </section>
          <Wipe2Renderer v-if="contentViewMode === 'wipe2'" :entity="wipe2ClientEntityData" layout="inline" @edit="designSystem.set('contentViewMode', 'scroll')" />
      </div>
        </template>

        <!-- Nothing selected -->
        <AdminEntityEmptyState
          v-else
          icon="👤"
          :has-items="Boolean(clients?.length)"
          message-with-items="Выберите клиента из списка"
          message-empty="Нет клиентов — добавьте первого"
          action-label="+ добавить"
          :brutalist="isBrutalistClientsMode"
          @action="openAdd"
        />

    <Teleport to="body">
    <div v-if="showModal" class="cl-backdrop" :class="{ 'cl-backdrop--brutalist': isBrutalistClientsMode }" @click.self="closeModal">
      <div class="cl-modal glass-surface glass-card" :class="{ 'cl-modal--brutalist': isBrutalistClientsMode }">
        <div class="cl-modal-head"><span>{{ editingId ? 'редактировать клиента' : 'новый клиент' }}</span><button class="cl-close" @click="closeModal">✕</button></div>
        <form class="cl-form" @submit.prevent="save">
          <div class="cl-field"><label>Имя / Название *</label><GlassInput v-model="form.name"  required placeholder="Иванова Анна Сергеевна" autofocus /></div>
          <div class="cl-row"><div class="cl-field"><label>Телефон</label><GlassInput v-model="form.phone"  placeholder="+7 999 000 00 00" /></div><div class="cl-field"><label>Email</label><GlassInput v-model="form.email"  type="email" placeholder="client@mail.ru" /></div></div>
          <div class="cl-row"><div class="cl-field"><label>Мессенджер</label><select v-model="form.messenger" class="glass-input"><option value="">— не указан</option><option value="Telegram">Telegram</option><option value="WhatsApp">WhatsApp</option><option value="Viber">Viber</option></select></div><div class="cl-field"><label>Ник / номер</label><GlassInput v-model="form.messengerNick"  placeholder="@username" /></div></div>
          <div class="cl-field"><label>Адрес</label><AppAddressInput v-model="form.address" input-class="glass-input" placeholder="г. Москва, ул. ..." /></div>
          <div class="cl-field"><label>Заметки</label><textarea v-model="form.notes" class="glass-input u-ta" rows="3" placeholder="Любые пометки"></textarea></div>
          <p v-if="saveError" class="cl-error">{{ saveError }}</p>
          <div class="cl-modal-foot"><GlassButton variant="secondary" density="compact" type="button"  @click="closeModal">отмена</GlassButton><GlassButton variant="primary" type="submit"  :disabled="saving">{{ saving ? '...' : (editingId ? 'сохранить' : 'добавить') }}</GlassButton></div>
        </form>
      </div>
    </div>
    </Teleport>

    <!-- ══ Link-to-project modal ══ -->
    <Teleport to="body">
    <div v-if="showLink" class="cl-backdrop" :class="{ 'cl-backdrop--brutalist': isBrutalistClientsMode }" @click.self="showLink = false">
      <div class="cl-modal glass-surface glass-card" :class="{ 'cl-modal--brutalist': isBrutalistClientsMode }">
        <div class="cl-modal-head"><span>привязать «{{ linkClient?.name }}» к проекту</span><button class="cl-close" @click="showLink = false">✕</button></div>
        <div class="cl-form">
          <div class="cl-field">
            <label>Выберите проект</label>
            <select v-model="linkProjectSlug" class="glass-input" :disabled="projectsCatalogLoading">
              <option value="">{{ projectsCatalogLoading ? 'загрузка проектов…' : '— выберите проект —' }}</option>
              <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
            </select>
          </div>
          <div v-if="linkProjectSlug" class="cl-link-preview glass-surface"><p class="cl-link-preview-title">Будет заполнено в профиле проекта:</p><ul class="cl-link-list"><li><b>Имя клиента</b> → {{ linkClient?.name }}</li><li v-if="linkClient?.phone"><b>Телефон</b> → {{ linkClient?.phone }}</li><li v-if="linkClient?.email"><b>Email</b> → {{ linkClient?.email }}</li></ul></div>
          <p v-if="linkError" class="cl-error">{{ linkError }}</p>
          <div class="cl-modal-foot"><GlassButton variant="secondary" density="compact" type="button"  @click="showLink = false">отмена</GlassButton><GlassButton variant="primary"  :disabled="!linkProjectSlug || linking" @click="doLink">{{ linking ? '...' : 'привязать' }}</GlassButton></div>
        </div>
      </div>
    </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { Wipe2EntityData } from '~/shared/types/wipe2'
import Wipe2Renderer from '~/components/Wipe2Renderer.vue'
import { getClientPages } from '~~/shared/constants/pages'
import ClientInitiation      from '~/components/ClientInitiation.vue'
import ClientSelfProfile     from '~/components/ClientSelfProfile.vue'
import ClientContactDetails  from '~/components/ClientContactDetails.vue'
import ClientPassport        from '~/components/ClientPassport.vue'
import ClientBrief           from '~/components/ClientBrief.vue'
import ClientTZ              from '~/components/ClientTZ.vue'
import ClientContracts       from '~/components/ClientContracts.vue'
import ClientWorkProgress    from '~/components/ClientWorkProgress.vue'
import ClientTimeline        from '~/components/ClientTimeline.vue'
import ClientDesignAlbum     from '~/components/ClientDesignAlbum.vue'
import ClientPageContent     from '~/components/ClientPageContent.vue'
import ClientOverview        from '~/components/ClientOverview.vue'

definePageMeta({ layout: 'admin', middleware: 'admin', pageTransition: false })

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('clients'))
onActivated(() => adminNav.ensureSection('clients'))

// Sync selected client from global nav contentSpec
watch(() => adminNav.contentSpec.value.clientId, (id) => {
  if (id) selectedClientId.value = id
}, { immediate: true })

watch(() => adminNav.contentSpec.value.clientSection, (section) => {
  if (section) clientPage.value = section
}, { immediate: true })

const route = useRoute()
const designSystem = useDesignSystem()
const isBrutalistClientsMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const contentViewMode = computed(() => designSystem.tokens.value.contentViewMode ?? 'scroll')
const isWipe2Mode = computed(() => contentViewMode.value === 'wipe2')

function getClientDocCategoryLabel(category?: string | null) {
  return DOC_CATEGORIES.find((item) => item.value === category)?.label || category || 'Документ'
}

function getClientProjectStatus(project: any) {
  if (!project) return 'не привязан'
  const statusMap: Record<string, string> = {
    lead: 'лид',
    active: 'активен',
    paused: 'на паузе',
    done: 'завершен',
    archived: 'архив',
  }
  return statusMap[project.status] || project.status || 'в работе'
}

function getClientProjectTone(project: any): 'default' | 'accent' | 'success' | 'muted' {
  if (!project) return 'muted'
  if (project.status === 'active' || project.status === 'done') return 'success'
  if (project.status === 'paused') return 'accent'
  return 'default'
}

const clientProfileStats = computed(() => {
  const c = selectedClient.value
  if (!c) return { filled: 0, total: 5 }
  const checks = [c.phone, c.email, c.messengerNick, c.address, c.notes]
  return {
    filled: checks.filter(Boolean).length,
    total: checks.length,
  }
})

const wipe2ClientEntityData = computed<Wipe2EntityData | null>(() => {
  const c = selectedClient.value
  if (!c) return null
  const projects = c.linkedProjects || []
  const primaryProject = projects[0] || null
  const docs = filteredClientDocs.value || []

  if (currentClientPage.value === 'documents') {
    return {
      entityTitle: 'Документы клиента',
      entitySubtitle: docs.length ? `${docs.length} файлов` : 'архив пока пуст',
      entityStatus: docs.length ? 'загружены' : 'пусто',
      entityStatusColor: docs.length ? 'green' : 'muted',
      sections: [
        {
          title: 'Документы',
          fields: docs.length
            ? docs.slice(0, 18).map((doc: any) => ({
                label: doc.title || 'Документ',
                value: getClientDocCategoryLabel(doc.category),
                type: 'badge' as const,
                description: doc.notes || 'Без заметок',
                caption: doc.createdAt ? formatDocDate(doc.createdAt) : 'без даты',
                eyebrow: 'документ клиента',
                badge: doc.url ? 'файл' : 'черновик',
                tone: doc.url ? 'success' as const : 'muted' as const,
                span: 2 as const,
              }))
            : [{
                label: 'Архив',
                value: 'Документов пока нет',
                description: 'Загрузите паспорт, договор, счета или акты для клиента.',
                eyebrow: 'пустое состояние',
                tone: 'muted' as const,
                span: 2 as const,
              }],
        },
      ],
    }
  }

  if (currentClientPage.value === 'projects') {
    return {
      entityTitle: 'Проекты клиента',
      entitySubtitle: projects.length ? `${projects.length} связанных проектов` : 'без привязки',
      entityStatus: projects.length ? 'привязан' : 'без проекта',
      entityStatusColor: projects.length ? 'green' : 'muted',
      sections: [
        {
          title: 'Проекты',
          fields: projects.length
            ? projects.map((project: any) => ({
                label: project.title || project.slug,
                value: getClientProjectStatus(project),
                type: 'status' as const,
                description: project.slug || 'slug не задан',
                caption: project.projectType || 'тип не указан',
                eyebrow: 'карточка проекта',
                badge: project.slug || 'project',
                tone: getClientProjectTone(project),
                span: 2 as const,
              }))
            : [{
                label: 'Привязка проекта',
                value: 'Клиент пока не связан с проектом',
                description: 'Через действие «привязать» можно сразу открыть кабинет проекта и документы.',
                eyebrow: 'следующий шаг',
                tone: 'muted' as const,
                span: 2 as const,
              }],
        },
      ],
    }
  }

  if (currentClientPage.value === 'signoff') {
    return {
      entityTitle: 'Подписание и согласование',
      entitySubtitle: primaryProject?.title || 'проект не выбран',
      entityStatus: primaryProject ? 'готово к согласованию' : 'нужен проект',
      entityStatusColor: primaryProject ? 'blue' : 'muted',
      sections: [
        {
          title: 'Сценарий работы',
          fields: [
            {
              label: 'Проект',
              value: primaryProject?.title || 'не привязан',
              description: primaryProject?.slug || 'сначала привяжите клиента к проекту',
              eyebrow: 'контекст',
              tone: primaryProject ? 'success' as const : 'muted' as const,
            },
            {
              label: 'Кабинет клиента',
              value: primaryProject ? 'можно открыть' : 'недоступен',
              description: primaryProject ? 'Клиент сможет согласовывать документы через кабинет проекта.' : 'Пока нет связанного проекта.',
              eyebrow: 'доступ',
              badge: primaryProject ? 'online' : 'offline',
              tone: primaryProject ? 'accent' as const : 'muted' as const,
            },
          ],
        },
      ],
    }
  }

  if (currentClientPage.value === 'profile') {
    return {
      entityTitle: c.name,
      entitySubtitle: c.phone || c.email || undefined,
      entityStatus: `${clientProfileStats.value.filled}/${clientProfileStats.value.total} полей`,
      entityStatusColor: clientProfileStats.value.filled >= 3 ? 'green' : 'amber',
      sections: [
        {
          title: 'Профиль',
          fields: [
            {
              label: 'Телефон',
              value: c.phone ?? 'не указан',
              description: c.phone ? 'Основной быстрый контакт.' : 'Добавьте телефон для быстрой связи.',
              eyebrow: 'контакт',
              tone: c.phone ? 'success' as const : 'muted' as const,
            },
            {
              label: 'Email',
              value: c.email ?? 'не указан',
              description: c.email ? 'Используется для документов и уведомлений.' : 'Email пока не заполнен.',
              eyebrow: 'контакт',
              tone: c.email ? 'success' as const : 'muted' as const,
            },
            {
              label: 'Мессенджер',
              value: c.messengerNick ? `${c.messenger ?? ''} ${c.messengerNick}`.trim() : 'не указан',
              description: c.messengerNick ? 'Канал для быстрых согласований.' : 'Можно добавить Telegram или WhatsApp.',
              eyebrow: 'оперативная связь',
              tone: c.messengerNick ? 'accent' as const : 'muted' as const,
            },
            {
              label: 'Адрес',
              value: c.address ?? 'не указан',
              description: c.address ? 'Основной адрес клиента или объекта.' : 'Адрес еще не сохранен.',
              eyebrow: 'локация',
              tone: c.address ? 'default' as const : 'muted' as const,
              span: 2 as const,
            },
            {
              label: 'Заметки',
              value: c.notes ?? 'без заметок',
              type: 'multiline' as const,
              description: c.notes ? 'Контекст по коммуникации и особенностям клиента.' : 'Внутренних заметок пока нет.',
              eyebrow: 'комментарий команды',
              tone: c.notes ? 'accent' as const : 'muted' as const,
              span: 2 as const,
            },
          ],
        },
      ],
    }
  }

  return {
    entityTitle: c.name,
    entitySubtitle: c.phone || c.email || undefined,
    entityStatus: c.linkedProjects?.length ? 'привязан' : 'без проекта',
    entityStatusColor: c.linkedProjects?.length ? 'green' : 'muted',
    sections: [
      {
        title: 'Обзор',
        fields: [
          {
            label: 'Контакт',
            value: c.phone || c.email || 'не указан',
            description: c.phone && c.email ? 'Телефон и email заполнены.' : 'Есть только один канал связи.',
            eyebrow: 'коммуникация',
            badge: c.messengerNick ? 'messenger' : 'direct',
            tone: c.phone || c.email ? 'success' as const : 'muted' as const,
          },
          {
            label: 'Профиль',
            value: `${clientProfileStats.value.filled}/${clientProfileStats.value.total}`,
            description: 'Заполненность базовой карточки клиента.',
            caption: 'контактные поля',
            eyebrow: 'готовность данных',
            tone: clientProfileStats.value.filled >= 3 ? 'accent' as const : 'muted' as const,
          },
          {
            label: 'Основной проект',
            value: primaryProject?.title || 'не привязан',
            description: primaryProject ? getClientProjectStatus(primaryProject) : 'Нужна привязка к проекту для кабинета и согласований.',
            caption: primaryProject?.slug || 'project required',
            eyebrow: 'статус проекта',
            badge: primaryProject ? 'linked' : 'pending',
            tone: getClientProjectTone(primaryProject),
            span: 2 as const,
          },
          {
            label: 'Заметки',
            value: c.notes ?? 'без заметок',
            type: 'multiline' as const,
            description: c.address ? `Адрес: ${c.address}` : 'Адрес не указан.',
            eyebrow: 'контекст',
            tone: c.notes ? 'default' as const : 'muted' as const,
            span: 2 as const,
          },
        ],
      },
      {
        title: 'Проекты',
        fields: projects.length
          ? projects.slice(0, 8).map((project: any) => ({
              label: project.title || project.slug,
              value: getClientProjectStatus(project),
              type: 'status' as const,
              description: project.slug || 'slug не задан',
              caption: project.projectType || 'тип не указан',
              badge: project.slug || 'project',
              eyebrow: 'связанный проект',
              tone: getClientProjectTone(project),
              span: 2 as const,
            }))
          : [{
              label: 'Проекты',
              value: 'Связей пока нет',
              description: 'Привяжите клиента к проекту, чтобы открыть кабинет и документы.',
              eyebrow: 'пустое состояние',
              tone: 'muted' as const,
              span: 2 as const,
            }],
      },
    ],
  }
})

const projectSlugFilter = computed(() => typeof route.query.projectSlug === 'string' ? route.query.projectSlug : '')
const clientsDirectory = useAdminClientsDirectory(projectSlugFilter)
const { clients, pending, refresh } = clientsDirectory

const adminCatalogs = useAdminCatalogs()
const allProjects = adminCatalogs.getCatalog('projects')
const projectsCatalogLoading = adminCatalogs.isCatalogLoading('projects')
const DOC_CATEGORIES: { value: string; label: string }[] = [{ value: 'passport', label: 'Паспорт' },{ value: 'contract', label: 'Договор' },{ value: 'invoice', label: 'Счёт' },{ value: 'act', label: 'Акт' },{ value: 'other', label: 'Другое' }]

// ── Search & selection ─────────────────────────────────
const selectedClientId = ref<number | null>(null)
const selectedClient = computed(() => clients.value?.find((c: any) => c.id === selectedClientId.value) || null)
const selectedClientSlug = computed(() => selectedClient.value?.linkedProjects?.[0]?.slug || null)
function selectClient(c: any) { selectedClientId.value = c.id; clientPage.value = 'dashboard' }

// Авто-выбор клиента по query ?clientId=
const router = useRouter()
const clientIdFromQuery = computed(() => {
  const v = route.query.clientId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applyClientIdQuery() {
  const qid = clientIdFromQuery.value
  if (qid && clients.value?.length) {
    const found = clients.value.find((c: any) => c.id === qid)
    if (found) { selectedClientId.value = found.id; clientPage.value = 'dashboard' }
    const nextQuery = { ...route.query }
    delete nextQuery.clientId
    router.replace({ query: nextQuery })
  }
}
watch(clients, () => applyClientIdQuery(), { immediate: true })
watch(clientIdFromQuery, () => applyClientIdQuery())

// ── Embedded client cabinet ────────────────────────────
const { data: clientProject } = (useFetch as any)(
  () => selectedClientSlug.value ? `/api/projects/${selectedClientSlug.value}` : null,
  { watch: [selectedClientSlug], default: () => null }
) as { data: Ref<any> }
const PAGE_COMPONENT_MAP: Record<string, Component> = {
  phase_init:      ClientInitiation,
  self_profile:    ClientSelfProfile,
  brief:           ClientSelfProfile,
  client_contacts: ClientContactDetails,
  client_passport: ClientPassport,
  client_brief:    ClientBrief,
  client_tz:       ClientTZ,
  contracts:       ClientContracts,
  work_progress:   ClientWorkProgress,
  design_timeline: ClientTimeline,
  design_album:    ClientDesignAlbum,
}
const allClientPages = getClientPages()
const clientPage = ref('dashboard')
const resolvedClientPageFromNav = computed(() => {
  const spec = adminNav.contentSpec.value
  const nodeId = adminNav.currentNode.value.nodeId

  if (spec.clientSection) return spec.clientSection
  if (spec.documentCategory || nodeId === 'reg_docs_root' || nodeId.startsWith('reg_docs_')) return 'documents'
  if (nodeId.startsWith('reg_projects_')) return 'projects'
  return null
})
const currentClientPage = computed(() => resolvedClientPageFromNav.value || clientPage.value)
const clientNavPages = computed(() => {
  const pages = clientProject.value?.pages || []
  return allClientPages.filter(p => {
    if (!p.phase) return true
    if (p.slug === 'self_profile' && pages.includes('brief')) return true
    return pages.includes(p.slug)
  })
})
const showBrutalistClientHero = computed(() => isBrutalistClientsMode.value && !!selectedClient.value)
const clientHeroFacts = computed(() => [
  { label: 'проект', value: clientProject.value?.title || 'не привязан' },
  { label: 'контакт', value: selectedClient.value?.phone || selectedClient.value?.email || 'не указан' },
  { label: 'разделы', value: selectedClientSlug.value ? String(clientNavPages.value.length + 1) : '0' },
])
watch(selectedClientId, () => { clientPage.value = 'dashboard' })
const clientNormalizedPage = computed(() =>
  currentClientPage.value === 'brief' ? 'self_profile' : currentClientPage.value
)
const clientActiveComponent = computed<Component>(() =>
  PAGE_COMPONENT_MAP[clientNormalizedPage.value] || ClientPageContent
)
const clientActiveProps = computed(() => {
  const base = { slug: selectedClientSlug.value || '' }
  if (clientActiveComponent.value === ClientPageContent) return { ...base, page: clientNormalizedPage.value }
  return base
})

// ── CRUD ───────────────────────────────────────────────
const showModal = ref(false); const editingId = ref<number | null>(null); const saving = ref(false); const saveError = ref('')
const defaultForm = () => ({ name: '', phone: '', email: '', messenger: '', messengerNick: '', address: '', notes: '' })
const form = ref(defaultForm())
function openAdd() { editingId.value = null; form.value = defaultForm(); saveError.value = ''; showModal.value = true }
function openEdit(c: any) { editingId.value = c.id; form.value = { name: c.name ?? '', phone: c.phone ?? '', email: c.email ?? '', messenger: c.messenger ?? '', messengerNick: c.messengerNick ?? '', address: c.address ?? '', notes: c.notes ?? '' }; saveError.value = ''; showModal.value = true }
function closeModal() { showModal.value = false }
async function save() {
  saving.value = true; saveError.value = ''
  try { await clientsDirectory.saveClient(editingId.value, form.value); closeModal() }
  catch (e: any) { saveError.value = e?.data?.statusMessage || 'Ошибка' } finally { saving.value = false }
}
async function del(id: number) { if (!confirm('Удалить клиента?')) return; await clientsDirectory.deleteClient(id); if (selectedClientId.value === id) selectedClientId.value = null }

// ── Link ───────────────────────────────────────────────
const showLink = ref(false); const linkClient = ref<any>(null); const linkProjectSlug = ref(''); const linking = ref(false); const linkError = ref('')
async function openLink(c: any) { linkClient.value = c; linkProjectSlug.value = ''; linkError.value = ''; showLink.value = true; await adminCatalogs.ensureCatalog('projects') }
async function doLink() { if (!linkProjectSlug.value || !linkClient.value) return; linking.value = true; linkError.value = ''; try { await clientsDirectory.linkClientToProject(linkClient.value.id, linkProjectSlug.value); showLink.value = false } catch (e: any) { linkError.value = e?.data?.statusMessage || 'Ошибка' } finally { linking.value = false } }

// ── Docs ───────────────────────────────────────────────
const docsClientId = ref<number | null>(null)
const docsTitle = ref(''); const docsCategory = ref('other'); const docsNotes = ref(''); const docsUploading = ref(false)
const docsSearch = ref(''); const docsFilter = ref(''); const docsSort = ref<'new'|'old'>('new')
const shouldLoadClientDocs = computed(() => currentClientPage.value === 'documents' && !!docsClientId.value)
const { data: clientDocs, pending: docsPending, refresh: refreshClientDocs } = (await (useFetch as any)(
  () => shouldLoadClientDocs.value ? `/api/clients/${docsClientId.value}/documents` : null,
  { default: () => [] as any[] },
)) as { data: Ref<any[]>, pending: Ref<boolean>, refresh: () => Promise<void> }
watch(selectedClientId, (id) => { docsClientId.value = id }, { immediate: true })
watch(() => adminNav.contentSpec.value.documentCategory, (category) => {
  if (!category) return
  docsFilter.value = category === 'all' ? '' : category
}, { immediate: true })
const filteredClientDocs = computed(() => { const rows = clientDocs.value || []; const q = docsSearch.value.trim().toLowerCase(); return rows.filter((d: any) => { if (docsFilter.value && d.category !== docsFilter.value) return false; if (!q) return true; return `${d.title||''} ${d.notes||''} ${d.category||''}`.toLowerCase().includes(q) }).sort((a: any, b: any) => { const at = new Date(a.createdAt||0).getTime(); const bt = new Date(b.createdAt||0).getTime(); return docsSort.value === 'new' ? bt - at : at - bt }) })
function formatDocDate(v: string) { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU') }
async function uploadClientDoc(ev: Event) { const input = ev.target as HTMLInputElement; const files = input.files; if (!files?.length || !docsClientId.value) return; docsUploading.value = true; try { for (const f of Array.from(files)) { const fd = new FormData(); fd.append('file', f); fd.append('title', docsTitle.value || f.name); fd.append('category', docsCategory.value); fd.append('notes', docsNotes.value); await $fetch(`/api/clients/${docsClientId.value}/documents`, { method: 'POST', body: fd }) }; await refreshClientDocs(); docsTitle.value = ''; docsNotes.value = ''; input.value = '' } finally { docsUploading.value = false } }
async function deleteClientDoc(docId: number) { if (!docsClientId.value) return; if (!confirm('Удалить документ?')) return; await $fetch(`/api/clients/${docsClientId.value}/documents/${docId}`, { method: 'DELETE' }); await refreshClientDocs() }
</script>

<style scoped>
.cl-page {
  width: 100%;
}
.cl-wipe-host { position: relative; }

.cl-page--brutalist {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cl-filter-info { margin-bottom: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; font-size: .76rem; color: var(--glass-text); }
.cl-filter-info--brutalist {
  margin-bottom: 0;
  padding: 12px 14px;
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}
.cl-filter-link { text-decoration: none; color: var(--glass-text); opacity: .72; }
.cl-filter-link:hover { opacity: 1; }
.cl-nav-arrow { margin-left: auto; font-size: .7rem; opacity: .4; flex-shrink: 0; }

.cl-cab-body--brutalist {
  gap: 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.cl-cab-sidebar--brutalist {
  border-radius: 0;
  border: 0;
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.cl-cab-main--brutalist {
  min-width: 0;
}

.cl-cab-inner--brutalist {
  padding-top: 22px;
  padding-bottom: 40px;
}

.cl-detail-card--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

/* ── Modals ── */
.cl-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.35); -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.cl-backdrop--brutalist { background: color-mix(in srgb, #000 58%, transparent); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.cl-modal { width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 24px 26px 28px; }
.cl-modal--brutalist { border-radius: 0; box-shadow: none; border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); background: color-mix(in srgb, var(--glass-page-bg) 95%, #000 5%); }
.cl-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.cl-modal-head span { font-size: .72rem; text-transform: uppercase; letter-spacing: 1.2px; color: var(--glass-text); opacity: .5; }
.cl-close { width: 28px; height: 28px; border-radius: 7px; border: none; background: rgba(0,0,0,.08); color: var(--glass-text); cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; }
.cl-close:hover { background: rgba(0,0,0,.16); }
.cl-form { display: flex; flex-direction: column; gap: 14px; }
.cl-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cl-field { display: flex; flex-direction: column; gap: 5px; }
.cl-field label { font-size: .7rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .45; }
/* Input styles unified → glass-input */
.cl-error { font-size: .78rem; color: var(--ds-error, #dc2626); margin: 0; padding: 7px 12px; background: color-mix(in srgb, var(--ds-error, #dc2626) 8%, transparent); border-radius: 6px; }
.cl-link-preview { padding: 12px 14px; border-radius: 10px; font-size: .8rem; }
.cl-link-preview-title { font-size: .68rem; text-transform: uppercase; letter-spacing: .5px; opacity: .45; margin: 0 0 8px; }
.cl-link-list { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; color: var(--glass-text); opacity: .7; }
.cl-link-list b { opacity: 1; font-weight: 500; }
.cl-modal-foot { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.cl-docs-list { display: flex; flex-direction: column; gap: 8px; }
.cl-doc-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid var(--glass-border); border-radius: 8px; }
.cl-doc-title { font-size: .84rem; font-weight: 500; }
.cl-doc-meta { font-size: .72rem; opacity: .5; }
.cl-doc-actions { display: flex; align-items: center; gap: 8px; }

@media (max-width: 600px) {
  .cl-row { grid-template-columns: 1fr; }
}
</style>
