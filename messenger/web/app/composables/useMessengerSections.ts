export type MessengerSectionKey = 'chat' | 'chats' | 'contacts' | 'settings'

export interface MessengerSectionItem {
  key: MessengerSectionKey
  title: string
  shortTitle: string
  description: string
}

export function useMessengerSections() {
  const sections: MessengerSectionItem[] = [
    {
      key: 'chat',
      title: 'Chat',
      shortTitle: 'Чат',
      description: 'Диалог с сообщениями, файлами, аудиозаписью и кнопками звонков.',
    },
    {
      key: 'chats',
      title: 'Chats',
      shortTitle: 'Чаты',
      description: 'Лента открытых чатов с превью последнего сообщения и статусов.',
    },
    {
      key: 'contacts',
      title: 'Contacts',
      shortTitle: 'Контакты',
      description: 'Поиск, приглашения в контакты и быстрый старт direct-диалога.',
    },
    {
      key: 'settings',
      title: 'Settings',
      shortTitle: 'Настройки',
      description: 'Профиль, уведомления, устройства, приватность и media permissions.',
    },
  ]

  return { sections }
}