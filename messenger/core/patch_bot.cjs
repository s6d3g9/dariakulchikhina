const fs = require('fs');
const file = './src/server.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import { joinLiveKitRoomAsBot }')) {
  code = "import { joinLiveKitRoomAsBot } from './livekit-stt-bot.ts'\n" + code;
  code = "const activeLiveKitRooms = new Set<string>()\n\n" + code;
}

const botLogic = `
      // Start bot if not already in the room
      if (!activeLiveKitRooms.has(roomName)) {
        activeLiveKitRooms.add(roomName);
        joinLiveKitRoomAsBot(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, roomName).catch((err) => {
           console.error('Failed to start LiveKit STT Bot', err);
           activeLiveKitRooms.delete(roomName);
        });
      }
`;

if (!code.includes('activeLiveKitRooms.has(roomName)')) {
   code = code.replace(/const lkToken = await at\.toJwt\(\)/, "const lkToken = await at.toJwt()\n" + botLogic);
}

fs.writeFileSync(file, code);
