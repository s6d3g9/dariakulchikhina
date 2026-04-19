import type { Ref } from 'vue'
import type { MessengerCallTranscriptEntry } from './use-call-transcription'

export interface UseCallTranscriptionSyncDeps {
  transcriptionActive: Ref<boolean>
  transcriptionDraft: Ref<string>
  transcriptionEntries: Ref<MessengerCallTranscriptEntry[]>
  authUserId: Ref<string | null>
  isOwnSpeechRecognitionRunning: () => boolean
  getLiveKitRoom: () => any
}

export function useCallTranscriptionSync(deps: UseCallTranscriptionSyncDeps) {
  const { transcriptionActive, transcriptionDraft, transcriptionEntries, authUserId } = deps
  let peerDataChannel: RTCDataChannel | null = null

  function sendTranscriptionSync() {
    if (!transcriptionActive.value) return

    const payload = JSON.stringify({
      type: 'transcription-sync',
      draft: transcriptionDraft.value,
      entries: transcriptionEntries.value,
    })

    if (peerDataChannel?.readyState === 'open') {
      try {
        peerDataChannel.send(payload)
      } catch {}
    }

    const liveKitRoom = deps.getLiveKitRoom()
    if (liveKitRoom) {
      try {
        const dataBuffer = new TextEncoder().encode(payload)
        liveKitRoom.localParticipant.publishData(dataBuffer, { reliable: true })
      } catch {}
    }
  }

  if (import.meta.client) {
    let transcriptionSyncTimer: ReturnType<typeof setTimeout> | null = null
    let transcriptionSyncPending = false

    watch([transcriptionDraft, transcriptionEntries], () => {
      if (!transcriptionSyncTimer) {
        sendTranscriptionSync()
        transcriptionSyncTimer = setTimeout(() => {
          transcriptionSyncTimer = null
          if (transcriptionSyncPending) {
            transcriptionSyncPending = false
            sendTranscriptionSync()
          }
        }, 250)
      } else {
        transcriptionSyncPending = true
      }
    }, { deep: true })
  }

  function handleIncomingDataChannelMessage(data: string) {
    try {
      const payload = JSON.parse(data)
      if (payload.type !== 'transcription-sync') {
        return
      }

      if (typeof payload.draft === 'string' && !transcriptionActive.value) {
        transcriptionDraft.value = payload.draft
      }

      if (!Array.isArray(payload.entries)) {
        return
      }

      const transformed: MessengerCallTranscriptEntry[] = payload.entries.map((e: any) => ({
        ...e,
        speaker: e.speaker === 'you' ? 'peer' : (e.speaker === 'peer' ? 'you' : (e.speaker === authUserId.value ? 'you' : 'peer')),
      }))

      if (!transcriptionActive.value) {
        transcriptionEntries.value = transformed
        return
      }

      const existingMap = new Map(transcriptionEntries.value.map(x => [x.id, x]))
      let changed = false

      for (const item of transformed) {
        if (item.speaker === 'you' && deps.isOwnSpeechRecognitionRunning()) continue

        const existing = existingMap.get(item.id)
        if (!existing) {
          existingMap.set(item.id, item)
          changed = true
        } else if (existing.text !== item.text || existing.final !== item.final) {
          existing.text = item.text
          existing.final = item.final
          changed = true
        }
      }

      if (changed) {
        const combined = Array.from(existingMap.values()).sort((a, b) => a.createdAt - b.createdAt)
        transcriptionEntries.value = combined.slice(Math.max(0, combined.length - 120))
      }
    } catch {}
  }

  function setupPeerDataChannel(channel: RTCDataChannel) {
    peerDataChannel = channel
    channel.onmessage = (event) => {
      handleIncomingDataChannelMessage(event.data)
    }
    channel.onopen = () => {
      if (transcriptionActive.value) {
        try {
          channel.send(JSON.stringify({
            type: 'transcription-sync',
            draft: transcriptionDraft.value,
            entries: transcriptionEntries.value,
          }))
        } catch {}
      }
    }
  }

  function closePeerDataChannel() {
    peerDataChannel?.close()
    peerDataChannel = null
  }

  return {
    setupPeerDataChannel,
    closePeerDataChannel,
    handleIncomingDataChannelMessage,
  }
}
