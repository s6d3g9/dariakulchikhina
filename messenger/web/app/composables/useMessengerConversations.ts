interface MessengerConversationItem {
  id: string
  peerUserId: string
  peerDisplayName: string
  peerLogin: string
  updatedAt: string
  lastMessage: {
    id: string
    body: string
    createdAt: string
    own: boolean
  } | null
}

import { buildMessengerUrl } from '../utils/messenger-url'

interface MessengerConversationMessage {
  id: string
  body: string
  kind: 'text' | 'file'
  createdAt: string
  editedAt?: string
  deletedAt?: string
  own: boolean
  senderDisplayName: string
  attachment?: {
    name: string
    mimeType: string
    size: number
    url: string
    absoluteUrl: string
  }
}

function attachAbsoluteUrl<T extends { attachment?: { name: string; mimeType: string; size: number; url: string } }>(
  config: ReturnType<typeof useRuntimeConfig>,
  item: T,
) {
  if (!item.attachment) {
    return item as T & { attachment?: T['attachment'] & { absoluteUrl: string } }
  }

  return {
    ...item,
    attachment: {
      ...item.attachment,
      absoluteUrl: buildMessengerUrl(config.public.messengerCoreBaseUrl, item.attachment.url),
    },
  }
}

export function useMessengerConversations() {
  const auth = useMessengerAuth()
  const config = useRuntimeConfig()
  const state = useMessengerConversationState()
  const conversations = useState<MessengerConversationItem[]>('messenger-conversations-list', () => [])
  const messages = useState<MessengerConversationMessage[]>('messenger-conversation-messages', () => [])
  const query = useState<string>('messenger-conversations-query', () => '')
  const pending = useState<boolean>('messenger-conversations-pending', () => false)
  const messagePending = useState<boolean>('messenger-conversation-message-pending', () => false)
  const editingMessageId = useState<string | null>('messenger-conversation-editing-message-id', () => null)

  const activeConversation = computed(() => conversations.value.find(item => item.id === state.activeConversationId.value) ?? null)

  async function refresh(nextQuery = query.value) {
    pending.value = true
    query.value = nextQuery

    try {
      const response = await auth.request<{ conversations: MessengerConversationItem[] }>('/conversations', {
        method: 'GET',
        query: nextQuery ? { query: nextQuery } : undefined,
      })

      conversations.value = response.conversations
      const nextActiveConversationId = conversations.value.some(item => item.id === state.activeConversationId.value)
        ? state.activeConversationId.value
        : conversations.value[0]?.id || null
      const activeConversationChanged = state.activeConversationId.value !== nextActiveConversationId

      state.activeConversationId.value = nextActiveConversationId

      if (!nextActiveConversationId) {
        messages.value = []
        return
      }

      if (activeConversationChanged) {
        await loadMessages(nextActiveConversationId)
      }
    } finally {
      pending.value = false
    }
  }

  async function openDirectConversation(peerUserId: string) {
    const response = await auth.request<{ conversation: { id: string } }>('/conversations/direct', {
      method: 'POST',
      body: { peerUserId },
    })

    await refresh(query.value)
    state.openConversation(response.conversation.id)
    await loadMessages(response.conversation.id)
  }

  async function loadMessages(conversationId = state.activeConversationId.value) {
    if (!conversationId) {
      messages.value = []
      return
    }

    const response = await auth.request<{ messages: MessengerConversationMessage[] }>(`/conversations/${conversationId}/messages`, {
      method: 'GET',
    })
    messages.value = response.messages.map(message => attachAbsoluteUrl(config, message))
  }

  async function selectConversation(conversationId: string) {
    state.openConversation(conversationId)
    await loadMessages(conversationId)
  }

  async function sendMessage(body: string) {
    const conversationId = state.activeConversationId.value
    if (!conversationId) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    messagePending.value = true
    try {
      await auth.request(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { body },
      })
      await Promise.all([
        refresh(query.value),
        loadMessages(conversationId),
      ])
    } finally {
      messagePending.value = false
    }
  }

  async function deleteConversation(conversationId: string) {
    pending.value = true

    try {
      await auth.request(`/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      if (state.activeConversationId.value === conversationId) {
        state.activeConversationId.value = null
        messages.value = []
      }

      await refresh(query.value)
    } finally {
      pending.value = false
    }
  }

  async function uploadAttachment(file: File) {
    const conversationId = state.activeConversationId.value
    if (!conversationId) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    const formData = new FormData()
    formData.set('file', file)

    messagePending.value = true
    try {
      await auth.request(`/conversations/${conversationId}/attachments`, {
        method: 'POST',
        body: formData,
      })
      await Promise.all([
        refresh(query.value),
        loadMessages(conversationId),
      ])
    } finally {
      messagePending.value = false
    }
  }

  async function editMessage(messageId: string, body: string) {
    const conversationId = state.activeConversationId.value
    if (!conversationId) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    editingMessageId.value = messageId
    try {
      await auth.request(`/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PATCH',
        body: { body },
      })
      await Promise.all([
        refresh(query.value),
        loadMessages(conversationId),
      ])
    } finally {
      editingMessageId.value = null
    }
  }

  async function deleteMessage(messageId: string) {
    const conversationId = state.activeConversationId.value
    if (!conversationId) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    editingMessageId.value = messageId
    try {
      await auth.request(`/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE',
      })
      await Promise.all([
        refresh(query.value),
        loadMessages(conversationId),
      ])
    } finally {
      editingMessageId.value = null
    }
  }

  return {
    conversations,
    messages,
    query,
    pending,
    messagePending,
    editingMessageId,
    activeConversation: readonly(activeConversation),
    activeConversationId: state.activeConversationId,
    refresh,
    openDirectConversation,
    selectConversation,
    loadMessages,
    sendMessage,
    deleteConversation,
    uploadAttachment,
    editMessage,
    deleteMessage,
  }
}