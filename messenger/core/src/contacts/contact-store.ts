import { randomUUID } from 'node:crypto'

import { eq, and, isNull, or } from 'drizzle-orm'

import { listMessengerAgents } from '../agents/agent-store.ts'
import type { MessengerUserRecord } from '../auth/auth-store.ts'
import { readMessengerConfig } from '../config.ts'
import { useMessengerDb } from '../db/client.ts'
import { messengerContacts } from '../db/schema.ts'

export interface MessengerContactRecord {
  id: string
  userAId: string
  userBId: string
  createdAt: string
}

export interface MessengerInviteRecord {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  updatedAt: string
}

const _invites: Map<string, MessengerInviteRecord> = new Map()

function normalizePair(leftId: string, rightId: string): [string, string] {
  const pair = [leftId, rightId].sort()
  return [pair[0], pair[1]] as [string, string]
}

function pairKey(a: string, b: string): string {
  const [u, v] = normalizePair(a, b)
  return `${u}:${v}`
}

export async function listContactsForUser(userId: string): Promise<MessengerContactRecord[]> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerContacts)
    .where(
      and(
        eq(messengerContacts.ownerUserId, userId),
        isNull(messengerContacts.deletedAt),
      ),
    )

  return rows.map(row => ({
    id: row.id,
    userAId: row.ownerUserId,
    userBId: row.contactUserId,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function listInvitesForUser(userId: string): Promise<MessengerInviteRecord[]> {
  return Array.from(_invites.values()).filter(
    invite => invite.fromUserId === userId || invite.toUserId === userId,
  )
}

export async function createInvite(fromUserId: string, toUserId: string): Promise<MessengerInviteRecord> {
  if (fromUserId === toUserId) throw new Error('SELF_INVITE')

  const db = useMessengerDb()
  const [userAId, userBId] = normalizePair(fromUserId, toUserId)
  const hasContact = await db
    .select()
    .from(messengerContacts)
    .where(
      and(
        eq(messengerContacts.ownerUserId, userAId),
        eq(messengerContacts.contactUserId, userBId),
        isNull(messengerContacts.deletedAt),
      ),
    )
    .limit(1)
    .then(rows => rows.length > 0)

  if (hasContact) throw new Error('ALREADY_CONTACTS')

  const key = pairKey(fromUserId, toUserId)
  const existing = Array.from(_invites.values()).find(invite => {
    return pairKey(invite.fromUserId, invite.toUserId) === key && invite.status === 'pending'
  })
  if (existing) throw new Error('INVITE_EXISTS')

  const now = new Date().toISOString()
  const invite: MessengerInviteRecord = {
    id: randomUUID(),
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
  _invites.set(invite.id, invite)
  return invite
}

export async function respondToInvite(inviteId: string, actorUserId: string, nextStatus: 'accepted' | 'rejected'): Promise<MessengerInviteRecord> {
  const invite = _invites.get(inviteId)
  if (!invite) throw new Error('INVITE_NOT_FOUND')
  if (invite.toUserId !== actorUserId) throw new Error('INVITE_FORBIDDEN')
  if (invite.status !== 'pending') throw new Error('INVITE_ALREADY_RESOLVED')

  invite.status = nextStatus
  invite.updatedAt = new Date().toISOString()
  _invites.set(inviteId, invite)

  if (nextStatus === 'accepted') {
    const db = useMessengerDb()
    const [userAId, userBId] = normalizePair(invite.fromUserId, invite.toUserId)
    const existing = await db
      .select()
      .from(messengerContacts)
      .where(
        and(
          eq(messengerContacts.ownerUserId, userAId),
          eq(messengerContacts.contactUserId, userBId),
          isNull(messengerContacts.deletedAt),
        ),
      )
      .limit(1)
      .then(rows => rows.length > 0)

    if (!existing) {
      const now = new Date()
      await db.insert(messengerContacts).values([
        { ownerUserId: userAId, contactUserId: userBId, createdAt: now },
        { ownerUserId: userBId, contactUserId: userAId, createdAt: now },
      ])
    }
  }

  return invite
}

export async function deleteContactForUser(actorUserId: string, peerUserId: string): Promise<{ peerUserId: string }> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerContacts)
    .where(
      and(
        or(
          and(eq(messengerContacts.ownerUserId, actorUserId), eq(messengerContacts.contactUserId, peerUserId)),
          and(eq(messengerContacts.ownerUserId, peerUserId), eq(messengerContacts.contactUserId, actorUserId)),
        ),
        isNull(messengerContacts.deletedAt),
      ),
    )

  if (!rows.length) throw new Error('CONTACT_NOT_FOUND')

  const now = new Date()
  for (const row of rows) {
    await db
      .update(messengerContacts)
      .set({ deletedAt: now, version: row.version + 1 })
      .where(eq(messengerContacts.id, row.id))
  }

  const key = pairKey(actorUserId, peerUserId)
  for (const [id, invite] of _invites.entries()) {
    if (pairKey(invite.fromUserId, invite.toUserId) === key) {
      _invites.delete(id)
    }
  }

  return { peerUserId }
}

export interface ContactOverviewItem {
  id: string
  displayName: string
  login: string
  createdAt: string
  peerType: 'user' | 'agent'
  description?: string
}

export interface InviteOverviewItem {
  id: string
  peerUserId: string
  displayName: string
  login: string
  direction: 'incoming' | 'outgoing'
  status: MessengerInviteRecord['status']
  createdAt: string
}

export interface DiscoverOverviewItem {
  id: string
  displayName: string
  login: string
  relationship: 'none' | 'incoming' | 'outgoing' | 'contact' | 'agent'
  peerType: 'user' | 'agent'
  description?: string
}

export async function buildContactsOverview(user: MessengerUserRecord, users: MessengerUserRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const contacts = await listContactsForUser(user.id)
  const invites = await listInvitesForUser(user.id)
  const agents = readMessengerConfig().MESSENGER_ENABLE_AGENTS ? await listMessengerAgents() : []

  const matchesQuery = (candidate: MessengerUserRecord) => {
    if (!normalizedQuery) return true
    return candidate.displayName.toLowerCase().includes(normalizedQuery) || candidate.login.toLowerCase().includes(normalizedQuery)
  }

  const contactsOverview: ContactOverviewItem[] = contacts
    .flatMap((contact) => {
      const peer = users.find(u => u.id === contact.userBId)
      if (!peer || !matchesQuery(peer)) return []
      return [{ id: peer.id, displayName: peer.displayName, login: peer.login, createdAt: contact.createdAt, peerType: 'user' as const } satisfies ContactOverviewItem]
    })

  const agentContacts: ContactOverviewItem[] = agents
    .filter(agent => {
      if (!normalizedQuery) return true
      return agent.displayName.toLowerCase().includes(normalizedQuery) || agent.login.toLowerCase().includes(normalizedQuery) || agent.description.toLowerCase().includes(normalizedQuery)
    })
    .map(agent => ({ id: agent.id, displayName: agent.displayName, login: agent.login, createdAt: user.createdAt, peerType: 'agent' as const, description: agent.description }))

  const invitesOverview: InviteOverviewItem[] = invites
    .map((invite) => {
      const peerId = invite.fromUserId === user.id ? invite.toUserId : invite.fromUserId
      const peer = users.find(u => u.id === peerId)
      if (!peer || !matchesQuery(peer)) return null
      return {
        id: invite.id,
        peerUserId: peer.id,
        displayName: peer.displayName,
        login: peer.login,
        direction: invite.toUserId === user.id ? 'incoming' as const : 'outgoing' as const,
        status: invite.status,
        createdAt: invite.createdAt,
      }
    })
    .filter((v): v is InviteOverviewItem => Boolean(v))

  const discoverOverview: DiscoverOverviewItem[] = users
    .filter(candidate => candidate.id !== user.id)
    .filter(matchesQuery)
    .map((candidate) => {
      const isContact = contactsOverview.some(c => c.id === candidate.id)
      if (isContact) return { id: candidate.id, displayName: candidate.displayName, login: candidate.login, relationship: 'contact' as const, peerType: 'user' as const }

      const incoming = invitesOverview.find(i => i.login === candidate.login && i.direction === 'incoming' && i.status === 'pending')
      if (incoming) return { id: candidate.id, displayName: candidate.displayName, login: candidate.login, relationship: 'incoming' as const, peerType: 'user' as const }

      const outgoing = invitesOverview.find(i => i.login === candidate.login && i.direction === 'outgoing' && i.status === 'pending')
      if (outgoing) return { id: candidate.id, displayName: candidate.displayName, login: candidate.login, relationship: 'outgoing' as const, peerType: 'user' as const }

      return { id: candidate.id, displayName: candidate.displayName, login: candidate.login, relationship: 'none' as const, peerType: 'user' as const }
    })

  const discoverAgents: DiscoverOverviewItem[] = normalizedQuery
    ? agents
        .filter(agent => agent.displayName.toLowerCase().includes(normalizedQuery) || agent.login.toLowerCase().includes(normalizedQuery) || agent.description.toLowerCase().includes(normalizedQuery))
        .map(agent => ({ id: agent.id, displayName: agent.displayName, login: agent.login, relationship: 'agent' as const, peerType: 'agent' as const, description: agent.description }))
    : []

  return {
    contacts: [...contactsOverview, ...agentContacts],
    invites: invitesOverview,
    discover: [...discoverOverview, ...discoverAgents],
  }
}
