export type CommunicationActorRole = 'admin' | 'client' | 'contractor' | 'service'

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
  role: string
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

export interface E2eeEncryptedEnvelope {
  version: 'e2ee-v1'
  algorithm: 'AES-GCM-256'
  ciphertext: string
  iv: string
  senderKeyId: string
  mimeType?: string
}

export interface E2eePublishedKeyBundle {
  keyId: string
  algorithm: 'ECDH-P256'
  publicKeyJwk: JsonWebKey
  deviceId?: string
}