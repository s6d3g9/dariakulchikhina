import { randomUUID } from 'node:crypto'

import postgres, { type Sql } from 'postgres'

import type {
  CommunicationMessage,
  CommunicationRoom,
  PublishedKeyBundle,
  RoomParticipant,
  SignalEnvelope,
} from './types.ts'
import type { CommunicationStore, AddMessageInput, CreateRoomInput, ListRoomsInput } from './store.ts'
import { InMemoryCommunicationStore } from './store.ts'
import type { ServiceConfig } from './config.ts'

type RoomRow = {
  id: string
  external_ref: string
  title: string
  kind: CommunicationRoom['kind']
  metadata: Record<string, unknown> | null
  created_at: string | Date
  updated_at: string | Date
}

type ParticipantRow = {
  actor_id: string
  actor_role: RoomParticipant['role']
  display_name: string | null
  nickname: string | null
  joined_at: string | Date
}

type MessageRow = {
  id: string
  room_id: string
  encrypted: CommunicationMessage['encrypted']
  sender_actor_id: string
  sender_role: CommunicationMessage['senderRole']
  sender_display_name: string | null
  created_at: string | Date
}

type KeyBundleRow = {
  id: string
  room_id: string
  actor_id: string
  actor_role: PublishedKeyBundle['actorRole']
  actor_display_name: string | null
  key_id: string
  algorithm: PublishedKeyBundle['algorithm']
  public_key_jwk: JsonWebKey
  device_id: string | null
  created_at: string | Date
}

function iso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function roomFromRow(row: RoomRow, participants: RoomParticipant[]): CommunicationRoom {
  return {
    id: row.id,
    externalRef: row.external_ref,
    title: row.title,
    kind: row.kind,
    metadata: row.metadata || {},
    participants,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function participantFromRow(row: ParticipantRow): RoomParticipant {
  return {
    actorId: row.actor_id,
    role: row.actor_role,
    displayName: row.display_name || undefined,
    nickname: row.nickname || undefined,
    joinedAt: iso(row.joined_at),
  }
}

function messageFromRow(row: MessageRow): CommunicationMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    encrypted: row.encrypted,
    senderActorId: row.sender_actor_id,
    senderRole: row.sender_role,
    senderDisplayName: row.sender_display_name || undefined,
    createdAt: iso(row.created_at),
  }
}

function keyBundleFromRow(row: KeyBundleRow): PublishedKeyBundle {
  return {
    id: row.id,
    roomId: row.room_id,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    actorDisplayName: row.actor_display_name || undefined,
    keyId: row.key_id,
    algorithm: row.algorithm,
    publicKeyJwk: row.public_key_jwk,
    deviceId: row.device_id || undefined,
    createdAt: iso(row.created_at),
  }
}

export class PostgresCommunicationStore implements CommunicationStore {
  readonly driver = 'postgres' as const
  private readonly sql: Sql

  constructor(sql: Sql) {
    this.sql = sql
  }

  async init() {
    await this.sql`
      create table if not exists comm_rooms (
        id text primary key,
        external_ref text not null unique,
        title text not null,
        kind text not null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `
    await this.sql`
      create table if not exists comm_room_participants (
        room_id text not null references comm_rooms(id) on delete cascade,
        actor_id text not null,
        actor_role text not null,
        display_name text,
        nickname text,
        joined_at timestamptz not null default now(),
        primary key (room_id, actor_id, actor_role)
      )
    `
    await this.sql`alter table comm_room_participants add column if not exists nickname text`
    await this.sql`
      create table if not exists comm_room_messages (
        id text primary key,
        room_id text not null references comm_rooms(id) on delete cascade,
        encrypted jsonb not null,
        sender_actor_id text not null,
        sender_role text not null,
        sender_display_name text,
        created_at timestamptz not null default now()
      )
    `
    await this.sql`
      create table if not exists comm_room_key_bundles (
        id text primary key,
        room_id text not null references comm_rooms(id) on delete cascade,
        actor_id text not null,
        actor_role text not null,
        actor_display_name text,
        key_id text not null,
        algorithm text not null,
        public_key_jwk jsonb not null,
        device_id text,
        created_at timestamptz not null default now(),
        unique (room_id, actor_id, actor_role, key_id)
      )
    `
    await this.sql`
      create table if not exists comm_signal_events (
        id text primary key,
        room_id text not null references comm_rooms(id) on delete cascade,
        call_id text not null,
        kind text not null,
        target_actor_key text,
        sender_actor_id text not null,
        sender_role text not null,
        sender_display_name text,
        payload jsonb,
        created_at timestamptz not null default now()
      )
    `
    await this.sql`create index if not exists comm_room_messages_room_created_idx on comm_room_messages (room_id, created_at desc)`
    await this.sql`create index if not exists comm_signal_events_room_created_idx on comm_signal_events (room_id, created_at desc)`
  }

  async createOrGetRoom(input: CreateRoomInput, creator: { actorId: string; role: any; displayName?: string }) {
    const existing = await this.getRoomByExternalRef(input.externalRef)
    if (existing) {
      await this.upsertParticipant(existing.id, {
        actorId: creator.actorId,
        role: creator.role,
        displayName: creator.displayName,
        nickname: undefined,
      })
      for (const participant of input.participants || []) {
        await this.upsertParticipant(existing.id, participant)
      }
      return (await this.getRoomById(existing.id)) || existing
    }

    const roomId = randomUUID()
    await this.sql`
      insert into comm_rooms (id, external_ref, title, kind, metadata)
      values (
        ${roomId},
        ${input.externalRef},
        ${input.title?.trim() || input.externalRef},
        ${input.kind || 'project'},
        cast(${JSON.stringify(input.metadata || {})} as jsonb)
      )
    `

    await this.upsertParticipant(roomId, {
      actorId: creator.actorId,
      role: creator.role,
      displayName: creator.displayName,
      nickname: undefined,
    })
    for (const participant of input.participants || []) {
      await this.upsertParticipant(roomId, participant)
    }

    const room = await this.getRoomById(roomId)
    if (!room) {
      throw new Error('Room creation failed')
    }
    return room
  }

  async getRoomById(roomId: string) {
    const rows = await this.sql<RoomRow[]>`select * from comm_rooms where id = ${roomId} limit 1`
    const row = rows[0]
    if (!row) {
      return null
    }

    const participants = await this.listParticipants(row.id)
    return roomFromRow(row, participants)
  }

  async getRoomByExternalRef(externalRef: string) {
    const rows = await this.sql<RoomRow[]>`select * from comm_rooms where external_ref = ${externalRef} limit 1`
    const row = rows[0]
    if (!row) {
      return null
    }

    const participants = await this.listParticipants(row.id)
    return roomFromRow(row, participants)
  }

  async listRooms(input: ListRoomsInput = {}) {
    let rows: RoomRow[]

    if (input.kind && input.externalRefPrefix) {
      rows = await this.sql<RoomRow[]>`
        select *
        from comm_rooms
        where kind = ${input.kind} and external_ref like ${`${input.externalRefPrefix}%`}
        order by updated_at desc
      `
    } else if (input.kind) {
      rows = await this.sql<RoomRow[]>`
        select *
        from comm_rooms
        where kind = ${input.kind}
        order by updated_at desc
      `
    } else if (input.externalRefPrefix) {
      rows = await this.sql<RoomRow[]>`
        select *
        from comm_rooms
        where external_ref like ${`${input.externalRefPrefix}%`}
        order by updated_at desc
      `
    } else {
      rows = await this.sql<RoomRow[]>`
        select *
        from comm_rooms
        order by updated_at desc
      `
    }

    const rooms = await Promise.all(rows.map(async (row) => roomFromRow(row, await this.listParticipants(row.id))))
    return rooms
  }

  async upsertParticipant(roomId: string, participant: Pick<RoomParticipant, 'actorId' | 'role' | 'displayName' | 'nickname'>) {
    await this.sql`
      insert into comm_room_participants (room_id, actor_id, actor_role, display_name, nickname)
      values (${roomId}, ${participant.actorId}, ${participant.role}, ${participant.displayName || null}, ${participant.nickname || null})
      on conflict (room_id, actor_id, actor_role)
      do update set display_name = excluded.display_name, nickname = excluded.nickname
    `
    await this.touchRoom(roomId)

    const room = await this.getRoomById(roomId)
    if (!room) {
      throw new Error(`Room ${roomId} not found`)
    }
    return room
  }

  async hasParticipant(roomId: string, actor: { actorId: string; role: any }) {
    const rows = await this.sql<Array<{ exists: boolean }>>`
      select exists(
        select 1 from comm_room_participants
        where room_id = ${roomId} and actor_id = ${actor.actorId} and actor_role = ${actor.role}
      ) as exists
    `
    return Boolean(rows[0]?.exists)
  }

  async listMessages(roomId: string, limit = 50) {
    const safeLimit = Math.max(1, Math.min(limit, 200))
    const rows = await this.sql<MessageRow[]>`
      select *
      from (
        select * from comm_room_messages
        where room_id = ${roomId}
        order by created_at desc
        limit ${safeLimit}
      ) recent
      order by created_at asc
    `
    return rows.map(messageFromRow)
  }

  async listKeyBundles(roomId: string) {
    const rows = await this.sql<KeyBundleRow[]>`
      select * from comm_room_key_bundles
      where room_id = ${roomId}
      order by created_at asc
    `
    return rows.map(keyBundleFromRow)
  }

  async publishKeyBundle(roomId: string, input: Omit<PublishedKeyBundle, 'id' | 'roomId' | 'createdAt'>) {
    await this.sql`
      insert into comm_room_key_bundles (
        id, room_id, actor_id, actor_role, actor_display_name, key_id, algorithm, public_key_jwk, device_id
      )
      values (
        ${randomUUID()},
        ${roomId},
        ${input.actorId},
        ${input.actorRole},
        ${input.actorDisplayName || null},
        ${input.keyId},
        ${input.algorithm},
        cast(${JSON.stringify(input.publicKeyJwk)} as jsonb),
        ${input.deviceId || null}
      )
      on conflict (room_id, actor_id, actor_role, key_id)
      do update set
        actor_display_name = excluded.actor_display_name,
        algorithm = excluded.algorithm,
        public_key_jwk = excluded.public_key_jwk,
        device_id = excluded.device_id,
        created_at = now()
    `

    await this.touchRoom(roomId)
    const rows = await this.sql<KeyBundleRow[]>`
      select * from comm_room_key_bundles
      where room_id = ${roomId} and actor_id = ${input.actorId} and actor_role = ${input.actorRole} and key_id = ${input.keyId}
      limit 1
    `
    if (!rows[0]) {
      throw new Error('Key bundle publish failed')
    }
    return keyBundleFromRow(rows[0])
  }

  async addMessage(input: AddMessageInput) {
    const messageId = randomUUID()
    await this.sql`
      insert into comm_room_messages (
        id, room_id, encrypted, sender_actor_id, sender_role, sender_display_name
      ) values (
        ${messageId},
        ${input.roomId},
        cast(${JSON.stringify(input.encrypted)} as jsonb),
        ${input.actor.actorId},
        ${input.actor.role},
        ${input.actor.displayName || null}
      )
    `

    await this.touchRoom(input.roomId)
    const rows = await this.sql<MessageRow[]>`select * from comm_room_messages where id = ${messageId} limit 1`
    if (!rows[0]) {
      throw new Error('Message create failed')
    }
    return messageFromRow(rows[0])
  }

  async appendSignal(signal: SignalEnvelope) {
    await this.sql`
      insert into comm_signal_events (
        id, room_id, call_id, kind, target_actor_key, sender_actor_id, sender_role, sender_display_name, payload
      ) values (
        ${randomUUID()},
        ${signal.roomId},
        ${signal.callId},
        ${signal.kind},
        ${signal.targetActorKey || null},
        ${signal.senderActorId},
        ${signal.senderRole},
        ${signal.senderDisplayName || null},
        cast(${JSON.stringify(signal.payload ?? null)} as jsonb)
      )
    `
  }

  private async listParticipants(roomId: string) {
    const rows = await this.sql<ParticipantRow[]>`
      select actor_id, actor_role, display_name, nickname, joined_at
      from comm_room_participants
      where room_id = ${roomId}
      order by joined_at asc
    `
    return rows.map(participantFromRow)
  }

  private async touchRoom(roomId: string) {
    await this.sql`update comm_rooms set updated_at = now() where id = ${roomId}`
  }
}

export async function createCommunicationStore(config: ServiceConfig): Promise<CommunicationStore> {
  if (!config.databaseUrl) {
    return new InMemoryCommunicationStore()
  }

  const sql = postgres(config.databaseUrl, {
    prepare: false,
    max: 5,
  })
  const store = new PostgresCommunicationStore(sql)
  await store.init()
  return store
}