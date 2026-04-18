export type MessengerSectionKey = 'chat' | 'chats' | 'contacts' | 'agents' | 'settings'

export interface MessengerSectionItem {
  key: MessengerSectionKey
  title: string
  shortTitle: string
  description: string
}

export function useMessengerSections() {
  const { agentsEnabled } = useMessengerFeatures()

  const sections = computed<MessengerSectionItem[]>(() => {
    const baseSections: MessengerSectionItem[] = [
      {
        key: 'chat',
        title: 'Чат',
        shortTitle: 'Чат',
        description: 'Диалог с сообщениями, файлами, аудиозаписью и кнопками звонков.',
      },
      {
        key: 'chats',
        title: 'Чаты',
        shortTitle: 'Чаты',
        description: 'Лента открытых чатов с превью последнего сообщения и статусов.',
      },
      {
        key: 'contacts',
        title: 'Контакты',
        shortTitle: 'Контакты',
        description: 'Поиск, приглашения в контакты и быстрый старт direct-диалога.',
      },
      {
        key: 'settings',
        title: 'Настройки',
        shortTitle: 'Настройки',
        description: 'Профиль, уведомления, устройства, приватность и разрешения браузера.',
      },
    ]

    if (!agentsEnabled.value) {
      return baseSections
    }

    return [
      baseSections[0]!,
      baseSections[1]!,
      baseSections[2]!,
      {
        key: 'agents',
        title: 'Агенты',
        shortTitle: 'Агенты',
        description: 'AI-собеседники для задач, материалов и контроля реализации.',
      },
      baseSections[3]!,
    ]
  })

  return { sections }
}