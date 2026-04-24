import type { MessengerSectionKey } from '../model/useMessengerSections'

export function sectionIcon(section: MessengerSectionKey): string {
  switch (section) {
    case 'chat':
      return 'mdi-message-outline'
    case 'chats':
      return 'mdi-message-text-outline'
    case 'contacts':
      return 'mdi-account-multiple-outline'
    case 'agents':
      return 'mdi-robot-outline'
    case 'aidev':
      return 'mdi-rocket-launch-outline'
    case 'settings':
      return 'mdi-cog-outline'
  }
}
