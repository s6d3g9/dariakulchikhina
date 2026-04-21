const activeLiveKitRooms = new Set<string>()

import { joinLiveKitRoomAsBot } from '../calls/livekit-stt-bot.ts'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { homedir } from 'node:os'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)

import Fastify, { type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import websocket from '@fastify/websocket'
import { z } from 'zod'

import { getMessengerAgentSettings, resolveMessengerAgentWorkspacePath, updateMessengerAgentGraph, updateMessengerAgentSettings } from '../agents/agent-settings-store.ts'
import { getMessengerAgentKnowledgeStatus, reindexMessengerAgentKnowledge } from '../agents/agent-knowledge-store.ts'
import { getMessengerAgentKnowledgePreset } from '../agents/agent-knowledge-presets.ts'
import { isMessengerAgentLlmConfigured } from '../agents/agent-llm.ts'
import { buildMessengerCallAnalysis, type MessengerCallAnalysisToolId } from '../calls/call-analysis-service.ts'
import { listMessengerAgentWorkspace, readMessengerAgentWorkspaceFile } from '../agents/agent-workspace-store.ts'
import { appendMessengerAgentRunEvent, createRun, findRunningCliSessionForAgent, getAgentIngestToken, getMessengerAgentRunById, isCliAgent, listMessengerAgentEdgePayloads, listMessengerAgentRuns } from '../agents/agent-run-store.ts'
import { buildMessengerAgentReply, findMessengerAgentById, listMessengerAgents } from '../agents/agent-store.ts'
import { authenticateMessengerUser, findMessengerUserById, listMessengerUsers, registerMessengerUser } from '../auth/auth-store.ts'
import { createMessengerToken, readBearerToken, verifyMessengerToken } from '../auth/auth.ts'
import { addAgentMessageToConversation, addAttachmentMessageToConversation, addMessageToConversation, deleteConversationForUser, deleteMessageFromConversation, editMessageInConversation, findConversationById, findOrCreateAgentConversation, findOrCreateDirectConversation, findOrCreateSecretConversation, forwardMessageToConversation, getConversationKeyPackageForUser, listConversationsForUser, listMessagesForConversation, markConversationReadByUser, saveConversationKeyPackages, toggleReactionInConversation } from '../conversations/conversation-store.ts'
import { buildContactsOverview, createInvite, deleteContactForUser, respondToInvite } from '../contacts/contact-store.ts'
import { findMessengerDevicePublicKeyByUserId, saveMessengerDevicePublicKey } from '../crypto/crypto-store.ts'
import { buildMessengerProjectFromTemplate, buildMessengerProjectManagerBrief, buildMessengerProjectSyncBrief, deleteMessengerProject, deleteMessengerProjectAgreement, deleteMessengerProjectCabinetLink, deleteMessengerProjectSubject, getMessengerProject, listMessengerProjectTemplates, listMessengerProjects, upsertMessengerProject, upsertMessengerProjectAgreement, upsertMessengerProjectCabinetLink, upsertMessengerProjectSubject } from '../project-engine/project-engine-store.ts'
import { readMessengerConfig } from '../config.ts'
import { registerIngestRoutes } from '../agents/ingest-handler.ts'
import { registerOrchestrationRoutes } from '../agents/orchestration-handler.ts'
import { registerProjectsRoutes } from '../projects/projects-handler.ts'
import { MESSENGER_UPLOADS_ROOT, storeUploadedMedia } from '../media/media-store.ts'
import { hasMessengerTranscriptionHttpBackend, isMessengerTranscriptionConfigured, transcribeMessengerAudioChunk } from '../transcription/transcription-service.ts'
import { getMessengerUserAiSettings, updateMessengerUserAiSettings } from '../profile/user-ai-settings-store.ts'

function isMessengerCorsOriginAllowed(origin: string, allowedOrigins: string[]) {
  if (allowedOrigins.includes(origin)) {
    return true
  }

  let requestUrl: URL

  try {
    requestUrl = new URL(origin)
  } catch {
    return false
  }

  return allowedOrigins.some((allowedOrigin) => {
    let allowedUrl: URL

    try {
      allowedUrl = new URL(allowedOrigin)
    } catch {
      return false
    }

    if (allowedUrl.protocol !== requestUrl.protocol || allowedUrl.hostname !== requestUrl.hostname) {
      return false
    }

    if (allowedUrl.port) {
      return allowedUrl.port === requestUrl.port
    }

    return true
  })
}

export async function createMessengerServer() {
  const config = readMessengerConfig()
  const allowedCorsOrigins = config.MESSENGER_CORE_CORS_ORIGIN
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
  const app = Fastify({
    logger: {
      level: config.MESSENGER_CORE_LOG_LEVEL,
    },
  })

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }

      callback(null, isMessengerCorsOriginAllowed(origin, allowedCorsOrigins))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 20 * 1024 * 1024,
    },
  })
  await app.register(fastifyStatic, {
    root: MESSENGER_UPLOADS_ROOT,
    prefix: '/uploads/',
  })
  await app.register(websocket)

  app.addHook('onRequest', async (request, reply) => {
    if (!config.MESSENGER_ENABLE_AGENTS && request.raw.url?.startsWith('/agents')) {
      return reply.code(404).send({ error: 'NOT_FOUND' })
    }
  })

  type MessengerRealtimeSocket = {
    send: (payload: string) => void
    close: (code?: number, reason?: string) => void
    readyState: number
    on: (event: string, cb: (...args: any[]) => void) => void
  }

  type MessengerRealtimeClient = {
    connectionId: string
    userId: string
    clientId: string
    socket: MessengerRealtimeSocket
    focused: boolean
    visible: boolean
    visibilityState: string
    isMobile: boolean
    lastSeenAt: number
  }

  type MessengerCallRoute = {
    callId: string
    conversationId: string
    participants: Record<string, string>
    updatedAt: number
  }

  const clients = new Map<string, MessengerRealtimeClient>()
  const callRoutes = new Map<string, MessengerCallRoute>()
  const channelSubscriptions = new Map<string, Set<string>>() // channel → Set<connectionId>

  function broadcastToChannel(channel: string, event: Record<string, unknown>) {
    const subscribers = channelSubscriptions.get(channel)
    if (!subscribers) return
    const payload = JSON.stringify(event)
    for (const connectionId of subscribers) {
      const client = clients.get(connectionId)
      if (client?.socket.readyState === 1) {
        client.socket.send(payload)
      }
    }
  }

  function emitToUsers(userIds: string[], event: Record<string, unknown>) {
    const uniqueUserIds = new Set(userIds)
    const payload = JSON.stringify(event)

    for (const client of clients.values()) {
      if (!uniqueUserIds.has(client.userId)) {
        continue
      }

      if (client.socket.readyState !== 1) {
        continue
      }

      client.socket.send(payload)
    }
  }

  function emitToClient(client: MessengerRealtimeClient | null | undefined, event: Record<string, unknown>) {
    if (!client || client.socket.readyState !== 1) {
      return false
    }

    client.socket.send(JSON.stringify(event))
    return true
  }

  function rememberCallRoute(callId: string, conversationId: string, userId: string, clientId: string) {
    if (!callId || !userId || !clientId) {
      return
    }

    const existingRoute = callRoutes.get(callId)
    callRoutes.set(callId, {
      callId,
      conversationId: conversationId || existingRoute?.conversationId || '',
      participants: {
        ...(existingRoute?.participants || {}),
        [userId]: clientId,
      },
      updatedAt: Date.now(),
    })
  }

  function forgetCallRoute(callId: string) {
    if (!callId) {
      return
    }

    callRoutes.delete(callId)
  }

  function scoreRealtimeClient(client: MessengerRealtimeClient, preferredClientId = '') {
    let score = 0

    if (preferredClientId && client.clientId === preferredClientId) {
      score += 1000
    }

    if (client.visible && client.focused) {
      score += 400
    } else if (client.visible) {
      score += 250
    } else if (client.focused) {
      score += 150
    }

    if (client.isMobile) {
      score += 25
    }

    return score
  }

  function selectPreferredClientForUser(userId: string, preferredClientId = '') {
    const connectedClients = Array.from(clients.values())
      .filter(client => client.userId === userId && client.socket.readyState === 1)
      .sort((left, right) => {
        const scoreDelta = scoreRealtimeClient(right, preferredClientId) - scoreRealtimeClient(left, preferredClientId)
        if (scoreDelta !== 0) {
          return scoreDelta
        }

        return right.lastSeenAt - left.lastSeenAt
      })

    return connectedClients[0] || null
  }

  function resolveTargetClientForCall(callId: string, conversationId: string, targetUserId: string) {
    const existingRoute = callRoutes.get(callId)
    const routedClientId = existingRoute?.participants[targetUserId] || ''
    const nextClient = selectPreferredClientForUser(targetUserId, routedClientId)

    if (nextClient) {
      rememberCallRoute(callId, conversationId, targetUserId, nextClient.clientId)
    }

    return nextClient
  }

  const authSchema = z.object({
    login: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9._-]+$/),
    password: z.string().min(8).max(128),
    displayName: z.string().trim().min(2).max(80).optional(),
  })
  const contactsQuerySchema = z.object({
    query: z.string().trim().max(80).optional(),
  })
  const inviteSchema = z.object({
    targetUserId: z.string().uuid(),
  })
  const inviteParamsSchema = z.object({
    inviteId: z.string().uuid(),
  })
  const conversationsQuerySchema = z.object({
    query: z.string().trim().max(80).optional(),
  })
  const directConversationSchema = z.object({
    peerUserId: z.string().uuid(),
  })
  const agentParamsSchema = z.object({
    agentId: z.string().trim().min(1).max(120),
  })
  const agentSettingsSchema = z.object({
    subscriptionId: z.string().trim().max(120).optional().default('builtin-claude-code-cli'),
    model: z.string().trim().min(1).max(120),
    effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).optional().default('medium'),
    apiKey: z.string().trim().max(2048).optional().default(''),
    ssh: z.object({
      host: z.string().trim().max(255).optional().default(''),
      login: z.string().trim().max(120).optional().default(''),
      port: z.coerce.number().int().min(1).max(65535).optional().default(22),
      privateKey: z.string().trim().max(32768).optional().default(''),
      workspacePath: z.string().trim().max(2048).optional().default(''),
      repositories: z.array(z.object({
        id: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
        path: z.string().trim().max(2048).optional().default(''),
        type: z.enum(['ssh', 'github', 'gitlab', 'bitbucket', 'local', 'custom']).optional().default('ssh'),
        url: z.string().trim().max(2048).optional().default(''),
        owner: z.string().trim().max(120).optional().default(''),
        repo: z.string().trim().max(120).optional().default(''),
        branch: z.string().trim().max(120).optional().default(''),
        token: z.string().trim().max(2048).optional().default(''),
        instanceUrl: z.string().trim().max(2048).optional().default(''),
        protocol: z.string().trim().max(60).optional().default(''),
        credentials: z.string().trim().max(4096).optional().default(''),
      })).max(12).optional().default([]),
      activeRepositoryId: z.string().trim().max(120).optional().default(''),
    }).optional().default({
      host: '',
      login: '',
      port: 22,
      privateKey: '',
      workspacePath: '',
      repositories: [],
      activeRepositoryId: '',
    }),
    knowledge: z.object({
      sources: z.array(z.object({
        id: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(160),
        repositoryId: z.string().trim().max(120).optional().default(''),
        path: z.string().trim().min(1).max(2048),
        type: z.enum(['rag', 'vector']).default('rag'),
        enabled: z.boolean().optional().default(true),
      })).max(32).default([]),
    }).optional().default({
      sources: [],
    }),
    connections: z.array(z.object({
      targetAgentId: z.string().trim().min(1).max(120),
      mode: z.enum(['review', 'enrich', 'validate', 'summarize', 'route']).default('review'),
    })).max(12).default([]),
    graphPosition: z.object({
      x: z.number().int().min(0).max(5000),
      y: z.number().int().min(0).max(5000),
    }).optional(),
  })
  const agentGraphSchema = z.object({
    graph: z.record(z.string().trim().min(1).max(120), z.object({
      connections: z.array(z.object({
        targetAgentId: z.string().trim().min(1).max(120),
        mode: z.enum(['review', 'enrich', 'validate', 'summarize', 'route']).default('review'),
      })).max(12).default([]),
      graphPosition: z.object({
        x: z.number().int().min(0).max(5000),
        y: z.number().int().min(0).max(5000),
      }),
    })),
  })
  const agentRunsQuerySchema = z.object({
    agentId: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(30).default(10),
  })
  const agentRunParamsSchema = z.object({
    runId: z.string().trim().min(1).max(120),
  })
  const agentEdgePayloadsQuerySchema = z.object({
    agentId: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(80).default(24),
  })
  const agentWorkspaceQuerySchema = z.object({
    path: z.string().trim().max(2048).optional().default(''),
  })
  const projectParamsSchema = z.object({
    projectId: z.string().trim().min(1).max(160),
  })
  const projectSyncBriefQuerySchema = z.object({
    contextId: z.string().trim().max(160).optional(),
  })
  const projectCapabilitySchema = z.enum(['frontend', 'backend', 'logic', 'styles', 'data', 'qa', 'docs', 'integration'])
  const projectCoverageStatusSchema = z.enum(['planned', 'in-progress', 'review', 'blocked', 'done'])
  const projectTargetKindSchema = z.enum(['platform', 'messenger', 'external'])
  const projectContextKindSchema = z.enum(['cabinet', 'module', 'page', 'feature', 'api', 'shared'])
  const projectRoleSchema = z.enum(['admin', 'client', 'manager', 'designer', 'contractor', 'shared', 'external'])
  const projectAgentRoleSchema = z.enum(['lead', 'support', 'review', 'observer'])
  const projectSubjectKindSchema = z.enum(['client', 'manager', 'designer', 'contractor', 'admin', 'vendor', 'partner', 'external'])
  const projectSubjectStatusSchema = z.enum(['active', 'review', 'blocked', 'done'])
  const projectCabinetLinkKindSchema = z.enum(['mirrors', 'depends-on', 'handoff', 'approval', 'shared-data'])
  const projectAgreementTypeSchema = z.enum(['scope', 'delivery', 'approval', 'payment', 'change-request', 'support'])
  const projectAgreementStatusSchema = z.enum(['draft', 'active', 'review', 'blocked', 'closed'])
  const projectSyncContractSchema = z.object({
    frontendPaths: z.array(z.string().trim().min(1).max(2048)).max(32).default([]),
    backendPaths: z.array(z.string().trim().min(1).max(2048)).max(32).default([]),
    sharedPaths: z.array(z.string().trim().min(1).max(2048)).max(32).default([]),
    styleRefs: z.array(z.string().trim().min(1).max(2048)).max(32).default([]),
    logicRefs: z.array(z.string().trim().min(1).max(2048)).max(32).default([]),
    docsPaths: z.array(z.string().trim().min(1).max(2048)).max(32).default([]),
  }).default({
    frontendPaths: [],
    backendPaths: [],
    sharedPaths: [],
    styleRefs: [],
    logicRefs: [],
    docsPaths: [],
  })
  const projectContextSchema = z.object({
    id: z.string().trim().min(1).max(160),
    kind: projectContextKindSchema.default('feature'),
    label: z.string().trim().min(1).max(160),
    ownerRole: projectRoleSchema.default('shared'),
    status: projectCoverageStatusSchema.default('planned'),
    route: z.string().trim().max(2048).optional().default(''),
    summary: z.string().trim().max(4000).optional().default(''),
    tags: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
    capabilities: z.array(z.object({
      capability: projectCapabilitySchema,
      status: projectCoverageStatusSchema.default('planned'),
      notes: z.string().trim().max(1000).optional().default(''),
    })).max(16).default([]),
    syncContract: projectSyncContractSchema,
    assignedAgentIds: z.array(z.string().trim().min(1).max(120)).max(16).default([]),
  })
  const projectAgentBindingSchema = z.object({
    id: z.string().trim().min(1).max(160),
    agentId: z.string().trim().min(1).max(120),
    contextId: z.string().trim().min(1).max(160),
    role: projectAgentRoleSchema.default('support'),
    responsibilities: z.array(projectCapabilitySchema).max(16).default([]),
    notes: z.string().trim().max(1000).optional().default(''),
    active: z.boolean().optional().default(true),
  })
  const projectSubjectSchema = z.object({
    id: z.string().trim().min(1).max(160).optional(),
    label: z.string().trim().min(1).max(160),
    kind: projectSubjectKindSchema.default('external'),
    status: projectSubjectStatusSchema.default('active'),
    contextIds: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
    managerAgentIds: z.array(z.string().trim().min(1).max(120)).max(16).default([]),
    tags: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  const projectAgreementSchema = z.object({
    id: z.string().trim().min(1).max(160).optional(),
    label: z.string().trim().min(1).max(160),
    type: projectAgreementTypeSchema.default('scope'),
    status: projectAgreementStatusSchema.default('draft'),
    subjectIds: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
    contextIds: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
    managerAgentIds: z.array(z.string().trim().min(1).max(120)).max(16).default([]),
    summary: z.string().trim().max(4000).optional().default(''),
    terms: z.array(z.string().trim().min(1).max(1000)).max(32).default([]),
    dueAt: z.string().trim().max(80).optional().default(''),
  })
  const projectCabinetLinkSchema = z.object({
    id: z.string().trim().min(1).max(160).optional(),
    sourceContextId: z.string().trim().min(1).max(160),
    targetContextId: z.string().trim().min(1).max(160),
    kind: projectCabinetLinkKindSchema.default('shared-data'),
    status: projectCoverageStatusSchema.default('planned'),
    sharedCapabilities: z.array(projectCapabilitySchema).max(16).default([]),
    agreementIds: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  const projectEntityParamsSchema = z.object({
    projectId: z.string().trim().min(1).max(160),
    entityId: z.string().trim().min(1).max(160),
  })
  const projectUpsertSchema = z.object({
    id: z.string().trim().min(1).max(160).optional(),
    slug: z.string().trim().min(1).max(160),
    label: z.string().trim().min(1).max(160),
    description: z.string().trim().max(4000).optional().default(''),
    targetKind: projectTargetKindSchema.default('platform'),
    repositoryId: z.string().trim().max(120).optional().default(''),
    rootPath: z.string().trim().max(2048).optional().default(''),
    defaultBranch: z.string().trim().max(120).optional().default('main'),
    contexts: z.array(projectContextSchema).max(64).default([]),
    agentBindings: z.array(projectAgentBindingSchema).max(128).default([]),
    subjects: z.array(projectSubjectSchema).max(128).default([]),
    cabinetLinks: z.array(projectCabinetLinkSchema).max(128).default([]),
    agreements: z.array(projectAgreementSchema).max(128).default([]),
  })
  const projectBootstrapSchema = z.object({
    templateId: z.string().trim().min(1).max(160),
    slug: z.string().trim().min(1).max(160).optional(),
    label: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    repositoryId: z.string().trim().max(120).optional(),
    rootPath: z.string().trim().max(2048).optional(),
    defaultBranch: z.string().trim().max(120).optional(),
  })

  function buildAgentSettingsResponse(settings: Awaited<ReturnType<typeof getMessengerAgentSettings>>) {
    const workspacePath = resolveMessengerAgentWorkspacePath(settings)

    return {
      ...settings,
      ssh: {
        ...settings.ssh,
        workspacePath,
      },
      apiKeyConfigured: Boolean(settings.apiKey),
      sshConfigured: Boolean(settings.ssh.host && settings.ssh.login && settings.ssh.privateKey && workspacePath),
    }
  }

  function buildUserAiSettingsResponse(settings: Awaited<ReturnType<typeof getMessengerUserAiSettings>>) {
    const analysisConfigured = isMessengerAgentLlmConfigured({
      model: config.MESSENGER_AGENT_MODEL,
      apiKey: config.MESSENGER_AGENT_API_KEY,
    })
    const transcriptionConfigured = isMessengerTranscriptionConfigured(config)
    const transcriptionApiConfigured = hasMessengerTranscriptionHttpBackend(config)
    const interpretation = Array.from(new Set([
      settings.interpretationModel,
      config.MESSENGER_AGENT_MODEL,
      'gemma3:27b',
      'gpt-5.4',
      'gpt-4.1-mini',
      'gpt-4o-mini',
    ].filter(Boolean)))
    const summary = Array.from(new Set([
      settings.summaryModel,
      config.MESSENGER_AGENT_MODEL,
      'gemma3:27b',
      'gpt-5.4',
      'gpt-4.1-mini',
      'gpt-4o-mini',
    ].filter(Boolean)))
    const transcription = Array.from(new Set([
      settings.transcriptionModel,
      config.MESSENGER_TRANSCRIPTION_MODEL,
      'whisper-large-v3-turbo',
      'gpt-4o-mini-transcribe',
      'gpt-4o-transcribe',
    ].filter(Boolean)))

    return {
      settings,
      modelOptions: {
        interpretation,
        summary,
        transcription,
      },
      configured: {
        analysis: analysisConfigured,
        transcription: transcriptionConfigured,
        interpretationApi: analysisConfigured,
        transcriptionApi: transcriptionApiConfigured,
      },
    }
  }
  const userParamsSchema = z.object({
    userId: z.string().uuid(),
  })
  const contactParamsSchema = z.object({
    peerUserId: z.string().uuid(),
  })
  const conversationParamsSchema = z.object({
    conversationId: z.string().uuid(),
  })
  const messageIdSchema = z.string().trim().min(1).max(64)
  const messageParamsSchema = z.object({
    conversationId: z.string().uuid(),
    messageId: messageIdSchema,
  })
  const publicKeySchema = z.object({
    kty: z.literal('EC'),
    crv: z.literal('P-256'),
    x: z.string().min(1).max(512),
    y: z.string().min(1).max(512),
    ext: z.boolean().optional(),
    key_ops: z.array(z.string().min(1).max(24)).max(8).optional(),
  })
  const encryptedPayloadSchema = z.object({
    algorithm: z.literal('aes-gcm-256'),
    ciphertext: z.string().min(1).max(32768),
    iv: z.string().min(1).max(512),
  })
  const encryptedBinaryPayloadSchema = z.object({
    algorithm: z.literal('aes-gcm-256'),
    iv: z.string().min(1).max(512),
  })
  const klipyAttachmentSchema = z.object({
    id: z.string().trim().min(1).max(255),
    slug: z.string().trim().min(1).max(255),
    kind: z.enum(['gif', 'sticker']),
    title: z.string().trim().min(1).max(255),
    previewUrl: z.string().trim().url().max(2048),
    originalUrl: z.string().trim().url().max(2048),
    mimeType: z.string().trim().min(1).max(120),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  const attachmentMetadataSchema = z.object({
    encryptedFile: encryptedBinaryPayloadSchema.optional(),
    originalName: z.string().trim().min(1).max(255).optional(),
    originalMimeType: z.string().trim().min(1).max(120).optional(),
    klipy: klipyAttachmentSchema.optional(),
  })
  const forwardedSnapshotSchema = z.object({
    messageId: messageIdSchema,
    conversationId: z.string().uuid(),
    senderUserId: z.string().trim().min(1).max(120),
    senderDisplayName: z.string().trim().min(1).max(80),
    body: z.string().trim().max(4000).optional().default(''),
    encryptedBody: encryptedPayloadSchema.optional(),
    kind: z.enum(['text', 'file']),
    attachment: z.object({
      name: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().min(1).max(120),
      size: z.number().int().nonnegative(),
      url: z.string().trim().min(1).max(2048),
      encryptedFile: encryptedBinaryPayloadSchema.optional(),
    }).optional(),
  })
  const messageSchema = z.object({
    body: z.string().trim().max(4000).optional(),
    encryptedBody: encryptedPayloadSchema.optional(),
    replyToMessageId: messageIdSchema.optional(),
    commentOnMessageId: messageIdSchema.optional(),
    forwardedMessageId: messageIdSchema.optional(),
    forwardedFrom: forwardedSnapshotSchema.optional(),
  }).superRefine((value, ctx) => {
    const hasBody = Boolean(value.body?.trim())
    const hasForward = Boolean(value.forwardedMessageId)
    const hasEncryptedBody = Boolean(value.encryptedBody)
    const hasForwardSnapshot = Boolean(value.forwardedFrom)

    if (!hasBody && !hasForward && !hasEncryptedBody && !hasForwardSnapshot) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MESSAGE_BODY_OR_FORWARD_REQUIRED',
      })
    }
  })
  const editMessageSchema = z.object({
    body: z.string().trim().max(4000).optional(),
    encryptedBody: encryptedPayloadSchema.optional(),
  }).superRefine((value, ctx) => {
    const hasBody = Boolean(value.body?.trim())
    const hasEncryptedBody = Boolean(value.encryptedBody)

    if (!hasBody && !hasEncryptedBody) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MESSAGE_BODY_REQUIRED',
      })
    }
  })
  const conversationEncryptionSchema = z.object({
    packages: z.array(z.object({
      recipientUserId: z.string().uuid(),
      wrappedKey: z.string().min(1).max(8192),
      iv: z.string().min(1).max(512),
      senderPublicKey: publicKeySchema,
    })).min(1).max(4),
  })
  const callSignalSchema = z.object({
    kind: z.enum(['invite', 'ringing', 'offer', 'answer', 'ice-candidate', 'reject', 'hangup', 'busy']),
    callId: z.string().min(1).max(120),
    clientId: z.string().trim().min(1).max(120).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  const realtimePresenceSchema = z.object({
    type: z.literal('presence.update'),
    clientId: z.string().trim().min(1).max(120).optional(),
    focused: z.boolean().optional().default(false),
    visible: z.boolean().optional().default(false),
    visibilityState: z.string().trim().max(40).optional().default('hidden'),
    isMobile: z.boolean().optional().default(false),
    timestamp: z.union([z.string(), z.number()]).optional(),
  })
  const messageReactionSchema = z.object({
    emoji: z.string().trim().min(1).max(16),
  })
  const callTranscriptionParamsSchema = z.object({
    conversationId: z.string().uuid(),
    callId: z.string().uuid(),
  })
  const callTranscriptionChunkSchema = z.object({
    audioBase64: z.string().trim().min(1).max(8_000_000),
    mimeType: z.string().trim().min(1).max(120).default('audio/webm'),
    sequence: z.coerce.number().int().min(0).default(0),
    provider: z.enum(['server-default', 'api']).optional().default('server-default'),
  })
  const userAiSettingsSchema = z.object({
    analysisEnabled: z.boolean().optional().default(false),
    interpretationProvider: z.enum(['algorithm', 'api']).optional().default('algorithm'),
    transcriptionProvider: z.enum(['server-default', 'api']).optional().default('server-default'),
    interpretationModel: z.string().trim().max(160).optional().default(''),
    summaryModel: z.string().trim().max(160).optional().default(''),
    transcriptionModel: z.string().trim().max(160).optional().default(''),
  })
  const callAnalysisToolSchema = z.enum(['psychology', 'business', 'intent', 'objections', 'speech-risks', 'next-steps'])
  const callAnalysisRequestSchema = z.object({
    toolId: callAnalysisToolSchema,
    cleanedTranscript: z.string().trim().min(1).max(40_000),
    summary: z.string().trim().max(12_000).optional().default(''),
  })
  const klipyKindSchema = z.enum(['gif', 'sticker'])
  const klipySearchSchema = z.object({
    query: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    kind: klipyKindSchema.default('gif'),
    page: z.coerce.number().int().min(1).max(50).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(12),
  })
  const klipyCategoriesSchema = z.object({
    kind: klipyKindSchema.default('gif'),
  })
  const klipyMediaSchema = z.object({
    url: z.string().trim().url().max(2048),
  })

  function buildKlipyContentUrl(
    kind: z.infer<typeof klipyKindSchema>,
    action: 'search' | 'trending' | 'categories',
    customerId?: string,
    payload?: Pick<z.infer<typeof klipySearchSchema>, 'query' | 'category' | 'limit' | 'page'>,
  ) {
    const resource = kind === 'sticker' ? 'stickers' : 'gifs'
    const appKey = encodeURIComponent(config.KLIPY_APP_KEY || '')
    const url = new URL(`/api/v1/${appKey}/${resource}/${action}`, config.KLIPY_API_BASE_URL)

    if (action === 'categories') {
      url.searchParams.set('locale', 'ru_RU')
      return url
    }

    const queryText = payload?.query?.trim() || payload?.category?.trim() || ''
    const perPage = queryText ? Math.max(payload?.limit || 12, 8) : payload?.limit || 12
    url.searchParams.set('page', String(payload?.page || 1))
    url.searchParams.set('per_page', String(perPage))
    url.searchParams.set('customer_id', customerId || 'anonymous')
    url.searchParams.set('locale', 'ru')
    url.searchParams.set('format_filter', kind === 'sticker' ? 'gif,webp,png,webm' : 'gif,webp,jpg,mp4,webm')

    if (queryText) {
      url.searchParams.set('q', queryText)
      url.searchParams.set('content_filter', 'high')
    }

    return url
  }

  function inferMimeTypeFromUrl(url: string) {
    if (/\.webp(\?|$)/i.test(url)) {
      return 'image/webp'
    }

    if (/\.png(\?|$)/i.test(url)) {
      return 'image/png'
    }

    if (/\.mp4(\?|$)/i.test(url)) {
      return 'video/mp4'
    }

    if (/\.webm(\?|$)/i.test(url)) {
      return 'video/webm'
    }

    if (/\.jpe?g(\?|$)/i.test(url)) {
      return 'image/jpeg'
    }

    return 'image/gif'
  }

  function pickKlipyAsset(file: any, candidates: string[]) {
    for (const candidate of candidates) {
      const [size, format] = candidate.split('.')
      const asset = file?.[size]?.[format]
      if (asset?.url) {
        return asset
      }
    }

    return null
  }

  function mapKlipyItem(item: any, kind: 'gif' | 'sticker') {
    if (!item || item.type === 'ad') {
      return null
    }

    const file = item?.file || {}
    const preview = pickKlipyAsset(file, kind === 'sticker'
      ? ['sm.webp', 'sm.gif', 'sm.png', 'md.webp', 'md.gif', 'md.png', 'xs.webp', 'xs.gif', 'xs.png']
      : ['sm.webp', 'sm.gif', 'sm.jpg', 'md.webp', 'md.gif', 'md.jpg', 'xs.webp', 'xs.gif', 'xs.jpg'])
    const original = pickKlipyAsset(file, kind === 'sticker'
      ? ['md.webp', 'md.gif', 'md.png', 'hd.webp', 'hd.gif', 'hd.png']
      : ['md.gif', 'md.webp', 'md.mp4', 'hd.gif', 'hd.webp', 'hd.mp4', 'sm.gif'])

    if (!preview?.url || !original?.url) {
      return null
    }

    return {
      id: String(item?.id || randomUUID()),
      slug: String(item?.slug || item?.id || randomUUID()),
      kind,
      title: String(item?.title || item?.slug || 'KLIPY media'),
      previewUrl: String(preview.url),
      originalUrl: String(original.url),
      mimeType: inferMimeTypeFromUrl(String(original.url)),
      width: Number(original.width || preview.width || 0) || undefined,
      height: Number(original.height || preview.height || 0) || undefined,
    }
  }

  function mapKlipyCategory(item: any) {
    const category = typeof item?.category === 'string' ? item.category.trim() : ''
    const query = typeof item?.query === 'string' ? item.query.trim() : category
    const previewUrl = typeof item?.preview_url === 'string' ? item.preview_url : ''

    if (!category || !query || !previewUrl) {
      return null
    }

    return {
      category,
      query,
      previewUrl,
    }
  }

  function isAllowedKlipyMediaUrl(value: string) {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && url.hostname === 'static.klipy.com'
    } catch {
      return false
    }
  }

  async function resolveSession(request: FastifyRequest) {
    const token = readBearerToken(request.headers.authorization)
    if (!token) {
      return null
    }

    const payload = verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
    if (!payload) {
      return null
    }

    const user = await findMessengerUserById(payload.sub)
    if (!user) {
      return null
    }

    return {
      user,
      payload,
    }
  }

  app.get('/health', async () => ({
    ok: true,
    service: 'messenger-core',
    transport: 'websocket',
    timestamp: new Date().toISOString(),
  }))

  app.get('/project-engine/projects', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const projects = await listMessengerProjects()
    return { projects }
  })

  app.get('/project-engine/templates', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    return {
      templates: listMessengerProjectTemplates(),
    }
  })

  app.post('/project-engine/projects', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = projectUpsertSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const project = await upsertMessengerProject(parsedBody.data)
    return reply.code(201).send({ project })
  })

  app.post('/project-engine/projects/bootstrap', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = projectBootstrapSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const projectDraft = buildMessengerProjectFromTemplate(parsedBody.data.templateId, {
      slug: parsedBody.data.slug,
      label: parsedBody.data.label,
      description: parsedBody.data.description,
      repositoryId: parsedBody.data.repositoryId,
      rootPath: parsedBody.data.rootPath,
      defaultBranch: parsedBody.data.defaultBranch,
    })
    if (!projectDraft) {
      return reply.code(404).send({ error: 'TEMPLATE_NOT_FOUND' })
    }

    const project = await upsertMessengerProject(projectDraft)
    return reply.code(201).send({ project })
  })

  app.get('/project-engine/projects/:projectId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const project = await getMessengerProject(parsedParams.data.projectId)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { project }
  })

  app.put('/project-engine/projects/:projectId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    const parsedBody = projectUpsertSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const current = await getMessengerProject(parsedParams.data.projectId)
    if (!current) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    const project = await upsertMessengerProject({
      ...parsedBody.data,
      id: current.id,
    })

    return { project }
  })

  app.delete('/project-engine/projects/:projectId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const deleted = await deleteMessengerProject(parsedParams.data.projectId)
    if (!deleted) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { ok: true }
  })

  app.get('/project-engine/projects/:projectId/sync-brief', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    const parsedQuery = projectSyncBriefQuerySchema.safeParse(request.query)
    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const brief = await buildMessengerProjectSyncBrief(parsedParams.data.projectId, parsedQuery.data.contextId)
    if (!brief) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { brief }
  })

  app.get('/project-engine/projects/:projectId/manager-brief', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const brief = await buildMessengerProjectManagerBrief(parsedParams.data.projectId)
    if (!brief) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { brief }
  })

  app.get('/project-engine/projects/:projectId/subjects', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const project = await getMessengerProject(parsedParams.data.projectId)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { subjects: project.subjects }
  })

  app.post('/project-engine/projects/:projectId/subjects', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    const parsedBody = projectSubjectSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const project = await upsertMessengerProjectSubject(parsedParams.data.projectId, parsedBody.data)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return reply.code(201).send({ project, subjects: project.subjects })
  })

  app.put('/project-engine/projects/:projectId/subjects/:entityId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectEntityParamsSchema.safeParse(request.params)
    const parsedBody = projectSubjectSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const project = await upsertMessengerProjectSubject(parsedParams.data.projectId, {
      ...parsedBody.data,
      id: parsedParams.data.entityId,
    })
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { project, subjects: project.subjects }
  })

  app.delete('/project-engine/projects/:projectId/subjects/:entityId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectEntityParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const project = await deleteMessengerProjectSubject(parsedParams.data.projectId, parsedParams.data.entityId)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { project, subjects: project.subjects }
  })

  app.get('/project-engine/projects/:projectId/agreements', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const project = await getMessengerProject(parsedParams.data.projectId)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { agreements: project.agreements }
  })

  app.post('/project-engine/projects/:projectId/agreements', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    const parsedBody = projectAgreementSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const project = await upsertMessengerProjectAgreement(parsedParams.data.projectId, parsedBody.data)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return reply.code(201).send({ project, agreements: project.agreements })
  })

  app.put('/project-engine/projects/:projectId/agreements/:entityId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectEntityParamsSchema.safeParse(request.params)
    const parsedBody = projectAgreementSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const project = await upsertMessengerProjectAgreement(parsedParams.data.projectId, {
      ...parsedBody.data,
      id: parsedParams.data.entityId,
    })
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { project, agreements: project.agreements }
  })

  app.delete('/project-engine/projects/:projectId/agreements/:entityId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectEntityParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const project = await deleteMessengerProjectAgreement(parsedParams.data.projectId, parsedParams.data.entityId)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { project, agreements: project.agreements }
  })

  app.get('/project-engine/projects/:projectId/cabinet-links', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const project = await getMessengerProject(parsedParams.data.projectId)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { cabinetLinks: project.cabinetLinks }
  })

  app.post('/project-engine/projects/:projectId/cabinet-links', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectParamsSchema.safeParse(request.params)
    const parsedBody = projectCabinetLinkSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const project = await upsertMessengerProjectCabinetLink(parsedParams.data.projectId, parsedBody.data)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return reply.code(201).send({ project, cabinetLinks: project.cabinetLinks })
  })

  app.put('/project-engine/projects/:projectId/cabinet-links/:entityId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectEntityParamsSchema.safeParse(request.params)
    const parsedBody = projectCabinetLinkSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const project = await upsertMessengerProjectCabinetLink(parsedParams.data.projectId, {
      ...parsedBody.data,
      id: parsedParams.data.entityId,
    })
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { project, cabinetLinks: project.cabinetLinks }
  })

  app.delete('/project-engine/projects/:projectId/cabinet-links/:entityId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = projectEntityParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const project = await deleteMessengerProjectCabinetLink(parsedParams.data.projectId, parsedParams.data.entityId)
    if (!project) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    return { project, cabinetLinks: project.cabinetLinks }
  })

  app.get('/integrations/klipy/search', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = klipySearchSchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    if (!config.KLIPY_APP_KEY) {
      return {
        configured: false,
        items: [],
      }
    }

    const response = await fetch(buildKlipyContentUrl(
      parsedQuery.data.kind,
      parsedQuery.data.query || parsedQuery.data.category ? 'search' : 'trending',
      session.user.id,
      parsedQuery.data,
    ))
    if (!response.ok) {
      return reply.code(502).send({ error: 'KLIPY_UPSTREAM_FAILED' })
    }

    const payload = await response.json() as { data?: { data?: any[] } }
    const items = Array.isArray(payload.data?.data)
      ? payload.data.data
        .map(item => mapKlipyItem(item, parsedQuery.data.kind))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : []

    return {
      configured: true,
      items,
    }
  })

  app.get('/integrations/klipy/categories', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = klipyCategoriesSchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    if (!config.KLIPY_APP_KEY) {
      return {
        configured: false,
        categories: [],
      }
    }

    const response = await fetch(buildKlipyContentUrl(parsedQuery.data.kind, 'categories', session.user.id))
    if (!response.ok) {
      return reply.code(502).send({ error: 'KLIPY_UPSTREAM_FAILED' })
    }

    const payload = await response.json() as { data?: { categories?: any[] } }
    const categories = Array.isArray(payload.data?.categories)
      ? payload.data.categories
        .map(mapKlipyCategory)
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : []

    return {
      configured: true,
      categories,
    }
  })

  app.get('/integrations/klipy/media', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = klipyMediaSchema.safeParse(request.query)
    if (!parsedQuery.success || !isAllowedKlipyMediaUrl(parsedQuery.data.url)) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const upstreamResponse = await fetch(parsedQuery.data.url)
    if (!upstreamResponse.ok) {
      return reply.code(502).send({ error: 'KLIPY_UPSTREAM_FAILED' })
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer()
    const mimeType = upstreamResponse.headers.get('content-type') || inferMimeTypeFromUrl(parsedQuery.data.url)
    const fileName = parsedQuery.data.url.split('/').pop()?.split('?')[0] || `klipy-${randomUUID()}`

    reply.header('Content-Type', mimeType)
    reply.header('Content-Length', String(arrayBuffer.byteLength))
    reply.header('Cache-Control', 'private, max-age=3600')
    reply.header('Content-Disposition', `inline; filename="${fileName.replace(/[^a-zA-Z0-9._-]+/g, '-') || `klipy-${randomUUID()}`}"`)

    return reply.send(Buffer.from(arrayBuffer))
  })

  app.post('/auth/register', async (request, reply) => {
    const parsed = authSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const user = await registerMessengerUser({
        login: parsed.data.login,
        password: parsed.data.password,
        displayName: parsed.data.displayName || parsed.data.login,
      })
      const token = createMessengerToken(user, config.MESSENGER_CORE_AUTH_SECRET)

      return {
        token,
        user: {
          id: user.id,
          login: user.login,
          displayName: user.displayName,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_EXISTS') {
        return reply.code(409).send({ error: 'USER_EXISTS' })
      }

      throw error
    }
  })

  app.post('/auth/login', async (request, reply) => {
    const parsed = authSchema.pick({ login: true, password: true }).safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const user = await authenticateMessengerUser(parsed.data.login, parsed.data.password)
    if (!user) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS' })
    }

    const token = createMessengerToken(user, config.MESSENGER_CORE_AUTH_SECRET)

    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
      },
    }
  })

  app.get('/auth/me', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    return {
      user: {
        id: session.user.id,
        login: session.user.login,
        displayName: session.user.displayName,
      },
    }
  })

  app.get('/settings/ai', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const settings = await getMessengerUserAiSettings(session.user.id)
    return buildUserAiSettingsResponse(settings)
  })

  app.put('/settings/ai', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = userAiSettingsSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const settings = await updateMessengerUserAiSettings(session.user.id, parsedBody.data)
    return buildUserAiSettingsResponse(settings)
  })

  app.put('/crypto/device-key', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = z.object({ publicKey: publicKeySchema }).safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const publicKey = await saveMessengerDevicePublicKey(session.user.id, parsedBody.data.publicKey)
    return { publicKey }
  })

  app.get('/users/:userId/device-key', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = userParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const targetUser = await findMessengerUserById(parsedParams.data.userId)
    if (!targetUser) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' })
    }

    return {
      publicKey: await findMessengerDevicePublicKeyByUserId(parsedParams.data.userId),
    }
  })

  app.get('/contacts/overview', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = contactsQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const users = await listMessengerUsers()
    return await buildContactsOverview(session.user, users, parsedQuery.data.query || '')
  })

  app.get('/agents', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const agents = await listMessengerAgents()
    const conversations = await listConversationsForUser(session.user, await listMessengerUsers(), '')
    const settingsList = await Promise.all(agents.map(agent => getMessengerAgentSettings(agent.id)))

    return {
      agents: agents.map((agent, index) => ({
        ...agent,
        settings: buildAgentSettingsResponse(settingsList[index]),
        conversationId: conversations.find(item => item?.peerType === 'agent' && item.peerUserId === agent.id)?.id || null,
      })),
    }
  })

  app.get('/agents/:agentId/settings', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const agent = await findMessengerAgentById(parsedParams.data.agentId)
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
    }

    const settings = await getMessengerAgentSettings(agent.id)
    return {
      settings: buildAgentSettingsResponse(settings),
    }
  })

  app.put('/agents/:agentId/settings', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentParamsSchema.safeParse(request.params)
    const parsedBody = agentSettingsSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const agent = await findMessengerAgentById(parsedParams.data.agentId)
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
    }

    const validAgentIds = new Set((await listMessengerAgents()).map(item => item.id))
    const settings = await updateMessengerAgentSettings(agent.id, {
      subscriptionId: parsedBody.data.subscriptionId,
      model: parsedBody.data.model,
      effort: parsedBody.data.effort,
      apiKey: parsedBody.data.apiKey,
      ssh: parsedBody.data.ssh,
      knowledge: parsedBody.data.knowledge,
      connections: parsedBody.data.connections.filter(item => item.targetAgentId !== agent.id && validAgentIds.has(item.targetAgentId)),
      graphPosition: parsedBody.data.graphPosition,
    })

    return {
      settings: buildAgentSettingsResponse(settings),
    }
  })

  app.put('/agents/graph', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = agentGraphSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const validAgentIds = new Set((await listMessengerAgents()).map(item => item.id))
    const normalizedGraph = Object.fromEntries(
      Object.entries(parsedBody.data.graph)
        .filter(([agentId]) => validAgentIds.has(agentId))
        .map(([agentId, node]) => [agentId, {
          connections: node.connections.filter(item => item.targetAgentId !== agentId && validAgentIds.has(item.targetAgentId)),
          graphPosition: node.graphPosition,
        }]),
    )

    await updateMessengerAgentGraph(normalizedGraph)

    const settingsList = await Promise.all(
      Array.from(validAgentIds).map(agentId => getMessengerAgentSettings(agentId)),
    )

    return {
      settings: settingsList.map(buildAgentSettingsResponse),
    }
  })

  app.get('/agents/:agentId/knowledge', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const agent = await findMessengerAgentById(parsedParams.data.agentId)
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
    }

    const settings = await getMessengerAgentSettings(agent.id)
    return {
      knowledge: await getMessengerAgentKnowledgeStatus(agent.id, settings),
    }
  })

  app.get('/agents/:agentId/knowledge/preset', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const agent = await findMessengerAgentById(parsedParams.data.agentId)
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
    }

    const settings = await getMessengerAgentSettings(agent.id)
    return {
      preset: getMessengerAgentKnowledgePreset(settings),
    }
  })

  app.post('/agents/:agentId/knowledge/reindex', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const agent = await findMessengerAgentById(parsedParams.data.agentId)
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
    }

    const settings = await getMessengerAgentSettings(agent.id)

    try {
      return {
        knowledge: await reindexMessengerAgentKnowledge(agent.id, settings),
      }
    } catch (error) {
      return reply.code(409).send({ error: error instanceof Error ? error.message : 'AGENT_KNOWLEDGE_INDEX_FAILED' })
    }
  })

  app.get('/agents/:agentId/workspace', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentParamsSchema.safeParse(request.params)
    const parsedQuery = agentWorkspaceQuerySchema.safeParse(request.query)
    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const agent = await findMessengerAgentById(parsedParams.data.agentId)
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
    }

    const settings = await getMessengerAgentSettings(agent.id)

    try {
      return {
        workspace: await listMessengerAgentWorkspace(settings, parsedQuery.data.path),
      }
    } catch (error) {
      return reply.code(409).send({ error: error instanceof Error ? error.message : 'AGENT_WORKSPACE_UNAVAILABLE' })
    }
  })

  app.get('/agents/:agentId/workspace/file', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentParamsSchema.safeParse(request.params)
    const parsedQuery = agentWorkspaceQuerySchema.safeParse(request.query)
    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const agent = await findMessengerAgentById(parsedParams.data.agentId)
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
    }

    const settings = await getMessengerAgentSettings(agent.id)

    try {
      return {
        file: await readMessengerAgentWorkspaceFile(settings, parsedQuery.data.path),
      }
    } catch (error) {
      return reply.code(409).send({ error: error instanceof Error ? error.message : 'AGENT_WORKSPACE_UNAVAILABLE' })
    }
  })

  app.get('/agents/runs', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = agentRunsQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    return {
      runs: await listMessengerAgentRuns(parsedQuery.data),
    }
  })

  app.get('/agents/runs/:runId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentRunParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const run = await getMessengerAgentRunById(parsedParams.data.runId)
    if (!run) {
      return reply.code(404).send({ error: 'RUN_NOT_FOUND' })
    }

    return { run }
  })

  app.get('/agents/edge-payloads', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = agentEdgePayloadsQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    return {
      edgePayloads: await listMessengerAgentEdgePayloads(parsedQuery.data),
    }
  })

  app.post('/agents/runs/:runId/cancel', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const runIdSchema = z.object({ runId: z.string().min(1) })
    const parsedParams = runIdSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const run = await getMessengerAgentRunById(parsedParams.data.runId)
    if (!run) {
      return reply.code(404).send({ error: 'RUN_NOT_FOUND' })
    }

    if (run.status !== 'running') {
      return reply.code(409).send({ error: 'RUN_NOT_RUNNING' })
    }

    await appendMessengerAgentRunEvent({
      runId: run.runId,
      agentId: run.agentId,
      conversationId: run.conversationId,
      phase: 'completed',
      status: 'failed',
      summary: 'Прогон отменен пользователем',
    })

    return { success: true }
  })

  app.post('/contacts/invites', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = inviteSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const targetUser = await findMessengerUserById(parsedBody.data.targetUserId)
    if (!targetUser) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' })
    }

    try {
      const invite = await createInvite(session.user.id, parsedBody.data.targetUserId)
      emitToUsers([session.user.id, parsedBody.data.targetUserId], {
        type: 'contacts.updated',
        timestamp: new Date().toISOString(),
      })
      return {
        invite,
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'SELF_INVITE') {
          return reply.code(400).send({ error: 'SELF_INVITE' })
        }

        if (error.message === 'ALREADY_CONTACTS') {
          return reply.code(409).send({ error: 'ALREADY_CONTACTS' })
        }

        if (error.message === 'INVITE_EXISTS') {
          return reply.code(409).send({ error: 'INVITE_EXISTS' })
        }
      }

      throw error
    }
  })

  app.post('/contacts/invites/:inviteId/accept', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = inviteParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const invite = await respondToInvite(parsedParams.data.inviteId, session.user.id, 'accepted')
      emitToUsers([invite.fromUserId, invite.toUserId], {
        type: 'contacts.updated',
        timestamp: new Date().toISOString(),
      })
      emitToUsers([invite.fromUserId, invite.toUserId], {
        type: 'conversations.updated',
        timestamp: new Date().toISOString(),
      })
      return { invite }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVITE_NOT_FOUND') {
          return reply.code(404).send({ error: 'INVITE_NOT_FOUND' })
        }

        if (error.message === 'INVITE_FORBIDDEN') {
          return reply.code(403).send({ error: 'INVITE_FORBIDDEN' })
        }

        if (error.message === 'INVITE_ALREADY_RESOLVED') {
          return reply.code(409).send({ error: 'INVITE_ALREADY_RESOLVED' })
        }
      }

      throw error
    }
  })

  app.post('/contacts/invites/:inviteId/reject', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = inviteParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const invite = await respondToInvite(parsedParams.data.inviteId, session.user.id, 'rejected')
      emitToUsers([invite.fromUserId, invite.toUserId], {
        type: 'contacts.updated',
        timestamp: new Date().toISOString(),
      })
      return { invite }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVITE_NOT_FOUND') {
          return reply.code(404).send({ error: 'INVITE_NOT_FOUND' })
        }

        if (error.message === 'INVITE_FORBIDDEN') {
          return reply.code(403).send({ error: 'INVITE_FORBIDDEN' })
        }

        if (error.message === 'INVITE_ALREADY_RESOLVED') {
          return reply.code(409).send({ error: 'INVITE_ALREADY_RESOLVED' })
        }
      }

      throw error
    }
  })

  app.delete('/contacts/:peerUserId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = contactParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const result = await deleteContactForUser(session.user.id, parsedParams.data.peerUserId)
      emitToUsers([session.user.id, parsedParams.data.peerUserId], {
        type: 'contacts.updated',
        timestamp: new Date().toISOString(),
      })
      return result
    } catch (error) {
      if (error instanceof Error && error.message === 'CONTACT_NOT_FOUND') {
        return reply.code(404).send({ error: 'CONTACT_NOT_FOUND' })
      }

      throw error
    }
  })

  app.get('/conversations', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = conversationsQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const users = await listMessengerUsers()
    return {
      conversations: await listConversationsForUser(session.user, users, parsedQuery.data.query || ''),
    }
  })

  app.post('/conversations/direct', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = directConversationSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const peer = await findMessengerUserById(parsedBody.data.peerUserId)
    if (!peer) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' })
    }

    const overview = await buildContactsOverview(session.user, await listMessengerUsers(), '')
    const isContact = overview.contacts.some(item => item.id === peer.id)
    if (!isContact) {
      return reply.code(403).send({ error: 'DIRECT_CHAT_REQUIRES_CONTACT' })
    }

    const conversation = await findOrCreateDirectConversation(session.user.id, peer.id)
    emitToUsers([conversation.userAId, conversation.userBId], {
      type: 'conversations.updated',
      conversationId: conversation.id,
      timestamp: new Date().toISOString(),
    })
    return { conversation }
  })

  app.post('/conversations/secret', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = directConversationSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const peer = await findMessengerUserById(parsedBody.data.peerUserId)
    if (!peer) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' })
    }

    const overview = await buildContactsOverview(session.user, await listMessengerUsers(), '')
    const isContact = overview.contacts.some(item => item.id === peer.id)
    if (!isContact) {
      return reply.code(403).send({ error: 'DIRECT_CHAT_REQUIRES_CONTACT' })
    }

    const conversation = await findOrCreateSecretConversation(session.user.id, peer.id)
    emitToUsers([conversation.userAId, conversation.userBId], {
      type: 'conversations.updated',
      conversationId: conversation.id,
      timestamp: new Date().toISOString(),
    })
    return { conversation }
  })

  app.post('/agents/:agentId/conversation', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = agentParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const agent = await findMessengerAgentById(parsedParams.data.agentId)
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
    }

    const conversation = await findOrCreateAgentConversation(session.user.id, agent.id)
    emitToUsers([session.user.id], {
      type: 'conversations.updated',
      conversationId: conversation.id,
      timestamp: new Date().toISOString(),
    })
    return { conversation }
  })


  app.delete('/conversations/:conversationId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const conversation = await deleteConversationForUser(parsedParams.data.conversationId, session.user)
      emitToUsers([conversation.userAId, conversation.userBId], {
        type: 'conversations.updated',
        timestamp: new Date().toISOString(),
      })
      emitToUsers([conversation.userAId, conversation.userBId], {
        type: 'messages.updated',
        conversationId: conversation.id,
        timestamp: new Date().toISOString(),
      })
      return { conversation }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
        }

        if (error.message === 'MESSAGE_ENCRYPTION_REQUIRED') {
          return reply.code(409).send({ error: 'MESSAGE_ENCRYPTION_REQUIRED' })
        }

        if (error.message === 'SECRET_CHAT_ATTACHMENTS_DISABLED') {
          return reply.code(409).send({ error: 'SECRET_CHAT_ATTACHMENTS_DISABLED' })
        }
      }

      throw error
    }
  })

  app.get('/conversations/:conversationId/encryption', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      return {
        keyPackage: await getConversationKeyPackageForUser(parsedParams.data.conversationId, session.user),
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
        }
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/encryption', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    const parsedBody = conversationEncryptionSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const encryption = await saveConversationKeyPackages(
        parsedParams.data.conversationId,
        session.user,
        parsedBody.data.packages.map(item => ({
          ...item,
          createdAt: new Date().toISOString(),
        })),
      )

      return { encryption }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
        }
      }

      throw error
    }
  })

  app.get('/conversations/:conversationId/messages', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const users = await listMessengerUsers()
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (!conversation) {
        return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
      }

      const readResult = await markConversationReadByUser(parsedParams.data.conversationId, session.user)
      if (readResult.updated) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }

      return {
        conversation,
        messages: await listMessagesForConversation(parsedParams.data.conversationId, session.user, users),
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'CONVERSATION_FORBIDDEN') {
        return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/messages', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    const parsedBody = messageSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const users = await listMessengerUsers()
      const message = parsedBody.data.forwardedMessageId
        ? await forwardMessageToConversation(parsedParams.data.conversationId, parsedBody.data.forwardedMessageId, session.user, users)
        : await addMessageToConversation(parsedParams.data.conversationId, session.user, parsedBody.data.body || '', {
          encryptedBody: parsedBody.data.encryptedBody,
          replyToMessageId: parsedBody.data.replyToMessageId,
          commentOnMessageId: parsedBody.data.commentOnMessageId,
          forwardedFrom: parsedBody.data.forwardedFrom,
        })
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        if (conversation.kind === 'agent') {
          const agent = await findMessengerAgentById(conversation.userBId)
          if (agent) {
            const agentRunId = randomUUID()
            const emitAgentTrace = async (payload: {
              phase: 'started' | 'context' | 'files' | 'consulting' | 'reasoning' | 'completed' | 'failed'
              status: 'running' | 'completed' | 'failed'
              summary: string
              focus?: string
              activeTargetAgentIds?: string[]
              activeConnections?: Array<{
                targetAgentId: string
                mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
                payloadPreview?: string
              }>
              fileNames?: string[]
              artifacts?: Array<{
                kind: 'consultation' | 'file' | 'summary'
                label: string
                content: string
                agentId?: string
              }>
            }) => {
              const timestamp = new Date().toISOString()
              await appendMessengerAgentRunEvent({
                runId: agentRunId,
                conversationId: conversation.id,
                agentId: agent.id,
                phase: payload.phase,
                status: payload.status,
                summary: payload.summary,
                focus: payload.focus,
                activeTargetAgentIds: payload.activeTargetAgentIds || [],
                fileNames: payload.fileNames || [],
                artifacts: payload.artifacts || [],
                timestamp,
              })

              emitToUsers([session.user.id], {
                type: 'agent.trace',
                conversationId: conversation.id,
                trace: {
                  runId: agentRunId,
                  agentId: agent.id,
                  phase: payload.phase,
                  status: payload.status,
                  summary: payload.summary,
                  focus: payload.focus,
                  activeTargetAgentIds: payload.activeTargetAgentIds || [],
                  activeConnections: payload.activeConnections || [],
                  fileNames: payload.fileNames || [],
                  artifacts: payload.artifacts || [],
                  timestamp,
                },
              })
            }
            const messageBody = parsedBody.data.body || parsedBody.data.forwardedFrom?.body || ''
            const runningCliSession = await findRunningCliSessionForAgent(agent.id)
            if (runningCliSession && messageBody) {
              const ingestToken = await getAgentIngestToken(agent.id)
              const coreConfig = readMessengerConfig()
              const messengerCoreUrl = `http://localhost:${coreConfig.MESSENGER_CORE_PORT}`
              if (ingestToken) {
                const { runId } = await createRun({ agentId: agent.id, conversationId: conversation.id, prompt: messageBody })
                const claudeSessionBin = join(homedir(), 'bin/claude-session')
                execFileAsync(claudeSessionBin, [
                  'send', runningCliSession.slug, messageBody,
                  '--agent-id', agent.id,
                  '--run-id', runId,
                  '--messenger-core-url', messengerCoreUrl,
                  '--ingest-token', ingestToken,
                ]).catch((err: unknown) => app.log.warn(err, 'claude-session send failed'))
              }
            } else {
              const transcript = await listMessagesForConversation(parsedParams.data.conversationId, session.user, users)
              try {
                const replyBody = await buildMessengerAgentReply(
                  agent.id,
                  messageBody,
                  transcript
                    .slice(-8)
                    .filter(item => !item.deletedAt)
                    .map(item => ({
                      role: item.own ? 'user' as const : 'assistant' as const,
                      content: item.kind === 'file'
                        ? `${item.body}${item.attachment ? ` (${item.attachment.name})` : ''}`
                        : item.body,
                    })),
                  {
                    onTrace: emitAgentTrace,
                  },
                )
                await addAgentMessageToConversation(conversation.id, agent, replyBody)
                await emitAgentTrace({
                  phase: 'completed',
                  status: 'completed',
                  summary: 'Ответ готов и добавлен в диалог.',
                  focus: `Итоговая длина ответа: ${replyBody.length} символов.`,
                  artifacts: [{
                    kind: 'summary',
                    label: 'Ответ',
                    content: replyBody.slice(0, 320),
                  }],
                })
              } catch (error) {
                await emitAgentTrace({
                  phase: 'failed',
                  status: 'failed',
                  summary: 'Сборка ответа остановилась с ошибкой.',
                  focus: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
                })
                throw error
              }
            }
          }
        }

        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'conversations.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }
      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND' || error.message === 'MESSAGE_NOT_FOUND') {
          return reply.code(404).send({ error: error.message })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN' || error.message === 'MESSAGE_FORBIDDEN') {
          return reply.code(403).send({ error: error.message })
        }

        if (error.message === 'FORWARD_FORBIDDEN_IN_SECRET_CHAT') {
          return reply.code(403).send({ error: 'FORWARD_FORBIDDEN_IN_SECRET_CHAT' })
        }

        if (error.message === 'MESSAGE_ENCRYPTION_REQUIRED') {
          return reply.code(409).send({ error: 'MESSAGE_ENCRYPTION_REQUIRED' })
        }

        if (error.message === 'MESSAGE_ENCRYPTED_FORWARD_REQUIRES_CLIENT_PAYLOAD') {
          return reply.code(409).send({ error: 'MESSAGE_ENCRYPTED_FORWARD_REQUIRES_CLIENT_PAYLOAD' })
        }
      }

      throw error
    }
  })

  app.patch('/conversations/:conversationId/messages/:messageId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = messageParamsSchema.safeParse(request.params)
    const parsedBody = editMessageSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const message = await editMessageInConversation(
        parsedParams.data.conversationId,
        parsedParams.data.messageId,
        session.user,
        parsedBody.data.body || '',
        parsedBody.data.encryptedBody,
      )
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'conversations.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }
      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND' || error.message === 'MESSAGE_NOT_FOUND') {
          return reply.code(404).send({ error: error.message })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN' || error.message === 'MESSAGE_FORBIDDEN') {
          return reply.code(403).send({ error: 'MESSAGE_FORBIDDEN' })
        }

        if (error.message === 'MESSAGE_ENCRYPTION_REQUIRED') {
          return reply.code(409).send({ error: 'MESSAGE_ENCRYPTION_REQUIRED' })
        }

        if (error.message === 'MESSAGE_NOT_EDITABLE') {
          return reply.code(409).send({ error: 'MESSAGE_NOT_EDITABLE' })
        }
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/messages/:messageId/reactions', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = messageParamsSchema.safeParse(request.params)
    const parsedBody = messageReactionSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const message = await toggleReactionInConversation(
        parsedParams.data.conversationId,
        parsedParams.data.messageId,
        session.user,
        parsedBody.data.emoji,
      )
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }

      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND' || error.message === 'MESSAGE_NOT_FOUND') {
          return reply.code(404).send({ error: error.message })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'MESSAGE_FORBIDDEN' })
        }

        if (error.message === 'MESSAGE_NOT_REACTABLE' || error.message === 'REACTION_EMOJI_REQUIRED') {
          return reply.code(409).send({ error: error.message })
        }
      }

      throw error
    }
  })

  app.delete('/conversations/:conversationId/messages/:messageId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = messageParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const message = await deleteMessageFromConversation(parsedParams.data.conversationId, parsedParams.data.messageId, session.user)
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'conversations.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }
      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND' || error.message === 'MESSAGE_NOT_FOUND') {
          return reply.code(404).send({ error: error.message })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN' || error.message === 'MESSAGE_FORBIDDEN') {
          return reply.code(403).send({ error: 'MESSAGE_FORBIDDEN' })
        }
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/attachments', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const file = await request.file()
    if (!file) {
      return reply.code(400).send({ error: 'FILE_REQUIRED' })
    }

    const chunks: Buffer[] = []
    for await (const chunk of file.file) {
      chunks.push(chunk)
    }

    const metadataField = Array.isArray(file.fields.metadata) ? file.fields.metadata[0] : file.fields.metadata
    const metadataValue = metadataField && 'value' in metadataField && typeof metadataField.value === 'string'
      ? metadataField.value
      : undefined

    let encryptedFile: z.infer<typeof encryptedBinaryPayloadSchema> | undefined
    let originalName: string | undefined
    let originalMimeType: string | undefined
    let klipy: z.infer<typeof klipyAttachmentSchema> | undefined
    if (metadataValue) {
      try {
        const parsedMetadata = attachmentMetadataSchema.safeParse(JSON.parse(metadataValue))
        if (!parsedMetadata.success) {
          return reply.code(400).send({ error: 'INVALID_ATTACHMENT_METADATA' })
        }

        encryptedFile = parsedMetadata.data.encryptedFile
        originalName = parsedMetadata.data.originalName
        originalMimeType = parsedMetadata.data.originalMimeType
        klipy = parsedMetadata.data.klipy
      } catch {
        return reply.code(400).send({ error: 'INVALID_ATTACHMENT_METADATA' })
      }
    }

    try {
      const stored = await storeUploadedMedia({
        filename: originalName || file.filename,
        mimeType: originalMimeType || file.mimetype,
        buffer: Buffer.concat(chunks),
        directory: klipy?.kind === 'sticker' ? 'stickers' : undefined,
      })

      const message = await addAttachmentMessageToConversation(parsedParams.data.conversationId, session.user, {
        ...stored,
        encryptedFile,
        klipy,
      })
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'conversations.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }

      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
        }
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/calls/livekit-token', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader) {
        return reply.status(401).send({ error: 'Missing authorization header' })
      }

      const token = readBearerToken(authHeader)
      if (!token) {
        return reply.status(401).send({ error: 'Invalid authorization format' })
      }

      const payload = verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
      if (!payload) {
        return reply.status(401).send({ error: 'Invalid token' })
      }

      const params = request.params as any
      const conversationId = params.conversationId
      
      const user = await findMessengerUserById(payload.sub)
      if (!user) {
        return reply.status(404).send({ error: 'User not found' })
      }

      const LIVEKIT_URL = config.LIVEKIT_API_URL
      const LIVEKIT_API_KEY = config.LIVEKIT_API_KEY
      const LIVEKIT_API_SECRET = config.LIVEKIT_API_SECRET

      if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return reply.status(500).send({ error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET env vars are required' })
      }

      const { AccessToken } = await import('livekit-server-sdk')
      const roomName = `call-${conversationId}`
      const participantName = user.displayName || 'User'
      
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: user.id,
        name: participantName,
      })

      at.addGrant({ roomJoin: true, room: roomName })
      const lkToken = await at.toJwt()

      // Start bot if not already in the room
      if (!activeLiveKitRooms.has(roomName)) {
        activeLiveKitRooms.add(roomName);
        
        joinLiveKitRoomAsBot(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, roomName, async (participantIdentity, audioBase64, mimeType, room, sequence) => {
          try {
            // Check if transcription is enabled in config
            if (!isMessengerTranscriptionConfigured(config)) return undefined
            
            const aiSettings = await getMessengerUserAiSettings(user.id)
            const provider = aiSettings.transcriptionProvider || 'server-default'
            
            const text = await transcribeMessengerAudioChunk(config, {
              audioBase64,
              mimeType,
              language: config.MESSENGER_TRANSCRIPTION_LANGUAGE,
              model: aiSettings.transcriptionModel || config.MESSENGER_TRANSCRIPTION_MODEL,
            }, {
              provider,
            })
            
            return text
          } catch (e) {
            console.error('Bot STT chunk error:', e)
            return undefined
          }
        }).catch((err) => {

           console.error('Failed to start LiveKit STT Bot', err);
           activeLiveKitRooms.delete(roomName);
        });
      }


      return reply.status(200).send({
        serverUrl: LIVEKIT_URL,
        token: lkToken,
        roomName
      })
    } catch (err: any) {
      request.log.error(err)
      return reply.status(500).send({ error: err.message })
    }
  })

  app.post('/conversations/:conversationId/call-signal', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    const parsedBody = callSignalSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const conversation = await findConversationById(parsedParams.data.conversationId)
    if (!conversation) {
      return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
    }

    if (conversation.userAId !== session.user.id && conversation.userBId !== session.user.id) {
      return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
    }

    const targetUserId = conversation.userAId === session.user.id ? conversation.userBId : conversation.userAId
    const senderClientId = parsedBody.data.clientId?.trim() || ''

    if (senderClientId) {
      rememberCallRoute(parsedBody.data.callId, conversation.id, session.user.id, senderClientId)
    }

    const signalEvent = {
      type: 'call.signal',
      timestamp: new Date().toISOString(),
      conversationId: conversation.id,
      signal: {
        kind: parsedBody.data.kind,
        callId: parsedBody.data.callId,
        payload: parsedBody.data.payload || {},
      },
      sender: {
        userId: session.user.id,
        displayName: session.user.displayName,
        login: session.user.login,
      },
    }

    emitToClient(resolveTargetClientForCall(parsedBody.data.callId, conversation.id, targetUserId), signalEvent)

    if (parsedBody.data.kind === 'busy' || parsedBody.data.kind === 'reject' || parsedBody.data.kind === 'hangup') {
      forgetCallRoute(parsedBody.data.callId)
    }

    return { ok: true }
  })

  app.post('/conversations/:conversationId/calls/:callId/transcription', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = callTranscriptionParamsSchema.safeParse(request.params)
    const parsedBody = callTranscriptionChunkSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const conversation = await findConversationById(parsedParams.data.conversationId)
    if (!conversation) {
      return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
    }

    if (conversation.userAId !== session.user.id && conversation.userBId !== session.user.id) {
      return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
    }

    if (!isMessengerTranscriptionConfigured(config)) {
      return reply.code(503).send({ error: 'TRANSCRIPTION_DISABLED' })
    }

    try {
      const aiSettings = await getMessengerUserAiSettings(session.user.id)
      const provider = parsedBody.data.provider || aiSettings.transcriptionProvider || 'server-default'

      if (provider === 'api' && !hasMessengerTranscriptionHttpBackend(config)) {
        return reply.code(503).send({ error: 'TRANSCRIPTION_PROVIDER_DISABLED' })
      }

      const text = await transcribeMessengerAudioChunk(config, {
        audioBase64: parsedBody.data.audioBase64,
        mimeType: parsedBody.data.mimeType,
        language: config.MESSENGER_TRANSCRIPTION_LANGUAGE,
        model: aiSettings.transcriptionModel || config.MESSENGER_TRANSCRIPTION_MODEL,
      }, {
        provider,
      })

      return {
        ok: true,
        callId: parsedParams.data.callId,
        sequence: parsedBody.data.sequence,
        text,
      }
    } catch {
      return reply.code(502).send({ error: 'TRANSCRIPTION_FAILED' })
    }
  })

  app.post('/conversations/:conversationId/calls/:callId/analysis', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = callTranscriptionParamsSchema.safeParse(request.params)
    const parsedBody = callAnalysisRequestSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const conversation = await findConversationById(parsedParams.data.conversationId)
    if (!conversation) {
      return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
    }

    if (conversation.userAId !== session.user.id && conversation.userBId !== session.user.id) {
      return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
    }

    if (!isMessengerAgentLlmConfigured({
      model: config.MESSENGER_AGENT_MODEL,
      apiKey: config.MESSENGER_AGENT_API_KEY,
    })) {
      return reply.code(503).send({ error: 'ANALYSIS_DISABLED' })
    }

    try {
      const aiSettings = await getMessengerUserAiSettings(session.user.id)
      if (aiSettings.interpretationProvider !== 'api') {
        return reply.code(409).send({ error: 'ANALYSIS_PROVIDER_DISABLED' })
      }

      const toolId = parsedBody.data.toolId as MessengerCallAnalysisToolId
      const interpretation = await buildMessengerCallAnalysis({
        apiKey: config.MESSENGER_AGENT_API_KEY,
        model: aiSettings.interpretationModel || config.MESSENGER_AGENT_MODEL,
        toolId,
        cleanedTranscript: parsedBody.data.cleanedTranscript,
        summary: parsedBody.data.summary,
      })

      return {
        ok: true,
        callId: parsedParams.data.callId,
        toolId,
        interpretation,
        modelUsed: aiSettings.interpretationModel || config.MESSENGER_AGENT_MODEL,
      }
    } catch {
      return reply.code(502).send({ error: 'ANALYSIS_FAILED' })
    }
  })

  app.get('/ws', { websocket: true }, async (socket, request) => {
    const requestUrl = new URL(request.url || '/ws', `http://${request.headers.host || 'localhost'}`)
    const token = requestUrl.searchParams.get('token')
    const payload = token ? verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET) : null
    const user = payload ? await findMessengerUserById(payload.sub) : null

    if (!payload || !user) {
      socket.send(JSON.stringify({
        type: 'error',
        error: 'UNAUTHORIZED',
      }))
      socket.close()
      return
    }

    const realtimeClientId = requestUrl.searchParams.get('clientId')?.trim() || randomUUID()
    const connectionId = randomUUID()

    for (const [existingConnectionId, existingClient] of clients.entries()) {
      if (existingClient.userId !== user.id || existingClient.clientId !== realtimeClientId) {
        continue
      }

      clients.delete(existingConnectionId)
      existingClient.socket.close()
    }

    const realtimeClient: MessengerRealtimeClient = {
      connectionId,
      userId: user.id,
      clientId: realtimeClientId,
      socket,
      focused: false,
      visible: false,
      visibilityState: 'hidden',
      isMobile: false,
      lastSeenAt: Date.now(),
    }

    clients.set(connectionId, realtimeClient)

    socket.send(JSON.stringify({
      type: 'hello',
      message: 'messenger-core realtime channel is ready',
      userId: user.id,
      clientId: realtimeClientId,
      timestamp: new Date().toISOString(),
    }))

    socket.on('message', async (value: Buffer) => {
      try {
        const payloadStr = value.toString()
        if (payloadStr.startsWith('{')) {
          const data = JSON.parse(payloadStr)

          const parsedPresence = realtimePresenceSchema.safeParse(data)
          if (parsedPresence.success) {
            if (parsedPresence.data.clientId && parsedPresence.data.clientId !== realtimeClient.clientId) {
              return
            }

            const presenceTimestamp = typeof parsedPresence.data.timestamp === 'number'
              ? parsedPresence.data.timestamp
              : Date.parse(String(parsedPresence.data.timestamp || ''))

            realtimeClient.focused = Boolean(parsedPresence.data.focused)
            realtimeClient.visible = Boolean(parsedPresence.data.visible)
            realtimeClient.visibilityState = parsedPresence.data.visibilityState || 'hidden'
            realtimeClient.isMobile = Boolean(parsedPresence.data.isMobile)
            realtimeClient.lastSeenAt = Number.isFinite(presenceTimestamp) && presenceTimestamp > 0
              ? presenceTimestamp
              : Date.now()
            return
          }
          
          if (data.type === 'subscribe' && typeof data.channel === 'string') {
            const ch = data.channel as string
            if (!channelSubscriptions.has(ch)) channelSubscriptions.set(ch, new Set())
            channelSubscriptions.get(ch)!.add(connectionId)
            return
          }

          if (data.type === 'unsubscribe' && typeof data.channel === 'string') {
            channelSubscriptions.get(data.channel as string)?.delete(connectionId)
            return
          }

          if (data.type === 'call.audio-chunk') {
            const conversation = await findConversationById(data.conversationId)
            if (conversation && conversation.kind !== 'direct-secret' && (conversation.userAId === user.id || conversation.userBId === user.id)) {
              const targetUserId = conversation.userAId === user.id ? conversation.userBId : conversation.userAId
              
              const outPayload = {
                type: 'call.audio-chunk',
                conversationId: data.conversationId,
                callId: data.callId,
                senderId: user.id,
                audioBase64: data.audioBase64,
                sampleRate: data.sampleRate,
                timestamp: new Date().toISOString()
              }

              emitToClient(resolveTargetClientForCall(String(data.callId || ''), conversation.id, targetUserId), outPayload)
            }
            return
          }
        }
      } catch (e) {}

      socket.send(JSON.stringify({
        type: 'echo',
        payload: value.toString(),
      }))
    })

    socket.on('close', () => {
      clients.delete(connectionId)
      for (const subscribers of channelSubscriptions.values()) {
        subscribers.delete(connectionId)
      }
    })
  })

  app.get<{ Params: { agentId: string } }>(
    '/ws/agents/:agentId/stream',
    { websocket: true },
    async (socket: MessengerRealtimeSocket, request: FastifyRequest<{ Params: { agentId: string } }>) => {
      const requestUrl = new URL(request.url || '/ws', `http://${request.headers.host || 'localhost'}`)
      const token = requestUrl.searchParams.get('token')
      const payload = token ? verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET) : null
      const user = payload ? await findMessengerUserById(payload.sub) : null

      if (!payload || !user) {
        socket.close(4401, 'UNAUTHORIZED')
        return
      }

      const { agentId } = request.params
      const agent = await findMessengerAgentById(agentId)
      if (!agent) {
        socket.close(4404, 'AGENT_NOT_FOUND')
        return
      }

      const connectionId = randomUUID()
      const realtimeClient: MessengerRealtimeClient = {
        connectionId,
        userId: user.id,
        clientId: `agent-stream-${agentId}`,
        socket,
        focused: true,
        visible: true,
        visibilityState: 'visible',
        isMobile: false,
        lastSeenAt: Date.now(),
      }
      clients.set(connectionId, realtimeClient)

      // Auto-subscribe to the agent's stream channel to receive ingest broadcast events
      const streamChannel = `agent-stream:${agentId}`
      if (!channelSubscriptions.has(streamChannel)) channelSubscriptions.set(streamChannel, new Set())
      channelSubscriptions.get(streamChannel)!.add(connectionId)

      socket.send(JSON.stringify({
        type: 'hello',
        agentId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      }))

      socket.on('message', async (value: Buffer) => {
        try {
          const data = JSON.parse(value.toString())

          if (data.type === 'send' && typeof data.body === 'string' && typeof data.conversationId === 'string') {
            const messageBody = data.body.trim()
            const conversationId = data.conversationId as string
            if (!messageBody || !conversationId) return

            const conversation = await findConversationById(conversationId)
            if (
              !conversation
              || conversation.kind !== 'agent'
              || conversation.userAId !== user.id
              || conversation.userBId !== agentId
            ) {
              socket.send(JSON.stringify({ type: 'error', error: 'CONVERSATION_FORBIDDEN' }))
              return
            }

            const cliAgent = await isCliAgent(agentId)
            const users = await listMessengerUsers()
            await addMessageToConversation(conversationId, user, messageBody, { plaintext: cliAgent || undefined })
            const ts = new Date().toISOString()
            emitToUsers([user.id], { type: 'messages.updated', conversationId, timestamp: ts })

            const runningCliSession = await findRunningCliSessionForAgent(agentId)
            if (runningCliSession) {
              const ingestToken = await getAgentIngestToken(agentId)
              const coreConfig = readMessengerConfig()
              const messengerCoreUrl = `http://localhost:${coreConfig.MESSENGER_CORE_PORT}`
              if (ingestToken) {
                const { runId } = await createRun({ agentId, conversationId, prompt: messageBody })
                const claudeSessionBin = join(homedir(), 'bin/claude-session')
                execFileAsync(claudeSessionBin, [
                  'send', runningCliSession.slug, messageBody,
                  '--agent-id', agentId,
                  '--run-id', runId,
                  '--messenger-core-url', messengerCoreUrl,
                  '--ingest-token', ingestToken,
                ]).catch((err: unknown) => app.log.warn(err, 'claude-session send failed (agent-stream ws)'))
              }
            } else {
              try {
                const transcript = await listMessagesForConversation(conversationId, user, users)
                const replyBody = await buildMessengerAgentReply(
                  agentId,
                  messageBody,
                  transcript
                    .slice(-8)
                    .filter(item => !item.deletedAt)
                    .map(item => ({
                      role: item.own ? 'user' as const : 'assistant' as const,
                      content: item.kind === 'file'
                        ? `${item.body}${item.attachment ? ` (${item.attachment.name})` : ''}`
                        : item.body,
                    })),
                )
                await addAgentMessageToConversation(conversationId, agent, replyBody, { plaintext: cliAgent || undefined })
                emitToUsers([user.id], { type: 'messages.updated', conversationId, timestamp: new Date().toISOString() })
              } catch (err) {
                app.log.warn(err, 'agent fallback reply failed (agent-stream ws)')
              }
            }
          }
        } catch {
          // ignore malformed frames
        }
      })

      socket.on('close', () => {
        clients.delete(connectionId)
        for (const subscribers of channelSubscriptions.values()) {
          subscribers.delete(connectionId)
        }
      })
    },
  )

  app.get<{ Params: { rootRunId: string } }>(
    '/ws/agent-tree/:rootRunId',
    { websocket: true },
    async (socket: MessengerRealtimeSocket, request: FastifyRequest<{ Params: { rootRunId: string } }>) => {
      const requestUrl = new URL(request.url || '/ws', `http://${request.headers.host || 'localhost'}`)
      const token = requestUrl.searchParams.get('token')
      const payload = token ? verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET) : null
      const user = payload ? await findMessengerUserById(payload.sub) : null

      if (!payload || !user) {
        socket.close(4401, 'UNAUTHORIZED')
        return
      }

      const { rootRunId } = request.params
      const connectionId = randomUUID()
      const realtimeClient: MessengerRealtimeClient = {
        connectionId,
        userId: user.id,
        clientId: `agent-tree-${rootRunId}`,
        socket,
        focused: false,
        visible: true,
        visibilityState: 'visible',
        isMobile: false,
        lastSeenAt: Date.now(),
      }
      clients.set(connectionId, realtimeClient)

      // Subscribe to agent-tree channel to receive run-tree broadcast events
      const treeChannel = `agent-tree:${rootRunId}`
      if (!channelSubscriptions.has(treeChannel)) channelSubscriptions.set(treeChannel, new Set())
      channelSubscriptions.get(treeChannel)!.add(connectionId)

      socket.on('close', () => {
        clients.delete(connectionId)
        for (const subscribers of channelSubscriptions.values()) {
          subscribers.delete(connectionId)
        }
      })
    },
  )

  registerIngestRoutes(app, broadcastToChannel, emitToUsers)
  registerOrchestrationRoutes(app, broadcastToChannel)
  registerProjectsRoutes(app, broadcastToChannel)

  return app
}
