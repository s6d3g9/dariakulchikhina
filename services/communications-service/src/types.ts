export type ServiceActorRole =
  | 'admin'
  | 'designer'
  | 'client'
  | 'contractor'
  | 'seller'
  | 'manager'
  | 'service'

export type RoomKind = 'project' | 'group' | 'direct'

export type SignalKind =
  | 'invite'
  | 'ringing'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'room-key'
  | 'key-rotate'
  | 'call-key'
  | 'reject'
  | 'hangup'
  | 'busy'
  | 'mute'
  | 'unmute'

export interface PublishedKeyBundle {
  id: string
  roomId: string
  actorId: string
  actorRole: ServiceActorRole
  actorDisplayName?: string
  keyId: string
  algorithm: 'ECDH-P256'
  publicKeyJwk: JsonWebKey
  deviceId?: string
  createdAt: string
}

export interface EncryptedMessageEnvelope {
  version: 'e2ee-v1'
  algorithm: 'AES-GCM-256'
  ciphertext: string
  iv: string
  senderKeyId: string
  mimeType?: string
}

export interface ServiceTokenPayload {
  actorId: string
  role: ServiceActorRole
  displayName?: string
  scopes?: string[]
  roomRefs?: string[]
  exp: number
}

export interface RoomParticipant {
  actorId: string
  role: ServiceActorRole
  displayName?: string
  nickname?: string
  joinedAt: string
}

export interface CommunicationRoom {
  id: string
  externalRef: string
  title: string
  kind: RoomKind
  participants: RoomParticipant[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CommunicationMessage {
  id: string
  roomId: string
  encrypted: EncryptedMessageEnvelope
  senderActorId: string
  senderRole: ServiceActorRole
  senderDisplayName?: string
  createdAt: string
}

export interface SignalEnvelope {
  roomId: string
  callId: string
  kind: SignalKind
  targetActorKey: string | null
  senderActorId: string
  senderRole: ServiceActorRole
  senderDisplayName?: string
  payload: unknown
  createdAt: string
}

export interface AuthenticatedActor {
  actorId: string
  role: ServiceActorRole
  displayName?: string
  scopes: string[]
  roomRefs: string[]
}