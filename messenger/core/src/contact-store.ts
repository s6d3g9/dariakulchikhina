import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

import type { MessengerUserRecord } from './auth-store.ts'

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

const STORAGE_PATH = resolve(process.cwd(), 'data', 'contacts.json')

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

export interface ContactOverviewItem {
  id: string
  displayName: string
  login: string
  createdAt: string
}

export interface InviteOverviewItem {
  id: string
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
  relationship: 'none' | 'incoming' | 'outgoing' | 'contact'
}

export async function buildContactsOverview(user: MessengerUserRecord, users: MessengerUserRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const contacts = await listContactsForUser(user.id)
  const invites = await listInvitesForUser(user.id)

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
      }
    })
    .filter((value): value is ContactOverviewItem => Boolean(value))

  const invitesOverview: InviteOverviewItem[] = invites
    .map((invite) => {
      const peerId = invite.fromUserId === user.id ? invite.toUserId : invite.fromUserId
      const peer = users.find(item => item.id === peerId)
      if (!peer || !matchesQuery(peer)) {
        return null
      }

      return {
        id: invite.id,
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
        }
      }

      const incoming = invitesOverview.find(item => item.login === candidate.login && item.direction === 'incoming' && item.status === 'pending')
      if (incoming) {
        return {
          id: candidate.id,
          displayName: candidate.displayName,
          login: candidate.login,
          relationship: 'incoming' as const,
        }
      }

      const outgoing = invitesOverview.find(item => item.login === candidate.login && item.direction === 'outgoing' && item.status === 'pending')
      if (outgoing) {
        return {
          id: candidate.id,
          displayName: candidate.displayName,
          login: candidate.login,
          relationship: 'outgoing' as const,
        }
      }

      return {
        id: candidate.id,
        displayName: candidate.displayName,
        login: candidate.login,
        relationship: 'none' as const,
      }
    })

  return {
    contacts: contactsOverview,
    invites: invitesOverview,
    discover: discoverOverview,
  }
}