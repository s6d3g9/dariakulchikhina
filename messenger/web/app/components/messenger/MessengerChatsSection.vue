<script setup lang="ts">
const conversations = useMessengerConversations()
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
  actionError.value = ''

  try {
    await conversations.selectConversation(conversationId)
  } catch {
    actionError.value = 'Не удалось открыть чат.'
  }
}

async function removeChat(conversationId: string) {
  actionError.value = ''

  try {
    await conversations.deleteConversation(conversationId)
  } catch {
    actionError.value = 'Не удалось удалить чат.'
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
</script>

<template>
  <section class="section-block section-block--search-screen section-block--chats-screen" aria-label="Chats section">
    <header class="search-dock search-dock--screen-header search-dock--chats-header">
      <div class="search-dock__field search-dock__field--header">
        <input
          v-model="searchDraft"
          type="text"
          class="inline-input search-dock__input search-dock__input--header"
          placeholder="Поиск по чатам"
          @focus="openSearch"
          @blur="closeSearch"
          @keydown.enter.prevent="runSearch"
        >
        <div v-if="searchOpen && chatSuggestions.length" class="search-dropdown" aria-label="Результаты поиска по чатам">
          <button
            v-for="chat in chatSuggestions"
            :key="chat.id"
            type="button"
            class="search-dropdown__item"
            @click="selectSuggestion(chat.id)"
          >
            <span class="search-dropdown__title">{{ chat.peerDisplayName }}</span>
            <span class="search-dropdown__meta">{{ chat.lastMessage?.body || 'Сообщений пока нет' }}</span>
          </button>
        </div>
      </div>
    </header>

    <p v-if="actionError" class="auth-error">{{ actionError }}</p>

    <div class="list-stack list-stack--screen-scroll">
      <article
        v-for="chat in conversations.conversations.value"
        :key="chat.id"
        class="list-card list-card--action list-card--clickable list-card--chat-row"
        @click="openChat(chat.id)"
      >
        <div class="list-card__main">
          <div class="list-card__row">
            <p class="list-card__title">{{ chat.peerDisplayName }}</p>
            <p class="list-card__meta">{{ new Date(chat.updatedAt).toLocaleDateString('ru-RU') }}</p>
          </div>
          <p class="list-card__text">{{ chat.lastMessage?.body || 'Сообщений пока нет' }}</p>
        </div>
        <button
          type="button"
          class="action-btn action-btn--danger"
          @click.stop="removeChat(chat.id)"
        >
          Удалить
        </button>
      </article>

      <article v-if="!conversations.conversations.value.length" class="list-card list-card--panel">
        <div class="list-card__main">
          <p class="list-card__title">Чаты пока пусты</p>
          <p class="list-card__text">Когда появятся direct-чаты, они будут показаны здесь.</p>
        </div>
      </article>
    </div>
  </section>
</template>