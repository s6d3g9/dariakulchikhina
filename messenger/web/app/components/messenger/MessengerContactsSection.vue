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
</script>

<template>
  <section class="section-block section-block--search-screen section-block--contacts-screen" aria-label="Contacts section">
    <VAlert v-if="actionError" type="error">{{ actionError }}</VAlert>
    <VAlert v-else-if="actionToast" type="success">{{ actionToast }}</VAlert>

    <VList class="list-stack list-stack--screen-scroll contacts-list contacts-list--vuetify" bg-color="transparent" lines="two">
      <VCard
        v-for="invite in incomingInvites"
        :key="invite.id"
        class="list-card list-card--action list-card--chat-row list-card--vuetify"
        color="surface"
        variant="tonal"
      >
        <VCardText class="list-card__body list-card__body--vuetify">
          <div class="chat-row-avatar" aria-hidden="true">
            <VAvatar class="chat-avatar chat-avatar--list chat-avatar--vuetify" color="warning" variant="tonal" size="44">
              {{ resolveContactAvatar(invite.displayName) }}
            </VAvatar>
          </div>
          <div class="list-card__main">
            <div class="list-card__row">
              <p class="list-card__title list-card__title--vuetify">{{ invite.displayName }}</p>
              <div class="list-card__row list-card__row--actions">
                <VBtn type="button" color="success" variant="flat" @click="acceptInvite(invite.id, invite.peerUserId)">Принять</VBtn>
                <VBtn type="button" color="error" variant="tonal" @click="rejectInvite(invite.id)">Отклонить</VBtn>
              </div>
            </div>
            <p class="list-card__text list-card__text--identity">@{{ invite.login }} · входящая заявка</p>
          </div>
        </VCardText>
      </VCard>

      <VCard
        v-for="invite in outgoingInvites"
        :key="invite.id"
        class="list-card list-card--panel list-card--chat-row list-card--vuetify"
        color="surface"
        variant="tonal"
      >
        <VCardText class="list-card__body list-card__body--vuetify">
          <div class="chat-row-avatar" aria-hidden="true">
            <VAvatar class="chat-avatar chat-avatar--list chat-avatar--vuetify" color="secondary" variant="tonal" size="44">
              {{ resolveContactAvatar(invite.displayName) }}
            </VAvatar>
          </div>
          <div class="list-card__main">
            <div class="list-card__row">
              <p class="list-card__title list-card__title--vuetify">{{ invite.displayName }}</p>
              <VChip class="list-card__meta" size="x-small" variant="tonal">Ожидает</VChip>
            </div>
            <p class="list-card__text list-card__text--identity">@{{ invite.login }} · исходящая заявка</p>
          </div>
        </VCardText>
      </VCard>

      <VCard
        v-for="contact in contacts.overview.value.contacts"
        :key="contact.id"
        class="list-card list-card--action list-card--clickable list-card--chat-row list-card--vuetify"
        :class="{
          'list-card--hold-open': holdActions.activeItemId.value === contact.id,
          'list-card--holding': holdActions.holdingItemId.value === contact.id,
        }"
        color="surface"
        variant="tonal"
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
        <VCardText class="list-card__body list-card__body--vuetify">
          <div class="chat-row-avatar" aria-hidden="true">
            <VAvatar class="chat-avatar chat-avatar--list chat-avatar--vuetify" color="primary" variant="tonal" size="44">
              {{ resolveContactAvatar(contact.displayName) }}
            </VAvatar>
          </div>
          <div class="list-card__main">
            <p class="list-card__title list-card__title--vuetify">{{ contact.displayName }}</p>
            <p class="list-card__text list-card__text--identity">@{{ contact.login }}</p>
          </div>
        </VCardText>
        <div v-if="holdActions.activeItemId.value === contact.id" class="hold-actions" data-hold-actions-menu="true" @pointerdown.stop>
          <button
            type="button"
            class="hold-actions__icon-btn"
            aria-label="Аудиозвонок"
            title="Аудиозвонок"
            @click.stop="startContactCall(contact.id, 'audio')"
          >
            <MessengerIcon name="phone" :size="16" />
          </button>
          <button
            type="button"
            class="hold-actions__icon-btn"
            aria-label="Видеозвонок"
            title="Видеозвонок"
            @click.stop="startContactCall(contact.id, 'video')"
          >
            <MessengerIcon name="video" :size="16" />
          </button>
          <button
            type="button"
            class="hold-actions__icon-btn"
            aria-label="Скопировать карточку контакта"
            title="Скопировать карточку контакта"
            @click.stop="copyContactCard(contact)"
          >
            <MessengerIcon name="copy" :size="16" />
          </button>
          <button
            type="button"
            class="hold-actions__icon-btn"
            aria-label="Переслать контакт"
            title="Переслать контакт"
            @click.stop="forwardContactCard(contact)"
          >
            <MessengerIcon name="forward" :size="16" />
          </button>
          <button
            type="button"
            class="hold-actions__icon-btn hold-actions__icon-btn--danger"
            aria-label="Удалить контакт"
            title="Удалить контакт"
            @click.stop="removeContact(contact.id)"
          >
            <MessengerIcon name="delete" :size="16" />
          </button>
        </div>
      </VCard>

      <VCard v-if="!hasSearchQuery && !incomingInvites.length && !outgoingInvites.length && !contacts.overview.value.contacts.length" class="list-card list-card--panel list-card--vuetify" color="surface" variant="tonal">
        <VCardText class="list-card__body list-card__body--vuetify list-card__body--empty">
          <div class="list-card__main">
            <p class="list-card__title">Контакты пока пусты</p>
            <p class="list-card__text">Когда появятся подтвержденные контакты, они будут показаны здесь.</p>
          </div>
        </VCardText>
      </VCard>

      <VCard
        v-for="candidate in discoverResults"
        :key="candidate.id"
        class="list-card list-card--action list-card--chat-row list-card--vuetify"
        color="surface"
        variant="tonal"
      >
        <VCardText class="list-card__body list-card__body--vuetify">
          <div class="chat-row-avatar" aria-hidden="true">
            <VAvatar class="chat-avatar chat-avatar--list chat-avatar--vuetify" color="info" variant="tonal" size="44">
              {{ resolveContactAvatar(candidate.displayName) }}
            </VAvatar>
          </div>
          <div class="list-card__main">
            <div class="list-card__row">
              <p class="list-card__title list-card__title--vuetify">{{ candidate.displayName }}</p>
              <VBtn
                type="button"
                :color="candidate.relationship === 'incoming' ? 'success' : 'primary'"
                :variant="candidate.relationship === 'incoming' ? 'flat' : 'tonal'"
                :disabled="candidate.relationship === 'outgoing'"
                @click="handleSearchAction(candidate.id, candidate.relationship)"
              >
                {{ getActionLabel(candidate.relationship) }}
              </VBtn>
            </div>
            <p class="list-card__text list-card__text--identity">@{{ candidate.login }} · {{ getRelationshipLabel(candidate.relationship) }}</p>
          </div>
        </VCardText>
      </VCard>

      <VCard v-if="hasSearchQuery && !contacts.overview.value.contacts.length && !discoverResults.length" class="list-card list-card--panel list-card--vuetify" color="surface" variant="tonal">
        <VCardText class="list-card__body list-card__body--vuetify list-card__body--empty">
          <div class="list-card__main">
            <p class="list-card__title">Поиск не дал результатов</p>
            <p class="list-card__text">Проверьте логин или имя пользователя и попробуйте ещё раз.</p>
          </div>
        </VCardText>
      </VCard>
    </VList>

    <VCard class="search-dock search-dock--bottom-dock search-dock--contacts-search search-dock--vuetify" color="surface" variant="tonal">
      <VCardText class="search-dock__body">
        <div class="search-dock__field search-dock__field--vuetify">
          <VTextField
            v-model="searchDraft"
            class="search-dock__input search-dock__input--vuetify"
            label="Поиск пользователей"
            placeholder="Имя или логин"
            prepend-inner-icon="mdi-account-search"
            autocomplete="off"
            hide-details
            @focus="openSearch"
            @blur="closeSearch"
            @keydown.enter.prevent="runSearch"
          />
          <Transition name="chrome-reveal">
            <VCard v-if="searchOpen" class="search-dropdown search-dropdown--vuetify" color="surface" variant="elevated" aria-label="Результаты поиска пользователей">
              <VList bg-color="transparent" density="comfortable">
                <VListItem
                  v-for="item in contactSuggestions"
                  :key="item.id"
                  class="search-dropdown__item search-dropdown__item--vuetify"
                  @pointerdown.prevent="selectSuggestionPointer(item)"
                >
                  <template #title>
                    <span class="search-dropdown__title">{{ item.title }}</span>
                  </template>
                  <template #subtitle>
                    <span class="search-dropdown__meta">{{ item.meta }}</span>
                  </template>
                </VListItem>
                <VListItem v-if="!contactSuggestions.length && hasSearchQuery" class="search-dropdown__item search-dropdown__item--vuetify" disabled>
                  <template #title>
                    <span class="search-dropdown__title">Ничего не найдено</span>
                  </template>
                  <template #subtitle>
                    <span class="search-dropdown__meta">Попробуйте логин или имя пользователя.</span>
                  </template>
                </VListItem>
              </VList>
            </VCard>
          </Transition>
        </div>
      </VCardText>
    </VCard>
  </section>
</template>