interface MessengerConversationPolicy {
  secret: boolean
  allowMutualDelete: boolean
  encryptedMessages: boolean
  encryptedAttachments: boolean
  encryptedVoice: boolean
  callsSecurityMode: 'webrtc-only' | 'beta-e2ee'
  allowForwardOut: boolean
  hideListPreview: boolean
  model?: string
}

export interface MessengerConversationItem {
  id: string
  kind: 'direct' | 'direct-secret' | 'agent'
  secret: boolean
  peerUserId: string
  peerDisplayName: string
  peerLogin: string
  peerType: 'user' | 'agent'
  peerDescription?: string
  peerAgentKind?: string
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

import { resolveAttachmentUrl } from '../../../core/api/conversations'
import type { MessengerEncryptedBinaryPayload, MessengerEncryptedPayload } from '../../messages/model/useMessengerCrypto'

export interface MessengerAttachmentKlipyPayload {
  id: string
  slug: string
  kind: 'gif' | 'sticker'
  title: string
  previewUrl: string
  originalUrl: string
  mimeType: string
  width?: number
  height?: number
}

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
    resolvedUrl: string
    encryptedFile?: MessengerEncryptedBinaryPayload
    klipy?: MessengerAttachmentKlipyPayload
  }
}

export interface MessengerMessageReactionSummary {
  emoji: string
  count: number
  own: boolean
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
    resolvedUrl: string
    encryptedFile?: MessengerEncryptedBinaryPayload
    klipy?: MessengerAttachmentKlipyPayload
  }
}

export interface MessengerSystemAgentLaunchedPayload {
  // Slug of the spawned CLI session — links the bubble to the live monitor row.
  slug: string
  model: string
  projectId: string
  // Original assistant message that the operator launched from. Used by the
  // renderer to scroll back to context if the operator clicks the bubble.
  sourceMessageId?: string
}

export interface MessengerConversationMessage {
  id: string
  body: string
  encryptedBody?: MessengerEncryptedPayload
  // 'system.agent_launched' is emitted by messenger/core right after a
  // successful quick-launch queue write. It replaces the old transient
  // snackbar with a persistent in-thread receipt.
  kind: 'text' | 'file' | 'system.agent_launched'
  createdAt: string
  readAt?: string
  editedAt?: string
  deletedAt?: string
  own: boolean
  senderDisplayName: string
  reactions?: MessengerMessageReactionSummary[]
  attachment?: {
    name: string
    mimeType: string
    size: number
    url: string
    absoluteUrl: string
    resolvedUrl: string
    encryptedFile?: MessengerEncryptedBinaryPayload
    klipy?: MessengerAttachmentKlipyPayload
  }
  attachments?: Array<{
    name: string
    mimeType: string
    size: number
    url: string
    absoluteUrl: string
    resolvedUrl: string
    encryptedFile?: MessengerEncryptedBinaryPayload
    klipy?: MessengerAttachmentKlipyPayload
  }>
  replyTo?: MessengerMessageRelationPreview
  commentOn?: MessengerMessageRelationPreview
  forwardedFrom?: MessengerForwardedMessagePreview
  runId?: string
  // Top of the agent run subtree this message belongs to. Sub-agent runs
  // spawned from one user prompt all share a rootRunId, so the chat section
  // can fold sequential agent messages from the same logical task into a
  // single bubble. Falls back to time-gap heuristic when missing.
  rootRunId?: string
  agentId?: string
  // Populated only for `kind === 'system.agent_launched'`. Carries the
  // payload the launch panel submitted so the renderer can show slug/model
  // and offer a deep-link to the monitor row.
  system?: MessengerSystemAgentLaunchedPayload
}

export interface MessengerStagedAttachment {
  name: string
  mimeType: string
  size: number
  url: string
  encryptedFile?: MessengerEncryptedBinaryPayload
  klipy?: MessengerAttachmentKlipyPayload
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
      absoluteUrl: resolveAttachmentUrl(config.public.messengerCoreBaseUrl, item.attachment.url),
      resolvedUrl: resolveAttachmentUrl(config.public.messengerCoreBaseUrl, item.attachment.url),
    },
  }
}

function attachAttachmentsAbsoluteUrls(
  config: ReturnType<typeof useRuntimeConfig>,
  attachments?: MessengerConversationMessage['attachments'] | Array<{ name: string; mimeType: string; size: number; url: string; encryptedFile?: MessengerEncryptedBinaryPayload; klipy?: MessengerAttachmentKlipyPayload }>,
) {
  if (!attachments?.length) {
    return undefined
  }
  return attachments.map(att => ({
    ...att,
    absoluteUrl: resolveAttachmentUrl(config.public.messengerCoreBaseUrl, att.url),
    resolvedUrl: resolveAttachmentUrl(config.public.messengerCoreBaseUrl, att.url),
  })) as NonNullable<MessengerConversationMessage['attachments']>
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
    attachments: attachAttachmentsAbsoluteUrls(config, message.attachments),
    replyTo: attachRelationPreview(config, message.replyTo),
    commentOn: attachRelationPreview(config, message.commentOn),
    forwardedFrom: attachForwardedPreview(config, message.forwardedFrom),
  }
}

interface MessengerMessageSendOptions {
  replyToMessageId?: string
  commentOnMessageId?: string
  attachments?: MessengerStagedAttachment[]
}

function buildNextReactionState(
  reactions: MessengerMessageReactionSummary[] | undefined,
  emoji: string,
) {
  const nextReactions = (reactions || []).map(reaction => ({ ...reaction }))
  const currentReaction = nextReactions.find(reaction => reaction.emoji === emoji)

  if (!currentReaction) {
    nextReactions.push({
      emoji,
      count: 1,
      own: true,
    })
  } else if (currentReaction.own) {
    currentReaction.count = Math.max(0, currentReaction.count - 1)
    currentReaction.own = false
  } else {
    currentReaction.count += 1
    currentReaction.own = true
  }

  const normalized = nextReactions.filter(reaction => reaction.count > 0)
  return normalized.length ? normalized.sort((left, right) => right.count - left.count || left.emoji.localeCompare(right.emoji, 'ru')) : undefined
}

export function useMessengerConversations() {
  const auth = useMessengerAuth()
  const { agentsEnabled } = useMessengerFeatures()
  const messengerCrypto = useMessengerCrypto()
  const config = useRuntimeConfig()
  const state = useMessengerConversationState()
  const conversations = useState<MessengerConversationItem[]>('messenger-conversations-list', () => [])
  const messages = useState<MessengerConversationMessage[]>('messenger-conversation-messages', () => [])
  const query = useState<string>('messenger-conversations-query', () => '')
  const pending = useState<boolean>('messenger-conversations-pending', () => false)
  const messagePending = useState<boolean>('messenger-conversation-message-pending', () => false)
  const editingMessageId = useState<string | null>('messenger-conversation-editing-message-id', () => null)
  const mediaObjectUrls = useState<string[]>('messenger-media-object-urls', () => [])

  const activeConversation = computed(() => conversations.value.find(item => item.id === state.activeConversationId.value) ?? null)

  function getProtectedFallbackBody(conversation: MessengerConversationItem, reason: 'missing-payload' | 'decrypt-failed' | 'locked') {
    if (!conversation.secret) {
      return reason === 'decrypt-failed' ? 'Не удалось расшифровать сообщение' : ''
    }

    if (reason === 'missing-payload') {
      return 'Незащищённое сообщение заблокировано'
    }

    if (reason === 'locked') {
      return 'Секретное сообщение недоступно на этом устройстве'
    }

    return 'Не удалось расшифровать защищённое сообщение'
  }

  function revokeMediaObjectUrls() {
    if (!import.meta.client) {
      mediaObjectUrls.value = []
      return
    }

    for (const url of mediaObjectUrls.value) {
      URL.revokeObjectURL(url)
    }

    mediaObjectUrls.value = []
  }

  async function decryptAttachment(conversation: MessengerConversationItem, attachment: MessengerConversationMessage['attachment']) {
    if (!attachment || !attachment.encryptedFile || !conversation.secret || !auth.user.value || !import.meta.client) {
      return attachment
    }

    try {
      const encryptedResponse = await fetch(attachment.absoluteUrl)
      const encryptedBuffer = await encryptedResponse.arrayBuffer()
      const decryptedBuffer = await messengerCrypto.decryptBinary(
        auth.user.value.id,
        conversation.id,
        conversation.peerUserId,
        attachment.encryptedFile,
        encryptedBuffer,
      )
      const objectUrl = URL.createObjectURL(new Blob([decryptedBuffer], { type: attachment.mimeType || 'application/octet-stream' }))
      mediaObjectUrls.value = [...mediaObjectUrls.value, objectUrl]

      return {
        ...attachment,
        resolvedUrl: objectUrl,
      }
    } catch {
      return {
        ...attachment,
        resolvedUrl: attachment.absoluteUrl,
      }
    }
  }

  async function decryptMessageBody(conversation: MessengerConversationItem, body: string, encryptedBody?: MessengerEncryptedPayload) {
    if (!encryptedBody) {
      return conversation.secret ? getProtectedFallbackBody(conversation, 'missing-payload') : body
    }

    if (!auth.user.value) {
      return conversation.secret ? getProtectedFallbackBody(conversation, 'locked') : body
    }

    if (conversation.secret && !conversation.policy.encryptedMessages) {
      return getProtectedFallbackBody(conversation, 'missing-payload')
    }

    try {
      const decryptedBody = await messengerCrypto.decryptText(
        auth.user.value.id,
        conversation.id,
        conversation.peerUserId,
        encryptedBody,
      )

      if (!decryptedBody.trim() && conversation.secret) {
        return getProtectedFallbackBody(conversation, 'decrypt-failed')
      }

      return decryptedBody
    } catch {
      return getProtectedFallbackBody(conversation, conversation.secret ? 'decrypt-failed' : 'locked') || 'Не удалось расшифровать сообщение'
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
      id: preview.id,
      kind: preview.kind ?? 'text',
      own: preview.own,
      senderDisplayName: preview.senderDisplayName,
      body: await decryptMessageBody(conversation, preview.body, preview.encryptedBody),
      attachment: await decryptAttachment(conversation, attachRelationPreview(config, preview)?.attachment),
    } satisfies MessengerMessageRelationPreview
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
      messageId: preview.messageId,
      conversationId: preview.conversationId,
      senderUserId: preview.senderUserId,
      senderDisplayName: preview.senderDisplayName,
      kind: preview.kind,
      body: await decryptMessageBody(conversation, preview.body, preview.encryptedBody),
      attachment: await decryptAttachment(conversation, attachForwardedPreview(config, preview)?.attachment),
    } satisfies MessengerForwardedMessagePreview
  }

  async function decryptMessage(conversation: MessengerConversationItem, message: MessengerConversationMessage) {
    const attachedMessage = attachAbsoluteUrl(config, message)
    const resolvedAttachments = attachAttachmentsAbsoluteUrls(config, message.attachments)
    const decryptedAttachments = resolvedAttachments
      ? await Promise.all(resolvedAttachments.map(att => decryptAttachment(conversation, att))).then(items => items.filter((item): item is NonNullable<typeof item> => Boolean(item)))
      : undefined
    return {
      ...attachedMessage,
      body: await decryptMessageBody(conversation, message.body, message.encryptedBody),
      attachment: await decryptAttachment(conversation, attachedMessage.attachment),
      attachments: decryptedAttachments,
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

      const visibleConversations = agentsEnabled.value
        ? response.conversations
        : response.conversations.filter(item => item.peerType !== 'agent')

      conversations.value = await decryptConversationList(visibleConversations)
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
    const conversationId = await ensureDirectConversation(peerUserId)
    state.openConversation(conversationId)
    await loadMessages(conversationId)
  }

  async function openAgentConversation(agentId: string) {
    if (!agentsEnabled.value) {
      throw new Error('AGENTS_DISABLED')
    }

    const conversationId = await ensureAgentConversation(agentId)
    state.openConversation(conversationId)
    await loadMessages(conversationId)
  }

  async function ensureDirectConversation(peerUserId: string) {
    const response = await auth.request<{ conversation: { id: string } }>('/conversations/direct', {
      method: 'POST',
      body: { peerUserId },
    })

    await refresh(query.value)
    return response.conversation.id
  }

  async function ensureAgentConversation(agentId: string) {
    if (!agentsEnabled.value) {
      throw new Error('AGENTS_DISABLED')
    }

    const response = await auth.request<{ conversation: { id: string } }>(`/agents/${agentId}/conversation`, {
      method: 'POST',
    })

    await refresh(query.value)
    return response.conversation.id
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
    revokeMediaObjectUrls()
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

    const trimmedBody = body.trim()
    const encryptedBody = conversation.secret && trimmedBody
      ? await messengerCrypto.encryptText(
          auth.user.value.id,
          conversationId,
          conversation.peerUserId,
          body,
        )
      : undefined

    messagePending.value = true
    try {
      await auth.request(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: {
          body,
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

  // Stage a single file: upload to /uploads, return metadata the composer can
  // collect alongside text. The actual message is created later via sendMessage
  // with `attachments[]` populated. Mirrors uploadAttachment's secret-chat
  // encryption flow but skips message creation and conversation refresh.
  async function stageAttachment(file: File): Promise<MessengerStagedAttachment> {
    const conversationId = state.activeConversationId.value
    const conversation = activeConversation.value
    if (!conversationId) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    const formData = new FormData()

    if (conversation?.secret && auth.user.value) {
      const encryptedFile = await messengerCrypto.encryptBinary(
        auth.user.value.id,
        conversationId,
        conversation.peerUserId,
        await file.arrayBuffer(),
      )
      const ciphertextFile = new File([encryptedFile.payload], `${file.name}.bin`, { type: 'application/octet-stream' })
      formData.set('file', ciphertextFile)
      formData.set('metadata', JSON.stringify({
        encryptedFile: encryptedFile.encryption,
        originalName: file.name,
        originalMimeType: file.type,
      }))
    } else {
      formData.set('file', file)
    }

    const response = await auth.request<{
      attachment: {
        id?: string
        name: string
        mimeType: string
        size: number
        url: string
        encryptedFile?: MessengerEncryptedBinaryPayload
        klipy?: MessengerAttachmentKlipyPayload
      }
    }>(`/conversations/${conversationId}/uploads`, {
      method: 'POST',
      body: formData,
    })

    return {
      name: response.attachment.name,
      mimeType: response.attachment.mimeType,
      size: response.attachment.size,
      url: response.attachment.url,
      encryptedFile: response.attachment.encryptedFile,
      klipy: response.attachment.klipy,
    }
  }

  async function forwardMessage(sourceMessageId: string, targetConversationId: string, targetPeerUserId?: string) {
    const targetConversation = conversations.value.find(item => item.id === targetConversationId)
    const sourceMessage = messages.value.find(item => item.id === sourceMessageId)
    const sourceConversation = activeConversation.value
    if (!targetConversation || !sourceMessage || !sourceConversation || !auth.user.value) {
      if (!sourceMessage || !sourceConversation || !auth.user.value) {
        throw new Error('MESSAGE_NOT_FOUND')
      }

      if (!targetPeerUserId) {
        throw new Error('CONVERSATION_NOT_FOUND')
      }
    }

    const resolvedTargetPeerUserId = targetConversation?.peerUserId || targetPeerUserId
    if (!resolvedTargetPeerUserId) {
      throw new Error('CONVERSATION_NOT_FOUND')
    }

    messagePending.value = true
    try {
      if (sourceMessage.kind === 'text') {
        await auth.request(`/conversations/${targetConversationId}/messages`, {
          method: 'POST',
          body: {
            body: sourceMessage.body,
            forwardedFrom: {
              messageId: sourceMessage.id,
              conversationId: sourceConversation.id,
              senderUserId: sourceMessage.own ? auth.user.value.id : sourceConversation.peerUserId,
              senderDisplayName: sourceMessage.senderDisplayName,
              body: sourceMessage.body,
              kind: sourceMessage.kind,
              attachment: sourceMessage.attachment
                ? {
                    name: sourceMessage.attachment.name,
                    mimeType: sourceMessage.attachment.mimeType,
                    size: sourceMessage.attachment.size,
                    url: sourceMessage.attachment.url,
                    encryptedFile: sourceMessage.attachment.encryptedFile,
                  }
                : undefined,
            },
          },
        })
      } else {
        await auth.request(`/conversations/${targetConversationId}/messages`, {
          method: 'POST',
          body: {
            forwardedMessageId: sourceMessage.id,
          },
        })
      }

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

  async function uploadAttachment(file: File, metadata: { klipy?: MessengerAttachmentKlipyPayload } = {}) {
    const conversationId = state.activeConversationId.value
    const conversation = activeConversation.value
    if (!conversationId) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    const formData = new FormData()

    if (conversation?.secret && auth.user.value) {
      const encryptedFile = await messengerCrypto.encryptBinary(
        auth.user.value.id,
        conversationId,
        conversation.peerUserId,
        await file.arrayBuffer(),
      )
      const ciphertextFile = new File([encryptedFile.payload], `${file.name}.bin`, { type: 'application/octet-stream' })
      formData.set('file', ciphertextFile)
      formData.set('metadata', JSON.stringify({
        encryptedFile: encryptedFile.encryption,
        klipy: metadata.klipy,
        originalName: file.name,
        originalMimeType: file.type,
      }))
    } else {
      formData.set('file', file)
      if (metadata.klipy) {
        formData.set('metadata', JSON.stringify({
          klipy: metadata.klipy,
        }))
      }
    }

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
      await auth.request(`/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PATCH',
        body: {
          body,
          encryptedBody: conversation.secret
            ? await messengerCrypto.encryptText(
                auth.user.value.id,
                conversationId,
                conversation.peerUserId,
                body,
              )
            : undefined,
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

  async function toggleReaction(messageId: string, emoji: string) {
    const conversationId = state.activeConversationId.value
    if (!conversationId) {
      throw new Error('NO_ACTIVE_CONVERSATION')
    }

    const previousMessages = messages.value.map(message => ({
      ...message,
      reactions: message.reactions?.map(reaction => ({ ...reaction })),
    }))

    messages.value = messages.value.map((message) => {
      if (message.id !== messageId) {
        return message
      }

      return {
        ...message,
        reactions: buildNextReactionState(message.reactions, emoji),
      }
    })

    try {
      await auth.request(`/conversations/${conversationId}/messages/${messageId}/reactions`, {
        method: 'POST',
        body: {
          emoji,
        },
      })
      void loadMessages(conversationId)
    } catch (error) {
      messages.value = previousMessages
      throw error
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
    openAgentConversation,
    ensureDirectConversation,
    ensureAgentConversation,
    openSecretConversation,
    selectConversation,
    loadMessages,
    sendMessage,
    forwardMessage,
    deleteConversation,
    uploadAttachment,
    stageAttachment,
    editMessage,
    deleteMessage,
    toggleReaction,
  }
}