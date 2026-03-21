import { createHmac } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'

import { useDb } from '~/server/db'
import { contractors, projectContractors, projects, users } from '~/server/db/schema'
import { getAdminSession, getClientSession, getContractorSession } from '~/server/utils/auth'
import { getProjectRelationsSnapshot } from '~/server/utils/project-relations'
import type { ProjectCommunicationBootstrap } from '~/shared/types/communications'

type BootstrapRoomParticipant = ProjectCommunicationBootstrap['roomParticipants'][number]

interface CommunicationTokenPayload {
  actorId: string
  role: 'admin' | 'client' | 'contractor'
  displayName: string
  scopes: string[]
  roomRefs: string[]
  exp: number
}

function createSignature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function signCommunicationToken(payload: CommunicationTokenPayload, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createSignature(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

function buildActorKey(role: string, actorId: string) {
  return `${role}:${actorId}`
}

function normalizeNickname(value?: string | null) {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().replace(/^@+/, '').toLowerCase()
  return normalized || undefined
}

function dedupeParticipants(participants: BootstrapRoomParticipant[]) {
  const unique = new Map<string, BootstrapRoomParticipant>()
  for (const participant of participants) {
    unique.set(participant.actorKey, participant)
  }
  return Array.from(unique.values())
}

async function buildRoomParticipants(projectSlug: string, currentActor: BootstrapRoomParticipant) {
  const db = useDb()
  const [projectOwner] = await db
    .select({
      userId: projects.userId,
      userName: users.name,
      userEmail: users.email,
      userLogin: users.login,
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.slug, projectSlug))
    .limit(1)

  const relations = await getProjectRelationsSnapshot(projectSlug)
  const participants: BootstrapRoomParticipant[] = [currentActor]

  if (projectOwner?.userId) {
    const actorId = String(projectOwner.userId)
    participants.push({
      actorId,
      actorKey: buildActorKey('admin', actorId),
      role: 'admin',
      displayName: projectOwner.userName?.trim() || projectOwner.userEmail?.trim() || 'Дизайнер',
      nickname: normalizeNickname(projectOwner.userLogin),
    })
  }

  const primaryClient = relations?.linked.clients[0]
  if (primaryClient) {
    const actorId = projectSlug
    participants.push({
      actorId,
      actorKey: buildActorKey('client', actorId),
      role: 'client',
      displayName: primaryClient.name?.trim() || 'Клиент проекта',
      nickname: normalizeNickname(primaryClient.messengerNick),
    })
  }

  for (const contractor of relations?.linked.contractors || []) {
    const actorId = String(contractor.id)
    participants.push({
      actorId,
      actorKey: buildActorKey('contractor', actorId),
      role: 'contractor',
      displayName: contractor.name?.trim() || contractor.companyName?.trim() || 'Подрядчик',
      nickname: normalizeNickname(contractor.messengerNick || contractor.login),
    })
  }

  for (const designer of relations?.linked.designers || []) {
    const actorId = String(designer.id)
    participants.push({
      actorId,
      actorKey: buildActorKey('designer', actorId),
      role: 'designer',
      displayName: designer.name?.trim() || designer.companyName?.trim() || 'Дизайнер',
    })
  }

  for (const manager of relations?.linked.managers || []) {
    const actorId = String(manager.id)
    participants.push({
      actorId,
      actorKey: buildActorKey('manager', actorId),
      role: 'manager',
      displayName: manager.name?.trim() || manager.role?.trim() || 'Менеджер',
    })
  }

  for (const seller of relations?.linked.sellers || []) {
    const actorId = String(seller.id)
    participants.push({
      actorId,
      actorKey: buildActorKey('seller', actorId),
      role: 'seller',
      displayName: seller.name?.trim() || seller.companyName?.trim() || 'Поставщик',
      nickname: normalizeNickname(seller.messengerNick),
    })
  }

  return dedupeParticipants(participants)
}

export async function buildProjectCommunicationBootstrap(event: H3Event, projectSlug: string): Promise<ProjectCommunicationBootstrap> {
  const config = useRuntimeConfig()
  const secret = config.communicationsServiceSecret?.trim()
  const serviceUrl = config.public.communicationsServiceUrl?.trim()

  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: 'COMMUNICATIONS_SERVICE_SECRET не настроен' })
  }

  if (!serviceUrl) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_PUBLIC_COMMUNICATIONS_SERVICE_URL не настроен' })
  }

  const db = useDb()
  const [project] = await db
    .select({ id: projects.id, slug: projects.slug, title: projects.title, clientLogin: projects.clientLogin })
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const adminSession = getAdminSession(event)
  if (adminSession) {
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, login: users.login })
      .from(users)
      .where(eq(users.id, adminSession.userId))
      .limit(1)

    const displayName = user?.name?.trim() || user?.email?.trim() || 'Дизайнер'
    const actorId = String(adminSession.userId)
    const token = signCommunicationToken({
      actorId,
      role: 'admin',
      displayName,
      scopes: [],
      roomRefs: [`project:${project.slug}`],
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }, secret)

    const actor = {
      actorId,
      actorKey: `admin:${actorId}`,
      role: 'admin' as const,
      displayName,
      nickname: normalizeNickname(user?.login),
    }

    return {
      serviceUrl,
      accessToken: token,
      roomExternalRef: `project:${project.slug}`,
      roomTitle: project.title,
      actor,
      roomParticipants: await buildRoomParticipants(project.slug, actor),
      e2ee: {
        protocol: 'e2ee-v1',
        keyAgreement: 'ECDH-P256',
        messageCipher: 'AES-GCM-256',
        callMedia: 'WebRTC-DTLS-SRTP',
      },
    }
  }

  const clientSessionSlug = getClientSession(event)
  if (clientSessionSlug === project.slug) {
    const relations = await getProjectRelationsSnapshot(project.slug)
    const displayName = relations?.linked.clients[0]?.name?.trim() || 'Клиент проекта'
    const nickname = normalizeNickname(relations?.linked.clients[0]?.messengerNick || project.clientLogin)
    const actorId = project.slug
    const token = signCommunicationToken({
      actorId,
      role: 'client',
      displayName,
      scopes: [],
      roomRefs: [`project:${project.slug}`],
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }, secret)

    const actor = {
      actorId,
      actorKey: `client:${actorId}`,
      role: 'client' as const,
      displayName,
      nickname,
    }

    return {
      serviceUrl,
      accessToken: token,
      roomExternalRef: `project:${project.slug}`,
      roomTitle: project.title,
      actor,
      roomParticipants: await buildRoomParticipants(project.slug, actor),
      e2ee: {
        protocol: 'e2ee-v1',
        keyAgreement: 'ECDH-P256',
        messageCipher: 'AES-GCM-256',
        callMedia: 'WebRTC-DTLS-SRTP',
      },
    }
  }

  const contractorId = getContractorSession(event)
  if (contractorId) {
    const [contractor] = await db
      .select({ id: contractors.id, name: contractors.name, messengerNick: contractors.messengerNick, login: contractors.login })
      .from(projectContractors)
      .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
      .where(and(eq(projectContractors.projectId, project.id), eq(projectContractors.contractorId, contractorId)))
      .limit(1)

    if (contractor) {
      const actorId = String(contractor.id)
      const displayName = contractor.name?.trim() || 'Подрядчик'
      const nickname = normalizeNickname(contractor.messengerNick || contractor.login)
      const token = signCommunicationToken({
        actorId,
        role: 'contractor',
        displayName,
        scopes: [],
        roomRefs: [`project:${project.slug}`],
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      }, secret)

      const actor = {
        actorId,
        actorKey: `contractor:${actorId}`,
        role: 'contractor' as const,
        displayName,
        nickname,
      }

      return {
        serviceUrl,
        accessToken: token,
        roomExternalRef: `project:${project.slug}`,
        roomTitle: project.title,
        actor,
        roomParticipants: await buildRoomParticipants(project.slug, actor),
        e2ee: {
          protocol: 'e2ee-v1',
          keyAgreement: 'ECDH-P256',
          messageCipher: 'AES-GCM-256',
          callMedia: 'WebRTC-DTLS-SRTP',
        },
      }
    }
  }

  throw createError({ statusCode: 403, statusMessage: 'Нет доступа к коммуникациям проекта' })
}