import { buildMessengerUrl } from '../../utils/messenger-url'
import type { MessengerConversationItem, MessengerConversationMessage } from '../../entities/conversations/model/useMessengerConversations'

export function resolveAttachmentUrl(baseUrl: string, path: string): string {
  return buildMessengerUrl(baseUrl, path)
}

export function useConversationsApi() {
  const auth = useMessengerAuth()

  function listConversations(query?: string) {
    return auth.request<{ conversations: MessengerConversationItem[] }>('/conversations', {
      method: 'GET',
      query: query ? { query } : undefined,
    })
  }

  function createDirectConversation(peerUserId: string) {
    return auth.request<{ conversation: { id: string } }>('/conversations/direct', {
      method: 'POST',
      body: { peerUserId },
    })
  }

  function createSecretConversation(peerUserId: string) {
    return auth.request<{ conversation: { id: string } }>('/conversations/secret', {
      method: 'POST',
      body: { peerUserId },
    })
  }

  function createAgentConversation(agentId: string) {
    return auth.request<{ conversation: { id: string } }>(`/agents/${agentId}/conversation`, {
      method: 'POST',
    })
  }

  function getMessages(conversationId: string) {
    return auth.request<{ messages: MessengerConversationMessage[] }>(`/conversations/${conversationId}/messages`, {
      method: 'GET',
    })
  }

  function postMessage(conversationId: string, body: Record<string, unknown>) {
    return auth.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body,
    })
  }

  function patchConversation(conversationId: string, body: { model?: string }) {
    return auth.request(`/conversations/${conversationId}`, { method: 'PATCH', body })
  }

  function deleteConversation(conversationId: string) {
    return auth.request(`/conversations/${conversationId}`, { method: 'DELETE' })
  }

  function uploadAttachment(conversationId: string, formData: FormData) {
    return auth.request(`/conversations/${conversationId}/attachments`, {
      method: 'POST',
      body: formData,
    })
  }

  function patchMessage(conversationId: string, messageId: string, body: Record<string, unknown>) {
    return auth.request(`/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      body,
    })
  }

  function deleteMessage(conversationId: string, messageId: string) {
    return auth.request(`/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    })
  }

  function toggleReaction(conversationId: string, messageId: string, emoji: string) {
    return auth.request(`/conversations/${conversationId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: { emoji },
    })
  }

  return {
    listConversations,
    createDirectConversation,
    createSecretConversation,
    createAgentConversation,
    getMessages,
    postMessage,
    patchConversation,
    deleteConversation,
    uploadAttachment,
    patchMessage,
    deleteMessage,
    toggleReaction,
  }
}
