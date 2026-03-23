<script setup lang="ts">
const contacts = useMessengerContacts()
const conversations = useMessengerConversations()
const calls = useMessengerCalls()
const navigation = useMessengerConversationState()
const holdActions = useMessengerHoldActions()
const searchDraft = ref('')
const actionError = ref('')
const actionToast = ref('')
const searchOpen = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

type ContactRelationship = 'none' | 'incoming' | 'outgoing' | 'contact'

interface ContactSearchItem {
  id: string
  title: string
  login: string
  relationship: ContactRelationship
  meta: string
}

function resolveContactAvatar(name: string) {
  const normalized = name.trim()

  if (!normalized) {
    return '??'
  }

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
}

function getRelationshipLabel(relationship: 'none' | 'incoming' | 'outgoing' | 'contact') {
  switch (relationship) {
    case 'contact':
      return 'контакт'
    case 'incoming':
      return 'входящая заявка'
    case 'outgoing':
      return 'заявка отправлена'
    default:
      return 'пользователь'
  }
}

function contactTabIcon(tab: 'all' | 'incoming' | 'outgoing') {
  switch (tab) {
    case 'all':
      return 'mdi-account-multiple-outline'
    case 'incoming':
      return 'mdi-account-arrow-down-outline'
    default:
      return 'mdi-account-arrow-up-outline'
  }
}

const normalizedSearchQuery = computed(() => searchDraft.value.trim().toLowerCase())

const inviteByPeerUserId = computed(() => {
  const inviteMap = new Map<string, { id: string, direction: 'incoming' | 'outgoing', status: 'pending' | 'accepted' | 'rejected' }>()

  for (const invite of contacts.overview.value.invites) {
    inviteMap.set(invite.peerUserId, {
      id: invite.id,
      direction: invite.direction,
      status: invite.status,
    })
  }

  return inviteMap
})

function getActionLabel(relationship: ContactRelationship) {
  switch (relationship) {
    case 'contact':
      return 'Открыть чат'
    case 'incoming':
      return 'Принять'
    case 'outgoing':
      return 'Отправлено'
    default:
      return 'Добавить'
  }
}

const contactSuggestions = computed(() => {
  const suggestions = new Map<string, ContactSearchItem>()

  for (const contact of contacts.overview.value.contacts) {
    suggestions.set(contact.id, {
      id: contact.id,
      title: contact.displayName,
      login: contact.login,
      relationship: 'contact',
      meta: `@${contact.login} · контакт`,
    })
  }

  if (normalizedSearchQuery.value) {
    for (const candidate of contacts.overview.value.discover) {
      if (suggestions.has(candidate.id)) {
        continue
      }

      suggestions.set(candidate.id, {
        id: candidate.id,
        title: candidate.displayName,
        login: candidate.login,
        relationship: candidate.relationship,
        meta: `@${candidate.login} · ${getRelationshipLabel(candidate.relationship)}`,
      })
    }
  }

  return Array.from(suggestions.values()).slice(0, normalizedSearchQuery.value ? 10 : 8)
})

const incomingInvites = computed(() => contacts.overview.value.invites.filter(invite => invite.direction === 'incoming' && invite.status === 'pending'))

const outgoingInvites = computed(() => contacts.overview.value.invites.filter(invite => invite.direction === 'outgoing' && invite.status === 'pending'))

const discoverResults = computed(() => {
  if (!hasSearchQuery.value) {
    return []
  }

  const contactIds = new Set(contacts.overview.value.contacts.map(contact => contact.id))
  return contacts.overview.value.discover.filter(candidate => !contactIds.has(candidate.id))
})

const hasSearchQuery = computed(() => Boolean(normalizedSearchQuery.value))

onMounted(async () => {
  await contacts.refresh()
  searchDraft.value = contacts.query.value
})

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
})

watch(searchDraft, (value) => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(async () => {
    try {
      await contacts.refresh(value.trim())
      searchOpen.value = true
    } catch {
      actionError.value = 'Не удалось обновить список пользователей.'
    }
  }, 180)
})

async function runSearch() {
  actionError.value = ''

  try {
    await contacts.refresh(searchDraft.value)
    searchOpen.value = true
  } catch {
    actionError.value = 'Не удалось обновить список пользователей.'
  }
}

async function openDirectChat(targetUserId: string) {
  if (holdActions.consumeSuppressedClick()) {
    return
  }

  actionError.value = ''

  try {
    holdActions.dismiss()
    await conversations.openDirectConversation(targetUserId)
  } catch {
    actionError.value = 'Не удалось открыть direct-чат.'
  }
}

async function removeContact(peerUserId: string) {
  actionError.value = ''

  try {
    holdActions.dismiss()
    await contacts.removeContact(peerUserId)
  } catch {
    actionError.value = 'Не удалось удалить контакт.'
  }
}

function buildContactCard(contact: { displayName: string; login: string }) {
  return [
    'Контакт',
    `Имя: ${contact.displayName}`,
    `Никнейм: @${contact.login}`,
    'Телефон: не указан',
  ].join('\n')
}

function showActionToast(message: string) {
  actionToast.value = message
  setTimeout(() => {
    if (actionToast.value === message) {
      actionToast.value = ''
    }
  }, 2200)
}

async function startContactCall(contactId: string, mode: 'audio' | 'video') {
  actionError.value = ''

  try {
    holdActions.dismiss()
    await conversations.openDirectConversation(contactId)
    navigation.openSection('chat')
    await calls.startOutgoingCall(mode)
  } catch {
    actionError.value = mode === 'video'
      ? 'Не удалось начать видеозвонок.'
      : 'Не удалось начать аудиозвонок.'
  }
}

async function copyContactCard(contact: { displayName: string; login: string }) {
  actionError.value = ''

  try {
    await navigator.clipboard.writeText(buildContactCard(contact))
    holdActions.dismiss()
    showActionToast(`Карточка контакта скопирована: ${contact.displayName}`)
  } catch {
    actionError.value = 'Не удалось скопировать карточку контакта.'
  }
}

async function forwardContactCard(contact: { id: string; displayName: string; login: string }) {
  actionError.value = ''
  const targetConversationId = conversations.activeConversation.value?.id

  if (!targetConversationId) {
    actionError.value = 'Сначала откройте чат, куда переслать контакт.'
    return
  }

  try {
    holdActions.dismiss()
    await conversations.selectConversation(targetConversationId)
    await conversations.sendMessage(buildContactCard(contact))
    navigation.openSection('chat')
    showActionToast(`Контакт переслан: ${contact.displayName}`)
  } catch {
    actionError.value = 'Не удалось переслать контакт.'
  }
}

async function acceptInvite(inviteId: string, peerUserId: string) {
  actionError.value = ''

  try {
    await contacts.accept(inviteId)
    await openDirectChat(peerUserId)
  } catch {
    actionError.value = 'Не удалось принять заявку.'
  }
}

async function rejectInvite(inviteId: string) {
  actionError.value = ''

  try {
    await contacts.reject(inviteId)
  } catch {
    actionError.value = 'Не удалось отклонить заявку.'
  }
}

async function handleSearchAction(targetUserId: string, relationship: ContactRelationship) {
  actionError.value = ''

  try {
    if (relationship === 'contact') {
      await openDirectChat(targetUserId)
      return
    }

    if (relationship === 'incoming') {
      const invite = inviteByPeerUserId.value.get(targetUserId)
      if (!invite || invite.direction !== 'incoming' || invite.status !== 'pending') {
        throw new Error('INVITE_NOT_FOUND')
      }

      await contacts.accept(invite.id)
      await openDirectChat(targetUserId)
      return
    }

    if (relationship === 'outgoing') {
      actionError.value = 'Заявка уже отправлена этому пользователю.'
      return
    }

    await contacts.invite(targetUserId)
  } catch {
    if (!actionError.value) {
      actionError.value = relationship === 'contact'
        ? 'Не удалось открыть direct-чат.'
        : 'Не удалось обработать заявку в контакты.'
    }
  }
}

async function selectSuggestion(item: ContactSearchItem) {
  searchOpen.value = false
  await handleSearchAction(item.id, item.relationship)
}

async function selectSuggestionPointer(item: ContactSearchItem) {
  await selectSuggestion(item)
}

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  setTimeout(() => {
    searchOpen.value = false
  }, 120)
}

function startHold(contactId: string, event?: Event) {
  holdActions.startHold(contactId, event?.target)
}

const contactsTab = ref<'all' | 'incoming' | 'outgoing'>('all')
const showAddContactDialog = ref(false)
const addContactLogin = ref('')
const addContactError = ref('')

async function submitAddContact() {
  addContactError.value = ''
  try {
    const found = contacts.overview.value.discover.find(
      c => c.login.toLowerCase() === addContactLogin.value.trim().toLowerCase()
    )
    if (!found) {
      addContactError.value = 'Пользователь не найден. Введите точный логин.'
      return
    }
    await contacts.invite(found.id)
    showAddContactDialog.value = false
    addContactLogin.value = ''
  } catch {
    addContactError.value = 'Не удалось отправить заявку.'
  }
}
</script>

<template>
  <section class="section-block section-block--contacts" aria-label="Contacts section">
    <VAlert v-if="actionError" type="error" class="ma-2">{{ actionError }}</VAlert>
    <VAlert v-else-if="actionToast" type="success" class="ma-2">{{ actionToast }}</VAlert>

    <!-- Tab Windows (content first, tabs at bottom) -->
    <VWindow v-model="contactsTab" class="section-list">
      <!-- All contacts -->
      <VWindowItem value="all">
    <VList bg-color="transparent" lines="two">
      <VListItem
        v-for="contact in contacts.overview.value.contacts"
        :key="contact.id"
        class="chat-row"
        :class="{ 'list-item--hold-open': holdActions.activeItemId.value === contact.id }"
        data-hold-actions-root="true"
        lines="two"
        @click="openDirectChat(contact.id)"
        @mousedown.left="startHold(contact.id, $event)"
        @mouseup="holdActions.cancelHold()"
        @mouseleave="holdActions.cancelHold()"
        @touchstart.passive="startHold(contact.id, $event)"
        @touchend="holdActions.cancelHold()"
        @touchcancel="holdActions.cancelHold()"
        @touchmove="holdActions.cancelHold()"
        @contextmenu.prevent="holdActions.open(contact.id)"
      >
        <template #prepend>
          <VAvatar color="primary" variant="tonal" size="48">
            {{ resolveContactAvatar(contact.displayName) }}
          </VAvatar>
        </template>
        <template #title>
          <div class="chat-row__titlebar">
            <div class="chat-row__titlemain">
              <span class="title-small">{{ contact.displayName }}</span>
            </div>

            <div
              v-if="holdActions.activeItemId.value === contact.id"
              class="hold-actions hold-actions--inline"
              data-hold-actions-menu="true"
              @pointerdown.stop
            >
              <button
                type="button"
                class="hold-actions__icon-btn"
                aria-label="Аудиозвонок"
                title="Аудиозвонок"
                @click.stop="startContactCall(contact.id, 'audio')"
              >
                <MessengerIcon class="hold-actions__icon" name="phone" :size="16" />
              </button>
              <button
                type="button"
                class="hold-actions__icon-btn"
                aria-label="Видеозвонок"
                title="Видеозвонок"
                @click.stop="startContactCall(contact.id, 'video')"
              >
                <MessengerIcon class="hold-actions__icon" name="video" :size="16" />
              </button>
              <button
                type="button"
                class="hold-actions__icon-btn"
                aria-label="Скопировать карточку контакта"
                title="Скопировать карточку контакта"
                @click.stop="copyContactCard(contact)"
              >
                <MessengerIcon class="hold-actions__icon" name="copy" :size="16" />
              </button>
              <button
                type="button"
                class="hold-actions__icon-btn"
                aria-label="Переслать контакт"
                title="Переслать контакт"
                @click.stop="forwardContactCard(contact)"
              >
                <MessengerIcon class="hold-actions__icon" name="forward" :size="16" />
              </button>
              <button
                type="button"
                class="hold-actions__icon-btn hold-actions__icon-btn--danger"
                aria-label="Удалить контакт"
                @click.stop="removeContact(contact.id)"
              >
                <MessengerIcon class="hold-actions__icon hold-actions__icon--danger" name="delete" :size="18" />
              </button>
            </div>
          </div>
        </template>
        <template #subtitle><span class="on-surface-variant">@{{ contact.login }}</span></template>
      </VListItem>

      <div
        v-if="!contacts.overview.value.contacts.length && !discoverResults.length"
        class="empty-state"
      >
        <VIcon size="48" color="on-surface-variant">mdi-account-multiple-outline</VIcon>
        <p class="empty-state__title">Контакты пока пусты</p>
        <p class="empty-state__text">Нажмите ➕ чтобы добавить первый контакт.</p>
      </div>

      <!-- Discover results (search) -->
      <VListItem
        v-for="candidate in discoverResults"
        :key="candidate.id"
        class="chat-row"
        lines="two"
      >
        <template #prepend>
          <VAvatar color="secondary" variant="tonal" size="48">
            {{ resolveContactAvatar(candidate.displayName) }}
          </VAvatar>
        </template>
        <template #title><span class="title-small">{{ candidate.displayName }}</span></template>
        <template #subtitle><span class="on-surface-variant">@{{ candidate.login }} · {{ getRelationshipLabel(candidate.relationship) }}</span></template>
        <template #append>
          <VBtn
            size="small"
            :color="candidate.relationship === 'incoming' ? 'success' : 'primary'"
            :variant="candidate.relationship === 'incoming' ? 'flat' : 'tonal'"
            :disabled="candidate.relationship === 'outgoing'"
            @click.stop="handleSearchAction(candidate.id, candidate.relationship)"
          >{{ getActionLabel(candidate.relationship) }}</VBtn>
        </template>
      </VListItem>
    </VList>
      </VWindowItem>

      <!-- Incoming invites -->
      <VWindowItem value="incoming">
        <VList bg-color="transparent" lines="two">
          <VListItem
            v-for="invite in incomingInvites"
            :key="invite.id"
            class="chat-row"
            lines="two"
          >
            <template #prepend>
              <VAvatar color="warning" variant="tonal" size="48">
                {{ resolveContactAvatar(invite.displayName) }}
              </VAvatar>
            </template>
            <template #title><span class="title-small">{{ invite.displayName }}</span></template>
            <template #subtitle><span class="on-surface-variant">@{{ invite.login }} · входящая заявка</span></template>
            <template #append>
              <div class="d-flex gap-1">
                <VBtn size="small" color="success" variant="flat" @click.stop="acceptInvite(invite.id, invite.peerUserId)">Принять</VBtn>
                <VBtn size="small" color="error" variant="tonal" @click.stop="rejectInvite(invite.id)">Отклонить</VBtn>
              </div>
            </template>
          </VListItem>
          <div v-if="!incomingInvites.length" class="empty-state">
            <VIcon size="48" color="on-surface-variant">mdi-inbox-outline</VIcon>
            <p class="empty-state__title">Входящих заявок нет</p>
          </div>
        </VList>
      </VWindowItem>

      <!-- Outgoing invites -->
      <VWindowItem value="outgoing">
        <VList bg-color="transparent" lines="two">
          <VListItem
            v-for="invite in outgoingInvites"
            :key="invite.id"
            class="chat-row"
            lines="two"
          >
            <template #prepend>
              <VAvatar color="secondary" variant="tonal" size="48">
                {{ resolveContactAvatar(invite.displayName) }}
              </VAvatar>
            </template>
            <template #title><span class="title-small">{{ invite.displayName }}</span></template>
            <template #subtitle><span class="on-surface-variant">@{{ invite.login }} · исходящая заявка</span></template>
            <template #append>
              <VBtn size="small" color="error" variant="tonal" @click.stop="rejectInvite(invite.id)">Отменить</VBtn>
            </template>
          </VListItem>
          <div v-if="!outgoingInvites.length" class="empty-state">
            <VIcon size="48" color="on-surface-variant">mdi-send-clock-outline</VIcon>
            <p class="empty-state__title">Исходящих заявок нет</p>
          </div>
        </VList>
      </VWindowItem>
    </VWindow>

    <!-- Tabs (bottom, above search dock) -->
    <div class="section-tabs-row">
      <VTabs v-model="contactsTab" class="section-tabs" bg-color="surface-container" color="primary" density="compact" grow>
        <VTab value="all" aria-label="Все контакты" title="Все контакты"><VIcon>{{ contactTabIcon('all') }}</VIcon></VTab>
        <VTab value="incoming">
          <VIcon>{{ contactTabIcon('incoming') }}</VIcon>
          <VBadge v-if="incomingInvites.length" :content="incomingInvites.length" color="error" inline class="ml-1" />
        </VTab>
        <VTab value="outgoing" aria-label="Исходящие" title="Исходящие"><VIcon>{{ contactTabIcon('outgoing') }}</VIcon></VTab>
      </VTabs>
      <VBtn icon variant="text" size="small" aria-label="Добавить контакт" @click="showAddContactDialog = true">
        <VIcon>mdi-account-plus-outline</VIcon>
      </VBtn>
    </div>

    <!-- Search Dock -->
    <div class="search-dock">
      <div class="search-dock__field">
        <MessengerDockField>
          <input
            v-model="searchDraft"
            type="text"
            class="composer-input composer-input--dock"
            placeholder=""
            autocomplete="off"
            @focus="openSearch"
            @blur="closeSearch"
            @keydown.enter.prevent="runSearch"
          />
        </MessengerDockField>
        <Transition name="chrome-reveal">
          <div v-if="searchOpen && contactSuggestions.length" class="search-dropdown" @mousedown.prevent>
            <VList bg-color="transparent" density="comfortable">
              <VListItem
                v-for="item in contactSuggestions"
                :key="item.id"
                @pointerdown.prevent="selectSuggestionPointer(item)"
              >
                <template #title>{{ item.title }}</template>
                <template #subtitle>{{ item.meta }}</template>
              </VListItem>
              <VListItem v-if="!contactSuggestions.length && hasSearchQuery" disabled>
                <template #title>Ничего не найдено</template>
                <template #subtitle>Попробуйте логин или имя пользователя.</template>
              </VListItem>
            </VList>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Диалог: добавить контакт -->
    <VDialog v-model="showAddContactDialog" max-width="320">
      <VCard>
        <VCardTitle>Добавить контакт</VCardTitle>
        <VCardText>
          <VTextField
            v-model="addContactLogin"
            label="Логин пользователя"
            placeholder="@username"
            prepend-inner-icon="mdi-at"
            autofocus
            hide-details
            @keydown.enter="submitAddContact"
          />
          <VAlert v-if="addContactError" type="error" class="mt-2">{{ addContactError }}</VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showAddContactDialog = false; addContactLogin = ''; addContactError = ''">Отмена</VBtn>
          <VBtn color="primary" variant="tonal" :disabled="!addContactLogin.trim()" @click="submitAddContact">Найти</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>