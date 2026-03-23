<script setup lang="ts">
import type { MessengerConversationItem } from '../../composables/useMessengerConversations'

const conversations = useMessengerConversations()
const calls = useMessengerCalls()
const navigation = useMessengerConversationState()
const holdActions = useMessengerHoldActions()
const contacts = useMessengerContacts()
const searchDraft = ref('')
const actionError = ref('')
const searchOpen = ref(false)

// ── Папки чатов ─────────────────────────────────────────────────────────────
type ChatFolder = { key: string; label: string; chatIds: string[] }
const FOLDERS_LS_KEY = 'messenger-chat-folders'

function loadFolders(): ChatFolder[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(FOLDERS_LS_KEY)
    return raw ? (JSON.parse(raw) as ChatFolder[]) : []
  } catch {
    return []
  }
}

const userFolders = ref<ChatFolder[]>(loadFolders())
const activeFolderKey = ref<string>('all')
const folderDraftName = ref('')
const showCreateFolder = ref(false)
const folderContextKey = ref<string | null>(null)

function saveFolders() {
  if (!import.meta.client) return
  localStorage.setItem(FOLDERS_LS_KEY, JSON.stringify(userFolders.value))
}

function createFolder() {
  const name = folderDraftName.value.trim()
  if (!name) return
  const key = `folder-${Date.now()}`
  userFolders.value.push({ key, label: name, chatIds: [] })
  saveFolders()
  folderDraftName.value = ''
  showCreateFolder.value = false
}

function confirmDeleteFolder() {
  if (!folderContextKey.value) return
  userFolders.value = userFolders.value.filter(f => f.key !== folderContextKey.value)
  if (activeFolderKey.value === folderContextKey.value) activeFolderKey.value = 'all'
  saveFolders()
  folderContextKey.value = null
}

const filteredConversations = computed(() => {
  if (activeFolderKey.value === 'all') return conversations.conversations.value
  const folder = userFolders.value.find(f => f.key === activeFolderKey.value)
  if (!folder) return conversations.conversations.value
  return conversations.conversations.value.filter(c => folder.chatIds.includes(c.id))
})

// ── Новый чат (FAB) ──────────────────────────────────────────────────────────
const showNewChatDialog = ref(false)
const newChatError = ref('')

watch(showNewChatDialog, async (isOpen) => {
  if (isOpen) {
    await contacts.refresh()
  }
})

async function openOrCreateChat(userId: string) {
  newChatError.value = ''
  try {
    await conversations.openDirectConversation(userId)
    navigation.openSection('chat')
    showNewChatDialog.value = false
  } catch {
    newChatError.value = 'Не удалось открыть диалог.'
  }
}

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
  <section class="section-block section-block--chats" aria-label="Chats section">
    <VAlert v-if="actionError" type="error" class="ma-2">{{ actionError }}</VAlert>

    <!-- Список чатов + FAB -->
    <div class="chats-list-wrap">
      <VList class="section-list" bg-color="transparent" lines="two">
        <VListItem
          v-for="chat in filteredConversations"
          :key="chat.id"
          class="chat-row"
          data-hold-actions-root="true"
          :class="{
            'list-item--hold-open': holdActions.activeItemId.value === chat.id,
          }"
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
          <template #prepend>
            <VAvatar color="primary" variant="tonal" size="48">
              {{ resolveChatAvatar(chat.peerDisplayName) }}
            </VAvatar>
          </template>
          <template #title>
            <span class="title-small">{{ chat.peerDisplayName }}</span>
            <VChip v-if="chat.secret" size="x-small" color="warning" variant="tonal" class="ml-2">Secret</VChip>
          </template>
          <template #subtitle>
            <span class="chat-row__preview on-surface-variant">{{ formatChatPreview(chat) }}</span>
          </template>
          <template #append>
            <span class="chat-row__time on-surface-variant">{{ formatConversationTimestamp(chat.updatedAt) }}</span>
          </template>
        </VListItem>

        <!-- Hold actions strip -->
        <div
          v-if="holdActions.activeItemId.value"
          class="hold-actions"
          data-hold-actions-menu="true"
          @pointerdown.stop
        >
          <button
            type="button"
            class="hold-actions__icon-btn"
            aria-label="Аудиозвонок"
            @click.stop="startChatCall(holdActions.activeItemId.value, 'audio')"
          >
            <MessengerIcon name="phone" :size="18" />
          </button>
          <button
            type="button"
            class="hold-actions__icon-btn"
            aria-label="Видеозвонок"
            @click.stop="startChatCall(holdActions.activeItemId.value, 'video')"
          >
            <MessengerIcon name="video" :size="18" />
          </button>
          <button
            type="button"
            class="hold-actions__icon-btn hold-actions__icon-btn--danger"
            aria-label="Удалить чат"
            @click.stop="removeChat(holdActions.activeItemId.value)"
          >
            <MessengerIcon name="delete" :size="18" />
          </button>
        </div>

        <div v-if="!filteredConversations.length" class="empty-state">
          <VIcon size="48" color="on-surface-variant">mdi-message-text-outline</VIcon>
          <p class="empty-state__title">Чаты пока пусты</p>
          <p class="empty-state__text">Нажмите ✏️ чтобы начать диалог.</p>
        </div>
      </VList>

      <!-- FAB -->
      <button
        type="button"
        class="chats-fab"
        aria-label="Создать чат"
        @click="showNewChatDialog = true"
      >
        <VIcon color="on-primary-container">mdi-pencil-outline</VIcon>
      </button>
    </div>

    <!-- Папки чатов -->
    <div class="chats-folders-bar" role="tablist" aria-label="Папки чатов">
      <button
        type="button"
        class="chats-folder-chip"
        :class="{ 'chats-folder-chip--active': activeFolderKey === 'all' }"
        role="tab"
        :aria-selected="activeFolderKey === 'all'"
        @click="activeFolderKey = 'all'"
      >Все</button>
      <button
        v-for="folder in userFolders"
        :key="folder.key"
        type="button"
        class="chats-folder-chip"
        :class="{ 'chats-folder-chip--active': activeFolderKey === folder.key }"
        role="tab"
        :aria-selected="activeFolderKey === folder.key"
        @click="activeFolderKey = folder.key"
        @contextmenu.prevent="folderContextKey = folder.key"
      >{{ folder.label }}</button>
      <button
        type="button"
        class="chats-folder-chip"
        aria-label="Создать папку"
        @click="showCreateFolder = true"
      >＋</button>
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
          <div v-if="searchOpen && chatSuggestions.length" class="search-dropdown" @mousedown.prevent>
            <VList bg-color="transparent" density="comfortable">
              <VListItem
                v-for="chat in chatSuggestions"
                :key="chat.id"
                @click="selectSuggestion(chat.id)"
              >
                <template #prepend>
                  <VAvatar color="primary" variant="tonal" size="36">
                    {{ resolveChatAvatar(chat.peerDisplayName) }}
                  </VAvatar>
                </template>
                <template #title>{{ chat.peerDisplayName }}</template>
                <template #subtitle>{{ chat.lastMessage?.body || 'Сообщений пока нет' }}</template>
              </VListItem>
            </VList>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Диалог: удаление папки -->
    <VDialog :model-value="folderContextKey !== null" max-width="280" @update:model-value="folderContextKey = null">
      <VCard>
        <VCardTitle>Удалить папку?</VCardTitle>
        <VCardText>Папка будет удалена. Чаты останутся.</VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="folderContextKey = null">Отмена</VBtn>
          <VBtn color="error" variant="tonal" @click="confirmDeleteFolder()">Удалить</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Диалог: создание папки -->
    <VDialog v-model="showCreateFolder" max-width="320">
      <VCard>
        <VCardTitle>Новая папка</VCardTitle>
        <VCardText>
          <VTextField
            v-model="folderDraftName"
            label="Название папки"
            placeholder="Работа, Семья…"
            autofocus
            hide-details
            @keydown.enter="createFolder()"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showCreateFolder = false">Отмена</VBtn>
          <VBtn color="primary" variant="tonal" :disabled="!folderDraftName.trim()" @click="createFolder()">Создать</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Диалог: новый чат (FAB) -->
    <VDialog v-model="showNewChatDialog" max-width="360">
      <VCard>
        <VCardTitle>Новый чат</VCardTitle>
        <VCardText class="pa-0">
          <VList v-if="contacts.overview.value.contacts.length" bg-color="transparent" density="comfortable">
            <VListItem
              v-for="contact in contacts.overview.value.contacts"
              :key="contact.id"
              :subtitle="`@${contact.login}`"
              @click="openOrCreateChat(contact.id)"
            >
              <template #title>{{ contact.displayName }}</template>
              <template #prepend>
                <VAvatar color="primary" variant="tonal" size="36">
                  {{ resolveChatAvatar(contact.displayName) }}
                </VAvatar>
              </template>
            </VListItem>
          </VList>
          <div v-else class="pa-4">
            <p class="on-surface-variant body-medium">Нет контактов для начала диалога.</p>
          </div>
          <VAlert v-if="newChatError" type="error" class="ma-4">{{ newChatError }}</VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showNewChatDialog = false">Закрыть</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>