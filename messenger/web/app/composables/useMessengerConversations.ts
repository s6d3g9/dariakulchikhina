interface MessengerConversationPolicy {
  secret: boolean
  allowMutualDelete: boolean
  encryptedMessages: boolean
  encryptedAttachments: boolean
  encryptedVoice: boolean
  callsSecurityMode: 'webrtc-only' | 'beta-e2ee'
  allowForwardOut: boolean
  hideListPreview: boolean
}

export interface MessengerConversationItem {
  id: string
  kind: 'direct' | 'direct-secret'
  secret: boolean
  peerUserId: string
  peerDisplayName: string
  peerLogin: string
  updatedAt: string
  policy: MessengerConversationPolicy
  lastMessage: {
    id: string
    body: string
    encryptedBody?: MessengerEncryptedPayload
    createdAt: string
    own: boolean
  } | null
}

import { buildMessengerUrl } from '../utils/messenger-url'
import type { MessengerEncryptedPayload } from './useMessengerCrypto'

interface MessengerMessageRelationPreview {
  id: string
  body: string
  encryptedBody?: MessengerEncryptedPayload
  kind: 'text' | 'file'
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

interface MessengerForwardedMessagePreview {
  messageId: string
  conversationId: string
  senderUserId: string
  body: string
  encryptedBody?: MessengerEncryptedPayload
  kind: 'text' | 'file'
  senderDisplayName: string
  attachment?: {
    name: string
    mimeType: string
    size: number
    url: string
    absoluteUrl: string
  }
}

export interface MessengerConversationMessage {
  id: string
  body: string
  encryptedBody?: MessengerEncryptedPayload
  kind: 'text' | 'file'
  createdAt: string
  readAt?: string
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
  replyTo?: MessengerMessageRelationPreview
  commentOn?: MessengerMessageRelationPreview
  forwardedFrom?: MessengerForwardedMessagePreview
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

function attachRelationPreview(
  config: ReturnType<typeof useRuntimeConfig>,
  preview?: MessengerMessageRelationPreview,
) {
  if (!preview) {
    return undefined
  }

  return attachAbsoluteUrl(config, preview)
}

function attachForwardedPreview(
  config: ReturnType<typeof useRuntimeConfig>,
  preview?: MessengerForwardedMessagePreview,
) {
  if (!preview) {
    return undefined
  }

  return attachAbsoluteUrl(config, preview)
}

function attachMessageRelations(
  config: ReturnType<typeof useRuntimeConfig>,
  message: MessengerConversationMessage,
) {
  return {
    ...attachAbsoluteUrl(config, message),
    replyTo: attachRelationPreview(config, message.replyTo),
    commentOn: attachRelationPreview(config, message.commentOn),
    forwardedFrom: attachForwardedPreview(config, message.forwardedFrom),
  }
}

interface MessengerMessageSendOptions {
  replyToMessageId?: string
  commentOnMessageId?: string
}

export function useMessengerConversations() {
  const auth = useMessengerAuth()
  const messengerCrypto = useMessengerCrypto()
  const config = useRuntimeConfig()
  const state = useMessengerConversationState()
  const conversations = useState<MessengerConversationItem[]>('messenger-conversations-list', () => [])
  const messages = useState<MessengerConversationMessage[]>('messenger-conversation-messages', () => [])
  const query = useState<string>('messenger-conversations-query', () => '')
  const pending = useState<boolean>('messenger-conversations-pending', () => false)
  const messagePending = useState<boolean>('messenger-conversation-message-pending', () => false)
  const editingMessageId = useState<string | null>('messenger-conversation-editing-message-id', () => null)

  const activeConversation = computed(() => conversations.value.find(item => item.id === state.activeConversationId.value) ?? null)

  async function decryptMessageBody(conversation: MessengerConversationItem, body: string, encryptedBody?: MessengerEncryptedPayload) {
    if (!encryptedBody || !auth.user.value) {
      return body
    }

    try {
      return await messengerCrypto.decryptText(
        auth.request,
        auth.user.value.id,
        conversation.id,
        conversation.peerUserId,
        encryptedBody,
      )
    } catch {
      return 'Не удалось расшифровать сообщение'
    }
  }

  async function decryptRelationPreview(
    conversation: MessengerConversationItem,
    preview?: MessengerMessageRelationPreview,
  ) {
    if (!preview) {
      return undefined
    }

    return {
      ...attachRelationPreview(config, preview),
      body: await decryptMessageBody(conversation, preview.body, preview.encryptedBody),
    }
  }

  async function decryptForwardedPreview(
    conversation: MessengerConversationItem,
    preview?: MessengerForwardedMessagePreview,
  ) {
    if (!preview) {
      return undefined
    }

    return {
      ...attachForwardedPreview(config, preview),
      body: await decryptMessageBody(conversation, preview.body, preview.encryptedBody),
    }
  }

  async function decryptMessage(conversation: MessengerConversationItem, message: MessengerConversationMessage) {
    const attachedMessage = attachAbsoluteUrl(config, message)
    return {
      ...attachedMessage,
      body: await decryptMessageBody(conversation, message.body, message.encryptedBody),
      replyTo: await decryptRelationPreview(conversation, message.replyTo),
      commentOn: await decryptRelationPreview(conversation, message.commentOn),
      forwardedFrom: await decryptForwardedPreview(conversation, message.forwardedFrom),
    }
  }

  async function decryptConversationList(conversationItems: MessengerConversationItem[]) {
    return await Promise.all(conversationItems.map(async (item) => ({
      ...item,
      lastMessage: item.lastMessage
        ? {
          ...item.lastMessage,
          body: await decryptMessageBody(item, item.lastMessage.body, item.lastMessage.encryptedBody),
        }
        : null,
    })))
  }

  async function refresh(nextQuery = query.value) {
    pending.value = true
    query.value = nextQuery

    try {
      const response = await auth.request<{ conversations: MessengerConversationItem[] }>('/conversations', {
        method: 'GET',
        query: nextQuery ? { query: nextQuery } : undefined,
      })

      conversations.value = await decryptConversationList(response.conversations)
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

  async function openSecretConversation(peerUserId: string) {
    const response = await auth.request<{ conversation: { id: string } }>('/conversations/secret', {
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
    const conversation = conversations.value.find(item => item.id === conversationId)
    if (!conversation) {
      messages.value = response.messages.map(message => attachMessageRelations(config, message))
      return
    }

    messages.value = await Promise.all(response.messages.map(message => decryptMessage(conversation, message)))
  }

  async function selectConversation(conversationId: string) {
    state.openConversation(conversationId)
    await loadMessages(conversationId)
  }

  async function sendMessage(body: string, options: MessengerMessageSendOptions = {}) {
    const conversationId = state.activeConversationId.value
    const conversation = activeConversation.value
    if (!conversationId || !conversation || !auth.user.value) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    messagePending.value = true
    try {
      const encryptedBody = await messengerCrypto.encryptText(
        auth.request,
        auth.user.value.id,
        conversationId,
        conversation.peerUserId,
        body,
      )
      await auth.request(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: {
          body: '',
          encryptedBody,
          ...options,
        },
      })
      await Promise.all([
        refresh(query.value),
        loadMessages(conversationId),
      ])
    } finally {
      messagePending.value = false
    }
  }

  async function forwardMessage(sourceMessageId: string, targetConversationId: string) {
    const targetConversation = conversations.value.find(item => item.id === targetConversationId)
    const sourceMessage = messages.value.find(item => item.id === sourceMessageId)
    if (!targetConversation || !sourceMessage || !auth.user.value) {
      throw new Error('MESSAGE_NOT_FOUND')
    }

    messagePending.value = true
    try {
      const encryptedBody = sourceMessage.kind === 'text'
        ? await messengerCrypto.encryptText(
          auth.request,
          auth.user.value.id,
          targetConversationId,
          targetConversation.peerUserId,
          sourceMessage.body,
        )
        : undefined

      await auth.request(`/conversations/${targetConversationId}/messages`, {
        method: 'POST',
        body: {
          body: sourceMessage.kind === 'text' ? '' : sourceMessage.body,
          encryptedBody,
          forwardedFrom: {
            messageId: sourceMessage.id,
            conversationId: activeConversation.value?.id || targetConversationId,
            senderUserId: sourceMessage.own ? auth.user.value.id : activeConversation.value?.peerUserId || targetConversation.peerUserId,
            senderDisplayName: sourceMessage.senderDisplayName,
            body: sourceMessage.kind === 'text' ? '' : sourceMessage.body,
            encryptedBody,
            kind: sourceMessage.kind,
            attachment: sourceMessage.attachment
              ? {
                name: sourceMessage.attachment.name,
                mimeType: sourceMessage.attachment.mimeType,
                size: sourceMessage.attachment.size,
                url: sourceMessage.attachment.url,
              }
              : undefined,
          },
        },
      })
      await refresh(query.value)

      if (targetConversationId === state.activeConversationId.value) {
        await loadMessages(targetConversationId)
      }
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
    const conversation = activeConversation.value
    if (!conversationId || !conversation || !auth.user.value) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    editingMessageId.value = messageId
    try {
      const encryptedBody = await messengerCrypto.encryptText(
        auth.request,
        auth.user.value.id,
        conversationId,
        conversation.peerUserId,
        body,
      )
      await auth.request(`/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PATCH',
        body: {
          body: '',
          encryptedBody,
        },
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
    openSecretConversation,
    selectConversation,
    loadMessages,
    sendMessage,
    forwardMessage,
    deleteConversation,
    uploadAttachment,
    editMessage,
    deleteMessage,
  }
}