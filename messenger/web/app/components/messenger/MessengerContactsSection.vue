<script setup lang="ts">
const contacts = useMessengerContacts()
const conversations = useMessengerConversations()
const searchDraft = ref('')
const actionError = ref('')
const searchOpen = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const contactSuggestions = computed(() => contacts.overview.value.contacts.slice(0, 8).map(contact => ({
  id: contact.id,
  title: contact.displayName,
  meta: `@${contact.login}`,
})))

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
  } catch {
    actionError.value = 'Не удалось обновить список пользователей.'
  }
}

async function openDirectChat(targetUserId: string) {
  actionError.value = ''

  try {
    await conversations.openDirectConversation(targetUserId)
  } catch {
    actionError.value = 'Не удалось открыть direct-чат.'
  }
}

async function removeContact(peerUserId: string) {
  actionError.value = ''

  try {
    await contacts.removeContact(peerUserId)
  } catch {
    actionError.value = 'Не удалось удалить контакт.'
  }
}

async function selectSuggestion(item: { id: string }) {
  searchOpen.value = false
  await openDirectChat(item.id)
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
  <section class="section-block section-block--search-screen section-block--contacts-screen" aria-label="Contacts section">
    <header class="search-dock search-dock--screen-header search-dock--contacts-header">
      <div class="search-dock__field">
        <input
          v-model="searchDraft"
          type="text"
          class="inline-input search-dock__input"
          placeholder="Поиск пользователей"
          @focus="openSearch"
          @blur="closeSearch"
          @keydown.enter.prevent="runSearch"
        >
        <div v-if="searchOpen && contactSuggestions.length" class="search-dropdown" aria-label="Результаты поиска по контактам">
          <button
            v-for="item in contactSuggestions"
            :key="item.id"
            type="button"
            class="search-dropdown__item"
            @click="selectSuggestion(item)"
          >
            <span class="search-dropdown__title">{{ item.title }}</span>
            <span class="search-dropdown__meta">{{ item.meta }}</span>
          </button>
        </div>
      </div>
    </header>

    <p v-if="actionError" class="auth-error">{{ actionError }}</p>

    <div class="list-stack">
      <article
        v-for="contact in contacts.overview.value.contacts"
        :key="contact.id"
        class="list-card list-card--action list-card--clickable list-card--chat-row"
        @click="openDirectChat(contact.id)"
      >
        <div class="list-card__main">
          <p class="list-card__title">{{ contact.displayName }}</p>
          <p class="list-card__text">@{{ contact.login }}</p>
        </div>
        <button
          type="button"
          class="action-btn action-btn--danger"
          @click.stop="removeContact(contact.id)"
        >
          Удалить
        </button>
      </article>

      <article v-if="!contacts.overview.value.contacts.length" class="list-card list-card--panel">
        <div class="list-card__main">
          <p class="list-card__title">Контакты пока пусты</p>
          <p class="list-card__text">Когда появятся подтвержденные контакты, они будут показаны здесь.</p>
        </div>
      </article>
    </div>
  </section>
</template>