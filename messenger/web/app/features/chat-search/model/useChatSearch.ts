import type { Ref } from 'vue'
import type { MessengerConversationMessage } from '~/entities/conversations/model/useMessengerConversations'

export interface ChatSearchController {
  open: Ref<boolean>
  query: Ref<string>
  matches: Ref<readonly string[]>
  currentIndex: Ref<number>
  currentMessageId: Ref<string | null>
  matchCount: Ref<number>
  positionLabel: Ref<string>
  openSearch: () => void
  close: () => void
  next: () => void
  prev: () => void
}

export function useChatSearch(messages: Ref<readonly MessengerConversationMessage[]>): ChatSearchController {
  const open = ref(false)
  const query = ref('')
  const currentIndex = ref(0)

  const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase())

  const matches = computed<readonly string[]>(() => {
    const q = normalizedQuery.value
    if (!q) return []
    const result: string[] = []
    for (const message of messages.value) {
      if (!message.body) continue
      if (message.body.toLocaleLowerCase().includes(q)) {
        result.push(message.id)
      }
    }
    return result
  })

  watch(matches, (next) => {
    if (currentIndex.value >= next.length) {
      currentIndex.value = 0
    }
  })

  watch(() => messages.value, () => {
    if (currentIndex.value >= matches.value.length) {
      currentIndex.value = 0
    }
  })

  const currentMessageId = computed<string | null>(() => matches.value[currentIndex.value] ?? null)
  const matchCount = computed(() => matches.value.length)
  const positionLabel = computed(() => {
    if (!normalizedQuery.value) return ''
    if (!matches.value.length) return 'нет совпадений'
    return `${currentIndex.value + 1} / ${matches.value.length}`
  })

  function openSearch() {
    open.value = true
  }

  function close() {
    open.value = false
    query.value = ''
    currentIndex.value = 0
  }

  function next() {
    if (!matches.value.length) return
    currentIndex.value = (currentIndex.value + 1) % matches.value.length
  }

  function prev() {
    if (!matches.value.length) return
    currentIndex.value = (currentIndex.value - 1 + matches.value.length) % matches.value.length
  }

  return {
    open,
    query,
    matches,
    currentIndex,
    currentMessageId,
    matchCount,
    positionLabel,
    openSearch,
    close,
    next,
    prev,
  }
}
