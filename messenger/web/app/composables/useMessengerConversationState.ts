export function useMessengerConversationState() {
  const activeConversationId = useState<string | null>('messenger-active-conversation-id', () => null)
  const activeSection = useState<'chat' | 'chats' | 'contacts' | 'settings'>('messenger-active-section', () => 'chats')

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
    openConversation,
    openSection,
  }
}