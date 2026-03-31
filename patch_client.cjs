const fs = require('fs');
const file = '/Users/oxo/work/dariakulchikhina/messenger/web/app/composables/useMessengerCalls.ts';
let code = fs.readFileSync(file, 'utf8');

const hook = `      liveKitRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
        try {
          const str = new TextDecoder().decode(payload)
          handleIncomingDataChannelMessage(str)
        } catch (err) {
          console.error('Failed to handle incoming DataReceived:', err)
        }
      })

      liveKitRoom.on(RoomEvent.Disconnected, () => {`;

if (!code.includes('RoomEvent.DataReceived')) {
   code = code.replace(/liveKitRoom\.on\(RoomEvent\.Disconnected, \(\) => \{/, hook);
   fs.writeFileSync(file, code);
}
