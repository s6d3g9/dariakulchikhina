import { computed, ref } from 'vue'
import type { MessengerConversationSecuritySummary } from '../../entities/messages/model/useMessengerCrypto'

export function useSecuritySummary(options: {
  conversations: ReturnType<typeof useMessengerConversations>
  auth: ReturnType<typeof useMessengerAuth>
  messengerCrypto: ReturnType<typeof useMessengerCrypto>
  activeConversationSupportsSecuritySummary: Ref<boolean>
}) {
  const securitySummary = ref<MessengerConversationSecuritySummary | null>(null)
  const securitySummaryPending = ref(false)
  const securitySummaryUpdatedAt = ref<string | null>(null)

  const securityItems = computed(() => {
    if (!securitySummary.value) {
      return []
    }

    return [
      {
        id: 'protocol',
        title: securitySummary.value.protocolLabel,
        meta: securitySummary.value.protocolMeta,
        state: 'Защищено',
        icon: 'shield' as const,
        tone: 'ok' as const,
      },
      {
        id: 'device-key',
        title: 'Ключ этого устройства',
        meta: securitySummary.value.deviceKeyMeta,
        state: securitySummary.value.deviceKeyReady ? 'Активен' : 'Ожидание',
        icon: 'device' as const,
        tone: securitySummary.value.deviceKeyReady ? 'ok' as const : 'neutral' as const,
      },
      {
        id: 'peer-device-key',
        title: 'Ключ устройства собеседника',
        meta: securitySummary.value.peerDeviceKeyMeta,
        state: securitySummary.value.peerDeviceKeyReady ? 'Найден' : 'Нет данных',
        icon: 'peer' as const,
        tone: securitySummary.value.peerDeviceKeyReady ? 'ok' as const : 'neutral' as const,
      },
      {
        id: 'conversation-key',
        title: 'Ключ этого чата',
        meta: securitySummary.value.conversationKeyMeta,
        state: securitySummary.value.conversationKeyReady ? 'Готов' : 'Ещё не создан',
        icon: 'key' as const,
        tone: securitySummary.value.conversationKeyReady ? 'ok' as const : 'neutral' as const,
      },
      ...(securitySummary.value.keyPackageCreatedAt
        ? [{
          id: 'key-package-time',
          title: 'Последний пакет ключа',
          meta: 'Время создания зашифрованного пакета ключа для этого чата.',
          state: new Date(securitySummary.value.keyPackageCreatedAt).toLocaleString('ru-RU'),
          icon: 'clock' as const,
          tone: 'neutral' as const,
        }]
        : []),
    ]
  })

  const securitySummaryText = computed(() => {
    if (securitySummaryPending.value) {
      return 'Проверяем состояние шифрования для этого чата.'
    }

    if (!securitySummary.value) {
      return 'Данные о шифровании появятся, когда чат будет готов к проверке.'
    }

    return 'Показаны только статусы и метаданные. Фактические ключи не выводятся и остаются только на устройствах пользователей.'
  })

  const sharedGallerySecurity = computed(() => {
    if (!options.activeConversationSupportsSecuritySummary.value) {
      return undefined
    }

    return {
      summary: securitySummaryText.value,
      items: securityItems.value,
      pending: securitySummaryPending.value,
      updatedAt: securitySummaryUpdatedAt.value,
    }
  })

  async function refreshSecuritySummary() {
    const activeConversation = options.conversations.activeConversation.value
    if (!activeConversation || !options.auth.user.value || !options.activeConversationSupportsSecuritySummary.value) {
      securitySummary.value = null
      securitySummaryUpdatedAt.value = null
      securitySummaryPending.value = false
      return
    }

    securitySummaryPending.value = true

    try {
      securitySummary.value = await options.messengerCrypto.getConversationSecuritySummary(
        options.auth.request,
        options.auth.user.value.id,
        activeConversation.id,
        activeConversation.peerUserId,
      )
      securitySummaryUpdatedAt.value = new Date().toISOString()
    } catch {
      securitySummary.value = {
        protocolLabel: 'E2EE недоступно',
        protocolMeta: 'Не удалось получить статус ключей для этого чата.',
        deviceKeyReady: false,
        deviceKeyMeta: 'Проверка ключа устройства не удалась.',
        peerDeviceKeyReady: false,
        peerDeviceKeyMeta: 'Не удалось проверить ключ собеседника.',
        conversationKeyReady: false,
        conversationKeyMeta: 'Не удалось проверить ключ этого чата.',
      }
      securitySummaryUpdatedAt.value = new Date().toISOString()
    } finally {
      securitySummaryPending.value = false
    }
  }

  return {
    securitySummary,
    securitySummaryPending,
    securitySummaryUpdatedAt,
    securityItems,
    securitySummaryText,
    sharedGallerySecurity,
    refreshSecuritySummary,
  }
}
