import { Room, RoomEvent, AudioStream } from '@livekit/rtc-node'
import { AccessToken } from 'livekit-server-sdk'
import { randomUUID } from 'node:crypto'

function createWavBuffer(samples: Int16Array, sampleRate: number, channels: number): Buffer {
  const byteLength = samples.length * 2
  const buffer = Buffer.alloc(44 + byteLength)
  
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + byteLength, 4)
  buffer.write('WAVE', 8)
  
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channels * 2, 28)
  buffer.writeUInt16LE(channels * 2, 32)
  buffer.writeUInt16LE(16, 34)
  
  buffer.write('data', 36)
  buffer.writeUInt32LE(byteLength, 40)
  
  Buffer.from(samples.buffer, samples.byteOffset, byteLength).copy(buffer, 44)
  
  return buffer
}

export type LiveKitBotTranscribeCallback = (
  participantIdentity: string,
  audioBase64: string,
  mimeType: string,
  roomName: string,
  sequence: number
) => Promise<string | undefined>

export async function joinLiveKitRoomAsBot(
  serverUrl: string,
  apiKey: string,
  apiSecret: string,
  roomName: string,
  onTranscribe?: LiveKitBotTranscribeCallback
) {
  const botId = `stt-bot-${randomUUID()}`

  const at = new AccessToken(apiKey, apiSecret, {
    identity: botId,
    name: 'Transcription Bot',
  })

  // The bot is hidden so it doesn't appear in the regular UI grid
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canPublishData: true, hidden: true })
  
  const token = await at.toJwt()

  const room = new Room()

  const nativelyTranscribingParticipants = new Set<string>()

  room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any) => {
    try {
      const msg = new TextDecoder().decode(payload)
      const data = JSON.parse(msg)
      if (data.type === 'transcription-sync' && participant?.identity) {
        nativelyTranscribingParticipants.add(participant.identity)
      }
    } catch {}
  })

  room.on(RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
    if (track.kind === 0 || track.kind === 'audio') {
       console.log('Subscribed to audio track from', participant.identity)
       
       const stream = new AudioStream(track)
       const reader = stream.getReader()
       
       let sequence = 0
       
       void (async () => {
         let audioBuffer: number[] = []
         let sampleRate = 48000
         let channels = 1
         
         const MAX_CHUNK_SECS = 15
         const MIN_CHUNK_SECS = 1.0
         const SILENCE_RMS_THRESHOLD = 500
         const SILENCE_SECS_TRIGGER = 0.8
         
         let consecutiveSilenceSamples = 0
         
         const flushBuffer = async (pcmDataSnap: number[], rate: number, ch: number, seq: number) => {
            if (pcmDataSnap.length < rate * 0.5) return
            if (nativelyTranscribingParticipants.has(participant.identity)) return
            
            const currentSamples = new Int16Array(pcmDataSnap)
            const wavBuffer = createWavBuffer(currentSamples, rate, ch)
            const base64Wav = wavBuffer.toString('base64')
            
            try {
              if (onTranscribe) {
                const text = await onTranscribe(participant.identity, base64Wav, 'audio/wav', roomName, seq)
                
                if (text && text.trim()) {
                  console.log(`STT Bot Transcribed [${participant.identity}]: ${text.trim()}`)
                  const msg = JSON.stringify({
                    type: 'transcription-sync',
                    draft: '',
                    entries: [{
                      id: randomUUID(),
                      text: text.trim(),
                      speaker: participant.identity,
                      createdAt: Date.now()
                    }]
                  })
                  
                  const dataBuffer = new TextEncoder().encode(msg)
                  await room.localParticipant?.publishData(dataBuffer, { reliable: true })
                }
              }
            } catch (err) {
              console.error('STT Bot transcription error', err)
            }
         }
         
         try {
           while (true) {
             const { done, value } = await reader.read()
             if (done || !value) break
             
             sampleRate = value.sampleRate
             channels = value.channels
             
             const pcmData = new Int16Array(value.data.buffer, value.data.byteOffset, value.data.byteLength / 2)
             
             let sumSquares = 0
             for (let i = 0; i < pcmData.length; i++) {
               const sample = pcmData[i]
               sumSquares += sample * sample
               audioBuffer.push(sample)
             }
             
             const rms = Math.sqrt(sumSquares / pcmData.length)
             
             if (rms < SILENCE_RMS_THRESHOLD) {
               consecutiveSilenceSamples += pcmData.length
             } else {
               consecutiveSilenceSamples = 0
             }
             
             const currentLenSecs = audioBuffer.length / sampleRate
             const silenceSecs = consecutiveSilenceSamples / sampleRate
             
             const forcedToFlush = currentLenSecs >= MAX_CHUNK_SECS
             const silenceTrigger = currentLenSecs >= MIN_CHUNK_SECS && silenceSecs >= SILENCE_SECS_TRIGGER
             
             if (forcedToFlush || silenceTrigger) {
               sequence++
               void flushBuffer([...audioBuffer], sampleRate, channels, sequence)
               
               audioBuffer = []
               consecutiveSilenceSamples = 0
             }
           }
         } catch (err) {
           console.error('Bot audio track read error', err)
         }
       })()
    }
  })

  await room.connect(serverUrl, token)
  console.log(`Bot ${botId} joined room ${roomName}`)
  
  return room
}
