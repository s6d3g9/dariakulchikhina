import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

import { listMessengerAgents } from './agent-store.ts'
import type { MessengerUserRecord } from './auth-store.ts'
import { readMessengerConfig } from './config.ts'
import { resolveMessengerDataPath } from './storage-paths.ts'

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

interface ContactsFile {
  contacts: MessengerContactRecord[]
  invites: MessengerInviteRecord[]
}

const STORAGE_PATH = resolveMessengerDataPath('contacts.json')

function normalizePair(leftId: string, rightId: string) {
  return [leftId, rightId].sort()
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readContactsFile(): Promise<ContactsFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<ContactsFile>
    return {
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts as MessengerContactRecord[] : [],
      invites: Array.isArray(parsed.invites) ? parsed.invites as MessengerInviteRecord[] : [],
    }
  } catch {
    return {
      contacts: [],
      invites: [],
    }
  }
}

async function writeContactsFile(payload: ContactsFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

function isContactWithUser(contact: MessengerContactRecord, userId: string) {
  return contact.userAId === userId || contact.userBId === userId
}

function getPeerId(contact: MessengerContactRecord, userId: string) {
  return contact.userAId === userId ? contact.userBId : contact.userAId
}

export async function listContactsForUser(userId: string) {
  const payload = await readContactsFile()
  return payload.contacts.filter(contact => isContactWithUser(contact, userId))
}

export async function listInvitesForUser(userId: string) {
  const payload = await readContactsFile()
  return payload.invites.filter(invite => invite.fromUserId === userId || invite.toUserId === userId)
}

export async function createInvite(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) {
    throw new Error('SELF_INVITE')
  }

  const payload = await readContactsFile()
  const [userAId, userBId] = normalizePair(fromUserId, toUserId)
  const hasContact = payload.contacts.some(contact => contact.userAId === userAId && contact.userBId === userBId)
  if (hasContact) {
    throw new Error('ALREADY_CONTACTS')
  }

  const existingInvite = payload.invites.find(invite => {
    const samePair = normalizePair(invite.fromUserId, invite.toUserId).join(':') === `${userAId}:${userBId}`
    return samePair && invite.status === 'pending'
  })
  if (existingInvite) {
    throw new Error('INVITE_EXISTS')
  }

  const now = new Date().toISOString()
  const invite: MessengerInviteRecord = {
    id: randomUUID(),
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  payload.invites.push(invite)
  await writeContactsFile(payload)
  return invite
}

export async function respondToInvite(inviteId: string, actorUserId: string, nextStatus: 'accepted' | 'rejected') {
  const payload = await readContactsFile()
  const invite = payload.invites.find(item => item.id === inviteId)
  if (!invite) {
    throw new Error('INVITE_NOT_FOUND')
  }

  if (invite.toUserId !== actorUserId) {
    throw new Error('INVITE_FORBIDDEN')
  }

  if (invite.status !== 'pending') {
    throw new Error('INVITE_ALREADY_RESOLVED')
  }

  invite.status = nextStatus
  invite.updatedAt = new Date().toISOString()

  if (nextStatus === 'accepted') {
    const [userAId, userBId] = normalizePair(invite.fromUserId, invite.toUserId)
    const exists = payload.contacts.some(contact => contact.userAId === userAId && contact.userBId === userBId)
    if (!exists) {
      payload.contacts.push({
        id: randomUUID(),
        userAId,
        userBId,
        createdAt: invite.updatedAt,
      })
    }
  }

  await writeContactsFile(payload)
  return invite
}

export async function deleteContactForUser(actorUserId: string, peerUserId: string) {
  const payload = await readContactsFile()
  const [userAId, userBId] = normalizePair(actorUserId, peerUserId)
  const contactIndex = payload.contacts.findIndex(contact => contact.userAId === userAId && contact.userBId === userBId)

  if (contactIndex === -1) {
    throw new Error('CONTACT_NOT_FOUND')
  }

  payload.contacts.splice(contactIndex, 1)
  payload.invites = payload.invites.filter((invite) => {
    const [inviteUserAId, inviteUserBId] = normalizePair(invite.fromUserId, invite.toUserId)
    return inviteUserAId !== userAId || inviteUserBId !== userBId
  })

  await writeContactsFile(payload)
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
    if (!normalizedQuery) {
      return true
    }

    return candidate.displayName.toLowerCase().includes(normalizedQuery) || candidate.login.toLowerCase().includes(normalizedQuery)
  }

  const contactsOverview: ContactOverviewItem[] = contacts
    .map((contact) => {
      const peerId = getPeerId(contact, user.id)
      const peer = users.find(item => item.id === peerId)
      if (!peer || !matchesQuery(peer)) {
        return null
      }

      return {
        id: peer.id,
        displayName: peer.displayName,
        login: peer.login,
        createdAt: contact.createdAt,
        peerType: 'user',
      }
    })
    .filter((value): value is ContactOverviewItem => Boolean(value))

  const agentContacts: ContactOverviewItem[] = agents
    .filter((agent) => {
      if (!normalizedQuery) {
        return true
      }

      return agent.displayName.toLowerCase().includes(normalizedQuery)
        || agent.login.toLowerCase().includes(normalizedQuery)
        || agent.description.toLowerCase().includes(normalizedQuery)
    })
    .map(agent => ({
      id: agent.id,
      displayName: agent.displayName,
      login: agent.login,
      createdAt: user.createdAt,
      peerType: 'agent',
      description: agent.description,
    }))

  const invitesOverview: InviteOverviewItem[] = invites
    .map((invite) => {
      const peerId = invite.fromUserId === user.id ? invite.toUserId : invite.fromUserId
      const peer = users.find(item => item.id === peerId)
      if (!peer || !matchesQuery(peer)) {
        return null
      }

      return {
        id: invite.id,
        peerUserId: peer.id,
        displayName: peer.displayName,
        login: peer.login,
        direction: invite.toUserId === user.id ? 'incoming' : 'outgoing',
        status: invite.status,
        createdAt: invite.createdAt,
      }
    })
    .filter((value): value is InviteOverviewItem => Boolean(value))

  const discoverOverview: DiscoverOverviewItem[] = users
    .filter(candidate => candidate.id !== user.id)
    .filter(matchesQuery)
    .map((candidate) => {
      const isContact = contactsOverview.some(item => item.id === candidate.id)
      if (isContact) {
        return {
          id: candidate.id,
          displayName: candidate.displayName,
          login: candidate.login,
          relationship: 'contact' as const,
          peerType: 'user' as const,
        }
      }

      const incoming = invitesOverview.find(item => item.login === candidate.login && item.direction === 'incoming' && item.status === 'pending')
      if (incoming) {
        return {
          id: candidate.id,
          displayName: candidate.displayName,
          login: candidate.login,
          relationship: 'incoming' as const,
          peerType: 'user' as const,
        }
      }

      const outgoing = invitesOverview.find(item => item.login === candidate.login && item.direction === 'outgoing' && item.status === 'pending')
      if (outgoing) {
        return {
          id: candidate.id,
          displayName: candidate.displayName,
          login: candidate.login,
          relationship: 'outgoing' as const,
          peerType: 'user' as const,
        }
      }

      return {
        id: candidate.id,
        displayName: candidate.displayName,
        login: candidate.login,
        relationship: 'none' as const,
        peerType: 'user' as const,
      }
    })

  const discoverAgents: DiscoverOverviewItem[] = normalizedQuery
    ? agents
        .filter(agent => agent.displayName.toLowerCase().includes(normalizedQuery)
          || agent.login.toLowerCase().includes(normalizedQuery)
          || agent.description.toLowerCase().includes(normalizedQuery))
        .map(agent => ({
          id: agent.id,
          displayName: agent.displayName,
          login: agent.login,
          relationship: 'agent' as const,
          peerType: 'agent' as const,
          description: agent.description,
        }))
    : []

  return {
    contacts: [...contactsOverview, ...agentContacts],
    invites: invitesOverview,
    discover: [...discoverOverview, ...discoverAgents],
  }
}