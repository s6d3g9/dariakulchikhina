const fs = require('fs');
const file = '/Users/oxo/work/dariakulchikhina/messenger/core/src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const newBotCall = `
        joinLiveKitRoomAsBot(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, roomName, async (participantIdentity, audioBase64, mimeType, room, sequence) => {
          try {
            // Check if transcription is enabled in config
            if (!isMessengerTranscriptionConfigured(config)) return undefined
            
            const aiSettings = await findMessengerUserAiSettings(user.id)
            const provider = aiSettings.transcriptionProvider || 'server-default'
            
            const text = await transcribeMessengerAudioChunk(config, {
              audioBase64,
              mimeType,
              language: config.MESSENGER_TRANSCRIPTION_LANGUAGE,
              model: aiSettings.transcriptionModel || config.MESSENGER_TRANSCRIPTION_MODEL,
            }, {
              provider,
            })
            
            return text
          } catch (e) {
            console.error('Bot STT chunk error:', e)
            return undefined
          }
        }).catch((err) => {
`;

code = code.replace(/joinLiveKitRoomAsBot\(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, roomName\)\.catch\(\(err\) => \{/, newBotCall);

fs.writeFileSync(file, code);
