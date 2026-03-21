import { z } from 'zod'

export const COMMUNICATION_ACTOR_ROLES = ['admin', 'designer', 'client', 'contractor', 'seller', 'manager', 'service'] as const
export const COMMUNICATION_ROOM_KINDS = ['project', 'group', 'direct'] as const
export const COMMUNICATION_SIGNAL_KINDS = ['invite', 'ringing', 'offer', 'answer', 'ice-candidate', 'room-key', 'key-rotate', 'call-key', 'reject', 'hangup', 'mute', 'unmute'] as const

export type CommunicationActorRole = typeof COMMUNICATION_ACTOR_ROLES[number]
export type CommunicationRoomKind = typeof COMMUNICATION_ROOM_KINDS[number]
export type CommunicationSignalKind = typeof COMMUNICATION_SIGNAL_KINDS[number]

export const CommunicationActorRoleSchema = z.enum(COMMUNICATION_ACTOR_ROLES)
export const CommunicationRoomKindSchema = z.enum(COMMUNICATION_ROOM_KINDS)
export const CommunicationSignalKindSchema = z.enum(COMMUNICATION_SIGNAL_KINDS)

export const E2eeEncryptedEnvelopeSchema = z.object({
  version: z.literal('e2ee-v1'),
  algorithm: z.literal('AES-GCM-256'),
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  senderKeyId: z.string().min(1),
  mimeType: z.string().min(1).optional(),
})

export type E2eeEncryptedEnvelope = z.infer<typeof E2eeEncryptedEnvelopeSchema>

export const E2eePublishedKeyBundleSchema = z.object({
  keyId: z.string().min(1),
  algorithm: z.literal('ECDH-P256'),
  publicKeyJwk: z.custom<JsonWebKey>((value) => Boolean(value && typeof value === 'object'), 'publicKeyJwk is required'),
  deviceId: z.string().min(1).optional(),
})

export type E2eePublishedKeyBundle = z.infer<typeof E2eePublishedKeyBundleSchema>

export const CommunicationRoomParticipantSchema = z.object({
  actorId: z.string().min(1),
  role: CommunicationActorRoleSchema,
  displayName: z.string().min(1).optional(),
  nickname: z.string().trim().min(1).max(32).optional(),
  joinedAt: z.string().optional(),
})

export type CommunicationRoomParticipant = z.infer<typeof CommunicationRoomParticipantSchema>

export interface ProjectCommunicationActor {
  actorId: string
  actorKey: string
  role: CommunicationActorRole
  displayName: string
  nickname?: string
}

export interface ProjectCommunicationRoomParticipant {
  actorId: string
  actorKey: string
  role: CommunicationActorRole
  displayName: string
  nickname?: string
}

export interface ProjectCommunicationBootstrap {
  serviceUrl: string
  accessToken: string
  roomExternalRef: string
  roomTitle: string
  actor: ProjectCommunicationActor
  roomParticipants: ProjectCommunicationRoomParticipant[]
  e2ee: {
    protocol: 'e2ee-v1'
    keyAgreement: 'ECDH-P256'
    messageCipher: 'AES-GCM-256'
    callMedia: 'WebRTC-DTLS-SRTP'
  }
}

export interface CommunicationRoom {
  id: string
  externalRef: string
  title: string
  kind: CommunicationRoomKind
  participants: CommunicationRoomParticipant[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CommunicationMessage {
  id: string
  roomId: string
  encrypted: E2eeEncryptedEnvelope
  senderActorId: string
  senderRole: CommunicationActorRole
  senderDisplayName?: string
  createdAt: string
}

export interface CommunicationSignal {
  roomId: string
  callId: string
  kind: CommunicationSignalKind
  targetActorKey: string | null
  senderActorId: string
  senderRole: CommunicationActorRole
  senderDisplayName?: string
  payload: unknown
  createdAt: string
}

export interface CommunicationKeyBundle extends E2eePublishedKeyBundle {
  id: string
  roomId: string
  actorId: string
  actorRole: CommunicationActorRole
  actorDisplayName?: string
  createdAt: string
}

export const CommunicationCreateRoomParticipantDtoSchema = CommunicationRoomParticipantSchema.pick({
  actorId: true,
  role: true,
  displayName: true,
  nickname: true,
})

export const CommunicationCreateRoomDtoSchema = z.object({
  externalRef: z.string().trim().min(1).max(255),
  title: z.string().trim().min(1).max(255).optional(),
  kind: CommunicationRoomKindSchema.optional(),
  participants: z.array(CommunicationCreateRoomParticipantDtoSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const CommunicationUpdateNicknameDtoSchema = z.object({
  nickname: z.string().trim().max(33),
})

export const CommunicationPublishKeyBundleDtoSchema = E2eePublishedKeyBundleSchema.extend({
  actorId: z.string().min(1).optional(),
  actorRole: CommunicationActorRoleSchema.optional(),
  actorDisplayName: z.string().min(1).optional(),
})

export const CommunicationCreateMessageDtoSchema = z.object({
  encrypted: E2eeEncryptedEnvelopeSchema,
})

export const CommunicationCreateSignalDtoSchema = z.object({
  kind: CommunicationSignalKindSchema,
  callId: z.string().trim().min(1).optional(),
  targetActorKey: z.string().trim().min(1).nullable().optional(),
  payload: z.unknown().optional(),
})

export const CommunicationListRoomsQuerySchema = z.object({
  kind: CommunicationRoomKindSchema.optional(),
  externalRefPrefix: z.string().trim().min(1).max(255).optional(),
})

export const CommunicationListMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export interface CommunicationRoomResponse {
  room: CommunicationRoom
}

export interface CommunicationRoomsResponse {
  rooms: CommunicationRoom[]
}

export interface CommunicationMessagesResponse {
  room: CommunicationRoom
  messages: CommunicationMessage[]
}

export interface CommunicationKeyBundlesResponse {
  room: CommunicationRoom
  keyBundles: CommunicationKeyBundle[]
}

export interface CommunicationSignalResponse {
  signal: CommunicationSignal
  deliveredTo: string[]
}