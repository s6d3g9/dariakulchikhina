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

  room.on(RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
    if (track.kind === 0 || track.kind === 'audio') {
       console.log('Subscribed to audio track from', participant.identity)
       
       const stream = new AudioStream(track)
       const reader = stream.getReader()
       
       let sequence = 0
       
       void (async () => {
         // Accumulate PCM data
         let audioBuffer: number[] = []
         let sampleRate = 48000
         let channels = 1
         
         const flushInterval = setInterval(async () => {
           if (audioBuffer.length === 0) return
           
           const currentSamples = new Int16Array(audioBuffer)
           audioBuffer = [] // Clear for next chunk
           
           const wavBuffer = createWavBuffer(currentSamples, sampleRate, channels)
           const base64Wav = wavBuffer.toString('base64')
           
           try {
             sequence++
             if (onTranscribe && currentSamples.length > sampleRate * 0.5) {
               // Only process if we have > 0.5 seconds of audio to avoid empty chunks
               const text = await onTranscribe(participant.identity, base64Wav, 'audio/wav', roomName, sequence)
               
               if (text && text.trim()) {
                 console.log(`STT Bot Transcribed [${participant.identity}]: ${text.trim()}`)
                 
                 // Publish transcription via LiveKit data channel!
                 // This sends to the same handler the clients use
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
           
         }, 3000) // 3 seconds chunking
         
         try {
           while (true) {
             const { done, value } = await reader.read()
             if (done || !value) break
             
             sampleRate = value.sampleRate
             channels = value.channels
             
             const pcmData = new Int16Array(value.data.buffer, value.data.byteOffset, value.data.byteLength / 2)
             for (let i = 0; i < pcmData.length; i++) {
               audioBuffer.push(pcmData[i])
             }
           }
         } catch (err) {
           console.error('Bot audio track read error', err)
         } finally {
           clearInterval(flushInterval)
         }
       })()
    }
  })

  await room.connect(serverUrl, token)
  console.log(`Bot ${botId} joined room ${roomName}`)
  
  return room
}
