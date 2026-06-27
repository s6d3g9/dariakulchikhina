import { COMMUNICATION_ACTOR_ROLES } from '~/shared/types/communications'
import type {
  ApiV1ClientProjectCommunicationsBootstrap,
  ApiV1ClientProjectControlState,
} from '~/shared/types/api-v1'
import type {
  CommunicationActorRole,
  ProjectCommunicationActor,
  ProjectCommunicationBootstrap,
  ProjectCommunicationRoomParticipant,
} from '~/shared/types/communications'

import { createApiV1ClientSafeCoordinationBrief } from './api-v1-client-control'

const COMMUNICATION_ROLE_SET = new Set<string>(COMMUNICATION_ACTOR_ROLES)

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeCommunicationRole(value: unknown): CommunicationActorRole {
  const role = safeString(value, 40)
  return COMMUNICATION_ROLE_SET.has(role) ? role as CommunicationActorRole : 'service'
}

function normalizeNickname(value: unknown) {
  const nickname = safeString(value, 33).replace(/^@+/, '').toLowerCase()
  return nickname || undefined
}

function createActorKey(role: CommunicationActorRole, actorId: string, fallback: unknown) {
  return safeString(fallback, 160) || `${role}:${actorId}`
}

function sanitizeActor(actor: ProjectCommunicationActor): ProjectCommunicationActor {
  const role = safeCommunicationRole(actor.role)
  const actorId = safeString(actor.actorId, 120)
  const displayName = safeString(actor.displayName, 240) || 'Участник проекта'
  const nickname = normalizeNickname(actor.nickname)

  return {
    actorId,
    actorKey: createActorKey(role, actorId, actor.actorKey),
    role,
    displayName,
    ...(nickname ? { nickname } : {}),
  }
}

function sanitizeParticipant(participant: ProjectCommunicationRoomParticipant): ProjectCommunicationRoomParticipant {
  const role = safeCommunicationRole(participant.role)
  const actorId = safeString(participant.actorId, 120)
  const displayName = safeString(participant.displayName, 240) || 'Участник проекта'
  const nickname = normalizeNickname(participant.nickname)

  return {
    actorId,
    actorKey: createActorKey(role, actorId, participant.actorKey),
    role,
    displayName,
    ...(nickname ? { nickname } : {}),
  }
}

function sanitizeParticipants(participants: ProjectCommunicationRoomParticipant[]) {
  const unique = new Map<string, ProjectCommunicationRoomParticipant>()

  for (const participant of participants) {
    const sanitized = sanitizeParticipant(participant)
    if (!sanitized.actorId || !sanitized.actorKey) continue
    unique.set(sanitized.actorKey, sanitized)
  }

  return Array.from(unique.values())
}

function sanitizeE2ee(bootstrap: ProjectCommunicationBootstrap): ProjectCommunicationBootstrap['e2ee'] {
  return {
    ...bootstrap.e2ee,
    protocol: 'e2ee-v1',
    keyAgreement: 'ECDH-P256',
    messageCipher: 'AES-GCM-256',
    callMedia: 'WebRTC-DTLS-SRTP',
  }
}

export function createApiV1ClientProjectCommunicationsBootstrapDto(
  bootstrap: ProjectCommunicationBootstrap,
  control: ApiV1ClientProjectControlState,
): ApiV1ClientProjectCommunicationsBootstrap {
  return {
    serviceUrl: safeString(bootstrap.serviceUrl, 1000),
    accessToken: safeString(bootstrap.accessToken, 6000),
    roomExternalRef: safeString(bootstrap.roomExternalRef, 255),
    roomTitle: safeString(bootstrap.roomTitle, 255) || 'Коммуникации проекта',
    actor: sanitizeActor(bootstrap.actor),
    roomParticipants: sanitizeParticipants(bootstrap.roomParticipants || []),
    coordination: createApiV1ClientSafeCoordinationBrief(control),
    callInsights: (control.callInsights || []).slice(0, 6),
    e2ee: sanitizeE2ee(bootstrap),
  }
}
