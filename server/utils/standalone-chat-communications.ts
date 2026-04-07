import { createHmac } from 'node:crypto'
import type { H3Event } from 'h3'

import { requireChatSession } from '~/server/utils/auth'
import { findStandaloneChatUserById, listStandaloneChatUsers } from '~/server/utils/standalone-chat-users'
import type { ProjectCommunicationBootstrap } from '~/shared/types/communications/communications'

type BootstrapParticipant = ProjectCommunicationBootstrap['roomParticipants'][number]

interface CommunicationTokenPayload {
  actorId: string
  role: 'service'
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

function dedupeParticipants(participants: BootstrapParticipant[]) {
  const unique = new Map<string, BootstrapParticipant>()
  for (const participant of participants) {
    unique.set(participant.actorKey, participant)
  }
  return Array.from(unique.values())
}

export async function buildStandaloneChatBootstrap(event: H3Event): Promise<ProjectCommunicationBootstrap> {
  const { chatUserId } = requireChatSession(event)
  const config = useRuntimeConfig()
  const secret = config.communicationsServiceSecret?.trim()
  const serviceUrl = config.public.communicationsServiceUrl?.trim()

  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: 'COMMUNICATIONS_SERVICE_SECRET не настроен' })
  }

  if (!serviceUrl) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_PUBLIC_COMMUNICATIONS_SERVICE_URL не настроен' })
  }

  const currentUser = await findStandaloneChatUserById(chatUserId)
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Сессия standalone-чата устарела' })
  }

  const participants = dedupeParticipants((await listStandaloneChatUsers()).map((user) => ({
    actorId: user.id,
    actorKey: buildActorKey('service', user.id),
    role: 'service',
    displayName: user.displayName,
    nickname: user.nickname,
  })))

  const actor = {
    actorId: currentUser.id,
    actorKey: buildActorKey('service', currentUser.id),
    role: 'service' as const,
    displayName: currentUser.displayName,
    nickname: currentUser.nickname,
  }

  const accessToken = signCommunicationToken({
    actorId: currentUser.id,
    role: 'service',
    displayName: currentUser.displayName,
    scopes: [],
    roomRefs: ['standalone:lobby'],
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  }, secret)

  return {
    serviceUrl,
    accessToken,
    roomExternalRef: 'standalone:lobby',
    roomTitle: 'Standalone Chat',
    actor,
    roomParticipants: participants,
    coordination: {
      summary: {
        healthStatus: 'stable' as const,
        healthLabel: 'Ок',
        activePhaseTitle: '',
        activeSprintTitle: '',
        blockerCount: 0,
        overdueSprints: 0,
        nextReviewDate: '',
      },
      agents: [],
      playbook: [],
      recommendations: [],
    },
    callInsights: [],
    e2ee: {
      protocol: 'e2ee-v1',
      keyAgreement: 'ECDH-P256',
      messageCipher: 'AES-GCM-256',
      callMedia: 'WebRTC-DTLS-SRTP',
    },
  }
}