import { randomUUID } from 'node:crypto'

import type {
  AuthenticatedActor,
  CommunicationMessage,
  CommunicationRoom,
  EncryptedMessageEnvelope,
  PublishedKeyBundle,
  RoomKind,
  RoomParticipant,
  SignalEnvelope,
} from './types.ts'
import { actorKey } from './auth.ts'

export interface CreateRoomInput {
  externalRef: string
  title?: string
  kind?: RoomKind
  participants?: Array<Pick<RoomParticipant, 'actorId' | 'role' | 'displayName' | 'nickname'>>
  metadata?: Record<string, unknown>
}

export interface AddMessageInput {
  roomId: string
  encrypted: EncryptedMessageEnvelope
  actor: AuthenticatedActor
}

export interface ListRoomsInput {
  kind?: RoomKind
  externalRefPrefix?: string
}

export interface CommunicationStore {
  readonly driver: 'memory' | 'postgres'
  createOrGetRoom(input: CreateRoomInput, creator: AuthenticatedActor): Promise<CommunicationRoom>
  getRoomById(roomId: string): Promise<CommunicationRoom | null>
  getRoomByExternalRef(externalRef: string): Promise<CommunicationRoom | null>
  listRooms(input?: ListRoomsInput): Promise<CommunicationRoom[]>
  upsertParticipant(roomId: string, participant: Pick<RoomParticipant, 'actorId' | 'role' | 'displayName' | 'nickname'>): Promise<CommunicationRoom>
  hasParticipant(roomId: string, actor: Pick<AuthenticatedActor, 'actorId' | 'role'>): Promise<boolean>
  listMessages(roomId: string, limit?: number): Promise<CommunicationMessage[]>
  listKeyBundles(roomId: string): Promise<PublishedKeyBundle[]>
  publishKeyBundle(roomId: string, input: Omit<PublishedKeyBundle, 'id' | 'roomId' | 'createdAt'>): Promise<PublishedKeyBundle>
  addMessage(input: AddMessageInput): Promise<CommunicationMessage>
  appendSignal(signal: SignalEnvelope): Promise<void>
}

export class InMemoryCommunicationStore implements CommunicationStore {
  readonly driver = 'memory' as const

  private rooms = new Map<string, CommunicationRoom>()
  private roomsByExternalRef = new Map<string, string>()
  private messagesByRoom = new Map<string, CommunicationMessage[]>()
  private keyBundlesByRoom = new Map<string, PublishedKeyBundle[]>()
  private signalsByRoom = new Map<string, SignalEnvelope[]>()

  async createOrGetRoom(input: CreateRoomInput, creator: AuthenticatedActor) {
    const existingId = this.roomsByExternalRef.get(input.externalRef)
    if (existingId) {
      const existingRoom = this.rooms.get(existingId)
      if (!existingRoom) {
        this.roomsByExternalRef.delete(input.externalRef)
      } else {
        await this.upsertParticipant(existingRoom.id, {
          actorId: creator.actorId,
          role: creator.role,
          displayName: creator.displayName,
          nickname: undefined,
        })
        return existingRoom
      }
    }

    const now = new Date().toISOString()
    const room: CommunicationRoom = {
      id: randomUUID(),
      externalRef: input.externalRef,
      title: input.title?.trim() || input.externalRef,
      kind: input.kind || 'project',
      participants: [],
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    }

    this.rooms.set(room.id, room)
    this.roomsByExternalRef.set(room.externalRef, room.id)
    this.messagesByRoom.set(room.id, [])
    this.keyBundlesByRoom.set(room.id, [])
    this.signalsByRoom.set(room.id, [])

    await this.upsertParticipant(room.id, {
      actorId: creator.actorId,
      role: creator.role,
      displayName: creator.displayName,
      nickname: undefined,
    })

    for (const participant of input.participants || []) {
      await this.upsertParticipant(room.id, participant)
    }

    return this.requireRoom(room.id)
  }

  async getRoomById(roomId: string) {
    return this.rooms.get(roomId) || null
  }

  async getRoomByExternalRef(externalRef: string) {
    const roomId = this.roomsByExternalRef.get(externalRef)
    if (!roomId) {
      return null
    }

    return this.rooms.get(roomId) || null
  }

  async listRooms(input: ListRoomsInput = {}) {
    const rooms = Array.from(this.rooms.values())
      .filter((room) => !input.kind || room.kind === input.kind)
      .filter((room) => !input.externalRefPrefix || room.externalRef.startsWith(input.externalRefPrefix))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())

    return rooms
  }

  async upsertParticipant(roomId: string, participant: Pick<RoomParticipant, 'actorId' | 'role' | 'displayName' | 'nickname'>) {
    const room = this.requireRoom(roomId)
    const participantId = actorKey(participant)
    const existing = room.participants.find(item => actorKey(item) === participantId)
    const now = new Date().toISOString()

    if (existing) {
      existing.displayName = participant.displayName || existing.displayName
      existing.nickname = participant.nickname === undefined ? existing.nickname : participant.nickname
      room.updatedAt = now
      return room
    }

    room.participants.push({
      actorId: participant.actorId,
      role: participant.role,
      displayName: participant.displayName,
      nickname: participant.nickname,
      joinedAt: now,
    })
    room.updatedAt = now
    return room
  }

  async hasParticipant(roomId: string, actor: Pick<AuthenticatedActor, 'actorId' | 'role'>) {
    const room = this.rooms.get(roomId)
    if (!room) {
      return false
    }

    const key = actorKey(actor)
    return room.participants.some(participant => actorKey(participant) === key)
  }

  async listMessages(roomId: string, limit = 50) {
    const messages = this.messagesByRoom.get(roomId) || []
    return messages.slice(-Math.max(1, Math.min(limit, 200)))
  }

  async listKeyBundles(roomId: string) {
    return [...(this.keyBundlesByRoom.get(roomId) || [])]
  }

  async publishKeyBundle(roomId: string, input: Omit<PublishedKeyBundle, 'id' | 'roomId' | 'createdAt'>) {
    const room = this.requireRoom(roomId)
    const bundles = this.keyBundlesByRoom.get(room.id) || []
    const existingIndex = bundles.findIndex((item) => item.actorId === input.actorId && item.actorRole === input.actorRole && item.keyId === input.keyId)
    const nextBundle: PublishedKeyBundle = {
      id: randomUUID(),
      roomId: room.id,
      actorId: input.actorId,
      actorRole: input.actorRole,
      actorDisplayName: input.actorDisplayName,
      keyId: input.keyId,
      algorithm: input.algorithm,
      publicKeyJwk: input.publicKeyJwk,
      deviceId: input.deviceId,
      createdAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      bundles[existingIndex] = nextBundle
    } else {
      bundles.push(nextBundle)
    }

    this.keyBundlesByRoom.set(room.id, bundles)
    room.updatedAt = nextBundle.createdAt
    return nextBundle
  }

  async addMessage(input: AddMessageInput) {
    const room = this.requireRoom(input.roomId)
    const message: CommunicationMessage = {
      id: randomUUID(),
      roomId: room.id,
      encrypted: input.encrypted,
      senderActorId: input.actor.actorId,
      senderRole: input.actor.role,
      senderDisplayName: input.actor.displayName,
      createdAt: new Date().toISOString(),
    }

    const roomMessages = this.messagesByRoom.get(room.id)
    if (!roomMessages) {
      this.messagesByRoom.set(room.id, [message])
    } else {
      roomMessages.push(message)
    }

    room.updatedAt = message.createdAt
    return message
  }

  async appendSignal(signal: SignalEnvelope) {
    const signals = this.signalsByRoom.get(signal.roomId) || []
    signals.push(signal)
    this.signalsByRoom.set(signal.roomId, signals)
  }

  private requireRoom(roomId: string) {
    const room = this.rooms.get(roomId)
    if (!room) {
      throw new Error(`Room ${roomId} not found`)
    }

    return room
  }
}