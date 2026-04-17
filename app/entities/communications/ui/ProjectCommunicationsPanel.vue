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
          <p class="comm-call-security__status">{{ compactCallSecurityStatus }}</p>
          <p v-if="callSecurity.active && callSecurity.verificationEmojis.length" class="comm-call-security__emojis">{{ callSecurity.verificationEmojis.join(' ') }}</p>
          <p v-else-if="callSecurity.fallbackReason" class="comm-call-security__fallback">{{ callSecurity.fallbackReason }}</p>
          <p v-if="callPermissionHelp" class="comm-call-security__fallback">{{ callPermissionHelp }}</p>
        </div>

        <GlassSurface v-if="incomingCall" class="comm-incoming " :class="{ 'comm-incoming--audio': incomingCall.mode === 'audio' }">
          <div class="comm-incoming-head">
            <div>
              <p class="comm-incoming-title">Входящий {{ incomingCall.mode === 'video' ? 'видеозвонок' : 'аудиозвонок' }}</p>
              <p class="comm-incoming-meta">{{ incomingCall.fromDisplayName }}</p>
            </div>
            <span class="comm-chat-tag comm-chat-tag--live">{{ incomingCall.mode === 'video' ? 'VIDEO' : 'AUDIO' }}</span>
          </div>
          <p v-if="incomingCall.e2ee?.supported" class="comm-status">{{ callSecurity.available ? 'После принятия активируется дополнительное E2EE звонка.' : 'Собеседник поддерживает дополнительное E2EE, но этот браузер умеет только штатное шифрование WebRTC.' }}</p>
          <div class="comm-incoming-actions">
            <GlassButton variant="secondary" density="compact" type="button"  @click="acceptIncomingCall">Принять</GlassButton>
            <GlassButton variant="danger" density="compact" type="button"  @click="rejectIncomingCall">Отклонить</GlassButton>
          </div>
        </GlassSurface>

        <div v-if="currentChatPeer" class="comm-block comm-block--presence">
          <div class="comm-chat-subject">
            <div class="comm-chat-subject-meta">
              <div class="comm-chat-subject-head">
                <div class="comm-chat-subject-name">{{ currentChatPeer.displayName }}</div>
                <div
                  class="comm-chat-quality"
                  :data-tone="callConnectionQuality.tone"
                  :data-active="callConnectionQuality.active ? 'true' : 'false'"
                  :style="callConnectionQualityStyle"
                  :title="callConnectionQuality.title"
                  :aria-label="callConnectionQuality.title"
                >
                  <span
                    v-for="level in 4"
                    :key="level"
                    class="comm-chat-quality__bar"
                    :class="{ 'comm-chat-quality__bar--active': level <= callConnectionQuality.bars }"
                    :style="{ height: `${8 + level * 3}px` }"
                  />
                </div>
              </div>
              <div class="comm-chat-subject-supporting">
                <div v-if="currentChatPeer.nickname" class="comm-chat-subject-nick">@{{ currentChatPeer.nickname }}</div>
                <div class="comm-chat-subject-tags">
                  <span class="comm-chat-tag">{{ currentChatPeer.role }}</span>
                  <span v-if="activeCall && callSecurity.active" class="comm-chat-tag comm-chat-tag--secure">E2EE CALL</span>
                  <span v-else-if="activeCall" class="comm-chat-tag comm-chat-tag--live">LIVE</span>
                  <span v-else-if="supportedCalls" class="comm-chat-tag comm-chat-tag--ready">READY</span>
                </div>
              </div>
            </div>
          </div>
          <div class="comm-media-grid" :class="{ 'comm-media-grid--audio': activeCallMode === 'audio' || incomingCall?.mode === 'audio' }">
            <div class="comm-media-box" :class="{ 'comm-media-box--audio': activeCallMode === 'audio' || incomingCall?.mode === 'audio' }">
              <div class="comm-media-label">Вы</div>
              <template v-if="activeCallMode === 'video'">
                <video ref="localVideoEl" class="comm-video" autoplay playsinline muted />
              </template>
              <div v-else class="comm-audio-stage">
                <div class="comm-audio-stage__orb">YOU</div>
                <div class="comm-audio-stage__meta">{{ callControls.microphoneEnabled ? 'Микрофон активен' : 'Микрофон выключен' }}</div>
              </div>
            </div>
            <div class="comm-media-box" :class="{ 'comm-media-box--audio': activeCallMode === 'audio' || incomingCall?.mode === 'audio' }">
              <div class="comm-media-label">Собеседник</div>
              <template v-if="activeCallMode === 'video'">
                <video ref="remoteVideoEl" class="comm-video" autoplay playsinline />
              </template>
              <div v-else class="comm-audio-stage">
                <div class="comm-audio-stage__orb">{{ chatPeerInitials }}</div>
                <div class="comm-audio-stage__meta">{{ remoteMutedByPeer ? 'Микрофон отключён' : 'Аудиоканал активен' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="comm-main comm-main--chat">
          <div ref="messagesEl" class="comm-messages">
            <div v-if="currentChatPeer" class="comm-message-rail-head">
              <div class="comm-block-title">Диалог</div>
              <div class="comm-message-rail-head__metrics">
                <span class="comm-section-pill">{{ decryptedMessages.length }}</span>
                <span class="comm-section-pill comm-section-pill--subtle">{{ eventStreamConnected ? 'LIVE' : 'OFFLINE' }}</span>
              </div>
            </div>
            <article
              v-for="message in decryptedMessages"
              :key="message.id"
              class="comm-message"
              :class="{ 'comm-message--me': message.senderActorKey === actorKey }"
            >
              <header class="comm-message-head">
                <span class="comm-message-authorline">
                  <span class="comm-message-author">{{ message.senderDisplayName }}</span>
                  <span v-if="message.senderActorKey === actorKey" class="comm-message-badge">YOU</span>
                  <span v-else class="comm-message-badge comm-message-badge--subtle">PEER</span>
                </span>
                <span class="comm-message-time">{{ formatMessageTime(message.createdAt) }}</span>
              </header>
              <p class="comm-message-text">{{ message.text }}</p>
            </article>
            <div v-if="currentChatPeer && !decryptedMessages.length" class="comm-empty comm-empty--panel">[ NO DIRECT MESSAGES ]</div>
            <div v-else-if="!currentChatPeer && hasAvailableContacts" class="comm-empty">[ ВЫБЕРИТЕ КОНТАКТ ИЗ РАЗДЕЛА КОНТАКТЫ ИЛИ ЧАТЫ ]</div>
            <div v-else-if="!currentChatPeer" class="comm-empty">[ У ПРОЕКТА ПОКА НЕТ СОБЕСЕДНИКОВ ДЛЯ DIRECT-ЧАТА ]</div>
          </div>

          <form class="comm-form" @submit.prevent="sendEncryptedMessage">
            <div v-if="currentChatPeer" class="comm-compose-head">
              <div class="comm-block-title">Новое сообщение</div>
              <div class="comm-message-rail-head__metrics">
                <span class="comm-section-pill">{{ sendingMessage ? 'SENDING' : 'READY' }}</span>
                <span class="comm-section-pill comm-section-pill--subtle">{{ draftMessage.trim() ? draftMessage.trim().length : 0 }}</span>
              </div>
            </div>
            <div class="comm-compose-row">
              <div class="comm-compose-shell">
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
            </div>
            <div v-if="syncStatus" class="comm-form-actions">
              <span v-if="syncStatus" class="comm-status">{{ syncStatus }}</span>
            </div>
          </form>
        </div>
      </section>

      <section v-else-if="quickSection === 'chats'" class="comm-block comm-block--directory">
        <div class="comm-section-head">
          <div class="comm-block-title">Открытые чаты</div>
          <div class="comm-section-metrics"><span class="comm-section-pill">{{ filteredOpenChats.length }}</span></div>
        </div>
        <label class="u-field__label" for="comm-chat-search">Поиск по чатам</label>
        <GlassInput id="comm-chat-search" v-model="chatSearch" type="text" class="glass-input --inline comm-search" placeholder="Имя, роль или @никнейм" />
        <div v-if="filteredOpenChats.length" class="comm-list-grid">
          <button
            v-for="chat in filteredOpenChats"
            :key="chat.roomId"
            type="button"
            class="comm-person"
            :class="{ 'comm-person--active': currentChatPeerKey === chat.participant.actorKey }"
            @click="openChatSummary(chat)"
          >
            <span class="comm-person-topline">
              <span class="comm-person-name">{{ chat.participant.displayName }}</span>
              <span class="comm-chat-updated">{{ formatMessageTime(chat.updatedAt) }}</span>
            </span>
            <span class="comm-person-bottomline">
              <span v-if="chat.participant.nickname" class="comm-person-nick">@{{ chat.participant.nickname }}</span>
              <span class="comm-person-badges">
                <span class="comm-person-badge">{{ chat.participant.role }}</span>
              </span>
            </span>
          </button>
        </div>
        <div v-else class="comm-empty-inline">{{ hasAvailableContacts ? '[ НЕТ ОТКРЫТЫХ ЧАТОВ ]' : '[ НЕТ ОТКРЫТЫХ ЧАТОВ: СНАЧАЛА НУЖНЫ КОНТАКТЫ ]' }}</div>
      </section>

      <section v-else-if="quickSection === 'contacts'" class="comm-block comm-block--directory">
        <div class="comm-section-head">
          <div class="comm-block-title">Контакты</div>
          <div class="comm-section-metrics"><span class="comm-section-pill">{{ filteredContacts.length }}</span></div>
        </div>
        <label class="u-field__label" for="comm-contact-search">Поиск по контактам</label>
        <GlassInput id="comm-contact-search" v-model="contactSearch" type="text" class="glass-input --inline comm-search" placeholder="Имя, роль или @никнейм" />

        <div v-if="filteredContacts.length" class="comm-list-grid">
          <button
            v-for="participant in filteredContacts"
            :key="participant.actorKey"
            type="button"
            class="comm-person"
            :class="{ 'comm-person--active': currentChatPeerKey === participant.actorKey }"
            @click="startChatWithParticipant(participant)"
          >
            <span class="comm-person-topline">
              <span class="comm-person-name">{{ participant.displayName }}</span>
            </span>
            <span class="comm-person-bottomline">
              <span v-if="participant.nickname" class="comm-person-nick">@{{ participant.nickname }}</span>
              <span class="comm-person-badges">
                <span class="comm-person-badge">{{ participant.role }}</span>
              </span>
            </span>
          </button>
        </div>
        <div v-else class="comm-empty-inline">
          <p>[ НЕТ ДОСТУПНЫХ КОНТАКТОВ ]</p>
          <p class="comm-empty-note">Контакты появятся после привязки к проекту дизайнера, подрядчика или другого участника.</p>
        </div>
      </section>

      <section v-else class="comm-block comm-block--directory">
        <div class="comm-section-head">
          <div class="comm-block-title">Настройки</div>
          <div class="comm-section-metrics"><span class="comm-section-pill">{{ callSecurity.available ? 'E2EE' : 'WEBRTC' }}</span></div>
        </div>
        <div class="comm-settings-grid">
          <section v-if="coordinationBrief" class="comm-setting-card">
            <div class="comm-block-title">Менеджеры проекта</div>
            <p class="comm-setting-note">Активная фаза: {{ coordinationBrief.summary.activePhaseTitle }}. Активный спринт: {{ coordinationBrief.summary.activeSprintTitle }}.</p>
            <div class="comm-agent-pills">
              <span v-for="agent in coordinationBrief.agents.filter((item: any) => item.enabled)" :key="agent.id" class="comm-person-badge">{{ agent.title }}</span>
            </div>
            <div class="comm-coordination-list">
              <div v-for="recommendation in coordinationBrief.recommendations" :key="recommendation.id" class="comm-coordination-row">
                <p class="comm-setting-row">
                  <span class="comm-setting-name">{{ recommendation.title }}</span>
                  <span class="comm-setting-value">{{ recommendation.channelLabel }}</span>
                </p>
                <p class="comm-setting-note">{{ recommendation.reason }}</p>
                <p class="comm-setting-note comm-setting-note--strong">{{ recommendation.suggestedMessage }}</p>
              </div>
            </div>
            <div class="comm-playbook-list">
              <div v-for="rule in coordinationBrief.playbook" :key="rule.id" class="comm-playbook-row">
                <p class="comm-setting-row">
                  <span class="comm-setting-name">{{ rule.title }}</span>
                  <span class="comm-setting-value">{{ rule.ownerAgentTitle }}</span>
                </p>
                <p class="comm-setting-note">{{ rule.trigger }}</p>
                <p v-if="rule.template" class="comm-setting-note comm-setting-note--strong">{{ rule.template }}</p>
                <div class="comm-agent-pills">
                  <span class="comm-person-badge">{{ rule.linkedChannelLabel }}</span>
                  <span v-for="label in rule.audienceLabels" :key="`${rule.id}-${label}`" class="comm-person-badge">{{ label }}</span>
                </div>
              </div>
            </div>
            <div v-if="callInsights.length" class="comm-call-insight-list">
              <div v-for="insight in callInsights" :key="insight.id" class="comm-call-insight-row">
                <p class="comm-setting-row">
                  <span class="comm-setting-name">{{ insight.title }}</span>
                  <span class="comm-setting-value">{{ getHealthTone(insight.tone) }}</span>
                </p>
                <p class="comm-setting-note">{{ formatCallInsightDate(insight.happenedAt || insight.createdAt) }}<span v-if="getCallInsightActorLabel(insight)"> · {{ getCallInsightActorLabel(insight) }}</span></p>
                <p class="comm-setting-note comm-setting-note--strong">{{ insight.summary }}</p>
                <div v-if="insight.appliedTaskIds?.length" class="comm-agent-pills">
                  <span class="comm-person-badge">задач: {{ insight.appliedTaskIds.length }}</span>
                </div>
                <div v-if="canManageCallInsights && insight.nextSteps.length" class="comm-setting-actions">
                  <GlassButton variant="secondary" density="compact"
                    type="button"
                    
                    :disabled="callInsightApplyPendingId === insight.id"
                    @click="applyCallInsightToSprint(insight.id)"
                  >
                    {{ callInsightApplyPendingId === insight.id ? 'применяем...' : (insight.appliedTaskIds?.length ? 'досинхронизировать задачи' : 'в активный спринт') }}
                  </GlassButton>
                </div>
              </div>
            </div>
            <p v-if="callInsightActionStatus" class="comm-setting-note">{{ callInsightActionStatus }}</p>
          </section>

          <section class="comm-setting-card">
            <div class="comm-block-title">Никнейм</div>
            <label class="u-field__label" for="comm-my-nickname">Публичный никнейм</label>
            <GlassInput
              id="comm-my-nickname"
              v-model="nicknameDraft"
              type="text"
              class="glass-input --inline comm-search"
              placeholder="Например, @daria_design"
              maxlength="33"
              @blur="saveMyNickname"
              @keydown.enter.prevent="saveMyNickname"
             />
            <p class="comm-setting-note">Никнейм используется в поиске контактов и в списке открытых чатов.</p>
            <p v-if="nicknameStatus" class="comm-status">{{ nicknameStatus }}</p>
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
              <GlassButton variant="secondary" density="compact" type="button"  @click="checkAudioAccess">Проверить микрофон</GlassButton>
              <GlassButton variant="secondary" density="compact" type="button"  @click="checkVideoAccess">Проверить камеру</GlassButton>
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
import { getHealthTone, getHybridStakeholderRoleLabel } from '~~/shared/utils/project-control'
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

type CallConnectionTone = 'idle' | 'poor' | 'fair' | 'good'

type CallConnectionQualityState = {
  active: boolean
  tone: CallConnectionTone
  score: number
  bars: number
  title: string
}

type SignalPayloadRecord = Record<string, unknown>
type MediaPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown' | 'unsupported'

const localVideoEl = ref<HTMLVideoElement | null>(null)
const remoteVideoEl = ref<HTMLVideoElement | null>(null)
const messagesEl = ref<HTMLElement | null>(null)

const { data: bootstrap, pending: bootstrapPending, error: bootstrapError, refresh: refreshBootstrap } = useProjectCommunicationsBootstrap(computed(() => props.projectSlug))

const bootstrapData = computed(() => bootstrap.value as ProjectCommunicationBootstrap | null)
const coordinationBrief = computed(() => bootstrapData.value?.coordination || null)
const callInsights = computed(() => bootstrapData.value?.callInsights || [])
const bootstrapErrorMessage = computed(() => (bootstrapError.value as any)?.data?.statusMessage || (bootstrapError.value as any)?.message || 'Не удалось инициализировать защищённую связь')
const canManageCallInsights = computed(() => bootstrapData.value?.actor.role === 'admin')
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
const callInsightApplyPendingId = ref('')
const callInsightActionStatus = ref('')

function formatCallInsightDate(value?: string) {
  if (!value) return 'без даты'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getCallInsightActorLabel(insight: ProjectCommunicationBootstrap['callInsights'][number]) {
  const roleLabel = insight.actorRole ? getHybridStakeholderRoleLabel(insight.actorRole) : ''
  const actorName = insight.actorName || ''

  if (roleLabel && actorName) return `${roleLabel}: ${actorName}`
  return actorName || roleLabel
}

async function applyCallInsightToSprint(insightId: string) {
  if (!insightId || callInsightApplyPendingId.value) return

  callInsightApplyPendingId.value = insightId
  callInsightActionStatus.value = ''

  try {
    const response = await $fetch<{
      meta: {
        createdTaskCount: number
        createdSprint: boolean
      }
    }>(`/api/projects/${props.projectSlug}/communications/call-insights/${insightId}/apply`, {
      method: 'POST',
      body: {},
    })

    callInsightActionStatus.value = response.meta.createdTaskCount
      ? `Задач создано: ${response.meta.createdTaskCount}${response.meta.createdSprint ? '. Создан отдельный follow-up спринт.' : '.'}`
      : 'Новых задач не создано: следующие шаги уже синхронизированы.'
    await refreshBootstrap()
  } catch (error: any) {
    callInsightActionStatus.value = error?.data?.statusMessage || error?.message || 'Не удалось синхронизировать задачи по звонку.'
  } finally {
    callInsightApplyPendingId.value = ''
  }
}
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
const callConnectionQuality = ref<CallConnectionQualityState>(createCallConnectionQualityState({
  active: false,
  tone: 'idle',
  score: 0.18,
  title: 'Нет активного звонка',
}))
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
let callQualityMonitor: ReturnType<typeof setInterval> | null = null

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

function createCallConnectionQualityState(input: {
  active: boolean
  tone: CallConnectionTone
  score: number
  title: string
}): CallConnectionQualityState {
  const normalizedScore = Math.max(0, Math.min(1, input.score))
  return {
    active: input.active,
    tone: input.tone,
    score: normalizedScore,
    bars: Math.max(1, Math.min(4, Math.round(normalizedScore * 4))),
    title: input.title,
  }
}

const callConnectionQualityStyle = computed(() => ({
  '--comm-quality-stop': `${Math.round(callConnectionQuality.value.score * 100)}%`,
  '--comm-quality-hue': `${Math.round(6 + callConnectionQuality.value.score * 126)}`,
  '--comm-quality-alpha': callConnectionQuality.value.active ? '0.92' : '0.38',
}))

function setCallConnectionQuality(nextState: {
  active: boolean
  score: number
  title: string
}) {
  const normalizedScore = Math.max(0, Math.min(1, nextState.score))
  let tone: CallConnectionTone = 'good'
  if (!nextState.active) tone = 'idle'
  else if (normalizedScore < 0.34) tone = 'poor'
  else if (normalizedScore < 0.68) tone = 'fair'

  callConnectionQuality.value = createCallConnectionQualityState({
    active: nextState.active,
    tone,
    score: normalizedScore,
    title: nextState.title,
  })
}

function resetCallConnectionQuality() {
  setCallConnectionQuality({
    active: false,
    score: 0.18,
    title: activeCall.value ? 'Подключение к звонку' : 'Нет активного звонка',
  })
}

function stopCallQualityMonitor() {
  if (callQualityMonitor) {
    clearInterval(callQualityMonitor)
    callQualityMonitor = null
  }
}

async function updateCallConnectionQuality(connection = peerConnection) {
  if (!connection || !activeCall.value) {
    resetCallConnectionQuality()
    return
  }

  if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected' || connection.connectionState === 'closed') {
    setCallConnectionQuality({
      active: true,
      score: connection.connectionState === 'failed' ? 0.06 : 0.14,
      title: connection.connectionState === 'failed' ? 'Связь сорвалась' : 'Связь нестабильна',
    })
    return
  }

  if (connection.connectionState === 'new' || connection.connectionState === 'connecting') {
    setCallConnectionQuality({
      active: true,
      score: 0.46,
      title: 'Идёт согласование канала',
    })
    return
  }

  let currentRoundTripTime = 0
  let availableOutgoingBitrate = 0
  let packetsLost = 0
  let packetsReceived = 0
  let maxJitter = 0

  const stats = await connection.getStats()
  stats.forEach((entry: any) => {
    if (entry.type === 'candidate-pair' && (entry.selected || entry.nominated || entry.state === 'succeeded')) {
      currentRoundTripTime = Math.max(currentRoundTripTime, Number(entry.currentRoundTripTime || 0))
      availableOutgoingBitrate = Math.max(availableOutgoingBitrate, Number(entry.availableOutgoingBitrate || 0))
    }

    if (entry.type === 'inbound-rtp' && !entry.isRemote) {
      packetsLost += Number(entry.packetsLost || 0)
      packetsReceived += Number(entry.packetsReceived || 0)
      maxJitter = Math.max(maxJitter, Number(entry.jitter || 0))
    }
  })

  const totalPackets = packetsReceived + packetsLost
  const packetLossRatio = totalPackets > 0 ? packetsLost / totalPackets : 0
  let score = 0.97

  if (currentRoundTripTime > 0.55) score -= 0.42
  else if (currentRoundTripTime > 0.3) score -= 0.26
  else if (currentRoundTripTime > 0.16) score -= 0.12

  if (maxJitter > 0.12) score -= 0.24
  else if (maxJitter > 0.06) score -= 0.15
  else if (maxJitter > 0.03) score -= 0.08

  if (packetLossRatio > 0.12) score -= 0.34
  else if (packetLossRatio > 0.06) score -= 0.22
  else if (packetLossRatio > 0.02) score -= 0.12

  if (availableOutgoingBitrate > 0 && availableOutgoingBitrate < 64000) score -= 0.24
  else if (availableOutgoingBitrate > 0 && availableOutgoingBitrate < 160000) score -= 0.12

  const qualityScore = Math.max(0.04, Math.min(1, score))
  const rttMs = Math.round(currentRoundTripTime * 1000)
  const lossPercent = Math.round(packetLossRatio * 100)
  const jitterMs = Math.round(maxJitter * 1000)
  setCallConnectionQuality({
    active: true,
    score: qualityScore,
    title: `Связь: RTT ${rttMs || 0} мс, jitter ${jitterMs || 0} мс, потери ${lossPercent}%`,
  })
}

function startCallQualityMonitor(connection: RTCPeerConnection) {
  stopCallQualityMonitor()
  void updateCallConnectionQuality(connection)
  callQualityMonitor = setInterval(() => {
    void updateCallConnectionQuality(connection)
  }, 3200)
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
const activeCallMode = computed<CallMode | null>(() => activeCall.value?.mode || incomingCall.value?.mode || null)
const chatPeerInitials = computed(() => {
  const name = currentChatPeer.value?.displayName?.trim() || 'PEER'
  return name.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'PEER'
})
const compactCallSecurityStatus = computed(() => {
  if (callSecurity.value.active) return 'Дополнительное E2EE активно'
  if (callSecurity.value.available) return 'Дополнительное E2EE доступно'
  return 'Используется штатное шифрование WebRTC'
})
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
  stopCallQualityMonitor()
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
  setCallConnectionQuality({
    active: true,
    score: 0.46,
    title: 'Идёт согласование канала',
  })
  const connection = new RTCPeerConnection({
    bundlePolicy: 'max-bundle',
    iceCandidatePoolSize: 4,
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  })
  peerConnection = connection
  peerConnectionCallId = callId
  startCallQualityMonitor(connection)
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
    void updateCallConnectionQuality(connection)
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
  setCallConnectionQuality({
    active: true,
    score: 0.42,
    title: `Исходящий звонок: ожидание ответа ${currentChatPeer.value.displayName}`,
  })
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
    setCallConnectionQuality({
      active: true,
      score: 0.42,
      title: `Входящий звонок: подготовка канала ${incomingCall.value.fromDisplayName}`,
    })
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
  resetCallConnectionQuality()
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
  --comm-ink: rgba(245, 248, 255, .96);
  --comm-muted: rgba(226, 232, 240, .84);
  --comm-soft: rgba(226, 232, 240, .68);
  --comm-control-bg: rgba(255,255,255,.08);
  --comm-control-border: rgba(255,255,255,.14);
  --comm-disabled-ink: rgba(226, 232, 240, .46);
  display: grid;
  gap: 16px;
  padding: 18px;
  color: var(--comm-ink);
}

:global(html:not(.dark)) .comm-panel {
  --comm-ink: rgba(23, 31, 43, .94);
  --comm-muted: rgba(55, 65, 81, .82);
  --comm-soft: rgba(71, 85, 105, .7);
  --comm-control-bg: rgba(255,255,255,.8);
  --comm-control-border: rgba(51, 65, 85, .16);
  --comm-disabled-ink: rgba(71, 85, 105, .48);
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
  padding: 8px 10px 12px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.01) 48%, rgba(105, 164, 255, .08) 100%),
    var(--glass-bg, rgba(12, 12, 18, .94));
  border-bottom: 1px solid var(--glass-border, rgba(255,255,255,.12));
  border-radius: 18px 18px 0 0;
}

.comm-block,
.comm-main {
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  padding: 14px;
}

.comm-block--presence {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(122, 174, 255, .12), transparent 34%),
    linear-gradient(145deg, rgba(255,255,255,.06), rgba(255,255,255,.02) 55%, rgba(255,255,255,.01) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}

.comm-block--directory {
  background:
    linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.02) 56%, rgba(255,255,255,.01) 100%),
    rgba(11, 15, 24, .42);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
}

.comm-block-title {
  margin-bottom: 10px;
  font-size: .78rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  opacity: .7;
}

.comm-section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 4px;
}

.comm-section-copy {
  margin: -4px 0 0;
  max-width: 38rem;
  font-size: .79rem;
  line-height: 1.45;
  opacity: .7;
}

.comm-section-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.comm-section-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(110, 168, 255, .24);
  border-radius: 999px;
  background: rgba(110, 168, 255, .1);
  font-size: .68rem;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.comm-section-pill--subtle {
  border-color: rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
}

.comm-search {
  margin-bottom: 10px;
}

.comm-person {
  display: grid;
  gap: 8px;
  min-height: 68px;
  border: 1px solid rgba(255,255,255,.12);
  background:
    linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.015) 58%, rgba(255,255,255,.01) 100%),
    rgba(10, 14, 22, .36);
  color: inherit;
  padding: 13px 14px;
  text-align: left;
  transition: border-color .18s ease, background-color .18s ease, transform .18s ease, box-shadow .18s ease;
}

.comm-person--active {
  border-color: var(--ds-accent, #6ea8ff);
  background:
    linear-gradient(145deg, rgba(110, 168, 255, .14), rgba(255,255,255,.03) 52%, rgba(255,255,255,.01) 100%),
    rgba(10, 14, 22, .44);
  box-shadow: 0 0 0 1px rgba(110, 168, 255, .14);
}

.comm-person:hover {
  transform: translateY(-1px);
  border-color: rgba(255,255,255,.2);
}

.comm-person-topline,
.comm-person-bottomline,
.comm-person-badges {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.comm-person-bottomline {
  align-items: center;
}

.comm-person-name {
  font-size: .88rem;
  font-weight: 600;
}

.comm-person-nick {
  font-size: .78rem;
  opacity: .8;
}

.comm-person-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  background: rgba(255,255,255,.04);
  font-size: .65rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  opacity: .86;
}

.comm-person-badge--accent {
  border-color: rgba(110, 168, 255, .24);
  background: rgba(110, 168, 255, .1);
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
  gap: 16px;
  align-items: center;
  padding: 2px 0 14px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.comm-chat-subject-meta {
  display: grid;
  gap: 8px;
}

.comm-chat-subject-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.comm-chat-subject-name {
  font-size: 1.04rem;
  font-weight: 600;
  letter-spacing: .01em;
}

.comm-chat-subject-nick {
  font-size: .8rem;
  opacity: .8;
}

.comm-chat-subject-supporting,
.comm-chat-subject-tags {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.comm-chat-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 999px;
  background: rgba(255,255,255,.04);
  font-size: .68rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  opacity: .88;
}

.comm-chat-tag--secure {
  border-color: rgba(92, 195, 131, .3);
  background: rgba(92, 195, 131, .12);
}

.comm-chat-tag--live {
  border-color: rgba(255, 177, 71, .28);
  background: rgba(255, 177, 71, .12);
}

.comm-chat-tag--ready {
  border-color: rgba(110, 168, 255, .24);
  background: rgba(110, 168, 255, .12);
}

.comm-chat-quality {
  --comm-quality-stop: 24%;
  --comm-quality-hue: 18;
  --comm-quality-alpha: .42;
  display: inline-flex;
  align-items: flex-end;
  gap: 4px;
  min-width: 56px;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 999px;
  background:
    linear-gradient(90deg,
      hsl(var(--comm-quality-hue) 88% 46% / var(--comm-quality-alpha)) 0%,
      hsl(calc(var(--comm-quality-hue) + 22) 82% 52% / .26) var(--comm-quality-stop),
      rgba(255,255,255,.05) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
}

.comm-chat-quality[data-tone='good'] {
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 18px rgba(77, 192, 117, .14);
}

.comm-chat-quality[data-tone='poor'] {
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 18px rgba(219, 78, 78, .16);
}

.comm-chat-quality__bar {
  width: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,.16);
  transition: background-color .2s ease, opacity .2s ease, transform .2s ease;
}

.comm-chat-quality__bar--active {
  background: rgba(255,255,255,.94);
  opacity: 1;
  transform: translateY(-1px);
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
  border: 1px solid var(--comm-control-border);
  background: var(--comm-control-bg);
  color: var(--comm-ink);
  text-transform: uppercase;
  letter-spacing: .08em;
  font-size: .72rem;
}

.comm-chip-btn--inactive {
  color: var(--comm-disabled-ink);
}

.comm-call-security {
  display: grid;
  gap: 6px;
  padding: 11px 14px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 18px;
  background: rgba(255,255,255,.03);
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
  color: var(--comm-soft);
}

.comm-status {
  margin: 8px 0 0;
  font-size: .78rem;
  color: var(--comm-muted);
}

.comm-icon-btn {
  width: 44px;
  min-width: 44px;
  height: 44px;
  border: 1px solid var(--comm-control-border);
  background: var(--comm-control-bg);
  color: var(--comm-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}

.comm-icon-btn--danger {
  color: var(--ds-error, #d96b6b);
}

.comm-icon-btn:disabled {
  color: var(--comm-disabled-ink);
}

.comm-icon-svg {
  width: 18px;
  height: 18px;
  display: block;
}

.comm-incoming {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
}

.comm-incoming--audio {
  background: linear-gradient(145deg, rgba(110, 168, 255, .08), rgba(255,255,255,.03));
}

.comm-incoming-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.comm-incoming-title,
.comm-incoming-meta {
  margin: 0;
}

.comm-incoming-title {
  font-size: .94rem;
  font-weight: 600;
}

.comm-incoming-meta {
  color: var(--comm-soft);
}

.comm-media-box {
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.02);
  border-radius: 18px;
}

.comm-media-box--audio {
  min-height: 188px;
  place-items: center;
  align-content: center;
  text-align: center;
}

.comm-media-grid--audio {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.comm-video {
  width: 100%;
  min-height: 132px;
  background: rgba(0,0,0,.18);
  border: 1px solid var(--glass-border, rgba(255,255,255,.12));
  object-fit: cover;
  border-radius: 16px;
}

.comm-audio-stage {
  display: grid;
  gap: 12px;
  justify-items: center;
  align-content: center;
}

.comm-audio-stage__orb {
  width: 84px;
  height: 84px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(110, 168, 255, .22);
  background: linear-gradient(145deg, rgba(110, 168, 255, .18), rgba(255,255,255,.04));
  font-size: .82rem;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.comm-audio-stage__meta {
  font-size: .78rem;
  color: var(--comm-soft);
}

.comm-main {
  grid-template-rows: minmax(320px, 1fr) auto;
  background:
    linear-gradient(145deg, rgba(255,255,255,.03), rgba(255,255,255,.01) 58%, rgba(255,255,255,.01) 100%),
    rgba(10, 14, 22, .34);
}

.comm-main--chat {
  gap: 14px;
  padding: 16px;
}

.comm-messages {
  display: grid;
  gap: 12px;
  overflow: auto;
  min-height: 240px;
  align-content: start;
}

.comm-message-rail-head,
.comm-compose-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 0 2px;
}

.comm-message-rail-head__metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.comm-message {
  justify-self: start;
  max-width: min(80%, 42rem);
  display: grid;
  gap: 8px;
  padding: 14px 15px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 18px 18px 18px 8px;
  background:
    linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.015) 58%, rgba(255,255,255,.01) 100%),
    rgba(10, 14, 22, .32);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
}

.comm-message--me {
  justify-self: end;
  border-color: rgba(110, 168, 255, .32);
  border-radius: 18px 18px 8px 18px;
  background:
    linear-gradient(145deg, rgba(110, 168, 255, .15), rgba(255,255,255,.02) 56%, rgba(255,255,255,.01) 100%),
    rgba(10, 14, 22, .38);
}

.comm-message-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.comm-message-authorline {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.comm-message-author {
  font-size: .82rem;
  font-weight: 600;
  letter-spacing: .02em;
}

.comm-message-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border: 1px solid rgba(110, 168, 255, .24);
  border-radius: 999px;
  background: rgba(110, 168, 255, .1);
  font-size: .62rem;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.comm-message-badge--subtle {
  border-color: rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
}

.comm-message-time {
  white-space: nowrap;
  color: var(--comm-soft);
}

.comm-message-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
  font-size: .92rem;
}

.comm-input {
  min-height: 112px;
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  color: var(--comm-ink);
  caret-color: var(--comm-ink);
  resize: vertical;
}

.comm-input::placeholder,
.comm-search::placeholder {
  color: var(--comm-soft);
  opacity: 1;
}

.comm-compose-shell {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgba(255,255,255,.05), rgba(255,255,255,.02) 56%, rgba(255,255,255,.01) 100%),
    rgba(10, 14, 22, .36);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}

.comm-send-btn {
  width: 52px;
  min-width: 52px;
  height: 52px;
  border: 1px solid rgba(110, 168, 255, .26);
  background:
    linear-gradient(145deg, rgba(110, 168, 255, .22), rgba(110, 168, 255, .1));
  color: #f8fbff;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 22px rgba(110, 168, 255, .14);
}

.comm-send-btn:disabled {
  color: rgba(248, 251, 255, .56);
  box-shadow: none;
}

.comm-icon-svg--send {
  width: 22px;
  height: 22px;
}

.comm-empty,
.comm-empty-inline {
  font-size: .82rem;
  color: var(--comm-soft);
}

.comm-empty--panel {
  padding: 18px;
  border: 1px dashed rgba(255,255,255,.12);
  border-radius: 18px;
  background: rgba(255,255,255,.02);
}

.comm-empty-note {
  margin: 8px 0 0;
  max-width: 34rem;
  font-size: .78rem;
  color: var(--comm-soft);
}

.comm-settings-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}

.comm-setting-card {
  border: 1px solid rgba(255,255,255,.1);
  padding: 14px;
  align-content: start;
  background:
    linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.015) 58%, rgba(255,255,255,.01) 100%),
    rgba(10, 14, 22, .28);
  border-radius: 18px;
}

  .comm-agent-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .comm-coordination-list {
    display: grid;
    gap: 10px;
  }

  .comm-playbook-list {
    display: grid;
    gap: 10px;
  }

  .comm-call-insight-list {
    display: grid;
    gap: 10px;
  }

  .comm-coordination-row {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    background: rgba(255,255,255,.03);
  }

  .comm-playbook-row {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border-top: 1px solid rgba(255,255,255,.08);
  }

  .comm-call-insight-row {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    background: rgba(255,255,255,.025);
  }

.comm-setting-row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: .82rem;
}

.comm-setting-name {
  color: var(--comm-muted);
}

.comm-setting-value {
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--comm-soft);
}

.comm-setting-note {
  margin: 0;
  font-size: .76rem;
  color: var(--comm-soft);
  line-height: 1.45;
}

  .comm-setting-note--strong {
    color: var(--comm-ink);
    font-weight: 600;
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
  background:
    linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02) 50%, rgba(110, 168, 255, .08) 100%),
    rgba(12, 12, 18, .92);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}

.comm-bottom-switch__btn {
  min-height: 48px;
  border: 0;
  border-right: 1px solid var(--comm-control-border);
  background: transparent;
  color: var(--comm-muted);
  text-transform: uppercase;
  letter-spacing: .1em;
  font-size: .72rem;
  transition: background-color .18s ease, color .18s ease;
}

.comm-bottom-switch__btn:last-child {
  border-right: 0;
}

.comm-bottom-switch__btn--active {
  background: rgba(110, 168, 255, .16);
  color: var(--comm-ink);
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

  .comm-section-head,
  .comm-person-topline,
  .comm-person-bottomline,
  .comm-message-rail-head,
  .comm-compose-head,
  .comm-compose-shell {
    display: grid;
  }

  .comm-incoming-head,
  .comm-media-grid--audio {
    display: grid;
  }

  .comm-chat-subject-head,
  .comm-chat-subject-supporting {
    align-items: flex-start;
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
