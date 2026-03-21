<script setup lang="ts">
const contacts = useMessengerContacts()
const conversations = useMessengerConversations()
const holdActions = useMessengerHoldActions()
const searchDraft = ref('')
const actionError = ref('')
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

async function openSecretChat(targetUserId: string) {
  actionError.value = ''

  try {
    holdActions.dismiss()
    await conversations.openSecretConversation(targetUserId)
  } catch {
    actionError.value = 'Не удалось открыть secret-чат.'
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
</script>

<template>
  <section class="section-block section-block--search-screen section-block--contacts-screen" aria-label="Contacts section">
    <header class="search-dock search-dock--screen-header search-dock--contacts-header">
      <div class="search-dock__field search-dock__field--header">
        <input
          v-model="searchDraft"
          type="text"
          class="inline-input search-dock__input search-dock__input--header"
          placeholder="Поиск пользователей"
          @focus="openSearch"
          @blur="closeSearch"
          @keydown.enter.prevent="runSearch"
        >
        <div v-if="searchOpen" class="search-dropdown" aria-label="Результаты поиска пользователей">
          <button
            v-for="item in contactSuggestions"
            :key="item.id"
            type="button"
            class="search-dropdown__item"
            @pointerdown.prevent="selectSuggestionPointer(item)"
          >
            <span class="search-dropdown__title">{{ item.title }}</span>
            <span class="search-dropdown__meta">{{ item.meta }}</span>
          </button>
          <button
            v-if="!contactSuggestions.length && hasSearchQuery"
            type="button"
            class="search-dropdown__item"
            disabled
          >
            <span class="search-dropdown__title">Ничего не найдено</span>
            <span class="search-dropdown__meta">Попробуйте логин или имя пользователя.</span>
          </button>
        </div>
      </div>
    </header>

    <p v-if="actionError" class="auth-error">{{ actionError }}</p>

    <div class="list-stack list-stack--screen-scroll">
      <article
        v-for="invite in incomingInvites"
        :key="invite.id"
        class="list-card list-card--action list-card--chat-row"
      >
        <div class="list-card__main">
          <div class="list-card__row">
            <p class="list-card__title">{{ invite.displayName }}</p>
            <div class="list-card__row">
              <button
                type="button"
                class="action-btn action-btn--accept"
                @click="acceptInvite(invite.id, invite.peerUserId)"
              >
                Принять
              </button>
              <button
                type="button"
                class="action-btn action-btn--danger"
                @click="rejectInvite(invite.id)"
              >
                Отклонить
              </button>
            </div>
          </div>
          <p class="list-card__text list-card__text--identity">@{{ invite.login }} · входящая заявка</p>
        </div>
      </article>

      <article
        v-for="invite in outgoingInvites"
        :key="invite.id"
        class="list-card list-card--panel list-card--chat-row"
      >
        <div class="list-card__main">
          <div class="list-card__row">
            <p class="list-card__title">{{ invite.displayName }}</p>
            <span class="list-card__meta">Ожидает</span>
          </div>
          <p class="list-card__text list-card__text--identity">@{{ invite.login }} · исходящая заявка</p>
        </div>
      </article>

      <article
        v-for="contact in contacts.overview.value.contacts"
        :key="contact.id"
        class="list-card list-card--action list-card--clickable list-card--chat-row"
        :class="{ 'list-card--hold-open': holdActions.activeItemId.value === contact.id }"
        data-hold-actions-root="true"
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
        <div class="list-card__main">
          <p class="list-card__title">{{ contact.displayName }}</p>
          <p class="list-card__text list-card__text--identity">@{{ contact.login }}</p>
        </div>
        <div v-if="holdActions.activeItemId.value === contact.id" class="hold-actions" data-hold-actions-menu="true" @pointerdown.stop>
          <button
            type="button"
            class="action-btn"
            @click.stop="openDirectChat(contact.id)"
          >
            Чат
          </button>
          <button
            type="button"
            class="action-btn action-btn--accept"
            @click.stop="openSecretChat(contact.id)"
          >
            Secret chat
          </button>
          <button
            type="button"
            class="action-btn action-btn--danger"
            @click.stop="removeContact(contact.id)"
          >
            Удалить
          </button>
        </div>
      </article>

      <article v-if="!hasSearchQuery && !incomingInvites.length && !outgoingInvites.length && !contacts.overview.value.contacts.length" class="list-card list-card--panel">
        <div class="list-card__main">
          <p class="list-card__title">Контакты пока пусты</p>
          <p class="list-card__text">Когда появятся подтвержденные контакты, они будут показаны здесь.</p>
        </div>
      </article>

      <article
        v-for="candidate in discoverResults"
        :key="candidate.id"
        class="list-card list-card--action list-card--chat-row"
      >
        <div class="list-card__main">
          <div class="list-card__row">
            <p class="list-card__title">{{ candidate.displayName }}</p>
            <button
              type="button"
              class="action-btn"
              :class="{ 'action-btn--accept': candidate.relationship === 'incoming' }"
              :disabled="candidate.relationship === 'outgoing'"
              @click="handleSearchAction(candidate.id, candidate.relationship)"
            >
              {{ getActionLabel(candidate.relationship) }}
            </button>
          </div>
          <p class="list-card__text list-card__text--identity">@{{ candidate.login }} · {{ getRelationshipLabel(candidate.relationship) }}</p>
        </div>
      </article>

      <article v-if="hasSearchQuery && !contacts.overview.value.contacts.length && !discoverResults.length" class="list-card list-card--panel">
        <div class="list-card__main">
          <p class="list-card__title">Поиск не дал результатов</p>
          <p class="list-card__text">Проверьте логин или имя пользователя и попробуйте ещё раз.</p>
        </div>
      </article>
    </div>
  </section>
</template>