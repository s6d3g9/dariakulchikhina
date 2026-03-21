<template>
  <section class="comm-panel glass-surface">
    <div v-if="bootstrapPending" class="comm-empty">[ LOADING COMMUNICATIONS... ]</div>
    <div v-else-if="bootstrapError" class="comm-empty comm-empty--error">{{ bootstrapErrorMessage }}</div>
    <div v-else-if="runtimeError" class="comm-empty comm-empty--error">{{ runtimeError }}</div>
    <template v-else>
      <section v-if="quickSection === 'chat'" class="comm-chat-view">
        <div class="comm-chat-toolbar">
          <div class="comm-call-actions">
            <button type="button" class="comm-icon-btn" :disabled="callBusy || !currentChatPeer" aria-label="Видеозвонок" title="Видеозвонок" @click="startOutgoingCall('video')">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="comm-icon-svg">
                <path d="M4 7.5C4 6.67 4.67 6 5.5 6h8C14.33 6 15 6.67 15 7.5v2.63l3.54-2.29A1 1 0 0 1 20 8.67v6.66a1 1 0 0 1-1.46.83L15 13.87v2.63c0 .83-.67 1.5-1.5 1.5h-8A1.5 1.5 0 0 1 4 16.5v-9Z" fill="currentColor"/>
              </svg>
            </button>
            <button type="button" class="comm-icon-btn" :disabled="callBusy || !currentChatPeer" aria-label="Аудиозвонок" title="Аудиозвонок" @click="startOutgoingCall('audio')">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="comm-icon-svg">
                <path d="M6.62 10.79a15.54 15.54 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.56 3.57.56.55 0 1 .45 1 1V20a1 1 0 0 1-1 1C10.06 21 3 13.94 3 5a1 1 0 0 1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.19 2.45.56 3.57.12.35.03.74-.24 1.02l-2.2 2.2Z" fill="currentColor"/>
              </svg>
            </button>
            <button v-if="activeCall" type="button" class="comm-icon-btn comm-icon-btn--danger" aria-label="Завершить звонок" title="Завершить звонок" @click="hangupCall">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="comm-icon-svg">
                <path d="M5.03 8.97a12.9 12.9 0 0 1 13.94 0c.47.3.63.91.37 1.4l-1.46 2.72a1 1 0 0 1-1.36.4l-2.74-1.37a1 1 0 0 0-.9 0L10.14 13.5a1 1 0 0 1-1.36-.4L7.32 10.37a1 1 0 0 1 .37-1.4Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <p v-if="callStatusText" class="comm-status">{{ callStatusText }}</p>
        </div>

        <div v-if="activeCall" class="comm-call-toggle-row">
          <button type="button" class="comm-chip-btn" :class="{ 'comm-chip-btn--inactive': !callControls.microphoneEnabled }" @click="toggleMicrophone">
            {{ callControls.microphoneEnabled ? 'MIC ON' : 'MIC OFF' }}
          </button>
          <button type="button" class="comm-chip-btn" :class="{ 'comm-chip-btn--inactive': !callControls.speakerEnabled }" @click="toggleSpeaker">
            {{ callControls.speakerEnabled ? 'SOUND ON' : 'SOUND OFF' }}
          </button>
          <span v-if="remoteMutedByPeer" class="comm-status">Собеседник отключил микрофон</span>
        </div>

        <div v-if="currentChatPeer" class="comm-call-security" :class="{ 'comm-call-security--active': callSecurity.active }">
          <p class="comm-call-security__status">{{ callSecurity.status }}</p>
          <p v-if="callSecurity.active && callSecurity.verificationEmojis.length" class="comm-call-security__emojis">{{ callSecurity.verificationEmojis.join(' ') }}</p>
          <p v-else-if="callSecurity.fallbackReason" class="comm-call-security__fallback">{{ callSecurity.fallbackReason }}</p>
          <p v-if="callPermissionHelp" class="comm-call-security__fallback">{{ callPermissionHelp }}</p>
        </div>

        <div v-if="incomingCall" class="comm-incoming glass-card">
          <p class="comm-incoming-title">Входящий {{ incomingCall.mode === 'video' ? 'видеозвонок' : 'аудиозвонок' }}</p>
          <p class="comm-incoming-meta">От {{ incomingCall.fromDisplayName }}</p>
          <p v-if="incomingCall.e2ee?.supported" class="comm-status">{{ callSecurity.available ? 'После принятия активируется дополнительное E2EE звонка.' : 'Собеседник поддерживает дополнительное E2EE, но этот браузер умеет только штатное шифрование WebRTC.' }}</p>
          <div class="comm-incoming-actions">
            <button type="button" class="a-btn-sm" @click="acceptIncomingCall">Принять</button>
            <button type="button" class="a-btn-sm a-btn-danger" @click="rejectIncomingCall">Отклонить</button>
          </div>
        </div>

        <div v-if="currentChatPeer" class="comm-block">
          <div class="comm-chat-subject">
            <div>
              <div class="comm-chat-subject-name">{{ currentChatPeer.displayName }}</div>
              <div v-if="currentChatPeer.nickname" class="comm-chat-subject-nick">@{{ currentChatPeer.nickname }}</div>
              <div class="comm-chat-subject-role">{{ currentChatPeer.role }}</div>
            </div>
          </div>
          <div class="comm-media-grid">
            <div class="comm-media-box">
              <div class="comm-media-label">Вы</div>
              <video ref="localVideoEl" class="comm-video" autoplay playsinline muted />
            </div>
            <div class="comm-media-box">
              <div class="comm-media-label">Собеседник</div>
              <video ref="remoteVideoEl" class="comm-video" autoplay playsinline />
            </div>
          </div>
        </div>

        <div class="comm-main">
          <div ref="messagesEl" class="comm-messages">
            <article
              v-for="message in decryptedMessages"
              :key="message.id"
              class="comm-message"
              :class="{ 'comm-message--me': message.senderActorKey === actorKey }"
            >
              <header class="comm-message-head">
                <span>{{ message.senderDisplayName }}</span>
                <span>{{ formatMessageTime(message.createdAt) }}</span>
              </header>
              <p class="comm-message-text">{{ message.text }}</p>
            </article>
            <div v-if="currentChatPeer && !decryptedMessages.length" class="comm-empty">[ NO DIRECT MESSAGES ]</div>
            <div v-else-if="!currentChatPeer && hasAvailableContacts" class="comm-empty">[ ВЫБЕРИТЕ КОНТАКТ ИЗ РАЗДЕЛА КОНТАКТЫ ИЛИ ЧАТЫ ]</div>
            <div v-else-if="!currentChatPeer" class="comm-empty">[ У ПРОЕКТА ПОКА НЕТ СОБЕСЕДНИКОВ ДЛЯ DIRECT-ЧАТА ]</div>
          </div>

          <form class="comm-form" @submit.prevent="sendEncryptedMessage">
            <div class="comm-compose-row">
              <textarea
                v-model="draftMessage"
                class="glass-input comm-input"
                rows="3"
                :disabled="!currentChatPeer"
                placeholder="Сообщение уйдёт только выбранному собеседнику."
              />
              <button
                type="submit"
                class="comm-send-btn"
                :disabled="sendingMessage || !draftMessage.trim() || !currentChatPeer"
                aria-label="Отправить сообщение"
                title="Отправить сообщение"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" class="comm-icon-svg comm-icon-svg--send">
                  <path d="M12 4 5 11h4v9h6v-9h4l-7-7Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div v-if="syncStatus" class="comm-form-actions">
              <span v-if="syncStatus" class="comm-status">{{ syncStatus }}</span>
            </div>
          </form>
        </div>
      </section>

      <section v-else-if="quickSection === 'chats'" class="comm-block">
        <div class="comm-block-title">Открытые чаты</div>
        <label class="u-field__label" for="comm-chat-search">Поиск по чатам</label>
        <input id="comm-chat-search" v-model="chatSearch" type="text" class="glass-input glass-input--inline comm-search" placeholder="Имя, роль или @никнейм">
        <div v-if="filteredOpenChats.length" class="comm-list-grid">
          <button
            v-for="chat in filteredOpenChats"
            :key="chat.roomId"
            type="button"
            class="comm-person"
            :class="{ 'comm-person--active': currentChatPeerKey === chat.participant.actorKey }"
            @click="openChatSummary(chat)"
          >
            <span class="comm-person-name">{{ chat.participant.displayName }}</span>
            <span v-if="chat.participant.nickname" class="comm-person-nick">@{{ chat.participant.nickname }}</span>
            <span class="comm-person-role">{{ chat.participant.role }}</span>
            <span class="comm-chat-updated">{{ formatMessageTime(chat.updatedAt) }}</span>
          </button>
        </div>
        <div v-else class="comm-empty-inline">{{ hasAvailableContacts ? '[ НЕТ ОТКРЫТЫХ ЧАТОВ ]' : '[ НЕТ ОТКРЫТЫХ ЧАТОВ: СНАЧАЛА НУЖНЫ КОНТАКТЫ ]' }}</div>
      </section>

      <section v-else-if="quickSection === 'contacts'" class="comm-block">
        <div class="comm-block-title">Контакты</div>
        <label class="u-field__label" for="comm-contact-search">Поиск по контактам</label>
        <input id="comm-contact-search" v-model="contactSearch" type="text" class="glass-input glass-input--inline comm-search" placeholder="Имя, роль или @никнейм">

        <div v-if="filteredContacts.length" class="comm-list-grid">
          <button
            v-for="participant in filteredContacts"
            :key="participant.actorKey"
            type="button"
            class="comm-person"
            :class="{ 'comm-person--active': currentChatPeerKey === participant.actorKey }"
            @click="startChatWithParticipant(participant)"
          >
            <span class="comm-person-name">{{ participant.displayName }}</span>
            <span v-if="participant.nickname" class="comm-person-nick">@{{ participant.nickname }}</span>
            <span class="comm-person-role">{{ participant.role }}</span>
          </button>
        </div>
        <div v-else class="comm-empty-inline">
          <p>[ НЕТ ДОСТУПНЫХ КОНТАКТОВ ]</p>
          <p class="comm-empty-note">Контакты появятся после привязки к проекту дизайнера, подрядчика или другого участника.</p>
        </div>
      </section>

      <section v-else class="comm-block">
        <div class="comm-settings-grid">
          <section class="comm-setting-card">
            <div class="comm-block-title">Никнейм</div>
            <label class="u-field__label" for="comm-my-nickname">Публичный никнейм</label>
            <input
              id="comm-my-nickname"
              v-model="nicknameDraft"
              type="text"
              class="glass-input glass-input--inline comm-search"
              placeholder="Например, @daria_design"
              maxlength="33"
              @blur="saveMyNickname"
              @keydown.enter.prevent="saveMyNickname"
            >
            <p class="comm-setting-note">Никнейм используется в поиске контактов и в списке открытых чатов.</p>
            <p v-if="nicknameStatus" class="comm-status">{{ nicknameStatus }}</p>
          </section>

          <section class="comm-setting-card">
            <div class="comm-block-title">Уведомления</div>
            <p class="comm-setting-row">
              <span class="comm-setting-name">Новые сообщения</span>
              <span class="comm-setting-value">Скоро</span>
            </p>
            <p class="comm-setting-row">
              <span class="comm-setting-name">Входящие звонки</span>
              <span class="comm-setting-value">Скоро</span>
            </p>
            <p class="comm-setting-note">Следующий этап: переключатели браузерных уведомлений и тонов вызова.</p>
          </section>

          <section class="comm-setting-card">
            <div class="comm-block-title">Разрешения</div>
            <p class="comm-setting-row">
              <span class="comm-setting-name">Микрофон</span>
              <span class="comm-setting-value">{{ microphonePermissionLabel }}</span>
            </p>
            <p class="comm-setting-row">
              <span class="comm-setting-name">Камера</span>
              <span class="comm-setting-value">{{ cameraPermissionLabel }}</span>
            </p>
            <div class="comm-setting-actions">
              <button type="button" class="a-btn-sm" @click="checkAudioAccess">Проверить микрофон</button>
              <button type="button" class="a-btn-sm" @click="checkVideoAccess">Проверить камеру</button>
            </div>
            <p class="comm-setting-note">{{ videoReadiness }}</p>
            <p v-if="callPermissionHelp" class="comm-setting-note">{{ callPermissionHelp }}</p>
          </section>

          <section class="comm-setting-card">
            <div class="comm-block-title">Конфиденциальность</div>
            <p class="comm-setting-row">
              <span class="comm-setting-name">Сообщения</span>
              <span class="comm-setting-value">E2EE</span>
            </p>
            <p class="comm-setting-row">
              <span class="comm-setting-name">Звонки</span>
              <span class="comm-setting-value">{{ callSecurity.available ? 'WEBRTC + E2EE' : 'WEBRTC DTLS-SRTP' }}</span>
            </p>
            <p class="comm-setting-note">{{ callSecurity.available ? 'Браузер поддерживает encoded streams: для звонка добавляется дополнительный E2EE-слой и символы сверки.' : 'Relay хранит только ciphertext и публичные key bundles, а звонки защищены штатным шифрованием WebRTC.' }}</p>
          </section>
        </div>
      </section>

      <nav class="comm-bottom-switch" aria-label="Быстрые разделы коммуникаций">
        <button type="button" class="comm-bottom-switch__btn" :class="{ 'comm-bottom-switch__btn--active': quickSection === 'chat' }" @click="quickSection = 'chat'">Чат</button>
        <button type="button" class="comm-bottom-switch__btn" :class="{ 'comm-bottom-switch__btn--active': quickSection === 'chats' }" @click="quickSection = 'chats'">Чаты</button>
        <button type="button" class="comm-bottom-switch__btn" :class="{ 'comm-bottom-switch__btn--active': quickSection === 'contacts' }" @click="quickSection = 'contacts'">Контакты</button>
        <button type="button" class="comm-bottom-switch__btn" :class="{ 'comm-bottom-switch__btn--active': quickSection === 'settings' }" @click="quickSection = 'settings'">Настройки</button>
      </nav>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useProjectCommunicationsBootstrap } from '~~/app/composables/useProjectCommunicationsBootstrap'
import type {
  CommunicationActorRole,
  CommunicationCallE2EEPayload,
  CommunicationCallSecurityContext,
  CommunicationCallSecurityState,
  CommunicationKeyBundle,
  CommunicationKeyBundlesResponse,
  CommunicationMessage,
  CommunicationMessagesResponse,
  CommunicationRoom,
  CommunicationRoomResponse,
  CommunicationRoomsResponse,
  CommunicationSignal,
  ProjectCommunicationBootstrap,
} from '~~/shared/types/communications'
import {
  activateCommunicationCallSecurityContext,
  applyCommunicationReceiverCallSecurity,
  applyCommunicationSenderCallSecurity,
  createCommunicationRoomKey,
  decodeCommunicationCallBase64,
  decryptCommunicationText,
  encodeCommunicationCallBase64,
  encryptCommunicationText,
  exportCommunicationPrivateKey,
  exportCommunicationPublicKey,
  exportCommunicationRoomKey,
  generateCommunicationCallE2EEKeyPair,
  generateCommunicationIdentityKeyPair,
  importCommunicationPrivateKey,
  importCommunicationRoomKey,
  supportsCommunicationCallEncryption,
  unwrapCommunicationRoomKeyFromPeer,
  wrapCommunicationRoomKeyForPeer,
} from '~~/shared/utils/communications-e2ee'

const props = defineProps<{
  projectSlug: string
}>()

type CallMode = 'audio' | 'video'

type SecureParticipant = {
  actorKey: string
  actorId: string
  role: CommunicationActorRole
  displayName: string
  nickname?: string
}

type DecryptedUiMessage = {
  id: string
  createdAt: string
  senderActorKey: string
  senderDisplayName: string
  text: string
}

type ChatSummary = {
  roomId: string
  externalRef: string
  updatedAt: string
  participant: SecureParticipant
}

type IncomingCallState = {
  callId: string
  fromActorKey: string
  fromDisplayName: string
  mode: CallMode
  e2ee?: CommunicationCallE2EEPayload
}

type ActiveCallState = {
  callId: string
  peerActorKey: string
  mode: CallMode
  initiator: boolean
}

type SignalPayloadRecord = Record<string, unknown>
type MediaPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown' | 'unsupported'

const localVideoEl = ref<HTMLVideoElement | null>(null)
const remoteVideoEl = ref<HTMLVideoElement | null>(null)
const messagesEl = ref<HTMLElement | null>(null)

const { data: bootstrap, pending: bootstrapPending, error: bootstrapError } = useProjectCommunicationsBootstrap(computed(() => props.projectSlug))

const bootstrapData = computed(() => bootstrap.value as ProjectCommunicationBootstrap | null)
const bootstrapErrorMessage = computed(() => (bootstrapError.value as any)?.data?.statusMessage || (bootstrapError.value as any)?.message || 'Не удалось инициализировать защищённую связь')
const actorKey = computed(() => bootstrapData.value?.actor.actorKey || '')
const directChatsPrefix = computed(() => `project:${props.projectSlug}:direct:`)

const projectRoomId = ref('')
const currentChatRoomId = ref('')
const currentChatExternalRef = ref('')
const currentChatPeerKey = ref('')
const contacts = ref<SecureParticipant[]>([])
const openChats = ref<ChatSummary[]>([])
const decryptedMessages = ref<DecryptedUiMessage[]>([])
const keyBundles = ref<CommunicationKeyBundle[]>([])
const sendingMessage = ref(false)
const draftMessage = ref('')
const syncStatus = ref('')
const eventStreamConnected = ref(false)
const roomKeyReady = ref(false)
const runtimeError = ref('')
const contactSearch = ref('')
const chatSearch = ref('')
const nicknameDraft = ref('')
const nicknameStatus = ref('')
const nicknameSaving = ref(false)
const quickSection = ref<'chat' | 'chats' | 'contacts' | 'settings'>('contacts')

const incomingCall = ref<IncomingCallState | null>(null)
const activeCall = ref<ActiveCallState | null>(null)
const callStatusText = ref('')
const callBusy = computed(() => Boolean(incomingCall.value || activeCall.value))
const callSecurity = ref<CommunicationCallSecurityState>(createDefaultCallSecurityState())
const callPermissionHelp = ref('')
const remoteMutedByPeer = ref(false)
const callControls = ref({
  microphoneEnabled: true,
  speakerEnabled: true,
})
const mediaPermissionState = ref<Record<'microphone' | 'camera', MediaPermissionState>>({
  microphone: 'unknown',
  camera: 'unknown',
})

let eventSource: EventSource | null = null
let peerConnection: RTCPeerConnection | null = null
let peerConnectionCallId = ''
let localStream: MediaStream | null = null
let remoteStream: MediaStream | null = null
let identityPrivateKey: CryptoKey | null = null
let identityPublicKeyJwk: JsonWebKey | null = null
let roomKey: CryptoKey | null = null
let myKeyId = ''
let callSecurityContext: CommunicationCallSecurityContext | null = null

const pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>()
const transformedCallSenders = new WeakSet<object>()
const transformedCallReceivers = new WeakSet<object>()

const roomStorageKey = computed(() => `comm-room-key:${currentChatExternalRef.value || props.projectSlug}:${actorKey.value}`)
const identityStorageKey = computed(() => `comm-identity:${props.projectSlug}:${actorKey.value}`)

function createDefaultCallSecurityState(): CommunicationCallSecurityState {
  const available = supportsCommunicationCallEncryption()
  return {
    available,
    active: false,
    verificationEmojis: [],
    status: available
      ? 'Браузер готов к дополнительному E2EE звонков. Символы сверки появятся после согласования ключей.'
      : 'Для звонков доступно только штатное шифрование WebRTC.',
    fallbackReason: available ? '' : 'Нет поддержки encoded insertable streams.',
  }
}

function participantActorKey(participant: { actorId: string; role: CommunicationActorRole }) {
  return `${participant.role}:${participant.actorId}`
}

function normalizeParticipants(items: CommunicationRoom['participants']) {
  return items.map((item) => ({
    actorKey: participantActorKey(item),
    actorId: item.actorId,
    role: item.role,
    displayName: item.displayName || item.actorId,
    nickname: typeof item.nickname === 'string' && item.nickname.trim() ? item.nickname.trim() : undefined,
  }))
}

function normalizeNicknameInput(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase()
}

function isValidNickname(value: string) {
  return /^[\p{L}\p{N}._-]{3,32}$/u.test(value)
}

const selfParticipant = computed(() => contacts.value.find((participant) => participant.actorKey === actorKey.value) || null)
const availableContacts = computed(() => contacts.value.filter((participant) => participant.actorKey !== actorKey.value))
const currentChatPeer = computed(() => availableContacts.value.find((participant) => participant.actorKey === currentChatPeerKey.value) || null)

const filteredContacts = computed(() => {
  const query = contactSearch.value.trim().toLowerCase()
  if (!query) return availableContacts.value
  return availableContacts.value.filter((participant) => [participant.displayName, participant.role, participant.nickname ? `@${participant.nickname}` : ''].join(' ').toLowerCase().includes(query))
})

const filteredOpenChats = computed(() => {
  const query = chatSearch.value.trim().toLowerCase()
  if (!query) return openChats.value
  return openChats.value.filter((chat) => [chat.participant.displayName, chat.participant.role, chat.participant.nickname ? `@${chat.participant.nickname}` : ''].join(' ').toLowerCase().includes(query))
})

const hasAvailableContacts = computed(() => availableContacts.value.length > 0)
const supportedCalls = computed(() => Boolean(import.meta.client && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof RTCPeerConnection !== 'undefined'))
const microphonePermissionLabel = computed(() => mapPermissionLabel(mediaPermissionState.value.microphone))
const cameraPermissionLabel = computed(() => mapPermissionLabel(mediaPermissionState.value.camera))
const videoReadiness = computed(() => {
  if (!supportedCalls.value) {
    return 'Браузер не поддерживает WebRTC или доступ к медиа.'
  }

  if (mediaPermissionState.value.microphone === 'granted' && mediaPermissionState.value.camera === 'granted') {
    return 'Микрофон и камера разрешены. Аудио- и видеозвонки готовы.'
  }

  if (mediaPermissionState.value.microphone === 'denied' || mediaPermissionState.value.camera === 'denied') {
    return 'Часть разрешений заблокирована. Разрешите доступ к микрофону и камере в браузере.'
  }

  return 'Доступ к микрофону и камере можно проверить заранее, либо браузер запросит его при старте звонка.'
})

function buildDirectChatExternalRef(peerActorKey: string) {
  return `${directChatsPrefix.value}${[actorKey.value, peerActorKey].sort().join('__')}`
}

function mapPermissionLabel(value: MediaPermissionState) {
  switch (value) {
    case 'granted':
      return 'Разрешён'
    case 'denied':
      return 'Заблокирован'
    case 'prompt':
      return 'По запросу'
    case 'unsupported':
      return 'Недоступно'
    default:
      return 'Неизвестно'
  }
}

async function apiFetch<T>(path: string, options: any = {}) {
  return await $fetch<T>(`/api/projects/${props.projectSlug}/communications${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
}

async function ensureIdentity() {
  if (identityPrivateKey && identityPublicKeyJwk && myKeyId) return

  if (import.meta.client) {
    const raw = sessionStorage.getItem(identityStorageKey.value)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { keyId: string; privateKeyJwk: JsonWebKey; publicKeyJwk: JsonWebKey }
        identityPrivateKey = await importCommunicationPrivateKey(parsed.privateKeyJwk)
        identityPublicKeyJwk = parsed.publicKeyJwk
        myKeyId = parsed.keyId
        return
      } catch {
        sessionStorage.removeItem(identityStorageKey.value)
      }
    }
  }

  const pair = await generateCommunicationIdentityKeyPair()
  identityPrivateKey = pair.privateKey
  identityPublicKeyJwk = await exportCommunicationPublicKey(pair.publicKey)
  myKeyId = `${bootstrapData.value?.actor.role || 'actor'}-${bootstrapData.value?.actor.actorId || '0'}-${Math.random().toString(36).slice(2, 8)}`

  if (import.meta.client) {
    const privateKeyJwk = await exportCommunicationPrivateKey(pair.privateKey)
    sessionStorage.setItem(identityStorageKey.value, JSON.stringify({ keyId: myKeyId, privateKeyJwk, publicKeyJwk: identityPublicKeyJwk }))
  }
}

async function ensureStoredRoomKey() {
  if (roomKey) {
    roomKeyReady.value = true
    return roomKey
  }

  if (import.meta.client) {
    const raw = sessionStorage.getItem(roomStorageKey.value)
    if (raw) {
      roomKey = await importCommunicationRoomKey(raw)
      roomKeyReady.value = true
      return roomKey
    }
  }

  return null
}

async function persistRoomKey(nextRoomKey: CryptoKey) {
  roomKey = nextRoomKey
  roomKeyReady.value = true
  if (import.meta.client) {
    sessionStorage.setItem(roomStorageKey.value, await exportCommunicationRoomKey(nextRoomKey))
  }
}

async function loadProjectContacts() {
  const externalRef = bootstrapData.value?.roomExternalRef
  if (!externalRef) return

  const response = await apiFetch<CommunicationRoomResponse>('/rooms', {
    method: 'POST',
    body: {
      externalRef,
      title: bootstrapData.value?.roomTitle,
      kind: 'project',
      participants: bootstrapData.value?.roomParticipants || [],
    },
  })

  projectRoomId.value = response.room.id
  contacts.value = normalizeParticipants(response.room.participants)
}

async function fetchOpenChats() {
  const response = await apiFetch<CommunicationRoomsResponse>(`/rooms?kind=direct&externalRefPrefix=${encodeURIComponent(directChatsPrefix.value)}`, { method: 'GET' })
  const nextChats: ChatSummary[] = []
  for (const room of response.rooms) {
    const peer = normalizeParticipants(room.participants).find((participant) => participant.actorKey !== actorKey.value)
    if (!peer) continue
    nextChats.push({
      roomId: room.id,
      externalRef: room.externalRef,
      updatedAt: room.updatedAt || new Date().toISOString(),
      participant: peer,
    })
  }
  openChats.value = nextChats
}

async function saveMyNickname() {
  if (!projectRoomId.value || nicknameSaving.value) return

  const nextNickname = normalizeNicknameInput(nicknameDraft.value)
  const currentNickname = selfParticipant.value?.nickname || ''

  if (nextNickname && !isValidNickname(nextNickname)) {
    nicknameStatus.value = 'Никнейм должен содержать 3-32 символа: буквы, цифры, точку, дефис или подчёркивание'
    return
  }
  if (nextNickname === currentNickname) {
    nicknameStatus.value = ''
    nicknameDraft.value = nextNickname ? `@${nextNickname}` : ''
    return
  }

  nicknameSaving.value = true
  nicknameStatus.value = 'Сохраняем никнейм…'
  try {
    const response = await apiFetch<CommunicationRoomResponse>(`/rooms/${projectRoomId.value}/me/nickname`, {
      method: 'PUT',
      body: { nickname: nextNickname || '' },
    })
    contacts.value = normalizeParticipants(response.room.participants)
    nicknameDraft.value = nextNickname ? `@${nextNickname}` : ''
    nicknameStatus.value = nextNickname ? 'Никнейм сохранён' : 'Никнейм очищен'
  } catch (error: any) {
    nicknameStatus.value = error?.data?.error || error?.message || 'Не удалось сохранить никнейм'
  } finally {
    nicknameSaving.value = false
  }
}

function resetChatState() {
  eventSource?.close()
  eventSource = null
  keyBundles.value = []
  decryptedMessages.value = []
  roomKey = null
  roomKeyReady.value = false
  syncStatus.value = ''
  eventStreamConnected.value = false
}

function setCallSecurityPending(status: string) {
  callSecurity.value = {
    available: supportsCommunicationCallEncryption(),
    active: false,
    verificationEmojis: [],
    status,
    fallbackReason: '',
  }
}

function setCallSecurityFallback(reason: string) {
  callSecurity.value = {
    available: supportsCommunicationCallEncryption(),
    active: false,
    verificationEmojis: [],
    status: 'Звонок защищён только транспортным шифрованием WebRTC.',
    fallbackReason: reason,
  }
}

function setCallSecurityActive() {
  callSecurity.value = {
    available: true,
    active: true,
    verificationEmojis: callSecurityContext?.verificationEmojis || [],
    status: 'Дополнительное E2EE для звонка активно. Сверьте символы с собеседником.',
    fallbackReason: '',
  }
}

function clearCallSecurityContext() {
  callSecurityContext = null
}

function syncMicrophoneState() {
  if (!localStream) return
  for (const track of localStream.getAudioTracks()) {
    track.enabled = callControls.value.microphoneEnabled
  }
}

function syncSpeakerState() {
  if (remoteVideoEl.value) {
    remoteVideoEl.value.muted = !callControls.value.speakerEnabled
    if (callControls.value.speakerEnabled) {
      void remoteVideoEl.value.play().catch(() => {})
    }
  }
}

async function setMicrophoneEnabled(enabled: boolean) {
  callControls.value = {
    ...callControls.value,
    microphoneEnabled: enabled,
  }
  syncMicrophoneState()

  if (!activeCall.value || !currentChatRoomId.value) return
  await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
    method: 'POST',
    body: {
      kind: enabled ? 'unmute' : 'mute',
      callId: activeCall.value.callId,
      targetActorKey: activeCall.value.peerActorKey,
      payload: {},
    },
  }).catch(() => {})
}

async function toggleMicrophone() {
  await setMicrophoneEnabled(!callControls.value.microphoneEnabled)
}

function setSpeakerEnabled(enabled: boolean) {
  callControls.value = {
    ...callControls.value,
    speakerEnabled: enabled,
  }
  syncSpeakerState()
}

function toggleSpeaker() {
  setSpeakerEnabled(!callControls.value.speakerEnabled)
}

async function resolvePermissionState(kind: 'microphone' | 'camera'): Promise<MediaPermissionState> {
  if (!import.meta.client) return 'unknown'
  if (!navigator.permissions?.query) return 'unsupported'

  try {
    const status = await navigator.permissions.query({ name: kind as PermissionName })
    return status.state as MediaPermissionState
  } catch {
    return 'unknown'
  }
}

async function refreshMediaPermissions() {
  mediaPermissionState.value = {
    microphone: await resolvePermissionState('microphone'),
    camera: await resolvePermissionState('camera'),
  }
}

function describePermissionError(mode: CallMode) {
  const microphoneDenied = mediaPermissionState.value.microphone === 'denied'
  const cameraDenied = mediaPermissionState.value.camera === 'denied'

  if (mode === 'video' && (microphoneDenied || cameraDenied)) {
    return 'Браузер заблокировал микрофон или камеру. Разрешите доступ для этого сайта и повторите видеозвонок.'
  }

  if (mode === 'audio' && microphoneDenied) {
    return 'Браузер заблокировал микрофон. Разрешите доступ для этого сайта и повторите аудиозвонок.'
  }

  return mode === 'video'
    ? 'Нужен доступ к микрофону и камере, чтобы использовать видеозвонки.'
    : 'Нужен доступ к микрофону, чтобы использовать аудиозвонки.'
}

async function ensureMediaAccess(mode: CallMode) {
  callPermissionHelp.value = ''

  if (!supportedCalls.value) {
    callPermissionHelp.value = 'Звонки недоступны в этом браузере.'
    return false
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === 'video',
    })

    for (const track of stream.getTracks()) {
      track.stop()
    }

    await refreshMediaPermissions()
    return true
  } catch {
    await refreshMediaPermissions()
    callPermissionHelp.value = describePermissionError(mode)
    return false
  }
}

async function checkAudioAccess() {
  await ensureMediaAccess('audio')
}

async function checkVideoAccess() {
  await ensureMediaAccess('video')
}

function queueIceCandidate(callId: string, candidate: RTCIceCandidateInit) {
  const queue = pendingIceCandidates.get(callId) || []
  queue.push(candidate)
  pendingIceCandidates.set(callId, queue)
}

async function flushPendingIceCandidates(callId: string, connection: RTCPeerConnection) {
  const queue = pendingIceCandidates.get(callId)
  if (!queue?.length) return

  pendingIceCandidates.delete(callId)
  for (const candidate of queue) {
    await connection.addIceCandidate(candidate).catch(() => {})
  }
}

function mergeKeyBundle(bundle: CommunicationKeyBundle) {
  const bundleActorKey = `${bundle.actorRole}:${bundle.actorId}`
  const index = keyBundles.value.findIndex((item) => `${item.actorRole}:${item.actorId}` === bundleActorKey && item.keyId === bundle.keyId)
  if (index >= 0) keyBundles.value[index] = bundle
  else keyBundles.value = [...keyBundles.value, bundle]
}

async function publishMyKeyBundle() {
  if (!currentChatRoomId.value || !identityPublicKeyJwk || !myKeyId) return

  const response = await apiFetch<{ keyBundle: CommunicationKeyBundle }>(`/rooms/${currentChatRoomId.value}/key-bundles`, {
    method: 'POST',
    body: {
      keyId: myKeyId,
      algorithm: 'ECDH-P256',
      publicKeyJwk: identityPublicKeyJwk,
      deviceId: `${bootstrapData.value?.actor.role}-${bootstrapData.value?.actor.actorId}`,
    },
  })
  mergeKeyBundle(response.keyBundle)
}

async function rebuildDecryptedMessages(messages: CommunicationMessage[]) {
  const activeRoomKey = await ensureStoredRoomKey()
  if (!activeRoomKey) {
    decryptedMessages.value = messages.map((message) => ({
      id: message.id,
      createdAt: message.createdAt,
      senderActorKey: `${message.senderRole}:${message.senderActorId}`,
      senderDisplayName: message.senderDisplayName || message.senderActorId,
      text: '[ ЗАШИФРОВАНО ]',
    }))
    return
  }

  const result: DecryptedUiMessage[] = []
  for (const message of messages) {
    let text = '[ НЕ УДАЛОСЬ РАСШИФРОВАТЬ ]'
    try {
      text = await decryptCommunicationText({ roomKey: activeRoomKey, encrypted: message.encrypted })
    } catch {
      text = '[ НЕ УДАЛОСЬ РАСШИФРОВАТЬ ]'
    }
    result.push({
      id: message.id,
      createdAt: message.createdAt,
      senderActorKey: `${message.senderRole}:${message.senderActorId}`,
      senderDisplayName: message.senderDisplayName || message.senderActorId,
      text,
    })
  }
  decryptedMessages.value = result
  await nextTick()
  messagesEl.value?.scrollTo({ top: messagesEl.value.scrollHeight, behavior: 'smooth' })
}

async function fetchMessagesAndKeys() {
  if (!currentChatRoomId.value) return
  await publishMyKeyBundle()
  const [messageResponse, bundleResponse] = await Promise.all([
    apiFetch<CommunicationMessagesResponse>(`/rooms/${currentChatRoomId.value}/messages?limit=100`, { method: 'GET' }),
    apiFetch<CommunicationKeyBundlesResponse>(`/rooms/${currentChatRoomId.value}/key-bundles`, { method: 'GET' }),
  ])
  keyBundles.value = bundleResponse.keyBundles || []
  await rebuildDecryptedMessages(messageResponse.messages || [])
}

async function createAndBroadcastRoomKeyIfNeeded() {
  const existingRoomKey = await ensureStoredRoomKey()
  if (existingRoomKey || !identityPrivateKey) return existingRoomKey
  const newRoomKey = await createCommunicationRoomKey()
  await persistRoomKey(newRoomKey)
  await shareRoomKeyWithKnownPeers()
  return newRoomKey
}

async function shareRoomKeyWithKnownPeers(targetActorKey?: string) {
  if (!currentChatRoomId.value || !roomKey || !identityPrivateKey || !identityPublicKeyJwk) return

  const rawRoomKey = await exportCommunicationRoomKey(roomKey)
  const peerBundles = keyBundles.value.filter((bundle) => {
    const bundleActorKey = `${bundle.actorRole}:${bundle.actorId}`
    return bundleActorKey !== actorKey.value && (!targetActorKey || targetActorKey === bundleActorKey)
  })

  for (const bundle of peerBundles) {
    const wrapped = await wrapCommunicationRoomKeyForPeer({
      roomKeyBase64: rawRoomKey,
      senderPrivateKey: identityPrivateKey,
      recipientPublicKeyJwk: bundle.publicKeyJwk,
    })
    await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: {
        kind: 'room-key',
        callId: `room-key-${Date.now()}`,
        targetActorKey: `${bundle.actorRole}:${bundle.actorId}`,
        payload: {
          senderKeyId: myKeyId,
          senderPublicKeyJwk: identityPublicKeyJwk,
          wrappedCiphertext: wrapped.ciphertext,
          iv: wrapped.iv,
        },
      },
    })
  }
}

async function refreshMessagesOnly() {
  if (!currentChatRoomId.value) return
  const response = await apiFetch<CommunicationMessagesResponse>(`/rooms/${currentChatRoomId.value}/messages?limit=100`, { method: 'GET' })
  await rebuildDecryptedMessages(response.messages || [])
}

function setupEventStream() {
  if (!import.meta.client || !currentChatRoomId.value) return

  eventSource?.close()
  eventSource = new EventSource(`/api/projects/${props.projectSlug}/communications/rooms/${currentChatRoomId.value}/events`)
  eventSource.addEventListener('open', () => {
    eventStreamConnected.value = true
  })
  eventSource.addEventListener('error', () => {
    eventStreamConnected.value = false
  })
  eventSource.addEventListener('ready', async (event) => {
    const payload = JSON.parse((event as MessageEvent).data)
    keyBundles.value = payload.keyBundles || []
    await rebuildDecryptedMessages(payload.messages || [])
  })
  eventSource.addEventListener('key-bundle.published', async (event) => {
    const payload = JSON.parse((event as MessageEvent).data)
    if (payload.keyBundle) {
      mergeKeyBundle(payload.keyBundle)
      if (roomKey && `${payload.keyBundle.actorRole}:${payload.keyBundle.actorId}` !== actorKey.value) {
        await shareRoomKeyWithKnownPeers(`${payload.keyBundle.actorRole}:${payload.keyBundle.actorId}`)
      }
    }
  })
  eventSource.addEventListener('message.created', async () => {
    await refreshMessagesOnly()
    await fetchOpenChats()
  })
  eventSource.addEventListener('signal', async (event) => {
    const payload = JSON.parse((event as MessageEvent).data)
    await handleSignal(payload.signal)
  })
}

async function openDirectChat(peer: SecureParticipant, existingChat?: ChatSummary) {
  resetChatState()
  teardownCall('')

  const response = await apiFetch<CommunicationRoomResponse>('/rooms', {
    method: 'POST',
    body: {
      externalRef: existingChat?.externalRef || buildDirectChatExternalRef(peer.actorKey),
      title: `Чат: ${peer.displayName}`,
      kind: 'direct',
      participants: [
        {
          actorId: bootstrapData.value?.actor.actorId,
          role: bootstrapData.value?.actor.role,
          displayName: bootstrapData.value?.actor.displayName,
          nickname: bootstrapData.value?.actor.nickname,
        },
        {
          actorId: peer.actorId,
          role: peer.role,
          displayName: peer.displayName,
          nickname: peer.nickname,
        },
      ],
      metadata: {
        projectSlug: props.projectSlug,
        pair: [actorKey.value, peer.actorKey].sort(),
      },
    },
  })

  currentChatRoomId.value = response.room.id
  currentChatExternalRef.value = response.room.externalRef
  currentChatPeerKey.value = peer.actorKey
  quickSection.value = 'chat'

  await fetchMessagesAndKeys()
  setupEventStream()
  await ensureStoredRoomKey()
  if (!roomKeyReady.value && !decryptedMessages.value.length) {
    syncStatus.value = 'Ожидание синхронизации ключа комнаты'
    await createAndBroadcastRoomKeyIfNeeded()
  }
  await fetchOpenChats()
}

async function startChatWithParticipant(participant: SecureParticipant) {
  await openDirectChat(participant)
}

async function openChatSummary(chat: ChatSummary) {
  await openDirectChat(chat.participant, chat)
}

async function sendEncryptedMessage() {
  if (!draftMessage.value.trim() || !currentChatRoomId.value || !currentChatPeer.value) return

  sendingMessage.value = true
  syncStatus.value = ''
  try {
    const activeRoomKey = await createAndBroadcastRoomKeyIfNeeded()
    if (!activeRoomKey) {
      syncStatus.value = 'Ключ комнаты ещё не синхронизирован. Откройте чат у второго участника.'
      return
    }
    const encrypted = await encryptCommunicationText({ roomKey: activeRoomKey, text: draftMessage.value.trim(), senderKeyId: myKeyId })
    await apiFetch(`/rooms/${currentChatRoomId.value}/messages`, { method: 'POST', body: { encrypted } })
    draftMessage.value = ''
    await fetchOpenChats()
  } catch (error: any) {
    syncStatus.value = error?.data?.error || error?.message || 'Не удалось отправить сообщение'
  } finally {
    sendingMessage.value = false
  }
}

async function initMedia(mode: CallMode) {
  if (localStream) return localStream
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 48000,
      sampleSize: 16,
    },
    video: mode === 'video',
  })
  for (const track of localStream.getAudioTracks()) {
    track.contentHint = 'speech'
  }
  if (localVideoEl.value) localVideoEl.value.srcObject = localStream
  syncMicrophoneState()
  return localStream
}

function resetPeerConnection() {
  peerConnection?.close()
  peerConnection = null
  peerConnectionCallId = ''
  pendingIceCandidates.clear()
  remoteStream?.getTracks().forEach((track) => track.stop())
  remoteStream = null
  if (remoteVideoEl.value) remoteVideoEl.value.srcObject = null
  remoteMutedByPeer.value = false
}

function buildPeerConnection(callId: string, peerActorKey: string, mode: CallMode) {
  if (peerConnection && peerConnectionCallId === callId) return peerConnection

  resetPeerConnection()
  const connection = new RTCPeerConnection({
    bundlePolicy: 'max-bundle',
    iceCandidatePoolSize: 4,
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  })
  peerConnection = connection
  peerConnectionCallId = callId
  remoteStream = new MediaStream()
  if (remoteVideoEl.value) remoteVideoEl.value.srcObject = remoteStream
  syncSpeakerState()
  if (localStream) {
    for (const track of localStream.getTracks()) {
      const sender = connection.addTrack(track, localStream)
      applyCommunicationSenderCallSecurity(sender, callSecurityContext, transformedCallSenders)
    }
  }
  connection.ontrack = (event) => {
    applyCommunicationReceiverCallSecurity(event.receiver, callSecurityContext, transformedCallReceivers)
    for (const track of event.streams[0]?.getTracks() || []) remoteStream?.addTrack(track)
  }
  connection.onicecandidate = async (event) => {
    if (!event.candidate || !currentChatRoomId.value) return
    await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: {
        kind: 'ice-candidate',
        callId,
        targetActorKey: peerActorKey,
        payload: { candidate: event.candidate.toJSON(), mode },
      },
    })
  }
  connection.onconnectionstatechange = () => {
    if (connection.connectionState) callStatusText.value = `Соединение: ${connection.connectionState}`
  }
  return connection
}

async function startOutgoingCall(mode: CallMode) {
  if (!currentChatPeer.value || !currentChatRoomId.value) return
  if (!supportedCalls.value) {
    callPermissionHelp.value = 'Звонки недоступны в этом браузере.'
    return
  }
  if (!(await ensureMediaAccess(mode))) return
  const callId = crypto.randomUUID()
  let e2ee: CommunicationCallE2EEPayload = { supported: false }

  if (supportsCommunicationCallEncryption()) {
    const callKeys = await generateCommunicationCallE2EEKeyPair()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    callSecurityContext = {
      callId,
      role: 'initiator',
      localPublicKey: callKeys.publicKey,
      localPrivateKey: callKeys.privateKey,
      salt,
      verificationEmojis: [],
      active: false,
    }
    setCallSecurityPending('Ожидаем подтверждение и публичный ключ собеседника для E2EE звонка.')
    e2ee = {
      supported: true,
      publicKey: callKeys.publicKey,
      salt: encodeCommunicationCallBase64(salt),
    }
  } else {
    clearCallSecurityContext()
    setCallSecurityFallback('У этого браузера нет поддержки encoded insertable streams.')
  }

  activeCall.value = { callId, peerActorKey: currentChatPeer.value.actorKey, mode, initiator: true }
  callStatusText.value = `Ожидание ответа ${currentChatPeer.value.displayName}`
  await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
    method: 'POST',
    body: { kind: 'invite', callId, targetActorKey: currentChatPeer.value.actorKey, payload: { mode, e2ee } },
  })
}

async function acceptIncomingCall() {
  if (!incomingCall.value || !currentChatRoomId.value) return
  try {
    if (!(await ensureMediaAccess(incomingCall.value.mode))) {
      await rejectIncomingCall()
      return
    }
    await initMedia(incomingCall.value.mode)
    activeCall.value = { callId: incomingCall.value.callId, peerActorKey: incomingCall.value.fromActorKey, mode: incomingCall.value.mode, initiator: false }
    let e2ee: CommunicationCallE2EEPayload = { supported: false }

    if (supportsCommunicationCallEncryption() && incomingCall.value.e2ee?.supported && incomingCall.value.e2ee.publicKey && incomingCall.value.e2ee.salt) {
      const callKeys = await generateCommunicationCallE2EEKeyPair()
      callSecurityContext = {
        callId: incomingCall.value.callId,
        role: 'responder',
        localPublicKey: callKeys.publicKey,
        localPrivateKey: callKeys.privateKey,
        remotePublicKey: incomingCall.value.e2ee.publicKey,
        salt: decodeCommunicationCallBase64(incomingCall.value.e2ee.salt),
        verificationEmojis: [],
        active: false,
      }
      await activateCommunicationCallSecurityContext(callSecurityContext, incomingCall.value.e2ee.publicKey)
      setCallSecurityActive()
      e2ee = {
        supported: true,
        publicKey: callKeys.publicKey,
      }
    } else {
      clearCallSecurityContext()
      setCallSecurityFallback(incomingCall.value.e2ee?.supported
        ? 'Не удалось активировать E2EE для этого вызова.'
        : 'Собеседник не прислал параметры дополнительного E2EE.')
    }

    await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: {
        kind: 'ringing',
        callId: incomingCall.value.callId,
        targetActorKey: incomingCall.value.fromActorKey,
        payload: { accepted: true, mode: incomingCall.value.mode, e2ee },
      },
    })
    callStatusText.value = 'Подготовка соединения…'
    incomingCall.value = null
  } catch {
    await rejectIncomingCall()
  }
}

async function rejectIncomingCall() {
  if (!incomingCall.value || !currentChatRoomId.value) {
    incomingCall.value = null
    return
  }
  await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
    method: 'POST',
    body: { kind: 'reject', callId: incomingCall.value.callId, targetActorKey: incomingCall.value.fromActorKey, payload: {} },
  })
  incomingCall.value = null
  callStatusText.value = 'Входящий звонок отклонён'
}

async function hangupCall() {
  if (!activeCall.value || !currentChatRoomId.value) return
  await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
    method: 'POST',
    body: { kind: 'hangup', callId: activeCall.value.callId, targetActorKey: activeCall.value.peerActorKey, payload: {} },
  }).catch(() => {})
  teardownCall('Звонок завершён')
}

function teardownCall(status = '') {
  activeCall.value = null
  incomingCall.value = null
  callStatusText.value = status
  resetPeerConnection()
  localStream?.getTracks().forEach((track) => track.stop())
  localStream = null
  clearCallSecurityContext()
  callSecurity.value = createDefaultCallSecurityState()
  callControls.value = {
    microphoneEnabled: true,
    speakerEnabled: true,
  }
  callPermissionHelp.value = ''
  if (localVideoEl.value) localVideoEl.value.srcObject = null
}

async function handleSignal(signal: CommunicationSignal) {
  if (!signal || (signal.targetActorKey && signal.targetActorKey !== actorKey.value)) return
  const payload = signal.payload && typeof signal.payload === 'object' ? signal.payload as SignalPayloadRecord : {}

  if (signal.kind === 'room-key' && identityPrivateKey) {
    try {
      const nextRoomKey = await unwrapCommunicationRoomKeyFromPeer({
        wrappedCiphertextBase64: String(payload.wrappedCiphertext || ''),
        ivBase64: String(payload.iv || ''),
        recipientPrivateKey: identityPrivateKey,
        senderPublicKeyJwk: payload.senderPublicKeyJwk as JsonWebKey,
      })
      await persistRoomKey(nextRoomKey)
      syncStatus.value = 'Ключ комнаты получен'
      await refreshMessagesOnly()
    } catch {
      syncStatus.value = 'Не удалось расшифровать ключ комнаты'
    }
    return
  }

  if (signal.kind === 'invite') {
    if (activeCall.value || incomingCall.value) {
      await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
        method: 'POST',
        body: { kind: 'busy', callId: signal.callId, targetActorKey: `${signal.senderRole}:${signal.senderActorId}`, payload: {} },
      }).catch(() => {})
      return
    }
    const senderKey = `${signal.senderRole}:${signal.senderActorId}`
    const inviteE2ee = payload.e2ee as CommunicationCallE2EEPayload | undefined
    incomingCall.value = {
      callId: signal.callId,
      fromActorKey: senderKey,
      fromDisplayName: signal.senderDisplayName || senderKey,
      mode: payload.mode === 'video' ? 'video' : 'audio',
      e2ee: inviteE2ee,
    }
    if (inviteE2ee?.supported && supportsCommunicationCallEncryption()) {
      setCallSecurityPending('Входящий звонок поддерживает E2EE. После принятия появятся символы для сверки.')
    } else if (inviteE2ee?.supported) {
      setCallSecurityFallback('Собеседник поддерживает E2EE, но этот браузер не умеет encoded transforms.')
    } else {
      setCallSecurityFallback('Для этого вызова используется только штатное шифрование WebRTC.')
    }
    callStatusText.value = 'Входящий вызов'
    return
  }

  if (signal.kind === 'ringing' && activeCall.value?.initiator) {
    const ringingE2ee = payload.e2ee as CommunicationCallE2EEPayload | undefined
    if (callSecurityContext && ringingE2ee?.supported && ringingE2ee.publicKey) {
      await activateCommunicationCallSecurityContext(callSecurityContext, ringingE2ee.publicKey)
      setCallSecurityActive()
    } else {
      clearCallSecurityContext()
      setCallSecurityFallback(ringingE2ee?.supported ? 'Собеседник не передал корректный ключ для E2EE.' : 'Собеседник не использует дополнительное E2EE для звонка.')
    }
    const mode = payload.mode === 'video' ? 'video' : 'audio'
    await initMedia(mode)
    const connection = buildPeerConnection(signal.callId, activeCall.value.peerActorKey, mode)
    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)
    await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: { kind: 'offer', callId: signal.callId, targetActorKey: activeCall.value.peerActorKey, payload: { sdp: offer.sdp, type: offer.type, mode } },
    })
    callStatusText.value = 'Отправлен offer'
    return
  }

  if (signal.kind === 'offer') {
    const senderKey = `${signal.senderRole}:${signal.senderActorId}`
    const mode = payload.mode === 'video' ? 'video' : 'audio'
    if (!activeCall.value) activeCall.value = { callId: signal.callId, peerActorKey: senderKey, mode, initiator: false }
    if (!localStream) await initMedia(mode)
    const connection = buildPeerConnection(signal.callId, senderKey, mode)
    await connection.setRemoteDescription({ type: 'offer', sdp: String(payload.sdp || '') })
    await flushPendingIceCandidates(signal.callId, connection)
    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)
    await apiFetch(`/rooms/${currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: { kind: 'answer', callId: signal.callId, targetActorKey: senderKey, payload: { sdp: answer.sdp, type: answer.type, mode } },
    })
    callStatusText.value = 'Отправлен answer'
    return
  }

  if (signal.kind === 'answer' && peerConnection) {
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: String(payload.sdp || '') })
    await flushPendingIceCandidates(signal.callId, peerConnection)
    callStatusText.value = 'Канал установлен'
    return
  }

  if (signal.kind === 'ice-candidate' && payload.candidate) {
    const candidate = payload.candidate as RTCIceCandidateInit
    const remoteDescriptionReady = Boolean(peerConnection?.remoteDescription)
    if (!peerConnection || !remoteDescriptionReady) {
      queueIceCandidate(signal.callId, candidate)
      return
    }
    await peerConnection.addIceCandidate(candidate).catch(() => {
      queueIceCandidate(signal.callId, candidate)
    })
    return
  }

  if (signal.kind === 'reject') {
    teardownCall('Вызов отклонён')
    return
  }

  if (signal.kind === 'busy') {
    teardownCall('Собеседник уже на другом звонке')
    return
  }

  if (signal.kind === 'mute') {
    remoteMutedByPeer.value = true
    callStatusText.value = 'Собеседник отключил микрофон'
    return
  }

  if (signal.kind === 'unmute') {
    remoteMutedByPeer.value = false
    callStatusText.value = 'Собеседник снова включил микрофон'
    return
  }

  if (signal.kind === 'hangup') teardownCall('Собеседник завершил звонок')
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

watch(selfParticipant, (nextParticipant) => {
  if (!nicknameSaving.value) {
    nicknameDraft.value = nextParticipant?.nickname ? `@${nextParticipant.nickname}` : ''
  }
}, { immediate: true })

watch(bootstrapData, async (nextBootstrap) => {
  if (!nextBootstrap || !import.meta.client) return
  runtimeError.value = ''
  syncStatus.value = ''
  try {
    await ensureIdentity()
    await loadProjectContacts()
    await fetchOpenChats()
    if (openChats.value.length) {
      await openChatSummary(openChats.value[0])
      quickSection.value = 'chat'
    } else {
      quickSection.value = 'contacts'
    }
  } catch (error: any) {
    runtimeError.value = error?.data?.error || error?.data?.message || error?.message || 'Коммуникации временно недоступны'
  }
}, { immediate: true })

if (import.meta.client) {
  void refreshMediaPermissions()
}

onBeforeUnmount(() => {
  eventSource?.close()
  teardownCall()
})
</script>

<style scoped>
.comm-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.comm-chat-view,
.comm-main,
.comm-block,
.comm-list-grid,
.comm-media-grid,
.comm-form,
.comm-settings-grid,
.comm-setting-card {
  display: grid;
  gap: 12px;
}

.comm-chat-toolbar,
.comm-compose-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.comm-chat-toolbar {
  position: sticky;
  top: 0;
  z-index: 4;
  justify-content: space-between;
  padding: 4px 0 8px;
  background: var(--glass-bg, rgba(12, 12, 18, .94));
  border-bottom: 1px solid var(--glass-border, rgba(255,255,255,.12));
}

.comm-block,
.comm-main {
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  padding: 14px;
}

.comm-block-title {
  margin-bottom: 10px;
  font-size: .78rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  opacity: .7;
}

.comm-search {
  margin-bottom: 10px;
}

.comm-person {
  display: grid;
  gap: 4px;
  min-height: 44px;
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  background: transparent;
  color: inherit;
  padding: 10px 12px;
  text-align: left;
}

.comm-person--active {
  border-color: var(--ds-accent, #6ea8ff);
}

.comm-person-name {
  font-size: .88rem;
}

.comm-person-nick {
  font-size: .78rem;
  opacity: .8;
}

.comm-person-role,
.comm-chat-subject-role,
.comm-chat-updated,
.comm-media-label,
.comm-message-head {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .64;
}

.comm-chat-subject {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.comm-chat-subject-name {
  font-size: .96rem;
}

.comm-chat-subject-nick {
  font-size: .8rem;
  opacity: .8;
}

.comm-call-actions,
.comm-form-actions,
.comm-incoming-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.comm-call-toggle-row,
.comm-setting-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.comm-chip-btn {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  background: transparent;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: .08em;
  font-size: .72rem;
}

.comm-chip-btn--inactive {
  opacity: .64;
}

.comm-call-security {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
}

.comm-call-security--active {
  border-color: var(--ds-accent, #6ea8ff);
}

.comm-call-security__status,
.comm-call-security__emojis,
.comm-call-security__fallback {
  margin: 0;
  font-size: .78rem;
}

.comm-call-security__emojis {
  letter-spacing: .24em;
}

.comm-call-security__fallback {
  opacity: .72;
}

.comm-status {
  margin: 8px 0 0;
  font-size: .78rem;
  opacity: .78;
}

.comm-icon-btn {
  width: 44px;
  min-width: 44px;
  height: 44px;
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}

.comm-icon-btn--danger {
  color: var(--ds-error, #d96b6b);
}

.comm-icon-btn:disabled {
  opacity: .45;
}

.comm-icon-svg {
  width: 18px;
  height: 18px;
  display: block;
}

.comm-incoming {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.comm-incoming-title,
.comm-incoming-meta {
  margin: 0;
}

.comm-media-box {
  display: grid;
  gap: 6px;
}

.comm-video {
  width: 100%;
  min-height: 132px;
  background: rgba(0,0,0,.18);
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  object-fit: cover;
}

.comm-main {
  grid-template-rows: minmax(320px, 1fr) auto;
}

.comm-messages {
  display: grid;
  gap: 10px;
  overflow: auto;
  min-height: 240px;
}

.comm-message {
  justify-self: start;
  max-width: min(80%, 42rem);
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
}

.comm-message--me {
  justify-self: end;
  border-color: var(--ds-accent, #6ea8ff);
}

.comm-message-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.comm-message-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.45;
}

.comm-input {
  min-height: 88px;
  flex: 1 1 auto;
}

.comm-send-btn {
  width: 52px;
  min-width: 52px;
  height: 52px;
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  background: transparent;
  color: inherit;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.comm-send-btn:disabled {
  opacity: .45;
}

.comm-icon-svg--send {
  width: 22px;
  height: 22px;
}

.comm-empty,
.comm-empty-inline {
  font-size: .82rem;
  opacity: .72;
}

.comm-empty-note {
  margin: 8px 0 0;
  max-width: 34rem;
  font-size: .78rem;
  opacity: .72;
}

.comm-settings-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.comm-setting-card {
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  padding: 12px;
  align-content: start;
}

.comm-setting-row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: .82rem;
}

.comm-setting-name {
  opacity: .82;
}

.comm-setting-value {
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .64;
}

.comm-setting-note {
  margin: 0;
  font-size: .76rem;
  opacity: .72;
  line-height: 1.45;
}

.comm-empty--error {
  color: var(--ds-error, #d96b6b);
}

.comm-bottom-switch {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  background: rgba(12, 12, 18, .92);
}

.comm-bottom-switch__btn {
  min-height: 48px;
  border: 0;
  border-right: 1px solid var(--glass-border, rgba(255,255,255,.12));
  background: transparent;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: .1em;
  font-size: .72rem;
}

.comm-bottom-switch__btn:last-child {
  border-right: 0;
}

.comm-bottom-switch__btn--active {
  background: rgba(255,255,255,.14);
}

@media (max-width: 960px) {
  .comm-chat-toolbar,
  .comm-compose-row,
  .comm-chat-subject {
    display: grid;
  }

  .comm-chat-toolbar {
    justify-content: stretch;
  }

  .comm-settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 961px) {
  .comm-bottom-switch {
    max-width: 360px;
    margin-left: auto;
  }
}
</style>
