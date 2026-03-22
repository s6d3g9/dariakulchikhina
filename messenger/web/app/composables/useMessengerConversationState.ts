export function useMessengerConversationState() {
  const activeConversationId = useState<string | null>('messenger-active-conversation-id', () => null)
  const activeSection = useState<'chat' | 'chats' | 'contacts' | 'settings'>('messenger-active-section', () => 'chats')
  const mediaSheetOpen = useState<boolean>('messenger-media-sheet-open', () => false)

  function openConversation(conversationId: string) {
    activeConversationId.value = conversationId
    activeSection.value = 'chat'
  }

  function openSection(section: 'chat' | 'chats' | 'contacts' | 'settings') {
    activeSection.value = section
  }

  return {
    activeConversationId,
    activeSection,
    mediaSheetOpen,
    openConversation,
    openSection,
  }
}