import { messengerApi } from './client'
import type {
  MessengerEncryptedPayload,
  MessengerEncryptedBinaryPayload,
  MessengerConversationKeyPackage,
  MessengerDevicePublicKey,
} from '../../entities/messages/model/useMessengerCrypto'

export type { MessengerConversationKeyPackage }

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
  kind: 'direct' | 'direct-secret' | 'agent'
  secret: boolean
  peerUserId: string
  peerDisplayName: string
  peerLogin: string
  peerType: 'user' | 'agent'
  peerDescription?: string
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

interface MessengerAttachmentShape {
  name: string
  mimeType: string
  size: number
  url: string
  absoluteUrl: string
  resolvedUrl: string
  encryptedFile?: MessengerEncryptedBinaryPayload
  klipy?: MessengerAttachmentKlipyPayload
}

export interface MessengerMessageRelationPreview {
  id: string
  body: string
  encryptedBody?: MessengerEncryptedPayload
  kind: 'text' | 'file'
  own: boolean
  senderDisplayName: string
  attachment?: MessengerAttachmentShape
}

export interface MessengerMessageReactionSummary {
  emoji: string
  count: number
  own: boolean
}

export interface MessengerForwardedMessagePreview {
  messageId: string
  conversationId: string
  senderUserId: string
  body: string
  encryptedBody?: MessengerEncryptedPayload
  kind: 'text' | 'file'
  senderDisplayName: string
  attachment?: MessengerAttachmentShape
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
  reactions?: MessengerMessageReactionSummary[]
  attachment?: MessengerAttachmentShape
  replyTo?: MessengerMessageRelationPreview
  commentOn?: MessengerMessageRelationPreview
  forwardedFrom?: MessengerForwardedMessagePreview
}

export interface MessengerSendMessageBody {
  body?: string
  encryptedBody?: MessengerEncryptedPayload
  replyToMessageId?: string
  commentOnMessageId?: string
  forwardedMessageId?: string
  forwardedFrom?: {
    messageId: string
    conversationId: string
    senderUserId: string
    senderDisplayName: string
    body?: string
    encryptedBody?: MessengerEncryptedPayload
    kind: 'text' | 'file'
    attachment?: {
      name: string
      mimeType: string
      size: number
      url: string
      encryptedFile?: MessengerEncryptedBinaryPayload
    }
  }
}

export interface MessengerEditMessageBody {
  body?: string
  encryptedBody?: MessengerEncryptedPayload
}

export interface MessengerEncryptionPackage {
  recipientUserId: string
  wrappedKey: string
  iv: string
  senderPublicKey: MessengerDevicePublicKey
}

export function listConversations(query?: string): Promise<{ conversations: MessengerConversationItem[] }> {
  return messengerApi('/conversations', {
    method: 'GET',
    query: query ? { query } : undefined,
  })
}

export function createDirect(peerUserId: string): Promise<{ conversation: { id: string } }> {
  return messengerApi('/conversations/direct', { method: 'POST', body: { peerUserId } })
}

export function createSecret(peerUserId: string): Promise<{ conversation: { id: string } }> {
  return messengerApi('/conversations/secret', { method: 'POST', body: { peerUserId } })
}

export function createAgentConversation(agentId: string): Promise<{ conversation: { id: string } }> {
  return messengerApi(`/agents/${agentId}/conversation`, { method: 'POST' })
}

export function deleteConversation(conversationId: string): Promise<unknown> {
  return messengerApi(`/conversations/${conversationId}`, { method: 'DELETE' })
}

export function getEncryption(conversationId: string): Promise<{ keyPackage: MessengerConversationKeyPackage | null }> {
  return messengerApi(`/conversations/${conversationId}/encryption`, { method: 'GET' })
}

export function setEncryption(
  conversationId: string,
  packages: MessengerEncryptionPackage[],
): Promise<{ encryption: unknown }> {
  return messengerApi(`/conversations/${conversationId}/encryption`, {
    method: 'POST',
    body: { packages },
  })
}

export function listMessages(conversationId: string): Promise<{ messages: MessengerConversationMessage[] }> {
  return messengerApi(`/conversations/${conversationId}/messages`, { method: 'GET' })
}

export function sendMessage(
  conversationId: string,
  body: MessengerSendMessageBody,
): Promise<{ message: MessengerConversationMessage }> {
  return messengerApi(`/conversations/${conversationId}/messages`, { method: 'POST', body })
}

export function editMessage(
  conversationId: string,
  messageId: string,
  body: MessengerEditMessageBody,
): Promise<{ message: MessengerConversationMessage }> {
  return messengerApi(`/conversations/${conversationId}/messages/${messageId}`, { method: 'PATCH', body })
}

export function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<{ message: MessengerConversationMessage }> {
  return messengerApi(`/conversations/${conversationId}/messages/${messageId}`, { method: 'DELETE' })
}

export function addReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
): Promise<{ message: MessengerConversationMessage }> {
  return messengerApi(`/conversations/${conversationId}/messages/${messageId}/reactions`, {
    method: 'POST',
    body: { emoji },
  })
}

export function uploadAttachment(
  conversationId: string,
  formData: FormData,
): Promise<{ message: MessengerConversationMessage }> {
  return messengerApi(`/conversations/${conversationId}/attachments`, { method: 'POST', body: formData })
}
