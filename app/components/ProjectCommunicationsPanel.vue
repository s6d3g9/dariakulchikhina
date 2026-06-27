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
              <span v-for="agent in coordinationBrief.agents.filter(item => item.enabled)" :key="agent.id" class="comm-person-badge">{{ agent.title }}</span>
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
                <div v-if="canManageCallInsights" class="comm-agent-pills">
                  <span v-if="insight.clientVisible" class="comm-person-badge comm-person-badge--accent">roadmap клиента</span>
                </div>
                <div v-if="canManageCallInsights" class="comm-setting-actions">
                  <GlassButton variant="secondary" density="compact"
                    v-if="insight.nextSteps.length"
                    type="button"
                    :disabled="callInsightApplyPendingId === insight.id"
                    @click="applyCallInsightToSprint(insight.id)"
                  >
                    {{ callInsightApplyPendingId === insight.id ? 'применяем...' : (insight.appliedTaskIds?.length ? 'досинхронизировать задачи' : 'в активный спринт') }}
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    density="compact"
                    type="button"
                    :disabled="callInsightVisibilityPendingId === insight.id"
                    @click="setCallInsightClientVisibility(insight.id, !insight.clientVisible)"
                  >
                    {{ callInsightVisibilityPendingId === insight.id ? 'обновляем...' : (insight.clientVisible ? 'скрыть из roadmap' : 'в roadmap клиента') }}
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useProjectCommunicationsBootstrap } from '~~/app/composables/useProjectCommunicationsBootstrap'
import { getHealthTone, getHybridStakeholderRoleLabel } from '~~/shared/utils/project/project-control'
import type {
  CommunicationActorRole,
  CommunicationRoom,
  CommunicationRoomResponse,
  CommunicationRoomsResponse,
  ProjectCommunicationBootstrap,
} from '~~/shared/types/communications'
import type { ApiV1Envelope } from '~~/shared/types/api-v1'
import type { ApiV1ProjectCallInsightClientVisibility } from '~~/shared/types/api-v1'
import { encryptCommunicationText } from '~~/shared/utils/communications-e2ee'

const props = defineProps<{
  projectSlug: string
  apiScope?: 'legacy' | 'client'
}>()

type SecureParticipant = {
  actorKey: string
  actorId: string
  role: CommunicationActorRole
  displayName: string
  nickname?: string
}

type ChatSummary = {
  roomId: string
  externalRef: string
  updatedAt: string
  participant: SecureParticipant
}

const localVideoEl = ref<HTMLVideoElement | null>(null)
const remoteVideoEl = ref<HTMLVideoElement | null>(null)
const messagesEl = ref<HTMLElement | null>(null)

const { data: bootstrap, pending: bootstrapPending, error: bootstrapError, refresh: refreshBootstrap } = useProjectCommunicationsBootstrap(
  computed(() => props.projectSlug),
  { apiScope: computed(() => props.apiScope || 'legacy') },
)

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
const sendingMessage = ref(false)
const draftMessage = ref('')
const runtimeError = ref('')
const callInsightApplyPendingId = ref('')
const callInsightVisibilityPendingId = ref('')
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

async function setCallInsightClientVisibility(insightId: string, clientVisible: boolean) {
  if (!insightId || callInsightVisibilityPendingId.value) return

  callInsightVisibilityPendingId.value = insightId
  callInsightActionStatus.value = ''

  try {
    const response = await $fetch<ApiV1Envelope<ApiV1ProjectCallInsightClientVisibility>>(
      `/api/v1/projects/${props.projectSlug}/call-insights/${insightId}/client-visibility`,
      {
        method: 'PATCH',
        body: { clientVisible },
      },
    )

    callInsightActionStatus.value = response.data.insight.clientVisible
      ? 'Отчёт опубликован в roadmap клиента.'
      : 'Отчёт скрыт из roadmap клиента.'
    await refreshBootstrap()
  } catch (error: any) {
    callInsightActionStatus.value = error?.data?.statusMessage || error?.message || 'Не удалось обновить видимость отчёта.'
  } finally {
    callInsightVisibilityPendingId.value = ''
  }
}
const quickSection = ref<'chat' | 'chats' | 'contacts' | 'settings'>('contacts')

const {
  contactSearch,
  chatSearch,
  nicknameDraft,
  nicknameStatus,
  nicknameSaving,
  normalizeNicknameInput,
  isValidNickname,
  selfParticipant,
  availableContacts,
  currentChatPeer,
  filteredContacts,
  filteredOpenChats,
  hasAvailableContacts,
  chatPeerInitials,
} = useProjectCommunicationsDirectoryView({
  actorKey,
  contacts,
  openChats,
  currentChatPeerKey,
})

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

function buildDirectChatExternalRef(peerActorKey: string) {
  return `${directChatsPrefix.value}${[actorKey.value, peerActorKey].sort().join('__')}`
}

const communicationsApiBase = computed(() => props.apiScope === 'client'
  ? `/api/v1/client/projects/${props.projectSlug}/communications`
  : `/api/projects/${props.projectSlug}/communications`)

function isApiV1EnvelopePayload<T>(payload: unknown): payload is ApiV1Envelope<T> {
  return Boolean(payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload && 'errors' in payload)
}

async function apiFetch<T>(path: string, options: any = {}) {
  const response = await $fetch<T | ApiV1Envelope<T>>(`${communicationsApiBase.value}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })

  return isApiV1EnvelopePayload<T>(response) ? response.data : response
}

const {
  decryptedMessages,
  keyBundles,
  syncStatus,
  roomKeyReady,
  identityPrivateKey,
  roomKey,
  myKeyId,
  ensureIdentity,
  ensureStoredRoomKey,
  persistRoomKey,
  resetMessageSyncState,
  mergeKeyBundle,
  rebuildDecryptedMessages,
  fetchMessagesAndKeys,
  createAndBroadcastRoomKeyIfNeeded,
  shareRoomKeyWithKnownPeers,
  refreshMessagesOnly,
} = useProjectCommunicationsMessageSync({
  projectSlug: props.projectSlug,
  actorKey,
  actor: computed(() => bootstrapData.value?.actor || null),
  currentChatRoomId,
  currentChatExternalRef,
  messagesEl,
  apiFetch,
})

const {
  incomingCall,
  activeCall,
  callStatusText,
  callBusy,
  callSecurity,
  remoteMutedByPeer,
  eventStreamConnected,
  activeCallMode,
  callPermissionHelp,
  callConnectionQuality,
  callConnectionQualityStyle,
  callControls,
  supportedCalls,
  microphonePermissionLabel,
  cameraPermissionLabel,
  compactCallSecurityStatus,
  videoReadiness,
  toggleMicrophone,
  toggleSpeaker,
  refreshMediaPermissions,
  checkAudioAccess,
  checkVideoAccess,
  resetRealtimeState,
  setupEventStream,
  startOutgoingCall,
  acceptIncomingCall,
  rejectIncomingCall,
  hangupCall,
  teardownCall,
  disposeRealtime,
} = useProjectCommunicationsRealtime({
  projectSlug: props.projectSlug,
  apiScope: computed(() => props.apiScope || 'legacy'),
  actorKey,
  currentChatRoomId,
  currentChatPeer,
  localVideoEl,
  remoteVideoEl,
  apiFetch,
  keyBundles,
  syncStatus,
  identityPrivateKey,
  roomKey,
  mergeKeyBundle,
  persistRoomKey,
  resetMessageSyncState,
  rebuildDecryptedMessages,
  shareRoomKeyWithKnownPeers,
  refreshMessagesOnly,
  fetchOpenChats,
})

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
  resetRealtimeState()
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
    const encrypted = await encryptCommunicationText({ roomKey: activeRoomKey, text: draftMessage.value.trim(), senderKeyId: myKeyId.value })
    await apiFetch(`/rooms/${currentChatRoomId.value}/messages`, { method: 'POST', body: { encrypted } })
    draftMessage.value = ''
    await fetchOpenChats()
  } catch (error: any) {
    syncStatus.value = error?.data?.error || error?.message || 'Не удалось отправить сообщение'
  } finally {
    sendingMessage.value = false
  }
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

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
  disposeRealtime()
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
