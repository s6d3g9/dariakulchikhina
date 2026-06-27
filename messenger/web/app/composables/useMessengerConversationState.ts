export function useMessengerConversationState() {
  const { agentsEnabled } = useMessengerFeatures()
  const activeConversationId = useState<string | null>('messenger-active-conversation-id', () => null)
  const activeSection = useState<'chat' | 'chats' | 'contacts' | 'agents' | 'router' | 'settings'>('messenger-active-section', () => 'chats')
  const mediaSheetOpen = useState<boolean>('messenger-media-sheet-open', () => false)

  if ((activeSection.value === 'agents' || activeSection.value === 'router') && !agentsEnabled.value) {
    activeSection.value = 'chats'
  }

  function openConversation(conversationId: string) {
    activeConversationId.value = conversationId
    activeSection.value = 'chat'
  }

  function openSection(section: 'chat' | 'chats' | 'contacts' | 'agents' | 'router' | 'settings') {
    activeSection.value = !agentsEnabled.value && (section === 'agents' || section === 'router') ? 'chats' : section
  }

  return {
    activeConversationId,
    activeSection,
    mediaSheetOpen,
    openConversation,
    openSection,
  }
}
