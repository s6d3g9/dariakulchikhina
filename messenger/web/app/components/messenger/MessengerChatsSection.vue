<script setup lang="ts">
import type { MessengerConversationItem } from '../../composables/useMessengerConversations'

const conversations = useMessengerConversations()
const calls = useMessengerCalls()
const navigation = useMessengerConversationState()
const holdActions = useMessengerHoldActions()
const searchDraft = ref('')
const actionError = ref('')
const searchOpen = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const chatSuggestions = computed(() => conversations.conversations.value.slice(0, 8))

onMounted(async () => {
  await conversations.refresh()
  searchDraft.value = conversations.query.value
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
      await conversations.refresh(value.trim())
      searchOpen.value = true
    } catch {
      actionError.value = 'Не удалось обновить список чатов.'
    }
  }, 180)
})

async function runSearch() {
  actionError.value = ''

  try {
    await conversations.refresh(searchDraft.value)
  } catch {
    actionError.value = 'Не удалось обновить список чатов.'
  }
}

async function openChat(conversationId: string) {
  if (holdActions.consumeSuppressedClick()) {
    return
  }

  actionError.value = ''

  try {
    holdActions.dismiss()
    await conversations.selectConversation(conversationId)
  } catch {
    actionError.value = 'Не удалось открыть чат.'
  }
}

async function removeChat(conversationId: string) {
  actionError.value = ''

  try {
    holdActions.dismiss()
    await conversations.deleteConversation(conversationId)
  } catch {
    actionError.value = 'Не удалось удалить чат.'
  }
}

async function startChatCall(conversationId: string, mode: 'audio' | 'video') {
  actionError.value = ''

  try {
    holdActions.dismiss()
    await conversations.selectConversation(conversationId)
    navigation.openSection('chat')
    await calls.startOutgoingCall(mode)
  } catch {
    actionError.value = mode === 'video'
      ? 'Не удалось начать видеозвонок.'
      : 'Не удалось начать аудиозвонок.'
  }
}

async function selectSuggestion(conversationId: string) {
  searchOpen.value = false
  await openChat(conversationId)
}

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  setTimeout(() => {
    searchOpen.value = false
  }, 120)
}

function startHold(conversationId: string, event?: Event) {
  holdActions.startHold(conversationId, event?.target)
}

function formatConversationTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
}

function resolveChatAvatar(name: string) {
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

function formatChatPreview(chat: MessengerConversationItem) {
  if (!chat.lastMessage) {
    return 'Сообщений пока нет'
  }

  if (chat.policy.hideListPreview) {
    return 'Новые сообщения'
  }

  const body = chat.lastMessage.body.trim()
  if (!body) {
    return chat.lastMessage.own ? 'Вы: сообщение' : 'Сообщение'
  }

  return chat.lastMessage.own ? `Вы: ${body}` : body
}
</script>

<template>
  <section class="section-block section-block--search-screen section-block--chats-screen" aria-label="Chats section">
    <VCard class="search-dock search-dock--screen-header search-dock--chats-header search-dock--vuetify" color="surface" variant="tonal">
      <VCardText class="search-dock__body">
        <div class="search-dock__field search-dock__field--header search-dock__field--vuetify">
          <VTextField
            v-model="searchDraft"
            class="search-dock__input search-dock__input--header search-dock__input--vuetify"
            label="Поиск по чатам"
            placeholder="Имя контакта или сообщение"
            prepend-inner-icon="mdi-magnify"
            autocomplete="off"
            hide-details
            @focus="openSearch"
            @blur="closeSearch"
            @keydown.enter.prevent="runSearch"
          />
          <Transition name="chrome-reveal">
            <VCard v-if="searchOpen && chatSuggestions.length" class="search-dropdown search-dropdown--vuetify" color="surface" variant="elevated" aria-label="Результаты поиска по чатам">
              <VList bg-color="transparent" density="comfortable">
                <VListItem
                  v-for="chat in chatSuggestions"
                  :key="chat.id"
                  class="search-dropdown__item search-dropdown__item--vuetify"
                  @click="selectSuggestion(chat.id)"
                >
                  <template #title>
                    <span class="search-dropdown__title search-dropdown__title--vuetify">
                      {{ chat.peerDisplayName }}
                      <VChip v-if="chat.secret" size="x-small" color="warning" variant="tonal">Secret</VChip>
                    </span>
                  </template>
                  <template #subtitle>
                    <span class="search-dropdown__meta">{{ chat.lastMessage?.body || 'Сообщений пока нет' }}</span>
                  </template>
                </VListItem>
              </VList>
            </VCard>
          </Transition>
        </div>
      </VCardText>
    </VCard>

    <VAlert v-if="actionError" type="error">{{ actionError }}</VAlert>

    <VList class="list-stack list-stack--screen-scroll chats-list chats-list--vuetify" bg-color="transparent" lines="two">
      <VCard
        v-for="chat in conversations.conversations.value"
        :key="chat.id"
        class="list-card list-card--action list-card--clickable list-card--chat-row list-card--vuetify"
        :class="{
          'list-card--hold-open': holdActions.activeItemId.value === chat.id,
          'list-card--holding': holdActions.holdingItemId.value === chat.id,
        }"
        color="surface"
        variant="tonal"
        data-hold-actions-root="true"
        @click="openChat(chat.id)"
        @mousedown.left="startHold(chat.id, $event)"
        @mouseup="holdActions.cancelHold()"
        @mouseleave="holdActions.cancelHold()"
        @touchstart.passive="startHold(chat.id, $event)"
        @touchend="holdActions.cancelHold()"
        @touchcancel="holdActions.cancelHold()"
        @touchmove="holdActions.cancelHold()"
        @contextmenu.prevent="holdActions.open(chat.id)"
      >
        <VCardText class="list-card__body list-card__body--vuetify">
          <div class="chat-row-avatar" aria-hidden="true">
            <VAvatar class="chat-avatar chat-avatar--list chat-avatar--vuetify" color="primary" variant="tonal" size="44">
              {{ resolveChatAvatar(chat.peerDisplayName) }}
            </VAvatar>
          </div>
          <div class="list-card__main">
            <div class="list-card__row list-card__row--chat-top">
              <p class="list-card__title list-card__title--vuetify">
                {{ chat.peerDisplayName }}
                <VChip v-if="chat.secret" size="x-small" color="warning" variant="tonal">Secret</VChip>
              </p>
              <VChip class="list-card__meta list-card__meta--timestamp" size="x-small" variant="text">
                {{ formatConversationTimestamp(chat.updatedAt) }}
              </VChip>
            </div>
            <div class="list-card__row list-card__row--chat-footer">
              <p class="list-card__text list-card__text--preview">{{ formatChatPreview(chat) }}</p>
            </div>
          </div>
        </VCardText>
        <div v-if="holdActions.activeItemId.value === chat.id" class="hold-actions" data-hold-actions-menu="true" @pointerdown.stop>
          <button
            type="button"
            class="hold-actions__icon-btn"
            aria-label="Аудиозвонок"
            title="Аудиозвонок"
            @click.stop="startChatCall(chat.id, 'audio')"
          >
            <MessengerIcon name="phone" :size="16" />
          </button>
          <button
            type="button"
            class="hold-actions__icon-btn"
            aria-label="Видеозвонок"
            title="Видеозвонок"
            @click.stop="startChatCall(chat.id, 'video')"
          >
            <MessengerIcon name="video" :size="16" />
          </button>
          <button
            type="button"
            class="hold-actions__icon-btn hold-actions__icon-btn--danger"
            aria-label="Удалить чат"
            title="Удалить чат"
            @click.stop="removeChat(chat.id)"
          >
            <MessengerIcon name="delete" :size="16" />
          </button>
        </div>
      </VCard>

      <VCard v-if="!conversations.conversations.value.length" class="list-card list-card--panel list-card--vuetify" color="surface" variant="tonal">
        <VCardText class="list-card__body list-card__body--vuetify list-card__body--empty">
          <div class="list-card__main">
            <p class="list-card__title">Чаты пока пусты</p>
            <p class="list-card__text">Когда появятся direct-чаты, они будут показаны здесь.</p>
          </div>
        </VCardText>
      </VCard>
    </VList>
  </section>
</template>