export type MessengerSectionKey = 'chat' | 'chats' | 'contacts' | 'agents' | 'aidev' | 'settings'

export interface MessengerSectionItem {
  key: MessengerSectionKey
  title: string
  shortTitle: string
  description: string
}

export function useMessengerSections() {
  const { agentsEnabled } = useMessengerFeatures()

  const sections = computed<MessengerSectionItem[]>(() => {
    const chat: MessengerSectionItem = {
      key: 'chat',
      title: 'Чат',
      shortTitle: 'Чат',
      description: 'Диалог с сообщениями, файлами, аудиозаписью и кнопками звонков.',
    }
    const chats: MessengerSectionItem = {
      key: 'chats',
      title: 'Чаты',
      shortTitle: 'Чаты',
      description: 'Лента открытых чатов с превью последнего сообщения и статусов.',
    }
    const contacts: MessengerSectionItem = {
      key: 'contacts',
      title: 'Контакты',
      shortTitle: 'Контакты',
      description: 'Поиск, приглашения в контакты и быстрый старт direct-диалога.',
    }
    const agents: MessengerSectionItem = {
      key: 'agents',
      title: 'Агенты',
      shortTitle: 'Агенты',
      description: 'AI-собеседники для задач, материалов и контроля реализации.',
    }
    const aidev: MessengerSectionItem = {
      key: 'aidev',
      title: 'AIDev',
      shortTitle: 'AIDev',
      description: 'Проектная AI-разработка: composer проекта, ресурсы и агенты.',
    }
    const settings: MessengerSectionItem = {
      key: 'settings',
      title: 'Настройки',
      shortTitle: 'Настройки',
      description: 'Профиль, уведомления, устройства, приватность и разрешения браузера.',
    }

    // Without the agents feature flag we still show AIDev (it's the
    // project-centric dev flow, independent of the global agents tab).
    if (!agentsEnabled.value) {
      return [chat, chats, contacts, aidev, settings]
    }

    return [chat, chats, contacts, agents, aidev, settings]
  })

  return { sections }
}
