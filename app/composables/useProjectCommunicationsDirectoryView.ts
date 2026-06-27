import { computed, ref, watch, type Ref } from 'vue'
import type { CommunicationActorRole } from '~~/shared/types/communications'

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

type UseProjectCommunicationsDirectoryViewOptions = {
  actorKey: Ref<string>
  contacts: Ref<SecureParticipant[]>
  openChats: Ref<ChatSummary[]>
  currentChatPeerKey: Ref<string>
}

export function useProjectCommunicationsDirectoryView(options: UseProjectCommunicationsDirectoryViewOptions) {
  const contactSearch = ref('')
  const chatSearch = ref('')
  const nicknameDraft = ref('')
  const nicknameStatus = ref('')
  const nicknameSaving = ref(false)

  function normalizeNicknameInput(value: string) {
    return value.trim().replace(/^@+/, '').toLowerCase()
  }

  function isValidNickname(value: string) {
    return /^[\p{L}\p{N}._-]{3,32}$/u.test(value)
  }

  const selfParticipant = computed(() => (
    options.contacts.value.find((participant) => participant.actorKey === options.actorKey.value) || null
  ))

  const availableContacts = computed(() => (
    options.contacts.value.filter((participant) => participant.actorKey !== options.actorKey.value)
  ))

  const currentChatPeer = computed(() => (
    availableContacts.value.find((participant) => participant.actorKey === options.currentChatPeerKey.value) || null
  ))

  const filteredContacts = computed(() => {
    const query = contactSearch.value.trim().toLowerCase()
    if (!query) return availableContacts.value
    return availableContacts.value.filter((participant) => (
      [participant.displayName, participant.role, participant.nickname ? `@${participant.nickname}` : '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    ))
  })

  const filteredOpenChats = computed(() => {
    const query = chatSearch.value.trim().toLowerCase()
    if (!query) return options.openChats.value
    return options.openChats.value.filter((chat) => (
      [chat.participant.displayName, chat.participant.role, chat.participant.nickname ? `@${chat.participant.nickname}` : '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    ))
  })

  const hasAvailableContacts = computed(() => availableContacts.value.length > 0)

  const chatPeerInitials = computed(() => {
    const name = currentChatPeer.value?.displayName?.trim() || 'PEER'
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'PEER'
  })

  watch(selfParticipant, (nextParticipant) => {
    if (!nicknameSaving.value) {
      nicknameDraft.value = nextParticipant?.nickname ? `@${nextParticipant.nickname}` : ''
    }
  }, { immediate: true })

  return {
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
  }
}