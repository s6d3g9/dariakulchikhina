import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { MessengerConversationMessage } from '../../../entities/conversations/model/useMessengerConversations'

export interface SharedAssetItem {
  id: string
  title: string
  meta: string
  href: string
  previewUrl?: string
}

export interface SharedContent {
  photos: SharedAssetItem[]
  stickers: SharedAssetItem[]
  documents: SharedAssetItem[]
  links: SharedAssetItem[]
}

function isStickerSharedAsset(message: MessengerConversationMessage) {
  const attachment = message.attachment
  if (!attachment || !attachment.mimeType.startsWith('image/')) {
    return false
  }

  return attachment.klipy?.kind === 'sticker' || attachment.mimeType === 'image/webp'
}

function resolveAttachmentTitle(attachment: { name: string, mimeType: string }) {
  if (attachment.mimeType.startsWith('audio/')) {
    return 'Аудиосообщение'
  }

  return attachment.name
}

function extractLinks(text: string) {
  return Array.from(text.matchAll(/https?:\/\/[^\s]+/g), match => match[0])
}

export function useSharedContent(messages: Ref<MessengerConversationMessage[]>): ComputedRef<SharedContent> {
  return computed(() => {
    const photos: SharedAssetItem[] = []
    const stickers: SharedAssetItem[] = []
    const documents: SharedAssetItem[] = []
    const links: SharedAssetItem[] = []

    for (const entry of messages.value) {
      if (entry.attachment) {
        const item: SharedAssetItem = {
          id: entry.id,
          title: resolveAttachmentTitle(entry.attachment),
          meta: `${entry.attachment.mimeType} · ${Math.ceil(entry.attachment.size / 1024)} KB`,
          href: entry.attachment.resolvedUrl,
          previewUrl: entry.attachment.mimeType.startsWith('image/') ? entry.attachment.resolvedUrl : undefined,
        }

        if (entry.attachment.mimeType.startsWith('image/')) {
          if (isStickerSharedAsset(entry)) {
            stickers.push(item)
          } else {
            photos.push(item)
          }
        } else {
          documents.push(item)
        }
      }

      for (const href of extractLinks(entry.body)) {
        links.push({
          id: `${entry.id}-${href}`,
          title: href.replace(/^https?:\/\//, ''),
          meta: 'Ссылка из переписки',
          href,
        })
      }
    }

    return {
      photos,
      stickers,
      documents,
      links,
    }
  })
}
